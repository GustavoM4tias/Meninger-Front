<script setup>
// Central Meta › aba Vínculos CV.
// (Panel do hub /meta — sem PageContainer/PageHeader próprios.)
//
// Responde: tudo que deveria chegar ao CV está chegando? E onde vaza?
//   • Funil de entrega (recebidos → entregues / represados / falhas / aguardando)
//     com taxa de cobertura.
//   • Campanhas SEM vínculo represando leads → clique vincula (CampaignDetailModal).
//   • Campanhas ativas sem vínculo (preventivo).
//   • Backlog pronto pra disparar ao CV.
//
// Read-only + atalho pra ação. A vinculação em si acontece no modal de campanha.

import { onMounted, ref, computed } from 'vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import CampaignDetailModal from '../Campanhas/components/CampaignDetailModal.vue';

const store = useCampaignsStore();

const detailOpen = ref(false);
const detailId = ref(null);
function openCampaign(id) {
    detailId.value = String(id);
    detailOpen.value = true;
}

async function reload() {
    await store.fetchBindingOverview();
}
onMounted(reload);

// ── Enviar represados recuperáveis ao CV ────────────────────────────────────
const sending = ref(false);
const sendResult = ref(null);

async function enviarRecuperaveis() {
    const total = summary.value.leads_recoverable || 0;
    if (!total) return;
    if (!window.confirm(`Enviar ${total} lead(s) represado(s) ao CV?\n\nSão leads de campanhas que já têm vínculo — serão roteados e enviados ao CRM (upsert, sem duplicar).`)) return;
    sending.value = true;
    sendResult.value = null;
    try {
        const d = await store.dispatchRecoverable({ preview: false, limit: 1000 });
        sendResult.value = d;
    } finally {
        sending.value = false;
    }
}

const ov = computed(() => store.bindingOverview);
const funnel = computed(() => ov.value?.funnel || {});
const summary = computed(() => ov.value?.summary || {});
const held = computed(() => ov.value?.held || { campaigns: [], forms: [] });
const activeUnbound = computed(() => ov.value?.active_unbound_campaigns || []);
const backlog = computed(() => ov.value?.backlog || null);

function fmtInt(v) { return v == null ? '0' : new Intl.NumberFormat('pt-BR').format(Number(v)); }

// Saúde geral: verde se cobertura alta e sem risco; âmbar/vermelho conforme.
const healthTone = computed(() => {
    const s = summary.value;
    if (s.leads_at_risk > 0 || s.unbound_campaigns_with_leads > 0) return 'danger';
    if (s.active_unbound_campaigns > 0) return 'warn';
    if (funnel.value.coverage_pct != null && funnel.value.coverage_pct < 90) return 'warn';
    return 'ok';
});

const healthCopy = computed(() => {
    const s = summary.value;
    if (healthTone.value === 'danger') {
        return {
            title: `${fmtInt(s.leads_at_risk)} lead(s) represado(s) por falta de vínculo`,
            desc: `${s.unbound_campaigns_with_leads} campanha(s) sem vínculo estão segurando leads que não chegam ao CV. Vincule-as abaixo.`,
        };
    }
    if (healthTone.value === 'warn') {
        return {
            title: 'Atenção preventiva',
            desc: s.active_unbound_campaigns > 0
                ? `${s.active_unbound_campaigns} campanha(s) ativa(s) sem vínculo — vão represar os próximos leads.`
                : 'Cobertura de entrega abaixo de 90% no período.',
        };
    }
    return {
        title: 'Tudo vinculado',
        desc: 'Nenhuma campanha sem vínculo represando leads. Os leads captados estão chegando ao CV.',
    };
});

const toneClasses = {
    ok:     { wrap: 'border-emerald-500/30 bg-emerald-500/5', icon: 'fas fa-circle-check text-emerald-500', ring: 'text-emerald-600 dark:text-emerald-300' },
    warn:   { wrap: 'border-amber-500/30 bg-amber-500/5',     icon: 'fas fa-triangle-exclamation text-amber-500', ring: 'text-amber-600 dark:text-amber-300' },
    danger: { wrap: 'border-red-500/30 bg-red-500/5',         icon: 'fas fa-circle-exclamation text-red-500', ring: 'text-red-600 dark:text-red-300' },
};

