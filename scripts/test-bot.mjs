import { build } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
const testFile = process.argv[2] || 'tests/bot-workflows.ts';
const name = basename(testFile).replace(/\.ts$/, '');
const outDir = await mkdtemp(join(tmpdir(), 'majstrmap-tests-'));
try {
  await build({ configFile: false, ssr: { noExternal: true }, build: { ssr: true, outDir, emptyOutDir: true, rolldownOptions: { input: testFile, output: { entryFileNames: `${name}.mjs` } } } });
  const result = spawnSync(process.execPath, [join(outDir, `${name}.mjs`)], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { await rm(outDir, { recursive: true, force: true }); }
