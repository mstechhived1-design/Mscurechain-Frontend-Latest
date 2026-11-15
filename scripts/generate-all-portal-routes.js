const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORTALS_DIR = path.join(ROOT, 'app', '[hospitalId]', '(portals)');
const TARGET_DIR = path.join(ROOT, 'dist-mobile', 'pages', 'portal');

fs.mkdirSync(TARGET_DIR, { recursive: true });

// 1. Discover all routes
function discoverRoutes(dir, baseRoute = '') {
  let routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subRoute = baseRoute ? `${baseRoute}/${entry.name}` : entry.name;
      const subDir = path.join(dir, entry.name);
      if (fs.existsSync(path.join(subDir, 'page.tsx')) || fs.existsSync(path.join(subDir, 'page.jsx')) || fs.existsSync(path.join(subDir, 'page.js'))) {
        routes.push(subRoute);
      }
      routes = routes.concat(discoverRoutes(subDir, subRoute));
    }
  }
  return routes;
}

const allRoutes = discoverRoutes(PORTALS_DIR);
console.log(`Discovered ${allRoutes.length} portal routes to pre-render.`);

// 2. Map route to role
function getRoleForRoute(route) {
  const portalName = route.split('/')[0];
  const map = {
    'discharge': 'discharge',
    'doctor': 'doctor',
    'frontdesk': 'frontdesk',
    'helpdesk': 'helpdesk',
    'hospital-admin': 'hospital-admin',
    'hr': 'hr',
    'lab': 'lab',
    'masterhelpdesk': 'masterhelpdesk',
    'nurse': 'nurse',
    'pharmacy': 'pharmacy',
    'staff': 'staff'
  };
  return map[portalName] || 'hospital-admin';
}

function fetchUrl(route, isRsc = false) {
  return new Promise((resolve) => {
    const role = getRoleForRoute(route);
    const payload = Buffer.from(JSON.stringify({
      role: role,
      hospitalId: 'HORIZON001',
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365
    })).toString('base64');

    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
    
    // Replace dynamic placeholders with sample IDs for fetching
    const sampleRoute = route
      .replace(/\[appointmentId\]/g, 'sample-apt')
      .replace(/\[patientId\]/g, 'sample-pat')
      .replace(/\[helpdeskId\]/g, 'sample-help')
      .replace(/\[id\]/g, 'sample-id');

    const headers = {
      'Cookie': `accessToken=${token}; hospitalId=HORIZON001; csrf_token=dummy_csrf`,
      'User-Agent': 'Mozilla/5.0 MSCureChain'
    };

    if (isRsc) {
      headers['RSC'] = '1';
    }

    const options = {
      hostname: 'localhost',
      port: 3008,
      path: `/HORIZON001/${sampleRoute}${isRsc ? '?_rsc=1' : ''}`,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          // Determine save path
          const ext = isRsc ? '.rsc' : '.html';
          const outFilePath = path.join(TARGET_DIR, `${route}${ext}`);
          fs.mkdirSync(path.dirname(outFilePath), { recursive: true });
          fs.writeFileSync(outFilePath, buffer);
          resolve({ route, isRsc, success: true, size: buffer.length });
        } else {
          resolve({ route, isRsc, success: false, status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ route, isRsc, success: false, error: err.message });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ route, isRsc, success: false, error: 'timeout' });
    });

    req.end();
  });
}

async function run() {
  const concurrency = 6;
  const queue = [];

  for (const r of allRoutes) {
    queue.push({ route: r, isRsc: false });
    queue.push({ route: r, isRsc: true });
  }

  console.log(`Starting generation of ${queue.length} targets (HTML + RSC) with concurrency ${concurrency}...`);
  let completed = 0;
  let succeeded = 0;

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      const res = await fetchUrl(task.route, task.isRsc);
      completed++;
      if (res.success) {
        succeeded++;
      }
      if (completed % 25 === 0 || completed === allRoutes.length * 2) {
        console.log(`Progress: ${completed} / ${allRoutes.length * 2} (${succeeded} succeeded)`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  console.log(`✅ Generation complete! Total succeeded: ${succeeded} / ${allRoutes.length * 2}`);
}

run();
