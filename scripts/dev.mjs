#!/usr/bin/env node
// Run Quartz --serve and vault scene watcher in parallel.
import { spawn } from 'node:child_process';

const procs = [
  { name: 'quartz', cmd: 'npx', args: ['quartz', 'build', '--serve'] },
  { name: 'scenes', cmd: process.execPath, args: ['scripts/watch-vault.mjs'] },
];

const running = procs.map(({ name, cmd, args }) => {
  const p = spawn(cmd, args, { stdio: 'inherit' });
  p.on('exit', (code, sig) => {
    console.error(`[${name}] exited code=${code} sig=${sig}`);
    shutdown(code ?? 1);
  });
  return p;
});

function shutdown(code = 0) {
  for (const p of running) { try { p.kill('SIGTERM'); } catch {} }
  setTimeout(() => process.exit(code), 200);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
