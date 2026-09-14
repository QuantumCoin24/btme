import {
  defineConfig
} from 'vite'

import react
  from '@vitejs/plugin-react'

import {
  resolve
} from 'node:path'

export default defineConfig({
  plugins: [
    react()
  ],

  build: {
    rollupOptions: {
      input: {
        main: resolve(
          __dirname,
          'index.html'
        ),

        app: resolve(
          __dirname,
          'app/index.html'
        )
      },

      output: {
        manualChunks(id) {
          if (
            id.includes(
              'node_modules/react/'
            ) ||
            id.includes(
              'node_modules/react-dom/'
            )
          ) {
            return 'react-vendor'
          }

          if (
            id.includes('@supabase')
          ) {
            return 'supabase-vendor'
          }

          return undefined
        }
      }
    }
  }
})
