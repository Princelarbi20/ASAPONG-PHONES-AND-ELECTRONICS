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
  if (mode === 'development' && !/^https?:\/\//i.test(apiBase)) {
    throw new Error('VITE_API_BASE_URL must be an absolute backend origin in development; this app uses direct API requests, not a Vite proxy.')
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
  }
})
