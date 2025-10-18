"""
Model wrapper for F5-TTS inference
Adapts the F5-TTS model code for our web service
"""
import os
import sys
import hashlib
import json
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

import torch
import torchaudio
import numpy as np

# Add F5-TTS to path
sys.path.append(str(Path(__file__).parent))

from f5_tts.model import CFM
from f5_tts.model.utils import get_tokenizer
from f5_tts.infer.utils_infer import (
    load_vocoder,
    load_model,
    preprocess_ref_audio_text,
    chunk_text,
    target_sample_rate,
    n_mel_channels,
    hop_length,
    win_length,
    n_fft,
)

from app.config import (
    MODEL_CHECKPOINTS,
    VOCAB_FILE,
    EMBEDDINGS_DIR,
    INFERENCE_MODES,
    DEFAULT_DEVICE,
)


class F5TTSModel:
    """
    Wrapper for F5-TTS model handling inference and caching
    """
    
    def __init__(
        self,
        model_name: str = "F5TTS_Base",
        device: Optional[str] = None,
        dtype: str = "float32",
    ):
        """
        Initialize the F5-TTS model
        
        Args:
            model_name: Name of the model checkpoint to load
            device: Device to run inference on (cuda/cpu)
            dtype: Data type for inference (float16/float32)
        """
        self.model_name = model_name
        self.device = device or DEFAULT_DEVICE
        self.dtype = getattr(torch, dtype)
        
        self.model = None
        self.vocoder = None
        self.vocab_char_map = None
        self.vocab_size = None
        
        print(f"[F5TTSModel] Initializing model: {model_name} on {self.device}")
        
    def load(self):
        """Load the model and vocoder"""
        if self.model is not None:
            print("[F5TTSModel] Model already loaded")
            return
            
        # Get model checkpoint path
        ckpt_path = MODEL_CHECKPOINTS.get(self.model_name)
        if not ckpt_path or not Path(ckpt_path).exists():
            raise FileNotFoundError(
                f"Model checkpoint not found: {ckpt_path}. "
                "Please run scripts/download_weights.sh first."
            )
        
        print(f"[F5TTSModel] Loading model from {ckpt_path}")
        
        # Determine model class and config based on model name
        if "F5TTS" in self.model_name:
            from f5_tts.model.backbones.dit import DiT
            model_cls = DiT
            model_cfg = dict(
                dim=1024,
                depth=22,
                heads=16,
                ff_mult=2,
                text_dim=512,
                conv_layers=4
            )
        elif "E2TTS" in self.model_name:
            from f5_tts.model.backbones.unett import UNetT
            model_cls = UNetT
            model_cfg = dict(
                dim=1024,
                depth=24,
                heads=16,
                ff_mult=4,
            )
        else:
            raise ValueError(f"Unknown model: {self.model_name}")
        
        # Load vocabulary
        if VOCAB_FILE:
            vocab_file = VOCAB_FILE
        else:
            # Use default vocab from package
            from importlib.resources import files
            vocab_file = str(files("f5_tts").joinpath("infer/examples/vocab.txt"))
        
        print(f"[F5TTSModel] Loading vocabulary from {vocab_file}")
        self.vocab_char_map, self.vocab_size = get_tokenizer(vocab_file, "custom")
        
        # Build model
        print(f"[F5TTSModel] Building model with vocab_size={self.vocab_size}")
        self.model = CFM(
            transformer=model_cls(**model_cfg, text_num_embeds=self.vocab_size, mel_dim=n_mel_channels),
            mel_spec_kwargs=dict(
                n_fft=n_fft,
                hop_length=hop_length,
                win_length=win_length,
                n_mel_channels=n_mel_channels,
                target_sample_rate=target_sample_rate,
                mel_spec_type="vocos",
            ),
            odeint_kwargs=dict(
                method="euler",
            ),
            vocab_char_map=self.vocab_char_map,
        ).to(self.device)
        
        # Load checkpoint
        print(f"[F5TTSModel] Loading checkpoint weights")
        from safetensors.torch import load_file
        checkpoint = load_file(ckpt_path, device=self.device)
        
        # Handle EMA checkpoint format
        ema_model_state = {
            k.replace("ema_model.", ""): v
            for k, v in checkpoint.items()
            if k.startswith("ema_model.") and k not in ["ema_model.initted", "ema_model.step"]
        }
        
        # Load state dict
        self.model.load_state_dict(ema_model_state)
        self.model.eval()
        
        print(f"[F5TTSModel] Loading vocoder")
        # Load vocoder
        self.vocoder = load_vocoder(vocoder_name="vocos", device=self.device)
        
        print(f"[F5TTSModel] Model loaded successfully")
    
    def get_speaker_embedding_path(self, audio_path: str) -> Path:
        """Get the cache path for speaker embedding"""
        # Create hash of audio file
        with open(audio_path, "rb") as f:
            audio_hash = hashlib.md5(f.read()).hexdigest()
        return EMBEDDINGS_DIR / f"{audio_hash}.pt"
    
    def load_speaker_embedding(self, audio_path: str) -> Optional[Dict[str, Any]]:
        """Load cached speaker embedding if available"""
        cache_path = self.get_speaker_embedding_path(audio_path)
        if cache_path.exists():
            print(f"[F5TTSModel] Loading cached embedding from {cache_path}")
            return torch.load(cache_path, map_location=self.device)
        return None
    
    def save_speaker_embedding(self, audio_path: str, embedding_data: Dict[str, Any]):
        """Save speaker embedding to cache"""
        cache_path = self.get_speaker_embedding_path(audio_path)
        print(f"[F5TTSModel] Saving embedding to {cache_path}")
        torch.save(embedding_data, cache_path)
    
    @torch.inference_mode()
    def synthesize(
        self,
        text: str,
        ref_audio_path: str,
        ref_text: str,
        nfe_steps: int = 32,
        cfg_strength: float = 2.0,
        speed: float = 1.0,
    ) -> Tuple[np.ndarray, int]:
        """
        Synthesize speech from text using reference audio
        
        Args:
            text: Text to synthesize
            ref_audio_path: Path to reference audio file
            ref_text: Transcription of reference audio
            nfe_steps: Number of function evaluations (quality vs speed)
            cfg_strength: Classifier-free guidance strength
            speed: Speaking speed multiplier
            
        Returns:
            Tuple of (audio_array, sample_rate)
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        print(f"[F5TTSModel] Synthesizing: '{text[:50]}...'")
        
        # Check for cached embedding
        cached_data = self.load_speaker_embedding(ref_audio_path)
        
        if cached_data:
            ref_audio = cached_data["audio"].to(self.device)
            ref_text_processed = cached_data["text"]
            duration = cached_data["duration"]
        else:
            # Preprocess reference audio
            print(f"[F5TTSModel] Processing reference audio: {ref_audio_path}")
            ref_audio, ref_text_processed = preprocess_ref_audio_text(
                ref_audio_path, ref_text, show_info=print
            )
            
            # Load and resample audio
            audio_tensor, sr = torchaudio.load(ref_audio)
            if sr != target_sample_rate:
                resampler = torchaudio.transforms.Resample(sr, target_sample_rate)
                audio_tensor = resampler(audio_tensor)
            
            ref_audio = audio_tensor.mean(dim=0, keepdim=True).to(self.device)
            duration = ref_audio.shape[-1] / target_sample_rate
            
            # Cache the embedding data
            self.save_speaker_embedding(ref_audio_path, {
                "audio": ref_audio.cpu(),
                "text": ref_text_processed,
                "duration": duration,
            })
        
        # Chunk text if needed
        text_chunks = chunk_text(text, max_chars=135)
        print(f"[F5TTSModel] Text split into {len(text_chunks)} chunks")
        
        # Synthesize each chunk
        generated_waves = []
        
        for i, chunk in enumerate(text_chunks):
            print(f"[F5TTSModel] Processing chunk {i+1}/{len(text_chunks)}")
            
            # Prepare text inputs
            text_list = [ref_text_processed + chunk]
            
            # Run inference
            with torch.autocast(device_type=self.device.split(':')[0], dtype=self.dtype):
                # Generate mel spectrogram
                generated, _ = self.model.sample(
                    cond=ref_audio,
                    text=text_list,
                    duration=duration,
                    steps=nfe_steps,
                    cfg_strength=cfg_strength,
                    sway_sampling_coef=-1.0,
                )
                
                # Convert mel to audio using vocoder
                generated_wave = self.vocoder.decode(generated)
            
            generated_waves.append(generated_wave.cpu())
        
        # Concatenate all chunks
        if len(generated_waves) > 1:
            final_wave = torch.cat(generated_waves, dim=-1)
        else:
            final_wave = generated_waves[0]
        
        # Convert to numpy
        audio_array = final_wave.squeeze().numpy()
        
        print(f"[F5TTSModel] Synthesis complete. Audio length: {len(audio_array)/target_sample_rate:.2f}s")
        
        return audio_array, target_sample_rate
    
    def unload(self):
        """Unload model to free memory"""
        if self.model is not None:
            del self.model
            del self.vocoder
            self.model = None
            self.vocoder = None
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            print("[F5TTSModel] Model unloaded")
