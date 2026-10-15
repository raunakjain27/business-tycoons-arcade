/*
  Cornerstone Design System
  Unified theming, color palette, typography, spacing, shadows,
  and a real CSS keyframe sheet so animation names are defined once.
*/

export const DESIGN_SYSTEM = {
  colors: {
    darkest: '#0f0e17',
    dark: '#1a1a2e',
    darker: '#16213e',
    darkCard: '#1e293b',
    darkCardHover: '#334155',
    muted: '#64748b',
    mutedSoft: '#94a3b8',
    light: '#f8fafc',
    primary: '#e94560',
    primaryLight: '#f47267',
    secondary: '#2a9d8f',
    secondaryLight: '#5fbfc9',
    accent: '#f6ad55',
    accentLight: '#ffd8a8',
    success: '#2a9d8f',
    successLight: '#5fbfc9',
    warning: '#eab308',
    warningLight: '#f6e05e',
    info: '#38bdf8',
    infoLight: '#67e8f9',
    caution: '#ef4444',
    cautionLight: '#f87171',
    purple: '#a855f7',
    purpleLight: '#c084fc',
    boardIndia: '#8b4513',
    boardUSA: '#003366',
    boardUK: '#3b0f0f',
    boardUae: '#0055a4',
    boardMixed: '#3b2f2f',
  },

  typography: {
    headingH1: '32px',
    headingH2: '24px',
    headingH3: '20px',
    headingH4: '18px',
    bodyLg: '15px',
    bodyMd: '14px',
    bodySm: '13px',
    bodyXs: '12px',
    caption: '11px',
    fontWeightLight: 300,
    fontWeightNormal: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    fontWeightBlack: 900,
    fontFamily:
      "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
  },

  shadows: {
    sm: '0 2px 6px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 12px 30px rgba(0,0,0,0.5)',
    card: '0 4px 14px rgba(0,0,0,0.3)',
    glow: '0 0 20px rgba(0,0,0,0.4)',
    inner: 'inset 0 2px 4px rgba(0,0,0,0.2)',
  },

  transitions: {
    fastest: '150ms ease',
    fast: '200ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },

  // These animation names are defined in designAnimations.css, bundled once.
  keyframes: {
    fadeInUp: 'fadeInUp 0.4s ease-out forwards',
    fadeIn: 'fadeIn 0.25s ease-out forwards',
    pulse: 'pulse 2s ease infinite',
    pulseFast: 'pulseFast 1s ease infinite',
    bounce: 'bounce 0.5s ease',
    shimmer: 'shimmer 2.4s infinite linear',
    pop: 'pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    slideUp: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
} as const;

export type DesignColorKey = keyof typeof DESIGN_SYSTEM.colors;
export type DesignKeyframeName = keyof typeof DESIGN_SYSTEM.keyframes;
