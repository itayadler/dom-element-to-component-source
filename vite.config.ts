import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DomElementToComponentSource',
      fileName: (format) => `dom-element-to-component-source.${format}.js`,
      formats: ['es', 'cjs', 'umd']
    },
    rollupOptions: {
      external: (id) => {
        // Externalize Node.js built-in modules
        return id.startsWith('node:') || ['fs', 'path', 'node:fs', 'node:path'].includes(id)
      },
      output: [
        {
          format: 'es',
          entryFileNames: 'dom-element-to-component-source.es.js',
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
