// ---------- CONFIG ----------
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec"; // optional if you use upload
// ----------------------------

const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fsBtn = document.getElementById('fsBtn');
const statusEl = document.getElementById('status');
const resultPanel = document.getElementById('resultPanel');
const previewImg = document.getElementById('preview');
const downloadLocalBtn = document.getElementById('downloadLocalBtn');
const closePreviewBtn = document.getElementById('closePreviewBtn');

let localDataUrl = null;
let streamRef = null;

// start camera with user-facing camera; prefer high resolution if available
async function startCamera(){
  try {
    const constraints = {
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    streamRef = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = streamRef;
    await video.play();
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "Camera error: " + err.message;
  }
}
startCamera();

// capture image from video (preserves aspect ratio of video element)
function captureSnapshot(){
  const videoTrack = streamRef && streamRef.getVideoTracks()[0];
  const settings = videoTrack ? videoTrack.getSettings() : null;
  const w = settings && settings.width ? settings.width : video.videoWidth || 1280;
  const h = settings && settings.height ? settings.height : video.videoHeight || 720;

  // create canvas matching video element display size for correct crop
  const canvas = document.createElement('canvas');
  // Use displayed video dimensions to capture what user sees (not raw camera pixel size)
  const rect = video.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;

  const ctx = canvas.getContext('2d');
  // mirror back when drawing so saved image is not flipped
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl;
}

// events
captureBtn.addEventListener('click', () => {
  localDataUrl = captureSnapshot();
  previewImg.src = localDataUrl;
  resultPanel.style.display = 'block';
  resultPanel.setAttribute('aria-hidden', 'false');
  statusEl.textContent = "Captured — preview below.";
});

retakeBtn.addEventListener('click', async () => {
  // hide preview panel and continue camera
  localDataUrl = null;
  previewImg.src = '';
  resultPanel.style.display = 'none';
  resultPanel.setAttribute('aria-hidden', 'true');
  statusEl.textContent = "Ready — take a new selfie.";
});

closePreviewBtn.addEventListener('click', () => {
  // close preview but keep camera
  previewImg.src = '';
  resultPanel.style.display = 'none';
  statusEl.textContent = "Preview closed.";
});

downloadLocalBtn.addEventListener('click', () => {
  if (!localDataUrl) return;
  const a = document.createElement('a');
  a.href = localDataUrl;
  a.download = `selfie_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Upload button (optional — sends to GAS)
uploadBtn.addEventListener('click', async () => {
  if (!localDataUrl) {
    statusEl.textContent = "Take a selfie first.";
    return;
  }

  statusEl.textContent = "Generating QR...";
  uploadBtn.disabled = true;

  // Create downloadable blob URL
  const blob = await (await fetch(localDataUrl)).blob();
  const fileUrl = URL.createObjectURL(blob);

  // Clear previous QR if any
  const oldQR = document.getElementById("qrCanvas");
  if (oldQR) oldQR.remove();

  // Create QR
  const qr = new QRious({
    value: fileUrl,
    size: 220
  });

  qr.canvas.id = "qrCanvas";
  qr.canvas.style.marginTop = "10px";

  // Show QR inside result panel
  resultPanel.appendChild(qr.canvas);

  statusEl.textContent = "Scan QR to download your selfie ✅";
  uploadBtn.disabled = false;
});


// Fullscreen toggle
fsBtn.addEventListener('click', () => {
  const el = document.getElementById('cameraContainer');
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(err => statusEl.textContent = `FS error: ${err.message}`);
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
});

// Optional: keyboard "f" toggles fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') fsBtn.click();
});

// Handle page visibility / stop camera when leaving
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // optionally stop tracks to save battery — comment this if you want camera to keep running
    // stopStream();
  } else {
    if (!streamRef) startCamera();
  }
});

// stop camera utility (if you want it)
function stopStream(){
  if (!streamRef) return;
  streamRef.getTracks().forEach(t => t.stop());
  streamRef = null;
}
