import type { PageKind } from '$shared/types/enums';
import type { PageKindField, PagePropertyValue } from '$shared/types/pages';

export const PAGE_KIND_LABELS: Readonly<Record<PageKind, string>> = {
  GENERAL: 'Page',
  POLICY: 'Policy',
  PRODUCT: 'Product',
  SOFTWARE: 'Software',
  DECISION: 'Decision'
};

/** `SUPERSEDED` → `Superseded`. */
export const optionLabel = (option: string): string =>
  option.charAt(0) + option.slice(1).toLowerCase().replace(/_/g, ' ');

export const formatPropertyValue = (field: PageKindField, value: PagePropertyValue): string => {
  if (field.input === 'select') return optionLabel(String(value));
  if (field.input === 'number' && typeof value === 'number') return value.toLocaleString();
  return String(value);
};
