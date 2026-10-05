import { describe, it, expect } from 'vitest';
import { defaultPrivateKeyPath } from '../key-file';

describe('defaultPrivateKeyPath', () => {
  it('uses ~/.wonos-license, unless the key is still only in the folder from before the rename', () => {
    const at = (...paths: string[]) => (path: string): boolean => paths.includes(path);
    expect(defaultPrivateKeyPath('/home/me', at())).toBe('/home/me/.wonos-license/private.pem');
    expect(defaultPrivateKeyPath('/home/me', at('/home/me/.working-notes-license/private.pem'))).toBe('/home/me/.working-notes-license/private.pem');
    expect(defaultPrivateKeyPath('/home/me', at('/home/me/.wonos-license/private.pem', '/home/me/.working-notes-license/private.pem'))).toBe('/home/me/.wonos-license/private.pem');
  });
});
