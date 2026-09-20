import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: { outDir: 'web-dist', chunkSizeWarningLimit: 1100 },
  server: {
    host: '127.0.0.1',
    port: 15473,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**', '**/.local/**', '**/dist/**', '**/wiki_memory/**'] },
  },
});
