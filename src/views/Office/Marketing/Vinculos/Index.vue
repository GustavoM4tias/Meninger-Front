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
import { useToast } from 'vue-toastification';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import CampaignDetailModal from '../Campanhas/components/CampaignDetailModal.vue';

const store = useCampaignsStore();
const toast = useToast();

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
// Dois recortes: TUDO (botão do topo da seção) ou UMA campanha/formulário
// (botão da linha). O recorte por linha é o caso real: a pessoa acabou de
// vincular aquela campanha e quer soltar só os leads dela.
const sending = ref(false);
const sendingKey = ref(null);        // 'all' | 'campaign:<id>' | 'form:<id>'
const sendResult = ref(null);

/* Enviar represado despacha lead de verdade ao CRM. O `confirm` do navegador
   nao deixava claro QUANTOS saem de uma vez. */
const pedindoEnvio = ref(false);
const alvoEnvio = ref(null);         // { key, label, total, campaignIds, formIds }

function enviarTodos() {
    const total = summary.value.leads_recoverable || 0;
    if (!total) return;
    alvoEnvio.value = { key: 'all', label: 'de todas as campanhas já vinculadas', total, campaignIds: [], formIds: [] };
    pedindoEnvio.value = true;
}

function enviarCampanha(c) {
    if (!c?.resolvable_count) return;
    alvoEnvio.value = {
        key: `campaign:${c.campaign_id}`,
        label: `da campanha "${c.name || '#' + c.campaign_id}"`,
        total: c.resolvable_count,
        campaignIds: [c.campaign_id],
        formIds: [],
    };
    pedindoEnvio.value = true;
}

function enviarFormulario(f) {
    if (!f?.held_count) return;
    alvoEnvio.value = {
        key: `form:${f.form_id}`,
        label: `do formulário "${f.name || '#' + f.form_id}"`,
        total: f.held_count,
        campaignIds: [],
        formIds: [f.form_id],
    };
    pedindoEnvio.value = true;
}

async function enviarConfirmado() {
    const alvo = alvoEnvio.value;
    if (!alvo) return;
    pedindoEnvio.value = false;
    sending.value = true;
    sendingKey.value = alvo.key;
    sendResult.value = null;
    try {
        const d = await store.dispatchRecoverable({
            preview: false,
            limit: 1000,
            campaignIds: alvo.campaignIds,
            formIds: alvo.formIds,
        });
        sendResult.value = d;
        if (!d) {
            toast.error(store.error || 'Não foi possível enviar os represados.');
        } else if (d.failed) {
            toast.warning(`${d.delivered} entregue(s), ${d.failed} falha(s) no envio ao CV.`);
        } else if (d.delivered) {
            toast.success(`${d.delivered} lead(s) represado(s) entregue(s) ao CV.`);
        } else {
            toast.info('Nenhum lead saiu: os represados ainda não têm vínculo resolvível.');
        }
    } finally {
        sending.value = false;
        sendingKey.value = null;
        alvoEnvio.value = null;
    }
}

const ov = computed(() => store.bindingOverview);
const funnel = computed(() => ov.value?.funnel || {});
const summary = computed(() => ov.value?.summary || {});
const held = computed(() => ov.value?.held || { campaigns: [], forms: [] });
const activeUnbound = computed(() => ov.value?.active_unbound_campaigns || []);
const backlog = computed(() => ov.value?.backlog || null);

function fmtInt(v) { return v == null ? '0' : new Intl.NumberFormat('pt-BR').format(Number(v)); }

// Por que essa campanha represa. Mesma frase na tabela e no cartão do celular.
function motivoBloqueio(c) {
    if (c.not_synced) return 'campanha não sincronizada';
    if (c.mapping_active === false) return 'vínculo desativado';
    return 'sem mídia definida';
}

// Bloqueadas = ainda seguram lead que NENHUM vínculo resolve hoje (nem o da
// campanha nem o do formulário). Recuperáveis = já dá pra soltar agora.
const campanhasBloqueadas = computed(() => held.value.campaigns.filter(c => c.blocked_count > 0));
const campanhasRecuperaveis = computed(() => held.value.campaigns.filter(c => c.resolvable_count > 0));
const formsRecuperaveis = computed(() => (held.value.forms || []).filter(f => f.is_bound && f.held_count > 0));
const temRecuperavel = computed(() => campanhasRecuperaveis.value.length > 0 || formsRecuperaveis.value.length > 0);

