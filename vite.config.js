import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/rpc': {
          // Dev local: kết nối trực tiếp vào node LAN nội bộ
          target: env.VITE_LOCAL_RPC || 'http://192.168.1.231:10746',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/rpc/, ''),
        },
      },
    },
  }
})

