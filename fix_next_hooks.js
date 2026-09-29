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
                        
                        // Fix useParams
                        const regexParams = /const\s+params\s*=\s*useParams\(\)/g;
                        if (regexParams.test(content)) {
                            content = content.replace(regexParams, 'const params = useParams() as any');
                            changed = true;
                        }

                        // Fix useParams with destructuring: const { hospitalId } = useParams(); -> const { hospitalId } = useParams() as any;
                        const regexParamsDestruct = /useParams\(\)(?! as)/g;
                        if (regexParamsDestruct.test(content)) {
                            content = content.replace(regexParamsDestruct, 'useParams() as any');
                            changed = true;
                        }

                        // Fix usePathname
                        const regexPathname = /usePathname\(\)(?! as)/g;
                        if (regexPathname.test(content)) {
                            content = content.replace(regexPathname, 'usePathname() as string');
                            changed = true;
                        }

                        // Fix useSearchParams
                        const regexSearchParams = /useSearchParams\(\)(?! as)/g;
                        if (regexSearchParams.test(content)) {
                            content = content.replace(regexSearchParams, 'useSearchParams() as any');
                            changed = true;
                        }

                        // Fix the remaining searchParams?.get() without coalescing
                        const regexSearch = /searchParams\?\.get\((.*?)\)(?!\s*\?\?)/g;
                        if (regexSearch.test(content)) {
                            content = content.replace(regexSearch, '(searchParams?.get($1) ?? null)');
                            changed = true;
                        }

                        if (changed) {
                            fs.writeFileSync(file, content, 'utf8');
                            console.log('Fixed typings:', file);
                        }
                    }
                    if (!--pending) callback(null, []);
                }
            });
        });
    });
}

const dirs = ['./app', './components'];
let pendingDirs = dirs.length;

dirs.forEach(dir => {
    walk(dir, (err) => {
        if (err) console.error(err);
        if (!--pendingDirs) console.log('All done');
    });
});
