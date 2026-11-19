import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Opcional: VITE_API_PROXY_TARGET=http://localhost:3000 serve a API em /api na mesma origem (como o rewrite
// da Vercel em produção). Use junto com VITE_API_BASE_URL=/api.
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').VITE_API_PROXY_TARGET;
  const proxy = target ? { '/api': { target, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api/, '') } } : undefined;
  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
