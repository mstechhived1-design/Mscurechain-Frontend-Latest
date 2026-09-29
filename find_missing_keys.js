const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(process.argv[2]);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('.map(') && line.includes('=>')) {
            // Check if next few lines have 'key='
            let foundKey = false;
            for (let j = 0; j < 5; j++) {
                if (lines[i + j] && lines[i + j].includes('key=')) {
                    foundKey = true;
                    break;
                }
            }
            if (!foundKey) {
                // Check if it returns JSX
                if (line.includes('<') || (lines[i+1] && lines[i+1].includes('<'))) {
                   console.log(`${file}:${i + 1}: ${line.trim()}`);
                }
            }
        }
    });
});
