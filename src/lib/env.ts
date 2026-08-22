/**
 * Environment Configuration & Validation
 * Memastikan semua env vars tersedia dan valid pada startup
 */

// ============================================
// Environment Schema
// ============================================

const envSchema = {
  // API Configuration
  VITE_API_URL: {
    required: true,
    default: 'http://localhost:3000/api',
    description: 'Backend API base URL',
  },
  VITE_API_TIMEOUT: {
    required: false,
    default: '30000',
    description: 'API request timeout in milliseconds',
    parse: (val: string) => parseInt(val, 10),
  },

  // Logging
  VITE_LOG_LEVEL: {
    required: false,
    default: 'info',
    description: 'Log level (debug, info, warn, error)',
    validate: (val: string) => ['debug', 'info', 'warn', 'error'].includes(val),
  },

  // Feature Flags
  VITE_ENABLE_ANALYTICS: {
    required: false,
    default: 'false',
    description: 'Enable analytics tracking',
    parse: (val: string) => val === 'true',
  },
  VITE_ANALYTICS_ID: {
    required: false,
    default: '',
    description: 'Google Analytics ID',
  },

  // Authentication
  VITE_AUTH_ENABLED: {
    required: false,
    default: 'true',
    parse: (val: string) => val === 'true',
  },

  // App Info
  VITE_APP_NAME: {
    required: false,
    default: 'Web-Dev1',
    description: 'Application name',
  },
  VITE_APP_VERSION: {
    required: false,
    default: '1.0.0',
    description: 'Application version',
  },
  VITE_ENVIRONMENT: {
    required: false,
    default: 'development',
    validate: (val: string) => ['development', 'staging', 'production'].includes(val),
  },
} as const;

// ============================================
// Type Definitions
// ============================================

export type EnvKey = keyof typeof envSchema;

export interface ValidatedEnv {
  // API
  apiUrl: string;
  apiTimeout: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Features
  enableAnalytics: boolean;
  analyticsId: string;

  // Auth
  authEnabled: boolean;

  // App Info
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';

  // Raw access
  raw: Record<string, string | number | boolean>;
}

// ============================================
// Validation Logic
// ============================================

function validateEnv(): ValidatedEnv {
  const errors: Record<string, string> = {};
  const parsed: Record<string, any> = {};

  Object.entries(envSchema).forEach(([key, config]) => {
    const viteKey = key as EnvKey;
    const value = import.meta.env[viteKey];

    // Check required fields
    if (config.required && !value) {
      errors[viteKey] = `${viteKey} is required`;
      return;
    }

    // Use default if not provided
    const finalValue = value || config.default;

    // Validate value format
    if ('validate' in config && finalValue) {
      const isValid = config.validate(finalValue);
      if (!isValid) {
        errors[viteKey] = `${viteKey} has invalid value: ${finalValue}`;
        return;
      }
    }

    // Parse value if needed
    if ('parse' in config && finalValue) {
      try {
        parsed[viteKey] = config.parse(finalValue);
      } catch (e) {
        errors[viteKey] = `${viteKey} failed to parse: ${(e as Error).message}`;
      }
    } else {
      parsed[viteKey] = finalValue;
    }
  });

  // Report errors
  if (Object.keys(errors).length > 0) {
    console.error('❌ Environment Validation Errors:');
    Object.entries(errors).forEach(([key, message]) => {
      console.error(`  - ${key}: ${message}`);
    });
    throw new Error('Environment validation failed. Check errors above.');
  }

  // Log validated environment (non-sensitive)
  if (import.meta.env.DEV) {
    console.log('✅ Environment validated successfully');
    console.log('📋 Configuration:', {
      environment: parsed.VITE_ENVIRONMENT,
      appName: parsed.VITE_APP_NAME,
      apiUrl: parsed.VITE_API_URL,
      logLevel: parsed.VITE_LOG_LEVEL,
    });
  }

  return {
    apiUrl: parsed.VITE_API_URL,
    apiTimeout: parsed.VITE_API_TIMEOUT,
    logLevel: parsed.VITE_LOG_LEVEL,
    enableAnalytics: parsed.VITE_ENABLE_ANALYTICS,
    analyticsId: parsed.VITE_ANALYTICS_ID,
    authEnabled: parsed.VITE_AUTH_ENABLED,
    appName: parsed.VITE_APP_NAME,
    appVersion: parsed.VITE_APP_VERSION,
    environment: parsed.VITE_ENVIRONMENT,
    raw: parsed,
  };
}

// ============================================
// Singleton Instance
// ============================================

let env: ValidatedEnv | null = null;

export function getEnv(): ValidatedEnv {
  if (!env) {
    env = validateEnv();
  }
  return env;
}

// Eager validation on module load
try {
  getEnv();
} catch (error) {
  console.error('Failed to initialize environment:', error);
  // Don't throw in production, let app handle gracefully
  if (import.meta.env.DEV) {
    throw error;
  }
}

// ============================================
// Export Configured Values
// ============================================

export const config = {
  get api() {
    return {
      baseURL: getEnv().apiUrl,
      timeout: getEnv().apiTimeout,
    };
  },
  get logging() {
    return {
      level: getEnv().logLevel,
    };
  },
  get analytics() {
    return {
      enabled: getEnv().enableAnalytics,
      id: getEnv().analyticsId,
    };
  },
  get app() {
    return {
      name: getEnv().appName,
      version: getEnv().appVersion,
      environment: getEnv().environment,
    };
  },
  get isDev() {
    return getEnv().environment === 'development';
  },
  get isProduction() {
    return getEnv().environment === 'production';
  },
};
