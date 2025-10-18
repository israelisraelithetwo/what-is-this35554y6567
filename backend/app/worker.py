"""
Model worker service for handling inference requests
Runs in a separate process to keep the web server responsive
"""
import asyncio
import multiprocessing as mp
from typing import Dict, Any, Optional
import traceback
import time

from app.model_wrapper import F5TTSModel
from app.config import INFERENCE_MODES, DEFAULT_DEVICE


class ModelWorker:
    """
    Worker process that handles model inference
    """
    
    def __init__(self, mode: str = "light"):
        """
        Initialize the model worker
        
        Args:
            mode: Inference mode (light or high)
        """
        self.mode = mode
        self.mode_config = INFERENCE_MODES.get(mode, INFERENCE_MODES["light"])
        self.model: Optional[F5TTSModel] = None
        self.is_ready = False
        
    def initialize(self):
        """Initialize the model (runs in worker process)"""
        try:
            print(f"[Worker] Initializing in {self.mode} mode")
            
            device = self.mode_config["device"]
            dtype = self.mode_config["dtype"]
            
            # Override device if GPU not available
            if device == "cuda" and not DEFAULT_DEVICE.startswith("cuda"):
                print(f"[Worker] GPU requested but not available, falling back to CPU")
                device = "cpu"
                dtype = "float32"
            
            self.model = F5TTSModel(
                model_name="F5TTS_Base",
                device=device,
                dtype=dtype,
            )
            
            self.model.load()
            self.is_ready = True
            print(f"[Worker] Ready to process requests")
            
        except Exception as e:
            print(f"[Worker] Failed to initialize: {e}")
            traceback.print_exc()
            self.is_ready = False
            raise
    
    def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a synthesis request
        
        Args:
            request_data: Dict containing:
                - text: Text to synthesize
                - ref_audio_path: Path to reference audio
                - ref_text: Reference text transcription
                - speed: Speaking speed (optional)
                
        Returns:
            Dict with audio_path and metadata
        """
        try:
            if not self.is_ready:
                return {
                    "success": False,
                    "error": "Worker not ready",
                }
            
            print(f"[Worker] Processing request: {request_data.get('request_id', 'unknown')}")
            
            text = request_data["text"]
            ref_audio_path = request_data["ref_audio_path"]
            ref_text = request_data.get("ref_text", "")
            speed = request_data.get("speed", 1.0)
            output_path = request_data["output_path"]
            
            # Get mode-specific parameters
            nfe_steps = self.mode_config.get("nfe_steps", 32)
            
            start_time = time.time()
            
            # Run synthesis
            audio_array, sample_rate = self.model.synthesize(
                text=text,
                ref_audio_path=ref_audio_path,
                ref_text=ref_text,
                nfe_steps=nfe_steps,
                speed=speed,
            )
            
            # Save audio
            import soundfile as sf
            sf.write(output_path, audio_array, sample_rate)
            
            elapsed_time = time.time() - start_time
            audio_duration = len(audio_array) / sample_rate
            rtf = elapsed_time / audio_duration if audio_duration > 0 else 0
            
            print(f"[Worker] Synthesis complete in {elapsed_time:.2f}s (RTF: {rtf:.3f})")
            
            return {
                "success": True,
                "output_path": output_path,
                "duration": audio_duration,
                "sample_rate": sample_rate,
                "processing_time": elapsed_time,
                "rtf": rtf,
            }
            
        except Exception as e:
            print(f"[Worker] Error processing request: {e}")
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }


def worker_process(
    request_queue: mp.Queue,
    response_queue: mp.Queue,
    mode: str,
):
    """
    Worker process main loop
    
    Args:
        request_queue: Queue for incoming requests
        response_queue: Queue for sending responses
        mode: Inference mode
    """
    print(f"[Worker Process] Starting in {mode} mode")
    
    worker = ModelWorker(mode=mode)
    
    try:
        worker.initialize()
    except Exception as e:
        print(f"[Worker Process] Failed to initialize: {e}")
        response_queue.put({
            "type": "error",
            "error": f"Worker initialization failed: {e}",
        })
        return
    
    # Send ready signal
    response_queue.put({
        "type": "ready",
        "mode": mode,
    })
    
    print(f"[Worker Process] Entering main loop")
    
    while True:
        try:
            # Wait for request
            request = request_queue.get()
            
            if request is None or request.get("type") == "shutdown":
                print(f"[Worker Process] Shutdown requested")
                break
            
            request_id = request.get("request_id", "unknown")
            print(f"[Worker Process] Received request: {request_id}")
            
            # Process request
            result = worker.process_request(request)
            
            # Send response
            response_queue.put({
                "type": "result",
                "request_id": request_id,
                "result": result,
            })
            
        except Exception as e:
            print(f"[Worker Process] Error in main loop: {e}")
            traceback.print_exc()
            response_queue.put({
                "type": "error",
                "error": str(e),
            })
    
    print(f"[Worker Process] Exiting")


class WorkerManager:
    """
    Manages worker processes and request queuing
    """
    
    def __init__(self):
        self.workers: Dict[str, Dict[str, Any]] = {}
        self.is_initialized = False
        
    def start_worker(self, mode: str):
        """
        Start a worker process for the given mode
        
        Args:
            mode: Inference mode (light or high)
        """
        if mode in self.workers:
            print(f"[WorkerManager] Worker for {mode} mode already exists")
            return
        
        print(f"[WorkerManager] Starting worker for {mode} mode")
        
        request_queue = mp.Queue()
        response_queue = mp.Queue()
        
        process = mp.Process(
            target=worker_process,
            args=(request_queue, response_queue, mode),
        )
        process.start()
        
        # Wait for ready signal
        print(f"[WorkerManager] Waiting for worker to be ready...")
        response = response_queue.get(timeout=120)
        
        if response.get("type") == "error":
            raise RuntimeError(f"Worker failed to start: {response.get('error')}")
        
        print(f"[WorkerManager] Worker ready: {mode}")
        
        self.workers[mode] = {
            "process": process,
            "request_queue": request_queue,
            "response_queue": response_queue,
            "is_busy": False,
        }
    
    def stop_workers(self):
        """Stop all worker processes"""
        print(f"[WorkerManager] Stopping all workers")
        
        for mode, worker_data in self.workers.items():
            print(f"[WorkerManager] Stopping worker: {mode}")
            worker_data["request_queue"].put({"type": "shutdown"})
            worker_data["process"].join(timeout=10)
            if worker_data["process"].is_alive():
                worker_data["process"].terminate()
        
        self.workers.clear()
    
    async def submit_request(
        self,
        request_id: str,
        mode: str,
        request_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Submit a request to the worker
        
        Args:
            request_id: Unique request identifier
            mode: Inference mode
            request_data: Request data
            
        Returns:
            Result dict
        """
        if mode not in self.workers:
            raise ValueError(f"No worker available for mode: {mode}")
        
        worker = self.workers[mode]
        
        # Add request ID
        request_data["request_id"] = request_id
        
        # Submit to worker
        print(f"[WorkerManager] Submitting request {request_id} to {mode} worker")
        worker["request_queue"].put(request_data)
        worker["is_busy"] = True
        
        # Wait for response in async loop
        loop = asyncio.get_event_loop()
        
        def get_response():
            return worker["response_queue"].get()
        
        response = await loop.run_in_executor(None, get_response)
        worker["is_busy"] = False
        
        if response.get("type") == "error":
            raise RuntimeError(response.get("error", "Unknown error"))
        
        return response.get("result", {})


# Global worker manager instance
_worker_manager: Optional[WorkerManager] = None


def get_worker_manager() -> WorkerManager:
    """Get the global worker manager instance"""
    global _worker_manager
    if _worker_manager is None:
        _worker_manager = WorkerManager()
    return _worker_manager
