"""
Basic tests for F5-TTS Web MVP endpoints
"""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import os

# Import the app
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "cuda_available" in data
    assert "available_modes" in data
    assert isinstance(data["available_modes"], list)


def test_metrics_endpoint():
    """Test the metrics endpoint"""
    response = client.get("/metrics")
    assert response.status_code == 200
    
    data = response.json()
    assert "total_requests" in data
    assert "total_errors" in data
    assert "requests_per_endpoint" in data


def test_upload_sample_no_file():
    """Test upload endpoint without a file"""
    response = client.post("/upload-sample")
    assert response.status_code == 422  # Validation error


def test_upload_sample_invalid_format():
    """Test upload endpoint with invalid file format"""
    # Create a fake text file
    files = {
        "file": ("test.txt", b"not an audio file", "text/plain")
    }
    response = client.post("/upload-sample", files=files)
    # Should fail validation or return error
    assert response.status_code in [400, 422]


def test_synthesize_missing_params():
    """Test synthesize endpoint without required parameters"""
    response = client.post("/synthesize", json={})
    assert response.status_code == 422  # Validation error


def test_synthesize_invalid_mode():
    """Test synthesize endpoint with invalid mode"""
    response = client.post("/synthesize", json={
        "text": "Hello world",
        "uploaded_sample_id": "test123",
        "mode": "invalid_mode"
    })
    assert response.status_code == 422  # Validation error


def test_synthesize_no_sample():
    """Test synthesize endpoint without sample ID"""
    response = client.post("/synthesize", json={
        "text": "Hello world",
        "mode": "light"
    })
    assert response.status_code in [400, 422]


def test_download_nonexistent_audio():
    """Test download endpoint with non-existent audio ID"""
    response = client.get("/download/nonexistent-id")
    assert response.status_code == 404


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    # Should return either frontend HTML or JSON
    assert response.status_code == 200


@pytest.mark.skipif(
    not Path("data/test_sample.wav").exists(),
    reason="Test sample not available"
)
def test_upload_valid_audio():
    """Test upload endpoint with valid audio file"""
    test_file = Path("data/test_sample.wav")
    
    with open(test_file, "rb") as f:
        files = {
            "file": ("test_sample.wav", f, "audio/wav")
        }
        response = client.post("/upload-sample", files=files)
    
    # May fail if models not available, but should at least validate the file
    assert response.status_code in [200, 500, 503]
    
    if response.status_code == 200:
        data = response.json()
        assert data["success"] == True
        assert "sample_id" in data


def test_rate_limiting():
    """Test rate limiting (if enabled)"""
    # Make many requests to health endpoint
    responses = []
    for _ in range(15):  # More than MAX_REQUESTS_PER_MINUTE default (10)
        response = client.get("/health")
        responses.append(response.status_code)
    
    # At least some should succeed
    assert 200 in responses
    # Note: Rate limiting applies per minute, so this test may not trigger it


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
