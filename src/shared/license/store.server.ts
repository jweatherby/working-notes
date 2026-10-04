// The license key on this computer: <data dir>/license.json, shared by every notebook,
// the app, the CLI and the MCP server. Read on each check, so a key added in one
// process counts in the others straight away.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { settings } from '../settings/server/index.server';
import { licensePath } from '../settings/server/paths';
import { NO_LICENSE, type LicenseStatus } from '../types/license';
import { ok, err, type Result } from '../utils/result';
import { verifyLicenseKey } from './verify.server';

interface LicenseFile {
  readonly key: string;
}

const readKey = async (): Promise<string | null> => {
  const text = await readFile(licensePath(settings), 'utf8').catch(() => null);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Partial<LicenseFile>;
    return typeof parsed.key === 'string' ? parsed.key : '';
  } catch {
    return '';
  }
};

/** The license on this computer, checked now. */
export const currentLicense = async (now: Date = new Date(), publicKey: string = settings.licensePublicKey): Promise<LicenseStatus> => {
  const key = await readKey();
  if (key === null) return NO_LICENSE;
  return verifyLicenseKey(key, publicKey, now);
};

/** Saves a key after checking it. Refuses an invalid or expired one, and leaves the current one in place. */
export const activateLicense = async (key: string, now: Date = new Date(), publicKey: string = settings.licensePublicKey): Promise<Result<LicenseStatus>> => {
  const status = verifyLicenseKey(key, publicKey, now);
  if (status.state === 'invalid') return err(new Error(`That license key isn't valid: ${status.problem}.`));
  if (status.state === 'expired') return err(new Error(`That license key expired on ${status.expires}. Use the renewed key.`));
  const path = licensePath(settings);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ key: key.trim() } satisfies LicenseFile, null, 2)}\n`, { mode: 0o600 });
  return ok(status);
};

export const removeLicense = async (): Promise<Result<LicenseStatus>> => {
  await rm(licensePath(settings), { force: true });
  return ok(NO_LICENSE);
};
