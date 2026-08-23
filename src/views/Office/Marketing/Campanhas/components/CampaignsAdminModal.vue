<script setup>
// Modal de ferramentas admin — só visível pra admin via gear icon.
// Botão grande no topo dispara TUDO em sequência. Operações individuais ficam
// abaixo pra uso pontual.

import { ref } from 'vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Button from '@/components/UI/Button.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

defineProps({
    open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open']);

const store = useCampaignsStore();

// Corte do cutover: tudo a partir de 01/06 vai pro CV.
const CUTOFF = '2026-06-01';

function close() { emit('update:open', false); }

// Opções customizáveis pro full sync
const fullOpts = ref({
    sinceDays: 90,
    historicalDays: 30,
    adsAllStatuses: false,
});

async function doFullSync() {
    if (!confirm(
        '🔁 Sincronizar TUDO da Meta?\n\n' +
        'Vai rodar em sequência:\n' +
        '  1. Forms (Meta Lead Forms)\n' +
        `  2. Campanhas (últimos ${fullOpts.value.sinceDays} dias)\n` +
        `  3. Anúncios (${fullOpts.value.adsAllStatuses ? 'TODAS' : 'só ATIVAS'} campanhas)\n` +
        `  4. Leads históricos (últimos ${fullOpts.value.historicalDays} dias)\n\n` +
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
    if (result) toast.success(`✅ ${result.inserted} novos · ${result.duplicates} dup · ${result.errors?.length || 0} erro(s).`);
}

async function doReparse() {
    if (!confirm('Re-processar leads com campos null?')) return;
    const result = await store.reparseExistingLeads();
    if (result) toast.success(`✅ ${result.updated} atualizados de ${result.scanned} escaneados.`);
}

async function doDispatchHistorical() {
    // 1) Preview leve (go/no-go) — não envia nada.
    const pre = await store.dispatchHistorical({ cutoff: CUTOFF, preview: true });
    if (!pre) { toast.error('Falha no preview: ' + (store.error || 'erro desconhecido')); return; }
    if (pre.shadow_mode) {
        toast.warning('⚠️ Modo sombra (dry-run) ainda está LIGADO.\n\nDesligue em Configurações › Geral e salve antes de disparar — senão nada é enviado ao CV.');
        return;
    }
    const ok = confirm(
        `Disparar pro CV desde ${pre.cutoff}?\n\n` +
        `• Histórico da Meta: ${pre.historical_total}\n` +
        `• Fila segurada pela sombra (routed): ${pre.routed_pending}\n` +
        `• Total no backlog: ${pre.total}\n\n` +
        'Envia em lotes de 500 (resumível). Quem já existe no CV é ATUALIZADO (não duplica). ' +
        'Histórico de campanha sem vínculo fica de fora.'
    );
    if (!ok) return;
    // 2) Disparo real do lote.
    const result = await store.dispatchHistorical({ cutoff: CUTOFF, preview: false, limit: 500 });
    if (!result) { toast.error('Falha no disparo: ' + (store.error || 'erro desconhecido')); return; }
    let msg = '✅ Lote enviado ao CV.\n\n' +
        `Despachados: ${result.dispatched} (entregues ${result.delivered}, falhas ${result.failed})\n` +
        `Histórico sem vínculo (ficaram de fora): ${result.historical_no_binding}\n` +
        `Sem contato: ${result.no_contact}\n` +
        `Erros: ${result.errors?.length || 0}`;
    if (result.reached_limit) msg += '\n\n⚠️ Atingiu o lote de 500 — RODE DE NOVO pra continuar até zerar.';
    toast.error(msg);
}

async function doMigrateMappings() {
    if (!confirm('Migrar mapping form → campanhas? Roda 1x na transição.')) return;
    const result = await store.migrateMappings();
    if (result) toast.success(`✅ ${result.forms_processed} forms → ${result.campaigns_updated} campanhas atualizadas.`);
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <div class="bg-surface text-ink w-full max-w-3xl rounded-xl shadow-xl border border-line max-h-[92vh] flex flex-col">

      <header class="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-line shrink-0">
        <div class="shrink-0 w-10 h-10 rounded-lg bg-data-neg/10 text-data-neg flex items-center justify-center">
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
                Forms → Campanhas → Anúncios → Leads históricos.
                <b>Roda em sequência</b> e pode demorar alguns minutos.
              </p>

              <!-- Opções -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                <label class="block">
                  <span class="text-micro uppercase tracking-wider text-ink-subtle">Janela campanhas/ads</span>
                  <select v-model.number="fullOpts.sinceDays" class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink">
                    <option :value="30">30 dias</option>
                    <option :value="60">60 dias</option>
                    <option :value="90">90 dias</option>
                    <option :value="180">180 dias</option>
                    <option :value="365">1 ano</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-micro uppercase tracking-wider text-ink-subtle">Janela histórico</span>
                  <select v-model.number="fullOpts.historicalDays" class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink">
                    <option :value="7">7 dias</option>
                    <option :value="14">14 dias</option>
                    <option :value="30">30 dias</option>
                    <option :value="60">60 dias</option>
                    <option :value="90">90 dias (máx Meta)</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-micro uppercase tracking-wider text-ink-subtle">Anúncios</span>
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
              <i :class="store.lastFullSync.errors?.length ? 'fas fa-triangle-exclamation text-data-warn' : 'fas fa-circle-check text-data-pos'"></i>
              Última execução em {{ store.lastFullSync.duration_sec }}s
              <span v-if="store.lastFullSync.errors?.length" class="text-data-warn ml-auto">
                {{ store.lastFullSync.errors.length }} erro(s) total
              </span>
            </div>
            <ul class="space-y-0.5 text-micro text-ink-muted ml-5">
              <li v-if="store.lastFullSync.forms">
                <b>Forms:</b> {{ store.lastFullSync.forms.forms_total }} ({{ store.lastFullSync.forms.forms_new }} novos)
              </li>
              <li v-if="store.lastFullSync.campaigns">
                <b>Campanhas:</b> {{ store.lastFullSync.campaigns.campaigns_total }} em {{ store.lastFullSync.campaigns.accounts_count }} contas
              </li>
              <li v-if="store.lastFullSync.ads">
                <b>Anúncios:</b> {{ store.lastFullSync.ads.ads_total }} em {{ store.lastFullSync.ads.campaigns_processed }} campanhas
                <span v-if="store.lastFullSync.ads.errors" class="text-data-warn">· {{ store.lastFullSync.ads.errors }} erros</span>
              </li>
              <li v-if="store.lastFullSync.historical">
                <b>Histórico:</b> {{ store.lastFullSync.historical.inserted }} novos, {{ store.lastFullSync.historical.duplicates }} dup
              </li>
            </ul>
          </div>
        </div>

        <!-- ── OPERAÇÕES INDIVIDUAIS ───────────────────────────────────── -->
        <div class="text-micro uppercase tracking-wider text-ink-subtle pt-1">Operações individuais</div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button @click="doSync" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fab fa-meta text-accent"></i>
              <span class="font-medium text-sm text-ink">Sincronizar Meta</span>
              <span v-if="store.syncing" class="ml-auto"><i class="fas fa-circle-notch fa-spin text-xs text-accent"></i></span>
            </div>
            <p class="text-micro text-ink-muted">Só campanhas + insights da Marketing API.</p>
          </button>

          <button @click="doImportHistorical" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-cloud-arrow-down text-accent"></i>
              <span class="font-medium text-sm text-ink">Importar histórico</span>
              <span v-if="store.importing" class="ml-auto"><i class="fas fa-circle-notch fa-spin text-xs text-accent"></i></span>
            </div>
            <p class="text-micro text-ink-muted">Leads dos forms — até 90d (limite Meta).</p>
          </button>

          <button @click="doReparse" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-wand-magic-sparkles text-data-pos"></i>
              <span class="font-medium text-sm text-ink">Re-processar leads</span>
            </div>
            <p class="text-micro text-ink-muted">Aplica parser novo no raw_payload de leads antigos.</p>
          </button>

          <button @click="doDispatchHistorical" class="rounded-lg border border-data-pos/40 bg-data-pos/5 p-3 hover:border-data-pos/60 transition-colors text-left">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-paper-plane text-data-pos"></i>
              <span class="font-medium text-sm text-ink">Disparar histórico ao CV</span>
              <span v-if="store.dispatching" class="ml-auto"><i class="fas fa-circle-notch fa-spin text-xs text-accent"></i></span>
            </div>
            <p class="text-micro text-ink-muted">Envia o backlog desde 01/06 (preview antes). Atualiza quem já existe.</p>
          </button>

          <button @click="doMigrateMappings" class="rounded-lg border border-line p-3 hover:border-accent/30 transition-colors text-left sm:col-span-2">
            <div class="flex items-center gap-2 mb-1">
              <i class="fas fa-shuffle text-accent"></i>
              <span class="font-medium text-sm text-ink">Migrar mapping form → campanha</span>
            </div>
            <p class="text-micro text-ink-muted">Copia mídia/empreendimento dos forms pras campanhas. Rodar 1× na migração.</p>
          </button>
        </div>

        <!-- ── Log de operações ───────────────────────────────────────── -->
        <div v-if="store.ops?.length" class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
          <div class="text-micro uppercase tracking-wider text-ink-subtle mb-2 flex items-center justify-between">
            <span>Últimas operações</span>
            <button @click="store.clearOps()" class="text-ink-subtle hover:text-data-neg normal-case">limpar</button>
          </div>
          <ul class="space-y-1 text-xs max-h-40 overflow-y-auto">
            <li v-for="op in store.ops.slice(0, 10)" :key="op.id" class="flex items-start gap-2 py-0.5">
              <i :class="op.status === 'running' ? 'fas fa-circle-notch fa-spin text-accent' :
                          op.status === 'success' ? 'fas fa-circle-check text-data-pos' :
                          'fas fa-circle-xmark text-data-neg'" class="mt-0.5 text-[10px]"></i>
              <span class="flex-1 truncate">{{ op.label }}</span>
              <span class="text-ink-subtle text-micro whitespace-nowrap">
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
