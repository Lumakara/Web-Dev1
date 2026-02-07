import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      // Optimize dev server
      hmr: {
        overlay: false,
      },
      // Proxy for Pakasir API to bypass CORS
      proxy: {
        '/api/pakasir': {
          target: 'https://app.pakasir.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/pakasir/, '/api'),
        },
      },
    },
    build: {
      outDir: 'dist',
      // Disable sourcemap in production for smaller builds
      sourcemap: false,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize chunk size
      chunkSizeWarningLimit: 500,
      // Rollup options for optimal bundling
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // React core - rarely changes
            'react-core': ['react', 'react-dom', 'react-router-dom'],
            // UI components - moderate changes
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-toast',
              '@radix-ui/react-select',
              '@radix-ui/react-popover',
              '@radix-ui/react-label',
            ],
            // Icons - rarely changes
            'icons': ['lucide-react'],
            // State management
            'state': ['zustand'],
            // Data visualization
            'charts': ['recharts'],
            // Forms
            'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // Utilities
            'utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge'],
            // Notifications
            'notifications': ['sonner'],
            // Firebase
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          },
          // Entry file naming with content hash
          entryFileNames: 'assets/[name]-[hash:8].js',
          // Chunk file naming
          chunkFileNames: 'assets/[name]-[hash:8].js',
          // Asset file naming with organized folders
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name || '';
            if (info.endsWith('.css')) {
              return 'assets/css/[name]-[hash:8][extname]';
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico|avif)$/.test(info)) {
              return 'assets/images/[name]-[hash:8][extname]';
            }
            if (/\.(woff2?|ttf|otf|eot)$/.test(info)) {
              return 'assets/fonts/[name]-[hash:8][extname]';
            }
            return 'assets/[name]-[hash:8][extname]';
          },
        },
        // Tree shaking
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
      },
      // Use esbuild for faster minification
      minify: 'esbuild',
      // CSS optimization
      cssMinify: true,
      // Generate manifest for precache
      manifest: true,
      // Target modern browsers for smaller bundles
      target: 'es2020',
      // Enable terser-like optimizations
      reportCompressedSize: false,
      // Empty outDir before build
      emptyOutDir: true,
    },
    // Public directory handling
    publicDir: 'public',
    // Preview configuration
    preview: {
      port: 4173,
      host: true,
    },
    // Environment prefix
    envPrefix: 'VITE_',
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'lucide-react',
        'sonner',
        'axios',
        'date-fns',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-tabs',
        '@radix-ui/react-scroll-area',
      ],
      // Exclude heavy dependencies from optimization during dev
      exclude: ['@rollup/plugin-visualizer'],
    },
    // Esbuild configuration
    esbuild: {
      // Drop console and debugger in production
      drop: isProduction ? ['console', 'debugger'] : [],
      // Minify syntax
      minifySyntax: true,
      // Minify whitespace
      minifyWhitespace: true,
      // Minify identifiers
      minifyIdentifiers: true,
    },
    // CSS configuration
    css: {
      // Dev sourcemap
      devSourcemap: !isProduction,
      // PostCSS config
      postcss: './postcss.config.js',
      // Preprocessor options
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/styles/variables.scss";`,
        },
      },
    },
    // JSON handling
    json: {
      // Stringify JSON for smaller bundles
      stringify: true,
    },
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
