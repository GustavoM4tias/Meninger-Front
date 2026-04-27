<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import dayjs from 'dayjs'
import API_URL from '@/config/apiUrl'

const props = defineProps({
  rows:    { type: Array,  required: true },
  context: { type: Object, required: true },
  // título customizável; padrão "Cronograma de Eventos"
  title:   { type: String, default: 'Cronograma de Eventos' },
})

const reportRef  = ref(null)
const generating = ref(true)
const imageUrl   = ref(null)   // JPEG para exibição e download
const pngBlob    = ref(null)   // PNG para clipboard
const copied     = ref(false)
const genError   = ref(null)

const DEFAULT_IMG = '/Mlogo.png'
const FOOTER_LOGO = '/menin-vazada-branca.png'
const MONTHS_PT   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── Helpers de data ────────────────────────────────────────────────────────
function fmtDate(d) {
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`
}
function fmtTime(d) {
  const dt = new Date(d)
  const m  = dt.getMinutes()
  return m === 0 ? `${dt.getHours()}h` : `${dt.getHours()}h${String(m).padStart(2,'0')}`
}
function isPast(d) { return new Date(d) < new Date() }

// ── dateRangeLabel (idêntico ao ReportModal) ───────────────────────────────
const dateRangeLabel = computed(() => {
  const ts = props.rows.map(r => new Date(r.event_date).getTime()).filter(t => !isNaN(t))
  if (!ts.length) return ''
  const min = new Date(Math.min(...ts))
  const max = new Date(Math.max(...ts))
  const fmt = d => `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`
  return min.toDateString() === max.toDateString() ? fmt(min) : `${fmt(min)} à ${fmt(max)}`
})

// ── Extração de imagem (idêntico ao ReportModal) ───────────────────────────
function getRawSrc(row) {
  // Tenta images[0] primeiro (mesmo que ReportModal)
  const imgs = typeof row.images === 'string'
    ? (() => { try { return JSON.parse(row.images) } catch { return [] } })()
    : (Array.isArray(row.images) ? row.images : [])

  if (imgs.length) return imgs[0]
  return row.enterprise_logo || null
}

// ── Proxy de imagens: mesmo fluxo do ReportModal ───────────────────────────
async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result)
    r.onerror   = reject
    r.readAsDataURL(blob)
  })
}

async function proxyToDataUrl(src) {
  if (!src) return null
  if (src.startsWith('/') || src.startsWith('data:')) return src
  try {
    const token = localStorage.getItem('token')
    const res   = await fetch(
      `${API_URL}/events/proxy-image?url=${encodeURIComponent(src)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    if (!res.ok) return null
    return await blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}

// ── Aplica data URLs diretamente no DOM (mais confiável que reatividade Vue) ─
async function hydrateImages() {
  const imgs = reportRef.value?.querySelectorAll('img[data-raw-src]')
  if (!imgs?.length) return

  await Promise.all([...imgs].map(async img => {
    const src = img.dataset.rawSrc
    if (!src) return
    const dataUrl = await proxyToDataUrl(src)
    img.src = dataUrl || DEFAULT_IMG
  }))

  // Aguarda o browser processar os novos src (data URLs carregam síncronamente,
  // mas um frame extra garante que o html2canvas veja o estado final)
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
}

// ── Geração ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await nextTick()           // garante que o DOM do reportRef está montado
    await hydrateImages()      // proxy → data URL → img.src direto no DOM

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(reportRef.value, {
      scale: 2.2, useCORS: false, allowTaint: false,
      backgroundColor: '#0F2747', logging: false,
    })

    imageUrl.value = canvas.toDataURL('image/jpeg', 0.94)
    pngBlob.value  = await new Promise(r => canvas.toBlob(r, 'image/png'))
  } catch (err) {
    console.error('[ChatEventsReport]', err)
    genError.value = 'Erro ao gerar o relatório.'
  } finally {
    generating.value = false
  }
})

// ── Copiar PNG ────────────────────────────────────────────────────────────
async function copyImage() {
  if (!pngBlob.value) return
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob.value })])
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('[ChatEventsReport] clipboard error:', err)
  }
}

// ── Baixar JPEG ───────────────────────────────────────────────────────────
function downloadImage() {
  const a = document.createElement('a')
  a.href     = imageUrl.value
  a.download = `Cronograma_Eventos_${dayjs().format('DD-MM-YYYY')}.jpg`
  a.click()
}
</script>

