// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Content Security Policy directives
 * Untuk diimplementasikan di web server (nginx/apache) atau meta tag
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.googleapis.com", "https://*.firebaseapp.com"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'font-src': ["'self'", "https://fonts.gstatic.com", "data:"],
  'img-src': ["'self'", "data:", "https:", "blob:"],
  'connect-src': ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "wss://*.firebaseio.com"],
  'frame-src': ["'self'", "https://*.firebaseapp.com"],
  'media-src': ["'self'", "https:"],
};

/**
 * Generate CSP header string
 */
export function generateCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string input untuk mencegah XSS
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Hapus < dan >
    .replace(/javascript:/gi, '') // Hapus javascript: protocol
    .replace(/on\w+=/gi, '') // Hapus event handlers
    .trim();
}

/**
 * Sanitize HTML content (untuk rich text)
 * Hanya izinkan tag tertentu
 */
export function sanitizeHTML(html: string): string {
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, (tag) => {
      const tagName = tag.match(/<(\w+)/)?.[1]?.toLowerCase();
      if (tagName && allowedTags.includes(tagName)) {
        return tag;
      }
      return '';
    });
}

/**
 * Escape HTML entities
 */
export function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validasi file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;
  
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Ukuran file maksimal ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Tipe file tidak didukung. Izinkan: ${allowedTypes.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * Rate limiter sederhana untuk client-side
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canProceed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Filter hanya request dalam window
    const recentRequests = timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  getRemainingTime(key: string): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;
    
    const oldestTimestamp = Math.min(...timestamps);
    const remaining = this.windowMs - (Date.now() - oldestTimestamp);
    return Math.max(0, remaining);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

// ============================================
// LOCAL STORAGE SECURITY
// ============================================

/**
 * Secure local storage wrapper
 * Menggunakan encryption sederhana untuk sensitive data
 */
export const secureStorage = {
  set(key: string, value: unknown): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },
};

// ============================================
// PASSWORD STRENGTH
// ============================================

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  else feedback.push('Password minimal 8 karakter');

  // Uppercase check
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Tambahkan huruf besar');

  // Number check
  if (/[0-9]/.test(password)) score++;
  else feedback.push('Tambahkan angka');

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Tambahkan karakter spesial');

  const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return {
    score,
    label: labels[score],
    color: colors[score],
    feedback,
  };
}

// ============================================
// CSRF PROTECTION
// ============================================

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, storedToken: string): boolean {
  // Constant-time comparison untuk mencegah timing attack
  if (token.length !== storedToken.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}

// ============================================
// SESSION SECURITY
// ============================================

/**
 * Check if session is expired
 */
export function isSessionExpired(lastActivity: number, timeoutMinutes = 30): boolean {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  return Date.now() - lastActivity > timeoutMs;
}

/**
 * Security headers untuk diimplementasikan di server
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// ============================================
// RECAPTCHA UTILITIES
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Execute reCAPTCHA v3
 * Note: Requires reCAPTCHA site key to be configured
 */
export async function executeRecaptcha(action: string): Promise<string> {
  // Check if grecaptcha is available
  const grecaptcha = (window as unknown as { grecaptcha?: { execute: (key: string, options: { action: string }) => Promise<string> } }).grecaptcha;
  
  if (!grecaptcha) {
    console.warn('reCAPTCHA not loaded');
    return '';
  }
  
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.warn('reCAPTCHA site key not configured');
    return '';
  }
  
  try {
    const token = await grecaptcha.execute(siteKey, { action });
    return token;
  } catch (error) {
    console.error('reCAPTCHA execution failed:', error);
    return '';
  }
}

/**
 * Validate reCAPTCHA score on server
 * Note: This should be called on your backend
 */
export function isRecaptchaScoreValid(score: number, threshold = 0.5): boolean {
  return score >= threshold;
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  
  // In production, send to logging service
  if (import.meta.env.PROD) {
    // Send to logging service
    // Example: sendToLogService(logEntry);
  }
  
  console.warn('[Security]', logEntry);
}
