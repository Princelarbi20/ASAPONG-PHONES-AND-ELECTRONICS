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
  const apiBase = env.VITE_API_BASE_URL || '/api'
  const apiProxyTarget = env.API_PROXY_TARGET

  if (mode === 'development' && !/^https?:\/\//i.test(apiBase) && !apiProxyTarget) {
    throw new Error('Set API_PROXY_TARGET in the frontend environment when VITE_API_BASE_URL is a relative path.')
  }

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
server: {
    proxy: apiProxyTarget ? {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      }
    } : {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  }
})
