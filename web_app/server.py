"""
FastAPI backend for TTS web application with voice cloning support.
Supports Hebrew and multiple languages with lazy model loading.
"""

import os
import tempfile
import logging
from pathlib import Path
from typing import Optional, Dict
import threading

from fastapi import FastAPI, Form, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import TTS
TTS_AVAILABLE = False
TTS = None
try:
    from TTS.api import TTS as TTSLib
    TTS = TTSLib
    TTS_AVAILABLE = True
    logger.info("TTS library loaded successfully")
except ImportError as e:
    logger.warning(f"TTS library not available: {e}")
    logger.warning("Please run via Docker or install TTS: pip install TTS")

app = FastAPI(title="TTS Web Application", version="1.0.0")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model cache with thread-safe access
model_cache: Dict[str, any] = {}
model_lock = threading.Lock()

# Configuration
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_TEXT_LENGTH = 5000
DEFAULT_MODEL = "tts_models/multilingual/multi-dataset/your_tts"

# Available models
AVAILABLE_MODELS = {
    "your_tts": "tts_models/multilingual/multi-dataset/your_tts",
    "xtts_v2": "tts_models/multilingual/multi-dataset/xtts_v2"
}


def get_tts_model(model_name: str):
    """
    Get or create TTS model instance with thread-safe caching.
    
    Args:
        model_name: Name of the model to load
        
    Returns:
        TTS model instance
        
    Raises:
        HTTPException: If TTS is not available or model loading fails
    """
    if not TTS_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "TTS library not installed",
                "message": "Please run this application via Docker or install TTS: pip install TTS",
                "docker_command": "docker compose up --build"
            }
        )
    
    # Resolve model name
    resolved_model = AVAILABLE_MODELS.get(model_name, model_name)
    
    with model_lock:
        if resolved_model not in model_cache:
            try:
                logger.info(f"Loading model: {resolved_model}")
                # Initialize TTS model
                tts = TTS(resolved_model)
                model_cache[resolved_model] = tts
                logger.info(f"Model loaded successfully: {resolved_model}")
            except Exception as e:
                logger.error(f"Failed to load model {resolved_model}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": "Model loading failed",
                        "message": str(e),
                        "model": resolved_model
                    }
                )
        
        return model_cache[resolved_model]


def validate_text(text: str) -> str:
    """Validate input text."""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text too long. Maximum length is {MAX_TEXT_LENGTH} characters"
        )
    
    return text.strip()


async def validate_audio_file(file: UploadFile) -> bytes:
    """Validate uploaded audio file."""
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Check file extension
    if not file.filename.lower().endswith(('.wav', '.mp3', '.flac', '.ogg')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Supported formats: WAV, MP3, FLAC, OGG"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    
    return content


@app.get("/")
async def root():
    """Root endpoint - redirect to static files."""
    return {"message": "TTS Web Application API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "tts_available": TTS_AVAILABLE,
        "models_loaded": list(model_cache.keys())
    }


@app.get("/models")
async def list_models():
    """List available models."""
    return {
        "available_models": AVAILABLE_MODELS,
        "default_model": DEFAULT_MODEL,
        "loaded_models": list(model_cache.keys())
    }


@app.post("/synthesize")
async def synthesize(
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    model_name: str = Form(DEFAULT_MODEL),
    language: str = Form("he")
):
    """
    Synthesize speech from text.
    
    Args:
        text: Text to synthesize
        model_name: Model to use (default: your_tts)
        language: Language code (default: he for Hebrew)
        
    Returns:
        WAV audio file
    """
    try:
        # Validate input
        text = validate_text(text)
        
        # Get model
        tts = get_tts_model(model_name)
        
        # Create temporary file for output
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            logger.info(f"Synthesizing text (length: {len(text)}) with model {model_name}, language: {language}")
            
            # Synthesize speech
            # Check if model supports language parameter
            if hasattr(tts, 'tts_to_file'):
                try:
                    tts.tts_to_file(
                        text=text,
                        file_path=output_path,
                        language=language
                    )
                except TypeError:
                    # Model doesn't support language parameter
                    tts.tts_to_file(text=text, file_path=output_path)
            else:
                # Fallback method
                tts.tts_to_file(text=text, file_path=output_path)
            
            logger.info("Synthesis completed successfully")
            
            # Schedule cleanup after response
            background_tasks.add_task(lambda: os.unlink(output_path) if os.path.exists(output_path) else None)
            
            return FileResponse(
                output_path,
                media_type="audio/wav",
                filename="synthesized.wav"
            )
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(output_path):
                os.unlink(output_path)
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Synthesis error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Synthesis failed",
                "message": str(e)
            }
        )


@app.post("/clone")
async def clone_voice(
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    speaker_wav: UploadFile = File(...),
    model_name: str = Form(DEFAULT_MODEL),
    language: str = Form("he")
):
    """
    Clone voice and synthesize speech.
    
    Args:
        text: Text to synthesize
        speaker_wav: Audio file with speaker voice
        model_name: Model to use (default: your_tts)
        language: Language code (default: he for Hebrew)
        
    Returns:
        WAV audio file with cloned voice
    """
    temp_speaker_path = None
    output_path = None
    
    try:
        # Validate input
        text = validate_text(text)
        audio_content = await validate_audio_file(speaker_wav)
        
        # Get model
        tts = get_tts_model(model_name)
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_speaker:
            temp_speaker_path = tmp_speaker.name
            tmp_speaker.write(audio_content)
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_output:
            output_path = tmp_output.name
        
        try:
            logger.info(f"Cloning voice with model {model_name}, language: {language}")
            
            # Clone voice and synthesize
            # Check if model supports voice cloning
            if hasattr(tts, 'tts_with_vc_to_file'):
                try:
                    tts.tts_with_vc_to_file(
                        text=text,
                        speaker_wav=temp_speaker_path,
                        file_path=output_path,
                        language=language
                    )
                except TypeError:
                    # Try without language parameter
                    tts.tts_with_vc_to_file(
                        text=text,
                        speaker_wav=temp_speaker_path,
                        file_path=output_path
                    )
            elif hasattr(tts, 'tts_to_file'):
                # Fallback for models that don't support explicit cloning
                try:
                    tts.tts_to_file(
                        text=text,
                        speaker_wav=temp_speaker_path,
                        file_path=output_path,
                        language=language
                    )
                except TypeError:
                    tts.tts_to_file(
                        text=text,
                        file_path=output_path
                    )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Selected model does not support voice cloning"
                )
            
            logger.info("Voice cloning completed successfully")
            
            # Clean up speaker file before returning
            if temp_speaker_path and os.path.exists(temp_speaker_path):
                os.unlink(temp_speaker_path)
                temp_speaker_path = None
            
            # Schedule cleanup of output file
            background_tasks.add_task(lambda: os.unlink(output_path) if os.path.exists(output_path) else None)
            
            return FileResponse(
                output_path,
                media_type="audio/wav",
                filename="cloned.wav"
            )
            
        except Exception as e:
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice cloning error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Voice cloning failed",
                "message": str(e)
            }
        )
    finally:
        # Clean up temporary files
        if temp_speaker_path and os.path.exists(temp_speaker_path):
            try:
                os.unlink(temp_speaker_path)
            except Exception as e:
                logger.warning(f"Failed to clean up temp speaker file: {e}")
        
        # Note: output_path cleanup is handled by FileResponse background task


# Mount static files (HTML, CSS, JS)
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
