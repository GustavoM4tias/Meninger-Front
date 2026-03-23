<template>
  <div class="space-y-5">

    <!-- Meta header -->
    <div class="flex flex-wrap items-center gap-3">
      <span v-if="report.sentimento_geral"
        :class="sentimentClass(report.sentimento_geral)"
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
        <i :class="sentimentIcon(report.sentimento_geral)"></i>
        {{ sentimentLabel(report.sentimento_geral) }}
      </span>
      <span v-if="report.duracao_real_min"
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
        <i class="fas fa-clock"></i> {{ report.duracao_real_min }} min
      </span>
      <div class="flex flex-wrap gap-1 ml-auto">
        <span v-for="tag in report.tags" :key="tag"
          class="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs">
          #{{ tag }}
        </span>
      </div>
    </div>

    <!-- Resumo executivo -->
    <section v-if="report.resumo">
      <h3 class="section-title"><i class="fas fa-align-left text-blue-500"></i> Resumo Executivo</h3>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{{ report.resumo }}</p>
      </div>
    </section>

    <!-- Pauta -->
    <section v-if="report.pauta?.length">
      <h3 class="section-title"><i class="fas fa-list-check text-indigo-500"></i> Pauta Discutida</h3>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="(item, i) in report.pauta" :key="i"
          class="flex items-start gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{{ i+1 }}</span>
          {{ item }}
        </div>
      </div>
    </section>

    <!-- KPIs -->
    <section v-if="report.kpis?.length">
      <h3 class="section-title"><i class="fas fa-chart-bar text-green-500"></i> KPIs & Métricas</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(kpi, i) in report.kpis" :key="i"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 truncate">{{ kpi.nome }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ kpi.valor }}</p>
          <p v-if="kpi.referencia" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Meta: {{ kpi.referencia }}</p>
          <p v-if="kpi.contexto" class="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">{{ kpi.contexto }}</p>
        </div>
      </div>
    </section>

    <!-- Decisões -->
    <section v-if="report.decisoes?.length">
      <h3 class="section-title"><i class="fas fa-gavel text-amber-500"></i> Decisões Tomadas</h3>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="(dec, i) in report.decisoes" :key="i"
          class="flex items-start gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          <i class="fas fa-check-circle text-amber-500 mt-0.5 shrink-0"></i>
          {{ dec }}
        </div>
      </div>
    </section>

    <!-- Ações -->
    <section v-if="report.acoes?.length">
      <h3 class="section-title"><i class="fas fa-bolt text-red-500"></i> Ações & Responsabilidades</h3>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-800/60 text-left">
              <th class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarefa</th>
              <th class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Responsável</th>
              <th class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Prazo</th>
              <th class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="(acao, i) in report.acoes" :key="i"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <td class="px-4 py-3 text-gray-800 dark:text-gray-200">{{ acao.tarefa }}</td>
              <td class="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{{ acao.responsavel || '—' }}</td>
              <td class="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{{ acao.prazo || '—' }}</td>
              <td class="px-4 py-3">
                <span :class="priorityClass(acao.prioridade)"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold">
                  {{ priorityLabel(acao.prioridade) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Checklist -->
    <section v-if="report.checklist?.length">
      <h3 class="section-title"><i class="fas fa-square-check text-teal-500"></i> Checklist</h3>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="(item, i) in checklistLocal" :key="i"
          class="flex items-center gap-3 px-4 py-3">
          <input type="checkbox" v-model="item.concluido"
            class="w-4 h-4 accent-teal-500 cursor-pointer shrink-0" />
          <span :class="item.concluido ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'"
            class="text-sm flex-1 transition-all">
            {{ item.item }}
          </span>
          <span v-if="item.responsavel" class="text-xs text-gray-400 shrink-0">{{ item.responsavel }}</span>
        </div>
      </div>
    </section>

    <!-- Próximos passos -->
    <section v-if="report.proximos_passos?.length">
      <h3 class="section-title"><i class="fas fa-arrow-right text-purple-500"></i> Próximos Passos</h3>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="(step, i) in report.proximos_passos" :key="i"
          class="flex items-start gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          <span class="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{{ i+1 }}</span>
          {{ step }}
        </div>
      </div>
    </section>

    <!-- Pontos de atenção -->
    <section v-if="report.pontos_atencao?.length">
      <h3 class="section-title"><i class="fas fa-triangle-exclamation text-orange-500"></i> Pontos de Atenção</h3>
      <div class="space-y-2">
        <div v-for="(ponto, i) in report.pontos_atencao" :key="i"
          class="flex items-start gap-3 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 text-sm text-orange-800 dark:text-orange-300">
          <i class="fas fa-exclamation-circle mt-0.5 shrink-0"></i>
          {{ ponto }}
        </div>
      </div>
    </section>

    <!-- Participantes -->
    <section v-if="report.participantes?.length">
      <h3 class="section-title"><i class="fas fa-users text-sky-500"></i> Participantes</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="(p, i) in report.participantes" :key="i"
          class="flex items-start gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            :style="{ background: avatarColor(p.nome, i) }">
            {{ (p.nome || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{{ p.nome }}</p>
            <p v-if="p.papel" class="text-xs text-gray-500 dark:text-gray-400">{{ p.papel }}</p>
            <p v-if="p.contribuicao" class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{{ p.contribuicao }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Print button -->
    <div class="flex justify-end pt-2">
      <button @click="printReport"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <i class="fas fa-print"></i> Imprimir / Exportar PDF
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ report: { type: Object, required: true } });

// Checklist reativo local (não salvo no backend — é visual)
const checklistLocal = ref([]);
watch(() => props.report.checklist, (list) => {
  checklistLocal.value = (list || []).map(item => ({ ...item }));
}, { immediate: true });

// ── Sentimento ────────────────────────────────────────────────────────────────
function sentimentLabel(s) {
  const m = { positivo: 'Positivo', neutro: 'Neutro', negativo: 'Negativo', misto: 'Misto' };
  return m[s] || s;
}
function sentimentIcon(s) {
  const m = { positivo: 'fas fa-face-smile', neutro: 'fas fa-face-meh', negativo: 'fas fa-face-frown', misto: 'fas fa-face-rolling-eyes' };
  return m[s] || 'fas fa-circle';
}
function sentimentClass(s) {
  const m = {
    positivo: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    neutro:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
    negativo: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    misto:    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  };
  return m[s] || m.neutro;
}

// ── Prioridade ────────────────────────────────────────────────────────────────
function priorityLabel(p) {
  const m = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  return m[p] || p || '—';
}
function priorityClass(p) {
  const m = {
    alta:  'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    media: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    baixa: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  };
  return m[p] || m.baixa;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
function avatarColor(name, i) { return PALETTE[i % PALETTE.length]; }

// ── Print ─────────────────────────────────────────────────────────────────────
function printReport() { window.print(); }
</script>

<style scoped>
.section-title {
  @apply flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 mb-2;
}
</style>
