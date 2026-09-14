import { describe, it, expect } from 'vitest';
import { acceptsDocs, parseTypedIdValue, typedIdValue } from '../entity';

describe('acceptsDocs', () => {
  it('refuses docs on wiki pages only', () => {
    expect(acceptsDocs('PAGE')).toBe(false);
    expect(acceptsDocs('PERSON')).toBe(true);
    expect(acceptsDocs('PROJECT')).toBe(true);
  });
});

describe('parseTypedIdValue', () => {
  it('reads back a typed id of an allowed type', () => {
    expect(parseTypedIdValue(typedIdValue('TEAM', 'abc'), ['TEAM', 'PERSON'])).toEqual({ type: 'TEAM', id: 'abc' });
  });

  it('refuses a malformed value or a type that is not allowed', () => {
    expect(parseTypedIdValue('TEAM:', ['TEAM'])).toBeNull();
    expect(parseTypedIdValue(':abc', ['TEAM'])).toBeNull();
    expect(parseTypedIdValue('abc', ['TEAM'])).toBeNull();
    expect(parseTypedIdValue('PAGE:abc', ['TEAM'])).toBeNull();
  });
});
