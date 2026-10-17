import posthog from 'posthog-js';

// Environment variables or global window fallback
const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ||
  (typeof window !== 'undefined' ? (window as any).__POSTHOG_KEY__ : '') ||
  '';

const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

let isInitialized = false;

/**
 * Safely initialize PostHog analytics and session recordings.
 * If VITE_POSTHOG_KEY is not configured yet, it stands by safely without errors.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined' || isInitialized) return;

  if (!POSTHOG_KEY) {
    console.info('ℹ️ PostHog: VITE_POSTHOG_KEY not set. Analytics in offline/standby mode.');
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      session_recording: {
        maskAllInputs: false,
      },
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          console.log('⚡ PostHog loaded and active:', ph);
        }
      },
    });
    isInitialized = true;
  } catch (err) {
    console.warn('[PostHog Init Warning]', err);
  }
}

/**
 * Identify a user in PostHog when they set their nickname, avatar, level, or VIP status.
 */
export function identifyUser(userId: string, properties?: Record<string, any>): void {
  if (!isInitialized) return;
  try {
    posthog.identify(userId, properties);
  } catch (err) {
    console.warn('[PostHog Identify Warning]', err);
  }
}

/**
 * Capture a custom game event (e.g. game_started, roll_dice, trade_completed, game_won).
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (!isInitialized) {
    if (import.meta.env.DEV) {
      console.debug(`[PostHog Track (Standby)] ${eventName}`, properties);
    }
    return;
  }
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.warn('[PostHog Capture Warning]', err);
  }
}

/**
 * Reset PostHog identity on session clear.
 */
export function resetPostHogUser(): void {
  if (!isInitialized) return;
  try {
    posthog.reset();
  } catch (err) {}
}

export { posthog };
