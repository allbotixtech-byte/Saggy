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
let pageRefreshTimer = null;
const QR_INACTIVITY_TIMEOUT = 30000; // 30 seconds for QR
const PAGE_REFRESH_TIMEOUT = 10000;  // 10 seconds after QR removal

// Reset all timers
function resetAllTimers() {
    clearTimeout(inactivityTimer);
    clearTimeout(pageRefreshTimer);
}

// Start QR inactivity timer (30 seconds)
function startQRInactivityTimer() {
    clearTimeout(inactivityTimer);
    
    inactivityTimer = setTimeout(() => {
        // Remove QR and start page refresh countdown
        removeQRAndStartRefresh();
    }, QR_INACTIVITY_TIMEOUT);
}

// Remove QR and start 10-second page refresh countdown
function removeQRAndStartRefresh() {
    // Remove QR if exists
    const qrCanvas = document.getElementById("qrCanvas");
    if (qrCanvas) qrCanvas.remove();
    
    // Clear the preview panel
    previewImg.src = '';
    localDataUrl = null;
    
    statusEl.textContent = "QR removed. Page will refresh in 10 seconds...";
    
    // Start 10-second countdown for page refresh
    startPageRefreshCountdown();
}

// Start 10-second countdown to refresh page
function startPageRefreshCountdown() {
    clearTimeout(pageRefreshTimer);
    
    pageRefreshTimer = setTimeout(() => {
        refreshPage();
    }, PAGE_REFRESH_TIMEOUT);
}

// Refresh the page
function refreshPage() {
    statusEl.textContent = "Refreshing page...";
    
    // Stop camera stream
    if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
    }
    
    // Refresh after short delay
    setTimeout(() => {
        location.reload();
    }, 500);
}

// Close everything manually
function closeEverything() {
    resetAllTimers();
    
    // Remove QR if exists
    const qrCanvas = document.getElementById("qrCanvas");
    if (qrCanvas) qrCanvas.remove();
    
    // Clear preview
    previewImg.src = '';
    localDataUrl = null;
    resultPanel.style.display = 'none';
    
    statusEl.textContent = "Ready — take a new selfie.";
}

// Add event listeners for user interaction
function setupActivityListeners() {
    const activityEvents = ['click', 'touchstart', 'keypress', 'mousemove', 'scroll'];
    
    activityEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
            // Only reset timers if we have a QR code
            const qrCanvas = document.getElementById("qrCanvas");
            if (qrCanvas) {
                startQRInactivityTimer();
            }
        }, { passive: true });
    });
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
        statusEl.textContent = "Camera ready — smile!";
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
    
    // Reset any existing timers when capturing new photo
    resetAllTimers();
});

retakeBtn.addEventListener('click', async () => {
    closeEverything();
});

closePreviewBtn.addEventListener('click', () => {
    closeEverything();
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

        // Start the 30-second inactivity timer for QR
        startQRInactivityTimer();

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
});

// Initialize activity listeners
setupActivityListeners();

// Add a manual refresh button for emergencies
const refreshBtn = document.createElement('button');
refreshBtn.innerHTML = "⟳";
refreshBtn.style.position = "fixed";
refreshBtn.style.bottom = "80px";
refreshBtn.style.right = "20px";
refreshBtn.style.zIndex = "1000";
refreshBtn.style.padding = "10px 12px";
refreshBtn.style.borderRadius = "50%";
refreshBtn.style.background = "rgba(0, 200, 255, 0.8)";
refreshBtn.style.border = "2px solid white";
refreshBtn.style.color = "white";
refreshBtn.style.cursor = "pointer";
refreshBtn.style.fontSize = "18px";
refreshBtn.style.fontWeight = "bold";
refreshBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
refreshBtn.title = "Manual Refresh";
refreshBtn.addEventListener('click', () => {
    statusEl.textContent = "Manual refresh triggered...";
    refreshPage();
});

// Show the refresh button after 2 minutes as a fallback
setTimeout(() => {
    document.body.appendChild(refreshBtn);
}, 120000);
