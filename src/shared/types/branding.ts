export interface ChartBranding {
  readonly primaryColor?: string;
  readonly primaryFontColor?: string;
  readonly accentColor?: string;
  readonly accentFontColor?: string;
}

const DEFAULT_COLOR = '#4f46e5';

const hexToRgb = (hex: string): string => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)].join(', ');
};

export const chartColors = (branding?: ChartBranding | null): {
  readonly fill: string;
  readonly border: string;
  readonly solid: string;
} => {
  const base = branding?.accentColor ?? DEFAULT_COLOR;
  const rgb = hexToRgb(base);
  return {
    fill: `rgba(${rgb}, 0.7)`,
    border: branding?.accentFontColor ?? `rgba(${rgb}, 1)`,
    solid: `rgba(${rgb}, 1)`,
  };
};
