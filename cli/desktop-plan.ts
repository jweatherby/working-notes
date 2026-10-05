// Pure planning for cli/desktop.ts: where the installed binary and Claude's
// configuration live, and how to add the Wonos MCP server to that config.

import { posix, win32 } from 'node:path';
import { ok, err, type Result } from '../src/shared/utils/result';
import { dataDirFor, type AppDirsHost } from '../src/shared/settings/server/app-dirs';

/** The name the MCP server is registered under, as the plugin's .mcp.json does. */
export const MCP_SERVER_NAME = 'wonos';
/** Its name before the rename to Wonos, which connecting replaces. */
export const LEGACY_MCP_SERVER_NAME = 'working-notes';

/** A server entry that runs the pre-rename binary (`…/wnotes mcp`), so ours to replace. */
const isLegacyEntry = (value: unknown): boolean =>
  isObject(value) && typeof value['command'] === 'string' && /(^|[\\/])wnotes(\.exe)?$/i.test(value['command']);

const pathFor = (host: AppDirsHost): typeof posix => (host.platform === 'win32' ? win32 : posix);

/** The installed binary every client should run: `<data dir>/App/current/wono`, which survives updates. */
export const installedBinary = (host: AppDirsHost): string =>
  pathFor(host).join(dataDirFor(host), 'App', 'current', host.platform === 'win32' ? 'wono.exe' : 'wono');

/** Where Claude desktop keeps its MCP servers. */
export const claudeDesktopConfigPath = (host: AppDirsHost): string => {
  const path = pathFor(host);
  if (host.platform === 'darwin') return path.join(host.home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (host.platform === 'win32') return path.join(host.env['APPDATA'] || path.join(host.home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  return path.join(host.env['XDG_CONFIG_HOME'] || path.join(host.home, '.config'), 'Claude', 'claude_desktop_config.json');
};

export interface McpServerEntry {
  readonly command: string;
  readonly args: readonly string[];
}

export type ConfigChange = 'added' | 'updated' | 'unchanged';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Claude desktop's config with the server set to `entry`, keeping everything else,
 * except a pre-rename entry of ours under `legacyName`. Refuses a file that isn't a
 * JSON object rather than overwriting it.
 */
export const withMcpServer = (
  existing: string | null,
  name: string,
  entry: McpServerEntry,
  legacyName: string | null = null
): Result<{ readonly text: string; readonly change: ConfigChange }> => {
  let config: unknown = {};
  if (existing?.trim()) {
    try {
      config = JSON.parse(existing);
    } catch (error) {
      return err(new Error(`Claude desktop's config isn't valid JSON (${error instanceof Error ? error.message : String(error)}). Fix or remove it, then connect again.`));
    }
  }
  if (!isObject(config)) return err(new Error("Claude desktop's config isn't a JSON object. Fix or remove it, then connect again."));
  const servers = config['mcpServers'] ?? {};
  if (!isObject(servers)) return err(new Error("Claude desktop's config has an mcpServers value that isn't an object. Fix it, then connect again."));

  const previous = servers[name];
  const dropLegacy = legacyName !== null && isLegacyEntry(servers[legacyName]);
  const kept = Object.fromEntries(Object.entries(servers).filter(([key]) => !(dropLegacy && key === legacyName)));
  const change: ConfigChange =
    previous === undefined ? 'added' : JSON.stringify(previous) === JSON.stringify(entry) && !dropLegacy ? 'unchanged' : 'updated';
  const next = { ...config, mcpServers: { ...kept, [name]: { command: entry.command, args: [...entry.args] } } };
  return ok({ text: `${JSON.stringify(next, null, 2)}\n`, change });
};
