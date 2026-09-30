/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// onnxruntime-web ships a ~27 MB wasm binary that Vite copies into dist, but Cloudflare Pages
// rejects files over 25 MiB. The app loads that binary from a CDN at runtime
// (ort.env.wasm.wasmPaths in src/lib/maiaOnnxService.ts), so drop the bundled copy.
const dropOrtWasm = () => ({
  name: 'drop-ort-wasm',
  apply: 'build' as const,
  generateBundle(_options: unknown, bundle: Record<string, unknown>) {
    for (const fileName of Object.keys(bundle)) {
      if (/ort-wasm[^/]*\.wasm$/.test(fileName)) delete bundle[fileName]
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dropOrtWasm(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/image': path.resolve(__dirname, './src/components/ui/NextImageShim.tsx'),
      'lucide-original': path.resolve(__dirname, './node_modules/lucide-react/dist/esm/lucide-react.js'),
      'lucide-react': path.resolve(__dirname, './src/components/icons/uxercon.tsx'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts'
  }
})