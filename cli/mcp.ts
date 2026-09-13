#!/usr/bin/env bun
// Working Notes MCP server: `wnotes mcp`. Serves every procedure, plus snapshots,
// as MCP tools over stdio for Claude desktop Chat, Cowork and Claude Code.
// Local only: no network, and it runs with the permissions of whoever starts it.
// The protocol itself is in mcp-protocol.ts.

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { PARSE_ERROR, handleMessage, resultFromOutcome, textResult, toolFromProcedure, toolName, type McpContext, type McpTool, type ToolResult } from './mcp-protocol';

const REPO = resolve(import.meta.dir, '..');
process.chdir(REPO);

// stdout carries protocol messages only. Anything else the app prints goes to stderr.
const writeProtocol = process.stdout.write.bind(process.stdout);
process.stdout.write = ((...args: Parameters<typeof process.stderr.write>) => process.stderr.write(...args)) as typeof process.stdout.write;
console.log = console.info = console.debug = (...args: unknown[]): void => console.error(...args);

const { procedures, callProcedure, disconnect } = await import('./api');
const { createSnapshot, listSnapshots } = await import('../scripts/backup/snapshot');

const INSTRUCTIONS = [
  "Working Notes is the user's local notebook: their org chart (people, teams, departments), projects, notes, docs, todos, tags and reports.",
  'Each tool is one procedure: person_create is person.create. Find ids with the list and get tools before writing, and never create a second person, team or project with an existing name.',
  'Confirm with the user before any delete, remove or detach tool, and call backup_snapshot first before deletes or more than about five writes in one go.',
  'Report back by name, not id. The working-notes skill has the full rules and recipes.'
].join(' ');

const snapshotTools: readonly McpTool[] = [
  {
    name: 'backup_snapshot',
    description: 'Takes a snapshot of the Working Notes notebook now, kept on this computer. Do this before deleting anything or making more than about five changes in one go.',
    inputSchema: {
      type: 'object',
      properties: { reason: { type: 'string', minLength: 1, maxLength: 200, description: 'Why, for example "before merging duplicate people"' } },
      required: ['reason'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    name: 'backup_list',
    description: 'Lists Working Notes snapshots with their reasons and counts. Only the user restores one, with `wnotes backup restore <id>` while the app is closed.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  }
];

const procedureByTool = new Map(procedures.map((p) => [toolName(p.name), p.name]));

const callTool = async (name: string, args: Readonly<Record<string, unknown>>): Promise<ToolResult> => {
  if (name === 'backup_snapshot') {
    const reason = typeof args['reason'] === 'string' ? args['reason'].trim() : '';
    if (!reason) return textResult('Invalid input:\n  reason: Required', true);
    const outcome = await createSnapshot({ force: true, reason });
    return textResult({ status: outcome.status, id: outcome.snapshot?.id ?? null, pruned: outcome.pruned.length });
  }
  if (name === 'backup_list') {
    const snapshots = await listSnapshots();
    return textResult(snapshots.map((s) => ({ id: s.id, createdAt: s.manifest.createdAt, reason: s.manifest.reason, counts: s.manifest.counts })));
  }
  const procedure = procedureByTool.get(name);
  return procedure ? resultFromOutcome(await callProcedure(procedure, args)) : textResult(`Unknown tool: ${name}`, true);
};

const pluginManifest = JSON.parse(readFileSync(join(REPO, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8')) as { readonly version?: string };

const ctx: McpContext = {
  info: { name: 'working-notes', version: pluginManifest.version ?? '0.0.0', instructions: INSTRUCTIONS },
  tools: [...procedures.map(toolFromProcedure), ...snapshotTools],
  callTool
};

const send = (message: unknown): void => {
  writeProtocol(`${JSON.stringify(message)}\n`);
};

const inFlight = new Set<Promise<void>>();

const receive = async (line: string): Promise<void> => {
  let message: unknown;
  try {
    message = JSON.parse(line);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } });
    return;
  }
  const response = await handleMessage(message, ctx);
  if (response) send(response);
};

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on('line', (line) => {
  if (!line.trim()) return;
  const task: Promise<void> = receive(line)
    .catch((error: unknown) => console.error(error))
    .finally(() => inFlight.delete(task));
  inFlight.add(task);
});
lines.on('close', () => {
  void Promise.allSettled(inFlight)
    .then(() => disconnect())
    .finally(() => process.exit(0));
});
