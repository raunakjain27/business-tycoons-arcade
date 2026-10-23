/**
 * PostHog analytics wrapper for Cornerstone.
 *
 * Environment:
 * - VITE_BUILD_MODE is a custom variable used to gate client-side analytics
 *   and avoid tracking events during automated smoke tests / CI.
 */
import posthogLib, { type PostHog } from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const isTrackingEnabled = (import.meta.env.VITE_BUILD_MODE as string | undefined) !== 'test';

// Singleton PostHog instance
let posthog: PostHog | null = null;

/**
 * Initialize PostHog with the configured API key and host.
 */
export function initPostHog(key?: string, host?: string, debug = false): PostHog {
  if (posthog) {
    return posthog;
  }
  posthog = posthogLib;
  if (key) {
    posthog.init(key, {
      api_host: host || 'https://app.posthog.com',
      debug,
      capture_pageview: false,
      capture_outgoing_links: false,
    });
  }
  return posthog;
}

export function isPostHogReady(): boolean {
  return posthog != null;
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (posthog && isTrackingEnabled) {
    posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (posthog && isTrackingEnabled) {
    posthog.identify(userId, properties);
  }
}

export async function getFeatureFlag(
  flagKey: string,
  userDistinctId: string
): Promise<unknown> {
  if (posthog && isTrackingEnabled) {
    return posthog.featureFlags.get(flagKey, userDistinctId);
  }
  return undefined;
}

export function setFeatureFlagCallback(
  callback: (flags: Record<string, unknown>) => void
): void {
  // no-op: feature flags are fetched on demand.
}

export function onFeatureFlagChange(
  callback: (flags: Record<string, unknown>) => void
): void {
  // no-op: feature flags are fetched on demand.
}

export type PostHogFeatureFlags = Record<string, unknown>;

const trackEvent = captureEvent;
export { trackEvent };
