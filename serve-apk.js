const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const APK_RELATIVE_PATH = path.join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const APK_PATH = path.join(__dirname, APK_RELATIVE_PATH);

// Helper to get local network IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const interfaceName in interfaces) {
    const addressesList = interfaces[interfaceName];
    for (const addr of addressesList) {
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }
  return addresses;
}

// Simple HTML page for downloading
function getHtmlPage(apkSizeMb) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quran Library - Download Latest Build</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      --card-bg: rgba(30, 41, 59, 0.7);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(99, 102, 241, 0.2);
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-x: hidden;
    }

    .container {
      max-width: 500px;
      width: 100%;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 
                  0 0 50px rgba(99, 102, 241, 0.1);
      transition: transform 0.3s ease;
    }

    .logo-container {
      margin-bottom: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
    }

    .logo-icon {
      font-size: 40px;
      line-height: 1;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #ffffff, #c7d2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      font-size: 16px;
      color: var(--text-muted);
      margin-bottom: 32px;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 16px 32px;
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      background: var(--primary);
      border: none;
      border-radius: 14px;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
      transition: all 0.2s ease;
      margin-bottom: 12px;
    }

    .download-btn:hover {
      background: var(--primary-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
    }

    .download-btn:active {
      transform: translateY(0);
    }

    .meta-info {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 32px;
    }

    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 24px 0;
    }

    .instructions {
      text-align: left;
    }

    .instructions h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #c7d2fe;
    }

    .step {
      display: flex;
      align-items: flex-start;
      margin-bottom: 14px;
      font-size: 14px;
      line-height: 1.5;
    }

    .step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      font-weight: 600;
      font-size: 12px;
      margin-right: 12px;
      margin-top: 1px;
    }

    .step-text {
      color: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <span class="logo-icon">📖</span>
    </div>
    <h1>Quran Library</h1>
    <p class="subtitle">Latest Android Development Build</p>
    
    <a href="/download" class="download-btn">Download APK</a>
    <p class="meta-info">File Size: ~${apkSizeMb} MB &bull; Target: Android</p>
    
    <div class="divider"></div>
    
    <div class="instructions">
      <h2>Installation Instructions</h2>
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">Tap the <strong>Download APK</strong> button to start downloading the package.</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">If prompted by Chrome or your browser, allow installations from unknown sources (Settings &gt; Apps &gt; Special app access &gt; Install unknown apps).</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">Open the downloaded <strong>app-debug.apk</strong> file and tap <strong>Install</strong>.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Server listener
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Check if the APK file exists to get its size
    fs.stat(APK_PATH, (err, stats) => {
      let sizeMb = 'Unknown';
      if (!err) {
        sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getHtmlPage(sizeMb));
    });
  } else if (req.url === '/download' || req.url === '/app-debug.apk') {
    // Serve the APK file
    fs.access(APK_PATH, fs.constants.F_OK, (err) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('APK file not found. Please make sure the build is completed successfully.');
        return;
      }

      const stat = fs.statSync(APK_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="app-debug.apk"'
      });

      const readStream = fs.createReadStream(APK_PATH);
      readStream.pipe(res);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  const ips = getLocalIPs();
  console.log('============================================================');
  console.log('📡 LAN APK Download Server is Running!');
  console.log('============================================================\n');
  console.log('Make sure your phone is connected to the same Wi-Fi/LAN network.\n');
  console.log('To download, scan the QR code or enter one of these URLs in your mobile browser:\n');
  
  ips.forEach(ip => {
    console.log(`   🔗  http://${ip}:${PORT}/`);
  });
  
  console.log('\n------------------------------------------------------------');
  console.log('Press Ctrl+C in this terminal to stop the server.');
  console.log('============================================================');
});
