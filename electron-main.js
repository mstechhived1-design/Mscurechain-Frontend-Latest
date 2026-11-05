const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const iconPath = path.join(__dirname, 'src-tauri', 'icons', 'icon.ico');

  const win = new BrowserWindow({
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

  win.maximize();
  Menu.setApplicationMenu(null);

  const targetUrl = process.env.APP_URL || 'http://localhost:3000';

  win.loadURL(targetUrl).catch((err) => {
    console.log('Local dev server not detected, opening live portal: https://www.mscurechain.com');
    win.loadURL('https://www.mscurechain.com');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
