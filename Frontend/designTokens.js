// Semantic design tokens for React Native, aligned with generated design-tokens.css (source of truth).
// Do not use primitive palette values directly in UI components.

export const colors = {
  primary: '#012624',
  onPrimary: '#ffffff',
  primaryContainer: '#cdfefb',
  onPrimaryContainer: '#04958d',

  secondary: '#05c7bc',
  onSecondary: '#ffffff',
  secondaryContainer: '#cdfefb',
  onSecondaryContainer: '#04958d',

  tertiary: '#00ccc0',
  onTertiary: '#ffffff',
  tertiaryContainer: '#ccfffc',
  onTertiaryContainer: '#009990',

  neutral: '#1e1e1e',
  onNeutral: '#ffffff',
  neutralContainer: '#e6e6e6',
  onNeutralContainer: '#4d4d4d',

  neutralVariant: '#444444',
  onNeutralVariant: '#ffffff',
  neutralVariantContainer: '#e6e6e6',
  onNeutralVariantContainer: '#4d4d4d',

  error: '#bf0d10',
  onError: '#ffffff',
  errorContainer: '#fccfd0',
  onErrorContainer: '#8f0a0c',

  info: '#0d2bbf',
  onInfo: '#ffffff',
  infoContainer: '#cfd7fc',
  onInfoContainer: '#0a208f',

  warning: '#bf7e0d',
  onWarning: '#ffffff',
  warningContainer: '#fcebcf',
  onWarningContainer: '#8f5e0a',

  success: '#06c647',
  onSuccess: '#ffffff',
  successContainer: '#cefdde',
  onSuccessContainer: '#059435',

  surface: '#fafafa',
  onSurface: '#1a1a1a',
  surfaceVariant: '#e6e6e6', // --color-surface-varaint (generated spelling)
  onSurfaceVariant: '#4d4d4d', // --color-on-surface-varaint
  surfaceContainerHighest: '#e6e6e6',
  surfaceContainerHigh: '#e6e6e6',
  surfaceContainer: '#f2f2f2',
  surfaceContainerLow: '#fafafa',
  surfaceContainerLowest: '#ffffff',
  inverseSurface: '#333333',
  inverseOnSurface: '#f2f2f2',
};

export const spacing = {
  none: 0, // --spacing-no-spacing
  extremelySmall: 2, // --spacing-extremely-small-spacing
  extraExtraSmall: 4, // --spacing-extra-extra-samll-spacing (generated spelling)
  extraSmall: 8, // --spacing-extra-small-spacing
  medium: 12, // --spacing-medium-spacing
  base: 16, // --spacing-base-spacing
  smallLarge: 20, // --spacing-small-large-spacing
  large: 24, // --spacing-large-spacing
  extraLarge: 32, // --spacing-extra-large-spacing
  extraExtraLarge: 40, // --spacing-extra-extra-large-spacing
  veryLarge: 48, // --spacing-very-large-spacing
  extremelyLarge: 64, // --spacing-extremely-large-spacing
};

export const typography = {
  displaySmall: { fontFamily: 'Lora', fontSize: 32, fontWeight: '600', lineHeight: 48, letterSpacing: -2 },
  headlineLarge: { fontFamily: 'DM Sans', fontSize: 32, fontWeight: '500', lineHeight: 48, letterSpacing: -1.55 },
  headlineSmall: { fontFamily: 'DM Sans', fontSize: 24, fontWeight: '500', lineHeight: 36, letterSpacing: -1 },
  titleLarge: { fontFamily: 'DM Sans', fontSize: 22, fontWeight: '500', lineHeight: 33, letterSpacing: -1 },
  titleMedium: { fontFamily: 'DM Sans', fontSize: 16, fontWeight: '600', lineHeight: 24, letterSpacing: -0.85 },
  bodyLarge: { fontFamily: 'DM Sans', fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: -0.85 },
  bodyMedium: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: '500', lineHeight: 21, letterSpacing: -0.75 },
  bodySmall: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: '500', lineHeight: 20, letterSpacing: -0.75 },
  labelLarge: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: '400', lineHeight: 21, letterSpacing: -0.9 },
  labelMedium: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: '400', lineHeight: 20, letterSpacing: -0.75 },
  labelSmall: { fontFamily: 'DM Sans', fontSize: 11, fontWeight: '500', lineHeight: 19, letterSpacing: -0.8 },
};

export const effects = {
  // Approximations of design-tokens shadows for React Native
  softShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
  mediumShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  hardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 8,
  },
};
