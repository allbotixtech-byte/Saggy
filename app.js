// ---------- CONFIG ----------
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw581kH9Er-QnGv7p_uenKicJIvyRBzLK6YU8-uoFZa2Zkr0aYrFUtX1l30G4hpHaZ6/exec";
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

// capture image
function captureSnapshot(){
  const videoTrack = streamRef && streamRef.getVideoTracks()[0];
  const settings = videoTrack ? videoTrack.getSettings() : null;

  const canvas = document.createElement('canvas');
  const rect = video.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

// events
captureBtn.addEventListener('click', () => {
  localDataUrl = captureSnapshot();
  previewImg.src = localDataUrl;
  resultPanel.style.display = 'block';
  statusEl.textContent = "Captured — preview below.";
});

retakeBtn.addEventListener('click', async () => {
  localDataUrl = null;
  previewImg.src = '';
  resultPanel.style.display = 'none';
  statusEl.textContent = "Ready — take a new selfie.";
});

closePreviewBtn.addEventListener('click', () => {
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

// ---------------------------
// REAL UPLOAD → public Google URL
// ---------------------------
uploadBtn.addEventListener('click', async () => {
  if (!localDataUrl) {
    statusEl.textContent = "Take a selfie first.";
    return;
  }

  statusEl.textContent = "Uploading…";
  uploadBtn.disabled = true;

  try {
    const res = await fetch("https://seggy-qr.onrender.com/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: localDataUrl })
    });

    const data = await res.json();

    if (!data.url) {
      throw new Error("QR URL missing");
    }

    // ✅ Remove old QR if exists
    const oldQR = document.getElementById("qrCanvas");
    if (oldQR) oldQR.remove();

    // ✅ Create new QR
    const qr = new QRious({
      value: data.url,
      size: 220
    });

    qr.canvas.id = "qrCanvas";
    qr.canvas.style.marginTop = "10px";
    resultPanel.appendChild(qr.canvas);

    statusEl.textContent = "✅ Scan QR — auto closing in 20 seconds...";
    uploadBtn.disabled = false;

    // ✅ ✅ ONLY QR AUTO CLOSES (NOT PANEL)
    setTimeout(() => {
      const qrCanvas = document.getElementById("qrCanvas");
      if (qrCanvas) qrCanvas.remove();

      statusEl.textContent = "QR closed. You can download or retake.";

    }, 20000); // change to 20000 if you want faster

  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Upload failed. Try again.";
    uploadBtn.disabled = false;
  }


  // send to Apps Script
  // const res = await fetch("https://seggy-qr.onrender.com/upload", {
  //   method:"POST",
  //   headers:{ "Content-Type": "application/json" },
  //   body: JSON.stringify({ image: localDataUrl })
  // });

  const { url } = await res.json();

  // remove old qr
  const oldQR = document.getElementById("qrCanvas");
  if (oldQR) oldQR.remove();

  // create new QR with public link
  const qr = new QRious({
    value: url,
    size: 220
  });

  qr.canvas.id = "qrCanvas";
  qr.canvas.style.marginTop = "10px";

  resultPanel.appendChild(qr.canvas);

  statusEl.textContent = "Scan with Google Lens";
  uploadBtn.disabled = false;
});

// Fullscreen
fsBtn.addEventListener('click', () => {
  const el = document.getElementById('cameraContainer');
  if (!document.fullscreenElement) {
    el.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }

  //  setTimeout(() => {
  //     const qrCanvas = document.getElementById("qrCanvas");
  //     if (qrCanvas) qrCanvas.remove();

  //     statusEl.textContent = "QR closed. You can download or retake.";

  //   }, 5000); // change to 3000 if you want faster

  // location.reload();
});
