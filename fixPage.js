const fs = require('fs');

const filePath = '/Users/apple/newcure/Multitenant_MsCurechain_Frontend/app/[hospitalId]/(portals)/doctor/appointment/[appointmentId]/page.tsx';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines:', lines.length);

// Find the line with ') : (' which is the broken ternary else
let brokenTernaryLine = -1;
for (let i = 970; i < 1000; i++) {
  if (lines[i] && lines[i].trim() === ') : (') {
    brokenTernaryLine = i;
    console.log('Found broken ternary at line', i + 1, ':', JSON.stringify(lines[i]));
    break;
  }
}

if (brokenTernaryLine === -1) {
  console.log('Could not find broken ternary, searching broader...');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].trim() === ') : (') {
      console.log('Found at line', i + 1, ':', JSON.stringify(lines[i]));
    }
  }
  process.exit(1);
}

// Find the start of the "Consultation Notes Section" comment (the old duplicate clinical notes)
let consultationNotesSectionStart = -1;
for (let i = 870; i < brokenTernaryLine; i++) {
  if (lines[i] && lines[i].includes('Consultation Notes Section')) {
    consultationNotesSectionStart = i;
    console.log('Found Consultation Notes Section at line', i + 1);
    break;
  }
}

if (consultationNotesSectionStart === -1) {
  console.log('Could not find Consultation Notes Section');
  process.exit(1);
}

// The end of the labs && block is at brokenTernaryLine - 1 (which has `            </div>`)
// and brokenTernaryLine - 2 (which has `          </div>`)
// We need to:
// 1. Keep lines 0...(consultationNotesSectionStart - 1) - the good labs content  
// 2. Replace lines consultationNotesSectionStart...brokenTernaryLine with closing `})\n\n          {activeTab === 'history' && (`
// 3. Keep lines (brokenTernaryLine + 1)...end - the history block content

// But we need to figure out exact boundary. Let's look at lines right before consultationNotesSectionStart
console.log('Lines around consultation notes start:');
for (let i = consultationNotesSectionStart - 3; i <= consultationNotesSectionStart + 1; i++) {
  console.log(i + 1, ':', JSON.stringify(lines[i]));
}

console.log('Lines around broken ternary:');
for (let i = brokenTernaryLine - 3; i <= brokenTernaryLine + 3; i++) {
  console.log(i + 1, ':', JSON.stringify(lines[i]));
}

// Build new content
const before = lines.slice(0, consultationNotesSectionStart - 1); // everything up to (not including) the blank line before Consultation Notes Section comment
const after = lines.slice(brokenTernaryLine + 1); // everything after ') : ('

// The replacement: close the labs block properly and open history block  
const replacement = [
  '            </div>',
  '          )}',
  '',
  '          {activeTab === \'history\' && (',
];

const newLines = [...before, ...replacement, ...after];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Fixed! New total lines:', newLines.length);
