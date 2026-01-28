document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const removeImageBtn = document.getElementById('remove-image');
  const detectBtn = document.getElementById('detect-btn');
  const hiddenForm = document.getElementById('hidden-form');
  const hiddenFileInput = document.getElementById('hidden-file-input');
  
  const startCameraBtn = document.getElementById('start-camera');
  const stopCameraBtn = document.getElementById('stop-camera');
  const captureBtn = document.getElementById('capture-btn');
  const liveScanBtn = document.getElementById('live-scan-btn');
  const stopScanBtn = document.getElementById('stop-scan-btn');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const cameraPlaceholder = document.getElementById('camera-placeholder');
  const cameraOverlay = document.getElementById('camera-overlay');
  const liveResults = document.getElementById('live-results');
  const resultsContent = document.getElementById('results-content');
  const statusMessage = document.getElementById('status-message');

  const switchCameraBtn = document.getElementById('switch-camera');

  let stream = null;
  let liveInterval = null;
  let selectedFile = null;
  let currentFacingMode = 'environment'; // Start with back camera
  let hasMultipleCameras = false;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tab).classList.add('active');
    });
  });

  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  });

  function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      showStatus('Please select an image file', 'error');
      return;
    }
    selectedFile = file;
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    hiddenFileInput.files = dataTransfer.files;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      dropZone.classList.add('hidden');
      imagePreview.classList.remove('hidden');
      detectBtn.classList.remove('disabled');
      detectBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  removeImageBtn.addEventListener('click', () => {
    selectedFile = null;
    previewImg.src = '';
    fileInput.value = '';
    hiddenFileInput.value = '';
    imagePreview.classList.add('hidden');
    dropZone.classList.remove('hidden');
    detectBtn.classList.add('disabled');
    detectBtn.disabled = true;
  });

  detectBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    const btnText = detectBtn.querySelector('.btn-text');
    const btnLoader = detectBtn.querySelector('.btn-loader');
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    detectBtn.disabled = true;

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/detect', {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
        } else if (result.success) {
          window.location.reload();
        } else {
          showStatus('Detection completed', 'success');
          resetDetectBtn();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showStatus(errorData.error || 'Detection failed. Please try again.', 'error');
        resetDetectBtn();
      }
    } catch (err) {
      console.error('Detection error:', err);
      hiddenForm.submit();
    }
  });

  function resetDetectBtn() {
    const btnText = detectBtn.querySelector('.btn-text');
    const btnLoader = detectBtn.querySelector('.btn-loader');
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    detectBtn.disabled = false;
  }

  async function startCamera(facingMode = 'environment') {
    try {
      showStatus('Starting camera...', 'info');
      
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      hasMultipleCameras = videoDevices.length > 1;
      
      let constraints = { 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: { ideal: facingMode }
        } 
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      currentFacingMode = facingMode;
      
      cameraPlaceholder.classList.add('hidden');
      video.classList.remove('hidden');
      startCameraBtn.classList.add('hidden');
      stopCameraBtn.classList.remove('hidden');
      captureBtn.classList.remove('hidden');
      liveScanBtn.classList.remove('hidden');
      
      // Show switch button only if multiple cameras available
      if (hasMultipleCameras) {
        switchCameraBtn.classList.remove('hidden');
      } else {
        switchCameraBtn.classList.add('hidden');
      }
      
      hideStatus();
      const cameraType = facingMode === 'environment' ? 'Back' : 'Front';
      showStatus(`${cameraType} camera ready`, 'success');
      setTimeout(hideStatus, 2000);
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        showStatus('Camera access denied. Please allow camera permissions.', 'error');
      } else if (err.name === 'OverconstrainedError') {
        // If the requested camera isn't available, try without facingMode constraint
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          video.srcObject = stream;
          cameraPlaceholder.classList.add('hidden');
          video.classList.remove('hidden');
          startCameraBtn.classList.add('hidden');
          stopCameraBtn.classList.remove('hidden');
          captureBtn.classList.remove('hidden');
          liveScanBtn.classList.remove('hidden');
          showStatus('Camera ready', 'success');
          setTimeout(hideStatus, 2000);
        } catch (fallbackErr) {
          showStatus('Could not access camera. Make sure you\'re using HTTPS.', 'error');
        }
      } else {
        showStatus('Could not access camera. Make sure you\'re using HTTPS.', 'error');
      }
    }
  }

  async function switchCamera() {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    showStatus('Switching camera...', 'info');
    await startCamera(newFacingMode);
  }

  function stopCamera() {
    stopLiveScan();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    video.srcObject = null;
    video.classList.add('hidden');
    cameraPlaceholder.classList.remove('hidden');
    cameraOverlay.classList.add('hidden');
    startCameraBtn.classList.remove('hidden');
    stopCameraBtn.classList.add('hidden');
    switchCameraBtn.classList.add('hidden');
    captureBtn.classList.add('hidden');
    liveScanBtn.classList.add('hidden');
    stopScanBtn.classList.add('hidden');
    liveResults.classList.add('hidden');
    resetCaptureBtn();
    currentFacingMode = 'environment'; // Reset to back camera for next time
  }

  async function captureAndDetect() {
    if (!stream) return;
    
    captureBtn.disabled = true;
    captureBtn.innerHTML = `
      <svg class="spinner" width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-linecap="round"/>
      </svg>
      Processing...
    `;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        showStatus('Failed to capture image', 'error');
        resetCaptureBtn();
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');

      try {
        const response = await fetch('/detect', {
          method: 'POST',
          body: formData,
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.redirect_url) {
            window.location.href = result.redirect_url;
          } else if (result.success) {
            window.location.reload();
          } else {
            showStatus('Capture completed', 'success');
            resetCaptureBtn();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showStatus(errorData.error || 'Detection failed', 'error');
          resetCaptureBtn();
        }
      } catch (err) {
        console.error('Capture error:', err);
        showStatus('Error processing image. Please try again.', 'error');
        resetCaptureBtn();
      }
    }, 'image/jpeg', 0.9);
  }

  function resetCaptureBtn() {
    captureBtn.disabled = false;
    captureBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6" fill="currentColor"/>
      </svg>
      Capture
    `;
  }

  function startLiveScan() {
    if (!stream) return;
    
    liveScanBtn.classList.add('hidden');
    stopScanBtn.classList.remove('hidden');
    cameraOverlay.classList.remove('hidden');
    liveResults.classList.remove('hidden');
    resultsContent.innerHTML = '<p class="scanning">Scanning...</p>';

    liveInterval = setInterval(async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('image', blob, 'live_frame.jpg');

        try {
          const response = await fetch('/detect', {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });

          if (response.ok) {
            const result = await response.json();
            displayLiveResults(result);
          } else {
            const errorData = await response.json().catch(() => ({}));
            resultsContent.innerHTML = `<p class="error-msg">${errorData.error || 'Detection error'}</p>`;
          }
        } catch (err) {
          console.error('Live scan error:', err);
          resultsContent.innerHTML = '<p class="error-msg">Connection error</p>';
        }
      }, 'image/jpeg', 0.8);
    }, 1500);
  }

  function stopLiveScan() {
    if (liveInterval) {
      clearInterval(liveInterval);
      liveInterval = null;
    }
    stopScanBtn.classList.add('hidden');
    liveScanBtn.classList.remove('hidden');
    cameraOverlay.classList.add('hidden');
  }

  function displayLiveResults(data) {
    if (!data) {
      resultsContent.innerHTML = '<p class="no-results">No response received</p>';
      return;
    }

    if (data.error) {
      resultsContent.innerHTML = `<p class="error-msg">${data.error}</p>`;
      return;
    }

    let predictions = [];
    
    if (data.result && Array.isArray(data.result) && data.result.length > 0) {
      const result = data.result[0];
      if (result.predictions) {
        if (Array.isArray(result.predictions)) {
          predictions = result.predictions;
        } else if (result.predictions.predictions && Array.isArray(result.predictions.predictions)) {
          predictions = result.predictions.predictions;
        }
      }
      if (result.output && Array.isArray(result.output)) {
        predictions = result.output;
      }
    }

    if (predictions.length === 0) {
      resultsContent.innerHTML = '<p class="no-results">No plants detected in frame</p>';
      return;
    }

    let html = '';
    predictions.slice(0, 5).forEach(pred => {
      const className = pred.class || pred.label || pred.name || 'Unknown';
      const confidence = Math.round((pred.confidence || pred.score || 0) * 100);
      html += `
        <div class="result-item">
          <span class="result-name">${className}</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${confidence}%"></div>
          </div>
          <span class="confidence-value">${confidence}%</span>
        </div>
      `;
    });

    resultsContent.innerHTML = html;
  }

  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
  }

  function hideStatus() {
    statusMessage.classList.add('hidden');
  }

  startCameraBtn.addEventListener('click', () => startCamera('environment'));
  stopCameraBtn.addEventListener('click', stopCamera);
  switchCameraBtn.addEventListener('click', switchCamera);
  captureBtn.addEventListener('click', captureAndDetect);
  liveScanBtn.addEventListener('click', startLiveScan);
  stopScanBtn.addEventListener('click', stopLiveScan);
});
