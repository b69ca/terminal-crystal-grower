#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createWorld, step, analyze, render, renderSVG } from './index.js';
import { parse, integer, terminal } from './terminal.js';
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('Usage: terminal-crystal-grower [--seed N] [--width N] [--height N] [--steps N] [--frames N] [--json] [--svg FILE] [--no-color]\n\nControls: p pause, . step, n next seed, r reset, +/- speed, q quit'); process.exit(0); }
try {
  const options = parse(args, ["--seed","--width","--height","--steps","--frames","--svg"]);
  const live = !!(process.stdout.isTTY && process.stdin.isTTY && !options['--json'] && !options['--svg']);
  const width = integer(options, '--width', live ? Math.max(21, Math.min(100, (process.stdout.columns || 80) - 1)) : 81, 121);
  const height = integer(options, '--height', live ? Math.max(15, Math.min(40, (process.stdout.rows || 32) - 4)) : 41, 61);
  let seed = integer(options, '--seed', 42, 0xffffffff), paused = false, trails = true, delay = 60;
  
  const make = () => createWorld({ seed, width, height }); let world = make();
  const frames = integer(options, '--frames', live ? Infinity : 1, 100000);
  if ((options['--json'] || options['--svg']) && options['--frames'] !== undefined) throw new Error('--frames is only for terminal output');
  step(world, integer(options, '--steps', live ? 0 : 600, 10000));
  if (options['--json'] || options['--svg']) {
    if (options['--svg']) await writeFile(options['--svg'], renderSVG(world));
    if (options['--json']) console.log(JSON.stringify(analyze(world), null, 2));
  } else await terminal({ live, frames, interval: () => delay,
    onKey: key => {
      if (key === 'p' || key === ' ') paused = !paused;
      else if (key === '.') { paused = true; step(world); }
      else if (key === 'n') { seed = (seed + 1) >>> 0; world = make(); }
      else if (key === 'r') world = make();
      
      else if (key === '+' || key === '=') delay = Math.max(10, Math.floor(delay / 2));
      else if (key === '-') delay = Math.min(1000, delay * 2);
    }, onTick: () => { if (paused || world.complete) return false; step(world, 1); return true; },
    draw: () => 'CRYSTAL GROWER | seed ' + seed + ' | frame ' + world.frame + (world.complete ? ' COMPLETE' : '') + (paused ? ' PAUSED' : '') + '\n' + render(world, { color: live && !options['--no-color'] && !process.env.NO_COLOR }) + '\np pause . step n seed r reset +/- speed q quit'
  });
} catch (error) { console.error('terminal-crystal-grower: ' + error.message); process.exitCode = 2; }
