<script setup>
import { computed } from 'vue'

const props = defineProps({
  reservas: Array
})

// Agrupar e ordenar
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

// Labels e valores
const labels = computed(() => sortedData.value.map(([k]) => k))
const reservas = computed(() => sortedData.value.map(([, v]) => v.count))
const valores = computed(() => sortedData.value.map(([, v]) => v.total))

// Opções do gráfico
const chartOptions = computed(() => ({
  title: {
    // text: 'Desempenho por Imobiliária',
    // left: 'center',
    // textStyle: {
    //   fontSize: 18,
    //   fontWeight: 'bold'
    // }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const { name, value } = params[0]
      const total = valores.value[params[0].dataIndex]
      return `
        <strong>${name}</strong><br/>
        Reservas: ${value}<br/>
        Valor Total: ${formatMoney(total)}
      `
    }
  },
  grid: { left: '1%', right: '1%', bottom: '1%', top: '1%', containLabel: true },
  xAxis: {
    type: 'value',
    minInterval: 1, // <- Garante apenas números inteiros
//   axisLine: { lineStyle: { color: '#ccc' } },
//   splitLine: { lineStyle: { color: '#eee' } },
//   axisLabel: { color: '#666' },
    boundaryGap: [0, 0.01]
  },
  yAxis: {
    type: 'category',
    data: labels.value,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#555',
      fontSize: 12,
      overflow: 'truncate',
      width: 120
    }
  },
  series: [
    {
      name: 'Reservas',
      type: 'bar',
      data: reservas.value,
      itemStyle: {
        color: '#2563EB',
        borderRadius: [0, 5, 5, 0]
      },
      emphasis: {
        itemStyle: { color: '#1D4ED8' }
      }
    }
  ]
}))

const formatMoney = val =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)
</script>

<template> 
  <div class="h-[95%] w-full mt-4 rounded-lgp-6">
    <v-chart :option="chartOptions" autoresize class="h-full w-full" />
  </div>
</template>
