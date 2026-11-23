import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import type { BeforeInstallPromptEvent } from './hooks/usePWAInstall.ts';
import './index.css';

// Capture beforeinstallprompt early so it is never missed before React mounts
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  window.__fmbDeferredInstallPrompt = e as BeforeInstallPromptEvent;
});

// Register PWA Service Worker with automatic background updates
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
