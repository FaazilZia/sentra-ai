const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // Exclude test and mock directories
      if (file !== '__tests__' && file !== 'tests' && file !== '__mocks__') {
        getFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function copyJsonFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== '__tests__' && file !== 'tests' && file !== '__mocks__') {
        copyJsonFiles(filePath);
      }
    } else if (file.endsWith('.json')) {
      const destPath = path.join('dist', filePath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(filePath, destPath);
      console.log(`Copied ${filePath} -> ${destPath}`);
    }
  }
}

const entryPoints = [
  ...getFiles('src'),
  ...getFiles('prisma'),
];

if (fs.existsSync('prisma.config.ts')) {
  entryPoints.push('prisma.config.ts');
}

console.log(`Building ${entryPoints.length} TypeScript files using esbuild...`);

build({
  entryPoints,
  outdir: 'dist',
  outbase: '.',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  bundle: false,
  logLevel: 'info',
}).then(() => {
  console.log('esbuild compile complete! Output generated in dist/');
  // Copy JSON assets to dist/
  copyJsonFiles('src');
  console.log('Build succeeded.');
}).catch((err) => {
  console.error('esbuild compile failed:', err);
  process.exit(1);
});
