const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Accurately determine product version from package.json (prevents Electron framework version 45.x leaking)
let appVersion = '1.0.9';
try {
  const pkgPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) appVersion = pkg.version;
  } else {
    const asarPkg = path.join(process.resourcesPath || '', 'app.asar', 'package.json');
    if (fs.existsSync(asarPkg)) {
      const pkg = JSON.parse(fs.readFileSync(asarPkg, 'utf8'));
      if (pkg.version) appVersion = pkg.version;
    } else {
      appVersion = app.getVersion();
    }
  }
} catch (e) {
  appVersion = app.getVersion() || '1.0.9';
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

let updateWindow = null;

function createUpdateProgressWindow(info) {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.show();
    updateWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, 'public', 'assets', 'logo.png');
  const targetVer = info?.version ? `v${info.version}` : 'New Release';

  updateWindow = new BrowserWindow({
    width: 490,
    height: 310,
    resizable: false,
    maximizable: false,
    minimizable: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    title: 'MSCureChain Updating...',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const updaterHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>MSCureChain Updating</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .titlebar {
            height: 38px;
            background: #0f172a;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 14px;
            -webkit-app-region: drag;
          }
          .titlebar-left {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 700;
          }
          .titlebar-actions {
            display: flex;
            align-items: center;
            -webkit-app-region: no-drag;
          }
          .min-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 18px;
            font-weight: 700;
            width: 32px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
          }
          .min-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
          }
          .content {
            flex: 1;
            padding: 22px 26px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .header-row {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 18px;
          }
          .logo-box {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: #e0f2fe;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0284c7;
            font-size: 24px;
            font-weight: 900;
            flex-shrink: 0;
          }
          .header-text h2 {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .header-text p {
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
          }
          .progress-track {
            width: 100%;
            height: 9px;
            background: #f1f5f9;
            border-radius: 9999px;
            overflow: hidden;
            position: relative;
            margin-bottom: 10px;
            border: 1px solid #e2e8f0;
          }
          .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #0284c7, #10b981);
            border-radius: 9999px;
            transition: width 0.25s ease-out;
          }
          .stats-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: #475569;
            font-weight: 600;
            margin-bottom: 16px;
          }
          .pct-val {
            color: #0284c7;
            font-weight: 800;
            font-size: 13px;
          }
          .footer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 12px;
            border-top: 1px solid #f1f5f9;
          }
          .status-msg {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .min-action-btn {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            color: #334155;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.15s;
          }
          .min-action-btn:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="titlebar">
          <div class="titlebar-left">
            <span>MSCureChain System Updater</span>
          </div>
          <div class="titlebar-actions">
            <button class="min-btn" id="btn-min" title="Minimize to Taskbar">−</button>
          </div>
        </div>
        <div class="content">
          <div class="header-row">
            <div class="logo-box">▲</div>
            <div class="header-text">
              <h2 id="title-label">MSCureChain Updating...</h2>
              <p id="ver-label">New version ${targetVer} detected. Downloading updates...</p>
            </div>
          </div>

          <div class="progress-track">
            <div id="p-bar" class="progress-bar"></div>
          </div>

          <div class="stats-row">
            <div>
              <span id="p-pct" class="pct-val">0%</span>
              <span id="p-size" style="margin-left: 6px; color: #64748b;">• 0.0 MB / 0.0 MB</span>
            </div>
            <div>
              <span id="p-speed" style="color: #0284c7; font-weight: 700;">0.00 MB/s</span>
            </div>
          </div>

          <div class="footer-row">
            <span id="p-status" class="status-msg">Downloading release directly to system...</span>
            <button class="min-action-btn" id="btn-min-btm">
              <span>Minimize</span>
            </button>
          </div>
        </div>

        <script>
          const { ipcRenderer } = require('electron');
          const doMin = () => ipcRenderer.send('minimize-updater-window');
          document.getElementById('btn-min').addEventListener('click', doMin);
          document.getElementById('btn-min-btm').addEventListener('click', doMin);

          window.onUpdateProgress = function(pct, transferred, total, speed) {
            document.getElementById('p-bar').style.width = pct + '%';
            document.getElementById('p-pct').textContent = pct + '%';
            document.getElementById('p-size').textContent = '• ' + transferred + ' MB / ' + total + ' MB';
            document.getElementById('p-speed').textContent = speed + ' MB/s';
          };

          window.onUpdateReady = function() {
            document.getElementById('p-bar').style.width = '100%';
            document.getElementById('p-bar').style.background = '#10b981';
            document.getElementById('p-pct').textContent = '100%';
            document.getElementById('title-label').textContent = 'Update Downloaded!';
            document.getElementById('ver-label').textContent = 'Restarting MSCureChain now to apply update...';
            document.getElementById('p-status').textContent = 'Restarting application...';
          };
        </script>
      </body>
    </html>
  `;

  updateWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(updaterHTML)}`);
}

