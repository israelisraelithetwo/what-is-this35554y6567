// F5-TTS Web MVP - Frontend JavaScript

// API Base URL
const API_BASE = window.location.origin;

// State
let state = {
    sampleId: null,
    fileName: null,
    fileDuration: null,
    healthStatus: null,
};

// DOM Elements
const elements = {
    audioFile: document.getElementById('audio-file'),
    uploadText: document.getElementById('upload-text'),
    uploadInfo: document.getElementById('upload-info'),
    uploadError: document.getElementById('upload-error'),
    fileName: document.getElementById('file-name'),
    fileDuration: document.getElementById('file-duration'),
    sampleId: document.getElementById('sample-id'),
    refText: document.getElementById('ref-text'),
    synthesisText: document.getElementById('synthesis-text'),
    charCount: document.getElementById('char-count'),
    modeSelect: document.getElementById('mode-select'),
    modeWarning: document.getElementById('mode-warning'),
    speedSlider: document.getElementById('speed-slider'),
    speedValue: document.getElementById('speed-value'),
    synthesizeBtn: document.getElementById('synthesize-btn'),
    progress: document.getElementById('progress'),
    resultsSection: document.getElementById('results-section'),
    errorSection: document.getElementById('error-section'),
    errorMessage: document.getElementById('error-message'),
    audioPlayer: document.getElementById('audio-player'),
    resultDuration: document.getElementById('result-duration'),
    resultTime: document.getElementById('result-time'),
    resultRtf: document.getElementById('result-rtf'),
    downloadLink: document.getElementById('download-link'),
    synthesizeAgainBtn: document.getElementById('synthesize-again-btn'),
    tryAgainBtn: document.getElementById('try-again-btn'),
    status: document.getElementById('status'),
    statusText: document.getElementById('status-text'),
    modeIndicators: document.getElementById('mode-indicators'),
};

// Initialize
async function init() {
    await checkHealth();
    setupEventListeners();
    updateSynthesizeButton();
}

// Check Health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        state.healthStatus = data;
        
        // Update status indicator
        elements.statusText.textContent = `Status: ${data.status}`;
        if (data.status === 'healthy') {
            elements.status.classList.remove('error');
        } else {
            elements.status.classList.add('error');
        }
        
        // Update mode indicators
        elements.modeIndicators.innerHTML = '';
        data.available_modes.forEach(mode => {
            const badge = document.createElement('div');
            badge.className = 'mode-badge available';
            badge.textContent = `${mode.toUpperCase()} Mode Available`;
            elements.modeIndicators.appendChild(badge);
        });
        
        // Check GPU availability
        if (!data.cuda_available || !data.workers_ready.high) {
            elements.modeWarning.style.display = 'block';
            // Disable high mode option
            const highOption = elements.modeSelect.querySelector('option[value="high"]');
            if (highOption) {
                highOption.disabled = true;
            }
            // Select light mode
            elements.modeSelect.value = 'light';
        }
        
    } catch (error) {
        console.error('Health check failed:', error);
        elements.statusText.textContent = 'Status: Error - Cannot connect to server';
        elements.status.classList.add('error');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // File upload
    elements.audioFile.addEventListener('change', handleFileUpload);
    
    // Drag and drop
    const uploadLabel = document.querySelector('.upload-label');
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = 'var(--primary-color)';
    });
    
    uploadLabel.addEventListener('dragleave', () => {
        uploadLabel.style.borderColor = 'var(--border-color)';
    });
    
    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = 'var(--border-color)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            elements.audioFile.files = files;
            handleFileUpload();
        }
    });
    
    // Text input
    elements.synthesisText.addEventListener('input', () => {
        const length = elements.synthesisText.value.length;
        elements.charCount.textContent = length;
        updateSynthesizeButton();
    });
    
    // Speed slider
    elements.speedSlider.addEventListener('input', () => {
        elements.speedValue.textContent = `${elements.speedSlider.value}x`;
    });
    
    // Synthesize button
    elements.synthesizeBtn.addEventListener('click', handleSynthesize);
    
    // Action buttons
    elements.synthesizeAgainBtn.addEventListener('click', resetForm);
    elements.tryAgainBtn.addEventListener('click', () => {
        elements.errorSection.style.display = 'none';
    });
}

// Handle File Upload
async function handleFileUpload() {
    const file = elements.audioFile.files[0];
    if (!file) return;
    
    elements.uploadError.style.display = 'none';
    elements.uploadText.textContent = 'Uploading...';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/upload-sample`, {
            method: 'POST',
            body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Upload failed');
        }
        
        if (data.success) {
            state.sampleId = data.sample_id;
            state.fileName = data.filename;
            state.fileDuration = data.duration;
            
            elements.fileName.textContent = data.filename;
            elements.fileDuration.textContent = data.duration 
                ? `${data.duration.toFixed(2)} seconds` 
                : 'Unknown';
            elements.sampleId.textContent = data.sample_id;
            
            elements.uploadInfo.style.display = 'block';
            elements.uploadText.textContent = '✅ Upload successful! Change file';
            
            updateSynthesizeButton();
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        elements.uploadError.textContent = `Error: ${error.message}`;
        elements.uploadError.style.display = 'block';
        elements.uploadText.textContent = 'Choose audio file or drag & drop';
    }
}

// Update Synthesize Button
function updateSynthesizeButton() {
    const hasText = elements.synthesisText.value.trim().length > 0;
    const hasSample = state.sampleId !== null;
    
    elements.synthesizeBtn.disabled = !(hasText && hasSample);
}

// Handle Synthesize
async function handleSynthesize() {
    // Hide previous results
    elements.resultsSection.style.display = 'none';
    elements.errorSection.style.display = 'none';
    
    // Show progress
    elements.progress.style.display = 'block';
    elements.synthesizeBtn.disabled = true;
    
    try {
        const requestData = {
            text: elements.synthesisText.value.trim(),
            uploaded_sample_id: state.sampleId,
            mode: elements.modeSelect.value,
            speed: parseFloat(elements.speedSlider.value),
        };
        
        // Add reference text if provided
        const refText = elements.refText.value.trim();
        if (refText) {
            requestData.ref_text = refText;
        }
        
        const response = await fetch(`${API_BASE}/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Synthesis failed');
        }
        
        if (data.success) {
            showResults(data);
        } else {
            throw new Error(data.error || 'Synthesis failed');
        }
        
    } catch (error) {
        console.error('Synthesis error:', error);
        showError(error.message);
    } finally {
        elements.progress.style.display = 'none';
        elements.synthesizeBtn.disabled = false;
    }
}

// Show Results
function showResults(data) {
    elements.resultsSection.style.display = 'block';
    
    // Set audio source
    const audioUrl = `${API_BASE}${data.audio_url}`;
    elements.audioPlayer.src = audioUrl;
    
    // Set download link
    elements.downloadLink.href = audioUrl;
    elements.downloadLink.download = `synthesis_${data.audio_id}.wav`;
    
    // Set metrics
    elements.resultDuration.textContent = data.duration 
        ? data.duration.toFixed(2) 
        : 'N/A';
    elements.resultTime.textContent = data.processing_time 
        ? data.processing_time.toFixed(2) 
        : 'N/A';
    elements.resultRtf.textContent = data.rtf 
        ? data.rtf.toFixed(3) 
        : 'N/A';
    
    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Show Error
function showError(message) {
    elements.errorSection.style.display = 'block';
    elements.errorMessage.textContent = message;
    
    // Scroll to error
    elements.errorSection.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form
function resetForm() {
    elements.resultsSection.style.display = 'none';
    elements.errorSection.style.display = 'none';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
