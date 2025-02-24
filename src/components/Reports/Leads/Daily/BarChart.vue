<template>
  <div class="bg-gray-200 dark:bg-gray-700 rounded-xl shadow-md px-2 md:px-8 py-2 md:py-4 m-2">
    <h1 class="text-lg md:text-2xl font-bold text-center">Relatório Diário de Leads</h1>

    <div class="my-1 w-60 mx-auto">
      <Select classes="!text-sm md:!text-md !py-1 text-center" v-model="empreendimentoSelecionado"
        :options="empreendimentosUnicos" placeholder="Selecionar Empreendimento" required />
    </div>
    <div class="my-2 w-60 mx-auto flex flex-col">
      <input type="date" v-model="dataSelecionada" :max="dataHoje"
        class="px-2 py-1 text-sm text-center border mx-auto text-gray-700 dark:text-gray-300 placeholder:text-gray-200 dark:bg-gray-500 border-gray-100 dark:border-gray-600 rounded-lg shadow-sm w-3/6" />
    </div>

    <div class="relative">
      <div class="text-3xl absolute right-0 -top-5">
        <i class="far fa-file-image cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
          @click="salvarComoImagem"></i>
      </div>
      <BarChart ref="chartDiario" class="h-[36vh]" :chart-data="chartData" :options="chartOptions"
        @click="abrirModalLeads" />
    </div>

    <LoadingComponents v-if="carregando" /> 
    <!-- Modal de Leads -->
  </div>
  <ModalLeads :leads="leadsDoDia" :modalVisivel="modalVisivel" @update:modalVisivel="modalVisivel = $event" /> 
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { BarChart } from 'vue-chart-3';
import { Chart as ChartJS, registerables } from 'chart.js';
import LoadingComponents from '../../../Loading/LoadingComponents.vue';
import Select from '../../../../components/UI/Select.vue';
import ModalLeads from '../components/ModalLeads.vue';
import { useLeadsStore } from '../../../../stores/Lead/leadStore';

const leadsStore = useLeadsStore();
const carregando = ref(true);
const chartDiario = ref(null);
const dataHoje = new Date().toISOString().split('T')[0]; // Data atual formatada
const dataSelecionada = ref(dataHoje); // Inicializa com a data de hoje 
const modalVisivel = ref(false); // Controle de visibilidade do modal
const leadsDoDia = ref([]); // Lista de leads que será exibida no modal

watchEffect(() => {
  if (leadsStore.leads.length > 0) {
    carregando.value = false;
  }
});

ChartJS.register(...registerables);

const empreendimentoSelecionado = ref('');

const empreendimentosUnicos = computed(() => {
  const nomesUnicos = new Map();
  leadsStore.leads.forEach((lead) => {
    lead.empreendimento.forEach((emp) => {
      if (!nomesUnicos.has(emp.id)) {
        nomesUnicos.set(emp.id, emp);
      }
    });
  });
  return [{ value: '', label: 'Todos' }, ...Array.from(nomesUnicos.values()).map(emp => ({
    value: emp.nome,
    label: emp.nome
  }))];
});

const obterResumoLeads = (leads, data) => {
  const ajustarParaFusoLocal = (date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate;
  };

  const inicioSelecionado = ajustarParaFusoLocal(`${data}T00:00:00`);
  const fimSelecionado = ajustarParaFusoLocal(`${data}T23:59:59`);

  const diaAnterior = new Date(inicioSelecionado);
  diaAnterior.setDate(diaAnterior.getDate() - 1);
  const inicioAnterior = ajustarParaFusoLocal(`${diaAnterior.toISOString().split('T')[0]}T00:00:00`);
  const fimAnterior = ajustarParaFusoLocal(`${diaAnterior.toISOString().split('T')[0]}T23:59:59`);

  const leadsDiaSelecionado = leads.filter((lead) => {
    const dataLead = ajustarParaFusoLocal(lead.data_cad);
    return dataLead >= inicioSelecionado && dataLead <= fimSelecionado;
  });

  const leadsDiaAnterior = leads.filter((lead) => {
    const dataLead = ajustarParaFusoLocal(lead.data_cad);
    return dataLead >= inicioAnterior && dataLead <= fimAnterior;
  });

  return {
    diaSelecionado: leadsDiaSelecionado.length,
    diaAnterior: leadsDiaAnterior.length,
    leadsDiaSelecionado,
    leadsDiaAnterior,
  };
};

const resumoLeads = computed(() =>
  obterResumoLeads(filtrarLeadsPorEmpreendimento(leadsStore.leads), dataSelecionada.value)
);

const filtrarLeadsPorEmpreendimento = (leads) => {
  if (empreendimentoSelecionado.value) {
    return leads.filter((lead) =>
      lead.empreendimento.some((emp) => emp.nome === empreendimentoSelecionado.value)
    );
  }
  return leads;
};

const chartData = computed(() => {
  return {
    labels: ['Dia Anterior', 'Dia Selecionado'],
    datasets: [
      {
        label: 'Leads',
        borderColor: ['#e74c3c', '#3498db'],
        borderWidth: 4,
        backgroundColor: 'transparent',
        data: [resumoLeads.value.diaAnterior, resumoLeads.value.diaSelecionado],
      },
    ],
  };
});

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      display: true,
      labels: {
        color: '#999',
        font: {
          size: 16,
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#999',
      },
    },
    y: {
      ticks: {
        color: '#999',
      },
    },
  },
});

const salvarComoImagem = () => {
  const canvas = chartDiario.value.$el.querySelector('canvas');
  const link = document.createElement('a');
  link.download = 'relatorio_diario.png';
  link.href = canvas.toDataURL();
  link.click();
};

// Abre o modal com os leads do dia selecionado
const abrirModalLeads = (event) => {
  const chart = chartDiario.value.chartInstance;
  const pontosClicados = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);

  if (pontosClicados.length) {
    const index = pontosClicados[0].index;
    if (index === 1) {
      leadsDoDia.value = resumoLeads.value.leadsDiaSelecionado;
    } else if (index === 0) {
      leadsDoDia.value = resumoLeads.value.leadsDiaAnterior;
    }
    modalVisivel.value = true;
  }
};
</script>
