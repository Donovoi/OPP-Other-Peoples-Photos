import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const extensions = new Set(['.js', '.mjs', '.html', '.css', '.json', '.webmanifest', '.md']);
const ignoredDirs = new Set(['.git', 'node_modules']);
const failures = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) await walk(path.join(dir, entry.name));
      continue;
    }
    if (extensions.has(path.extname(entry.name)) || entry.name.endsWith('.webmanifest')) {
      await lintFile(path.join(dir, entry.name));
    }
  }
}

async function lintFile(file) {
  const text = await readFile(file, 'utf8');
  const rel = path.relative(root, file);
  if (!text.endsWith('\n')) failures.push(`${rel}: missing trailing newline`);
  if (text.includes('\t')) failures.push(`${rel}: tab character found`);
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) failures.push(`${rel}:${index + 1}: trailing whitespace`);
  });
}

await walk(root);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Lint passed.');
