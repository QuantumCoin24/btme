export const colors = {
  background: '#050505',
  surface: '#101010',
  surfaceElevated: '#171717',

  textPrimary: '#FFFFFF',
  textSecondary: '#A7A7A7',
  textMuted: '#707070',

  accent: '#FF315C',
  accentPressed: '#E82850',

  border: '#252525',

  success: '#54D68B',
  warning: '#FFCB66',
  danger: '#FF4D67',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 72,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '700' as const,
    letterSpacing: -1.8,
  },

  title: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '700' as const,
    letterSpacing: -1.2,
  },

  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },

  body: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '400' as const,
  },

  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700' as const,
  },

  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 2.4,
  },
} as const;
