<script setup>
import { computed } from 'vue'

// Props e eventos
const props = defineProps({ reservas: Array })
const emit = defineEmits(['show-imobiliaria-click'])

// Agrupa por imobiliária e acumula total e count
const sortedData = computed(() => {
  const agrupado = props.reservas.reduce((acc, r) => {
    const imob = r.corretor?.imobiliaria || 'N/A'
    const valor = parseFloat(r.condicoes?.valor_contrato) || 0
    if (!acc[imob]) acc[imob] = { count: 0, total: 0 }
    acc[imob].count++
    acc[imob].total += valor
    return acc
  }, {})

  return Object.entries(agrupado)
    .sort((a, b) => b[1].total - a[1].total)
})

// Mapeia cada imobiliária para as contagens por empreendimento
const breakdown = computed(() => {
  const data = {}
  props.reservas.forEach(r => {
    const imob = r.corretor?.imobiliaria || 'N/A'
    const emp = r.unidade?.empreendimento || 'N/A'
    data[imob] = data[imob] || {}
    data[imob][emp] = (data[imob][emp] || 0) + 1
  })
  return data
})

// Labels e valores para barras
const labels = computed(() => sortedData.value.map(([k]) => k))
const reservasCount = computed(() => sortedData.value.map(([, v]) => v.count))
const valores = computed(() => sortedData.value.map(([, v]) => v.total))

// Clique na barra: filtra e emite
const onChartClick = (params) => {
  const imob = params.name
  const filtradas = props.reservas.filter(
    r => (r.corretor?.imobiliaria || 'N/A') === imob
  )
  emit('show-imobiliaria-click', filtradas)
}

// Opções do gráfico com tooltip customizado
const chartOptions = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params) => {
      const p = params[0]
      const imob = p.name
      const totalCount = p.value
      const totalValor = valores.value[p.dataIndex]
      let html = `<strong>${imob}</strong><br/><br/>`
      const detalhe = breakdown.value[imob] || {}
      html += Object.entries(detalhe)
        .map(([emp, qtd]) => `${emp}: <strong>${qtd} reserva${qtd > 1 ? 's' : ''}</strong>`)
        .join('<br/>')
      html += `<br/><br/>Total de Reservas: <strong>${totalCount}</strong><br/>Valor Total: <strong>${formatMoney(totalValor)}</strong>`
      return html
    }
  },
  grid: { left: '1%', right: '1%', bottom: '1%', top: '1%', containLabel: true },
  xAxis: { type: 'value', minInterval: 1, boundaryGap: [0, 0.01] },
  yAxis: {
    type: 'category',
    data: labels.value,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { overflow: 'truncate', width: 120 }
  },
  series: [{
    name: 'Reservas',
    type: 'bar',
    data: reservasCount.value,
    itemStyle: { color: '#2563EB', borderRadius: [0,5,5,0] },
    emphasis: { itemStyle: { color: '#1D4ED8' } }
  }]
}))

// Formatação de moeda
const formatMoney = val =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
</script>

<template>
  <div class="h-[95%] w-full mt-4 rounded-lg p-6">
    <v-chart
      :option="chartOptions"
      autoresize
      class="h-full w-full"
      @click="onChartClick"
    />
  </div>
</template>
