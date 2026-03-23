import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function convert() {
  const inDir = './public/video_frames_png';
  const outDir = './public/video_frames_webp';

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = fs.readdirSync(inDir).filter(f => f.endsWith('.png'));
  console.log(`Converting ${files.length} images...`);

  for (const file of files) {
    const inFile = path.join(inDir, file);
    const outName = file.replace('.png', '.webp');
    const outFile = path.join(outDir, outName);
    
    await sharp(inFile)
      .webp({ quality: 80, effort: 4 })
      .toFile(outFile);
  }
  console.log('Conversion complete.');
}

convert().catch(console.error);
