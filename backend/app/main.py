"""
FastAPI application for F5-TTS Web MVP
Provides REST API for text-to-speech synthesis with voice cloning
"""
import os
import uuid
import time
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import traceback

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import aiofiles

from app.config import (
    API_HOST,
    API_PORT,
    CORS_ORIGINS,
    UPLOAD_DIR,
    MAX_UPLOAD_SIZE,
    MAX_AUDIO_DURATION,
    ALLOWED_AUDIO_FORMATS,
    MAX_TEXT_LENGTH,
    MIN_TEXT_LENGTH,
    MAX_REQUESTS_PER_MINUTE,
    ENABLE_API_KEY,
    API_KEY,
    INFERENCE_MODES,
    CUDA_AVAILABLE,
)
from app.worker import get_worker_manager


# Initialize FastAPI app
app = FastAPI(
    title="F5-TTS Web MVP",
    description="Text-to-speech synthesis with voice cloning using F5-TTS",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
frontend_dir = Path(__file__).parent.parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


# ============================================================================
# Data Models
# ============================================================================

class SynthesizeRequest(BaseModel):
    """Request model for synthesis endpoint"""
    text: str = Field(..., min_length=MIN_TEXT_LENGTH, max_length=MAX_TEXT_LENGTH)
    speaker_id: Optional[str] = None
    uploaded_sample_id: Optional[str] = None
    mode: str = Field("light", pattern="^(high|light)$")
    lang_hint: Optional[str] = None
    speed: float = Field(1.0, ge=0.5, le=2.0)
    ref_text: Optional[str] = None


class SynthesizeResponse(BaseModel):
    """Response model for synthesis endpoint"""
    success: bool
    audio_url: Optional[str] = None
    audio_id: str
    duration: Optional[float] = None
    processing_time: Optional[float] = None
    rtf: Optional[float] = None
    error: Optional[str] = None


class UploadResponse(BaseModel):
    """Response model for upload endpoint"""
    success: bool
    sample_id: str
    filename: str
    duration: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    cuda_available: bool
    available_modes: List[str]
    workers_ready: Dict[str, bool]


class MetricsResponse(BaseModel):
    """Response model for metrics"""
    total_requests: int
    total_errors: int
    requests_per_endpoint: Dict[str, int]
    average_processing_time: Optional[float]


# ============================================================================
# Metrics and Rate Limiting
# ============================================================================

class Metrics:
    """Simple in-memory metrics tracker"""
    
    def __init__(self):
        self.total_requests = 0
        self.total_errors = 0
        self.requests_per_endpoint: Dict[str, int] = {}
        self.processing_times: List[float] = []
        self.request_timestamps: List[float] = []
    
    def record_request(self, endpoint: str):
        """Record a request"""
        self.total_requests += 1
        self.requests_per_endpoint[endpoint] = self.requests_per_endpoint.get(endpoint, 0) + 1
        self.request_timestamps.append(time.time())
    
    def record_error(self):
        """Record an error"""
        self.total_errors += 1
    
    def record_processing_time(self, duration: float):
        """Record processing time"""
        self.processing_times.append(duration)
        # Keep only last 100 entries
        if len(self.processing_times) > 100:
            self.processing_times = self.processing_times[-100:]
    
    def check_rate_limit(self) -> bool:
        """Check if rate limit is exceeded"""
        now = time.time()
        # Remove timestamps older than 1 minute
        self.request_timestamps = [ts for ts in self.request_timestamps if now - ts < 60]
        return len(self.request_timestamps) <= MAX_REQUESTS_PER_MINUTE
    
    def get_average_processing_time(self) -> Optional[float]:
        """Get average processing time"""
        if not self.processing_times:
            return None
        return sum(self.processing_times) / len(self.processing_times)


metrics = Metrics()


# ============================================================================
# Dependencies
# ============================================================================

async def verify_api_key(request: Request):
    """Verify API key if authentication is enabled"""
    if not ENABLE_API_KEY:
        return True
    
    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return True


async def check_rate_limit():
    """Check rate limiting"""
    if not metrics.check_rate_limit():
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_MINUTE} requests per minute."
        )


