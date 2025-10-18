"""
Configuration settings for F5-TTS Web MVP
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
UPLOAD_DIR = DATA_DIR / "uploads"
EMBEDDINGS_DIR = DATA_DIR / "embeddings"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Model settings
DEFAULT_MODEL = "F5TTS_Base"  # Can be F5TTS_Base or E2TTS_Base
MODEL_CHECKPOINTS = {
    "F5TTS_Base": str(MODELS_DIR / "F5TTS_Base" / "model_1200000.safetensors"),
    "E2TTS_Base": str(MODELS_DIR / "E2TTS_Base" / "model_1200000.safetensors"),
}
VOCAB_FILE = ""  # Will use default from f5_tts package

# Inference settings
TARGET_SAMPLE_RATE = 24000
N_MEL_CHANNELS = 100
HOP_LENGTH = 256
WIN_LENGTH = 1024
N_FFT = 1024
MEL_SPEC_TYPE = "vocos"

# Mode settings
INFERENCE_MODES = {
    "high": {
        "description": "High-quality GPU mode",
        "device": "cuda",
        "nfe_steps": 32,
        "use_ema": True,
        "dtype": "float16",
    },
    "light": {
        "description": "Lightweight CPU mode",
        "device": "cpu",
        "nfe_steps": 16,
        "use_ema": True,
        "dtype": "float32",
    }
}

# API settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_KEY = os.getenv("API_KEY", "")  # Optional API key for authentication
ENABLE_API_KEY = os.getenv("ENABLE_API_KEY", "false").lower() == "true"

# Rate limiting
MAX_REQUESTS_PER_MINUTE = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "10"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "2"))

# Upload limits
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_AUDIO_DURATION = 30  # seconds
ALLOWED_AUDIO_FORMATS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}

# Text limits
MAX_TEXT_LENGTH = 1000  # characters
MIN_TEXT_LENGTH = 1

# Cache settings
ENABLE_EMBEDDING_CACHE = True
CACHE_EXPIRY_HOURS = 24

# Worker settings
WORKER_QUEUE_SIZE = int(os.getenv("WORKER_QUEUE_SIZE", "10"))
WORKER_TIMEOUT = int(os.getenv("WORKER_TIMEOUT", "300"))  # 5 minutes

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = BASE_DIR / "logs" / "app.log"

# CORS settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Metrics
ENABLE_METRICS = True

# Device detection
import torch
CUDA_AVAILABLE = torch.cuda.is_available()
DEFAULT_DEVICE = "cuda" if CUDA_AVAILABLE else "cpu"

print(f"[Config] CUDA Available: {CUDA_AVAILABLE}")
print(f"[Config] Default Device: {DEFAULT_DEVICE}")
print(f"[Config] Upload Directory: {UPLOAD_DIR}")
print(f"[Config] Models Directory: {MODELS_DIR}")
