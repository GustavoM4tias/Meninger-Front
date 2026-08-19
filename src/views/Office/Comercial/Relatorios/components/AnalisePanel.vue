<script setup>
// Base das guias analíticas (Leads, Imobiliárias, Corretores).
//
// Diferença para as guias de Faturamento e Projeção: estas dependem de reserva,
// corretor e lead de captação, que o dashboard não traz - de propósito, para não
// pesar. Usam a visão `ranking`, que resolve esses vínculos mas devolve só o que
// o ranking consome. Por isso o carregamento é explícito e mostrado ao usuário.
//
// Os VALORES vêm sempre do contractsStore (valuePicker), nunca recalculados
// aqui: é o mesmo VGV da guia de Faturamento, respeitando VGV / VGV+DC.
import { ref, computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

import DashboardFilters from '@/views/Office/Comercial/Faturamento/components/DashboardFilters.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Button from '@/components/UI/Button.vue';

const contractsStore = useContractsStore();

const carregando = ref(true);
const erro = ref('');

// As regras de valor são garantidas dentro do próprio fetchContracts
// (contractsStore.ensureRules), então trocar de guia não tem como calcular VGV
// com regra faltando. Aqui só tratamos a falha para a tela não mostrar número
// pela metade.
async function carregar() {
  carregando.value = true;
  erro.value = '';
  try {
    // `ranking`: mesma resolução de reserva/corretor/lead da visão de detalhe,
    // porém sem o pacote inteiro do CV (condições, mensagens, documentos,
    // histórico). Corta ~73% dos bytes sem perder nada que o ranking use.
    await contractsStore.fetchContracts({ view: 'ranking' });
  } catch (e) {
    erro.value = e?.message || 'Não foi possível carregar o detalhamento.';
  } finally {
    carregando.value = false;
  }
}

// A primeira carga espera o 'ready' do DashboardFilters (filtro da URL já
// aplicado no store). Buscar no onMounted daqui faria a consulta sair com o
// período padrão e ser refeita em seguida — lento e piscando o mês errado.
async function onFiltroMudou() { await carregar(); }

const vendas = computed(() => contractsStore.uniqueSales || []);
const valorDe = (sale) => contractsStore.valuePicker(sale);

// Sem nenhum contrato com reserva resolvida não há o que ranquear - e é
// importante dizer isso em vez de mostrar tabela vazia como se fosse zero.
const semDetalhe = computed(() =>
  vendas.value.length > 0 &&
  vendas.value.every((s) => !s?.contracts?.[0]?.reserva && !s?.contracts?.[0]?.repasse?.length));

defineExpose({ recarregar: carregar });
</script>

<template>
  <div class="space-y-4">
    <DashboardFilters @ready="carregar" @filter-changed="onFiltroMudou" />

    <div v-if="erro"
      class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
      <span class="flex items-center gap-2"><i class="fas fa-circle-exclamation"></i>{{ erro }}</span>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="carregar">Tentar novamente</Button>
    </div>

    <div v-else-if="carregando" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
      <Spinner size="lg" />
      <p class="text-sm">Carregando o detalhamento das vendas...</p>
      <p class="text-xs text-ink-subtle max-w-sm text-center">
        Esta análise cruza contrato, reserva e lead. Períodos longos e muitos
        empreendimentos demoram mais - filtre para acelerar.
      </p>
    </div>

    <div v-else-if="semDetalhe"
      class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
      <i class="fas fa-triangle-exclamation mr-2"></i>
      Nenhuma venda do período casou com uma reserva do CV, então não há corretor,
      imobiliária nem lead para analisar.
    </div>

    <slot v-else :vendas="vendas" :valor-de="valorDe" />
  </div>
</template>
