import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Note: API calls in development will fail unless you run a backend server
        // For local dev with API, use: npx vercel dev (for Vercel) or setup Cloudflare locally
        // Or test with production build: npm run build && npm run preview
      },
      plugins: [react()],
      // Remove API key from frontend - it's now handled by backend API
      // API key should only exist in server environment variables
      publicDir: 'public',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        minify: 'esbuild',
        sourcemap: !isProduction,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
            }
          }
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
      }
    };
});
