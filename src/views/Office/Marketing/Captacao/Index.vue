<script setup>
// Central Meta › aba Captação — Inbox da captação de leads inbound.
// (Panel do hub /meta — sem PageContainer/PageHeader próprios.)
//
// Estrutura:
//   1. Toolbar com badge "Modo sombra" e ações (atualizar, sincronizar, abrir Campanhas)
//   2. CaptureHealthBanner — alertas críticos quando há (dry-run, dead-letter, oldest_held>2d)
//   3. CaptureSummaryCards — 8 KPIs do período + seletor de período
//   4. CaptureFiltersBar — toolbar expansível com todos os filtros
//   5. SegmentedControl — alternar entre 3 views (lista / cards / timeline)
//   6. View (table | cards | timeline) com lista de leads
//   7. Paginação (só na lista)
//   8. LeadDetailModal

import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCaptureStore } from '@/stores/Marketing/Capture/captureStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import PeriodPicker from '../Campanhas/components/PeriodPicker.vue';
import CaptureHealthBanner from './components/CaptureHealthBanner.vue';
import CaptureSummaryCards from './components/CaptureSummaryCards.vue';
import CaptureFiltersBar from './components/CaptureFiltersBar.vue';
import LeadsTableView from './components/LeadsTableView.vue';
import LeadsCardsView from './components/LeadsCardsView.vue';
import LeadsTimelineView from './components/LeadsTimelineView.vue';
import LeadDetailModal from './components/LeadDetailModal.vue';

const store = useCaptureStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const isAdmin = computed(() => authStore?.user?.role === 'admin');

const detailOpen = ref(false);

const VIEW_OPTIONS = [
    { value: 'list',     label: 'Lista',    icon: 'fas fa-list' },
    { value: 'cards',    label: 'Cards',    icon: 'fas fa-table-columns' },
    { value: 'timeline', label: 'Timeline', icon: 'fas fa-clock-rotate-left' },
];

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / store.pageSize)));

