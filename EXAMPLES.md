# F5-TTS Web MVP - Example API Usage

## Prerequisites

Make sure the server is running:
```bash
docker-compose --profile cpu up
```

Or:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Health Check

```bash
curl http://localhost:8000/health
```

Expected output:
```json
{
  "status": "healthy",
  "cuda_available": false,
  "available_modes": ["light"],
  "workers_ready": {
    "light": true,
    "high": false
  }
}
```

## Metrics

```bash
curl http://localhost:8000/metrics
```

Expected output:
```json
{
  "total_requests": 15,
  "total_errors": 2,
  "requests_per_endpoint": {
    "/health": 5,
    "/upload-sample": 3,
    "/synthesize": 2
  },
  "average_processing_time": 12.5
}
```

## Upload Voice Sample

### Upload WAV file

```bash
curl -X POST "http://localhost:8000/upload-sample" \
  -F "file=@/path/to/sample.wav" \
  -F "speaker_name=John Doe"
```

### Upload MP3 file

```bash
curl -X POST "http://localhost:8000/upload-sample" \
  -F "file=@/path/to/sample.mp3"
```

Expected output:
```json
{
  "success": true,
  "sample_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "sample.wav",
  "duration": 5.2
}
```

Save the `sample_id` for the next step!

## Synthesize Speech

### Basic synthesis (without reference text)

```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of voice cloning technology.",
    "uploaded_sample_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "light"
  }'
```

### Synthesis with reference text (recommended)

```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The quick brown fox jumps over the lazy dog.",
    "uploaded_sample_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "light",
    "ref_text": "This is what I said in the sample recording.",
    "speed": 1.0
  }'
```

### High-quality synthesis (GPU mode)

```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "High quality voice synthesis with GPU acceleration.",
    "uploaded_sample_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "high",
    "speed": 1.0
  }'
```

### Synthesis with faster speed

```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Speaking faster than normal speed.",
    "uploaded_sample_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "light",
    "speed": 1.5
  }'
```

Expected output:
```json
{
  "success": true,
  "audio_url": "/download/xyz789-audio-id",
  "audio_id": "xyz789-audio-id",
  "duration": 3.5,
  "processing_time": 8.2,
  "rtf": 0.43
}
```

Note: `rtf` (Real-Time Factor) < 1.0 means faster than real-time synthesis.

## Download Audio

```bash
curl "http://localhost:8000/download/xyz789-audio-id" -o output.wav
```

Or open in browser:
```
http://localhost:8000/download/xyz789-audio-id
```

## Complete Workflow Example

```bash
#!/bin/bash

# 1. Upload sample
echo "Uploading voice sample..."
UPLOAD_RESPONSE=$(curl -s -X POST "http://localhost:8000/upload-sample" \
  -F "file=@sample.wav" \
  -F "speaker_name=Test Speaker")

# Extract sample_id
SAMPLE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.sample_id')
echo "Sample ID: $SAMPLE_ID"

# 2. Synthesize speech
echo "Synthesizing speech..."
SYNTH_RESPONSE=$(curl -s -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"This is a complete example of the voice cloning workflow.\",
    \"uploaded_sample_id\": \"$SAMPLE_ID\",
    \"mode\": \"light\",
    \"ref_text\": \"This is my voice in the sample.\",
    \"speed\": 1.0
  }")

# Extract audio URL
AUDIO_URL=$(echo $SYNTH_RESPONSE | jq -r '.audio_url')
echo "Audio URL: $AUDIO_URL"

# 3. Download audio
echo "Downloading audio..."
curl "http://localhost:8000$AUDIO_URL" -o synthesized_output.wav

echo "Done! Audio saved to synthesized_output.wav"

# 4. Play audio (if you have a player installed)
# ffplay -autoexit -nodisp synthesized_output.wav
# or
# aplay synthesized_output.wav
```

## API Authentication (Optional)

If API key authentication is enabled:

