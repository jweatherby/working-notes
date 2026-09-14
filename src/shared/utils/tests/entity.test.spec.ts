import { describe, it, expect } from 'vitest';
import { acceptsDocs } from '../entity';

describe('acceptsDocs', () => {
  it('refuses docs on wiki pages only', () => {
    expect(acceptsDocs('PAGE')).toBe(false);
    expect(acceptsDocs('PERSON')).toBe(true);
    expect(acceptsDocs('PROJECT')).toBe(true);
  });
});
