<script setup>
// Detalhe completo de um lead inbound — substitui o modal anterior.
//
// Estrutura:
//   1. Header com nome + status + canal + IDs
//   2. Cronologia das 3 entradas (Meta / Office / CV) com latências
//   3. Origem (campanha Meta OU form interno) com vínculo
//   4. Dados pessoais + atribuição (UTM, landing, IP)
//   5. Respostas do formulário (extra_fields)
//   6. Banner de erro (se houver)
//   7. Painel de roteamento manual (held)
//   8. Ações (redispatch, reconcile, spam)
//   9. Timeline de eventos

import { computed, ref, watch } from 'vue';
import { useCaptureStore } from '@/stores/Marketing/Capture/captureStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import LeadStatusBadge from './LeadStatusBadge.vue';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';

defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['update:open']);

const store = useCaptureStore();
const lead = computed(() => store.detail?.lead || null);
const events = computed(() => store.detail?.events || []);
const metaForm = computed(() => store.detail?.meta_form || null);
const leadForm = computed(() => store.detail?.lead_form || null);
const metaCampaign = computed(() => store.detail?.meta_campaign || null);

const displayName = computed(() => {
    const l = lead.value;
    if (!l) return '—';
    return l.nome || l.email || l.telefone || '(sem nome ou contato)';
});

const CHANNEL_META = {
    meta_lead_ads: { label: 'Meta Lead Ads', icon: 'fab fa-meta', cls: 'text-violet-500' },
    site_form:     { label: 'Formulário do site', icon: 'fas fa-globe', cls: 'text-sky-500' },
};
const channelMeta = computed(() => CHANNEL_META[lead.value?.channel] || { label: lead.value?.channel || '—', icon: 'fas fa-question', cls: 'text-ink-subtle' });

