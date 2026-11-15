import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from 'url'

// Resolve __dirname safely for ES modules format
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL

  if (!apiBase) {
    throw new Error('Set VITE_API_BASE_URL in the frontend environment.')
  }
  const usesApiProxy = apiBase.startsWith('/') && Boolean(env.API_PROXY_TARGET)
  if (mode === 'development' && !/^https?:\/\//i.test(apiBase) && !usesApiProxy) {
    throw new Error('Set VITE_API_BASE_URL to an absolute backend origin, or configure API_PROXY_TARGET when using a relative /api base.')
  }

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: usesApiProxy ? {
    proxy: {
      '/api': {
        target: env.API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  } : undefined,
  }
})
