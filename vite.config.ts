import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'node18',
    ssr: true,
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'src/index.ts'),
      output: {
        format: 'esm',
      },
      
    },
  },
})
