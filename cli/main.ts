#!/usr/bin/env bun
// Working Notes CLI. Calls any tRPC procedure in-process against the local
// notebook, with the router's own validation. The app does not need to be running.
//   wnotes help                        list procedures
//   wnotes help <procedure>            show a procedure's inputs
//   wnotes <procedure> [--key value]   call it; the JSON result goes to stdout
// See cli/args.ts for --<key>-file, --input and value coercion, and cli/mcp.ts for `wnotes mcp`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema } from './args';

// Paths (migrations, test data) resolve from the repo; files named in
// arguments resolve from wherever the command was run.
const callerCwd = process.cwd();
process.chdir(resolve(import.meta.dir, '..'));

// App logs go to stderr so stdout carries only the JSON result.
console.log = console.info = console.debug = (...args: unknown[]): void => console.error(...args);

const { coerceArgs, typesOf } = await import('./args');
const { procedures, callProcedure, disconnect } = await import('./api');

const describeType = (prop: JsonSchema): string => {
  const types = [...typesOf(prop)].filter((t) => t !== 'null');
  const values = prop.enum?.filter((v) => v !== null);
  const base = values?.length ? values.join('|') : types.join('|') || 'any';
  return typesOf(prop).has('null') ? `${base}|null` : base;
};

const printHelp = (name: string | undefined): number => {
  if (!name) {
    console.error('Procedures (wnotes help <procedure> for inputs):\n');
    for (const p of procedures) {
      const props = Object.keys((p.inputSchema as JsonSchema).properties ?? {});
      process.stdout.write(`  ${p.name} (${p.type})${props.length ? `  --${props.join(' --')}` : ''}\n`);
    }
    console.error('\nAlso: wnotes backup [list | restore <id|latest> | --force --reason <why> | install | uninstall], wnotes app (the UI), and wnotes mcp (the MCP server).');
    return 0;
  }
  const meta = procedures.find((p) => p.name === name);
  if (!meta) {
    console.error(`Unknown procedure: ${name}`);
    return 1;
  }
  const schema = meta.inputSchema as JsonSchema;
  const required = new Set(schema.required ?? []);
  process.stdout.write(`${meta.name} (${meta.type})\n`);
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const limits = [
      prop.minimum !== undefined ? `min ${prop.minimum}` : '',
      prop.maximum !== undefined ? `max ${prop.maximum}` : '',
      prop.maxLength !== undefined ? `max length ${prop.maxLength}` : '',
      prop.format ? prop.format : ''
    ].filter(Boolean).join(', ');
    process.stdout.write(`  --${key}  ${describeType(prop)}${required.has(key) ? '  (required)' : ''}${limits ? `  [${limits}]` : ''}\n`);
  }
  return 0;
};

const run = async (): Promise<number> => {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') return printHelp(rest[0]);

  const meta = procedures.find((p) => p.name === command);
  if (!meta) {
    console.error(`Unknown procedure: ${command}. Run \`wnotes help\` to list them.`);
    return 1;
  }

  const input = coerceArgs(rest, meta.inputSchema, (path) => readFileSync(resolve(callerCwd, path), 'utf8'));
  if (!input.ok) {
    console.error(`Error: ${input.error.message}. Run \`wnotes help ${command}\` for its inputs.`);
    return 1;
  }

  const outcome = await callProcedure(command, input.value);
  if (outcome.kind === 'invalid') {
    console.error(`Invalid input for ${command}:\n${outcome.issues.map((i) => `  --${i.path || '(input)'}: ${i.message}`).join('\n')}`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify(outcome.result, null, 2)}\n`);
  return outcome.failed ? 1 : 0;
};

let code = 1;
try {
  code = await run();
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await disconnect();
}
process.exit(code);
