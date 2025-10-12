const openCameraBtn = document.getElementById("open-camera");
const closeCameraBtn = document.getElementById("close-camera");
const captureBtn = document.getElementById("capture");
const cameraContainer = document.getElementById("camera-container");
const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");
const imageInput = document.getElementById("image-input");

let stream;

openCameraBtn?.addEventListener("click", async () => {
  cameraContainer.classList.remove("hidden");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied or unavailable. Ensure HTTPS and allow camera permissions.");
  }
});

closeCameraBtn?.addEventListener("click", () => {
  stream?.getTracks().forEach(track => track.stop());
  cameraContainer.classList.add("hidden");
});

captureBtn?.addEventListener("click", () => {
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    imageInput.files = dataTransfer.files;
    cameraContainer.classList.add("hidden");
  }, "image/jpeg");
});
