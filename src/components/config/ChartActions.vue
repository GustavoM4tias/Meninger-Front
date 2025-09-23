<script setup>
import { ref, computed, onMounted } from 'vue'
import { getInstanceByDom } from 'echarts/core'
import { useToast } from 'vue-toastification';

const toast = useToast();

const props = defineProps({
    /** opcional: CSS selector ou HTMLElement do gráfico alvo */
    target: { type: [String, Object], default: null },
    filename: { type: String, default: 'grafico' },
    pixelRatio: { type: Number, default: 2 },
    bg: { type: String, default: '#ffffff' }
})

const root = ref(null)
let cachedEC = null

function findDomFromTarget() {
    if (!props.target) return null
    if (props.target instanceof HTMLElement) return props.target
    if (typeof props.target === 'string') return document.querySelector(props.target)
    return null
}

function findNearestEchartsDom() {
    // 1) se veio target, usa ele
    const targeted = findDomFromTarget()
    if (targeted) return targeted

    // 2) procura dentro do mesmo container do componente
    const hostEl = root.value?.parentElement ?? root.value
    if (!hostEl) return null

    // prioridade: elementos logo acima/ao lado do actions
    // a) checa irmãos anteriores
    let sib = root.value?.previousElementSibling
    while (sib) {
        if (sib.hasAttribute?.('_echarts_instance_')) return sib
        const inner = sib.querySelector?.('[_echarts_instance_]')
        if (inner) return inner
        sib = sib.previousElementSibling
    }
    // b) checa no container inteiro (último chart encontrado)
    const all = hostEl.querySelectorAll('[_echarts_instance_]')
    if (all.length) return all[all.length - 1]

    // 3) sobe ao ancestral e tenta achar
    let parent = hostEl.parentElement
    while (parent) {
        const found = parent.querySelector('[_echarts_instance_]')
        if (found) return found
        parent = parent.parentElement
    }

    return null
}

function resolveEC() {
    if (cachedEC) return cachedEC
    const dom = findNearestEchartsDom()
    if (!dom) return null
    cachedEC = getInstanceByDom(dom)
    return cachedEC
}

const isReady = computed(() => !!resolveEC())

function getDataURL(type = 'png') {
    const ec = resolveEC()
    if (!ec) throw new Error('Chart instance não disponível')
    return ec.getDataURL({
        type,
        pixelRatio: props.pixelRatio,
        backgroundColor: props.bg
    })
}

async function dataURLtoBlob(dataUrl) {
    const res = await fetch(dataUrl)
    return await res.blob()
}

async function copyPng() {
    try {
        const dataUrl = getDataURL('png')
        if ('ClipboardItem' in window && navigator.clipboard?.write) {
            const blob = await dataURLtoBlob(dataUrl)
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
            toast.success('Copiado para a área de transferência!');
        } else {
            await navigator.clipboard.writeText(dataUrl) // fallback
        }
    } catch (e) {
        console.error(e)
        toast.error('Não foi possível copiar a imagem.')
    }
}

async function download(type = 'png') {
    try {
        const dataUrl = getDataURL(type)
        const blob = await dataURLtoBlob(dataUrl)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${props.filename}.${type === 'jpeg' ? 'jpg' : type}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    } catch (e) {
        console.error(e)
        alert('Falha ao gerar download.')
    }
}

async function downloadPdf() {
    try {
        const { jsPDF } = await import('jspdf')
        const ec = resolveEC()
        if (!ec) throw new Error('Chart instance não disponível')

        const rect = ec.getDom().getBoundingClientRect()
        const width = rect.width || 800
        const height = rect.height || 450

        const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const margin = 24
        const maxW = pageW - margin * 2
        const maxH = pageH - margin * 2
        const scale = Math.min(maxW / width, maxH / height)

        const dataUrl = getDataURL('png')
        doc.addImage(
            dataUrl, 'PNG',
            (pageW - width * scale) / 2,
            (pageH - height * scale) / 2,
            width * scale,
            height * scale
        )
        doc.save(`${props.filename}.pdf`)
    } catch (e) {
        console.error(e)
        alert('Falha ao gerar PDF.')
    }
}

onMounted(() => {
    // força a resolução após montagem
    resolveEC()
})
</script>

<template>
    <div ref="root" class="flex items-center gap-2">
        <button
            class="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="copyPng" title="Copiar imagem do gráfico" v-tippy="'Copiar imagem do gráfico'">
            <i class="fas fa-copy"></i>
        </button>
        <button
            class="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="download('png')" title="Baixar PNG" v-tippy="'Baixar PNG'">
            <i class="fas fa-file-image"></i>
        </button>
        <button
            class="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="download('jpeg')" title="Baixar JPG" v-tippy="'Baixar JPG'">
            <i class="fas fa-file"></i>
        </button>
        <button
            class="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="!isReady" @click="downloadPdf" title="Baixar PDF" v-tippy="'Baixar PDF'">
            <i class="fas fa-file-pdf"></i>
        </button>
    </div>
</template>
