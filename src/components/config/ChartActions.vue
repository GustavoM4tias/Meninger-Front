<!-- src/components/config/ChartActions.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  chartRef: { type: Object, required: true },   // ref do <VChart>
  filename: { type: String, default: 'grafico' },
  pixelRatio: { type: Number, default: 2 },
  bg: { type: String, default: '#ffffff' }
})

const isReady = computed(() => !!props.chartRef?.value?.getEchartsInstance?.())

function getEC() {
  const ec = props.chartRef?.value?.getEchartsInstance?.()
  if (!ec) throw new Error('Chart instance não disponível')
  return ec
}

function getDataURL(type = 'png') {
  return getEC().getDataURL({
    type,
    pixelRatio: props.pixelRatio,
    backgroundColor: props.bg
  })
}

async function copyPng() {
  try {
    const dataUrl = getDataURL('png')
    if ('ClipboardItem' in window) {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    } else {
      await navigator.clipboard.writeText(dataUrl) // fallback
    }
  } catch (e) {
    console.error(e)
    alert('Não foi possível copiar a imagem.')
  }
}

function download(type = 'png') {
  try {
    const dataUrl = getDataURL(type)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${props.filename}.${type === 'jpeg' ? 'jpg' : type}`
    a.click()
  } catch (e) {
    console.error(e)
    alert('Falha ao gerar download.')
  }
}

async function downloadPdf() {
  try {
    const { jsPDF } = await import('jspdf')
    const ec = getEC()
    const { width, height } = ec.getDom().getBoundingClientRect()
    const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' })

    const pageW = doc.internal.pageSize.getWidth()
    const margin = 24
    const maxW = pageW - margin * 2
    const scale = maxW / width

    const dataUrl = getDataURL('png')
    doc.addImage(dataUrl, 'PNG', margin, margin, maxW, height * scale)
    doc.save(`${props.filename}.pdf`)
  } catch (e) {
    console.error(e)
    alert('Falha ao gerar PDF.')
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button class="px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="copyPng" title="Copiar imagem do gráfico">
      <i class="fas fa-copy"></i>
    </button>
    <button class="px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="download('png')" title="Baixar PNG">
      <i class="fas fa-file-image"></i>
    </button>
    <button class="px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="download('jpeg')" title="Baixar JPG">
      <i class="fas fa-file"></i>
    </button>
    <button class="px-2 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="downloadPdf" title="Baixar PDF">
      <i class="fas fa-file-pdf"></i>
    </button>
  </div>
</template>
