import { describe, it, expect } from 'vitest';
import { PAGE_KINDS } from '../enums';
import { PAGE_KIND_FIELDS, parsePageProperties, readPageProperties } from '../pages';

describe('parsePageProperties', () => {
  it('accepts valid properties for the kind', () => {
    const result = parsePageProperties('SOFTWARE', {
      vendor: 'Acme',
      url: 'https://acme.test',
      annualCost: 1200,
      renewalDate: '2027-01-31'
    });
    expect(result.ok && result.value).toEqual({ vendor: 'Acme', url: 'https://acme.test', annualCost: 1200, renewalDate: '2027-01-31' });
  });

  it('accepts the properties as JSON', () => {
    expect(parsePageProperties('POLICY', '{"status":"ACTIVE","version":"2"}').ok).toBe(true);
  });

  it('rejects keys the kind does not have and lists the allowed ones', () => {
    const result = parsePageProperties('POLICY', { vendor: 'Acme' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'vendor'");
    expect(result.error.message).toContain('allowed keys: status, version, effectiveDate, reviewDate');
  });

  it('names each bad value', () => {
    const result = parsePageProperties('SOFTWARE', { seats: 'ten', renewalDate: 'next year' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('seats');
    expect(result.error.message).toContain('renewalDate must be a date like 2026-09-13');
  });

  it('rejects an option the select does not offer', () => {
    expect(parsePageProperties('DECISION', { status: 'LIVE' }).ok).toBe(false);
  });

  it('gives GENERAL pages no properties', () => {
    const result = parsePageProperties('GENERAL', { owner: 'x' });
    expect(!result.ok && result.error.message).toContain('this kind has no properties');
  });

  it('declares options for every select field', () => {
    for (const kind of PAGE_KINDS) {
      for (const field of PAGE_KIND_FIELDS[kind]) {
        if (field.input === 'select') expect(field.options?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('readPageProperties', () => {
  it('reads unreadable or non-object JSON as no properties', () => {
    expect(readPageProperties('not json')).toEqual({});
    expect(readPageProperties('[1,2]')).toEqual({});
    expect(readPageProperties('{"vendor":"Acme"}')).toEqual({ vendor: 'Acme' });
  });
});
