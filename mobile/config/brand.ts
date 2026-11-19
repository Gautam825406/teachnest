// White-label branding — THE ONLY file to change when rebranding the app
// (plus `name` / `slug` in app.json). Every screen reads branding from here;
// no screen hardcodes the institute name, colours or org code.
export const brand = {
  appName: 'TeachNest',
  instituteName: 'Demo Academy',
  orgCode: 'DEMO0001',
  tagline: 'Learn. Practice. Achieve.',
  logoText: 'Demo Academy',
  primaryColor: '#312e81', // deep indigo
  primaryDark: '#1e1b4b',
  accentColor: '#f59e0b', // amber
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  success: '#16a34a',
  danger: '#dc2626',
} as const;

export type Brand = typeof brand;
