import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const source = join(publicDir, 'brand', 'explorasc-symbol.svg');
const iconSizes = [16, 32, 48, 64];

async function render(size) {
  return sharp(source)
    .resize(size, size, {
      fit: 'contain',
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

const pngs = await Promise.all(iconSizes.map(render));
await Promise.all(iconSizes.map((size, index) =>
  writeFile(join(publicDir, `favicon-${size}x${size}.png`), pngs[index]),
));
await writeFile(join(publicDir, 'favicon.png'), pngs[3]);
await writeFile(join(publicDir, 'apple-touch-icon.png'), await render(180));

const header = Buffer.alloc(6);
header.writeUInt16LE(iconSizes.length, 4);
const entries = Buffer.alloc(iconSizes.length * 16);
let offset = header.length + entries.length;

pngs.forEach((png, index) => {
  const entry = index * 16;
  entries.writeUInt8(iconSizes[index], entry);
  entries.writeUInt8(iconSizes[index], entry + 1);
  entries.writeUInt16LE(1, entry + 4);
  entries.writeUInt16LE(32, entry + 6);
  entries.writeUInt32LE(png.length, entry + 8);
  entries.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});

await writeFile(join(publicDir, 'favicon.ico'), Buffer.concat([header, entries, ...pngs]));
