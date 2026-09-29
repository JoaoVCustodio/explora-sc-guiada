import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const brandDir = fileURLToPath(new URL('../public/brand/', import.meta.url));
const size = 800;
const { data, info } = await sharp(join(brandDir, 'explorasc-symbol.png'))
  .resize(size, size)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const green = new Uint8Array(size * size);
const gold = new Uint8Array(size * size);
for (let pixel = 0; pixel < size * size; pixel++) {
  const index = pixel * info.channels;
  const [r, g, , a] = data.subarray(index, index + 4);
  if (a < 128) continue;
  const isGold = r > 100 && g > 80 && r > g * 1.25;
  (isGold ? gold : green)[pixel] = 1;
}

function simplify(points, tolerance = 1.2) {
  function distance(point, start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = dx * dx + dy * dy;
    if (!length) return Math.hypot(point[0] - start[0], point[1] - start[1]);
    const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length));
    return Math.hypot(point[0] - start[0] - t * dx, point[1] - start[1] - t * dy);
  }

  function segment(chain) {
    if (chain.length < 3) return chain;
    let largest = 0;
    let split = 0;
    for (let i = 1; i < chain.length - 1; i++) {
      const value = distance(chain[i], chain[0], chain.at(-1));
      if (value > largest) { largest = value; split = i; }
    }
    if (largest <= tolerance) return [chain[0], chain.at(-1)];
    return [...segment(chain.slice(0, split + 1)).slice(0, -1), ...segment(chain.slice(split))];
  }

  const start = points[0];
  let farthest = 1;
  for (let i = 2; i < points.length; i++) {
    if (Math.hypot(points[i][0] - start[0], points[i][1] - start[1]) >
        Math.hypot(points[farthest][0] - start[0], points[farthest][1] - start[1])) farthest = i;
  }
  return [...segment(points.slice(0, farthest + 1)).slice(0, -1),
    ...segment([...points.slice(farthest), start]).slice(0, -1)];
}

function trace(mask) {
  const edges = [];
  const starts = new Map();
  const key = (x, y) => y * (size + 1) + x;
  const filled = (x, y) => x >= 0 && x < size && y >= 0 && y < size && mask[y * size + x];
  function add(sx, sy, ex, ey, direction) {
    const index = edges.length;
    edges.push({ sx, sy, ex, ey, direction, used: false });
    const start = key(sx, sy);
    if (!starts.has(start)) starts.set(start, []);
    starts.get(start).push(index);
  }

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!filled(x, y)) continue;
    if (!filled(x, y - 1)) add(x, y, x + 1, y, 0);
    if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
    if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
    if (!filled(x - 1, y)) add(x, y + 1, x, y, 3);
  }

  const paths = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i].used) continue;
    const points = [];
    const first = key(edges[i].sx, edges[i].sy);
    let current = i;
    while (true) {
      const edge = edges[current];
      if (edge.used) throw new Error('Boundary tracing encountered a repeated edge');
      edge.used = true;
      points.push([edge.sx, edge.sy]);
      const end = key(edge.ex, edge.ey);
      if (end === first) break;
      const candidates = (starts.get(end) ?? []).filter((index) => !edges[index].used);
      const turns = [1, 0, 3, 2].map((turn) => (edge.direction + turn) % 4);
      current = candidates.sort((a, b) => turns.indexOf(edges[a].direction) - turns.indexOf(edges[b].direction))[0];
      if (current === undefined) throw new Error('Boundary tracing found an open contour');
    }
    const area = Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0)) / 2;
    if (area < 3) continue;
    const contour = simplify(points);
    paths.push(`M${contour.map(([x, y]) => `${x} ${y}`).join('L')}Z`);
  }
  return paths.join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Símbolo ExploraSC">
  <defs>
    <linearGradient id="forest" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#034a32"/><stop offset="1" stop-color="#003b29"/></linearGradient>
    <linearGradient id="amber" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3b327"/><stop offset="1" stop-color="#e8a21b"/></linearGradient>
  </defs>
  <path fill="url(#forest)" fill-rule="evenodd" d="${trace(green)}"/>
  <path fill="url(#amber)" fill-rule="evenodd" d="${trace(gold)}"/>
</svg>
`;

await writeFile(join(brandDir, 'explorasc-symbol.svg'), svg);
const darkSvg = svg.replace(
  '<path fill="url(#forest)"',
  '<path stroke="#9fc7b0" stroke-width="18" stroke-linejoin="round" paint-order="stroke fill" fill="url(#forest)"',
);
await writeFile(join(brandDir, 'explorasc-symbol-dark.svg'), darkSvg);
