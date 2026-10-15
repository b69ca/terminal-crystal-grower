export function createWorld({ seed = 42, width = 81, height = 41 } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be unsigned 32-bit');
  if (!Number.isInteger(width) || width < 21 || width > 121 || !Number.isInteger(height) || height < 15 || height > 61) throw new Error('width must be 21–121 and height 15–61');
  const cx = Math.floor(width / 2), cy = Math.floor(height / 2), cells = new Uint32Array(width * height); cells[cy * width + cx] = 1;
  return { seed, randomState: seed, width, height, cx, cy, cells, count: 1, radius: 0, hops: 0, frame: 0, walker: null, complete: false };
}
function random(world) { world.randomState = (Math.imul(world.randomState, 1664525) + 1013904223) >>> 0; return world.randomState / 4294967296; }
export function step(world, count = 1) {
  if (!Number.isInteger(count) || count < 0 || count > 10000) throw new Error('step count must be 0–10000');
  const { width: w, height: h, cx, cy } = world, limit = Math.min(cx, cy, w - 1 - cx, h - 1 - cy) - 2;
  for (let tick = 0; tick < count && !world.complete; tick++) {
    for (let hop = 0; hop < 1000 && !world.complete; hop++) {
      if (!world.walker) { const angle = random(world) * 2 * Math.PI, r = Math.min(limit + 1, world.radius + 4); world.walker = { x: cx + Math.round(Math.cos(angle) * r), y: cy + Math.round(Math.sin(angle) * r) }; }
      const p = world.walker, i = p.y * w + p.x;
      if (p.x <= 0 || p.x >= w - 1 || p.y <= 0 || p.y >= h - 1 || Math.hypot(p.x - cx, p.y - cy) > Math.min(limit + 2, world.radius + 10) || world.cells[i]) { world.walker = null; continue; }
      if (world.cells[i - 1] || world.cells[i + 1] || world.cells[i - w] || world.cells[i + w]) {
        world.cells[i] = ++world.count; world.radius = Math.max(world.radius, Math.hypot(p.x - cx, p.y - cy)); world.walker = null;
        if (world.radius >= limit) world.complete = true;
        continue;
      }
      const direction = Math.floor(random(world) * 4); if (direction === 0) p.x++; else if (direction === 1) p.x--; else if (direction === 2) p.y++; else p.y--; world.hops++;
    }
    world.frame++;
  }
  return world;
}
export function analyze(world) { return { seed: world.seed, width: world.width, height: world.height, frame: world.frame, particles: world.count, radius: world.radius, randomWalkHops: world.hops, complete: world.complete }; }
export function render(world, { color = false } = {}) {
  const rows = [];
  for (let y = 0; y < world.height; y++) { let row = ''; for (let x = 0; x < world.width; x++) { const n = world.cells[y * world.width + x], ch = n === 1 ? '+' : n ? '#' : ' '; row += color && n ? `\x1b[${[36, 34, 35, 33][Math.floor(n / 20) % 4]}m${ch}\x1b[0m` : ch; } rows.push(row); }
  return rows.join('\n');
}
export function renderSVG(world) {
  const w = world.width * 8 + 64, h = world.height * 8 + 116, colors = ['#5de4c7', '#70a5ff', '#c9a7ff', '#f48fb1', '#ffd166'];
  let cells = '';
  world.cells.forEach((n, i) => { if (n) cells += `<rect x="${32 + i % world.width * 8}" y="${84 + Math.floor(i / world.width) * 8}" width="8" height="8" rx="1" fill="${colors[Math.floor(n / 20) % colors.length]}"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${Math.round(h * 800 / w)}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="18" fill="#0d1525"/><g font-family="monospace"><text x="32" y="36" font-size="22" fill="#eff5ff">TERMINAL CRYSTAL GROWER</text><text x="32" y="62" fill="#93a4bc">seed ${world.seed} / ${world.count} particles / ${world.complete ? 'complete' : 'growing'}</text>${cells}<text x="32" y="${h - 12}" font-size="11" fill="#93a4bc">Diffusion-limited aggregation / colors show arrival order / n seed r reset q quit</text></g></svg>\n`;
}
