/**
 * TTS Web Application - Frontend JavaScript
 * Handles user interactions and API communication
 */

// DOM Elements
const modelSelect = document.getElementById('modelSelect');
const languageInput = document.getElementById('languageInput');
const textInput = document.getElementById('textInput');
const textCloneInput = document.getElementById('textCloneInput');
const speakerFile = document.getElementById('speakerFile');
const synthesizeBtn = document.getElementById('synthesizeBtn');
const cloneBtn = document.getElementById('cloneBtn');
const statusMessage = document.getElementById('statusMessage');
const progressBar = document.getElementById('progressBar');
const audioResult = document.getElementById('audioResult');
const audioPlayer = document.getElementById('audioPlayer');
const downloadLink = document.getElementById('downloadLink');

// API Base URL
const API_BASE = window.location.origin;

/**
 * Show status message to user
 */
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    statusMessage.style.display = 'block';
}

/**
 * Hide status message
 */
function hideStatus() {
    statusMessage.style.display = 'none';
    statusMessage.className = 'status-message';
}

/**
 * Show/hide progress bar
 */
function showProgress(show = true) {
    progressBar.style.display = show ? 'block' : 'none';
}

/**
 * Show/hide audio result
 */
function showAudioResult(show = true) {
    audioResult.style.display = show ? 'block' : 'none';
}

/**
 * Disable/enable buttons during processing
 */
function setButtonsEnabled(enabled) {
    synthesizeBtn.disabled = !enabled;
    cloneBtn.disabled = !enabled;
    
    if (!enabled) {
        synthesizeBtn.classList.add('loading');
        cloneBtn.classList.add('loading');
    } else {
        synthesizeBtn.classList.remove('loading');
        cloneBtn.classList.remove('loading');
    }
}

/**
 * Handle synthesize button click
 */
async function handleSynthesize() {
    const text = textInput.value.trim();
    const model = modelSelect.value;
    const language = languageInput.value.trim() || 'he';
    
    // Validate input
    if (!text) {
        showStatus('נא להזין טקסט', 'error');
        return;
    }
    
    if (text.length > 5000) {
        showStatus('הטקסט ארוך מדי. מקסימום 5000 תווים', 'error');
        return;
    }
    
    // Prepare UI
    setButtonsEnabled(false);
    showProgress(true);
    showAudioResult(false);
    showStatus('מעבד... זה עשוי לקחת מספר דקות בהרצה הראשונה בזמן הורדת המודל', 'info');
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('text', text);
        formData.append('model_name', model);
        formData.append('language', language);
        
        // Send request
        const response = await fetch(`${API_BASE}/synthesize`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
            throw new Error(error.detail?.message || error.detail || 'שגיאה בסינתזה');
        }
        
        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Update UI with result
        audioPlayer.src = audioUrl;
        downloadLink.href = audioUrl;
        downloadLink.download = 'synthesized.wav';
        
        showAudioResult(true);
        showStatus('הסינתזה הושלמה בהצלחה! 🎉', 'success');
        
    } catch (error) {
        console.error('Synthesis error:', error);
        showStatus(`שגיאה: ${error.message}`, 'error');
    } finally {
        setButtonsEnabled(true);
        showProgress(false);
    }
}

/**
 * Handle clone button click
 */
async function handleClone() {
    const text = textCloneInput.value.trim();
    const model = modelSelect.value;
    const language = languageInput.value.trim() || 'he';
    const file = speakerFile.files[0];
    
    // Validate input
    if (!text) {
        showStatus('נא להזין טקסט לשיבוט', 'error');
        return;
    }
    
    if (!file) {
        showStatus('נא להעלות קובץ אודיו של הדובר', 'error');
        return;
    }
    
    if (text.length > 5000) {
        showStatus('הטקסט ארוך מדי. מקסימום 5000 תווים', 'error');
        return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showStatus('הקובץ גדול מדי. מקסימום 5MB', 'error');
        return;
    }
    
    // Check file type
    const validTypes = ['.wav', '.mp3', '.flac', '.ogg'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validTypes.includes(fileExt)) {
        showStatus('פורמט קובץ לא נתמך. השתמש ב-WAV, MP3, FLAC או OGG', 'error');
        return;
    }
    
    // Prepare UI
    setButtonsEnabled(false);
    showProgress(true);
    showAudioResult(false);
    showStatus('משבט קול... זה עשוי לקחת מספר דקות בהרצה הראשונה', 'info');
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('text', text);
        formData.append('speaker_wav', file);
        formData.append('model_name', model);
        formData.append('language', language);
        
        // Send request
        const response = await fetch(`${API_BASE}/clone`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
            throw new Error(error.detail?.message || error.detail || 'שגיאה בשיבוט קול');
        }
        
        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Update UI with result
        audioPlayer.src = audioUrl;
        downloadLink.href = audioUrl;
        downloadLink.download = 'cloned.wav';
        
        showAudioResult(true);
        showStatus('שיבוט הקול הושלם בהצלחה! 🎉', 'success');
        
    } catch (error) {
        console.error('Clone error:', error);
        showStatus(`שגיאה: ${error.message}`, 'error');
    } finally {
        setButtonsEnabled(true);
        showProgress(false);
    }
}

/**
 * Check server health on page load
 */
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy' && data.tts_available) {
            console.log('Server is healthy and TTS is available');
        } else if (!data.tts_available) {
            showStatus('⚠️ ספריית TTS לא זמינה. אנא הפעל דרך Docker', 'warning');
        }
    } catch (error) {
        console.error('Health check failed:', error);
        showStatus('⚠️ לא ניתן להתחבר לשרת. אנא ודא שהשרת פועל', 'error');
    }
}

/**
 * Handle file input change
 */
function handleFileChange() {
    const file = speakerFile.files[0];
    if (file) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        if (file.size > 5 * 1024 * 1024) {
            showStatus(`הקובץ גדול מדי (${sizeMB}MB). מקסימום 5MB`, 'error');
            speakerFile.value = '';
        } else {
            console.log(`File selected: ${file.name} (${sizeMB}MB)`);
        }
    }
}

// Event Listeners
synthesizeBtn.addEventListener('click', handleSynthesize);
cloneBtn.addEventListener('click', handleClone);
speakerFile.addEventListener('change', handleFileChange);

// Allow Enter key in text input to trigger synthesis
textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        handleSynthesize();
    }
});

textCloneInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        handleClone();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('TTS Web Application loaded');
    checkHealth();
});
