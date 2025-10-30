/**
 * Utility functions to check and handle cross-origin isolation status
 * Required for SharedArrayBuffer support
 */

export interface IsolationStatus {
  isIsolated: boolean;
  hasSharedArrayBuffer: boolean;
  error?: string;
}

/**
 * Check if the page is properly cross-origin isolated
 */
export function checkCrossOriginIsolation(): IsolationStatus {
  const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  let error: string | undefined;

  if (!isIsolated) {
    error = 'Page is not cross-origin isolated. COOP/COEP headers may not be set correctly.';
  } else if (!hasSharedArrayBuffer) {
    error = 'SharedArrayBuffer is not available despite cross-origin isolation.';
  }

  return {
    isIsolated,
    hasSharedArrayBuffer,
    error,
  };
}

/**
 * Wait for cross-origin isolation to be established
 * This is particularly important on Android where service worker activation can be delayed
 */
export async function waitForCrossOriginIsolation(
  maxWaitMs: number = 5000,
  checkIntervalMs: number = 100
): Promise<IsolationStatus> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkStatus = () => {
      const status = checkCrossOriginIsolation();

      if (status.isIsolated && status.hasSharedArrayBuffer) {
        resolve(status);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        resolve({
          ...status,
          error: status.error || `Timeout waiting for cross-origin isolation after ${maxWaitMs}ms`,
        });
        return;
      }

      setTimeout(checkStatus, checkIntervalMs);
    };

    checkStatus();
  });
}

/**
 * Get detailed browser and environment information for debugging
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
  
  return {
    userAgent: ua,
    isAndroid,
    isChrome,
    isFirefox,
    isSafari,
    isSecureContext: window.isSecureContext,
    hasServiceWorker: 'serviceWorker' in navigator,
    crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  };
}

/**
 * Force a page reload to re-register the service worker
 * Useful when the service worker fails to activate properly
 */
export function forceServiceWorkerReload() {
  // Clear any cached service worker state
  window.sessionStorage.removeItem('coiReloadedBySelf');
  window.sessionStorage.removeItem('coiCoepHasFailed');
  
  // Force reload
  window.location.reload();
}
