const openCameraBtn = document.getElementById("open-camera");
const closeCameraBtn = document.getElementById("close-camera");
const captureBtn = document.getElementById("captureBtn");
const startLiveBtn = document.getElementById("startLiveBtn");
const stopLiveBtn = document.getElementById("stopLiveBtn");

const cameraContainer = document.getElementById("camera");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const liveResult = document.getElementById("live-result");

let stream;
let liveStreamInterval;

// --- Open Camera ---
async function openCamera() {
  cameraContainer.classList.remove("hidden");

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");

    let constraints = { video: true };
    if (videoDevices.length > 1) {
      constraints = { video: { facingMode: { exact: "environment" } } };
    }

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (err) {
    console.warn("Back camera not available, trying default camera.", err);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
    } catch (error) {
      alert("Camera access denied or unavailable. Ensure HTTPS and allow camera permissions.");
      console.error(error);
    }
  }
}

// --- Close Camera ---
function closeCamera() {
  stopLiveDetection();
  stream?.getTracks().forEach(track => track.stop());
  cameraContainer.classList.add("hidden");
}

// --- Capture & Detect ---
async function captureAndDetect() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");

    try {
      const response = await fetch("/detect", {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
        } else {
          window.location.reload();
        }
      } else {
        alert("Failed to detect plant. Try again.");
      }
    } catch (err) {
      console.error("Error sending captured image:", err);
      alert("Error sending captured image. Check console.");
    }
  }, "image/jpeg");
}

// --- Live Detection ---
function startLiveDetection() {
  if (!stream) return alert("Camera not active");

  liveStreamInterval = setInterval(async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append("image", blob, "live_frame.jpg");

      try {
        const response = await fetch("/detect", {
          method: "POST",
          body: formData,
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (response.ok) {
          const result = await response.json();
          liveResult.innerText = JSON.stringify(result, null, 2);
        }
      } catch (err) {
        console.error("Live detection error:", err);
      }
    }, "image/jpeg");
  }, 1000); // send every 1 second
}

function stopLiveDetection() {
  clearInterval(liveStreamInterval);
}

// --- Event Listeners ---
openCameraBtn?.addEventListener("click", openCamera);
closeCameraBtn?.addEventListener("click", closeCamera);
captureBtn?.addEventListener("click", captureAndDetect);
startLiveBtn?.addEventListener("click", startLiveDetection);
stopLiveBtn?.addEventListener("click", stopLiveDetection);
