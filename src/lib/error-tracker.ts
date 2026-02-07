/**
 * ULTRA ERROR TRACKER v3.0
 * Menangkap dan menampilkan SEMUA error di console dengan format yang jelas
 * Tanpa error sama sekali - 100% sempurna
 */

// ============================================
// KONFIGURASI
// ============================================
const COLORS = {
  error: '#ff4444',
  warn: '#ffaa00',
  info: '#00aaff',
  success: '#00ff88',
  debug: '#aa00ff',
  gray: '#888888',
};

// ============================================
// UTILITIES
// ============================================
const getTimestamp = () => new Date().toLocaleTimeString('id-ID');
const style = (color: string) => `color: ${color}; font-weight: bold;`;

// ============================================
// ERROR DISPLAY ULTRA
// ============================================
export const showErrorBox = (
  title: string, 
  details: Record<string, string | number | boolean | undefined>,
  type: 'error' | 'warn' | 'info' | 'success' = 'error'
) => {
  const color = type === 'error' ? COLORS.error : 
                type === 'warn' ? COLORS.warn : 
                type === 'info' ? COLORS.info : COLORS.success;
  const icon = type === 'error' ? '❌' : 
               type === 'warn' ? '⚠️' : 
               type === 'info' ? 'ℹ️' : '✅';
  
  console.log('');
  console.log(`%c┌─────────────────────────────────────────────────────────────┐`, `color: ${color}; font-weight: bold;`);
  console.log(`%c│ ${icon} ${title.substring(0, 55).padEnd(55)} │`, `color: ${color}; font-weight: bold; font-size: 14px;`);
  console.log(`%c├─────────────────────────────────────────────────────────────┤`, `color: ${color}; font-weight: bold;`);
  
  Object.entries(details).forEach(([key, value]) => {
    const line = `${key}: ${String(value).substring(0, 45)}`;
    console.log(`%c│ ${line.padEnd(59)} │`, `color: ${color};`);
  });
  
  console.log(`%c└─────────────────────────────────────────────────────────────┘`, `color: ${color}; font-weight: bold;`);
  console.log(`%c⏰ ${getTimestamp()}`, `color: ${COLORS.gray}; font-size: 10px;`);
  console.log('');
};

// ============================================
// GLOBAL ERROR HANDLERS
// ============================================
export const initGlobalErrorHandlers = () => {
  // 1. window.onerror - Tangkap semua JS errors
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    showErrorBox('🚨 JAVASCRIPT ERROR', {
      'Pesan': String(message),
      'File': source || 'unknown',
      'Baris': lineno,
      'Kolom': colno,
      'Error': error?.name || 'Unknown',
    }, 'error');
    
    console.error('[ULTRA ERROR] Runtime Error:', { message, source, lineno, colno, error, time: getTimestamp() });
    
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 2. Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isError = reason instanceof Error;
    
    showErrorBox('🚨 PROMISE REJECTION (Async)', {
      'Tipe': isError ? reason.name : typeof reason,
      'Pesan': isError ? reason.message : String(reason),
      'Stack': isError ? (reason.stack?.split('\n')[1]?.trim() || 'N/A') : 'N/A',
    }, 'error');
    
    console.error('[ULTRA ERROR] Promise Rejection:', { reason, time: getTimestamp() });
  });

  // 3. Resource Loading Errors (IMG, SCRIPT, LINK, etc)
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    if (!target) return;
    
    const tagName = target.tagName;
    if (tagName === 'IMG' || tagName === 'SCRIPT' || tagName === 'LINK' || tagName === 'VIDEO' || tagName === 'AUDIO') {
      const src = (target as any).src || (target as any).href || 'unknown';
      
      showErrorBox('📦 RESOURCE GAGAL DIMUAT', {
        'Element': tagName,
        'Source': src.substring(0, 40) + '...',
        'Path': window.location.pathname,
      }, 'warn');
      
      console.error('[ULTRA ERROR] Resource Load Failed:', { tagName, src, element: target });
    }
  }, true);

  // 4. Network/Fetch Monitoring
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    const method = options?.method || 'GET';
    
    try {
      const response = await originalFetch(...args);
      
      if (!response.ok) {
        showErrorBox('🌐 HTTP ERROR', {
          'Status': `${response.status} ${response.statusText}`,
          'URL': urlStr.substring(0, 35) + '...',
          'Method': method,
        }, 'error');
        
        console.error('[ULTRA ERROR] HTTP Error:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: urlStr, 
          method 
        });
      }
      
      return response;
    } catch (error) {
      showErrorBox('🌐 NETWORK ERROR', {
        'Error': error instanceof Error ? error.message : 'Network Failed',
        'URL': urlStr.substring(0, 35) + '...',
        'Method': method,
        'CORS': 'Mungkin terblokir CORS',
      }, 'error');
      
      console.error('[ULTRA ERROR] Network Fetch Failed:', { error, url: urlStr, method });
      throw error;
    }
  };

  // 5. WebSocket Error Monitoring
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = class extends OriginalWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const urlStr = url.toString();
      super(url, protocols);
      
      this.addEventListener('error', () => {
        showErrorBox('🔌 WEBSOCKET ERROR', {
          'URL': urlStr.substring(0, 40) + '...',
          'Status': 'Koneksi gagal',
          'Solusi': 'Periksa server/backend',
        }, 'warn');
      });
      
      this.addEventListener('close', (event) => {
        if (!event.wasClean) {
          console.warn('[ULTRA ERROR] WebSocket closed unexpectedly:', { 
            url: urlStr, 
            code: event.code, 
            reason: event.reason 
          });
        }
      });
    }
  };

  // 6. Console Error Override (untuk menangkap error dari library)
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    
    const msg = args.join(' ');
    const isImportant = 
      msg.includes('PAKASIR') || 
      msg.includes('Firebase') || 
      msg.includes('React') ||
      msg.includes('payment') ||
      msg.includes('auth') ||
      msg.includes('failed') ||
      msg.includes('NetworkError') ||
      msg.includes('404') ||
      msg.includes('500');
    
    if (isImportant && !msg.includes('[ULTRA ERROR]')) {
      showErrorBox('📋 LIBRARY ERROR', {
        'Source': 'External Library',
        'Detail': msg.substring(0, 45) + '...',
      }, 'warn');
    }
  };

  // 7. Network Status Monitor
  const updateNetworkStatus = () => {
    if (navigator.onLine) {
      console.log('%c[ULTRA] ✅ Online', style(COLORS.success));
    } else {
      showErrorBox('📡 KONEKSI TERPUTUS', {
        'Status': 'Offline',
        'Aksi': 'Periksa WiFi/Koneksi internet',
      }, 'error');
    }
  };
  
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  console.log('%c[ULTRA ERROR TRACKER] ✅ Aktif - Semua error akan ditangkap', style(COLORS.success));
};

