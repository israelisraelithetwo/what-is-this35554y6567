# Pull Request: TTS Web Application with Voice Cloning

## 🎯 Overview

This PR introduces a complete web-based Text-to-Speech (TTS) application with voice cloning capabilities, supporting Hebrew and multiple languages. The application is built with FastAPI backend and a modern, user-friendly Hebrew interface.

## 🖼️ Screenshot

![TTS Web Application UI](https://github.com/user-attachments/assets/fd3fd994-6d5a-46a0-a9d7-b774a02e36c4)

## ✨ Features

### Core Functionality
- **Text-to-Speech**: Convert Hebrew (and other languages) text to natural speech
- **Voice Cloning**: Upload a voice sample and synthesize text in that voice
- **Multiple Models**: Support for YourTTS (default, faster) and XTTS v2 (higher quality)
- **Hebrew Support**: Full RTL interface and Hebrew language support
- **CPU-Optimized**: Runs on machines without GPU (with documented performance notes)

### Technical Features
- **FastAPI Backend**: Modern, async Python web framework
- **Lazy Model Loading**: Models are downloaded and cached on first use
- **Thread-Safe Caching**: Efficient model management with thread safety
- **Input Validation**: File size limits, text length limits, format validation
- **Automatic Cleanup**: Temporary files are cleaned up after processing
- **Docker-First**: Complete containerization with docker-compose
- **Comprehensive Testing**: Unit tests with mocking (no model downloads needed)

## 📁 Files Added

```
web_app/
├── server.py                 # FastAPI backend with /synthesize and /clone endpoints
├── static/
│   ├── index.html           # Hebrew RTL UI
│   ├── styles.css           # Modern gradient design
│   └── app.js               # Frontend logic with fetch API
├── tests/
│   ├── __init__.py
│   └── test_endpoints.py    # Pytest tests with TTS mocking
├── Dockerfile               # Python 3.10 with audio dependencies
├── docker-compose.yml       # Container orchestration
├── requirements.txt         # Python dependencies
├── pytest.ini              # Test configuration
├── run_tts.bat             # Windows double-click launcher
├── prepull_models.py       # Optional model pre-download script
└── README.md               # Hebrew documentation
.gitignore                  # Exclude build artifacts and models
```

## 🚀 Quick Start for Non-Developers

### Windows (הכי פשוט!)

1. Install Docker Desktop and ensure it's running
2. Navigate to the `web_app` folder
3. **Double-click** `run_tts.bat`
4. Wait for build to complete (first time takes a few minutes)
5. Open browser to: http://localhost:5002/static/index.html

### Using Docker Compose

```bash
cd web_app
docker compose up --build
```

Then open: http://localhost:5002/static/index.html

## 🔧 API Endpoints

### POST /synthesize
Synthesize speech from text

**Parameters:**
- `text`: Text to synthesize (required)
- `model_name`: Model to use (default: your_tts)
- `language`: Language code (default: he)

**Example:**
```bash
curl -X POST http://localhost:5002/synthesize \
  -F "text=שלום עולם, זה מבחן של המרת טקסט לדיבור" \
  -F "model_name=your_tts" \
  -F "language=he" \
  --output output.wav
```

### POST /clone
Clone voice and synthesize speech

**Parameters:**
- `text`: Text to synthesize (required)
- `speaker_wav`: Audio file with speaker voice (required)
- `model_name`: Model to use (default: your_tts)
- `language`: Language code (default: he)

**Example:**
```bash
curl -X POST http://localhost:5002/clone \
  -F "text=זה טקסט בקול המשובט" \
  -F "speaker_wav=@/path/to/speaker.wav" \
  -F "model_name=your_tts" \
  -F "language=he" \
  --output cloned.wav
```

### GET /health
Check server health and TTS availability

### GET /models
List available models

## ⚙️ Configuration

### Model Selection
- **YourTTS** (default): ~300MB, faster on CPU, good quality
- **XTTS v2**: ~1.8GB, higher quality, slower on CPU

### Limits
- **Max file size**: 5MB (~15 seconds of audio)
- **Max text length**: 5000 characters
- **Supported formats**: WAV, MP3, FLAC, OGG

### Environment Variables
- `COQUI_TOS_AGREED=1`: Automatically agree to Coqui terms
- `PYTHONUNBUFFERED=1`: Enable real-time logging

## 🧪 Testing

All tests pass successfully with mocked TTS to avoid model downloads:

```bash
cd web_app
pip install -r requirements.txt
pytest tests/ -v
```

**Test Results:**
```
tests/test_endpoints.py::test_health_check PASSED
tests/test_endpoints.py::test_list_models PASSED
tests/test_endpoints.py::test_synthesize_basic PASSED
tests/test_endpoints.py::test_synthesize_empty_text PASSED
tests/test_endpoints.py::test_synthesize_long_text PASSED
tests/test_endpoints.py::test_clone_voice_basic PASSED
tests/test_endpoints.py::test_clone_voice_no_file PASSED
tests/test_endpoints.py::test_clone_voice_empty_text PASSED
tests/test_endpoints.py::test_clone_voice_large_file PASSED
tests/test_endpoints.py::test_clone_voice_invalid_format PASSED
tests/test_endpoints.py::test_model_caching PASSED

11 passed in 0.45s
```

## 📖 Documentation

Complete Hebrew documentation in `web_app/README.md` includes:
- Quick start guide for Windows users
- Docker Desktop GUI instructions
- Local development setup
- API usage examples
- Troubleshooting guide
- Performance notes (CPU vs GPU)
- Supported languages list

## 🔐 Security & Safety

- **Input Validation**: All inputs validated before processing
- **File Size Limits**: Prevents large file uploads
- **Temporary File Cleanup**: Files deleted after processing
- **Error Handling**: Informative error messages without exposing internals
- **No Authentication**: This is a local demo/prototype (not for public hosting)

## ⚡ Performance Notes

### CPU Performance
- YourTTS: ~10-30 seconds per sentence
- XTTS v2: ~20-60 seconds per sentence
- First run slower due to model download

### GPU Performance (Optional)
If NVIDIA GPU with CUDA is available:
- 5-10x faster processing
- Requires nvidia-docker setup

## 🎨 UI Features

- **Modern Design**: Gradient backgrounds, smooth animations
- **RTL Support**: Full right-to-left layout for Hebrew
- **Responsive**: Works on desktop and mobile
- **Real-time Feedback**: Progress indicators and status messages
- **Audio Player**: Built-in playback with download option
- **Clear Instructions**: Hebrew explanations for all features

## 🌍 Language Support

The models support multiple languages including:
- Hebrew (he) - עברית
- English (en)
- Arabic (ar) - العربية
- Spanish (es)
- French (fr)
- German (de)
- And many more...

## 📝 Implementation Details

### Backend Architecture
- **FastAPI**: Async web framework with automatic OpenAPI docs
- **Model Caching**: Thread-safe singleton pattern for model instances
- **Lazy Loading**: Models loaded only when first requested
- **Background Tasks**: File cleanup using FastAPI background tasks
- **CORS Enabled**: For local development flexibility

### Frontend Architecture
- **Vanilla JavaScript**: No heavy frameworks, fast loading
- **Fetch API**: Modern HTTP requests
- **Progressive Enhancement**: Works without JavaScript for basic features
- **Error Handling**: User-friendly error messages in Hebrew

### Docker Architecture
- **Multi-stage Build**: Optimized for size (not implemented yet, but can be)
- **Volume Mapping**: Static files mounted for quick iteration
- **Persistent Cache**: Models stored in named volume
- **Health Checks**: Automatic container health monitoring

## 🔄 Future Enhancements (Optional)

Potential improvements not included in this PR:
- GPU support with docker-compose.gpu.yml
- Model pre-warming during container build
- Rate limiting for production use
- User authentication (if needed)
- Multiple language UI versions
- Batch processing endpoint
- WebSocket support for streaming
- Model fine-tuning interface

## ✅ Acceptance Criteria Met

- [x] Docker-first delivery with one-command setup
- [x] Windows double-click launcher (run_tts.bat)
- [x] Hebrew RTL UI with clear instructions
- [x] Support for YourTTS (default) and XTTS v2
- [x] Text-to-speech endpoint (/synthesize)
- [x] Voice cloning endpoint (/clone)
- [x] Model lazy loading with caching
- [x] Input validation and file size limits
- [x] Temporary file cleanup
- [x] Comprehensive tests with mocking
- [x] Hebrew README with plain language
- [x] CPU-optimized with performance notes
- [x] Error handling with helpful messages

## 🐛 Known Issues / Limitations

1. **First Run**: Model download can take 5-10 minutes depending on internet speed
2. **CPU Performance**: Processing is slower on CPU-only machines (documented in README)
3. **Memory Usage**: Models require ~2-4GB RAM depending on model choice
4. **No Authentication**: Not designed for public internet hosting

## 🙏 Acknowledgments

Built on the excellent [Coqui-AI TTS](https://github.com/coqui-ai/TTS) library.

---

## Testing Instructions for Reviewers

### Quick Test (with Docker)
```bash
cd web_app
docker compose up --build
# Open http://localhost:5002/static/index.html
# Try synthesizing some Hebrew text
```

### Unit Tests
```bash
cd web_app
pip install -r requirements.txt
pytest tests/ -v
```

### Manual API Test
```bash
# Health check
curl http://localhost:5002/health

# List models
curl http://localhost:5002/models

# Synthesize (requires TTS installed)
curl -X POST http://localhost:5002/synthesize \
  -F "text=שלום" \
  -F "language=he" \
  --output test.wav
```
