# Dockerfile for TTS Web Application
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libsndfile1-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install TTS from PyPI
RUN pip install --no-cache-dir TTS

# Copy application files
COPY server.py .
COPY static/ ./static/

# Create directory for model cache
RUN mkdir -p /root/.local/share/tts

# Expose port
EXPOSE 5002

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV COQUI_TOS_AGREED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5002/health')" || exit 1

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5002"]
