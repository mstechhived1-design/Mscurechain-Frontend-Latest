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
    path.join(__dirname, '.next', 'standalone', 'server.js'),
    path.join(__dirname, 'server.js'),
    path.join(process.resourcesPath || '', 'app', '.next', 'standalone', 'server.js'),
  ];

  const serverPath = candidatePaths.find((p) => fs.existsSync(p));

  if (serverPath) {
    console.log(`Starting standalone Next.js server from: ${serverPath}`);
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
    console.log('Starting local Next dev server connected to Railway backend...');
    nextProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: __dirname,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000' },
    });
  }

  if (nextProcess) {
    nextProcess.on('error', (err) => {
      console.error('Failed to start Next server:', err);
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
    await waitForServer(3000);
  }

  // Load local Next.js frontend (which talks to Railway backend via .env)
  mainWindow.loadURL('http://localhost:3000');
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
