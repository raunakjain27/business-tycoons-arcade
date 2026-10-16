import { getApiBaseUrl } from './userStore';

export interface TelemetryReport {
  type: 'error' | 'performance' | 'disconnect';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

export function reportTelemetry(report: Omit<TelemetryReport, 'timestamp'>): void {
  try {
    const payload: TelemetryReport = {
      ...report,
      timestamp: Date.now(),
    };

    // Use sendBeacon for non-blocking deliverability on unload or fetch
    const url = `${getApiBaseUrl()}/api/telemetry`;
    const data = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, data);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    // Fail silently in telemetry
  }
}

// Global unhandled error listener
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    reportTelemetry({
      type: 'error',
      message: event.message || 'Script error',
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportTelemetry({
      type: 'error',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      context: { unhandledRejection: true },
    });
  });
}
