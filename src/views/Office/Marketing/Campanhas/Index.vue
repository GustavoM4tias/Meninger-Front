<script setup>
// /marketing/campanhas — tela principal de campanhas Meta com KPIs agregados,
// filtros (status, conta, datas, busca) e tabela com investimento + leads + CAC.

import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import CampaignDetailModal from './components/CampaignDetailModal.vue';

const store = useCampaignsStore();

const search = ref('');
const filterStatus  = ref('ALL');  // ALL | ACTIVE | PAUSED | OTHER
const filterAccount = ref('ALL');
const filterDateFrom = ref('');
const filterDateTo   = ref('');
const showArchived  = ref(false);
const sortBy        = ref('spend'); // spend | leads | cac | start | name

const detailOpen = ref(false);
const detailId   = ref(null);

const syncDays = ref(90);

function openDetail(c) {
    detailId.value = c.id;
    detailOpen.value = true;
}

onMounted(() => store.fetchAll());

async function doSync() {
    await store.syncFromMeta({ sinceDays: Number(syncDays.value) || 90 });
}

async function doImportHistorical() {
    const days = Number(syncDays.value) || 90;
    if (!confirm(`Importar leads históricos dos últimos ${days} dias da Meta?\n\n` +
        `Eles entram em Captação de Leads com status "histórico" e NÃO são enviados ao CV (só ficam visíveis).\n` +
        `Operação idempotente — leads já importados são ignorados.`)) return;
    const result = await store.importHistorical({ sinceDays: days });
    if (result) {
        alert(`✅ Import concluído.\n\n${result.inserted} novos · ${result.duplicates} duplicados · ${result.errors?.length || 0} erro(s).\n\nVeja em /marketing/captacao filtrando por status "historical".`);
    }
}

async function doMigrateMappings() {
    if (!confirm('Migrar mapping (empreendimento, mídia, UTMs, extras) dos forms para as campanhas que os usam?\n\n' +
        'Pra cada form com mapping configurado, copia pra TODAS as campanhas que rodam ads com ele. ' +
        'Idempotente — só preenche campos vazios na campanha. Não sobrescreve dados existentes.\n\n' +
        'Recomendado rodar 1 vez quando estiver migrando o fluxo.')) return;
    const result = await store.migrateMappings();
    if (result) {
        alert(`✅ Migração concluída.\n\n${result.forms_processed} form(s) processado(s) → ${result.campaigns_updated} campanha(s) atualizada(s).\n\nAjuste cada campanha em "Vínculo CV" dentro do modal.`);
    }
}

async function doReparse() {
    if (!confirm('Re-processar nomes/email/telefone dos leads Meta que ficaram com campos null?\n\n' +
        'Vamos ler o raw_payload original e rodar o parser atualizado. Atualiza só campos que estão null — não sobrescreve dados existentes.')) return;
    const result = await store.reparseExistingLeads();
    if (result) {
        alert(`✅ Re-parse concluído.\n\n${result.updated} leads atualizados (de ${result.scanned} escaneados)\n${result.skipped_no_payload} sem payload · ${result.skipped_no_change} sem mudanças\n${result.errors?.length || 0} erro(s).`);
    }
}

async function doReconcileBatch() {
    if (!confirm('Buscar correspondência no CV pra os leads históricos sem cv_idlead?\n\n' +
        'Vamos consultar o CV por email/telefone de cada um e gravar o cv_idlead quando achar. Não envia nada — só lê.')) return;
    const result = await store.reconcileBatch({ limit: 200 });
    if (result) {
        alert(`✅ Reconciliação concluída.\n\n${result.matched} encontrados · ${result.unmatched} sem match · ${result.errors} erro(s) (de ${result.processed} processados).`);
    }
}

const accountOptions = computed(() => {
    const set = new Map();
    for (const c of store.campaigns) {
        if (c.account_id) set.set(c.account_id, c.account_name || c.account_id);
    }
    return [...set.entries()].map(([id, name]) => ({ id, name }));
});

