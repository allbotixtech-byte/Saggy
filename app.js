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
let inactivityTimer = null;
let pageCloseTimer = null;
const INACTIVITY_TIMEOUT = 30000; // 30 seconds
const PAGE_CLOSE_DELAY = 10000; // 10 seconds after QR removal

// Reset inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    clearTimeout(pageCloseTimer);
    
    // Only set timer if we have a QR code or preview
    if (resultPanel.style.display === 'block') {
        inactivityTimer = setTimeout(() => {
            closeEverything();
        }, INACTIVITY_TIMEOUT);
    }
}

// Close everything (panel and QR) and schedule page close
function closeEverything() {
    localDataUrl = null;
    previewImg.src = '';
    resultPanel.style.display = 'none';
    
    // Remove QR if exists
    const qrCanvas = document.getElementById("qrCanvas");
    if (qrCanvas) qrCanvas.remove();
    
    statusEl.textContent = "QR closed. Page will refresh in 10 seconds...";
    
    // Clear existing timers
    clearTimeout(inactivityTimer);
    
    // Set timer to refresh/close page after 10 seconds
    pageCloseTimer = setTimeout(() => {
        refreshPage();
    }, PAGE_CLOSE_DELAY);
}

// Refresh the page (or show message then refresh)
function refreshPage() {
    statusEl.textContent = "Refreshing page...";
    
    // Stop camera stream first
    if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
        streamRef = null;
    }
    
    // Wait a moment then refresh
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Add event listeners for user interaction
function setupActivityListeners() {
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
}

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
    resetInactivityTimer();
});

retakeBtn.addEventListener('click', async () => {
    closeEverything();
    // Don't start page close timer for retake
    clearTimeout(pageCloseTimer);
    statusEl.textContent = "Ready — take a new selfie.";
});

closePreviewBtn.addEventListener('click', () => {
    closeEverything();
    // Don't start page close timer for manual close
    clearTimeout(pageCloseTimer);
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
    resetInactivityTimer();
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
            size: 220,
            foreground: "#00c8ff",
            background: "transparent"
        });

        qr.canvas.id = "qrCanvas";
        qr.canvas.style.marginTop = "10px";
        qr.canvas.style.display = "block";
        qr.canvas.style.marginLeft = "auto";
        qr.canvas.style.marginRight = "auto";
        
        resultPanel.appendChild(qr.canvas);

        statusEl.textContent = "✅ QR generated! Auto-closing in 30 seconds if no interaction.";
        uploadBtn.disabled = false;

        // Start inactivity timer
        resetInactivityTimer();

    } catch (err) {
        console.error(err);
        statusEl.textContent = "❌ Upload failed. Try again.";
        uploadBtn.disabled = false;
    }
});

// Fullscreen
fsBtn.addEventListener('click', () => {
    const el = document.getElementById('cameraContainer');
    if (!document.fullscreenElement) {
        el.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
    resetInactivityTimer();
});

// Initialize activity listeners
setupActivityListeners();

// Also add a manual override button for testing/emergency refresh
const refreshBtn = document.createElement('button');
refreshBtn.textContent = "🔃";
refreshBtn.style.position = "fixed";
refreshBtn.style.bottom = "20px";
refreshBtn.style.right = "20px";
refreshBtn.style.zIndex = "1000";
refreshBtn.style.padding = "8px";
refreshBtn.style.borderRadius = "50%";
refreshBtn.style.background = "var(--accent)";
refreshBtn.style.border = "none";
refreshBtn.style.color = "white";
refreshBtn.style.cursor = "pointer";
refreshBtn.style.display = "none"; // Hidden by default
refreshBtn.title = "Manual refresh";
refreshBtn.addEventListener('click', refreshPage);
document.body.appendChild(refreshBtn);

// Show refresh button after 60 seconds of inactivity as a fallback
setTimeout(() => {
    refreshBtn.style.display = "block";
}, 60000);
