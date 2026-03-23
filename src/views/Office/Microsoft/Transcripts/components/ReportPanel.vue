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

    <!-- Ações do relatório -->
    <div class="flex items-center justify-end gap-2 pt-2 flex-wrap">
      <button @click="$emit('email')"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <i class="fas fa-envelope text-purple-500"></i> Enviar por e-mail
      </button>
      <button @click="printReport"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <i class="fas fa-file-pdf text-red-500"></i> Exportar PDF
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  report:  { type: Object, required: true },
  meeting: { type: Object, default: null },
});

defineEmits(['email']);

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

// ── Print / PDF — abre nova aba com HTML formatado e aciona impressão ──────────
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDateStr(dt) {
  if (!dt) return '';
  const d = new Date(dt.replace?.('T',' ')?.split?.('.')?.[0] ?? dt);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function printReport() {
  const r  = props.report;
  const m  = props.meeting;
  const title = m?.subject || 'Relatório de Reunião';

  const rows = (arr, cols) => arr.map(item =>
    `<tr>${cols.map(c => `<td>${esc(item[c] ?? '—')}</td>`).join('')}</tr>`
  ).join('');

  const numbered = (arr) => arr.map((item, i) =>
    `<div class="item"><span class="num">${i+1}</span><span>${esc(item)}</span></div>`
  ).join('');

  const bulleted = (arr, color='#f59e0b') => arr.map(item =>
    `<div class="item"><span style="color:${color};margin-top:2px">●</span><span>${esc(item)}</span></div>`
  ).join('');

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
  h2{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:6px;line-height:1.7;color:#374151}
  .tag{background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:9999px;font-size:11px;margin-right:4px;display:inline-block}
  .item{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;align-items:flex-start}
  .num{width:22px;height:22px;min-width:22px;background:#ede9fe;color:#6d28d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{text-align:left;padding:8px 10px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:top}
  .badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
  .alta{background:#fee2e2;color:#dc2626}
  .media{background:#fef3c7;color:#d97706}
  .baixa{background:#f3f4f6;color:#6b7280}
  .warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:6px;color:#9a3412}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:8px}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:14px}
  .kpi-name{font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px}
  .kpi-val{font-size:22px;font-weight:700;color:#111827}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
  @media print{body{padding:20px}@page{margin:15mm}}
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">
    ${m?.start ? `📅 ${fmtDateStr(m.start)}` : ''}
    ${m?.organizer?.name ? ` &nbsp;·&nbsp; 👤 ${esc(m.organizer.name)}` : ''}
    ${r.duracao_real_min ? ` &nbsp;·&nbsp; ⏱ ${r.duracao_real_min} min` : ''}
  </div>
  ${r.tags?.length ? `<div style="margin-bottom:16px">${r.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}

  ${r.resumo ? `<h2>📋 Resumo Executivo</h2><div class="card">${esc(r.resumo)}</div>` : ''}

  ${r.pauta?.length ? `<h2>📝 Pauta Discutida</h2>${numbered(r.pauta)}` : ''}

  ${r.decisoes?.length ? `<h2>✅ Decisões Tomadas</h2>${bulleted(r.decisoes)}` : ''}

  ${r.acoes?.length ? `
  <h2>⚡ Ações & Responsabilidades</h2>
  <table>
    <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th></tr></thead>
    <tbody>${r.acoes.map(a=>`<tr>
      <td>${esc(a.tarefa)}</td>
      <td>${esc(a.responsavel||'—')}</td>
      <td>${esc(a.prazo||'—')}</td>
      <td><span class="badge ${a.prioridade||'baixa'}">${a.prioridade==='alta'?'Alta':a.prioridade==='media'?'Média':'Baixa'}</span></td>
    </tr>`).join('')}</tbody>
  </table>` : ''}

  ${r.kpis?.length ? `
  <h2>📊 KPIs & Métricas</h2>
  <div class="kpi-grid">${r.kpis.map(k=>`
    <div class="kpi">
      <div class="kpi-name">${esc(k.nome)}</div>
      <div class="kpi-val">${esc(String(k.valor))}</div>
      ${k.referencia?`<div style="font-size:11px;color:#6b7280">Meta: ${esc(k.referencia)}</div>`:''}
      ${k.contexto?`<div style="font-size:11px;color:#9ca3af;margin-top:4px">${esc(k.contexto)}</div>`:''}
    </div>`).join('')}
  </div>` : ''}

  ${r.pontos_atencao?.length ? `<h2>⚠️ Pontos de Atenção</h2>${r.pontos_atencao.map(p=>`<div class="warn">${esc(p)}</div>`).join('')}` : ''}

  ${r.proximos_passos?.length ? `<h2>➡️ Próximos Passos</h2>${numbered(r.proximos_passos)}` : ''}

  ${r.checklist?.length ? `<h2>☑️ Checklist</h2>${r.checklist.map(c=>`<div class="item"><span style="font-size:15px">☐</span><span>${esc(typeof c==='string'?c:c.item)}</span></div>`).join('')}` : ''}

  ${r.participantes?.length ? `
  <h2>👥 Participantes</h2>
  <table>
    <thead><tr><th>Nome</th><th>Papel</th><th>Contribuição</th></tr></thead>
    <tbody>${r.participantes.map(p=>`<tr>
      <td><strong>${esc(p.nome)}</strong></td>
      <td>${esc(p.papel||'—')}</td>
      <td style="color:#6b7280">${esc(p.contribuicao||'—')}</td>
    </tr>`).join('')}</tbody>
  </table>` : ''}

  <div class="footer">
    Gerado por <strong>Menin Office AI</strong> · ${new Date().toLocaleDateString('pt-BR')}
    <div style="margin-top:8px;padding:8px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:11px;display:inline-block">
      ⚠️ Este conteúdo foi gerado por inteligência artificial e pode conter imprecisões. Revise as informações antes de utilizá-las.
    </div>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Permita pop-ups para exportar o PDF.'); return; }
  win.document.write(html);
  win.document.close();
}
</script>

<style scoped>
.section-title {
  @apply flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 mb-2;
}
</style>