function inRange(iso) {
    if (!iso) return false;
    const dt = new Date(iso);
    if (filterDateFrom.value && dt < new Date(filterDateFrom.value)) return false;
    if (filterDateTo.value) {
        const to = new Date(filterDateTo.value);
        to.setHours(23, 59, 59, 999);
        if (dt > to) return false;
    }
    return true;
}

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    let arr = store.campaigns.filter(c => {
        if (!showArchived.value && c.archived) return false;

        if (filterStatus.value === 'ACTIVE' && !String(c.effective_status || c.status).toUpperCase().includes('ACTIVE')) return false;
        if (filterStatus.value === 'PAUSED' && !String(c.effective_status || c.status).toUpperCase().includes('PAUSED')) return false;
        if (filterStatus.value === 'OTHER') {
            const s = String(c.effective_status || c.status).toUpperCase();
            if (s.includes('ACTIVE') || s.includes('PAUSED')) return false;
        }

        if (filterAccount.value !== 'ALL' && c.account_id !== filterAccount.value) return false;

        if (filterDateFrom.value || filterDateTo.value) {
            if (!inRange(c.start_time)) return false;
        }

        if (q) {
            const txt = [c.name, c.id, c.account_name, c.objective, c.notes]
                .filter(Boolean).join(' ').toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });

    arr = [...arr];
    if (sortBy.value === 'spend') {
        arr.sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
    } else if (sortBy.value === 'leads') {
        arr.sort((a, b) => (b.lead_stats?.total || 0) - (a.lead_stats?.total || 0));
    } else if (sortBy.value === 'cac') {
        arr.sort((a, b) => (Number(a.cac) || Infinity) - (Number(b.cac) || Infinity));
    } else if (sortBy.value === 'start') {
        arr.sort((a, b) => {
            const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
            const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
            return tb - ta;
        });
    } else if (sortBy.value === 'name') {
        arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    return arr;
});

const summary = computed(() => {
    let spend = 0, leadsMeta = 0, leadsOffice = 0, delivered = 0, impressions = 0, clicks = 0;
    for (const c of filtered.value) {
        spend       += Number(c.spend) || 0;
        leadsMeta   += Number(c.meta_leads_total) || 0;
        leadsOffice += c.lead_stats?.total     || 0;
        delivered   += c.lead_stats?.delivered || 0;
        impressions += c.impressions || 0;
        clicks      += c.clicks      || 0;
    }
    // Para o CAC médio agregado, usa Office se temos dados; senão usa Meta.
    const totalLeads = leadsOffice > 0 ? leadsOffice : leadsMeta;
    const cacMedio = totalLeads > 0 ? spend / totalLeads : null;
    const ctrAgg   = impressions > 0 ? (clicks / impressions) * 100 : null;
    return { spend, leadsMeta, leadsOffice, delivered, impressions, clicks, cacMedio, ctrAgg };
});

