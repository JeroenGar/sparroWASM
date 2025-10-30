import { useState, useEffect } from "react";
import { waitForCrossOriginIsolation, getBrowserInfo, forceServiceWorkerReload } from "../utils/crossOriginIsolation";

interface IsolationCheckProps {
  onReady: () => void;
  children: React.ReactNode;
}

/**
 * Component that checks for cross-origin isolation before rendering children
 * Particularly important for Android browsers where service worker activation can be delayed
 */
function IsolationCheck({ onReady, children }: IsolationCheckProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkIsolation = async () => {
      setStatus('checking');
      
      // Wait for cross-origin isolation to be established
      // On Android, this can take longer than on desktop
      const result = await waitForCrossOriginIsolation(10000, 200);
      
      const browserInfo = getBrowserInfo();
      
      setDebugInfo(
        `Browser: ${browserInfo.isAndroid ? 'Android' : 'Desktop'} ` +
        `(${browserInfo.isChrome ? 'Chrome' : browserInfo.isFirefox ? 'Firefox' : browserInfo.isSafari ? 'Safari' : 'Other'})\n` +
        `Secure Context: ${browserInfo.isSecureContext}\n` +
        `Service Worker: ${browserInfo.hasServiceWorker}\n` +
        `Cross-Origin Isolated: ${browserInfo.crossOriginIsolated}\n` +
        `SharedArrayBuffer: ${browserInfo.hasSharedArrayBuffer}`
      );
      
      if (result.isIsolated && result.hasSharedArrayBuffer) {
        setStatus('ready');
        onReady();
      } else {
        setStatus('error');
        setErrorMessage(
          result.error || 'Failed to establish cross-origin isolation.\n\n' +
          'This is required for multithreading support. ' +
          (browserInfo.isAndroid ? 
            'On Android, this sometimes requires a page refresh to activate the service worker properly.' :
            'Please ensure the page is served over HTTPS with proper COOP/COEP headers.')
        );
      }
    };

    checkIsolation();
  }, [onReady, retryCount]);

  if (status === 'checking') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
        <h3>Initializing multithreading support...</h3>
        <p style={{ color: '#666', maxWidth: '500px' }}>
          Setting up cross-origin isolation for SharedArrayBuffer.
          {debugInfo && (
            <>
              <br />
              <small>This may take a moment on mobile devices.</small>
            </>
          )}
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          maxWidth: '600px', 
          padding: '30px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#856404' }}>⚠️ Initialization Error</h2>
          <p style={{ whiteSpace: 'pre-line', color: '#856404' }}>{errorMessage}</p>
          
          {debugInfo && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Technical Details
              </summary>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {debugInfo}
              </pre>
            </details>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => forceServiceWorkerReload()}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Page
          </button>
          
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔁 Retry
          </button>
        </div>
        
        <p style={{ marginTop: '20px', color: '#666', fontSize: '14px', maxWidth: '500px' }}>
          <strong>Tip:</strong> On Android devices, refreshing the page usually resolves this issue
          by properly activating the service worker.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default IsolationCheck;
