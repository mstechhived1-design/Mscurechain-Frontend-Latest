const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Accurately determine product version from package.json (prevents Electron framework version 45.x leaking)
let appVersion = '1.0.7';
try {
  const pkgPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) appVersion = pkg.version;
  } else {
    appVersion = app.getVersion();
  }
} catch (e) {
  appVersion = app.getVersion() || '1.0.7';
}

let nextProcess = null;
let mainWindow = null;

function checkServerReady(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port = 3000, maxRetries = 40) {
  for (let i = 0; i < maxRetries; i++) {
    const ready = await checkServerReady(port);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

function startNextServer() {
  const fs = require('fs');
  const candidatePaths = [
    // 1. Packaged Electron app: unpacked asar folder on disk
    path.join(process.resourcesPath || '', 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
    path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), '.next', 'standalone', 'server.js'),
    // 2. Local standalone production build (npm run desktop)
    path.join(__dirname, '.next', 'standalone', 'server.js'),
    path.join(__dirname, 'server.js'),
    path.join(process.resourcesPath || '', 'app', '.next', 'standalone', 'server.js'),
  ];

  const serverPath = candidatePaths.find((p) => p && fs.existsSync(p));

  if (serverPath) {
    console.log(`[Electron] Starting standalone Next.js server from: ${serverPath}`);

    // Auto-sync static and public assets into standalone directory if missing
    try {
      const standaloneDir = path.dirname(serverPath);
      const staticSrc = path.join(__dirname, '.next', 'static');
      const staticDest = path.join(standaloneDir, '.next', 'static');
      const publicSrc = path.join(__dirname, 'public');
      const publicDest = path.join(standaloneDir, 'public');

      if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
        console.log('[Electron] Syncing .next/static into standalone output...');
        fs.cpSync(staticSrc, staticDest, { recursive: true });
      }
      if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
        console.log('[Electron] Syncing public into standalone output...');
        fs.cpSync(publicSrc, publicDest, { recursive: true });
      }
    } catch (assetErr) {
      console.warn('[Electron] Asset sync note:', assetErr ? assetErr.message : assetErr);
    }

    const { fork } = require('child_process');
    nextProcess = fork(serverPath, [], {
      cwd: path.dirname(serverPath),
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'production',
        BACKEND_INTERNAL_URL: 'https://mscurechain-backend-latest-production.up.railway.app/api',
      },
      stdio: 'inherit',
    });
  } else {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    console.log('[Electron] No standalone server found. Starting local Next dev server...');
    nextProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: __dirname,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000' },
    });
  }

  if (nextProcess) {
    nextProcess.on('error', (err) => {
      console.error('[Electron] Failed to spawn Next process:', err);
    });
    nextProcess.on('exit', (code, signal) => {
      console.warn(`[Electron] Next process exited with code ${code}, signal: ${signal}`);
    });
  }
}

