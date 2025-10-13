const openCameraBtn = document.getElementById("open-camera");
const closeCameraBtn = document.getElementById("close-camera");
const captureBtn = document.getElementById("capture");
const cameraContainer = document.getElementById("camera-container");
const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");
const imageInput = document.getElementById("image-input");

let stream;

// Open camera
openCameraBtn?.addEventListener("click", async () => {
  cameraContainer.classList.remove("hidden");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied or unavailable. Ensure HTTPS and allow camera permissions.");
    console.error(err);
  }
});

// Close camera
closeCameraBtn?.addEventListener("click", () => {
  stream?.getTracks().forEach(track => track.stop());
  cameraContainer.classList.add("hidden");
});

// Capture and send to Flask
captureBtn?.addEventListener("click", async () => {
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  // Convert canvas to blob
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    // Prepare form data
    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");

    try {
      // POST to /detect
      const response = await fetch("/detect", {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      // Get redirect URL (result page)
      if (response.ok) {
        // For AJAX, redirect manually
        const result = await response.json();
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
        } else {
          // fallback: reload
          window.location.reload();
        }
      } else {
        alert("Failed to detect plant. Try again.");
      }
    } catch (err) {
      console.error("Error sending captured image:", err);
      alert("Error sending captured image. Check console.");
    }

    // Hide camera after capture
    cameraContainer.classList.add("hidden");
  }, "image/jpeg");
});
