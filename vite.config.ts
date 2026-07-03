import { defineConfig, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'

// Valve leaderboard webapi neposiela CORS hlavičky — dev server ho preto
// proxuje pod /valve. (Pri prípadnom deployi to isté zariadi redirect/proxy
// pravidlo hostingu, napr. Netlify redirects.)
const valveProxy: Record<string, ProxyOptions> = {
  '/valve': {
    target: 'https://www.dota2.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/valve/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: { proxy: valveProxy },
  preview: { proxy: valveProxy },
})
