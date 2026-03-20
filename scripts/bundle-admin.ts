#!/usr/bin/env bun
import { build } from 'bun';
import { resolve } from 'path';

const root = process.cwd();
const adminDir = resolve(root, 'admin');

await build({
  entrypoints: [resolve(root, 'scripts/admin-editor.ts')],
  outdir: adminDir,
  format: 'esm',
  splitting: false,
  minify: true,
});

console.log('Admin editor bundled successfully');