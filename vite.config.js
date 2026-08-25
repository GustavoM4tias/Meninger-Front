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
    // ── console.log não vai para produção ──────────────────────────────────
    // Havia 50 chamadas espalhadas por 17 arquivos indo para o console de quem
    // usa o Office - resposta de API, payload de reconhecimento facial, estado
    // interno da Eme. Apagar na mão custaria o log que serve em DEV, então o
    // corte é no build: o esbuild trata estas como sem efeito colateral e as
    // remove ao minificar.
    //
    // `console.error` e `console.warn` FICAM de propósito: são o que sobra pra
    // diagnosticar um erro que só acontece na máquina do usuário.
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Agrupamento de BIBLIOTECA, nunca de código nosso.
          //
          // Antes isto era um objeto ({ pdf: ['jspdf', ...] }). O efeito colateral
          // medido: o Rollup encostava um módulo compartilhado nosso (o helper de
          // export do Vue, 200 bytes) dentro do pacote 'pdf', e como o pacote de
          // entrada precisava desse helper, ele passava a importar o pdf
          // ESTATICAMENTE - 592 kB de jsPDF baixados na tela de login, sendo que
          // todo uso de jsPDF no código já é await import().
          //
          // Como função, com o corte em node_modules, só entra aqui o que é de
          // terceiro. O que é nosso volta a ser fatiado por rota.
          manualChunks(id) {
            // O ajudante de import dinâmico do próprio Vite (__vitePreload) é usado
            // pelo pacote de entrada e por quase todos os outros. Deixado à
            // sorte, o Rollup o encostava dentro do 'pdf' - e era ISSO que fazia
            // a entrada importar 592 kB de jsPDF estaticamente. Ele vai junto do
            // vue, que a entrada já carrega de qualquer forma.
            if (id.includes('vite/preload-helper') || id.includes('plugin-vue:export-helper')) return 'vue';
            if (!id.includes('node_modules')) return;
            if (/node_modules[\/](echarts|zrender)[\/]/.test(id)) return 'echarts';
            if (/node_modules[\/](jspdf|html2canvas)[\/]/.test(id)) return 'pdf';
            if (/node_modules[\/](exceljs|file-saver)[\/]/.test(id)) return 'excel';
            if (/node_modules[\/]vue-toastification[\/]/.test(id)) return 'toast';
            if (/node_modules[\/](vue|@vue)[\/]/.test(id)) return 'vue';
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