function fmtMoney(v, currency = 'BRL') {
    if (v == null) return '—';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(v)); }
    catch { return `R$ ${v}`; }
}
function fmtInt(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR').format(Number(v));
}
function fmtPct(v) {
    if (v == null) return '—';
    return `${Number(v).toFixed(2)}%`;
}
function fmtShortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '—'; }
}
function fmtRelative(iso) {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1)    return 'agora';
    if (min < 60)   return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24)     return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)      return `${d}d`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function statusBadge(c) {
    const s = String(c.effective_status || c.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return { label: 'Ativa',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s.includes('PAUSED'))   return { label: 'Pausada',   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s.includes('DELETED'))  return { label: 'Excluída',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s.includes('ARCHIVED')) return { label: 'Arquivada', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    if (s.includes('COMPLETED')) return { label: 'Concluída', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

function priorityDot(p) {
    if (p === 'high')   return { cls: 'bg-red-500',     title: 'Prioridade alta' };
    if (p === 'low')    return { cls: 'bg-slate-400',   title: 'Prioridade baixa' };
    return { cls: 'bg-emerald-500', title: 'Prioridade normal' };
}

function isActive(c) {
    return String(c.effective_status || c.status || '').toUpperCase().includes('ACTIVE');
}

/**
 * Texto da 2ª linha do "Período" (após start_time). Só mostra "Em andamento"
 * pra campanhas ativas sem stop_time; pausadas/excluídas mostram "—".
 */
function periodEnd(c) {
    if (c.stop_time) return { text: '→ ' + fmtShortDate(c.stop_time), cls: 'text-ink-subtle' };
    if (isActive(c)) return { text: 'em andamento', cls: 'text-emerald-600 dark:text-emerald-300' };
    return { text: '—', cls: 'text-ink-subtle italic' };
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Campanhas Meta"
        subtitle="Investimento, leads e CAC por campanha. Dados sincronizados da Marketing API."
        icon="fab fa-meta">
        <template #actions>
          <select v-model="syncDays" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
            <option :value="30">Últimos 30d</option>
            <option :value="60">Últimos 60d</option>
            <option :value="90">Últimos 90d</option>
            <option :value="180">Últimos 180d</option>
            <option :value="365">Último ano</option>
          </select>
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
            Atualizar
          </Button>
          <Button variant="secondary" size="sm" icon="fas fa-cloud-arrow-down" :loading="store.importing" @click="doImportHistorical"
            title="Importa leads históricos da Meta pra Captação (não envia ao CV).">
            Importar histórico
          </Button>
          <Button variant="secondary" size="sm" icon="fas fa-wand-magic-sparkles" @click="doReparse"
            title="Re-processa raw_payload de leads sem nome com o parser atualizado.">
            Re-processar nomes
          </Button>
          <Button variant="secondary" size="sm" icon="fas fa-shuffle" @click="doMigrateMappings"
            title="Copia mapping de forms pra campanhas (executa 1 vez na migração).">
            Migrar mapping form→camp
          </Button>
          <Button variant="secondary" size="sm" icon="fas fa-link" :loading="store.reconciling" @click="doReconcileBatch"
            title="Busca correspondência no CV pra os históricos sem cv_idlead.">
            Reconciliar com CV
          </Button>
          <Button variant="primary" size="sm" icon="fab fa-meta" :loading="store.syncing" @click="doSync">
            Sincronizar com Meta
          </Button>
        </template>
      </PageHeader>

      <!-- Resumo agregado -->
      <Surface variant="raised" padding="sm" class="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Campanhas</div>
          <div class="text-xl font-semibold text-ink">{{ filtered.length }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Investimento</div>
          <div class="text-xl font-semibold text-ink">{{ fmtMoney(summary.spend) }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads (Meta)</div>
          <div class="text-xl font-semibold text-ink">{{ fmtInt(summary.leadsMeta) }}</div>
          <div class="text-[10px] text-ink-subtle">Office: {{ fmtInt(summary.leadsOffice) }} · {{ summary.delivered }} entreg.</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">CAC médio</div>
          <div class="text-xl font-semibold text-ink">{{ summary.cacMedio ? fmtMoney(summary.cacMedio) : '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Cliques</div>
          <div class="text-xl font-semibold text-ink">{{ fmtInt(summary.clicks) }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">CTR agreg.</div>
          <div class="text-xl font-semibold text-ink">{{ fmtPct(summary.ctrAgg) }}</div>
        </div>
      </Surface>

      <!-- Filtros -->
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input v-model="search" type="text" placeholder="Buscar por nome, objetivo, conta..."
          class="flex-1 min-w-[200px] rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />

        <select v-model="filterStatus" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
          <option value="ALL">Todos status</option>
          <option value="ACTIVE">Ativas</option>
          <option value="PAUSED">Pausadas</option>
          <option value="OTHER">Outros</option>
        </select>

        <select v-model="filterAccount" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
          <option value="ALL">Todas contas</option>
          <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>

        <div class="flex items-center gap-1 text-xs text-ink-subtle">
          <span>Início de:</span>
          <input v-model="filterDateFrom" type="date" class="rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none" />
          <span>até:</span>
          <input v-model="filterDateTo"   type="date" class="rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none" />
        </div>

        <select v-model="sortBy" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
          <option value="spend">Maior gasto</option>
          <option value="leads">Mais leads</option>
          <option value="cac">Menor CAC</option>
          <option value="start">Mais recentes</option>
          <option value="name">Nome A-Z</option>
        </select>

        <label class="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer ml-auto">
          <input type="checkbox" v-model="showArchived" />
          Mostrar arquivadas
        </label>
      </div>

      <!-- Resultado do sync -->
      <div v-if="store.lastSync"
        :class="['rounded-lg border px-3 py-2.5 text-sm mb-3',
          store.lastSync.errors?.length
            ? 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200'
            : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300']">
        <div class="flex items-start gap-2">
          <i :class="store.lastSync.errors?.length ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mt-0.5"></i>
          <div class="flex-1">
            <div>
              Sincronizado: <b>{{ store.lastSync.accounts_count }}</b> conta(s) de anúncio,
              <b>{{ store.lastSync.campaigns_total }}</b> campanha(s)
              ({{ store.lastSync.campaigns_new }} nova(s), {{ store.lastSync.campaigns_updated }} atualizada(s))
              <span class="text-[11px] text-ink-subtle">· janela {{ store.lastSync.since }} → {{ store.lastSync.until }}</span>
            </div>
            <div v-if="store.lastSync.errors?.length" class="mt-1.5 space-y-1">
              <div v-for="(e, i) in store.lastSync.errors" :key="i"
                class="text-xs rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
                <div class="font-medium"><i class="fas fa-circle-exclamation mr-1"></i>{{ e.account_name || 'Conta' }} <span class="text-ink-subtle font-mono">#{{ e.account_id }}</span></div>
                <div class="text-amber-700 dark:text-amber-300 mt-0.5 font-mono text-[11px] break-words">{{ e.error }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Log de operações ─────────────────────────────────────────────── -->
      <div v-if="store.ops.length" class="mb-3 rounded-lg border border-line bg-surface overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b border-line bg-surface-sunken/30">
          <div class="text-xs font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-clock-rotate-left text-ink-subtle"></i>
            Operações recentes ({{ store.ops.length }})
          </div>
          <button @click="store.clearOps()" class="text-[10px] text-ink-subtle hover:text-red-500">limpar</button>
        </div>
        <ul class="divide-y divide-line/60 max-h-60 overflow-y-auto">
          <li v-for="op in store.ops" :key="op.id" class="px-3 py-2 text-xs flex items-start gap-2.5">
            <!-- Ícone status -->
            <span class="mt-0.5 shrink-0 w-5 text-center">
              <i v-if="op.status === 'running'" class="fas fa-circle-notch fa-spin text-sky-500"></i>
              <i v-else-if="op.status === 'success'" class="fas fa-circle-check text-emerald-500"></i>
              <i v-else class="fas fa-circle-xmark text-red-500"></i>
            </span>

            <!-- Conteúdo -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="[
                  'inline-flex rounded text-[9px] px-1.5 py-0.5 font-mono uppercase',
                  op.type === 'sync'      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' :
                  op.type === 'import'    ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300' :
                  op.type === 'reconcile' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                  op.type === 'ads'       ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                  'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                ]">{{ op.type }}</span>
                <span class="font-medium text-ink truncate">{{ op.label }}</span>
                <span class="text-[10px] text-ink-subtle ml-auto whitespace-nowrap">
                  {{ new Date(op.started_at).toLocaleTimeString('pt-BR') }}
                  <template v-if="op.duration_ms != null"> · {{ (op.duration_ms / 1000).toFixed(1) }}s</template>
                </span>
              </div>

              <!-- Resumo do resultado -->
              <div v-if="op.status === 'running'" class="text-[11px] text-ink-subtle mt-0.5">processando...</div>

              <div v-else-if="op.status === 'success' && op.type === 'sync'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.campaigns_total }}</b> campanhas em {{ op.result.accounts_count }} contas
                ({{ op.result.campaigns_new }} novas)
                <span v-if="op.result.errors?.length" class="text-amber-600 dark:text-amber-300">· {{ op.result.errors.length }} erros</span>
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'import'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.inserted }}</b> novos · {{ op.result.duplicates }} duplicados · {{ op.result.forms_count }} forms
                <span v-if="op.result.errors?.length" class="text-amber-600 dark:text-amber-300">· {{ op.result.errors.length }} erros</span>
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'reconcile'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.matched }}</b> casados · {{ op.result.unmatched }} sem match · {{ op.result.errors }} erros (de {{ op.result.processed }})
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'ads'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.ads_total }}</b> ads · {{ op.result.ads_new }} novos · {{ op.result.ads_updated }} atualizados
              </div>

              <div v-else-if="op.status === 'error'" class="text-[11px] text-red-600 dark:text-red-300 mt-0.5 break-words">
                {{ op.error || 'erro desconhecido' }}
              </div>

              <!-- Detalhes expandíveis se tem erros por form -->
              <details v-if="op.result?.errors?.length" class="mt-1">
                <summary class="text-[10px] text-amber-600 dark:text-amber-300 cursor-pointer">ver detalhes dos {{ op.result.errors.length }} erro(s)</summary>
                <ul class="mt-1 ml-2 space-y-0.5 text-[10px] text-ink-muted font-mono max-h-32 overflow-y-auto">
                  <li v-for="(e, i) in op.result.errors.slice(0, 20)" :key="i">
                    <b>{{ e.form_name || e.page_name || '?' }}:</b> {{ e.error }}
                  </li>
                  <li v-if="op.result.errors.length > 20" class="italic">… mais {{ op.result.errors.length - 20 }}</li>
                </ul>
              </details>
            </div>
          </li>
        </ul>
      </div>

      <!-- Resultado import histórico -->
      <div v-if="store.lastImport"
        class="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700 dark:text-blue-300 mb-3">
        <div class="flex items-start gap-2">
          <i class="fas fa-cloud-arrow-down mt-0.5"></i>
          <div class="flex-1">
            <div>
              <b>Import histórico:</b> {{ store.lastImport.forms_count }} form(s) processado(s) ·
              <b>{{ store.lastImport.inserted }}</b> novo(s),
              <b>{{ store.lastImport.duplicates }}</b> duplicado(s)
              · janela desde {{ store.lastImport.since }}
            </div>
            <div v-if="store.lastImport.errors?.length" class="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ {{ store.lastImport.errors.length }} form(s) com erro
              <span v-for="(e, i) in store.lastImport.errors.slice(0, 3)" :key="i" class="block font-mono text-[10px] mt-0.5">
                {{ e.form_name }}: {{ e.error }}
              </span>
            </div>
            <div class="text-[11px] mt-1">
              <RouterLink to="/marketing/captacao" class="underline">Ver leads em Captação →</RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Resultado reconciliação CV -->
      <div v-if="store.lastReconcile"
        class="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300 mb-3">
        <i class="fas fa-link mr-1"></i>
        <b>Reconciliação CV:</b> {{ store.lastReconcile.processed }} processado(s) ·
        <b>{{ store.lastReconcile.matched }}</b> encontrado(s) no CV ·
        {{ store.lastReconcile.unmatched }} sem match · {{ store.lastReconcile.errors }} erro(s)
      </div>

      <!-- Erro -->
      <div v-if="store.error"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2 mb-3">
        <i class="fas fa-circle-exclamation mt-0.5"></i>
        <div>{{ store.error }}</div>
      </div>

      <!-- Tabela -->
      <Surface variant="raised" padding="none" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-surface-sunken/30 border-b border-line">
              <tr>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Conta</th>
                <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Período</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Investido</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="Custo por lead">CAC</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CTR</th>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60">
              <tr v-if="store.loading">
                <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                  <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
                </td>
              </tr>
              <tr v-else-if="!store.campaigns.length">
                <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                  Nenhuma campanha sincronizada ainda. Clique em <b>"Sincronizar com Meta"</b>.
                </td>
              </tr>
              <tr v-else-if="!filtered.length">
                <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                  Nenhuma campanha corresponde aos filtros.
                </td>
              </tr>
              <tr v-else v-for="c in filtered" :key="c.id"
                @click="openDetail(c)"
                class="hover:bg-surface-hover/40 cursor-pointer transition-colors">

                <!-- Campanha -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(c.priority).cls]" :title="priorityDot(c.priority).title"></span>
                    <div class="min-w-0">
                      <div class="text-ink font-medium leading-tight truncate">{{ c.name || '(sem nome)' }}</div>
                      <div class="text-[10px] font-mono text-ink-subtle truncate">
                        #{{ c.id }}<span v-if="c.objective"> · {{ c.objective }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Conta -->
                <td class="px-3 py-2.5 text-ink-muted text-xs truncate max-w-[160px]">
                  {{ c.account_name || c.account_id }}
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5 text-center">
                  <span :class="['inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(c).cls]">
                    {{ statusBadge(c).label }}
                  </span>
                </td>

                <!-- Período -->
                <td class="px-3 py-2.5">
                  <div class="text-[11px] text-ink-muted">
                    <span v-if="c.start_time">{{ fmtShortDate(c.start_time) }}</span>
                    <span v-else class="text-ink-subtle italic">—</span>
                  </div>
                  <div class="text-[10px]" :class="periodEnd(c).cls">{{ periodEnd(c).text }}</div>
                </td>

                <!-- Investido -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <div class="text-sm font-semibold text-ink leading-tight">{{ fmtMoney(c.spend, c.currency) }}</div>
                  <div v-if="c.daily_budget_cents" class="text-[10px] text-ink-subtle">{{ fmtMoney(c.daily_budget_cents / 100, c.currency) }}/dia</div>
                </td>

                <!-- Leads (Meta + nosso DB) -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <div class="text-sm font-semibold text-ink leading-tight" title="Leads contados pela Meta (insights)">
                    {{ fmtInt(c.meta_leads_total || 0) }}
                    <i class="fab fa-meta text-[9px] text-ink-subtle ml-0.5"></i>
                  </div>
                  <div class="text-[10px] text-ink-subtle leading-tight" title="Leads no nosso banco via webhook">
                    Office: {{ fmtInt(c.lead_stats?.total || 0) }}
                    <span v-if="c.lead_stats?.delivered" class="text-emerald-600 dark:text-emerald-300">· {{ c.lead_stats.delivered }} ent.</span>
                  </div>
                </td>

                <!-- CAC -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap text-sm">
                  <span v-if="c.cac != null" class="font-medium text-ink" :title="c.cac_source === 'meta' ? 'CAC calculado usando contagem da Meta' : 'CAC com base no nosso banco'">
                    {{ fmtMoney(c.cac, c.currency) }}
                    <i v-if="c.cac_source === 'meta'" class="fab fa-meta text-[9px] text-ink-subtle ml-0.5"></i>
                  </span>
                  <span v-else class="text-ink-subtle italic text-xs">—</span>
                </td>

                <!-- CTR -->
                <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ fmtPct(c.ctr) }}</td>

                <!-- Último lead -->
                <td class="px-3 py-2.5 text-[11px] text-ink-muted whitespace-nowrap">
                  {{ fmtRelative(c.lead_stats?.last_lead_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      <CampaignDetailModal
        v-model:open="detailOpen"
        :campaign-id="detailId"
        @saved="store.fetchAll()" />
    </PageContainer>
  </div>
</template>
