<script setup>
// Modal de ferramentas admin — só visível pra admin via gear icon.
// Botão grande no topo dispara TUDO em sequência. Operações individuais ficam
// abaixo pra uso pontual.

import { ref } from 'vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Button from '@/components/UI/Button.vue';

defineProps({
    open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open']);

const store = useCampaignsStore();

function close() { emit('update:open', false); }

// Opções customizáveis pro full sync
const fullOpts = ref({
    sinceDays: 90,
    historicalDays: 30,
    reconcileLimit: 200,
    adsAllStatuses: false,
});

async function doFullSync() {
    if (!confirm(
        '🔁 Sincronizar TUDO da Meta?\n\n' +
        'Vai rodar em sequência:\n' +
        '  1. Forms (Meta Lead Forms)\n' +
        `  2. Campanhas (últimos ${fullOpts.value.sinceDays} dias)\n` +
        `  3. Anúncios (${fullOpts.value.adsAllStatuses ? 'TODAS' : 'só ATIVAS'} campanhas)\n` +
        `  4. Leads históricos (últimos ${fullOpts.value.historicalDays} dias)\n` +
        `  5. Reconciliação com CV (até ${fullOpts.value.reconcileLimit} leads)\n\n` +
        'Pode demorar alguns minutos. Tudo isso roda no cron a cada 2h em horário comercial.'
    )) return;
    await store.runFullSync({ ...fullOpts.value });
}

async function doSync() {
    await store.syncFromMeta({ sinceDays: fullOpts.value.sinceDays });
}

async function doImportHistorical() {
    if (!confirm(`Importar leads históricos dos últimos ${fullOpts.value.historicalDays} dias da Meta?`)) return;
    const result = await store.importHistorical({ sinceDays: fullOpts.value.historicalDays });
    if (result) alert(`✅ ${result.inserted} novos · ${result.duplicates} dup · ${result.errors?.length || 0} erro(s).`);
}

async function doReparse() {
    if (!confirm('Re-processar leads com campos null?')) return;
    const result = await store.reparseExistingLeads();
    if (result) alert(`✅ ${result.updated} atualizados de ${result.scanned} escaneados.`);
}

async function doReconcileBatch() {
    if (!confirm(`Buscar correspondência no CV pra ${fullOpts.value.reconcileLimit} leads sem cv_idlead?`)) return;
    const result = await store.reconcileBatch({ limit: fullOpts.value.reconcileLimit });
    if (result) alert(`✅ ${result.matched} encontrados · ${result.unmatched} sem match · ${result.errors} erros (de ${result.processed}).`);
}

async function doMigrateMappings() {
    if (!confirm('Migrar mapping form → campanhas? Roda 1x na transição.')) return;
    const result = await store.migrateMappings();
    if (result) alert(`✅ ${result.forms_processed} forms → ${result.campaigns_updated} campanhas atualizadas.`);
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <div class="bg-surface text-ink w-full max-w-3xl rounded-xl shadow-xl border border-line max-h-[92vh] flex flex-col">

      <header class="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-line shrink-0">
        <div class="shrink-0 w-10 h-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-300 flex items-center justify-center">
          <i class="fas fa-screwdriver-wrench text-lg"></i>
        </div>
        <div class="flex-1">
          <h3 class="text-base font-semibold text-ink">Ferramentas admin</h3>
          <p class="text-xs text-ink-subtle">Operações de manutenção. O cron já roda automático a cada 2h em horário comercial.</p>
        </div>
        <button @click="close" class="text-ink-subtle hover:text-ink p-1"><i class="fas fa-times"></i></button>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        <!-- ── SINCRONIZAR TUDO (hero) ─────────────────────────────────── -->
        <div class="rounded-xl border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-accent/0 p-4">
          <div class="flex items-start gap-3">
            <div class="shrink-0 w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center text-xl shadow-soft">
              <i class="fas fa-rotate" :class="store.fullSyncing ? 'fa-spin' : ''"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-base font-semibold text-ink">Sincronizar TUDO</div>
              <p class="text-xs text-ink-muted mt-0.5">
                Forms → Campanhas → Anúncios → Leads históricos → Reconciliação com CV.
                <b>Roda em sequência</b> e pode demorar alguns minutos.
              </p>

              <!-- Opções -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <label class="block">
                  <span class="text-[10px] uppercase tracking-wider text-ink-subtle">Janela campanhas/ads</span>
                  <select v-model.number="fullOpts.sinceDays" class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink">
                    <option :value="30">30 dias</option>
                    <option :value="60">60 dias</option>
                    <option :value="90">90 dias</option>
                    <option :value="180">180 dias</option>
                    <option :value="365">1 ano</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[10px] uppercase tracking-wider text-ink-subtle">Janela histórico</span>
                  <select v-model.number="fullOpts.historicalDays" class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink">
                    <option :value="7">7 dias</option>
                    <option :value="14">14 dias</option>
                    <option :value="30">30 dias</option>
                    <option :value="60">60 dias</option>
                    <option :value="90">90 dias (máx Meta)</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[10px] uppercase tracking-wider text-ink-subtle">Reconciliação CV</span>
                  <select v-model.number="fullOpts.reconcileLimit" class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink">
                    <option :value="100">100 leads</option>
                    <option :value="200">200 leads</option>
                    <option :value="500">500 leads</option>
                    <option :value="0">Pular</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[10px] uppercase tracking-wider text-ink-subtle">Anúncios</span>
                  <select v-model="fullOpts.adsAllStatuses" class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink">
                    <option :value="false">Só campanhas ativas</option>
                    <option :value="true">Todas (mais lento)</option>
                  </select>
                </label>
              </div>
            </div>
            <Button variant="primary" size="md" icon="fas fa-bolt" :loading="store.fullSyncing" @click="doFullSync">
              Rodar tudo
            </Button>
          </div>

          <!-- Resultado do último full sync -->
          <div v-if="store.lastFullSync" class="mt-4 rounded-lg border border-line bg-surface p-3 space-y-1.5">
            <div class="text-xs font-medium text-ink flex items-center gap-2">
              <i :class="store.lastFullSync.errors?.length ? 'fas fa-triangle-exclamation text-amber-500' : 'fas fa-circle-check text-emerald-500'"></i>
              Última execução em {{ store.lastFullSync.duration_sec }}s
              <span v-if="store.lastFullSync.errors?.length" class="text-amber-600 dark:text-amber-300 ml-auto">
                {{ store.lastFullSync.errors.length }} erro(s) total
              </span>
            </div>
            <ul class="space-y-0.5 text-[11px] text-ink-muted ml-5">
              <li v-if="store.lastFullSync.forms">
                <b>Forms:</b> {{ store.lastFullSync.forms.forms_total }} ({{ store.lastFullSync.forms.forms_new }} novos)
              </li>
              <li v-if="store.lastFullSync.campaigns">
                <b>Campanhas:</b> {{ store.lastFullSync.campaigns.campaigns_total }} em {{ store.lastFullSync.campaigns.accounts_count }} contas
              </li>
              <li v-if="store.lastFullSync.ads">
                <b>Anúncios:</b> {{ store.lastFullSync.ads.ads_total }} em {{ store.lastFullSync.ads.campaigns_processed }} campanhas
                <span v-if="store.lastFullSync.ads.errors" class="text-amber-600 dark:text-amber-300">· {{ store.lastFullSync.ads.errors }} erros</span>
              </li>
              <li v-if="store.lastFullSync.historical">
                <b>Histórico:</b> {{ store.lastFullSync.historical.inserted }} novos, {{ store.lastFullSync.historical.duplicates }} dup
              </li>
              <li v-if="store.lastFullSync.reconciliation">
                <b>CV-recon:</b> {{ store.lastFullSync.reconciliation.matched }} casados de {{ store.lastFullSync.reconciliation.processed }}
              </li>
            </ul>
          </div>
        </div>

        <!-- ── OPERAÇÕES INDIVIDUAIS ───────────────────────────────────── -->
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle pt-1">Operações individuais</div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button @click="doSync" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fab fa-meta text-blue-500"></i>
              <span class="font-medium text-sm text-ink">Sincronizar Meta</span>
              <span v-if="store.syncing" class="ml-auto"><i class="fas fa-circle-notch fa-spin text-xs text-accent"></i></span>
            </div>
            <p class="text-[11px] text-ink-muted">Só campanhas + insights da Marketing API.</p>
          </button>

          <button @click="doImportHistorical" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-cloud-arrow-down text-violet-500"></i>
              <span class="font-medium text-sm text-ink">Importar histórico</span>
              <span v-if="store.importing" class="ml-auto"><i class="fas fa-circle-notch fa-spin text-xs text-accent"></i></span>
            </div>
            <p class="text-[11px] text-ink-muted">Leads dos forms — até 90d (limite Meta).</p>
          </button>

          <button @click="doReparse" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-wand-magic-sparkles text-emerald-500"></i>
              <span class="font-medium text-sm text-ink">Re-processar leads</span>
            </div>
            <p class="text-[11px] text-ink-muted">Aplica parser novo no raw_payload de leads antigos.</p>
          </button>

          <button @click="doReconcileBatch" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-link text-amber-500"></i>
              <span class="font-medium text-sm text-ink">Reconciliar com CV</span>
              <span v-if="store.reconciling" class="ml-auto"><i class="fas fa-circle-notch fa-spin text-xs text-accent"></i></span>
            </div>
            <p class="text-[11px] text-ink-muted">Casa leads sem cv_idlead via email/telefone.</p>
          </button>

          <button @click="doMigrateMappings" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left sm:col-span-2">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-shuffle text-sky-500"></i>
              <span class="font-medium text-sm text-ink">Migrar mapping form → campanha</span>
            </div>
            <p class="text-[11px] text-ink-muted">Copia mídia/empreendimento dos forms pras campanhas. Rodar 1× na migração.</p>
          </button>
        </div>

        <!-- ── Log de operações ───────────────────────────────────────── -->
        <div v-if="store.ops?.length" class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-2 flex items-center justify-between">
            <span>Últimas operações</span>
            <button @click="store.clearOps()" class="text-ink-subtle hover:text-red-500 normal-case">limpar</button>
          </div>
          <ul class="space-y-1 text-xs max-h-40 overflow-y-auto">
            <li v-for="op in store.ops.slice(0, 10)" :key="op.id" class="flex items-start gap-2 py-0.5">
              <i :class="op.status === 'running' ? 'fas fa-circle-notch fa-spin text-sky-500' :
                          op.status === 'success' ? 'fas fa-circle-check text-emerald-500' :
                          'fas fa-circle-xmark text-red-500'" class="mt-0.5 text-[10px]"></i>
              <span class="flex-1 truncate">{{ op.label }}</span>
              <span class="text-ink-subtle text-[10px] whitespace-nowrap">
                {{ new Date(op.started_at).toLocaleTimeString('pt-BR') }}
                {{ op.duration_ms != null ? `(${(op.duration_ms/1000).toFixed(1)}s)` : '' }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <footer class="px-5 py-3 border-t border-line bg-surface-sunken/30 shrink-0 flex justify-end">
        <Button variant="secondary" size="sm" @click="close">Fechar</Button>
      </footer>
    </div>
  </div>
</template>
