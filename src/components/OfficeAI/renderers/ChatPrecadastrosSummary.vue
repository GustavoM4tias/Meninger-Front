<script setup>
/**
 * Resposta da Eme sobre pré-cadastros.
 * ─────────────────────────────────────────────────────────────────────────────
 * Fala a MESMA linguagem da tela de Pré-Cadastros: o mesmo funil, as mesmas
 * cores por fase, a mesma escala de número. Quem pergunta para a Eme e depois
 * abre o relatório tem que reconhecer a resposta - antes eram dois desenhos
 * diferentes do mesmo dado (aqui, seis cards índigo/roxo/âmbar/esmeralda; lá,
 * o funil).
 *
 * Antes: três grades de cards empilhadas (6 contagens + 3 taxas + 2 tempos =
 * onze caixas) numa bolha de chat de 600px, com paleta própria e cor fixa que
 * quebrava no tema claro.
 *
 * Agora: o número, o funil e as taxas em linha. Um bloco só.
 */
import { computed } from 'vue';
import Panel from '@/components/UI/Panel.vue';
import FunnelStrip from '@/components/UI/FunnelStrip.vue';
import MetricInline from '@/components/UI/MetricInline.vue';
import { useCountUp } from '@/composables/useCountUp';
import { STAGE_GROUPS } from '@/views/Office/Comercial/Precadastros/stages.js';

const props = defineProps({
  action: { type: Object, required: true },
});

const a = computed(() => props.action || {});
const total = computed(() => Number(a.value.total ?? 0));
const { display: totalContado, counting } = useCountUp(total, { duration: 900 });

const nf = new Intl.NumberFormat('pt-BR');
const fmtPct = (v) => `${Number(v).toFixed(1)}%`;
const fmtDias = (v) => `${Number(v).toFixed(1)}d`;

/* O título vem pronto do backend ("Pré-cadastros - 01/08/2026 a 31/08/2026").
   Aqui ele é quebrado em nome e período, para o período virar subtítulo em vez
   de esticar o cabeçalho. */
const partesTitulo = computed(() => {
  const t = String(a.value.title || 'Pré-cadastros');
  const sep = t.indexOf(' - ');
  return sep === -1
    ? { nome: t, periodo: '' }
    : { nome: t.slice(0, sep), periodo: t.slice(sep + 3) };
});

/* As fases, na ordem do funil e com a cor do bucket - a mesma de stages.js,
   que é a mesma da tela e a mesma dos gráficos. */
const grupo = (k) => STAGE_GROUPS.find((g) => g.key === k) || STAGE_GROUPS[STAGE_GROUPS.length - 1];

const etapas = computed(() => [
  { ...grupo('em_analise'), count: Number(a.value.em_analise ?? 0) },
  { ...grupo('documentacao'), count: Number(a.value.documentacao ?? 0) },
  { ...grupo('aprovado'), count: Number(a.value.aprovado_sem_reserva ?? 0) },
  { ...grupo('reserva'), count: Number(a.value.reserva ?? 0) },
  { ...grupo('reprovado'), count: Number(a.value.reprovado ?? 0) },
  { ...grupo('outros'), count: Number(a.value.outros ?? 0) },
].filter((e) => e.count > 0 || e.key !== 'outros'));

const metricas = computed(() => {
  const m = [
    {
      key: 'aprov', label: 'Aprovação', icon: 'fas fa-check-double', tone: 'pos',
      raw: Number(a.value.taxa_aprovacao ?? 0), format: fmtPct, decimals: 1,
      hint: `${nf.format(a.value.aprovados ?? 0)} pastas`,
      tooltip: 'Aprovados mais em reserva, dividido pelo total',
    },
    {
      key: 'reserva', label: 'Conversão em reserva', icon: 'fas fa-bookmark',
      raw: Number(a.value.taxa_conv_reserva ?? 0), format: fmtPct, decimals: 1,
      hint: `${nf.format(a.value.reserva ?? 0)} viraram reserva`,
    },
    {
      key: 'reprov', label: 'Reprovação', icon: 'fas fa-circle-xmark', tone: 'neg',
      raw: Number(a.value.taxa_reprovacao ?? 0), format: fmtPct, decimals: 1,
      hint: `${nf.format(a.value.reprovado ?? 0)} reprovadas`,
    },
  ];
  /* Tempo só entra quando existe: "0,0 dias" mente sobre um período sem
     nenhuma pasta finalizada. */
  if (a.value.tempo_medio_finalizar != null) {
    m.push({
      key: 'tempo', label: 'Tempo até finalizar', icon: 'fas fa-stopwatch',
      raw: Number(a.value.tempo_medio_finalizar), format: fmtDias, decimals: 1,
      hint: a.value.tempo_medio_em_analise != null
        ? `em curso: ${fmtDias(a.value.tempo_medio_em_analise)}`
        : '',
      tooltip: 'Média de dias das pastas que já tiveram desfecho',
    });
  }
  return m;
});

const vazio = computed(() => total.value === 0);
</script>

<template>
  <Panel :padded="false" class="mt-1 overflow-hidden">
    <template #title>{{ partesTitulo.nome }}</template>
    <template v-if="partesTitulo.periodo" #subtitle>{{ partesTitulo.periodo }}</template>

    <div v-if="vazio" class="p-4 text-xs text-ink-muted text-center">
      Nenhum pré-cadastro encontrado no período com esses filtros.
    </div>

    <template v-else>
      <div class="p-4 pb-3 space-y-4">
        <div class="min-w-0">
          <p class="metric-label">Pastas no período</p>
          <p class="metric text-metric leading-none mt-1 transition-colors duration-420"
            :class="counting ? 'metric-counting' : ''">
            {{ nf.format(totalContado) }}
          </p>
        </div>

        <!-- Não é clicável aqui: a bolha de chat responde, quem age é o bloco
             de ações logo abaixo (ChatPrecadastrosActions), que leva para o
             relatório já filtrado. -->
        <FunnelStrip :stages="etapas" :total="total" :clickable="false" unit="pastas" />
      </div>

      <MetricInline :items="metricas" />
    </template>
  </Panel>
</template>
