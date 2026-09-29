const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'app/[hospitalId]/(portals)/hospital-admin');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(targetDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Grid - 4 cols to 1/2/3/4
    content = content.replace(/(?<![a-zA-Z0-9:-])grid-cols-4\b/g, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4');
    // Grid - 3 cols to 1/2/3
    content = content.replace(/(?<![a-zA-Z0-9:-])grid-cols-3\b/g, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3');
    // Grid - 2 cols to 1/2
    content = content.replace(/(?<![a-zA-Z0-9:-])grid-cols-2\b/g, 'grid-cols-1 md:grid-cols-2');

    // Padding - p-6, p-8, p-4
    content = content.replace(/(?<![a-zA-Z0-9:-])p-6\b/g, 'p-2 md:p-6');
    content = content.replace(/(?<![a-zA-Z0-9:-])p-8\b/g, 'p-3 md:p-8');
    content = content.replace(/(?<![a-zA-Z0-9:-])p-4\b/g, 'p-2 md:p-4');
    content = content.replace(/(?<![a-zA-Z0-9:-])px-6\b/g, 'px-2 md:px-6');
    content = content.replace(/(?<![a-zA-Z0-9:-])px-8\b/g, 'px-2 md:px-8');

    // Text sizes
    content = content.replace(/(?<![a-zA-Z0-9:-])text-base\b/g, 'text-xs md:text-base');
    content = content.replace(/(?<![a-zA-Z0-9:-])text-lg\b/g, 'text-sm md:text-lg');

    // Form layouts - grid-cols-2/3
    // handled by generic grid cols replacements above

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
    }
});
