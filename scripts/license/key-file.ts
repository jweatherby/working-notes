// Pure: the source of src/shared/license/public-key.ts for a public key.

export const publicKeyModule = (publicKeyPem: string): string => [
  '// The public half of the Wonos Pro signing key, made by `bun run license:keygen`.',
  '// It only checks license keys; issuing one needs the private half, which is never in this repo.',
  '',
  `export const LICENSE_PUBLIC_KEY = ${JSON.stringify(publicKeyPem.trim() + '\n')};`,
  ''
].join('\n');

/**
 * Pure. Where the private key is by default: ~/.wonos-license/private.pem, or the
 * folder from before the rename to Wonos while the key is still only there.
 */
export const defaultPrivateKeyPath = (home: string, exists: (path: string) => boolean): string => {
  const current = `${home}/.wonos-license/private.pem`;
  const legacy = `${home}/.working-notes-license/private.pem`;
  return !exists(current) && exists(legacy) ? legacy : current;
};
