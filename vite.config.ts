import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'
import swc from 'unplugin-swc'

function copyTemplates() {
  return {
    name: 'copy-templates',
    writeBundle() {
      cpSync(resolve(__dirname, 'src/templates'), resolve(__dirname, 'dist/templates'), {
        recursive: true,
      })
    },
  }
}

export default defineConfig({
  plugins: [swc.vite(), copyTemplates()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    watch: {
      // Ensure chokidar picks up all src changes
      usePolling: false,
    },
    hmr: true,
  },
  build: {
    target: 'node18',
    ssr: true,
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/index.ts'),
      output: {
        format: 'esm',
      },
    },
  },
  optimizeDeps: {
    include: ['@/core', '@/modules', '@/socket'],
  },
})
