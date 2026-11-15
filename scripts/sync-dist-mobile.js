const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-mobile');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyServerPagesRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // Don't overwrite portal directory which has pre-rendered subpages
      if (entry.name !== 'portal' && entry.name !== '[hospitalId]') {
        copyServerPagesRecursive(srcPath, destPath);
      }
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.html') || entry.name.endsWith('.rsc')) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

console.log('[1/4] Copying .next/static to dist-mobile/_next/static...');
copyDirRecursive(path.join(ROOT, '.next', 'static'), path.join(DIST, '_next', 'static'));

console.log('[2/4] Copying public directory to dist-mobile...');
copyDirRecursive(path.join(ROOT, 'public'), DIST);

console.log('[3/4] Copying pre-rendered server app pages and RSC files to dist-mobile/pages...');
const serverApp = path.join(ROOT, '.next', 'server', 'app');
if (fs.existsSync(serverApp)) {
  copyServerPagesRecursive(serverApp, path.join(DIST, 'pages'));
}

// Copy auth pages
const authDir = path.join(serverApp, 'auth');
if (fs.existsSync(authDir)) {
  copyServerPagesRecursive(authDir, path.join(DIST, 'pages', 'auth'));
  const loginHtml = path.join(authDir, 'login.html');
  if (fs.existsSync(loginHtml)) {
    fs.mkdirSync(path.join(DIST, 'auth', 'login'), { recursive: true });
    fs.copyFileSync(loginHtml, path.join(DIST, 'auth', 'login', 'index.html'));
    fs.copyFileSync(loginHtml, path.join(DIST, 'auth', 'login.html'));
  }
}

console.log('[4/4] Setting root index.html to Hospital Login Portal...');
const loginHtml = path.join(authDir, 'login.html');
if (fs.existsSync(loginHtml)) {
  fs.copyFileSync(loginHtml, path.join(DIST, 'index.html'));
  console.log('✅ Root index.html set to Hospital Login Portal');
} else {
  console.warn('⚠️ login.html not found, fallback to rootIndex');
  const rootIndex = path.join(serverApp, 'index.html');
  if (fs.existsSync(rootIndex)) {
    fs.copyFileSync(rootIndex, path.join(DIST, 'index.html'));
  }
}

// Keep a copy of original landing page in pages/landing.html if needed
const rootIndex = path.join(serverApp, 'index.html');
if (fs.existsSync(rootIndex)) {
  fs.copyFileSync(rootIndex, path.join(DIST, 'pages', 'landing.html'));
}

console.log('✅ dist-mobile successfully prepared!');