# ============================================================================
# Startup and Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize workers on startup"""
    print("[API] Starting up...")
    
    worker_manager = get_worker_manager()
    
    # Start light mode worker (always available)
    try:
        worker_manager.start_worker("light")
        print("[API] Light mode worker started")
    except Exception as e:
        print(f"[API] Failed to start light mode worker: {e}")
        traceback.print_exc()
    
    # Start high mode worker if GPU is available
    if CUDA_AVAILABLE:
        try:
            worker_manager.start_worker("high")
            print("[API] High mode worker started")
        except Exception as e:
            print(f"[API] Failed to start high mode worker: {e}")
            traceback.print_exc()
    else:
        print("[API] GPU not available, high mode disabled")
    
    print("[API] Startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("[API] Shutting down...")
    worker_manager = get_worker_manager()
    worker_manager.stop_workers()
    print("[API] Shutdown complete")


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/", include_in_schema=False)
async def root():
    """Serve frontend index page"""
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "F5-TTS Web MVP API", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    
    Returns service status and available modes
    """
    metrics.record_request("/health")
    
    worker_manager = get_worker_manager()
    
    workers_ready = {}
    for mode in ["light", "high"]:
        workers_ready[mode] = mode in worker_manager.workers
    
    available_modes = [mode for mode, ready in workers_ready.items() if ready]
    
    return HealthResponse(
        status="healthy" if available_modes else "degraded",
        cuda_available=CUDA_AVAILABLE,
        available_modes=available_modes,
        workers_ready=workers_ready,
    )


@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """
    Get usage metrics
    
    Returns request counts, errors, and performance stats
    """
    return MetricsResponse(
        total_requests=metrics.total_requests,
        total_errors=metrics.total_errors,
        requests_per_endpoint=metrics.requests_per_endpoint,
        average_processing_time=metrics.get_average_processing_time(),
    )


@app.post("/upload-sample", response_model=UploadResponse, dependencies=[Depends(check_rate_limit)])
async def upload_sample(
    file: UploadFile = File(...),
    speaker_name: Optional[str] = Form(None),
    api_key_valid: bool = Depends(verify_api_key),
):
    """
    Upload a voice sample for speaker cloning
    
    Args:
        file: Audio file (wav, mp3, flac, etc.)
        speaker_name: Optional name for the speaker
        
    Returns:
        Sample ID and metadata
    """
    metrics.record_request("/upload-sample")
    
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_AUDIO_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format. Allowed: {ALLOWED_AUDIO_FORMATS}"
            )
        
        # Generate unique sample ID
        sample_id = str(uuid.uuid4())
        
        # Save file
        file_path = UPLOAD_DIR / f"{sample_id}{file_ext}"
        
        # Check file size
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE / (1024*1024):.1f}MB"
            )
        
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        
        # Get audio duration
        try:
            import torchaudio
            audio, sr = torchaudio.load(str(file_path))
            duration = audio.shape[-1] / sr
            
            if duration > MAX_AUDIO_DURATION:
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"Audio too long. Maximum duration: {MAX_AUDIO_DURATION}s"
                )
        except Exception as e:
            print(f"[API] Error checking audio: {e}")
            duration = None
        
        print(f"[API] Uploaded sample: {sample_id} ({file.filename})")
        
        return UploadResponse(
            success=True,
            sample_id=sample_id,
            filename=file.filename,
            duration=duration,
        )
        
    except HTTPException:
        metrics.record_error()
        raise
    except Exception as e:
        metrics.record_error()
        print(f"[API] Error uploading sample: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/synthesize", response_model=SynthesizeResponse, dependencies=[Depends(check_rate_limit)])
async def synthesize(
    request: SynthesizeRequest,
    api_key_valid: bool = Depends(verify_api_key),
):
    """
    Synthesize speech from text using a reference voice
    
    Args:
        request: Synthesis request with text, speaker reference, and options
        
    Returns:
        Audio file URL and metadata
    """
    metrics.record_request("/synthesize")
    
    try:
        # Validate mode
        if request.mode not in INFERENCE_MODES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode. Available: {list(INFERENCE_MODES.keys())}"
            )
        
        # Check if mode is available
        worker_manager = get_worker_manager()
        if request.mode not in worker_manager.workers:
            if request.mode == "high":
                raise HTTPException(
                    status_code=400,
                    detail="High-quality GPU mode not available. GPU not detected or worker failed to start."
                )
            else:
                raise HTTPException(status_code=503, detail=f"Worker for {request.mode} mode not available")
        
        # Get reference audio path
        if request.uploaded_sample_id:
            ref_audio_files = list(UPLOAD_DIR.glob(f"{request.uploaded_sample_id}.*"))
            if not ref_audio_files:
                raise HTTPException(status_code=404, detail="Sample not found")
            ref_audio_path = str(ref_audio_files[0])
        elif request.speaker_id:
            # For pre-registered speakers (not implemented in MVP)
            raise HTTPException(status_code=400, detail="Pre-registered speakers not yet supported")
        else:
            raise HTTPException(status_code=400, detail="Must provide uploaded_sample_id or speaker_id")
        
        # Generate output filename
        audio_id = str(uuid.uuid4())
        output_path = UPLOAD_DIR / f"output_{audio_id}.wav"
        
        # Prepare request data
        start_time = time.time()
        
        request_data = {
            "text": request.text,
            "ref_audio_path": ref_audio_path,
            "ref_text": request.ref_text or "",
            "speed": request.speed,
            "output_path": str(output_path),
        }
        
        # Submit to worker
        result = await worker_manager.submit_request(
            request_id=audio_id,
            mode=request.mode,
            request_data=request_data,
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Synthesis failed"))
        
        processing_time = time.time() - start_time
        metrics.record_processing_time(processing_time)
        
        print(f"[API] Synthesis complete: {audio_id}")
        
        return SynthesizeResponse(
            success=True,
            audio_url=f"/download/{audio_id}",
            audio_id=audio_id,
            duration=result.get("duration"),
            processing_time=processing_time,
            rtf=result.get("rtf"),
        )
        
    except HTTPException:
        metrics.record_error()
        raise
    except Exception as e:
        metrics.record_error()
        print(f"[API] Error in synthesis: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{audio_id}")
async def download_audio(audio_id: str):
    """
    Download synthesized audio file
    
    Args:
        audio_id: Audio file identifier
        
    Returns:
        Audio file
    """
    metrics.record_request("/download")
    
    try:
        audio_path = UPLOAD_DIR / f"output_{audio_id}.wav"
        
        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        return FileResponse(
            audio_path,
            media_type="audio/wav",
            filename=f"synthesis_{audio_id}.wav"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error downloading audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print(f"[API] Starting server on {API_HOST}:{API_PORT}")
    
    uvicorn.run(
        app,
        host=API_HOST,
        port=API_PORT,
        log_level="info",
    )
