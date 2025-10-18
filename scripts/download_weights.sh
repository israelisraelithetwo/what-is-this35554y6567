#!/bin/bash
# Download F5-TTS model weights
# This script downloads the pre-trained model checkpoints from Hugging Face

set -e

echo "F5-TTS Model Download Script"
echo "============================="
echo ""

# Create models directory
mkdir -p models/F5TTS_Base
mkdir -p models/E2TTS_Base

# Check if Python and huggingface-hub are available
if ! command -v python &> /dev/null; then
    echo "Error: Python not found. Please install Python 3.8+ first."
    exit 1
fi

# Install huggingface-hub if not available
pip install -q huggingface-hub

echo "Downloading F5-TTS Base model checkpoint..."
python << EOF
from huggingface_hub import hf_hub_download
import os

# Download F5-TTS Base model
print("Downloading F5TTS_Base model...")
try:
    model_path = hf_hub_download(
        repo_id="SWivid/F5-TTS",
        filename="F5TTS_Base/model_1200000.safetensors",
        local_dir="models",
        local_dir_use_symlinks=False
    )
    print(f"✓ Downloaded F5TTS_Base model to: {model_path}")
except Exception as e:
    print(f"✗ Failed to download F5TTS_Base: {e}")
    print("  You may need to manually download from: https://huggingface.co/SWivid/F5-TTS")

# Download E2TTS Base model (optional)
print("\nDownloading E2TTS_Base model (optional)...")
try:
    model_path = hf_hub_download(
        repo_id="SWivid/E2-TTS",
        filename="E2TTS_Base/model_1200000.safetensors",
        local_dir="models",
        local_dir_use_symlinks=False
    )
    print(f"✓ Downloaded E2TTS_Base model to: {model_path}")
except Exception as e:
    print(f"✗ Failed to download E2TTS_Base: {e}")
    print("  This is optional. You can use F5TTS_Base instead.")

# Download Vocos vocoder
print("\nDownloading Vocos vocoder...")
try:
    config_path = hf_hub_download(
        repo_id="charactr/vocos-mel-24khz",
        filename="config.yaml",
        local_dir="models/vocos",
        local_dir_use_symlinks=False
    )
    model_path = hf_hub_download(
        repo_id="charactr/vocos-mel-24khz",
        filename="pytorch_model.bin",
        local_dir="models/vocos",
        local_dir_use_symlinks=False
    )
    print(f"✓ Downloaded Vocos vocoder")
except Exception as e:
    print(f"✗ Failed to download Vocos: {e}")
    print("  The system will try to download it automatically on first run.")

print("\n" + "="*50)
print("Download complete!")
print("="*50)
print("\nModel locations:")
print("  - F5TTS_Base: models/F5TTS_Base/model_1200000.safetensors")
print("  - E2TTS_Base: models/E2TTS_Base/model_1200000.safetensors (optional)")
print("  - Vocos: models/vocos/ (auto-downloaded if needed)")
print("\nYou can now run the application with:")
print("  docker-compose --profile cpu up    # CPU mode")
print("  docker-compose --profile gpu up    # GPU mode (requires NVIDIA GPU)")
EOF

echo ""
echo "Note: Model weights are ~1-2GB per model."
echo "      First run may take additional time to load models into memory."
