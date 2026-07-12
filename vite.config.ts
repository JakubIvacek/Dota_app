import { defineConfig, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'

// Valve leaderboard webapi a Steam News API neposielajú CORS hlavičky — dev
// server ich preto proxuje pod /valve a /steamnews. (Pri deployi to isté
// zariadi rewrite pravidlo hostingu, viď vercel.json.)
const valveProxy: Record<string, ProxyOptions> = {
  '/valve': {
    target: 'https://www.dota2.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/valve/, ''),
  },
  '/steamnews': {
    target: 'https://api.steampowered.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/steamnews/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: { proxy: valveProxy },
  preview: { proxy: valveProxy },
})
