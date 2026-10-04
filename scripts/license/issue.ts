#!/usr/bin/env bun
// Issues a Working Notes Pro license key, good for a year by default:
//   bun run license:issue --name "Dana Park" --email dana@example.com [--months 12] [--from YYYY-MM-DD]
//                         [--renews <license id>] [--key <private key path>]
// --from starts the year on a given day; for a renewal, pass the old license's expiry day
// so no time is lost, and --renews to keep its id. Prints the key to send to the buyer.

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { signLicenseKey } from '../../src/shared/license/verify.server';
import { licensePeriod } from './period';

const option = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const name = option('name');
const email = option('email');
if (!name || !email) {
  console.error('Usage: bun run license:issue --name "<name>" --email <email> [--months 12] [--from YYYY-MM-DD] [--renews <id>]');
  process.exit(1);
}

const period = licensePeriod({ from: option('from'), months: Number(option('months') ?? 12), today: new Date() });
if (!period.ok) {
  console.error(period.error.message);
  process.exit(1);
}

const keyPath = resolve(option('key') ?? join(homedir(), '.working-notes-license', 'private.pem'));
const privateKey = await readFile(keyPath, 'utf8').catch(() => null);
if (!privateKey) {
  console.error(`No private key at ${keyPath}. Run \`bun run license:keygen\` first, or pass --key.`);
  process.exit(1);
}

const id = option('renews') ?? randomUUID();
const key = signLicenseKey({ v: 1, id, name, email, plan: 'pro', issued: period.value.issued, expires: period.value.expires }, privateKey);
console.error(`Working Notes Pro for ${name} <${email}>, ${period.value.issued} through ${period.value.expires} (license ${id})`);
console.log(key);