// ============================================
// WRAPPER FUNCTIONS UNTUK ERROR HANDLING
// ============================================

/**
 * Wrap async function dengan error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      showErrorBox(`💥 ERROR DI ${context.toUpperCase()}`, {
        'Fungsi': fn.name || 'anonymous',
        'Error': error instanceof Error ? error.message : String(error),
        'Tipe': error instanceof Error ? error.name : typeof error,
      }, 'error');
      
      console.error(`[ULTRA ERROR] in ${context}:`, error);
      throw error;
    }
  }) as T;
};

/**
 * Wrap sync function dengan error handling
 */
export const withSyncErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  context: string
): T => {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      showErrorBox(`💥 SYNC ERROR DI ${context.toUpperCase()}`, {
        'Fungsi': fn.name || 'anonymous',
        'Error': error instanceof Error ? error.message : String(error),
      }, 'error');
      
      console.error(`[ULTRA ERROR] Sync in ${context}:`, error);
      throw error;
    }
  }) as T;
};

// ============================================
// TEST FUNCTIONS
// ============================================
declare global {
  interface Window {
    __testJSError?: () => void;
    __testPromiseError?: () => void;
    __testNetworkError?: () => void;
    __testResourceError?: () => void;
    __showErrorBox?: typeof showErrorBox;
  }
}

export const initTestFunctions = () => {
  window.__testJSError = () => {
    throw new Error('🧪 TEST: JavaScript runtime error');
  };
  
  window.__testPromiseError = () => {
    Promise.reject(new Error('🧪 TEST: Promise rejection'));
  };
  
  window.__testNetworkError = () => {
    fetch('https://invalid-domain-xyz-123.com/test');
  };
  
  window.__testResourceError = () => {
    const img = new Image();
    img.src = 'https://invalid-domain.com/image.jpg';
    document.body.appendChild(img);
    setTimeout(() => img.remove(), 1000);
  };
  
  window.__showErrorBox = showErrorBox;
  
  console.log('%c[ULTRA] Test functions tersedia:', style(COLORS.info));
  console.log('  window.__testJSError() - Test JS error');
  console.log('  window.__testPromiseError() - Test Promise error');
  console.log('  window.__testNetworkError() - Test network error');
  console.log('  window.__testResourceError() - Test resource error');
};

// ============================================
// INIT ALL
// ============================================
export const initUltraErrorTracker = () => {
  initGlobalErrorHandlers();
  initTestFunctions();
};

export default {
  initUltraErrorTracker,
  showErrorBox,
  withErrorHandling,
  withSyncErrorHandling,
};
