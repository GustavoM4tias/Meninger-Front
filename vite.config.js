import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// ── Versionamento dinâmico ──────────────────────────────────
// Office: lê do package.json deste repo
// Academy: vem da env VITE_ACADEMY_VERSION (cada repo seta a sua via CI/.env)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

function gitShortSha() {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return '' }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const officeVersion = pkg.version || '0.0.0'
  const academyVersion = env.VITE_ACADEMY_VERSION || pkg.academyVersion || ''
  const sha = gitShortSha()

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    define: {
      __APP_VERSION_OFFICE__: JSON.stringify(officeVersion),
      __APP_VERSION_ACADEMY__: JSON.stringify(academyVersion),
      __APP_GIT_SHA__: JSON.stringify(sha),
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue'],
            echarts: ['echarts', 'echarts/core'],
            pdf: ['jspdf', 'html2canvas'],
            toast: ['vue-toastification'],
            excel: ['exceljs/dist/exceljs.min.js', 'file-saver'],
          }
        },
      },
      target: 'es2019',
      minify: 'esbuild'
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: 'https://menin.cvcrm.com.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
