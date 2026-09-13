// Wiki pages: one entity with a `kind`, a page tree, markdown content and
// kind-specific properties. The property fields per kind are declared once in
// PAGE_KIND_FIELDS; the Zod schemas are derived from them, so the form and the
// validation can't disagree. Shared by the server (validation) and the client
// (PageForm, the properties table).

import { z } from 'zod';
import { ok, err, type Result } from '$shared/utils';
import type { PageKind } from './enums';

export type PagePropertyValue = string | number;

export type PageProperties = Readonly<Record<string, PagePropertyValue>>;

export interface PageKindField {
  readonly key: string;
  readonly label: string;
  readonly input: 'text' | 'date' | 'number' | 'url' | 'select';
  readonly options?: readonly [string, ...string[]];
}

export const PAGE_KIND_FIELDS: Readonly<Record<PageKind, readonly PageKindField[]>> = {
  GENERAL: [],
  POLICY: [
    { key: 'status', label: 'Status', input: 'select', options: ['DRAFT', 'ACTIVE', 'RETIRED'] },
    { key: 'version', label: 'Version', input: 'text' },
    { key: 'effectiveDate', label: 'Effective', input: 'date' },
    { key: 'reviewDate', label: 'Review by', input: 'date' }
  ],
  PRODUCT: [
    { key: 'status', label: 'Status', input: 'select', options: ['IDEA', 'BUILDING', 'LIVE', 'SUNSET'] },
    { key: 'url', label: 'URL', input: 'url' }
  ],
  SOFTWARE: [
    { key: 'vendor', label: 'Vendor', input: 'text' },
    { key: 'url', label: 'URL', input: 'url' },
    { key: 'annualCost', label: 'Annual cost', input: 'number' },
    { key: 'currency', label: 'Currency', input: 'text' },
    { key: 'renewalDate', label: 'Renews', input: 'date' },
    { key: 'seats', label: 'Seats', input: 'number' }
  ],
  DECISION: [
    { key: 'status', label: 'Status', input: 'select', options: ['PROPOSED', 'ACCEPTED', 'SUPERSEDED', 'REJECTED'] },
    { key: 'decidedOn', label: 'Decided on', input: 'date' }
  ]
};

export interface PageSummary {
  readonly id: string;
  readonly title: string;
  readonly kind: PageKind;
  readonly parentId: string | null;
  readonly properties: PageProperties;
  readonly path: string;
  readonly archivedAt: Date | null;
  readonly updatedAt: Date;
}

export interface PageLink {
  readonly id: string;
  readonly title: string;
  readonly kind: PageKind;
  readonly path: string;
}

export interface PageDetail extends PageSummary {
  readonly content: string;
  readonly parent: { readonly id: string; readonly title: string } | null;
  readonly children: readonly PageLink[];
  readonly createdAt: Date;
}

const fieldSchema = (field: PageKindField): z.ZodTypeAny => {
  switch (field.input) {
    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date like 2026-09-13');
    case 'url':
      return z.string().url().max(2000);
    case 'number':
      return z.number().min(0);
    case 'select':
      return z.enum(field.options ?? ['']);
    default:
      return z.string().min(1).max(200);
  }
};

const schemaFor = (kind: PageKind): z.ZodTypeAny =>
  z.object(Object.fromEntries(PAGE_KIND_FIELDS[kind].map((field) => [field.key, fieldSchema(field).optional()]))).strict();

/** Validates properties (an object or its JSON) against the kind; errors name the field and the allowed keys. */
export const parsePageProperties = (kind: PageKind, input: unknown): Result<PageProperties> => {
  let value = input ?? {};
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value || '{}');
    } catch (e) {
      return err(new Error(`properties: invalid JSON (${e instanceof Error ? e.message : String(e)})`));
    }
  }
  const parsed = schemaFor(kind).safeParse(value);
  if (parsed.success) return ok(parsed.data as PageProperties);

  const allowed = PAGE_KIND_FIELDS[kind].map((field) => field.key);
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'properties'} ${issue.message}`).join('; ');
  const hint = allowed.length > 0 ? `allowed keys: ${allowed.join(', ')}` : 'this kind has no properties';
  return err(new Error(`properties for a ${kind} page: ${issues} (${hint})`));
};

/** Properties as stored. Unreadable JSON (never written by the app) reads as none. */
export const readPageProperties = (raw: string): PageProperties => {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as PageProperties) : {};
  } catch {
    return {};
  }
};
