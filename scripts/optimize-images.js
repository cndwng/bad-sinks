#!/usr/bin/env node
// Optimizes all PNG/JPG images in assets/ in-place using sharp.
// Usage: npm run optimize

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const before = fs.statSync(filePath).size;
  const tmp = filePath + '.tmp';

  const pipeline = sharp(filePath).resize({ width: 1600, withoutEnlargement: true });

  if (ext === '.png') {
    await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(tmp);
  } else {
    await pipeline.jpeg({ quality: 85, mozjpeg: true }).toFile(tmp);
  }

  fs.renameSync(tmp, filePath);
  const after = fs.statSync(filePath).size;
  const pct = Math.round((1 - after / before) * 100);
  console.log(`  ${path.basename(filePath)}: ${kb(before)} → ${kb(after)} (${pct}% smaller)`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

async function main() {
  const files = fs.readdirSync(ASSETS_DIR).filter(f => /\.(png|jpe?g)$/i.test(f));
  if (files.length === 0) {
    console.log('No images found in assets/');
    return;
  }
  console.log(`Optimizing ${files.length} images in assets/...\n`);
  for (const file of files) {
    await optimizeFile(path.join(ASSETS_DIR, file));
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