async function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'assets', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: `MSCureChain - Modern Hospital Management System (v${appVersion})`,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.maximize();
  Menu.setApplicationMenu(null);

  // Keep version locked in title bar across navigation
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle(`MSCureChain - Modern Hospital Management System (v${appVersion})`);
  });

  // Allow popup windows for clean document print preview
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1100,
        height: 850,
        title: `MSCureChain Document Viewer (v${appVersion})`,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      }
    };
  });

  // Read logo as base64 for zero-latency startup animation (prefers trimmed square logo)
  let logoBase64 = '';
  try {
    const fs = require('fs');
    const logoPaths = [
      path.join(__dirname, 'public', 'assets', 'logo-centered.png'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'public', 'assets', 'logo-centered.png'),
      path.join(process.resourcesPath || '', 'public', 'assets', 'logo-centered.png'),
      path.join(__dirname, 'public', 'assets', 'logo.png'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'public', 'assets', 'logo.png'),
      path.join(process.resourcesPath || '', 'public', 'assets', 'logo.png'),
    ];
    for (const lp of logoPaths) {
      if (fs.existsSync(lp)) {
        logoBase64 = fs.readFileSync(lp).toString('base64');
        break;
      }
    }
  } catch (e) {}

  // Check if server is already running
  const alreadyRunning = await checkServerReady(3000);

  if (!alreadyRunning) {
    // Show branded healthcare loading screen with rotating animated ring & greetings
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>MSCureChain Healthcare</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: radial-gradient(circle at 50% 40%, #ffffff 0%, #f1f5f9 100%);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              overflow: hidden;
            }
            .brand-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              max-width: 520px;
              padding: 40px 24px;
            }
            .logo-ring-wrapper {
              position: relative;
              width: 144px;
              height: 144px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 24px;
            }
            .rotating-ring {
              position: absolute;
              inset: 0;
              border-radius: 50%;
              padding: 4px;
              background: conic-gradient(from 0deg, #0284c7, #10b981, #06b6d4, #0284c7);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              animation: rotateRing 2.4s linear infinite;
              filter: drop-shadow(0 0 10px rgba(14, 165, 233, 0.4));
            }
            .logo-center-wrapper {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 114px;
              height: 114px;
              background: transparent;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2;
            }
            .logo-center-wrapper img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
              filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.08));
            }
            @keyframes rotateRing {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            h1 {
              margin: 0 0 8px;
              font-size: 24px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #0f172a;
            }
            .greeting-title {
              color: #0284c7;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 12px;
            }
            .greeting-msg {
              font-size: 14px;
              color: #475569;
              line-height: 1.5;
              margin: 0 0 24px;
              font-weight: 500;
            }
            .progress-bar-container {
              width: 280px;
              height: 6px;
              background: #e2e8f0;
              border-radius: 9999px;
              overflow: hidden;
              position: relative;
              margin-bottom: 12px;
            }
            .progress-bar-fill {
              height: 100%;
              width: 0%;
              background: linear-gradient(90deg, #0284c7, #10b981);
              border-radius: 9999px;
              transition: width 0.3s ease-out;
            }
            .version-tag {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }
            .version-sub {
              font-size: 11px;
              color: #94a3b8;
              font-weight: 500;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="brand-container">
            <div class="logo-ring-wrapper">
              <div class="rotating-ring"></div>
              <div class="logo-center-wrapper">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="MSCureChain" />` : `<span style="font-size: 32px; font-weight: 900; color: #0284c7;">+</span>`}
              </div>
            </div>
            <div class="greeting-title">MSCureChain Healthcare</div>
            <h1>Welcome to Clinical Workspace</h1>
            <p class="greeting-msg">Wishing your healthcare team a productive and smooth day ahead.</p>
            <div class="progress-bar-container">
              <div id="progress-bar-fill" class="progress-bar-fill"></div>
            </div>
            <div class="version-tag">
              <span id="progress-status">Starting hospital services...</span>
              <span id="progress-pct" style="color: #0284c7; font-weight: 700;">8%</span>
            </div>
            <div class="version-sub">MSCureChain v${appVersion}</div>
          </div>
          <script>
            let pct = 8;
            const fill = document.getElementById('progress-bar-fill');
            const pctLabel = document.getElementById('progress-pct');
            const statusLabel = document.getElementById('progress-status');

            window.updateProgress = function(p, msg) {
              pct = Math.min(100, Math.max(pct, p));
              if (fill) fill.style.width = pct + '%';
              if (pctLabel) pctLabel.textContent = pct + '%';
              if (msg && statusLabel) statusLabel.textContent = msg;
            };

            const progressInterval = setInterval(() => {
              if (pct < 90) {
                pct += Math.floor(Math.random() * 5) + 3;
                if (pct > 90) pct = 90;
                if (fill) fill.style.width = pct + '%';
                if (pctLabel) pctLabel.textContent = pct + '%';
                if (pct > 65 && statusLabel) statusLabel.textContent = 'Connecting hospital portal services...';
                else if (pct > 35 && statusLabel) statusLabel.textContent = 'Loading clinical modules & cache...';
              }
            }, 320);
          </script>
        </body>
      </html>
    `)}`);

    startNextServer();
    const ready = await waitForServer(3000);
    if (!ready) {
      console.error('[Electron] Local server failed to respond on port 3000');
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#f8fafc; font-family:sans-serif; color:#0f172a; text-align:center; padding:20px; }
              .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:32px; max-width:480px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); }
              h2 { color:#dc2626; margin:0 0 12px; font-size:20px; }
              p { color:#64748b; font-size:14px; margin:0 0 20px; line-height:1.5; }
              button { background:#0284c7; color:#fff; border:none; padding:10px 24px; border-radius:8px; font-weight:600; cursor:pointer; }
              button:hover { background:#0369a1; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Service Startup Delayed</h2>
              <p>The local hospital portal service is taking slightly longer than usual to initialize. Click below to reconnect.</p>
              <button onclick="window.location.href='http://localhost:3000'">Retry Connecting</button>
            </div>
          </body>
        </html>
      `)}`);
      return;
    }

    try {
      await mainWindow.webContents.executeJavaScript(`
        if (window.updateProgress) {
          window.updateProgress(100, 'Hospital workspace ready! Opening dashboard...');
        }
      `);
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {}
  }

  // Load local Next.js frontend (which talks to Railway backend via .env)
  mainWindow.loadURL('http://localhost:3000');

  // Register reload shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.reload();
    }
  });

  // Catch any page load failures to prevent blank white screens
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Ignore intentional aborts/redirects
    console.error(`[Electron] Page failed to load: ${errorDescription} (${errorCode}) at ${validatedURL}`);
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MSCureChain - Service Connection</title>
          <style>
            body { margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0f172a; padding:24px; text-align:center; }
            .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; padding:36px; max-width:480px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.08); }
            .icon { width:52px; height:52px; border-radius:14px; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:24px; font-weight:bold; }
            h2 { font-size:18px; font-weight:800; margin:0 0 8px; color:#1e293b; }
            p { font-size:13px; color:#64748b; line-height:1.5; margin:0 0 20px; }
            .err { background:#f1f5f9; padding:8px 12px; border-radius:8px; font-size:11px; font-family:monospace; color:#475569; margin-bottom:20px; word-break:break-all; }
            button { background:#0284c7; color:#fff; border:none; padding:12px 28px; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer; }
            button:hover { background:#0369a1; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">!</div>
            <h2>Unable to Connect to Hospital Portal</h2>
            <p>The workspace encountered a loading interruption. Please click below to reload.</p>
            <div class="err">${errorDescription} (Code: ${errorCode})</div>
            <button onclick="window.location.href='http://localhost:3000'">Reload Application</button>
          </div>
        </body>
      </html>
    `)}`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Electron] Render process gone:', details);
    if (details.reason !== 'clean-exit') {
      mainWindow.reload();
    }
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Dev mode detected, skipping automatic update checks.');
    return;
  }

  // Silent update configuration
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking GitHub for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdater] Update v${info.version} found. Downloading silently in background...`);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`[AutoUpdater] Current version v${info.version} is up-to-date.`);
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Silent update warning:', err ? (err.message || err) : 'Unknown error');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[AutoUpdater] Downloading update: ${Math.round(progressObj.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdater] Update v${info.version} downloaded! Prompting user to restart.`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Restart & Install Now', 'Later (On Exit)'],
        defaultId: 0,
        cancelId: 1,
        title: 'MSCureChain Update Ready',
        message: `A new version (v${info.version}) of MSCureChain is downloaded and ready!`,
        detail: 'Would you like to restart MSCureChain now to apply the new updates immediately?'
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      }).catch((e) => {
        console.warn('[AutoUpdater] Dialog prompt error:', e);
      });
    }
  });

  // Check 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater] Initial check failed:', err ? err.message : err);
    });
  }, 5000);

  // Background check every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater] Background check failed:', err ? err.message : err);
    });
  }, 30 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

function cleanup() {
  if (nextProcess && nextProcess.pid) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', nextProcess.pid.toString(), '/f', '/t']);
      } else {
        nextProcess.kill('SIGTERM');
      }
    } catch (e) {}
    nextProcess = null;
  }
}

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', cleanup);
