import { describe, it, expect } from 'vitest';
import { mergePageProperties } from '../operations';

describe('mergePageProperties', () => {
  it('replaces patched values and removes keys set to null', () => {
    expect(mergePageProperties('SOFTWARE', { vendor: 'Acme', seats: 10 }, { seats: 12, vendor: null })).toEqual({ seats: 12 });
  });

  it('drops current values the kind does not have after a kind change', () => {
    expect(mergePageProperties('PRODUCT', { vendor: 'Acme', url: 'https://acme.test' }, undefined)).toEqual({ url: 'https://acme.test' });
  });

  it('keeps unknown keys from the patch so validation can name them', () => {
    expect(mergePageProperties('PRODUCT', {}, { vendor: 'Acme' })).toEqual({ vendor: 'Acme' });
  });
});
