const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdir(dir, function(err, list) {
        if (err) return callback(err);
        let pending = list.length;
        if (!pending) return callback(null, []);
        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        if (!--pending) callback(null, []);
                    });
                } else {
                    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                        let content = fs.readFileSync(file, 'utf8');
                        let changed = false;
                        if (content.includes('searchParams.get(')) {
                            content = content.replace(/searchParams\.get\(/g, 'searchParams?.get(');
                            changed = true;
                        }
                        if (content.includes('searchParams.has(')) {
                            content = content.replace(/searchParams\.has\(/g, 'searchParams?.has(');
                            changed = true;
                        }
                        if (changed) {
                            fs.writeFileSync(file, content, 'utf8');
                            console.log('Fixed:', file);
                        }
                    }
                    if (!--pending) callback(null, []);
                }
            });
        });
    });
}

walk('./app', (err) => {
    if (err) console.error(err);
    else console.log('Done app directory');
});

walk('./components', (err) => {
    if (err) console.error(err);
    else console.log('Done components directory');
});
