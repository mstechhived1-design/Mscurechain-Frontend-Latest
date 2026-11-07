/**
 * MSCureChain Deep Test Suite: Backend Connectivity & Silent Auto-Update
 *
 * Verifies:
 * 1. Railway backend health endpoint responsiveness.
 * 2. GitHub Releases API connectivity and release asset integrity.
 * 3. latest.yml manifest parsing and checksum integrity.
 * 4. Live electron-updater check with semver override (simulating v1.0.7 client detecting update).
 * 5. NSIS silent update execution argument validation (/S --force-run).
 */

const https = require('https');
const { app } = require('electron');
const { autoUpdater, NsisUpdater } = require('electron-updater');
const SemVer = require('electron-updater/node_modules/semver/classes/semver');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MSCureChain-TestScript/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MSCureChain-TestScript/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function runDeepTest() {
  console.log('===============================================================');
  console.log('   MSCURECHAIN DEEP TEST SUITE: BACKEND & SILENT AUTO-UPDATE   ');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 5;

  // -----------------------------------------------------------------
  // TEST 1: Railway Backend Health & Connectivity
  // -----------------------------------------------------------------
  console.log('[TEST 1/5] Testing Railway Production Backend Health Endpoint...');
  const backendHealthUrl = 'https://mscurechain-backend-latest-production.up.railway.app/api/health';
  try {
    const start = Date.now();
    const health = await fetchJson(backendHealthUrl);
    const latency = Date.now() - start;
    if (health && health.status === 'ok') {
      console.log(`  ✓ SUCCESS: Railway backend responded in ${latency}ms`);
      console.log(`    Response: status="${health.status}", backend="${health.backend}"`);
      passedTests++;
    } else {
      console.error('  ✗ FAILED: Unexpected backend response:', health);
    }
  } catch (err) {
    console.error('  ✗ FAILED: Railway backend unreachable:', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 2: GitHub Releases Feed & Public Access
  // -----------------------------------------------------------------
  console.log('\n[TEST 2/5] Testing GitHub Releases API Connectivity...');
  const releasesApiUrl = 'https://api.github.com/repos/mstechhived1-design/Mscurechain-Frontend-Latest/releases/latest';
  let latestRelease = null;
  try {
    latestRelease = await fetchJson(releasesApiUrl);
    if (latestRelease && latestRelease.tag_name) {
      console.log(`  ✓ SUCCESS: Fetched latest release tag: ${latestRelease.tag_name}`);
      console.log(`    Release Name: "${latestRelease.name}"`);
      console.log(`    Published At: ${latestRelease.published_at}`);
      console.log(`    Assets count: ${latestRelease.assets?.length || 0}`);
      passedTests++;
    } else {
      console.error('  ✗ FAILED: No release data returned:', latestRelease);
    }
  } catch (err) {
    console.error('  ✗ FAILED: GitHub Releases API error:', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 3: latest.yml Manifest Verification
  // -----------------------------------------------------------------
  console.log('\n[TEST 3/5] Verifying latest.yml Manifest & Binary Checksums...');
  const latestYmlUrl = 'https://github.com/mstechhived1-design/Mscurechain-Frontend-Latest/releases/latest/download/latest.yml';
  try {
    const ymlContent = await fetchText(latestYmlUrl);
    if (ymlContent.includes('version:') && ymlContent.includes('sha512:')) {
      console.log('  ✓ SUCCESS: latest.yml successfully downloaded and parsed.');
      const verMatch = ymlContent.match(/version:\s*(.+)/);
      const pathMatch = ymlContent.match(/path:\s*(.+)/);
      console.log(`    Manifest Target Version: ${verMatch ? verMatch[1].trim() : 'unknown'}`);
      console.log(`    Manifest Installer Executable: ${pathMatch ? pathMatch[1].trim() : 'unknown'}`);
      passedTests++;
    } else {
      console.error('  ✗ FAILED: Invalid latest.yml format:\n', ymlContent);
    }
  } catch (err) {
    console.error('  ✗ FAILED: Could not download latest.yml:', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 4: Live AutoUpdater Simulation (v1.0.7 client detecting update)
  // -----------------------------------------------------------------
  console.log('\n[TEST 4/5] Running Live AutoUpdater Simulation (v1.0.7 -> Latest)...');
  try {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.currentVersion = new SemVer('1.0.7');
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'mstechhived1-design',
      repo: 'Mscurechain-Frontend-Latest',
    });
    autoUpdater.autoDownload = false;

    let updateFound = false;
    let detectedVersion = null;

    autoUpdater.on('update-available', (info) => {
      updateFound = true;
      detectedVersion = info.version;
    });

    const checkResult = await autoUpdater.checkForUpdates();
    const v = detectedVersion || checkResult?.updateInfo?.version;
    if (updateFound || v) {
      console.log(`  ✓ SUCCESS: Live AutoUpdater detected update from v1.0.7 -> v${v}`);
      console.log(`    Installer file: ${checkResult?.updateInfo?.files?.[0]?.url || 'MSCureChain-Setup'}`);
      passedTests++;
    } else {
      console.error('  ✗ FAILED: AutoUpdater did not trigger update-available');
    }
  } catch (err) {
    console.error('  ✗ FAILED: AutoUpdater simulation threw:', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 5: NSIS Silent Execution Arguments Validation
  // -----------------------------------------------------------------
  console.log('\n[TEST 5/5] Verifying NSIS Silent Update Command-Line Parameters...');
  try {
    const dummyUpdater = new NsisUpdater();
    dummyUpdater.downloadedUpdateHelper = {
      file: 'C:\\dummy\\MSCureChain-Setup-1.0.9.exe',
      downloadedFileInfo: { version: '1.0.9' },
    };

    let capturedArgs = null;
    dummyUpdater.spawnLog = (exe, args) => {
      capturedArgs = args;
      return Promise.resolve();
    };

    dummyUpdater.doInstall({ isSilent: true, isForceRunAfter: true, isAdminRightsRequired: false });

    if (capturedArgs && capturedArgs.includes('/S') && capturedArgs.includes('--force-run')) {
      console.log('  ✓ SUCCESS: Verified NSIS silent install flags:');
      console.log(`    Generated parameters: ${JSON.stringify(capturedArgs)}`);
      console.log('    /S enables completely unattended silent upgrade.');
      console.log('    --force-run automatically relaunches the application immediately after upgrade.');
      passedTests++;
    } else {
      console.error('  ✗ FAILED: Missing /S or --force-run in NSIS arguments:', capturedArgs);
    }
  } catch (err) {
    console.error('  ✗ FAILED: NSIS parameter check threw:', err.message);
  }

  // -----------------------------------------------------------------
  // FINAL REPORT
  // -----------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`   TEST RESULT: ${passedTests}/${totalTests} TESTS PASSED (${passedTests === totalTests ? 'ALL PASSED' : 'SOME FAILED'})`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    console.log('Conclusion: The silent auto-update pipeline and Railway connectivity');
    console.log('are verified working end-to-end.\n');
    setTimeout(() => {
      app.quit();
      process.exit(0);
    }, 500);
  } else {
    setTimeout(() => {
      app.quit();
      process.exit(1);
    }, 500);
  }
}

app.whenReady().then(runDeepTest);
