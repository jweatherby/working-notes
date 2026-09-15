#!/usr/bin/env bun
// Smoke-tests a built plugin the way a machine without a clone uses it:
//   - the shim installs the binary into a fresh data directory and runs a procedure
//   - `wnotes mcp` answers over stdio with the notebook argument on its tools
//   - `wnotes app` serves a page, the API, and the guard
// Uses APP_ENV=test, so data goes to ./data/test inside a temporary directory.
//   bun scripts/release/smoke.ts [dist/plugin]

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const plugin = resolve(process.argv[2] ?? 'dist/plugin');
const binary = readdirSync(join(plugin, 'server')).find((name) => name.startsWith('wnotes-'));
if (!binary) throw new Error(`No wnotes binary in ${plugin}/server`);

const cwd = mkdtempSync(join(tmpdir(), 'wnotes-smoke-'));
const home = mkdtempSync(join(tmpdir(), 'wnotes-home-'));
const env = { ...process.env, APP_ENV: 'test', HOME: home, PATH: '/usr/bin:/bin' };
const check = (label: string, passed: boolean, detail = ''): void => {
  console.log(`${passed ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) process.exitCode = 1;
};

// 1. Through the shim, with no Bun on PATH and no clone.
const listed = spawnSync('sh', [join(plugin, 'scripts', 'wnotes'), 'notebook.list'], { cwd, env, encoding: 'utf8' });
const notebooks = (() => {
  try {
    return JSON.parse(listed.stdout) as { ok: boolean; value: Array<{ id: string }> };
  } catch {
    return null;
  }
})();
check('shim runs notebook.list', listed.status === 0 && notebooks?.ok === true && notebooks.value[0]?.id === 'notebook', listed.stderr.trim().split('\n').at(-1));
const version = (await Bun.file(join(plugin, 'server', 'VERSION')).text()).trim();
const installed = platformDataDir(home);
check('shim installed the binary', existsSync(join(installed, 'App', version, 'wnotes')) && existsSync(join(installed, 'App', 'current', 'wnotes')));

// 2. The MCP server.
const exe = join(plugin, 'server', binary);
const mcp = spawn(exe, ['mcp'], { cwd, env, stdio: ['pipe', 'pipe', 'inherit'] });
const replies = new Map<number, (message: Record<string, unknown>) => void>();
createInterface({ input: mcp.stdout }).on('line', (line) => {
  const message = JSON.parse(line) as Record<string, unknown>;
  replies.get(message['id'] as number)?.(message);
});
const request = (id: number, method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> =>
  new Promise((done) => {
    replies.set(id, done);
    mcp.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
await request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
const tools = ((await request(2, 'tools/list')).result as { tools: Array<{ name: string; inputSchema: { properties?: Record<string, unknown> } }> }).tools;
check('MCP lists tools with the notebook argument', tools.some((t) => t.name === 'person_list' && t.inputSchema.properties?.['notebook']) && tools.some((t) => t.name === 'app_open'), `${tools.length} tools`);
mcp.stdin.end();

// 3. The UI.
const port = 51000 + Math.floor(Math.random() * 1000);
const app = spawn(exe, ['app'], { cwd, env: { ...env, PORT: String(port) }, stdio: ['ignore', 'inherit', 'inherit'] });
const base = `http://127.0.0.1:${port}`;
let page: Response | null = null;
for (let i = 0; i < 60 && !page; i++) {
  await Bun.sleep(250);
  page = await fetch(`${base}/app`).catch(() => null);
}
const html = page ? await page.text() : '';
check('app serves /app', page?.status === 200 && html.includes('nav-brand'), `status ${page?.status ?? 'none'}`);
const asset = html.match(/\/_app\/immutable\/[^"]+\.js/)?.[0];
check('app serves static assets', !!asset && (await fetch(`${base}${asset}`)).status === 200);
check('API answers with the local header', (await fetch(`${base}/api/trpc/notebook.list`, { headers: { 'x-working-notes': '1' } })).status === 200);
check('API refuses without it', (await fetch(`${base}/api/trpc/notebook.list`)).status === 403);
const expectedVersion = (await Bun.file(join(plugin, 'server', 'VERSION')).text()).trim();
const reported = await fetch(`${base}/__wnotes/app`).then((r) => r.json() as Promise<{ version?: string }>).catch(() => null);
check('app reports its version', reported?.version === expectedVersion, `${reported?.version ?? 'none'} (expected ${expectedVersion})`);
check('app refuses to stop without the local header', (await fetch(`${base}/__wnotes/app/stop`, { method: 'POST' })).status === 403);
const stopped = await fetch(`${base}/__wnotes/app/stop`, { method: 'POST', headers: { 'x-working-notes': '1' } });
await Bun.sleep(500);
check('app stops for a newer version', stopped.status === 202 && (await fetch(`${base}/app`).catch(() => null)) === null);
app.kill();

function platformDataDir(homeDir: string): string {
  return process.platform === 'darwin' ? join(homeDir, 'Library', 'Application Support', 'Working Notes') : join(homeDir, '.local', 'share', 'working-notes');
}

process.exit(process.exitCode ?? 0);
