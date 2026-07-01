import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const source = path.join(repoRoot, 'blueprint', 'skills-source');
const targets = [
  path.join(repoRoot, '.agents', 'skills'),
  path.join(repoRoot, '.claude', 'skills'),
];

async function exists(dir) {
  try {
    const result = await stat(dir);
    return result.isDirectory();
  } catch {
    return false;
  }
}

if (!(await exists(source))) {
  console.error(`Missing source directory: ${path.relative(repoRoot, source)}`);
  process.exit(1);
}

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  console.log(`Synced ${path.relative(repoRoot, source)} -> ${path.relative(repoRoot, target)}`);
}
