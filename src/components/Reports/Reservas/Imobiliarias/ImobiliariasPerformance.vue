<script setup>
import { computed, ref, watch } from 'vue'

// Props e eventos
const props = defineProps({ reservas: Array })
const emit = defineEmits(['show-imobiliaria-click'])

// Estado para armazenar a imobiliária selecionada
const selectedImobiliaria = ref('')

// Agrupa por imobiliária e acumula total e count
const agrupamentoImobiliarias = computed(() => {
  return props.reservas.reduce((acc, r) => {
    const imob = r.corretor?.imobiliaria || 'N/A'
    const valor = parseFloat(r.condicoes?.valor_contrato) || 0
    if (!acc[imob]) acc[imob] = { count: 0, total: 0 }
    acc[imob].count++
    acc[imob].total += valor
    return acc
  }, {})
})

// Lista de todas as imobiliárias para o select
const imobiliariaOptions = computed(() => {
  return Object.keys(agrupamentoImobiliarias.value).map(imob => ({
    value: imob,
    label: imob
  }))
})

// Dados filtrados baseados na seleção (se houver)
const sortedData = computed(() => {
  let dados = Object.entries(agrupamentoImobiliarias.value)

  // Filtrar por imobiliária selecionada se houver
  if (selectedImobiliaria.value) {
    dados = dados.filter(([imob]) => imob === selectedImobiliaria.value)
  }

  // Ordenar por valor total
  return dados.sort((a, b) => b[1].total - a[1].total)
})

// Mapeia cada imobiliária para as contagens por empreendimento
const breakdown = computed(() => {
  const data = {}
  props.reservas.forEach(r => {
    const imob = r.corretor?.imobiliaria || 'N/A'
    // Se tiver filtro de imobiliária e não for a selecionada, pula
    if (selectedImobiliaria.value && imob !== selectedImobiliaria.value) return

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

// Reset do filtro
const resetFiltro = () => {
  selectedImobiliaria.value = ''
}

// Quando seleciona uma imobiliária no dropdown
const onImobiliariaChange = () => {
  if (selectedImobiliaria.value) {
    // Se desejamos mostrar detalhes automaticamente ao selecionar
    const filtradas = props.reservas.filter(
      r => (r.corretor?.imobiliaria || 'N/A') === selectedImobiliaria.value
    )
    emit('show-imobiliaria-click', filtradas)
  }
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
  grid: { left: '1%', right: '1%', bottom: '0', top: '25', containLabel: true },
  xAxis: { type: 'value', minInterval: 1, boundaryGap: [0, 0.01] },
  yAxis: {
    type: 'category',
    data: labels.value,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: '12px', overflow: 'truncate', width: 120 }
  },
  series: [{
    name: 'Reservas',
    type: 'bar',
    data: reservasCount.value,
    itemStyle: { color: '#2563EB', borderRadius: [0, 5, 5, 0] },
    emphasis: { itemStyle: { color: '#1D4ED8' } }
  }]
}))

// Formatação de moeda
const formatMoney = val =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
</script>

<template>
  <div class="h-full w-full rounded-lg p-4 relative">
    <!-- Filtro de imobiliária -->
    <div class="mb-4 flex items-center justify-end gap-2 absolute right-0 pe-5 z-10">
      <button v-if="selectedImobiliaria" @click="resetFiltro"
        class="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
        title="Limpar filtro">
        <i class="fas fa-times"></i>
      </button>

      <div class="select flex relative w-64 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <select v-model="selectedImobiliaria" @change="onImobiliariaChange"
          class="w-full py-2 px-3 border rounded-lg appearance-none focus:outline-none z-10 bg-transparent border-gray-500 pe-10 text-center">
          <option value="">Todas as Imobiliárias</option>
          <option class="text-gray-800" v-for="option in imobiliariaOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <i class="fas fa-chevron-down top-[32%] absolute right-3 inset-y-0 pointer-events-none"></i>
      </div>

    </div>

    <!-- Gráfico -->
    <v-chart :option="chartOptions" autoresize class="h-[calc(100%-3rem)] w-full" @click="onChartClick" />
  </div>
</template>