#!/usr/bin/env bun
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const src = resolve(root, 'admin', 'admin-editor.js');
const destDir = resolve(root, 'dist', 'admin');
const dest = resolve(destDir, 'admin-editor.js');

if (!existsSync(src)) {
  console.error('admin-editor.js not found. Run "bun run bundle" first.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log('Copied admin-editor.js to dist/admin/');