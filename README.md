# F5-TTS Web MVP

A lightweight, easy-to-run web application for text-to-speech synthesis with voice cloning capabilities, built on the [F5-TTS](https://github.com/SWivid/F5-TTS) foundation.

## 🎯 Features

- **Voice Cloning**: Upload a short audio sample (≤30 seconds) and synthesize speech in that voice
- **Two Quality Modes**:
  - **Light Mode (CPU)**: Fast inference on CPU, suitable for testing and low-resource environments
  - **High Mode (GPU)**: Higher quality synthesis using NVIDIA GPU acceleration
- **Web Interface**: Simple, accessible UI for uploading samples and generating speech
- **REST API**: FastAPI-based endpoints for programmatic access
- **Docker Support**: Easy deployment with Docker and docker-compose
- **Speaker Embedding Cache**: Precomputed embeddings for faster repeated synthesis
- **Rate Limiting**: Configurable request limits and concurrency controls

## 📋 Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Model Optimization](#model-optimization)
- [Hebrew Support](#hebrew-support)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Ethics and Responsible Use](#ethics-and-responsible-use)

## 🔧 Requirements

### Light Mode (CPU)
- **CPU**: 4+ cores recommended
- **RAM**: 8+ GB
- **Disk**: ~10 GB for models and dependencies
- **OS**: Linux, macOS, or Windows with Docker

### High Mode (GPU)
- **GPU**: NVIDIA GPU with 8-16 GB VRAM (24 GB recommended for large batches)
- **CUDA**: 11.8 or 12.1
- **CPU**: 4+ cores
- **RAM**: 16+ GB
- **Disk**: ~10 GB for models and dependencies

### Software Requirements
- Docker 20.10+ and docker-compose 2.0+, OR
- Python 3.10+ with pip

## 📦 Installation

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd what-is-this35554y6567
   git checkout feature/web-mvp
   ```

2. **Download model weights**
   ```bash
   chmod +x scripts/download_weights.sh
   ./scripts/download_weights.sh
   ```
   
   This will download:
   - F5-TTS Base model (~1.2 GB)
   - Vocos vocoder (~100 MB)

3. **Start the service**
   
   For CPU mode:
   ```bash
   docker-compose --profile cpu up
   ```
   
   For GPU mode (requires NVIDIA Docker):
   ```bash
   docker-compose --profile gpu up
   ```

4. **Access the web interface**
   
   Open your browser to: http://localhost:8000

### Option 2: Local Python Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd what-is-this35554y6567
   git checkout feature/web-mvp
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   
   For CPU:
   ```bash
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
   pip install -r backend/requirements.txt
   ```
   
   For GPU (CUDA 12.1):
   ```bash
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
   pip install -r backend/requirements.txt
   ```

4. **Download model weights**
   ```bash
   ./scripts/download_weights.sh
   ```

5. **Run the application**
   ```bash
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

## 🚀 Quick Start

### Using the Web Interface

1. **Upload a voice sample**
   - Click "Choose audio file" or drag & drop
   - Supported formats: WAV, MP3, FLAC, OGG, M4A
   - Maximum duration: 30 seconds

2. **Provide reference text (optional)**
   - Enter the transcription of your audio sample
   - Leave blank to use automatic speech recognition (requires more memory)

3. **Enter text to synthesize**
   - Type the text you want to convert to speech
   - Maximum 1000 characters

4. **Choose quality mode**
   - Light (CPU): Faster, runs on any machine
   - High (GPU): Higher quality, requires NVIDIA GPU

5. **Synthesize**
   - Click "Synthesize Speech"
   - Wait for processing (typically 5-30 seconds)
   - Download or play the generated audio

### Using the API

#### Upload a sample
```bash
curl -X POST "http://localhost:8000/upload-sample" \
  -F "file=@sample.wav" \
  -F "speaker_name=John Doe"
```

Response:
```json
{
  "success": true,
  "sample_id": "abc123...",
  "filename": "sample.wav",
  "duration": 5.2
}
```

#### Synthesize speech
```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of voice cloning.",
    "uploaded_sample_id": "abc123...",
    "mode": "light",
    "speed": 1.0,
    "ref_text": "This is my voice sample."
  }'
```

Response:
```json
{
  "success": true,
  "audio_url": "/download/xyz789...",
  "audio_id": "xyz789...",
  "duration": 3.5,
  "processing_time": 8.2,
  "rtf": 0.43
}
```

#### Download audio
```bash
curl "http://localhost:8000/download/xyz789..." -o output.wav
```

## 📚 API Documentation

Once the service is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **OpenAPI schema**: http://localhost:8000/openapi.json

### Endpoints

- `GET /health` - Health check and service status
- `GET /metrics` - Usage metrics (requests, errors, performance)
- `POST /upload-sample` - Upload a voice sample
- `POST /synthesize` - Synthesize speech from text
- `GET /download/{audio_id}` - Download generated audio

## ⚙️ Configuration

Configuration is done via environment variables. Create a `.env` file or set them in your shell:

```bash
# API Settings
API_HOST=0.0.0.0
API_PORT=8000
ENABLE_API_KEY=false
API_KEY=your-secret-key-here

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=10
MAX_CONCURRENT_REQUESTS=2

# Worker Settings
WORKER_QUEUE_SIZE=10
WORKER_TIMEOUT=300

# Logging
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=*
```

### Docker Compose Configuration

Edit `docker-compose.yml` to customize:
- Port mappings
- Volume mounts
- Environment variables
- Resource limits

## 🔄 Model Optimization

### Current Implementation

The MVP includes:
- Speaker embedding caching to avoid re-encoding samples
- Configurable NFE steps (16 for light mode, 32 for high mode)
- Automatic device selection (CPU/GPU)

### Model Conversion (Advanced)

For additional performance improvements, you can convert models to ONNX or TorchScript:

#### TorchScript Export
```python
# TODO: Add conversion script
# This requires adapting the F5-TTS model components to be TorchScript-compatible
```

#### ONNX Export
```bash
# TODO: Add ONNX conversion script
# Reference: F5-TTS has ONNX examples in the community
```

#### INT8 Quantization
```python
# TODO: Add quantization script
# PyTorch dynamic quantization can be applied to linear layers
```

**Note**: Automatic model conversion is not included in this MVP due to model architecture complexity. Manual conversion steps would be:

1. Export the transformer backbone to TorchScript
2. Handle the vocoder separately (Vocos has ONNX support)
3. Create a combined inference pipeline
4. Test quality degradation

For production deployments, consider using the [TensorRT-LLM implementation](https://github.com/SWivid/F5-TTS/tree/main/src/f5_tts/runtime/triton_trtllm) provided by the F5-TTS team.

## 🌐 Hebrew Support

### Current Status

F5-TTS supports multilingual phoneme-based input through its text processing pipeline. English is fully supported out of the box.

### Adding Hebrew Support

To enable Hebrew synthesis:

1. **Install Hebrew text processing tools**
   ```bash
   pip install python-hebrew-tokenizer
   ```

2. **Add Hebrew phonemizer**
   
   F5-TTS uses character-to-phoneme conversion. For Hebrew:
   - Hebrew text can be used directly if the vocabulary includes Hebrew characters
   - Or use a Hebrew G2P (grapheme-to-phoneme) system like `epitran` or custom rules

3. **Update vocabulary**
   
   Edit `backend/app/f5_tts/infer/examples/vocab.txt` to include Hebrew characters (א-ת).

4. **Modify text processing**
   
   In `backend/app/f5_tts/model/utils.py`, add Hebrew text normalization:
   ```python
   def process_hebrew_text(text):
       # Remove nikud (vowel marks) if present
       # Normalize text
       return normalized_text
   ```

5. **Fine-tune model (optional)**
   
   For best results, fine-tune on Hebrew speech data:
   ```bash
   # Use F5-TTS training scripts with Hebrew dataset
   f5-tts_finetune-cli --config hebrew_config.toml
   ```

### Minimum Requirements for Hebrew

- **Model**: Use existing F5-TTS Base (supports any phoneme input)
- **Dataset**: Hebrew speech + transcriptions (recommend 1-10 hours for fine-tuning)
- **Hardware**: Same as English (8-16 GB VRAM for training)

### Resources

- [Hebrew TTS Dataset: HebrewTTS](https://www.openslr.org/104/)
- [Hebrew Phonemizer](https://github.com/dmort27/epitran)

## 🛠️ Development

### Running Tests

```bash
cd backend
PYTHONPATH=. pytest tests/test_endpoints.py -v
```

### Code Formatting

```bash
# Install dev dependencies
pip install black flake8

# Format code
black backend/app

# Lint code
flake8 backend/app
```

### Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration
│   │   ├── worker.py         # Model worker process
│   │   ├── model_wrapper.py  # F5-TTS model wrapper
│   │   └── f5_tts/           # F5-TTS model code
│   ├── tests/
│   │   └── test_endpoints.py
│   ├── requirements.txt
│   ├── Dockerfile            # CPU image
│   └── Dockerfile.cuda       # GPU image
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── scripts/
│   └── download_weights.sh
├── models/                   # Model checkpoints (not in git)
├── data/
│   ├── uploads/             # Uploaded samples
│   └── embeddings/          # Cached embeddings
├── docker-compose.yml
└── README.md
```

## 🐛 Troubleshooting

### Models not loading
- Ensure you ran `./scripts/download_weights.sh`
- Check that models exist in `models/F5TTS_Base/`
- Verify disk space (models are ~1-2 GB each)

### GPU not detected
- Verify NVIDIA Docker is installed: `docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi`
- Check CUDA version compatibility
- Ensure `--profile gpu` is used with docker-compose

### Out of memory
- Reduce `MAX_CONCURRENT_REQUESTS` in config
- Use light mode instead of high mode
- Increase swap space or RAM
- For GPU: reduce batch size or use smaller model

### Slow synthesis
- Light mode is expected to be slower (CPU-bound)
- First request is slower (model loading)
- Check CPU/GPU utilization
- Enable speaker embedding caching (default on)

### Docker build fails
- Check Docker and docker-compose versions
- Ensure sufficient disk space (>10 GB)
- Try building without cache: `docker-compose build --no-cache`

## ⚖️ Ethics and Responsible Use

### Permitted Use

This tool is designed for **authorized internal use only**. Acceptable uses include:

- Research and development
- Creating synthetic voices with explicit consent
- Accessibility applications (e.g., voice restoration)
- Educational purposes

### Consent Requirement

**You MUST obtain explicit consent before cloning someone's voice.** Using this tool to clone voices without permission may violate:

- Privacy rights
- Copyright and personality rights
- Terms of service of audio platforms
- Local and international laws

### Mitigation Strategies

This MVP includes:

1. **Rate Limiting**: Prevents abuse through request throttling
2. **Logging**: All requests are logged for audit purposes
3. **Access Control**: Optional API key authentication

Additional recommended safeguards:

- **Audio Watermarking**: Add inaudible markers to generated audio
- **User Authentication**: Implement proper user auth in production
- **Usage Monitoring**: Track and review synthesis patterns
- **Content Filtering**: Block generation of harmful content
- **Disclosure**: Mark synthetic audio as AI-generated

### Legal Considerations

- Voice cloning may be restricted in your jurisdiction
- Generated audio may not be suitable for commercial use without proper licensing
- The F5-TTS model is trained on the Emilia dataset under CC-BY-NC license
- Consult legal counsel before production deployment

### Reporting Abuse

If you discover misuse of this tool, please:
1. Document the incident
2. Report to your organization's security team
3. Consider disabling the service until investigation is complete

## 📄 License

This project builds upon F5-TTS, which is licensed under MIT for code and CC-BY-NC for pre-trained models.

- **Code**: MIT License
- **Pre-trained Models**: CC-BY-NC (non-commercial use only)

## 🙏 Acknowledgments

- [F5-TTS](https://github.com/SWivid/F5-TTS) by SWivid team
- [Vocos](https://github.com/charactr/vocos) vocoder
- [FastAPI](https://fastapi.tiangolo.com/) framework

## 📞 Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review [F5-TTS Issues](https://github.com/SWivid/F5-TTS/issues)
3. Contact your system administrator

---

**⚠️ WARNING**: This is a powerful tool. Use responsibly and ethically. Always obtain consent before cloning voices.