const CV_ORIGEM_OPTIONS = [
    { v: 'SI', label: 'WebSite' },
    { v: 'FB', label: 'Facebook' },
    { v: 'IG', label: 'Instagram' },
    { v: 'GO', label: 'Google' },
    { v: 'MP', label: 'Mídia Paga' },
    { v: 'OU', label: 'Outros' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function humanDelta(ms) {
    if (ms == null || ms < 0) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60)  return `${s}s`;
    const m = Math.round(s / 60);
    if (m < 60)  return `${m} min`;
    const h = Math.round(m / 60);
    if (h < 24)  return `${h}h`;
    return `${Math.round(h / 24)}d`;
}

// Datas ricas — pra cronologia visual
const timeline3 = computed(() => {
    const l = lead.value;
    if (!l) return null;
    const meta = l.meta_created_at ? new Date(l.meta_created_at) : null;
    const office = l.created_at ? new Date(l.created_at) : null;
    const cv = l.cv_delivered_at ? new Date(l.cv_delivered_at) : null;
    return {
        meta,
        office,
        cv,
        metaToOffice: meta && office ? office - meta : null,
        officeToCv: office && cv ? cv - office : null,
    };
});

// Form de roteamento (só usado quando held)
const routeForm = ref({ midia_slug: '', cv_origem: 'SI', bound_empreendimentos: [], tags: '' });
watch(lead, (l) => {
    if (!l) return;
    routeForm.value = {
        midia_slug: l.midia_slug || '',
        cv_origem: l.cv_origem || 'SI',
        bound_empreendimentos: Array.isArray(l.bound_empreendimentos) ? [...l.bound_empreendimentos] : [],
        tags: Array.isArray(l.tags) ? l.tags.join(', ') : '',
    };
});

function close() { emit('update:open', false); }
function parseTags(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }

async function doRoute() {
    if (!routeForm.value.midia_slug.trim()) {
        window.alert('Informe a mídia (slug).');
        return;
    }
    const ok = await store.routeLead(lead.value.id, {
        midia_slug: routeForm.value.midia_slug.trim(),
        cv_origem: routeForm.value.cv_origem,
        bound_empreendimentos: Array.isArray(routeForm.value.bound_empreendimentos) ? routeForm.value.bound_empreendimentos : [],
        tags: parseTags(routeForm.value.tags),
    });
    if (ok) window.alert('Lead roteado — em despacho para o CV.');
}

async function doRedispatch() {
    const ok = await store.redispatchLead(lead.value.id);
    if (ok) window.alert('Redisparo solicitado.');
}

async function doMarkSpam() {
    if (!window.confirm('Marcar este lead como spam?')) return;
    await store.setSpam(lead.value.id, true);
}
async function doUnmarkSpam() { await store.setSpam(lead.value.id, false); }

async function doReconcileCv() {
    const result = await store.reconcileCv(lead.value.id);
    if (!result) return;
    if (result.matched) {
        window.alert(`✅ Encontrado no CV!\n\ncv_idlead: ${result.cv_idlead}\nVia: ${result.via} (${result.confidence})`);
    } else {
        window.alert(`Nenhum match encontrado no CV.\nCandidatos: ${result.candidates_count}`);
    }
}
</script>

<template>
  <Modal :open="open" size="xl" :title="lead ? `Lead ${lead.id.slice(0, 8)}` : 'Detalhe do lead'" @close="close">
    <div v-if="store.detailLoading" class="py-12 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
    </div>

    <div v-else-if="lead" class="space-y-5">

      <!-- 1. Header: nome + status + canal -->
      <header class="rounded-xl border border-line bg-surface-sunken/40 px-4 py-3">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-[11px] text-ink-subtle font-mono mb-0.5 flex-wrap">
              <span :class="channelMeta.cls"><i :class="channelMeta.icon"></i> {{ channelMeta.label }}</span>
              <span v-if="lead.is_reentry" class="text-violet-600 dark:text-violet-400">
                <i class="fas fa-arrows-rotate"></i> re-entrada
              </span>
              <span v-if="lead.meta_is_organic === true || lead.meta_is_organic === 'true'"
                class="text-teal-600 dark:text-teal-400"
                title="Lead orgânico — veio do CTA da Página, não de uma campanha de Ads (por isso não tem campaign_id na Meta)">
                <i class="fas fa-seedling"></i> orgânico
              </span>
            </div>
            <h2 class="text-lg font-semibold text-ink truncate">{{ displayName }}</h2>
            <div class="text-xs text-ink-muted font-mono mt-0.5 truncate">
              <span v-if="lead.email"><i class="fas fa-envelope text-[10px] mr-1"></i>{{ lead.email }}</span>
              <span v-if="lead.email && lead.telefone" class="mx-1.5 text-ink-subtle">·</span>
              <span v-if="lead.telefone"><i class="fas fa-phone text-[10px] mr-1"></i>{{ lead.telefone }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <LeadStatusBadge :status="lead.status" />
            <span v-if="lead.cv_idlead" class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <i class="fas fa-link mr-1"></i>CV #{{ lead.cv_idlead }}
            </span>
          </div>
        </div>
      </header>

      <!-- 2. Cronologia das 3 entradas -->
      <section v-if="timeline3" class="rounded-xl border border-line bg-surface-raised p-4">
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-3">
          <i class="fas fa-stopwatch mr-1"></i>Cronologia
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">

          <!-- Meta -->
          <div class="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-medium text-violet-700 dark:text-violet-300">
                <i class="fab fa-meta mr-1"></i>Entrada na Meta
              </span>
              <i class="fas fa-1 text-[10px] text-violet-500"></i>
            </div>
            <div class="text-sm font-mono tabular-nums" :class="timeline3.meta ? 'text-ink' : 'text-ink-subtle'">
              {{ fmt(timeline3.meta) }}
            </div>
            <div class="text-[10px] text-ink-subtle mt-1">
              {{ lead.channel === 'meta_lead_ads' ? 'criação na plataforma' : 'não se aplica (canal site)' }}
            </div>
          </div>

          <!-- Office -->
          <div class="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 relative">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                <i class="fas fa-database mr-1"></i>Entrada no Office
              </span>
              <i class="fas fa-2 text-[10px] text-indigo-500"></i>
            </div>
            <div class="text-sm font-mono tabular-nums" :class="timeline3.office ? 'text-ink' : 'text-ink-subtle'">
              {{ fmt(timeline3.office) }}
            </div>
            <div class="text-[10px] text-ink-subtle mt-1">
              <span v-if="timeline3.metaToOffice != null">
                <i class="fas fa-arrow-right text-[8px] mx-0.5"></i>
                {{ humanDelta(timeline3.metaToOffice) }} após Meta
              </span>
              <span v-else>captura webhook/form</span>
            </div>
          </div>

          <!-- CV -->
          <div class="rounded-lg p-3"
            :class="timeline3.cv ? 'border border-emerald-500/20 bg-emerald-500/5' : 'border border-line bg-surface-sunken/40'">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-medium"
                :class="timeline3.cv ? 'text-emerald-700 dark:text-emerald-300' : 'text-ink-muted'">
                <i class="fas fa-check-double mr-1"></i>Entrega ao CV
              </span>
              <i class="fas fa-3 text-[10px]"
                :class="timeline3.cv ? 'text-emerald-500' : 'text-ink-subtle'"></i>
            </div>
            <div class="text-sm font-mono tabular-nums" :class="timeline3.cv ? 'text-ink' : 'text-ink-subtle'">
              {{ fmt(timeline3.cv) }}
            </div>
            <div class="text-[10px] text-ink-subtle mt-1">
              <span v-if="timeline3.officeToCv != null">
                <i class="fas fa-arrow-right text-[8px] mx-0.5"></i>
                {{ humanDelta(timeline3.officeToCv) }} após Office
              </span>
              <span v-else-if="lead.status === 'held'">aguardando vínculo</span>
              <span v-else-if="lead.status === 'historical'">só visibilidade (não enviado)</span>
              <span v-else>—</span>
            </div>
          </div>
        </div>

        <div v-if="lead.dispatch_attempts > 0" class="mt-3 text-[11px] text-ink-subtle font-mono">
          <i class="fas fa-arrows-rotate text-[10px] mr-1"></i>
          {{ lead.dispatch_attempts }} tentativa{{ lead.dispatch_attempts > 1 ? 's' : '' }} de despacho
          <span v-if="lead.next_retry_at"> · próximo retry: {{ fmt(lead.next_retry_at) }}</span>
        </div>
      </section>

      <!-- 3. Origem -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Campanha Meta -->
        <div v-if="metaCampaign" class="rounded-xl border border-line bg-surface-raised p-4">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">
            <i class="fas fa-bullhorn mr-1"></i>Campanha Meta
          </div>
          <div class="text-sm font-medium text-ink">{{ metaCampaign.name || '(sem nome)' }}</div>
          <div class="text-[11px] text-ink-muted font-mono mt-0.5">
            #{{ metaCampaign.id }}
            <span v-if="metaCampaign.account_name"> · {{ metaCampaign.account_name }}</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge v-if="metaCampaign.effective_status" :variant="String(metaCampaign.effective_status).includes('ACTIVE') ? 'success' : 'neutral'" size="sm">
              {{ metaCampaign.effective_status }}
            </Badge>
            <Badge v-if="metaCampaign.objective" variant="info" size="sm">{{ metaCampaign.objective }}</Badge>
            <Badge v-if="metaCampaign.mapping_active && metaCampaign.midia_slug" variant="success" size="sm" :dot="false">
              <i class="fas fa-link text-[9px]"></i> mapping ativo
            </Badge>
            <Badge v-else-if="metaCampaign.midia_slug" variant="warning" size="sm" :dot="false">
              <i class="fas fa-link-slash text-[9px]"></i> mapping desativado
            </Badge>
          </div>
        </div>

        <!-- Form Meta -->
        <div v-if="metaForm" class="rounded-xl border border-line bg-surface-raised p-4">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">
            <i class="fas fa-square-poll-vertical mr-1"></i>Formulário Meta
          </div>
          <div class="text-sm font-medium text-ink">{{ metaForm.name || '(sem nome)' }}</div>
          <div class="text-[11px] text-ink-muted font-mono mt-0.5">
            #{{ metaForm.id }}
            <span v-if="metaForm.page_name"> · {{ metaForm.page_name }}</span>
          </div>
          <details v-if="Array.isArray(metaForm.questions) && metaForm.questions.length" class="mt-2">
            <summary class="text-[11px] text-accent cursor-pointer">
              Ver {{ metaForm.questions.length }} pergunta(s) do form
            </summary>
            <ul class="mt-1.5 ml-3 space-y-0.5 text-[11px] text-ink-muted list-disc list-inside">
              <li v-for="(q, i) in metaForm.questions" :key="i">
                <span class="font-medium text-ink">{{ q.label || q.key }}</span>
                <span v-if="q.type" class="text-ink-subtle"> · {{ q.type }}</span>
              </li>
            </ul>
          </details>
        </div>

        <!-- Form interno -->
        <div v-if="leadForm" class="rounded-xl border border-line bg-surface-raised p-4">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">
            <i class="fas fa-globe mr-1"></i>Formulário do site
          </div>
          <div class="text-sm font-medium text-ink">{{ leadForm.name }}</div>
          <div class="text-[11px] text-ink-muted font-mono mt-0.5">
            /{{ leadForm.slug }}
            <span v-if="leadForm.midia_slug"> · {{ leadForm.midia_slug }}</span>
          </div>
        </div>

        <!-- Vínculo CV -->
        <div class="rounded-xl border border-line bg-surface-raised p-4">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">
            <i class="fas fa-link mr-1"></i>Vínculo CV
          </div>
          <dl class="text-xs space-y-1">
            <div class="flex justify-between gap-2">
              <dt class="text-ink-muted">Mídia</dt>
              <dd class="text-ink font-mono truncate" :title="lead.midia_slug">
                {{ lead.midia_slug || '—' }}
              </dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-ink-muted">Origem</dt>
              <dd class="text-ink font-mono">{{ lead.cv_origem || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-ink-muted">Empreendimentos</dt>
              <dd class="text-ink">
                {{ Array.isArray(lead.bound_empreendimentos) ? lead.bound_empreendimentos.length : 0 }}
              </dd>
            </div>
            <div v-if="Array.isArray(lead.tags) && lead.tags.length" class="flex justify-between gap-2">
              <dt class="text-ink-muted">Tags</dt>
              <dd class="text-ink">{{ lead.tags.join(', ') }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- 4. Dados pessoais + atribuição -->
      <section class="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-line bg-surface-raised p-4">
        <div class="sm:col-span-3 text-[10px] uppercase tracking-wider text-ink-subtle font-mono">
          <i class="fas fa-user mr-1"></i>Dados e atribuição
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Nome</div>
          <div class="text-sm text-ink truncate">{{ lead.nome || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">E-mail</div>
          <div class="text-sm text-ink break-all">{{ lead.email || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Telefone</div>
          <div class="text-sm text-ink">{{ lead.telefone || '—' }}</div>
        </div>
        <div v-if="lead.cidade || lead.estado">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Cidade / UF</div>
          <div class="text-sm text-ink">{{ [lead.cidade, lead.estado].filter(Boolean).join(' · ') || '—' }}</div>
        </div>
        <div v-if="lead.utm_source || lead.utm_campaign">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">UTM</div>
          <div class="text-sm text-ink truncate font-mono" :title="`${lead.utm_source} / ${lead.utm_medium} / ${lead.utm_campaign}`">
            {{ [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ') }}
          </div>
        </div>
        <div v-if="lead.landing_url">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Landing</div>
          <div class="text-sm text-ink break-all font-mono">{{ lead.landing_url }}</div>
        </div>
      </section>

      <!-- 5. Respostas do form (extra_fields) -->
      <section v-if="lead.extra_fields && Object.keys(lead.extra_fields).length"
        class="rounded-xl border border-line bg-surface-raised p-4">
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">
          <i class="fas fa-list-check mr-1"></i>Respostas do formulário ({{ Object.keys(lead.extra_fields).length }})
        </div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <template v-for="(v, k) in lead.extra_fields" :key="k">
            <dt class="text-ink-muted font-mono truncate" :title="k">{{ k }}</dt>
            <dd class="text-ink break-words">{{ Array.isArray(v) ? v.join(', ') : v }}</dd>
          </template>
        </dl>
      </section>

      <!-- 6. Erro atual -->
      <div v-if="lead.last_error"
        class="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">
        <div class="flex items-center gap-2 font-medium mb-0.5">
          <i class="fas fa-circle-exclamation"></i>Último erro
          <span v-if="lead.error_code" class="text-[10px] font-mono opacity-70">{{ lead.error_code }}</span>
        </div>
        <div class="text-xs opacity-90">{{ lead.last_error }}</div>
      </div>

      <!-- 7. Roteamento (held) -->
      <section v-if="lead.status === 'held'" class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h3 class="text-sm font-semibold text-ink mb-3">
          <i class="fas fa-route mr-1.5 text-amber-500"></i>Resolver vínculo e rotear
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Input v-model="routeForm.midia_slug" label="Mídia (slug)" placeholder="ex: meta-mond-marilia" size="sm" />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1">Origem CV</label>
            <select v-model="routeForm.cv_origem"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              <option v-for="o in CV_ORIGEM_OPTIONS" :key="o.v" :value="o.v">{{ o.label }} ({{ o.v }})</option>
            </select>
          </div>
        </div>
        <div class="mb-3">
          <label class="block text-xs font-medium text-ink-muted mb-1">Empreendimentos (do CV)</label>
          <EnterpriseMultiSelect v-model="routeForm.bound_empreendimentos" />
        </div>
        <Input v-model="routeForm.tags" label="Tags (separadas por vírgula)" placeholder="ex: feirao, alto-padrao" size="sm" />
        <div class="mt-3 flex justify-end">
          <Button variant="primary" size="sm" icon="fas fa-paper-plane" :loading="store.actionBusy" @click="doRoute">
            Rotear e despachar
          </Button>
        </div>
      </section>

      <!-- 8. Ações -->
      <div class="flex flex-wrap gap-2">
        <Button v-if="['failed', 'rejected'].includes(lead.status)"
          variant="primary" size="sm" icon="fas fa-arrows-rotate" :loading="store.actionBusy" @click="doRedispatch">
          Redisparar ao CV
        </Button>
        <Button v-if="!lead.cv_idlead"
          variant="secondary" size="sm" icon="fas fa-magnifying-glass-arrow-right" :loading="store.actionBusy" @click="doReconcileCv"
          title="Busca esse lead no CV pelo email/telefone e grava o cv_idlead se encontrar.">
          Buscar no CV
        </Button>
        <Button v-if="lead.status !== 'spam' && lead.status !== 'delivered'"
          variant="danger" size="sm" icon="fas fa-ban" :loading="store.actionBusy" @click="doMarkSpam">
          Marcar como spam
        </Button>
        <Button v-if="lead.status === 'spam'"
          variant="secondary" size="sm" icon="fas fa-rotate-left" :loading="store.actionBusy" @click="doUnmarkSpam">
          Não é spam
        </Button>
      </div>

      <!-- 9. Timeline de eventos -->
      <section class="rounded-xl border border-line bg-surface-raised p-4">
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-3">
          <i class="fas fa-clock-rotate-left mr-1"></i>Histórico de eventos
        </div>
        <ol class="relative border-l border-line ml-2 space-y-3">
          <li v-for="ev in events" :key="ev.id" class="ml-4">
            <div class="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-accent border-2 border-surface-raised"></div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[11px] text-ink-subtle font-mono">{{ fmt(ev.created_at) }}</span>
              <span class="text-[10px] text-ink-subtle font-mono">· {{ ev.actor }}</span>
            </div>
            <div class="text-sm text-ink font-medium">
              {{ ev.event_type }}
              <span v-if="ev.status_from || ev.status_to" class="text-ink-subtle font-normal text-xs">
                · {{ ev.status_from || '—' }} → {{ ev.status_to || '—' }}
              </span>
            </div>
            <div v-if="ev.message" class="text-xs text-ink-muted">{{ ev.message }}</div>
          </li>
          <li v-if="!events.length" class="ml-4 text-sm text-ink-subtle">Sem eventos.</li>
        </ol>
      </section>
    </div>

    <div v-else class="py-12 text-center text-ink-subtle">Lead não encontrado.</div>
  </Modal>
</template>
