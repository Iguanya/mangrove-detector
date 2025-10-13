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
  console.log("[INFO] Open Camera button clicked");
  cameraContainer.classList.remove("hidden");

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log("[INFO] Available devices:", devices);

    const videoDevices = devices.filter(d => d.kind === "videoinput");
    console.log(`[INFO] Found ${videoDevices.length} video devices`);

    let constraints = { video: true };
    if (videoDevices.length > 1) {
      constraints = { video: { facingMode: { exact: "environment" } } };
      console.log("[INFO] Trying to use back camera");
    }

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    console.log("[SUCCESS] Camera opened");
  } catch (err) {
    console.warn("[WARN] Back camera not available, trying default camera.", err);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      console.log("[SUCCESS] Default camera opened");
    } catch (error) {
      console.error("[ERROR] Camera access denied or unavailable:", error);
      alert("Camera access denied or unavailable. Ensure HTTPS and allow camera permissions.");
    }
  }
}

// --- Close Camera ---
function closeCamera() {
  console.log("[INFO] Close Camera button clicked");
  stopLiveDetection();
  stream?.getTracks().forEach(track => track.stop());
  cameraContainer.classList.add("hidden");
  console.log("[INFO] Camera closed");
}

// --- Capture & Detect ---
async function captureAndDetect() {
  console.log("[INFO] Capture & Detect button clicked");

  try {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("[ERROR] Failed to get blob from canvas");
        return;
      }

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
          console.log("[SUCCESS] Capture sent, received result:", result);

          if (result.redirect_url) {
            window.location.href = result.redirect_url;
          } else {
            window.location.reload();
          }
        } else {
          console.error("[ERROR] Capture failed, server returned:", response.status);
          alert("Failed to detect plant. Try again.");
        }
      } catch (err) {
        console.error("[ERROR] Failed to send captured image:", err);
        alert("Error sending captured image. Check console.");
      }
    }, "image/jpeg");
  } catch (err) {
    console.error("[ERROR] Capture & Detect failed:", err);
  }
}

// --- Live Detection ---
function startLiveDetection() {
  console.log("[INFO] Start Live Scan button clicked");

  if (!stream) {
    alert("Camera not active");
    console.warn("[WARN] Cannot start live scan, camera not active");
    return;
  }

  liveStreamInterval = setInterval(async () => {
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("[ERROR] Failed to get blob for live detection");
          return;
        }

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
            console.log("[INFO] Live detection frame processed");
          }
        } catch (err) {
          console.error("[ERROR] Live detection request failed:", err);
        }
      }, "image/jpeg");
    } catch (err) {
      console.error("[ERROR] Live detection loop failed:", err);
    }
  }, 1000); // send every 1 second
}

function stopLiveDetection() {
  console.log("[INFO] Stop Live Scan button clicked");
  clearInterval(liveStreamInterval);
  console.log("[INFO] Live detection stopped");
}


function log(msg, type="INFO") {
  const timestamp = new Date().toLocaleTimeString();
  const fullMsg = `[${timestamp}] [${type}] ${msg}`;

  // On-screen overlay (optional)
  const overlay = document.getElementById("log-overlay");
  if (overlay) {
    const line = document.createElement("div");
    line.textContent = fullMsg;
    line.style.color = type === "ERROR" ? "red" : type === "WARN" ? "yellow" : "lightgreen";
    overlay.appendChild(line);
    overlay.scrollTop = overlay.scrollHeight;
  }

  // Send to Flask terminal
  fetch("/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: type, message: fullMsg })
  }).catch(err => console.error("Failed to send log to server:", err));

  // Also log to browser console
  console.log(fullMsg);
}


// --- Event Listeners ---
openCameraBtn?.addEventListener("click", openCamera);
closeCameraBtn?.addEventListener("click", closeCamera);
captureBtn?.addEventListener("click", captureAndDetect);
startLiveBtn?.addEventListener("click", startLiveDetection);
stopLiveBtn?.addEventListener("click", stopLiveDetection);
