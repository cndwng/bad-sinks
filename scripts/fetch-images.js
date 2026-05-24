#!/usr/bin/env node
// Fetches slide screenshots from the Figma REST API, optimizes them, and
// writes them to assets/. Requires FIGMA_ACCESS_TOKEN env var.
// Usage: node scripts/fetch-images.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FILE_KEY = 'UFtePmUoUwoI8rugK0nFNp';
const TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

if (!TOKEN) {
  console.error('Error: FIGMA_ACCESS_TOKEN environment variable is not set.');
  console.error('Get one at https://www.figma.com/settings → Personal access tokens');
  process.exit(1);
}

const SLIDES = [
  { id: '1:5',    file: 'slide-01-title.png' },
  { id: '102:2',  file: 'slide-02-book.png' },
  { id: '102:87', file: 'slide-04-about.png' },
  { id: '113:70', file: 'slide-06-norman-doors.png' },
  { id: '114:77', file: 'slide-07-more-examples.png' },
  { id: '106:103',file: 'slide-10-anatomy.png' },
  { id: '106:105',file: 'slide-11-basins.png' },
  { id: '114:223',file: 'slide-12-bad-shapes.png' },
  { id: '114:216',file: 'slide-13-troughs.png' },
  { id: '106:109',file: 'slide-14-faucets.png' },
  { id: '117:391',file: 'slide-15-push-down.png' },
  { id: '117:434',file: 'slide-16-auto-sensors.png' },
  { id: '106:111',file: 'slide-17-spouts.png' },
  { id: '106:117',file: 'slide-18-surroundings.png' },
  { id: '114:211',file: 'slide-19-surroundings-bad.png' },
  { id: '117:440',file: 'slide-21-optometrist.png' },
  { id: '117:263',file: 'slide-22-consider.png' },
  { id: '117:317',file: 'slide-22-annotated.png' },
  { id: '117:340',file: 'slide-23-offensive.png' },
  { id: '117:371',file: 'slide-24-faucet-high.png' },
  { id: '187:101',file: 'slide-24-annotated.png' },
  { id: '117:490',file: 'slide-25-moma.png' },
  { id: '117:541',file: 'slide-25-moma-zoom.png' },
  { id: '187:104',file: 'slide-25-moma-annotated.png' },
  { id: '106:122',file: 'slide-27-hand-dryers.png' },
  { id: '111:7',  file: 'slide-28-smart-house.png' },
  { id: '114:193',file: 'slide-29-toilet-paper.png' },
  { id: '133:49', file: 'slide-30-toilet-paper2.png' },
  { id: '114:200',file: 'slide-31-yugioh.png' },
  { id: '133:45', file: 'slide-32-stall-doors.png' },
];

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

async function fetchImageUrls(nodeIds) {
  const ids = nodeIds.join(',');
  const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`;
  const { status, body } = await get(url, { 'X-Figma-Token': TOKEN });
  if (status !== 200) {
    throw new Error(`Figma API error ${status}: ${body.toString()}`);
  }
  const data = JSON.parse(body.toString());
  if (data.err) throw new Error(`Figma API error: ${data.err}`);
  return data.images;
}

async function downloadAndOptimize(url, dest) {
  const { status, body } = await get(url);
  if (status !== 200) throw new Error(`Download failed ${status} for ${url}`);
  await sharp(body)
    .resize({ width: 1600, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(dest);
}

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  // Batch into groups of 10 to stay within Figma API limits
  const BATCH = 10;
  for (let i = 0; i < SLIDES.length; i += BATCH) {
    const batch = SLIDES.slice(i, i + BATCH);
    console.log(`Fetching export URLs for batch ${Math.floor(i/BATCH)+1}...`);

    const nodeIds = batch.map(s => s.id);
    const images = await fetchImageUrls(nodeIds);

    for (const slide of batch) {
      const imageUrl = images[slide.id];
      if (!imageUrl) {
        console.warn(`  No URL returned for ${slide.id} (${slide.file})`);
        continue;
      }
      const dest = path.join(ASSETS_DIR, slide.file);
      process.stdout.write(`  ${slide.file}... `);
      await downloadAndOptimize(imageUrl, dest);
      const size = fs.statSync(dest).size;
      console.log(`${(size/1024).toFixed(0)}KB`);
    }
  }

  console.log(`\nDone! ${SLIDES.length} images saved to assets/`);
}

main().catch(err => { console.error(err); process.exit(1); });
