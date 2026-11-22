// Builds public/bundle.js from the source files in app.js + pages/.
// Run with: npm run build
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const files = [
    'app.js',
    'pages/dashboard.js',
    'pages/students.js',
    'pages/batches.js',
    'pages/attendance-fees.js',
    'pages/homework-tests-results.js',
    'pages/notices-reports-settings.js'
];

const banner = '// ═══════════════════════════════════════════════════════════\n'
    + '// WARNING: generated file. Edit app.js / pages/*.js then run: npm run build\n'
    + '// ═══════════════════════════════════════════════════════════\n\n';

const parts = files.map(f => {
    const full = path.join(publicDir, f);
    if (!fs.existsSync(full)) throw new Error('Missing source file: ' + f);
    return fs.readFileSync(full, 'utf8');
});

fs.writeFileSync(path.join(publicDir, 'bundle.js'), banner + parts.join('\n\n'));
console.log('✅ Built public/bundle.js from ' + files.length + ' source files');
