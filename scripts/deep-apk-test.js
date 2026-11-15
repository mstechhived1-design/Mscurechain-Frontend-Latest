const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const APK_PATH = 'C:/Users/shaik/Desktop/mscurechain/MSCureChain-Hospital-Portal-Standalone.apk';

console.log('====================================================');
console.log('       MSCURECHAIN STANDALONE APK DEEP TEST         ');
console.log('====================================================');

// Test 1: Load APK Archive
if (!fs.existsSync(APK_PATH)) {
  console.error('FATAL: APK file does not exist at ' + APK_PATH);
  process.exit(1);
}

const stats = fs.statSync(APK_PATH);
console.log(`[PASS] APK exists (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${stats.size} bytes)`);

// We will use node's built-in zlib or powershell/zip to inspect entries
