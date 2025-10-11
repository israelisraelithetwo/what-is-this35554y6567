"""
Unit tests for TTS web application endpoints.
Uses mocking to avoid downloading actual TTS models.
"""

import pytest
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def mock_tts():
    """Create a mock TTS object that simulates model behavior."""
    mock = Mock()
    
    # Mock the tts_to_file method
    def mock_tts_to_file(text, file_path, language=None, **kwargs):
        # Create a minimal WAV file (44 bytes header + some data)
        with open(file_path, 'wb') as f:
            # Write a minimal valid WAV header
            f.write(b'RIFF')
            f.write((36 + 1000).to_bytes(4, 'little'))  # File size - 8
            f.write(b'WAVE')
            f.write(b'fmt ')
            f.write((16).to_bytes(4, 'little'))  # fmt chunk size
            f.write((1).to_bytes(2, 'little'))   # audio format (PCM)
            f.write((1).to_bytes(2, 'little'))   # num channels
            f.write((22050).to_bytes(4, 'little'))  # sample rate
            f.write((44100).to_bytes(4, 'little'))  # byte rate
            f.write((2).to_bytes(2, 'little'))   # block align
            f.write((16).to_bytes(2, 'little'))  # bits per sample
            f.write(b'data')
            f.write((1000).to_bytes(4, 'little'))  # data chunk size
            # Write some fake audio data
            f.write(b'\x00' * 1000)
    
    mock.tts_to_file = Mock(side_effect=mock_tts_to_file)
    mock.tts_with_vc_to_file = Mock(side_effect=mock_tts_to_file)
    
    return mock


@pytest.fixture
def app_with_mocked_tts(mock_tts):
    """Create FastAPI app with mocked TTS."""
    with patch('server.TTS_AVAILABLE', True):
        with patch('server.TTS') as MockTTS:
            MockTTS.return_value = mock_tts
            
            # Import after patching
            import server
            server.TTS_AVAILABLE = True
            server.TTS = MockTTS
            server.model_cache.clear()
            
            yield server.app


@pytest.fixture
def client(app_with_mocked_tts):
    """Create test client."""
    return TestClient(app_with_mocked_tts)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "tts_available" in data


def test_list_models(client):
    """Test models listing endpoint."""
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "available_models" in data
    assert "default_model" in data
    assert "your_tts" in data["available_models"]
    assert "xtts_v2" in data["available_models"]


def test_synthesize_basic(client):
    """Test basic text synthesis."""
    response = client.post(
        "/synthesize",
        data={
            "text": "שלום עולם",
            "model_name": "your_tts",
            "language": "he"
        }
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert len(response.content) > 0
    
    # Verify it's a WAV file (starts with RIFF)
    assert response.content[:4] == b'RIFF'


def test_synthesize_empty_text(client):
    """Test synthesis with empty text."""
    response = client.post(
        "/synthesize",
        data={
            "text": "",
            "model_name": "your_tts",
            "language": "he"
        }
    )
    
    assert response.status_code == 400


def test_synthesize_long_text(client):
    """Test synthesis with text exceeding max length."""
    long_text = "א" * 6000  # Exceeds MAX_TEXT_LENGTH
    
    response = client.post(
        "/synthesize",
        data={
            "text": long_text,
            "model_name": "your_tts",
            "language": "he"
        }
    )
    
    assert response.status_code == 400


def test_clone_voice_basic(client):
    """Test basic voice cloning."""
    # Create a temporary WAV file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
        tmp_path = tmp_file.name
        # Write minimal WAV header
        tmp_file.write(b'RIFF')
        tmp_file.write((36 + 1000).to_bytes(4, 'little'))
        tmp_file.write(b'WAVE')
        tmp_file.write(b'fmt ')
        tmp_file.write((16).to_bytes(4, 'little'))
        tmp_file.write((1).to_bytes(2, 'little'))
        tmp_file.write((1).to_bytes(2, 'little'))
        tmp_file.write((22050).to_bytes(4, 'little'))
        tmp_file.write((44100).to_bytes(4, 'little'))
        tmp_file.write((2).to_bytes(2, 'little'))
        tmp_file.write((16).to_bytes(2, 'little'))
        tmp_file.write(b'data')
        tmp_file.write((1000).to_bytes(4, 'little'))
        tmp_file.write(b'\x00' * 1000)
    
    try:
        with open(tmp_path, 'rb') as f:
            response = client.post(
                "/clone",
                data={
                    "text": "טקסט לשיבוט",
                    "model_name": "your_tts",
                    "language": "he"
                },
                files={"speaker_wav": ("speaker.wav", f, "audio/wav")}
            )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/wav"
        assert len(response.content) > 0
        assert response.content[:4] == b'RIFF'
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_clone_voice_no_file(client):
    """Test voice cloning without file upload."""
    response = client.post(
        "/clone",
        data={
            "text": "טקסט לשיבוט",
            "model_name": "your_tts",
            "language": "he"
        }
    )
    
    assert response.status_code == 422  # Validation error - missing file


def test_clone_voice_empty_text(client):
    """Test voice cloning with empty text."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
        tmp_path = tmp_file.name
        tmp_file.write(b'RIFF' + b'\x00' * 1040)
    
    try:
        with open(tmp_path, 'rb') as f:
            response = client.post(
                "/clone",
                data={
                    "text": "",
                    "model_name": "your_tts",
                    "language": "he"
                },
                files={"speaker_wav": ("speaker.wav", f, "audio/wav")}
            )
        
        assert response.status_code == 400
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_clone_voice_large_file(client):
    """Test voice cloning with file exceeding size limit."""
    # Create a file larger than MAX_FILE_SIZE (5MB)
    large_data = b'\x00' * (6 * 1024 * 1024)
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
        tmp_path = tmp_file.name
        tmp_file.write(large_data)
    
    try:
        with open(tmp_path, 'rb') as f:
            response = client.post(
                "/clone",
                data={
                    "text": "טקסט לשיבוט",
                    "model_name": "your_tts",
                    "language": "he"
                },
                files={"speaker_wav": ("speaker.wav", f, "audio/wav")}
            )
        
        assert response.status_code == 413
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_clone_voice_invalid_format(client):
    """Test voice cloning with invalid file format."""
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp_file:
        tmp_path = tmp_file.name
        tmp_file.write(b'not audio data')
    
    try:
        with open(tmp_path, 'rb') as f:
            response = client.post(
                "/clone",
                data={
                    "text": "טקסט לשיבוט",
                    "model_name": "your_tts",
                    "language": "he"
                },
                files={"speaker_wav": ("speaker.txt", f, "text/plain")}
            )
        
        assert response.status_code == 400
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_model_caching(client):
    """Test that models are cached after first load."""
    # First request
    response1 = client.post(
        "/synthesize",
        data={
            "text": "שלום",
            "model_name": "your_tts",
            "language": "he"
        }
    )
    assert response1.status_code == 200
    
    # Second request - should use cached model
    response2 = client.post(
        "/synthesize",
        data={
            "text": "שלום שוב",
            "model_name": "your_tts",
            "language": "he"
        }
    )
    assert response2.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
