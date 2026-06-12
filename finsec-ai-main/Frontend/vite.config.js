import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { API_BASE_URL } from './src/service/service';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/api': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