// Cards do funil
const funnelCards = computed(() => {
    const f = funnel.value;
    return [
        { key: 'delivered',  label: 'Entregues ao CV', value: f.delivered,  icon: 'fas fa-circle-check', accent: 'text-emerald-500 bg-emerald-500/10' },
        { key: 'held',       label: 'Represados',       value: f.held,       icon: 'fas fa-hand',         accent: 'text-red-500 bg-red-500/10' },
        { key: 'pending',    label: 'Aguardando envio', value: f.pending,    icon: 'fas fa-hourglass-half', accent: 'text-sky-500 bg-sky-500/10' },
        { key: 'failed',     label: 'Falhas',           value: f.failed,     icon: 'fas fa-circle-xmark', accent: 'text-orange-500 bg-orange-500/10' },
    ];
});

function statusBadge(s) {
    const up = String(s || '').toUpperCase();
    if (up.includes('ACTIVE'))   return { label: 'Ativa',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (up.includes('PAUSED'))   return { label: 'Pausada',   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (up.includes('ARCHIVED')) return { label: 'Arquivada', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    if (up.includes('DELETED'))  return { label: 'Excluída',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    return { label: up || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}
</script>

<template>
  <div>
      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 mb-3">
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loadingBinding" @click="reload">
            Atualizar
          </Button>
      </div>

      <!-- Loading inicial -->
      <div v-if="store.loadingBinding && !ov" class="py-20 text-center text-ink-subtle">
        <i class="fas fa-circle-notch fa-spin text-2xl mb-2 block"></i>
        Analisando vínculos...
      </div>

      <template v-else-if="ov">
        <!-- ══ Painel de saúde ══════════════════════════════════════════════ -->
        <div :class="['rounded-xl border p-4 mb-4 flex items-start gap-3.5', toneClasses[healthTone].wrap]">
          <i :class="[toneClasses[healthTone].icon, 'text-2xl mt-0.5']"></i>
          <div class="flex-1 min-w-0">
            <div class="text-base font-semibold text-ink">{{ healthCopy.title }}</div>
            <div class="text-sm text-ink-muted mt-0.5">{{ healthCopy.desc }}</div>
          </div>
          <!-- Cobertura -->
          <div v-if="funnel.coverage_pct != null" class="text-center shrink-0 pl-3">
            <div :class="['text-3xl font-bold tabular-nums leading-none', toneClasses[healthTone].ring]">
              {{ funnel.coverage_pct }}<span class="text-lg">%</span>
            </div>
            <div class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle mt-1">cobertura</div>
          </div>
        </div>

        <!-- ══ Funil de entrega (fluxo AO VIVO) ═════════════════════════════ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2">
          <div v-for="(c, i) in funnelCards" :key="c.key" :style="{ '--i': i }"
            class="flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient
                   card-enter transition-all duration-200 ease-out-expo
                   hover:border-accent/60 hover:-translate-y-0.5 hover:ring-2 hover:ring-accent-ring/25 hover:shadow-glow-blue">
            <div class="flex items-center justify-between">
              <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="c.accent">
                <i :class="c.icon"></i>
              </span>
            </div>
            <span class="text-xl font-semibold text-ink tabular-nums leading-none mt-1">{{ fmtInt(c.value) }}</span>
            <span class="text-[11px] text-ink-muted">{{ c.label }}</span>
          </div>
        </div>

        <!-- Contexto: cobertura mede só o fluxo ao vivo; espelho histórico à parte -->
        <div class="mb-5 text-[11px] text-ink-subtle flex items-start gap-1.5">
          <i class="fas fa-circle-info mt-0.5"></i>
          <span>
            A <b>cobertura</b> mede só os leads que entraram pelo fluxo ao vivo (entregues ÷ ao vivo).
            <template v-if="funnel.historical">
              Há também <b>{{ fmtInt(funnel.historical) }}</b> lead(s) de <b>espelho histórico</b> (importados da Meta —
              a maioria já está no CV desde antes do cutover); eles <b>não</b> entram na cobertura.
            </template>
          </span>
        </div>

        <!-- ══ Campanhas sem vínculo represando leads (ação) ════════════════ -->
        <section class="mb-5">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-red-500"></i>
              Campanhas sem vínculo represando leads
            </h2>
            <span v-if="held.campaigns.filter(c => !c.is_bound).length"
              class="inline-flex rounded-full bg-red-500/10 text-red-600 dark:text-red-300 text-[11px] font-semibold px-2 py-0.5">
              {{ held.campaigns.filter(c => !c.is_bound).length }}
            </span>
          </div>

          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div v-if="!held.campaigns.filter(c => !c.is_bound).length" class="px-4 py-8 text-center text-ink-subtle text-sm">
              <i class="fas fa-circle-check text-emerald-500 text-xl mb-1.5 block"></i>
              Nenhuma campanha sem vínculo com leads represados. 🎉
            </div>
            <table v-else class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
                  <th class="px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Conta</th>
                  <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                  <th class="px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Motivo</th>
                  <th class="px-3 py-2.5 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads represados</th>
                  <th class="px-3 py-2.5 w-28"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="c in held.campaigns.filter(c => !c.is_bound)" :key="c.campaign_id"
                  class="hover:bg-surface-hover/40 transition-colors">
                  <td class="px-3 py-2.5">
                    <button v-if="!c.not_synced" @click="openCampaign(c.campaign_id)"
                      class="text-ink font-medium leading-tight truncate max-w-[280px] text-left hover:text-accent hover:underline block"
                      :title="`Abrir campanha ${c.name || c.campaign_id}`">
                      {{ c.name || '(não sincronizada)' }}
                    </button>
                    <div v-else class="text-ink font-medium leading-tight truncate max-w-[280px]" :title="c.name || c.campaign_id">
                      {{ c.name || '(não sincronizada)' }}
                    </div>
                    <div class="text-[10px] font-mono text-ink-subtle">#{{ c.campaign_id }}</div>
                  </td>
                  <td class="px-3 py-2.5 text-xs text-ink-muted truncate max-w-[160px]">{{ c.account_name || '—' }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <span v-if="!c.not_synced" :class="['inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(c.effective_status).cls]">
                      {{ statusBadge(c.effective_status).label }}
                    </span>
                    <span v-else class="text-[10px] text-ink-subtle italic">fora do cache</span>
                  </td>
                  <td class="px-3 py-2.5 text-xs text-ink-muted">
                    <span v-if="c.not_synced">campanha não sincronizada</span>
                    <span v-else-if="c.mapping_active === false">vínculo desativado</span>
                    <span v-else>sem mídia definida</span>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-300">
                      {{ fmtInt(c.held_count) }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <button v-if="!c.not_synced" @click="openCampaign(c.campaign_id)"
                      class="inline-flex items-center gap-1.5 rounded-md bg-accent text-white px-2.5 py-1 text-[11px] font-medium hover:opacity-90 transition-opacity">
                      <i class="fas fa-link text-[9px]"></i>Vincular
                    </button>
                    <span v-else class="text-[10px] text-ink-subtle italic">sincronize as campanhas</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Surface>
        </section>

        <!-- ══ Represados recuperáveis (campanha já vinculada) ══════════════ -->
        <section v-if="held.campaigns.filter(c => c.is_bound).length" class="mb-5">
          <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
                <i class="fas fa-rotate-right text-sky-500"></i>
                Represados recuperáveis
              </h2>
              <span class="text-[11px] text-ink-subtle">campanha já tem vínculo — só falta enviar ao CV</span>
            </div>
            <Button size="sm" icon="fas fa-paper-plane" :loading="sending"
              :disabled="!summary.leads_recoverable"
              @click="enviarRecuperaveis">
              Enviar {{ fmtInt(summary.leads_recoverable) }} ao CV
            </Button>
          </div>

          <!-- Resultado do envio -->
          <div v-if="sendResult" class="mb-2 rounded-lg border px-3 py-2.5 text-sm"
            :class="sendResult.failed ? 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200'
                                      : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'">
            <i :class="sendResult.failed ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mr-1.5"></i>
            <b>{{ fmtInt(sendResult.delivered) }}</b> entregue(s) ao CV,
            <b>{{ fmtInt(sendResult.recoverable) }}</b> recuperado(s)
            <template v-if="sendResult.no_binding"> · {{ fmtInt(sendResult.no_binding) }} ainda sem vínculo</template>
            <template v-if="sendResult.failed"> · {{ fmtInt(sendResult.failed) }} falha(s)</template>
            <template v-if="sendResult.reached_limit"> · atingiu o lote — clique de novo pra continuar</template>
          </div>

          <Surface variant="raised" padding="md">
            <ul class="divide-y divide-line/60 -my-1">
              <li v-for="c in held.campaigns.filter(c => c.is_bound)" :key="c.campaign_id"
                class="py-2 flex items-center gap-3 text-sm">
                <i class="fas fa-hand text-ink-subtle text-xs"></i>
                <button @click="openCampaign(c.campaign_id)"
                  class="flex-1 min-w-0 truncate text-ink text-left hover:text-accent hover:underline"
                  :title="`Abrir campanha ${c.name || c.campaign_id}`">{{ c.name || `#${c.campaign_id}` }}</button>
                <span class="text-ink-muted">{{ fmtInt(c.held_count) }} lead(s)</span>
                <RouterLink to="/meta?tab=captacao" class="text-[11px] text-accent hover:underline whitespace-nowrap">
                  ver na inbox →
                </RouterLink>
              </li>
            </ul>
          </Surface>
        </section>

        <!-- ══ Campanhas ativas sem vínculo (preventivo) ════════════════════ -->
        <section v-if="activeUnbound.length" class="mb-5">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-shield-halved text-amber-500"></i>
              Campanhas ativas sem vínculo (preventivo)
            </h2>
            <span class="text-[11px] text-ink-subtle">ainda sem leads represados, mas vão gerar</span>
          </div>
          <Surface variant="raised" padding="none" class="overflow-hidden">
            <table class="min-w-full text-sm">
              <tbody class="divide-y divide-line/60">
                <tr v-for="c in activeUnbound" :key="c.campaign_id" class="hover:bg-surface-hover/40 transition-colors">
                  <td class="px-3 py-2.5">
                    <button @click="openCampaign(c.campaign_id)"
                      class="text-ink font-medium leading-tight truncate max-w-[320px] text-left hover:text-accent hover:underline block"
                      :title="`Abrir campanha ${c.name || c.campaign_id}`">{{ c.name || `#${c.campaign_id}` }}</button>
                    <div class="text-[10px] font-mono text-ink-subtle">{{ c.account_name || '—' }}</div>
                  </td>
                  <td class="px-3 py-2.5 text-xs text-ink-muted">
                    {{ c.reason === 'sem_midia' ? 'sem mídia definida' : 'vínculo desativado' }}
                  </td>
                  <td class="px-3 py-2.5 text-right w-28">
                    <button @click="openCampaign(c.campaign_id)"
                      class="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:text-accent hover:border-accent/40 transition-colors">
                      <i class="fas fa-link text-[9px]"></i>Vincular
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </Surface>
        </section>

        <!-- ══ Backlog pronto pra enviar ════════════════════════════════════ -->
        <section v-if="backlog && (backlog.historical_total > 0 || backlog.routed_pending > 0)" class="mb-5">
          <Surface variant="raised" padding="md" class="flex items-start gap-3">
            <i class="fas fa-paper-plane text-violet-500 text-lg mt-0.5"></i>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-ink">Backlog pronto pra enviar ao CV</div>
              <div class="text-xs text-ink-muted mt-0.5">
                <b>{{ fmtInt(backlog.historical_total) }}</b> histórico(s)
                <template v-if="backlog.routed_pending"> · <b>{{ fmtInt(backlog.routed_pending) }}</b> na fila</template>
                aguardando disparo (desde {{ backlog.cutoff }}).
                <span v-if="backlog.shadow_mode" class="text-amber-600 dark:text-amber-300">Modo sombra ligado — desligue antes de disparar.</span>
              </div>
            </div>
            <RouterLink to="/meta?tab=campanhas"
              class="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-muted hover:text-accent hover:border-accent/40 transition-colors whitespace-nowrap">
              Disparar em Campanhas <i class="fas fa-arrow-right text-[9px]"></i>
            </RouterLink>
          </Surface>
        </section>

        <!-- Forms sem vínculo (fallback) -->
        <section v-if="held.forms && held.forms.filter(f => !f.is_bound).length" class="mb-5">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-list-check text-ink-subtle"></i>
              Formulários sem vínculo (leads sem campanha)
            </h2>
          </div>
          <Surface variant="raised" padding="md">
            <ul class="divide-y divide-line/60 -my-1">
              <li v-for="f in held.forms.filter(f => !f.is_bound)" :key="f.form_id"
                class="py-2 flex items-center gap-3 text-sm">
                <i class="fas fa-file-lines text-ink-subtle text-xs"></i>
                <span class="flex-1 min-w-0 truncate text-ink" :title="f.name">{{ f.name || `#${f.form_id}` }}</span>
                <span class="text-ink-muted">{{ fmtInt(f.held_count) }} lead(s)</span>
                <RouterLink to="/meta?tab=formularios" class="text-[11px] text-accent hover:underline whitespace-nowrap">
                  configurar →
                </RouterLink>
              </li>
            </ul>
          </Surface>
        </section>
      </template>

      <!-- Erro -->
      <div v-if="store.error && !ov"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5"></i>
        <div>{{ store.error }}</div>
      </div>

      <!-- Modal de campanha (vincular) -->
      <CampaignDetailModal v-model:open="detailOpen" :campaign-id="detailId" @saved="reload" />
  </div>
</template>
