import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/rpc': {
        target: 'http://116.109.66.229:10746',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc/, ''),
      },
    },
  },
})
