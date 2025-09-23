import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// opcional: npm i -D rollup-plugin-visualizer
// import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    // visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true }) // opcional
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  build: {
    // mantenha esse limite se quiser, mas o que ajuda mesmo é o manualChunks
    chunkSizeWarningLimit: 1500,

    rollupOptions: {
      output: {
        manualChunks: {
          // núcleo do framework
          vue: ['vue'],

          // gráficos (grande): vai pra um chunk separado e só baixa quando alguma rota que usa eCharts for carregada
          echarts: ['echarts', 'echarts/core'],

          // geração de PDF/imagem (grande): isola jspdf e html2canvas
          pdf: ['jspdf', 'html2canvas'],

          // toasts (isola para não ir pro index se for usado pontualmente)
          toast: ['vue-toastification'],

          // você pode criar buckets por feature, ex.:
          // reservas: ['@/pages/Reservas.vue']  // só se fizer sentido estático
        }
      },
      // treeshake já é true por padrão, mas manter explícito não faz mal:
      // treeshake: 'smallest'
    },

    // dica: se não precisa suportar browsers muito antigos, isso ajuda treeshaking
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
})
