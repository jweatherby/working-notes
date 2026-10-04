// Pure: the source of src/shared/license/public-key.ts for a public key.

export const publicKeyModule = (publicKeyPem: string): string => [
  '// The public half of the Working Notes Pro signing key, made by `bun run license:keygen`.',
  '// It only checks license keys; issuing one needs the private half, which is never in this repo.',
  '',
  `export const LICENSE_PUBLIC_KEY = ${JSON.stringify(publicKeyPem.trim() + '\n')};`,
  ''
].join('\n');
