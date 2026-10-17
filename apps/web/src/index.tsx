import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './main';
import { GameErrorBoundary } from './components/GameErrorBoundary';
import { initPostHog } from './posthog';

// Initialize PostHog analytics & session recording
initPostHog();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element with id "root"');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GameErrorBoundary>
      <App />
    </GameErrorBoundary>
  </React.StrictMode>
);