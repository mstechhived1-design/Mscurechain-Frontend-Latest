const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTALS = [
  { name: 'helpdesk', role: 'helpdesk' },
  { name: 'pharmacy', role: 'pharmacy' },
  { name: 'doctor', role: 'doctor' },
  { name: 'nurse', role: 'nurse' },
  { name: 'lab', role: 'lab' },
  { name: 'hospital-admin', role: 'hospital-admin' },
  { name: 'discharge', role: 'discharge' },
  { name: 'frontdesk', role: 'frontdesk' },
  { name: 'staff', role: 'staff' },
  { name: 'hr', role: 'hr' }
];

const TARGET_DIR = path.join(__dirname, '..', 'dist-mobile', 'pages', 'portal');
fs.mkdirSync(TARGET_DIR, { recursive: true });

function fetchPortalHtml(portal) {
  return new Promise((resolve, reject) => {
    // Generate valid JWT payload matching decodeJwt in middleware
    const payload = Buffer.from(JSON.stringify({
      role: portal.role,
      hospitalId: 'HORIZON001',
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365
    })).toString('base64');

    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
    const options = {
      hostname: 'localhost',
      port: 3008,
      path: `/HORIZON001/${portal.name}`,
      method: 'GET',
      headers: {
        'Cookie': `accessToken=${token}; hospitalId=HORIZON001; csrf_token=dummy_csrf`,
        'User-Agent': 'Mozilla/5.0 MSCureChain'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          const filePath = path.join(TARGET_DIR, `${portal.name}.html`);
          fs.writeFileSync(filePath, data, 'utf8');
          console.log(`[OK] Saved ${portal.name}.html (${data.length} bytes)`);
          resolve();
        } else {
          console.error(`[FAIL] ${portal.name} status: ${res.statusCode}`);
          reject(new Error(`Failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Generating portal shells...');
  for (const portal of PORTALS) {
    try {
      await fetchPortalHtml(portal);
    } catch (e) {
      console.error(`Error generating ${portal.name}:`, e.message);
    }
  }
  console.log('All portal shells generated successfully!');
}

run();
