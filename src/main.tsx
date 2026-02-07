import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/SkeletonLoader';
import { initUltraErrorTracker } from '@/lib/error-tracker';
import './index.css';

// Inisialisasi ULTRA error tracking
initUltraErrorTracker();

// Lazy load apps for better initial load performance
const App = lazy(() => import('./App'));
const AdminApp = lazy(() => import('./AdminApp'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Skeleton className="w-16 h-16 mx-auto mb-4 rounded-full" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Memuat...</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/*" element={<App />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