// IPC listener for minimizing the updater window
ipcMain.on('minimize-updater-window', () => {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.minimize();
  }
});

function setupAutoUpdater() {
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Dev mode detected, skipping automatic update checks.');
    return;
  }

  // Persistent file logger for packaged desktop app to ensure updater events & errors are tracked
  const logDir = app.getPath('userData');
  const logPath = path.join(logDir, 'updater.log');
  const logToFile = (level, ...args) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${args.join(' ')}\n`;
    try {
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(logPath, line);
    } catch (e) {}
    console.log(`[AutoUpdater] [${level}]`, ...args);
  };

  autoUpdater.logger = {
    info: (...args) => logToFile('INFO', ...args),
    warn: (...args) => logToFile('WARN', ...args),
    error: (...args) => logToFile('ERROR', ...args),
    debug: (...args) => logToFile('DEBUG', ...args),
  };

  logToFile('INFO', `Initializing AutoUpdater for MSCureChain v${appVersion}`);

  // Fix: Explicitly bind autoUpdater.currentVersion to appVersion (prevents Electron framework version 45.x comparison bug)
  try {
    let SemVer = null;
    try {
      SemVer = require('electron-updater/node_modules/semver/classes/semver');
    } catch (e) {
      SemVer = require('semver/classes/semver');
    }
    if (SemVer) {
      autoUpdater.currentVersion = new SemVer(appVersion);
      logToFile('INFO', `Bound autoUpdater.currentVersion to semver: ${autoUpdater.currentVersion.version}`);
    }
  } catch (e) {
    logToFile('WARN', `Could not override semver currentVersion: ${e.message}`);
  }

  // Set explicit GitHub update feed
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'mstechhived1-design',
      repo: 'Mscurechain-Frontend-Latest',
    });
  } catch (e) {
    logToFile('WARN', `setFeedURL error: ${e.message}`);
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    logToFile('INFO', 'Checking GitHub for new releases...');
  });

  autoUpdater.on('update-available', (info) => {
    logToFile('INFO', `Update v${info.version} found! Downloading update silently...`);
    createUpdateProgressWindow(info);
  });

  autoUpdater.on('update-not-available', (info) => {
    logToFile('INFO', `MSCureChain v${info.version} is up-to-date.`);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const pct = Math.round(progressObj.percent || 0);
    const transferred = ((progressObj.transferred || 0) / (1024 * 1024)).toFixed(1);
    const total = ((progressObj.total || 0) / (1024 * 1024)).toFixed(1);
    const speed = ((progressObj.bytesPerSecond || 0) / (1024 * 1024)).toFixed(2);
    logToFile('INFO', `Download progress: ${pct}% (${transferred} MB / ${total} MB at ${speed} MB/s)`);

    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.executeJavaScript(`
        if (window.onUpdateProgress) {
          window.onUpdateProgress(${pct}, '${transferred}', '${total}', '${speed}');
        }
      `).catch(() => {});
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logToFile('INFO', `Update v${info.version} downloaded! Restarting to install update silently...`);
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.executeJavaScript(`
        if (window.onUpdateReady) {
          window.onUpdateReady();
        }
      `).catch(() => {});
    }

    // SILENT UPDATE: First param isSilent=true runs NSIS with /S flag, second param isForceRunAfter=true relaunches app
    setTimeout(() => {
      try {
        logToFile('INFO', 'Executing quitAndInstall(isSilent=true, isForceRunAfter=true)...');
        autoUpdater.quitAndInstall(true, true);
      } catch (err) {
        logToFile('ERROR', `quitAndInstall error: ${err ? err.message : err}`);
      }
    }, 2000);
  });

  autoUpdater.on('error', (err) => {
    logToFile('ERROR', `AutoUpdater error: ${err ? (err.stack || err.message || err) : 'Unknown error'}`);
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.executeJavaScript(`
        const s = document.getElementById('p-status');
        if (s) s.textContent = 'Update check will retry in background.';
      `).catch(() => {});
    }
  });

  // Check 3 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      logToFile('WARN', `Startup update check failed: ${err ? err.message : err}`);
    });
  }, 3000);

  // Background check every 15 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      logToFile('WARN', `Background check failed: ${err ? err.message : err}`);
    });
  }, 15 * 60 * 1000);
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
