import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import oxlintPlugin from 'vite-plugin-oxlint';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      oxlintPlugin({
        // You can add paths to include/exclude if needed,
        // but the defaults are usually perfect.
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});