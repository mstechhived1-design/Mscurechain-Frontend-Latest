const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST_PAGES = path.join(ROOT, 'dist-mobile', 'pages');

const missingTargets = [
  { targetPath: 'about/[slug]', fetchUrl: '/about/terms', role: 'admin' },
  { targetPath: 'admin/edit-hospital/[id]', fetchUrl: '/admin/edit-hospital/HORIZON001', role: 'admin' },
  { targetPath: 'admin/hospitals/[id]', fetchUrl: '/admin/hospitals/HORIZON001', role: 'admin' },
  { targetPath: 'admin/support/[id]', fetchUrl: '/admin/support/ticket-01', role: 'admin' },
  { targetPath: 'ambulance/support/[id]', fetchUrl: '/ambulance/support/ticket-01', role: 'ambulance' },
  { targetPath: 'blogs/[slug]', fetchUrl: '/blogs/welcome', role: 'admin' },
  { targetPath: 'patient/dashboard', fetchUrl: '/patient/dashboard', role: 'patient' },
  { targetPath: 'patient/discharge/[id]', fetchUrl: '/patient/discharge/pat-01', role: 'patient' },
  { targetPath: 'receipts/[type]/[id]', fetchUrl: '/receipts/ipd/rec-01', role: 'hospital-admin' },
  { targetPath: 'portal/dashboard', fetchUrl: '/HORIZON001/hospital-admin', role: 'hospital-admin' }
];

function fetchRoute(item, isRsc = false) {
  return new Promise((resolve) => {
    const payload = Buffer.from(JSON.stringify({
      role: item.role,
      hospitalId: 'HORIZON001',
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365
    })).toString('base64');
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

    const headers = {
      'Cookie': `accessToken=${token}; hospitalId=HORIZON001; csrf_token=dummy_csrf`,
      'User-Agent': 'MSCureChain-Mobile'
    };
    if (isRsc) {
      headers['RSC'] = '1';
    }

    const url = `${item.fetchUrl}${isRsc ? '?_rsc=1' : ''}`;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const ext = isRsc ? '.rsc' : '.html';
        const outFile = path.join(DIST_PAGES, `${item.targetPath}${ext}`);
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, buffer);
        console.log(`[${res.statusCode}] Saved ${outFile} (${buffer.length} bytes)`);
        resolve({ target: item.targetPath, isRsc, status: res.statusCode });
      });
    });

    req.on('error', (err) => {
      console.error(`Error fetching ${url}:`, err.message);
      resolve({ target: item.targetPath, isRsc, error: err.message });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ target: item.targetPath, isRsc, error: 'timeout' });
    });

    req.end();
  });
}

async function main() {
  for (const item of missingTargets) {
    await fetchRoute(item, false);
    await fetchRoute(item, true);
  }
  console.log('Finished generating remaining routes.');
}

main();
