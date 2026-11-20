// Design tokens — single source of truth for the redesigned UI.
// White-label values live in ./brand.ts; this file derives every other
// token from them. Screens must import from here, never hardcode colours.
import { brand } from './brand';

export const theme = {
  primary: brand.primaryColor,
  primaryDark: brand.primaryDark,
  primarySoft: '#eef2ff',
  primarySoftText: brand.primaryColor,
  accent: brand.accentColor,
  accentSoft: '#fef3c7',
  accentSoftText: '#92400e',
  background: brand.background,
  surface: brand.surface,
  surfaceMuted: '#f1f5f9',
  text: brand.text,
  muted: brand.muted,
  border: brand.border,
  success: brand.success,
  successSoft: '#dcfce7',
  successSoftText: '#166534',
  danger: brand.danger,
  dangerSoft: '#fee2e2',
  white: '#ffffff',
  // Tab bar / header
  tabInactive: '#94a3b8',
  // Soft shadow (iOS) — keep subtle
  shadow: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const radius = {
  card: 16,
  button: 12,
  input: 12,
  tile: 12,
  banner: 12,
  pill: 999,
} as const;

export const spacing = {
  screen: 20,
  card: 16,
  gap: 12,
  section: 24,
} as const;

// Typography scale (system font). lineHeight included where it matters.
export const type = {
  display: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  section: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },
  heading: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '700' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: '700' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  price: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
} as const;

export const motion = {
  pressScale: 0.97,
  pressDuration: 150,
  fadeDuration: 250,
  staggerStep: 40,
  maxStagger: 8,
} as const;

export { brand };
