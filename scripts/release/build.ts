#!/usr/bin/env bun
// Builds the standalone plugin: one `wnotes` binary (the CLI, MCP server, backups and
// UI, with Bun and the UI's static files built in) and the migrations, in a copy of
// plugin/. A machine that installs it needs no clone and no Bun. The static files are
// embedded rather than shipped as hundreds of minified files, so an organisation's
// plugin security scan has less to read on every update.
//   bun run release:build [--target darwin-arm64]
// Output:
//   dist/plugin/                                  the built plugin (published to the `dist` branch)
//   dist/working-notes-<version>-<target>.zip     the same, zipped for Claude desktop Chat

import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { agreedVersion } from './versions';
import { libsqlNativePlugin } from './libsql';

const REPO = resolve(import.meta.dir, '..', '..');
const DIST = join(REPO, 'dist');
const CHAT_UPLOAD_LIMIT = 50 * 1024 * 1024;
const TARGETS = new Set(['darwin-arm64', 'darwin-x64']);

const run = (command: string, args: readonly string[]): void => {
  const r = spawnSync(command, [...args], { cwd: REPO, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`\`${command} ${args.join(' ')}\` failed`);
};

const option = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const main = async (): Promise<void> => {
  const target = option('target') ?? `${process.platform}-${process.arch}`;
  if (!TARGETS.has(target)) throw new Error(`Can't build for ${target}. Targets: ${[...TARGETS].join(', ')}`);

  const version = agreedVersion(
    await Bun.file(join(REPO, 'plugin/.claude-plugin/plugin.json')).text(),
    await Bun.file(join(REPO, '.claude-plugin/marketplace.json')).text()
  );
  if (!version.ok) throw version.error;
  console.log(`Building Working Notes ${version.value} for ${target}`);

  // The UI, as SvelteKit's adapter-node output in build/.
  run('bunx', ['svelte-kit', 'sync']);
  run('bunx', ['vite', 'build']);

  const plugin = join(DIST, 'plugin');
  const server = join(plugin, 'server');
  await rm(plugin, { recursive: true, force: true });
  await cp(join(REPO, 'plugin'), plugin, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
  await mkdir(server, { recursive: true });

  // Every static file is imported `with { type: 'file' }`, which embeds it unchanged; the
  // map from request path to embedded path is what cli/app-server.ts serves.
  const clientDir = join(REPO, 'build', 'client');
  const clientFiles = (await readdir(clientDir, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile() && e.name !== '.DS_Store')
    .map((e) => join(e.parentPath, e.name))
    .sort();

  // The generated entry imports the built SvelteKit server, so it isn't type-checked source.
  const entry = join(DIST, '.build', 'wnotes.ts');
  await mkdir(join(DIST, '.build'), { recursive: true });
  await writeFile(entry, [
    `import { runStandalone } from ${JSON.stringify(join(REPO, 'cli/standalone.ts'))};`,
    ...clientFiles.map((file, i) => `import f${i} from ${JSON.stringify(file)} with { type: 'file' };`),
    'await runStandalone({',
    `  staticFiles: new Map([${clientFiles.map((file, i) => `[${JSON.stringify(`/${relative(clientDir, file).split(sep).join('/')}`)}, f${i}]`).join(', ')}]),`,
    '  loadServer: async () => {',
    `    const [{ Server }, { manifest }] = await Promise.all([import(${JSON.stringify(join(REPO, 'build/server/index.js'))}), import(${JSON.stringify(join(REPO, 'build/server/manifest.js'))})]);`,
    '    return new Server(manifest);',
    '  }',
    '});',
    ''
  ].join('\n'));

  const binary = join(server, `wnotes-${target}`);
  const built = await Bun.build({
    entrypoints: [entry],
    compile: { target: `bun-${target}` as Bun.Build.CompileTarget, outfile: binary },
    plugins: [libsqlNativePlugin(target)]
  });
  if (!built.success) throw new Error(`Compiling failed:\n${built.logs.map(String).join('\n')}`);

  await cp(join(REPO, 'prisma', 'migrations'), join(server, 'migrations'), { recursive: true });
  await writeFile(join(server, 'VERSION'), `${version.value}\n`);

  const zip = join(DIST, `working-notes-${version.value}-${target}.zip`);
  await rm(zip, { force: true });
  const zipped = spawnSync('zip', ['-r', '-X', '-q', zip, '.', '-x', '*.DS_Store'], { cwd: plugin, stdio: 'inherit' });
  if (zipped.status !== 0) throw new Error('zip failed');

  const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const zipSize = (await stat(zip)).size;
  console.log(`\nBuilt ${plugin}\n  binary ${mb((await stat(binary)).size)}, with ${clientFiles.length} static files\n  zip    ${zip} (${mb(zipSize)})`);
  if (zipSize > CHAT_UPLOAD_LIMIT) console.warn(`The zip is over Claude desktop's ${mb(CHAT_UPLOAD_LIMIT)} upload limit.`);
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
