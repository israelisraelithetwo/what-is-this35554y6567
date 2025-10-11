#!/usr/bin/env python3
"""
Helper script to pre-download TTS models.
This can be useful to warm up the cache before first use.
"""

import sys
import argparse

try:
    from TTS.api import TTS
except ImportError:
    print("Error: TTS library not installed.")
    print("Please install it with: pip install TTS")
    print("Or run this script inside the Docker container.")
    sys.exit(1)


AVAILABLE_MODELS = {
    "your_tts": "tts_models/multilingual/multi-dataset/your_tts",
    "xtts_v2": "tts_models/multilingual/multi-dataset/xtts_v2"
}


def download_model(model_name: str):
    """Download and cache a TTS model."""
    resolved_model = AVAILABLE_MODELS.get(model_name, model_name)
    
    print(f"Downloading model: {resolved_model}")
    print("This may take several minutes depending on your internet connection...")
    
    try:
        tts = TTS(resolved_model)
        print(f"✓ Model {resolved_model} downloaded and cached successfully!")
        return True
    except Exception as e:
        print(f"✗ Failed to download model: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Pre-download TTS models to cache"
    )
    parser.add_argument(
        "--model",
        choices=list(AVAILABLE_MODELS.keys()) + ["all"],
        default="your_tts",
        help="Model to download (default: your_tts)"
    )
    
    args = parser.parse_args()
    
    if args.model == "all":
        print("Downloading all available models...")
        for model_name in AVAILABLE_MODELS.keys():
            print(f"\n--- Downloading {model_name} ---")
            download_model(model_name)
    else:
        download_model(args.model)


if __name__ == "__main__":
    main()