```bash
# Set environment variable
export API_KEY="your-secret-key-here"

# Include in requests
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{...}'
```

## Error Handling

### Invalid file format

```bash
curl -X POST "http://localhost:8000/upload-sample" \
  -F "file=@document.pdf"
```

Expected output:
```json
{
  "detail": "Invalid file format. Allowed: {'.wav', '.mp3', '.flac', '.ogg', '.m4a'}"
}
```

### Missing sample ID

```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "mode": "light"
  }'
```

Expected output:
```json
{
  "detail": "Must provide uploaded_sample_id or speaker_id"
}
```

### GPU mode not available

```bash
curl -X POST "http://localhost:8000/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "uploaded_sample_id": "abc123",
    "mode": "high"
  }'
```

Expected output (if GPU not available):
```json
{
  "detail": "High-quality GPU mode not available. GPU not detected or worker failed to start."
}
```

## Rate Limiting

If you exceed the rate limit:

```bash
# Make too many requests
for i in {1..15}; do
  curl http://localhost:8000/health
done
```

Expected output (after limit exceeded):
```json
{
  "detail": "Rate limit exceeded. Maximum 10 requests per minute."
}
```

## Python Example

```python
import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

# 1. Upload sample
with open("sample.wav", "rb") as f:
    files = {"file": ("sample.wav", f, "audio/wav")}
    response = requests.post(f"{BASE_URL}/upload-sample", files=files)
    upload_data = response.json()
    sample_id = upload_data["sample_id"]
    print(f"Uploaded sample: {sample_id}")

# 2. Synthesize
synthesis_request = {
    "text": "Hello, this is synthesized speech.",
    "uploaded_sample_id": sample_id,
    "mode": "light",
    "speed": 1.0,
    "ref_text": "This is my voice sample."
}

response = requests.post(
    f"{BASE_URL}/synthesize",
    json=synthesis_request,
    headers={"Content-Type": "application/json"}
)

synth_data = response.json()
audio_url = synth_data["audio_url"]
print(f"Synthesis complete: {audio_url}")

# 3. Download audio
audio_response = requests.get(f"{BASE_URL}{audio_url}")
with open("output.wav", "wb") as f:
    f.write(audio_response.content)
print("Audio saved to output.wav")
```

## JavaScript/Node.js Example

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:8000';

async function voiceCloneWorkflow() {
  try {
    // 1. Upload sample
    const formData = new FormData();
    formData.append('file', fs.createReadStream('sample.wav'));
    
    const uploadResponse = await axios.post(
      `${BASE_URL}/upload-sample`,
      formData,
      { headers: formData.getHeaders() }
    );
    
    const sampleId = uploadResponse.data.sample_id;
    console.log('Uploaded sample:', sampleId);
    
    // 2. Synthesize
    const synthResponse = await axios.post(
      `${BASE_URL}/synthesize`,
      {
        text: 'Hello from JavaScript!',
        uploaded_sample_id: sampleId,
        mode: 'light',
        speed: 1.0
      }
    );
    
    const audioUrl = synthResponse.data.audio_url;
    console.log('Synthesis complete:', audioUrl);
    
    // 3. Download audio
    const audioResponse = await axios.get(
      `${BASE_URL}${audioUrl}`,
      { responseType: 'arraybuffer' }
    );
    
    fs.writeFileSync('output.wav', audioResponse.data);
    console.log('Audio saved to output.wav');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

voiceCloneWorkflow();
```

## Testing with a Demo Sample

If you don't have an audio file, create a simple test using text-to-speech:

```bash
# On macOS
say -o sample.wav "This is a test voice sample for cloning"

# On Linux (with espeak)
espeak "This is a test voice sample for cloning" -w sample.wav

# On Windows (PowerShell)
# Add-Type -AssemblyName System.Speech
# $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
# $speak.SetOutputToWaveFile("sample.wav")
# $speak.Speak("This is a test voice sample for cloning")
```

Then use this sample.wav with the API!