// O sort vem do servidor por created_at DESC; ajustamos client-side se o usuário
// pediu 'stuck' (presos há mais tempo = held mais antigos primeiro) ou 'oldest'.
const orderedLeads = computed(() => {
    const arr = [...store.leads];
    const sort = store.filters.sort;
    if (sort === 'oldest') {
        return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    if (sort === 'stuck') {
        // Held primeiro, mais antigos primeiro; depois failed antigos; depois o resto.
        const weight = (l) => l.status === 'held' ? 0 : (l.status === 'failed' || l.status === 'rejected') ? 1 : 2;
        return arr.sort((a, b) => {
            const w = weight(a) - weight(b);
            if (w !== 0) return w;
            return new Date(a.created_at) - new Date(b.created_at);
        });
    }
    return arr; // 'recent' = default do server
});

function applyFilters() {
    store.page = 1;
    store.fetchLeads();
}

function focusStatus(filterKey, { global = false } = {}) {
    // Aceita "delivered" ou "failed,rejected" — converte em array.
    // global = pontos de atenção: filtra a base inteira (sem recorte de período),
    // senão dead-letter/held antigos ficariam invisíveis no mês atual.
    if (global) {
        store.focusGlobalStatus(filterKey);
        return;
    }
    store.filters.status = String(filterKey).split(',').map(s => s.trim()).filter(Boolean);
    store.page = 1;
    store.fetchLeads();
}

function onPeriodChange(p) {
    store.setPeriodo(p);
}

function goPage(p) {
    if (p < 1 || p > totalPages.value) return;
    store.page = p;
    store.fetchLeads();
}

async function openDetail(id) {
    detailOpen.value = true;
    await store.fetchDetail(id);
}

function refresh() {
    store.fetchLeads();
    store.fetchHealth();
}

async function backfillCampaigns() {
    // Preview primeiro (dryRun) pra mostrar o impacto antes de gravar.
    const preview = await store.backfillCampaigns({ dryRun: true });
    if (!preview) return;
    if (preview.scanned === 0) {
        window.alert('Nada a fazer — não há leads com ad_id sem campanha.');
        return;
    }
    const msg = `Resolver campanha de ${preview.updated} lead${preview.updated === 1 ? '' : 's'}?\n\n`
        + `Analisados: ${preview.scanned}\n`
        + `Vão ganhar campanha: ${preview.updated}\n`
        + `Não resolvíveis (ad fora do cache): ${preview.unresolved}\n\n`
        + (preview.unresolved > 0
            ? 'Dica: pra resolver os "não resolvíveis", clique em "Sincronizar Meta" — vai puxar todos os Ads e tentar de novo.'
            : '');
    if (!window.confirm(msg)) return;

    const result = await store.backfillCampaigns({ dryRun: false });
    if (!result) {
        window.alert('Falha no backfill: ' + (store.error || 'erro desconhecido'));
        return;
    }
    window.alert(`✅ ${result.updated} lead${result.updated === 1 ? '' : 's'} com campanha resolvida.`);
}

async function runFullSync() {
    const msg = 'Sincronizar tudo da Meta?\n\n'
        + 'Vai puxar formulários, campanhas, anúncios (TODAS), importar leads históricos dos últimos 30 dias e resolver campanhas pendentes.\n\n'
        + 'Demora entre 2 e 5 minutos. Continuar?';
    if (!window.confirm(msg)) return;

    const result = await store.runFullSync({ sinceDays: 90, historicalDays: 30 });
    if (!result) {
        window.alert('Falha no sync: ' + (store.error || 'erro desconhecido'));
        return;
    }
    const s = result.summary || result;
    const linhas = [
        `Forms: ${s.forms?.forms_total ?? 0} (${s.forms?.forms_new ?? 0} novos)`,
        `Campanhas: ${s.campaigns?.campaigns_total ?? 0}`,
        `Ads: ${s.ads?.ads_total ?? 0} em ${s.ads?.campaigns_processed ?? 0} campanhas`,
        `Backfill: ${s.backfill?.updated ?? 0} campanhas resolvidas`,
        `Histórico: ${s.historical?.inserted ?? 0} novos, ${s.historical?.duplicates ?? 0} dup`,
    ];
    const erros = s.errors?.length ? `\n\n⚠️ ${s.errors.length} erro(s): ${s.errors.map(e => e.step).join(', ')}` : '';
    window.alert(`✅ Sync completo em ${s.duration_sec ?? '?'}s.\n\n${linhas.join('\n')}${erros}`);
}

// Watch nos filtros que não dependem de Aplicar (datas e sort dispara refetch).
watch(() => [store.filters.period_start, store.filters.period_end, store.filters.sort], () => {
    // sort é client-side, não refetch. Datas, sim.
}, { deep: false });

onMounted(async () => {
    await Promise.all([store.fetchLeads(), store.fetchHealth()]);
    const leadId = route.query.lead;
    if (leadId) openDetail(String(leadId));
});
</script>

<template>
  <div>

      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 flex-wrap mb-3">
          <span v-if="store.health?.dry_run"
            class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300"
            title="Os leads não estão sendo enviados ao CV — modo sombra ligado">
            <i class="fas fa-eye-slash"></i> Modo sombra
          </span>
          <Button v-if="isAdmin" variant="primary" size="sm" icon="fas fa-arrows-rotate"
            @click="runFullSync" :loading="store.actionBusy"
            title="Puxa tudo da Meta (forms, campanhas, ads, leads históricos) e resolve pendências. 2-5 min.">
            <span class="hidden lg:inline">Sincronizar Meta</span>
          </Button>
          <Button v-if="isAdmin" variant="secondary" size="sm" icon="fas fa-link"
            @click="backfillCampaigns" :loading="store.actionBusy"
            title="Resolve campanha rapidamente usando o cache local (sem ir à Meta). Use quando só quiser resolver pendências.">
            <span class="hidden lg:inline">Resolver campanhas</span>
          </Button>
          <Button v-if="isAdmin" variant="secondary" size="sm" icon="fas fa-gear"
            @click="router.push('/meta?tab=config')" title="Configurações de captação">
            <span class="hidden lg:inline">Configurações</span>
          </Button>
          <Button variant="secondary" size="sm" icon="fas fa-bullhorn"
            @click="router.push('/meta?tab=campanhas')" title="Ver campanhas Meta">
            <span class="hidden lg:inline">Campanhas</span>
          </Button>
          <Button variant="primary" size="sm" icon="fas fa-arrows-rotate" @click="refresh" :loading="store.loading">
            Atualizar
          </Button>
      </div>

      <!-- Alertas críticos (globais — clicáveis pra filtrar o inbox) -->
      <CaptureHealthBanner :health="store.health" @focus-status="focusStatus" />

      <!-- Período mestre (padronizado com Campanhas/Leads/Formulários) -->
      <div class="mb-3">
        <PeriodPicker :periodo="store.periodo" @update:periodo="onPeriodChange" />
      </div>

      <!-- KPIs -->
      <div class="mb-4">
        <CaptureSummaryCards
          :health="store.health"
          @focus-status="focusStatus" />
      </div>

      <!-- Filtros -->
      <div class="mb-3">
        <CaptureFiltersBar
          :filtros="store.filters"
          @update:filtros="v => store.filters = v"
          :campaign-options="store.campaignOptions"
          :midia-options="store.midiaOptions"
          :cv-origem-options="store.cvOrigemOptions"
          :has-active="store.hasActiveFilters"
          @buscar="applyFilters"
          @limpar="store.resetFilters" />
      </div>

      <!-- View mode + total -->
      <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <SegmentedControl
          :model-value="store.viewMode"
          @change="store.setViewMode"
          :options="VIEW_OPTIONS"
          size="sm" />
        <span class="text-xs font-mono text-ink-subtle tabular-nums">
          {{ store.total }} lead{{ store.total === 1 ? '' : 's' }}
          <span v-if="store.total > store.pageSize">
            · página {{ store.page }} / {{ totalPages }}
          </span>
        </span>
      </div>

      <!-- Erro -->
      <div v-if="store.error"
        class="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <!-- View -->
      <LeadsTableView v-if="store.viewMode === 'list'"
        :leads="orderedLeads" :loading="store.loading"
        @open-detail="openDetail" />
      <LeadsCardsView v-else-if="store.viewMode === 'cards'"
        :leads="orderedLeads" :loading="store.loading"
        @open-detail="openDetail" />
      <LeadsTimelineView v-else-if="store.viewMode === 'timeline'"
        :leads="orderedLeads" :loading="store.loading"
        @open-detail="openDetail" />

      <!-- Paginação (só nas views que precisam) -->
      <div v-if="store.viewMode !== 'cards' && store.total > store.pageSize"
        class="flex items-center justify-between mt-3 px-3.5 py-2.5 rounded-xl border border-line bg-surface-raised">
        <span class="text-xs text-ink-subtle font-mono tabular-nums">
          {{ ((store.page - 1) * store.pageSize) + 1 }}–{{ Math.min(store.page * store.pageSize, store.total) }}
          de {{ store.total }}
        </span>
        <div class="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" icon="fas fa-angles-left"
            :disabled="store.page <= 1" @click="goPage(1)" />
          <Button variant="ghost" size="sm" icon="fas fa-chevron-left"
            :disabled="store.page <= 1" @click="goPage(store.page - 1)" />
          <span class="text-xs text-ink-muted font-mono tabular-nums px-2">
            {{ store.page }} / {{ totalPages }}
          </span>
          <Button variant="ghost" size="sm" icon="fas fa-chevron-right"
            :disabled="store.page >= totalPages" @click="goPage(store.page + 1)" />
          <Button variant="ghost" size="sm" icon="fas fa-angles-right"
            :disabled="store.page >= totalPages" @click="goPage(totalPages)" />
        </div>
      </div>

      <!-- Detalhe -->
      <LeadDetailModal v-model:open="detailOpen" />

  </div>
</template>