// Saúde geral: verde se cobertura alta e sem risco; âmbar/vermelho conforme.
const healthTone = computed(() => {
    const s = summary.value;
    if (s.leads_at_risk > 0 || s.unbound_campaigns_with_leads > 0) return 'danger';
    // Vínculo resolvido mas lead ainda parado: não é "tudo certo" — falta enviar.
    if (s.leads_recoverable > 0) return 'warn';
    if (s.active_unbound_campaigns > 0) return 'warn';
    if (funnel.value.coverage_pct != null && funnel.value.coverage_pct < 90) return 'warn';
    return 'ok';
});

const healthCopy = computed(() => {
    const s = summary.value;
    if (healthTone.value === 'danger') {
        return {
            title: `${fmtInt(s.leads_at_risk)} lead(s) represado(s) por falta de vínculo`,
            desc: `${s.unbound_campaigns_with_leads} campanha(s) sem vínculo estão segurando leads que não chegam ao CV. Vincule-as abaixo.`
                + (s.leads_recoverable > 0 ? ` Outros ${fmtInt(s.leads_recoverable)} lead(s) já têm vínculo e só falta enviar.` : ''),
        };
    }
    if (healthTone.value === 'warn') {
        if (s.leads_recoverable > 0) {
            return {
                title: `${fmtInt(s.leads_recoverable)} lead(s) represado(s) prontos pra enviar`,
                desc: 'O vínculo já resolve esses leads, mas eles ficaram presos de antes. Envie-os ao CV abaixo.',
            };
        }
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
    ok:     { wrap: 'border-data-pos/30 bg-data-pos/5', icon: 'fas fa-circle-check text-data-pos', ring: 'text-data-pos' },
    warn:   { wrap: 'border-data-warn/30 bg-data-warn/5',     icon: 'fas fa-triangle-exclamation text-data-warn', ring: 'text-data-warn' },
    danger: { wrap: 'border-data-neg/30 bg-data-neg/5',         icon: 'fas fa-circle-exclamation text-data-neg', ring: 'text-data-neg' },
};

// Cards do funil
const funnelCards = computed(() => {
    const f = funnel.value;
    return [
        { key: 'delivered',  label: 'Entregues ao CV', value: f.delivered,  icon: 'fas fa-circle-check', accent: 'text-data-pos bg-data-pos/10' },
        { key: 'held',       label: 'Represados',       value: f.held,       icon: 'fas fa-hand',         accent: 'text-data-neg bg-data-neg/10' },
        { key: 'pending',    label: 'Aguardando envio', value: f.pending,    icon: 'fas fa-hourglass-half', accent: 'text-accent bg-accent/10' },
        { key: 'failed',     label: 'Falhas',           value: f.failed,     icon: 'fas fa-circle-xmark', accent: 'text-data-warn bg-data-warn/10' },
    ];
});

function statusBadge(s) {
    const up = String(s || '').toUpperCase();
    if (up.includes('ACTIVE'))   return { label: 'Ativa',     cls: 'bg-data-pos/10 text-data-pos border-data-pos/20' };
    if (up.includes('PAUSED'))   return { label: 'Pausada',   cls: 'bg-data-warn/10 text-data-warn border-data-warn/20' };
    if (up.includes('ARCHIVED')) return { label: 'Arquivada', cls: 'bg-slate-500/10 text-ink-muted border-line/20' };
    if (up.includes('DELETED'))  return { label: 'Excluída',  cls: 'bg-data-neg/10 text-data-neg border-data-neg/20' };
    return { label: up || '—', cls: 'bg-slate-500/10 text-ink-muted border-line/20' };
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
            <div class="text-micro uppercase tracking-wider font-mono text-ink-subtle mt-1">cobertura</div>
          </div>
        </div>

        <!-- ══ Funil de entrega (fluxo AO VIVO) ═════════════════════════════ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2">
          <div v-for="(c, i) in funnelCards" :key="c.key" :style="{ '--i': i }"
            class="flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient
                   card-enter transition-all duration-200 ease-out-expo
                   hover:border-accent/40 hover:-translate-y-px hover:shadow-elevated">
            <div class="flex items-center justify-between">
              <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="c.accent">
                <i :class="c.icon"></i>
              </span>
            </div>
            <span class="text-xl font-semibold text-ink tabular-nums leading-none mt-1">{{ fmtInt(c.value) }}</span>
            <span class="text-micro text-ink-muted">{{ c.label }}</span>
          </div>
        </div>

        <!-- Contexto: cobertura mede só o fluxo ao vivo; espelho histórico à parte -->
        <div class="mb-5 text-micro text-ink-subtle flex items-start gap-1.5">
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
              <i class="fas fa-triangle-exclamation text-data-neg"></i>
              Campanhas sem vínculo represando leads
            </h2>
            <span v-if="campanhasBloqueadas.length"
              class="inline-flex rounded-full bg-data-neg/10 text-data-neg text-micro font-semibold px-2 py-0.5">
              {{ campanhasBloqueadas.length }}
            </span>
          </div>

          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div v-if="!campanhasBloqueadas.length" class="px-4 py-8 text-center text-ink-subtle text-sm">
              <i class="fas fa-circle-check text-data-pos text-xl mb-1.5 block"></i>
              Nenhuma campanha sem vínculo com leads represados. 🎉
            </div>
            <!-- Celular: cartão. A tabela de 6 colunas não cabe em 375px e
                 empurrava a página inteira na horizontal. -->
            <ul v-else class="md:hidden divide-y divide-line/60">
              <li v-for="c in campanhasBloqueadas" :key="`m-${c.campaign_id}`" class="p-3 flex flex-col gap-2">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <button v-if="!c.not_synced" @click="openCampaign(c.campaign_id)"
                      class="text-ink font-medium leading-tight text-left hover:text-accent break-words">
                      {{ c.name || '(não sincronizada)' }}
                    </button>
                    <div v-else class="text-ink font-medium leading-tight break-words">
                      {{ c.name || '(não sincronizada)' }}
                    </div>
                    <div class="text-micro font-mono text-ink-subtle mt-0.5">#{{ c.campaign_id }}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-lg font-semibold text-data-neg tabular-nums leading-none">{{ fmtInt(c.blocked_count) }}</div>
                    <div class="metric-label">represados</div>
                  </div>
                </div>

                <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div class="min-w-0">
                    <dt class="metric-label">Conta</dt>
                    <dd class="text-xs text-ink-muted break-words">{{ c.account_name || '—' }}</dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="metric-label">Status</dt>
                    <dd class="text-xs">
                      <span v-if="!c.not_synced" :class="['inline-flex rounded-md border px-2 py-0.5 text-micro font-medium', statusBadge(c.effective_status).cls]">
                        {{ statusBadge(c.effective_status).label }}
                      </span>
                      <span v-else class="text-micro text-ink-subtle italic">fora do cache</span>
                    </dd>
                  </div>
                  <div class="col-span-2 min-w-0">
                    <dt class="metric-label">Motivo</dt>
                    <dd class="text-xs text-ink-muted">{{ motivoBloqueio(c) }}</dd>
                  </div>
                  <div v-if="c.resolvable_count" class="col-span-2">
                    <dd class="text-micro text-ink-subtle">+ {{ fmtInt(c.resolvable_count) }} já recuperável nesta campanha</dd>
                  </div>
                </dl>

                <!-- alvo de 40px: o dedo tem que acertar -->
                <button v-if="!c.not_synced" @click="openCampaign(c.campaign_id)"
                  class="h-10 w-full rounded-lg bg-accent text-white text-xs font-medium
                         inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                  <i class="fas fa-link text-[10px]"></i>Vincular campanha
                </button>
                <div v-else class="text-micro text-ink-subtle italic text-center py-1">
                  Sincronize as campanhas para poder vincular.
                </div>
              </li>
            </ul>

            <table v-if="campanhasBloqueadas.length" class="hidden md:table min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-3 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
                  <th class="px-3 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle">Conta</th>
                  <th class="px-3 py-2.5 text-center text-micro font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                  <th class="px-3 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle">Motivo</th>
                  <th class="px-3 py-2.5 text-right text-micro font-mono uppercase tracking-wider text-ink-subtle">Leads represados</th>
                  <th class="px-3 py-2.5 w-28"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="c in campanhasBloqueadas" :key="c.campaign_id"
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
                    <div class="text-micro font-mono text-ink-subtle">#{{ c.campaign_id }}</div>
                  </td>
                  <td class="px-3 py-2.5 text-xs text-ink-muted truncate max-w-[160px]">{{ c.account_name || '—' }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <span v-if="!c.not_synced" :class="['inline-flex rounded-md border px-2 py-0.5 text-micro font-medium', statusBadge(c.effective_status).cls]">
                      {{ statusBadge(c.effective_status).label }}
                    </span>
                    <span v-else class="text-micro text-ink-subtle italic">fora do cache</span>
                  </td>
                  <td class="px-3 py-2.5 text-xs text-ink-muted">{{ motivoBloqueio(c) }}</td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="inline-flex items-center gap-1 font-semibold text-data-neg">
                      {{ fmtInt(c.blocked_count) }}
                    </span>
                    <div v-if="c.resolvable_count" class="text-micro text-ink-subtle">
                      + {{ fmtInt(c.resolvable_count) }} já recuperável
                    </div>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <button v-if="!c.not_synced" @click="openCampaign(c.campaign_id)"
                      class="inline-flex items-center gap-1.5 rounded-md bg-accent text-white px-2.5 py-1 text-micro font-medium hover:opacity-90 transition-opacity">
                      <i class="fas fa-link text-[9px]"></i>Vincular
                    </button>
                    <span v-else class="text-micro text-ink-subtle italic">sincronize as campanhas</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Surface>
        </section>

        <!-- ══ Represados recuperáveis (vínculo já resolve) ═════════════════ -->
        <section v-if="temRecuperavel" class="mb-5">
          <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
                <i class="fas fa-rotate-right text-accent"></i>
                Represados recuperáveis
              </h2>
              <span class="text-micro text-ink-subtle">o vínculo já resolve — falta enviar ao CV</span>
            </div>
            <Button size="sm" icon="fas fa-paper-plane" :loading="sending && sendingKey === 'all'"
              :disabled="sending || !summary.leads_recoverable"
              @click="enviarTodos">
              Enviar todos ({{ fmtInt(summary.leads_recoverable) }})
            </Button>
          </div>

          <!-- Resultado do envio -->
          <div v-if="sendResult" class="mb-2 rounded-lg border px-3 py-2.5 text-sm"
            :class="sendResult.failed ? 'border-data-warn/30 bg-data-warn/5 text-data-warn'
                                      : 'border-data-pos/20 bg-data-pos/5 text-data-pos'">
            <i :class="sendResult.failed ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mr-1.5"></i>
            <b>{{ fmtInt(sendResult.delivered) }}</b> entregue(s) ao CV,
            <b>{{ fmtInt(sendResult.recoverable) }}</b> recuperado(s)
            <template v-if="sendResult.no_binding"> · {{ fmtInt(sendResult.no_binding) }} ainda sem vínculo</template>
            <template v-if="sendResult.failed"> · {{ fmtInt(sendResult.failed) }} falha(s)</template>
            <template v-if="sendResult.reached_limit"> · atingiu o lote — clique de novo pra continuar</template>
          </div>

          <Surface variant="raised" padding="md">
            <ul class="divide-y divide-line/60 -my-1">
              <li v-for="c in campanhasRecuperaveis" :key="c.campaign_id"
                class="py-2 flex items-center gap-3 text-sm flex-wrap">
                <i class="fas fa-hand text-ink-subtle text-xs"></i>
                <button @click="openCampaign(c.campaign_id)"
                  class="flex-1 min-w-0 truncate text-ink text-left hover:text-accent hover:underline"
                  :title="`Abrir campanha ${c.name || c.campaign_id}`">
                  {{ c.name || `#${c.campaign_id}` }}
                  <span v-if="c.resolvable_via_form" class="text-micro text-ink-subtle">(vínculo do formulário)</span>
                </button>
                <span class="text-ink-muted whitespace-nowrap">{{ fmtInt(c.resolvable_count) }} lead(s)</span>
                <button
                  class="inline-flex items-center gap-1.5 rounded-md bg-accent text-white px-2.5 py-1 text-micro font-medium
                         hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="sending"
                  @click="enviarCampanha(c)">
                  <i :class="sending && sendingKey === `campaign:${c.campaign_id}` ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'"
                     class="text-[9px]"></i>
                  Enviar {{ fmtInt(c.resolvable_count) }}
                </button>
                <RouterLink to="/meta?tab=captacao" class="text-micro text-accent hover:underline whitespace-nowrap">
                  ver na inbox →
                </RouterLink>
              </li>

              <li v-for="f in formsRecuperaveis" :key="`form-${f.form_id}`"
                class="py-2 flex items-center gap-3 text-sm flex-wrap">
                <i class="fas fa-file-lines text-ink-subtle text-xs"></i>
                <span class="flex-1 min-w-0 truncate text-ink" :title="f.name">
                  {{ f.name || `#${f.form_id}` }}
                  <span class="text-micro text-ink-subtle">(lead sem campanha)</span>
                </span>
                <span class="text-ink-muted whitespace-nowrap">{{ fmtInt(f.held_count) }} lead(s)</span>
                <button
                  class="inline-flex items-center gap-1.5 rounded-md bg-accent text-white px-2.5 py-1 text-micro font-medium
                         hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="sending"
                  @click="enviarFormulario(f)">
                  <i :class="sending && sendingKey === `form:${f.form_id}` ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'"
                     class="text-[9px]"></i>
                  Enviar {{ fmtInt(f.held_count) }}
                </button>
              </li>
            </ul>
          </Surface>
        </section>

        <!-- ══ Campanhas ativas sem vínculo (preventivo) ════════════════════ -->
        <section v-if="activeUnbound.length" class="mb-5">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-shield-halved text-data-warn"></i>
              Campanhas ativas sem vínculo (preventivo)
            </h2>
            <span class="text-micro text-ink-subtle">ainda sem leads represados, mas vão gerar</span>
          </div>
          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <tbody class="divide-y divide-line/60">
                <tr v-for="c in activeUnbound" :key="c.campaign_id" class="hover:bg-surface-hover/40 transition-colors">
                  <td class="px-3 py-2.5">
                    <button @click="openCampaign(c.campaign_id)"
                      class="text-ink font-medium leading-tight truncate max-w-[320px] text-left hover:text-accent hover:underline block"
                      :title="`Abrir campanha ${c.name || c.campaign_id}`">{{ c.name || `#${c.campaign_id}` }}</button>
                    <div class="text-micro font-mono text-ink-subtle">{{ c.account_name || '—' }}</div>
                  </td>
                  <td class="px-3 py-2.5 text-xs text-ink-muted">
                    {{ c.reason === 'sem_midia' ? 'sem mídia definida' : 'vínculo desativado' }}
                  </td>
                  <td class="px-3 py-2.5 text-right w-28">
                    <button @click="openCampaign(c.campaign_id)"
                      class="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-micro font-medium text-ink-muted hover:text-accent hover:border-accent/40 transition-colors">
                      <i class="fas fa-link text-[9px]"></i>Vincular
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </Surface>
        </section>

        <!-- ══ Backlog pronto pra enviar ════════════════════════════════════ -->
        <section v-if="backlog && (backlog.historical_total > 0 || backlog.routed_pending > 0)" class="mb-5">
          <Surface variant="raised" padding="md" class="flex items-start gap-3">
            <i class="fas fa-paper-plane text-accent text-lg mt-0.5"></i>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-ink">Backlog pronto pra enviar ao CV</div>
              <div class="text-xs text-ink-muted mt-0.5">
                <b>{{ fmtInt(backlog.historical_total) }}</b> histórico(s)
                <template v-if="backlog.routed_pending"> · <b>{{ fmtInt(backlog.routed_pending) }}</b> na fila</template>
                aguardando disparo (desde {{ backlog.cutoff }}).
                <span v-if="backlog.shadow_mode" class="text-data-warn">Modo sombra ligado — desligue antes de disparar.</span>
              </div>
            </div>
            <RouterLink to="/meta?tab=campanhas"
              class="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-micro font-medium text-ink-muted hover:text-accent hover:border-accent/40 transition-colors whitespace-nowrap">
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
                <RouterLink to="/meta?tab=formularios" class="text-micro text-accent hover:underline whitespace-nowrap">
                  configurar →
                </RouterLink>
              </li>
            </ul>
          </Surface>
        </section>
      </template>

      <!-- Erro -->
      <div v-if="store.error && !ov"
        class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-sm text-data-neg flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5"></i>
        <div>{{ store.error }}</div>
      </div>

      <!-- Modal de campanha (vincular) -->
      <CampaignDetailModal v-model:open="detailOpen" :campaign-id="detailId" @saved="reload" />
  </div>

  <ConfirmDialog :open="pedindoEnvio" tone="accent"
    :title="`Enviar ${alvoEnvio?.total || 0} lead(s) represado(s) ao CV?`"
    :consequence="`Os ${alvoEnvio?.total || 0} lead(s) represado(s) ${alvoEnvio?.label || ''} são roteados e despachados ao CRM agora.`"
    hint="É upsert: lead que já existe no CV é atualizado, não duplicado."
    :confirm-label="`Enviar ${alvoEnvio?.total || 0}`"
    :loading="sending"
    @confirm="enviarConfirmado" @cancel="pedindoEnvio = false" />
</template>
