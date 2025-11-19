import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/browser.ts'),
        server: resolve(__dirname, 'src/server.ts'),
      },
      name: 'DomElementToComponentSource',
      formats: ['es']
    },
    rollupOptions: {
      external: (id) => {
        // Externalize Node.js built-in modules
        return id.startsWith('node:') || ['fs', 'path', 'node:fs', 'node:path'].includes(id)
      },
      output: [
        {
          format: 'es',
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'index') {
              return 'dom-element-to-component-source.es.js'
            }
            return 'server.es.js'
          },
          globals: {}
        },
      ]
    },
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
  }
})
