# Phase 1: Foundation Hardening - Implementation Guide

**Status:** Ready to Implement  
**Estimated Time:** 3-5 days  
**Priority:** Critical

---

## 📋 Checklist

- [x] Type definitions (`src/types/index.ts`)
- [x] Error classes (`src/lib/errors.ts`)
- [x] Environment validation (`src/lib/env.ts`)
- [x] Error boundary component (`src/components/ErrorBoundary.tsx`)
- [x] `.env.example` template
- [ ] Update `main.tsx` to use ErrorBoundary + getEnv()
- [ ] Update `App.tsx` with error handling
- [ ] Remove all `any` types from existing code
- [ ] Add `strict: true` to `tsconfig.json`
- [ ] Setup logging utility
- [ ] Create `CONTRIBUTING.md` guide

---

## 🔧 Implementation Steps

### Step 1: Update main.tsx

Add ErrorBoundary wrapper dan env validation:

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getEnv } from '@/lib/env'
import App from './App'
import './index.css'

// Validate env on startup
try {
  getEnv()
} catch (error) {
  console.error('Failed to initialize app:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h1>⚠️ Configuration Error</h1>
      <p>Failed to load environment configuration.</p>
      <p>Check console for details.</p>
    </div>
  `
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
```

### Step 2: Update tsconfig.json

Enable strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Setup Logger Utility

```typescript
// src/lib/logger.ts
import { config } from '@/lib/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class Logger {
  private level: LogLevel = (config.logging.level as LogLevel) || 'info'

  private log(level: LogLevel, message: string, data?: unknown) {
    if (LEVELS[level] < LEVELS[this.level]) return

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    if (import.meta.env.DEV) {
      const styleMap = {
        debug: 'color: #666',
        info: 'color: #0066cc',
        warn: 'color: #ff9800',
        error: 'color: #d32f2f',
      }
      console.log(`%c${prefix}`, styleMap[level], message, data || '')
    } else {
      console.log(prefix, message, data || '')
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, error?: unknown) {
    this.log('error', message, error instanceof Error ? error.message : error)
  }
}

export const logger = new Logger()
```

### Step 4: Create API Client with Error Handling

```typescript
// src/lib/api.ts
import axios, { AxiosError, AxiosInstance } from 'axios'
import { config } from '@/lib/env'
import { handleApiError, AuthenticationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const apiClient: AxiosInstance = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
})

// Request interceptor
apiClient.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      req.headers.Authorization = `Bearer ${token}`
    }
    logger.debug('API Request', {
      method: req.method?.toUpperCase(),
      url: req.url,
    })
    return req
  },
  (error) => {
    return Promise.reject(handleApiError(error))
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    logger.debug('API Response', {
      status: response.status,
      url: response.config.url,
    })
    return response.data
  },
  (error: AxiosError) => {
    logger.error('API Error', error.message)

    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
      throw new AuthenticationError('Session expired')
    }

    throw handleApiError(error)
  }
)

export default apiClient
```

### Step 5: Remove all `any` types

Find and replace:

```bash
# Find all 'any' usages
grep -r ": any" src/ --include="*.ts" --include="*.tsx"

# Replace with proper types or use generics
# Example: const data: any = {} → const data: Record<string, unknown> = {}
```

### Step 6: Add Pre-commit Hooks (Optional but recommended)

```bash
npm install --save-dev husky lint-staged prettier eslint

npx husky install
npx husky add .husky/pre-commit 'npx lint-staged'
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "eslint --fix",
    "*.{ts,tsx,json,md}": "prettier --write"
  }
}
```

---

## 📚 Usage Examples

### Using Custom Errors

```typescript
// src/services/userService.ts
import { ValidationError, NotFoundError, handleApiError } from '@/lib/errors'
import apiClient from '@/lib/api'

export async function getUser(id: string) {
  try {
    // Validate input
    if (!id || id.trim() === '') {
      throw new ValidationError('User ID is required', { id: 'ID cannot be empty' })
    }

    const response = await apiClient.get(`/users/${id}`)
    return response
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      // Handle validation error
      console.log('Validation failed:', error.fields)
    } else if (error.status === 404) {
      // Handle not found
      console.log('User not found')
    } else {
      // Handle other errors
      console.error('Unexpected error:', error.message)
    }
    throw error
  }
}
```

### Using Logger

```typescript
import { logger } from '@/lib/logger'

function myComponent() {
  try {
    logger.debug('Component mounted')
    // Do work
    logger.info('Data loaded successfully', { count: 10 })
  } catch (error) {
    logger.error('Failed to load data', error)
  }
}
```

### Using Environment Config

```typescript
import { config } from '@/lib/env'

function MyComponent() {
  return (
    <div>
      <h1>{config.app.name}</h1>
      <p>Version: {config.app.version}</p>
      <p>Mode: {config.isDev ? 'Development' : 'Production'}</p>
    </div>
  )
}
```

---

## ✅ Quality Checklist Before Moving to Phase 2

- [ ] All TypeScript errors resolved
- [ ] No `any` types in codebase
- [ ] Error boundary working (test by throwing error)
- [ ] Env validation working (check console on startup)
- [ ] Logger working with proper levels
- [ ] API client interceptors working
- [ ] Build completes without errors
- [ ] Tests passing (if any exist)
- [ ] No console warnings/errors
- [ ] Code follows project conventions

---

## 🐛 Testing Phase 1

### Test Error Boundary

```typescript
// Create test component
function ErrorTest() {
  const [showError, setShowError] = React.useState(false)
  if (showError) throw new Error('Test error')
  return <button onClick={() => setShowError(true)}>Throw Error</button>
}

// Add to app and verify error boundary catches it
```

### Test Env Validation

1. Remove a required env var
2. Check if validation error shows
3. Add it back

### Test Logger

```typescript
import { logger } from '@/lib/logger'

logger.debug('Debug message')
logger.info('Info message')
logger.warn('Warn message')
logger.error('Error message')
```

---

## 📝 Next Phase

Once Phase 1 complete:
- Move to Phase 2: Design System & Components
- Setup Storybook for component documentation
- Create component library structure

---

## 🔗 Related Files

- `DEVELOPMENT_ROADMAP.md` - Overall project roadmap
- `src/types/index.ts` - Type definitions
- `src/lib/errors.ts` - Custom errors
- `src/lib/env.ts` - Environment config
- `src/components/ErrorBoundary.tsx` - Error handling UI
