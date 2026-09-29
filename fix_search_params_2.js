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
                        
                        // Replace 'searchParams?.get(...)' with '(searchParams?.get(...) ?? null)'
                        // but only if it's not already wrapped in '?? null' or '||'
                        
                        const regexGet = /searchParams\?\.get\(([^)]+)\)/g;
                        if (regexGet.test(content)) {
                            content = content.replace(regexGet, (match, p1) => {
                                // check if already wrapped or has coalescing
                                // this is simplistic, but we can just blindly replace and then format
                                // A better regex is to match the exact pattern and replace it
                                return `(searchParams?.get(${p1}) ?? null)`;
                            });
                            // to avoid double wrapping if we run multiple times:
                            content = content.replace(/\(\(searchParams\?\.get\(([^)]+)\) \?\? null\)\ \?\? null\)/g, '(searchParams?.get($1) ?? null)');
                            changed = true;
                        }

                        const regexHas = /searchParams\?\.has\(([^)]+)\)/g;
                        if (regexHas.test(content)) {
                            content = content.replace(regexHas, (match, p1) => {
                                return `(searchParams?.has(${p1}) ?? false)`;
                            });
                            content = content.replace(/\(\(searchParams\?\.has\(([^)]+)\) \?\? false\)\ \?\? false\)/g, '(searchParams?.has($1) ?? false)');
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
