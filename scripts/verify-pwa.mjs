import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'src/styles/app.css',
  'src/assets/icon.svg',
  'src/js/app.js',
  'src/js/db.js',
  'src/js/crypto.js',
  'src/js/face.js',
  'src/js/location.js',
  'src/js/parsers.js',
  'src/js/sources.js',
];

for (const file of requiredFiles) {
  if (!existsSync(new URL(`../${file}`, import.meta.url))) {
    throw new Error(`Required PWA file missing: ${file}`);
  }
}

const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const manifestKeys = ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons'];
for (const key of manifestKeys) {
  if (!manifest[key] || (Array.isArray(manifest[key]) && !manifest[key].length)) {
    throw new Error(`Manifest missing required-ish key: ${key}`);
  }
}
if (manifest.display !== 'standalone') throw new Error('Manifest display should be standalone.');

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
if (!html.includes('rel="manifest"')) throw new Error('index.html does not link manifest.');
if (!html.includes('Content-Security-Policy')) throw new Error('index.html should include MVP CSP meta tag.');
if (!html.includes('src/js/app.js')) throw new Error('index.html does not load app module.');

const serviceWorker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
for (const file of requiredFiles.filter((file) => !file.startsWith('scripts/'))) {
  if (!serviceWorker.includes(`./${file}`) && file !== 'sw.js') {
    throw new Error(`Service worker cache list missing ${file}`);
  }
}
if (!serviceWorker.includes('fetch')) throw new Error('Service worker does not handle fetch events.');

console.log('PWA verification passed.');
