const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

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
    title: 'MSCureChain - Hospital Management System',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.maximize();
  Menu.setApplicationMenu(null);

  // Check if server is already running
  const alreadyRunning = await checkServerReady(3000);

  if (!alreadyRunning) {
    // Show quick loading screen while local server boots
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#f8fafc; font-family:sans-serif; color:#0f172a; }
            .spinner { width:48px; height:48px; border:4px solid #e2e8f0; border-top-color:#0284c7; border-radius:50%; animation:spin 1s linear infinite; }
            @keyframes spin { to { transform:rotate(360deg); } }
            h2 { margin-top:20px; font-weight:600; font-size:20px; }
            p { color:#64748b; font-size:14px; margin-top:6px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Starting MSCureChain Desktop</h2>
          <p>Connecting local frontend to Railway backend...</p>
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
              <h2>Server Startup Delayed</h2>
              <p>The local hospital portal server is taking longer than usual to start up. Click below to reconnect.</p>
              <button onclick="window.location.href='http://localhost:3000'">Retry Connecting</button>
            </div>
          </body>
        </html>
      `)}`);
      return;
    }
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
}

app.whenReady().then(createWindow);

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
