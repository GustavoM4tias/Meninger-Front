<template>
  <div class="space-y-5">

    <!-- Meta header -->
    <div class="flex flex-wrap items-center gap-2">
      <span v-if="report.sentimento_geral"
        :class="sentimentClass(report.sentimento_geral)"
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
        <i :class="sentimentIcon(report.sentimento_geral)"></i>
        {{ sentimentLabel(report.sentimento_geral) }}
      </span>
      <span v-if="report.duracao_real_min"
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-sunken text-ink-muted text-xs">
        <i class="fas fa-clock"></i> {{ report.duracao_real_min }} min
      </span>
      <!-- Confiabilidade abaixo de "alta" precisa aparecer: a ata inteira se lê com ressalva -->
      <span v-if="report.confiabilidade?.nivel && report.confiabilidade.nivel !== 'alta'"
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-data-warn/10 text-data-warn text-xs font-semibold"
        :title="report.confiabilidade.motivo || ''">
        <i class="fas fa-triangle-exclamation"></i> Transcrição com confiança {{ report.confiabilidade.nivel }}
      </span>
      <div class="flex flex-wrap gap-1 ml-auto">
        <span v-for="tag in (report.tags || []).slice(0, 6)" :key="tag"
          class="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
          #{{ tag }}
        </span>
      </div>
    </div>

    <!-- Destaques: o que um diretor lê no celular antes de abrir o resto -->
    <section v-if="report.destaques?.length">
      <h3 class="section-title"><i class="fas fa-star text-accent"></i> Destaques</h3>
      <div class="bg-surface-raised rounded-xl border border-line divide-y divide-line">
        <div v-for="(d, i) in report.destaques" :key="i"
          class="flex items-start gap-3 px-4 py-2.5 text-sm text-ink">
          <i class="fas fa-angle-right text-accent mt-1 shrink-0"></i>
          <span class="min-w-0">{{ d }}</span>
        </div>
      </div>
    </section>

    <!-- Panorama por tema: um card por bloco da reunião, com progresso vs meta -->
    <section v-if="temas.length">
      <h3 class="section-title"><i class="fas fa-table-cells-large text-accent"></i> Panorama por tema</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <div v-for="t in temas" :key="t.nome"
          class="bg-surface-raised rounded-xl border border-line p-4 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full shrink-0" :class="statusDot(t.status)"></span>
            <p class="text-sm font-semibold text-ink flex-1 min-w-0 truncate" :title="t.nome">{{ t.nome }}</p>
            <span class="text-micro font-semibold px-2 py-0.5 rounded-full shrink-0" :class="statusPill(t.status)">
              {{ statusLabel(t.status) }}
            </span>
          </div>
          <p v-if="t.resumo" class="text-xs text-ink-muted leading-relaxed">{{ t.resumo }}</p>

          <!-- Progresso vs meta (quando o tema tem número central) -->
          <div v-if="progresso(t)" class="mt-1">
            <div class="flex items-baseline justify-between text-xs mb-1">
              <span class="text-ink-subtle">{{ t.progresso.rotulo }}</span>
              <span class="text-ink font-semibold tabular-nums">
                {{ t.progresso.atual }} <span class="text-ink-subtle font-normal">/ {{ t.progresso.meta }} {{ t.progresso.unidade || '' }}</span>
              </span>
            </div>
            <div class="h-2 rounded-full bg-surface-sunken overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="barClass(t)"
                :style="{ width: pct(t) + '%' }"></div>
            </div>
            <p class="text-micro text-ink-subtle mt-0.5 text-right tabular-nums">{{ pct(t) }}%</p>
          </div>

          <!-- Quanto desta reunião pertence a este tema -->
          <div class="flex flex-wrap gap-1.5 mt-auto pt-1">
            <span v-if="contagem(t.nome).decisoes" class="text-micro px-1.5 py-0.5 rounded bg-surface-sunken text-ink-muted">
              {{ contagem(t.nome).decisoes }} decisão(ões)</span>
            <span v-if="contagem(t.nome).acoes" class="text-micro px-1.5 py-0.5 rounded bg-surface-sunken text-ink-muted">
              {{ contagem(t.nome).acoes }} ação(ões)</span>
            <span v-if="contagem(t.nome).pendencias" class="text-micro px-1.5 py-0.5 rounded bg-data-warn/10 text-data-warn">
              {{ contagem(t.nome).pendencias }} pendência(s)</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Resumo executivo -->
    <section v-if="report.resumo">
      <h3 class="section-title"><i class="fas fa-align-left text-accent"></i> Resumo Executivo</h3>
      <div class="bg-surface-raised rounded-xl border border-line p-4 space-y-3">
        <p v-for="(par, i) in paragrafos" :key="i"
          class="text-sm text-ink-muted leading-relaxed">{{ par }}</p>
      </div>
    </section>

    <!-- Decisões, agrupadas por tema -->
    <section v-if="report.decisoes?.length">
      <h3 class="section-title"><i class="fas fa-gavel text-data-warn"></i> Decisões Tomadas</h3>
      <div class="space-y-3">
        <div v-for="g in agrupar(report.decisoes)" :key="g.tema || '_'"
          class="bg-surface-raised rounded-xl border border-line overflow-hidden">
          <p v-if="g.tema" class="px-4 py-2 bg-surface-sunken/60 text-xs font-semibold text-ink-muted uppercase tracking-wide">{{ g.tema }}</p>
          <div class="divide-y divide-line">
            <div v-for="(dec, i) in g.items" :key="i"
              class="flex items-start gap-3 px-4 py-3 text-sm text-ink-muted">
              <i class="fas fa-check-circle text-data-warn mt-0.5 shrink-0"></i>
              <span class="min-w-0 flex-1">
                {{ texto(dec) }}
                <span v-if="ancora(dec)" class="block text-micro text-ink-subtle mt-0.5">{{ ancora(dec) }}</span>
              </span>
              <span v-if="dec?.confianca && dec.confianca !== 'alta'"
                class="text-micro text-data-warn border border-data-warn/30 rounded px-1.5 py-0.5 shrink-0"
                title="A transcrição não deixou isso totalmente claro">
                confiança {{ dec.confianca }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pendências (questões em aberto), agrupadas por tema -->
    <section v-if="report.questoes_abertas?.length">
      <h3 class="section-title"><i class="fas fa-circle-question text-accent"></i> Ficou em aberto</h3>
      <div class="space-y-3">
        <div v-for="g in agrupar(report.questoes_abertas)" :key="g.tema || '_'"
          class="bg-surface-raised rounded-xl border border-line overflow-hidden">
          <p v-if="g.tema" class="px-4 py-2 bg-surface-sunken/60 text-xs font-semibold text-ink-muted uppercase tracking-wide">{{ g.tema }}</p>
          <div class="divide-y divide-line">
            <div v-for="(q, i) in g.items" :key="i" class="px-4 py-3 text-sm">
              <p class="text-ink font-medium">{{ q.questao || q }}</p>
              <p v-if="q.o_que_falta" class="text-ink-muted mt-1">
                <i class="fas fa-arrow-right text-micro mr-1 text-ink-subtle"></i>{{ q.o_que_falta }}
              </p>
              <p class="text-micro mt-1">
                <span v-if="q.esperando" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-data-warn/10 text-data-warn font-semibold">
                  <i class="fas fa-hourglass-half"></i> Esperando {{ q.esperando }}
                </span>
                <span v-else-if="q.quem_levantou" class="text-ink-subtle">Levantado por {{ q.quem_levantou }}</span>
                <span v-if="q.minuto" class="text-ink-subtle"> · {{ q.minuto }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Ações: tabela no desktop, cards no celular -->
    <section v-if="report.acoes?.length">
      <h3 class="section-title"><i class="fas fa-bolt text-data-neg"></i> Ações & Responsabilidades</h3>

      <!-- Desktop -->
      <div class="hidden sm:block bg-surface-raised rounded-xl border border-line overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-sunken/60 text-left">
              <th class="px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">Tarefa</th>
              <th class="px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">Responsável</th>
              <th class="px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide hidden md:table-cell">Prazo</th>
              <th class="px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">Prioridade</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <template v-for="g in agrupar(report.acoes)" :key="g.tema || '_'">
              <tr v-if="g.tema">
                <td colspan="4" class="px-4 py-1.5 bg-surface-sunken/40 text-micro font-semibold text-ink-subtle uppercase tracking-wide">{{ g.tema }}</td>
              </tr>
              <tr v-for="(acao, i) in g.items" :key="i" class="hover:bg-surface-hover/30 transition-colors">
                <td class="px-4 py-3 text-ink">{{ acao.tarefa }}</td>
                <td class="px-4 py-3 text-ink-muted">{{ acao.responsavel || '-' }}</td>
                <td class="px-4 py-3 hidden md:table-cell">
                  <span v-if="acao.prazo" class="text-ink font-medium">{{ acao.prazo }}</span>
                  <span v-else class="text-ink-subtle">-</span>
                </td>
                <td class="px-4 py-3">
                  <span :class="priorityClass(acao.prioridade)"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold">
                    {{ priorityLabel(acao.prioridade) }}
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Mobile: card por ação, com alvo de toque confortável -->
      <div class="sm:hidden space-y-3">
        <div v-for="g in agrupar(report.acoes)" :key="g.tema || '_'">
          <p v-if="g.tema" class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">{{ g.tema }}</p>
          <div class="space-y-2">
            <div v-for="(acao, i) in g.items" :key="i"
              class="bg-surface-raised rounded-xl border border-line p-3">
              <p class="text-sm text-ink">{{ acao.tarefa }}</p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span :class="priorityClass(acao.prioridade)"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-micro font-semibold">
                  {{ priorityLabel(acao.prioridade) }}
                </span>
                <span v-if="acao.responsavel" class="text-micro text-ink-muted">
                  <i class="fas fa-user mr-1"></i>{{ acao.responsavel }}
                </span>
                <span v-if="acao.prazo" class="text-micro text-ink-muted">
                  <i class="fas fa-calendar mr-1"></i>{{ acao.prazo }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- KPIs, agrupados por tema, com barra quando há número vs meta -->
    <section v-if="report.kpis?.length">
      <h3 class="section-title"><i class="fas fa-chart-bar text-data-pos"></i> Números citados</h3>
      <div class="space-y-3">
        <div v-for="g in agrupar(report.kpis)" :key="g.tema || '_'">
          <p v-if="g.tema" class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">{{ g.tema }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="(kpi, i) in g.items" :key="i"
              class="bg-surface-raised rounded-xl border border-line p-4">
              <p class="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1">{{ kpi.nome }}</p>
              <p class="text-2xl font-bold text-ink tabular-nums">{{ kpi.valor }}</p>
              <p v-if="kpi.referencia" class="text-xs text-ink-muted mt-0.5">Referência: {{ kpi.referencia }}</p>
              <div v-if="kpiPct(kpi) !== null" class="mt-2">
                <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                  <div class="h-full rounded-full" :class="kpiPct(kpi) >= 100 ? 'bg-data-pos' : 'bg-accent'"
                    :style="{ width: Math.min(kpiPct(kpi), 100) + '%' }"></div>
                </div>
                <p class="text-micro text-ink-subtle mt-0.5 text-right tabular-nums">{{ kpiPct(kpi) }}% da referência</p>
              </div>
              <p v-if="kpi.contexto" class="text-xs text-ink-subtle mt-2 leading-relaxed">{{ kpi.contexto }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pontos de atenção -->
    <section v-if="report.pontos_atencao?.length">
      <h3 class="section-title"><i class="fas fa-triangle-exclamation text-data-warn"></i> Pontos de Atenção</h3>
      <div class="space-y-2">
        <div v-for="(ponto, i) in report.pontos_atencao" :key="i"
          class="flex items-start gap-3 px-4 py-3 rounded-xl bg-data-warn/10 border border-data-warn/25 text-sm text-data-warn">
          <i class="fas fa-exclamation-circle mt-0.5 shrink-0"></i>
          <span class="min-w-0 flex-1">
            {{ texto(ponto) }}
            <span class="block text-micro opacity-70 mt-0.5">
              <span v-if="ponto?.tema">{{ ponto.tema }}</span>
              <span v-if="ponto?.tema && ancora(ponto)"> · </span>{{ ancora(ponto) }}
            </span>
          </span>
        </div>
      </div>
    </section>

    <!-- Próximos passos -->
    <section v-if="report.proximos_passos?.length">
      <h3 class="section-title"><i class="fas fa-arrow-right text-accent"></i> Próximos Passos</h3>
      <div class="bg-surface-raised rounded-xl border border-line divide-y divide-line">
        <div v-for="(step, i) in report.proximos_passos" :key="i"
          class="flex items-start gap-3 px-4 py-3 text-sm text-ink-muted">
          <span class="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{{ i+1 }}</span>
          {{ step }}
        </div>
      </div>
    </section>

    <!-- Pauta e Checklist: só atas antigas trazem (a v2 substituiu pela visão por tema) -->
    <section v-if="!temas.length && report.pauta?.length">
      <h3 class="section-title"><i class="fas fa-list-check text-accent"></i> Pauta Discutida</h3>
      <div class="bg-surface-raised rounded-xl border border-line divide-y divide-line">
        <div v-for="(item, i) in report.pauta" :key="i"
          class="flex items-start gap-3 px-4 py-3 text-sm text-ink-muted">
          <span class="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{{ i+1 }}</span>
          {{ item }}
        </div>
      </div>
    </section>

    <section v-if="report.checklist?.length">
      <h3 class="section-title"><i class="fas fa-square-check text-series-3"></i> Checklist</h3>
      <div class="bg-surface-raised rounded-xl border border-line divide-y divide-line">
        <div v-for="(item, i) in checklistLocal" :key="i"
          class="flex items-center gap-3 px-4 py-3">
          <input type="checkbox" v-model="item.concluido"
            class="w-4 h-4 accent-teal-500 cursor-pointer shrink-0" />
          <span :class="item.concluido ? 'line-through text-ink-subtle' : 'text-ink-muted'"
            class="text-sm flex-1 transition-all">
            {{ item.item }}
          </span>
          <span v-if="item.responsavel" class="text-xs text-ink-subtle shrink-0">{{ item.responsavel }}</span>
        </div>
      </div>
    </section>

    <!-- Participantes -->
    <section v-if="report.participantes?.length">
      <h3 class="section-title"><i class="fas fa-users text-accent"></i> Participantes</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="(p, i) in report.participantes" :key="i"
          class="flex items-start gap-3 bg-surface-raised rounded-xl border border-line p-4">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            :style="{ background: avatarColor(p.nome, i) }">
            {{ (p.nome || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink truncate">{{ p.nome }}</p>
            <p v-if="p.papel" class="text-xs text-ink-muted">{{ p.papel }}</p>
            <p v-if="p.contribuicao" class="text-xs text-ink-muted mt-1 leading-relaxed">{{ p.contribuicao }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Ações do relatório -->
    <div class="flex items-center justify-end gap-2 pt-2 flex-wrap">
      <button @click="$emit('email')"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border border-line text-sm text-ink-muted hover:bg-surface-hover transition-colors">
        <i class="fas fa-envelope text-accent"></i> Enviar por e-mail
      </button>
      <button @click="printReport"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border border-line text-sm text-ink-muted hover:bg-surface-hover transition-colors">
        <i class="fas fa-file-pdf text-data-neg"></i> Exportar PDF
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

const props = defineProps({
  report:  { type: Object, required: true },
  meeting: { type: Object, default: null },
});

defineEmits(['email']);

// A ata mudou de forma duas vezes: texto puro -> objeto com âncora (quem/minuto)
// -> v2 com temas. As três formas continuam abrindo na mesma tela.
function texto(item) {
  if (typeof item === 'string') return item;
  return item?.texto || item?.ponto || item?.questao || '';
}

function ancora(item) {
  if (typeof item === 'string' || !item) return '';
  return [item.quem, item.minuto].filter(Boolean).join(' · ');
}

// ── Temas (v2) ────────────────────────────────────────────────────────────────

const temas = computed(() => Array.isArray(props.report.temas) ? props.report.temas : []);

const paragrafos = computed(() =>
  String(props.report.resumo || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
);

/** Agrupa uma lista pelo campo "tema", na ordem dos temas declarados.
 *  Itens sem tema (ou ata antiga, sem temas) ficam num grupo único sem título. */
function agrupar(list) {
  const items = list || [];
  if (!temas.value.length) return [{ tema: null, items }];

  const ordem = temas.value.map(t => t.nome);
  const porTema = new Map();
  const soltos = [];

  for (const item of items) {
    const nome = item?.tema && ordem.includes(item.tema) ? item.tema : null;
    if (!nome) { soltos.push(item); continue; }
    if (!porTema.has(nome)) porTema.set(nome, []);
    porTema.get(nome).push(item);
  }

  const grupos = ordem.filter(n => porTema.has(n)).map(n => ({ tema: n, items: porTema.get(n) }));
  if (soltos.length) grupos.push({ tema: grupos.length ? 'Geral' : null, items: soltos });
  return grupos;
}

function contagem(nome) {
  const conta = (list) => (list || []).filter(i => i?.tema === nome).length;
  return {
    decisoes:   conta(props.report.decisoes),
    acoes:      conta(props.report.acoes),
    pendencias: conta(props.report.questoes_abertas),
  };
}

// ── Progresso ─────────────────────────────────────────────────────────────────

function progresso(t) {
  const p = t?.progresso;
  return p && Number.isFinite(Number(p.atual)) && Number(p.meta) > 0 ? p : null;
}
function pct(t) {
  const p = progresso(t);
  if (!p) return 0;
  return Math.min(Math.round((Number(p.atual) / Number(p.meta)) * 100), 999);
}
function barClass(t) {
  if (pct(t) >= 100) return 'bg-data-pos';
  return t.status === 'critico' ? 'bg-data-neg' : t.status === 'atencao' ? 'bg-data-warn' : 'bg-accent';
}

function kpiPct(kpi) {
  const v = Number(kpi?.valor_num), m = Number(kpi?.meta_num);
  if (!Number.isFinite(v) || !(m > 0)) return null;
  return Math.min(Math.round((v / m) * 100), 999);
}

// ── Status do tema ────────────────────────────────────────────────────────────

function statusLabel(s) {
  return { ok: 'No rumo', atencao: 'Atenção', critico: 'Crítico' }[s] || 'Sem status';
}
function statusDot(s) {
  return { ok: 'bg-data-pos', atencao: 'bg-data-warn', critico: 'bg-data-neg' }[s] || 'bg-surface-sunken';
}
function statusPill(s) {
  return {
    ok:      'bg-data-pos/10 text-data-pos',
    atencao: 'bg-data-warn/10 text-data-warn',
    critico: 'bg-data-neg/10 text-data-neg',
  }[s] || 'bg-surface-sunken text-ink-muted';
}

// Checklist reativo local (só atas antigas; não salvo no backend, é visual)
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
    positivo: 'bg-data-pos/10 text-data-pos',
    neutro:   'bg-surface-sunken text-ink-muted',
    negativo: 'bg-data-neg/10 text-data-neg',
    misto:    'bg-data-warn/10 text-data-warn',
  };
  return m[s] || m.neutro;
}

// ── Prioridade ────────────────────────────────────────────────────────────────
function priorityLabel(p) {
  const m = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  return m[p] || p || '-';
}
function priorityClass(p) {
  const m = {
    alta:  'bg-data-neg/10 text-data-neg',
    media: 'bg-data-warn/10 text-data-warn',
    baixa: 'bg-surface-sunken text-ink-muted',
  };
  return m[p] || m.baixa;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
function avatarColor(name, i) { return PALETTE[i % PALETTE.length]; }

// ── Print / PDF - abre nova aba com HTML formatado e aciona impressão ─────────
// É PAPEL: cores fixas de impressão, fora do design system de propósito.
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDateStr(dt) {
  if (!dt) return '';
  const d = new Date(dt.replace?.('T',' ')?.split?.('.')?.[0] ?? dt);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const PRINT_STATUS = {
  ok:      { label: 'No rumo',  bg: '#dcfce7', fg: '#15803d' },
  atencao: { label: 'Atenção',  bg: '#fef3c7', fg: '#b45309' },
  critico: { label: 'Crítico',  bg: '#fee2e2', fg: '#b91c1c' },
};

function printReport() {
  const r  = props.report;
  const m  = props.meeting;
  const title = m?.subject || 'Relatório de Reunião';
  const grupos = (list) => agrupar(list);

  const grupoTitulo = (nome) => nome
    ? `<div class="grp">${esc(nome)}</div>` : '';

  const bulleted = (items, color = '#b45309') => items.map(item => {
    const t = esc(texto(item));
    const a = ancora(item);
    return `<div class="item"><span style="color:${color};margin-top:2px">●</span><span>${t}`
         + (a ? `<br><span class="anc">${esc(a)}</span>` : '')
         + `</span></div>`;
  }).join('');

  const temaCards = (temas.value || []).map(t => {
    const st = PRINT_STATUS[t.status] || { label: 'Sem status', bg: '#f3f4f6', fg: '#6b7280' };
    const p  = progresso(t);
    const pc = p ? Math.min(Math.round((Number(p.atual) / Number(p.meta)) * 100), 100) : null;
    return `<div class="tema">
      <div class="tema-head">
        <strong>${esc(t.nome)}</strong>
        <span class="pill" style="background:${st.bg};color:${st.fg}">${st.label}</span>
      </div>
      ${t.resumo ? `<div class="tema-resumo">${esc(t.resumo)}</div>` : ''}
      ${p ? `
        <div class="bar-meta"><span>${esc(p.rotulo || '')}</span><span><strong>${esc(String(p.atual))}</strong> / ${esc(String(p.meta))} ${esc(p.unidade || '')}</span></div>
        <div class="bar"><div class="bar-fill" style="width:${pc}%;background:${pc >= 100 ? '#16a34a' : st.fg}"></div></div>
      ` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;padding:40px;max-width:900px;margin:0 auto;font-size:13px}
  h1{font-size:20px;font-weight:700;margin-bottom:6px}
  .meta{color:#6b7280;font-size:12px;margin-bottom:20px}
  h2{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:26px 0 10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:6px;line-height:1.7;color:#374151}
  .tag{background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:9999px;font-size:11px;margin-right:4px;display:inline-block}
  .grp{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:12px 0 4px}
  .item{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #f3f4f6;align-items:flex-start;line-height:1.5;color:#374151}
  .anc{color:#9ca3af;font-size:11px}
  .num{width:22px;height:22px;min-width:22px;background:#ede9fe;color:#6d28d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{text-align:left;padding:8px 10px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:top}
  td.grp-row{background:#f9fafb;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;padding:5px 10px}
  .badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
  .alta{background:#fee2e2;color:#dc2626}
  .media{background:#fef3c7;color:#d97706}
  .baixa{background:#f3f4f6;color:#6b7280}
  .warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:6px;color:#9a3412;line-height:1.55}
  .pill{padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700}
  .tema-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:8px}
  .tema{border:1px solid #e5e7eb;border-radius:8px;padding:12px;break-inside:avoid}
  .tema-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;font-size:12px}
  .tema-resumo{font-size:11px;color:#6b7280;line-height:1.5;margin-bottom:6px}
  .bar-meta{display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:3px}
  .bar{height:7px;border-radius:9999px;background:#f3f4f6;overflow:hidden}
  .bar-fill{height:100%;border-radius:9999px}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:8px}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:14px;break-inside:avoid}
  .kpi-name{font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px}
  .kpi-val{font-size:22px;font-weight:700;color:#111827}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
  @media print{body{padding:20px}@page{margin:15mm}}
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">
    ${m?.start ? `${esc(fmtDateStr(m.start))}` : ''}
    ${m?.organizer?.name ? ` &nbsp;·&nbsp; ${esc(m.organizer.name)}` : ''}
    ${r.duracao_real_min ? ` &nbsp;·&nbsp; ${r.duracao_real_min} min` : ''}
    ${r.confiabilidade?.nivel && r.confiabilidade.nivel !== 'alta'
      ? ` &nbsp;·&nbsp; <span style="color:#b45309;font-weight:600">transcrição com confiança ${esc(r.confiabilidade.nivel)}</span>` : ''}
  </div>
  ${r.tags?.length ? `<div style="margin-bottom:16px">${r.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}

  ${r.destaques?.length ? `<h2>Destaques</h2>${r.destaques.map(d=>`<div class="item"><span style="color:#6d28d9">›</span><span>${esc(d)}</span></div>`).join('')}` : ''}

  ${temas.value.length ? `<h2>Panorama por tema</h2><div class="tema-grid">${temaCards}</div>` : ''}

  ${r.resumo ? `<h2>Resumo Executivo</h2><div class="card">${esc(r.resumo)}</div>` : ''}

  ${r.decisoes?.length ? `<h2>Decisões Tomadas</h2>${grupos(r.decisoes).map(g => grupoTitulo(g.tema) + bulleted(g.items, '#15803d')).join('')}` : ''}

  ${r.questoes_abertas?.length ? `<h2>Ficou em aberto</h2>${grupos(r.questoes_abertas).map(g => grupoTitulo(g.tema) + g.items.map(q =>
    `<div class="warn"><strong>${esc(q.questao || q)}</strong>`
    + (q.o_que_falta ? `<br>&rarr; ${esc(q.o_que_falta)}` : '')
    + (q.esperando || q.minuto
        ? `<br><span style="font-size:11px">${q.esperando ? `Esperando ${esc(q.esperando)}` : ''}${q.minuto ? ` · ${esc(q.minuto)}` : ''}</span>`
        : '')
    + `</div>`
  ).join('')).join('')}` : ''}

  ${r.acoes?.length ? `
  <h2>Ações & Responsabilidades</h2>
  <table>
    <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th></tr></thead>
    <tbody>${grupos(r.acoes).map(g =>
      (g.tema ? `<tr><td class="grp-row" colspan="4">${esc(g.tema)}</td></tr>` : '')
      + g.items.map(a=>`<tr>
        <td>${esc(a.tarefa)}</td>
        <td>${esc(a.responsavel||'-')}</td>
        <td>${esc(a.prazo||'-')}</td>
        <td><span class="badge ${a.prioridade||'baixa'}">${a.prioridade==='alta'?'Alta':a.prioridade==='media'?'Média':'Baixa'}</span></td>
      </tr>`).join('')
    ).join('')}</tbody>
  </table>` : ''}

  ${r.kpis?.length ? `
  <h2>Números citados</h2>
  ${grupos(r.kpis).map(g => grupoTitulo(g.tema) + `<div class="kpi-grid">${g.items.map(k=>`
    <div class="kpi">
      <div class="kpi-name">${esc(k.nome)}</div>
      <div class="kpi-val">${esc(String(k.valor))}</div>
      ${k.referencia?`<div style="font-size:11px;color:#6b7280">Referência: ${esc(k.referencia)}</div>`:''}
      ${k.contexto?`<div style="font-size:11px;color:#9ca3af;margin-top:4px">${esc(k.contexto)}</div>`:''}
    </div>`).join('')}
  </div>`).join('')}` : ''}

  ${r.pontos_atencao?.length ? `<h2>Pontos de Atenção</h2>${r.pontos_atencao.map(p=>{
    const extra = [p?.tema, ancora(p)].filter(Boolean).join(' · ');
    return `<div class="warn">${esc(texto(p))}${extra ? `<br><span style="font-size:11px;opacity:.75">${esc(extra)}</span>` : ''}</div>`;
  }).join('')}` : ''}

  ${r.proximos_passos?.length ? `<h2>Próximos Passos</h2>${r.proximos_passos.map((item, i) =>
    `<div class="item"><span class="num">${i+1}</span><span>${esc(item)}</span></div>`).join('')}` : ''}

  ${(!temas.value.length && r.pauta?.length) ? `<h2>Pauta Discutida</h2>${r.pauta.map((item, i) =>
    `<div class="item"><span class="num">${i+1}</span><span>${esc(item)}</span></div>`).join('')}` : ''}

  ${r.checklist?.length ? `<h2>Checklist</h2>${r.checklist.map(c=>`<div class="item"><span style="font-size:15px">☐</span><span>${esc(typeof c==='string'?c:c.item)}${c?.responsavel ? ` <span class="anc">(${esc(c.responsavel)})</span>` : ''}</span></div>`).join('')}` : ''}

  ${r.participantes?.length ? `
  <h2>Participantes</h2>
  <table>
    <thead><tr><th>Nome</th><th>Papel</th><th>Contribuição</th></tr></thead>
    <tbody>${r.participantes.map(p=>`<tr>
      <td><strong>${esc(p.nome)}</strong></td>
      <td>${esc(p.papel||'-')}</td>
      <td style="color:#6b7280">${esc(p.contribuicao||'-')}</td>
    </tr>`).join('')}</tbody>
  </table>` : ''}

  <div class="footer">
    Gerado por <strong>Menin Office AI</strong> · ${new Date().toLocaleDateString('pt-BR')}
    <div style="margin-top:8px;padding:8px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:11px;display:inline-block">
      Este conteúdo foi gerado por inteligência artificial e pode conter imprecisões. Revise as informações antes de utilizá-las.
    </div>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { toast.warning('Permita pop-ups para exportar o PDF.'); return; }
  win.document.write(html);
  win.document.close();
}
</script>

<style scoped>
.section-title {
  @apply flex items-center gap-2 text-sm font-bold text-ink mb-2;
}
</style>
