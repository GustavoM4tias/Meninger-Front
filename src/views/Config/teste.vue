<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { MapChart, ScatterChart, EffectScatterChart } from 'echarts/charts'
import { TooltipComponent, VisualMapComponent, GeoComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, MapChart, ScatterChart, EffectScatterChart, TooltipComponent, VisualMapComponent, GeoComponent])

const cidades = [
    { name: 'Marília', siglaUF: 'SP', value: [-49.95, -22.217, 78] },
    { name: 'Garça', siglaUF: 'SP', value: [-49.656, -22.212, 64] },
    { name: 'Vera Cruz', siglaUF: 'SP', value: [-49.82, -22.22, 52] },
    { name: 'Bauru', siglaUF: 'SP', value: [-49.06, -22.314, 70] },
    { name: 'Bady Bassitt', siglaUF: 'SP', value: [-49.437, -20.918, 58] },
    { name: 'Jacarezinho', siglaUF: 'PR', value: [-49.973, -23.159, 61] },
    { name: 'Dourados', siglaUF: 'MS', value: [-54.812, -22.223, 65] },
    { name: 'Cuiabá', siglaUF: 'MT', value: [-56.097, -15.601, 72] },
    { name: 'Sinop', siglaUF: 'MT', value: [-55.51, -11.86, 66] },
]

const sizeByValue = (v) => v == null ? 10 : 8 + (Math.max(0, Math.min(100, v)) / 100) * 14
const option = ref(null)

async function carregarGeoJSON() {
    // 1) IBGE v3 – país com intrarregião UF (GeoJSON, qualidade intermediária)
    const urlIBGE = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=intermediaria&formato=application/vnd.geo+json'
    try {
        const r = await fetch(urlIBGE)
        if (r.ok) return await r.json()
        console.warn('IBGE não OK:', r.status, await r.text())
    } catch (e) {
        console.warn('Falha ao chamar IBGE:', e)
    }

    // 2) Fallback: GeoJSON de UFs (GitHub “click_that_hood”)
    // Obs.: é comunitário; serve bem para visualização.
    const urlFallback = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'
    const r2 = await fetch(urlFallback)
    if (!r2.ok) throw new Error('Falha no fallback GeoJSON: ' + r2.status)
    return await r2.json()
}

onMounted(async () => {
    const brUF = await carregarGeoJSON()
    echarts.registerMap('BR', brUF)

    option.value = {
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                const v = Array.isArray(p.data?.value) ? p.data.value[2] : undefined
                const sigla = p.data?.siglaUF ? ` (${p.data.siglaUF})` : ''
                const nome = p.name ?? p.data?.name ?? ''
                return `<div class="p-1"><div class="font-semibold">${nome}${sigla}</div><div class="text-sm">${v ?? '—'}</div></div>`
            }
        },
        geo: {
            map: 'BR',
            roam: true,
            itemStyle: { areaColor: '#EEF2FF', borderColor: '#FFFFFF', borderWidth: 1 },
            emphasis: { itemStyle: { areaColor: '#E0E7FF' } },
            center: [-55, -15],
            zoom: 1.1
        },
        visualMap: {
            min: 0, max: 100, orient: 'vertical', right: 10, bottom: 20,
            text: ['Alto', 'Baixo'], calculable: true,
            inRange: { color: ['#BBCEFC', '#2765F5', '#052570'] },
            seriesIndex: [1, 2]
        },
        series: [
            { type: 'map', map: 'BR', geoIndex: 0, zlevel: 0, emphasis: { label: { show: false } } },
            {
                name: 'Cidades', type: 'scatter', coordinateSystem: 'geo', data: cidades,
                symbolSize: (val) => sizeByValue(val?.[2]),
                itemStyle: { borderColor: '#FFFFFF', borderWidth: 1, shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' },
                label: { show: false }
            },
            {
                name: 'Destaque', type: 'effectScatter', coordinateSystem: 'geo', data: cidades,
                symbolSize: (val) => Math.max(10, sizeByValue(val?.[2]) - 2),
                showEffectOn: 'render', rippleEffect: { scale: 3 }, itemStyle: { opacity: 0.9 }, zlevel: 1
            }
        ]
    }
})
</script>

<template>
    <div class="h-full w-full rounded-2xl shadow overflow-hidden">
        <VChart v-if="option" :option="option" autoresize class="h-full w-full" />
    </div>
</template>