<template>
  <!-- ── Template fora do viewport para captura ─────────────────────────── -->
  <div style="position:fixed;left:-9999px;top:0;width:840px;pointer-events:none;z-index:-1;" aria-hidden="true">
    <div ref="reportRef" style="
      background:linear-gradient(180deg,#123765 0%,#0F2747 30%,#0B1E38 100%);
      padding:40px 36px 30px 36px;
      font-family:Arial,Helvetica,sans-serif;
      width:840px;box-sizing:border-box;
      border-radius:24px;overflow:hidden;">

      <!-- Cabeçalho: título + datas abaixo -->
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#fff;font-size:28px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;line-height:1.2;">
          {{ title }}
        </h1>
        <p v-if="dateRangeLabel" style="color:rgba(255,255,255,0.86);font-size:17px;font-weight:500;letter-spacing:1px;margin:0;">
          {{ dateRangeLabel }}
        </p>
      </div>

      <!-- Sem eventos -->
      <div v-if="!rows.length" style="text-align:center;padding:56px 0;color:rgba(255,255,255,0.45);font-size:14px;">
        Nenhum evento encontrado
      </div>

      <!-- Lista de eventos -->
      <div v-for="row in rows" :key="row.id"
        style="margin-bottom:14px;border-radius:18px;overflow:hidden;background:rgba(255,255,255,0.04);">
        <div style="display:flex;gap:22px;padding:22px;align-items:flex-start;">

          <!-- Data + imagem: src inicial = fallback, hydrateImages sobrescreve via data-raw-src -->
          <div style="min-width:110px;display:flex;flex-direction:column;align-items:center;gap:12px;">
            <div style="font-size:32px;font-weight:900;color:#fbbb22;line-height:1;text-align:center;">
              {{ fmtDate(row.event_date) }}
            </div>
            <img
              :src="DEFAULT_IMG"
              :data-raw-src="getRawSrc(row) || ''"
              :alt="row.enterprise_name || row.title"
              style="width:72px;height:72px;object-fit:cover;display:block;"
            />
          </div>

          <!-- Divisor -->
          <div style="width:1px;background:rgba(255,255,255,0.10);align-self:stretch;flex-shrink:0;"></div>

          <!-- Conteúdo -->
          <div style="flex:1;padding-top:2px;min-width:0;">
            <h2 style="color:#fff;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;line-height:1.35;">
              {{ row.title }}
            </h2>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;">
              <span style="color:rgba(255,255,255,0.86);font-size:20px;font-weight:400;padding:7px 10px;line-height:1;">
                {{ fmtTime(row.event_date) }}
              </span>
              <span v-if="row.cidade" style="color:rgba(255,255,255,0.76);font-size:20px;font-weight:400;padding:7px 10px;line-height:1;">
                | {{ row.cidade }}/{{ row.estado }}
              </span>
            </div>
            <span v-if="isPast(row.event_date)" style="
              display:inline-block;background:#DC2626;color:#fff;
              font-size:12px;font-weight:900;letter-spacing:1px;
              padding:2px 8px 10px 8px;border-radius:999px;text-transform:uppercase;line-height:1;
              margin-bottom:8px;">
              REALIZADO
            </span>
            <p v-if="row.enterprise_name" style="color:rgba(255,255,255,0.55);font-size:11px;margin:6px 0 0;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
              {{ row.enterprise_name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Rodapé -->
      <div style="text-align:center;padding-top:18px;">
        <p style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;margin:0 0 10px;">
          Datas sujeitas a alteração
        </p>
        <img :src="FOOTER_LOGO" alt="Menin"
          style="height:72px;width:auto;filter:brightness(0) invert(1);display:block;margin:0 auto 8px;" />
      </div>
    </div>
  </div>

  <!-- ── Card exibido no chat ───────────────────────────────────────────── -->
  <div class="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 mt-2 shadow">
    <div class="px-4 py-3 bg-slate-300/20 dark:bg-slate-800/60 flex items-center justify-between gap-2 border-b border-white/5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-1.5 h-5 rounded-full bg-blue-500 flex-shrink-0" />
        <span class="text-sm font-medium dark:text-gray-200">Cronograma de Eventos</span>
      </div>
      <div v-if="imageUrl" class="flex items-center gap-1.5 flex-shrink-0">
        <button @click="copyImage"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-gray-400 hover:text-gray-200 text-xs transition"
          title="Copiar imagem para a área de transferência">
          <i :class="copied ? 'fas fa-check text-green-400' : 'far fa-copy'" />
          <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
        <button @click="downloadImage"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs transition"
          title="Baixar como JPG">
          <i class="fas fa-download" />
          <span>Baixar</span>
        </button>
      </div>
    </div>

    <div class="p-3">
      <div v-if="generating" class="h-36 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <i class="fas fa-spinner fa-spin text-xl text-blue-400" />
        <span class="text-sm">Carregando imagens e gerando relatório...</span>
      </div>
      <div v-else-if="genError" class="py-6 text-center text-sm text-rose-400">
        <i class="fas fa-exclamation-circle mr-1" />{{ genError }}
      </div>
      <img v-else-if="imageUrl" :src="imageUrl" class="w-full rounded-xl" alt="Cronograma de Eventos" />
    </div>
  </div>
</template>
