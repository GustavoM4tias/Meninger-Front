<script setup>
import { computed, ref, watch } from 'vue';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import { iconForStage } from '../stages.js';

const props = defineProps({
  reserva: { type: Object, default: null },
  visivel: { type: Boolean, default: false },
});
const emit = defineEmits(['fechar']);

const detalhe = ref(null);
const loading = ref(false);
const tab = ref('geral');

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
};

async function carregarDetalhe(id) {
  loading.value = true;
  try {
    const r = await fetch(`${API_URL}/cv/reservas/report/${id}`, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) detalhe.value = d;
  } finally { loading.value = false; }
}

watch(() => [props.visivel, props.reserva?.idreserva], ([v, id]) => {
  if (v && id) { detalhe.value = null; tab.value = 'geral'; carregarDetalhe(id); }
});

const historico = computed(() => Array.isArray(detalhe.value?.status) ? detalhe.value.status : []);
const leads = computed(() => Array.isArray(detalhe.value?.leads_associados) ? detalhe.value.leads_associados : []);
const mensagens = computed(() => Array.isArray(detalhe.value?.mensagens) ? detalhe.value.mensagens : []);
const contratos = computed(() => Array.isArray(detalhe.value?.contratos) ? detalhe.value.contratos : []);

const tabOptions = computed(() => [
  { value: 'geral',     label: 'Geral',                                                                  icon: 'fas fa-circle-info' },
  { value: 'contratos', label: `Contratos${contratos.value.length ? ' (' + contratos.value.length + ')' : ''}`, icon: 'fas fa-file-contract' },
  { value: 'historico', label: `Histórico${historico.value.length ? ' (' + historico.value.length + ')' : ''}`, icon: 'fas fa-clock-rotate-left' },
  { value: 'leads',     label: `Leads${leads.value.length ? ' (' + leads.value.length + ')' : ''}`,             icon: 'fas fa-arrow-right-arrow-left' },
  { value: 'mensagens', label: `Mensagens${mensagens.value.length ? ' (' + mensagens.value.length + ')' : ''}`, icon: 'fas fa-envelope' },
]);

const fmt = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('pt-BR'); };

const cvLink = computed(() => {
  if (!props.reserva?.idreserva) return null;
  return `https://menin.cvcrm.com.br/gestor/comercial/reservas/${props.reserva.idreserva}/administrar`;
});

const isVendida = computed(() => props.reserva?.vendida === 'S');
const isCancelada = computed(() => /cancelad|distrato/i.test(props.reserva?.situacao?.nome || '') || /cancelad|distrato/i.test(props.reserva?.status_repasse || ''));

const bannerGradient = computed(() => {
  if (isVendida.value)   return 'from-emerald-700 via-emerald-600 to-teal-600';
  if (isCancelada.value) return 'from-red-700 via-red-600 to-rose-600';
  if (props.reserva?.status_repasse) return 'from-sky-700 via-sky-600 to-cyan-600';
  if (/contrato/i.test(props.reserva?.situacao?.nome || '')) return 'from-violet-700 via-violet-600 to-purple-600';
  return 'from-amber-700 via-orange-600 to-amber-600';
});
</script>

<template>
  <Modal :open="visivel" size="xl" hide-close @close="emit('fechar')">
    <template #header><div class="hidden"></div></template>

    <div class="-m-4 sm:-m-5">

      <!-- Banner -->
      <div class="relative bg-gradient-to-br text-white px-5 sm:px-6 pt-5 pb-4 overflow-hidden"
        :class="bannerGradient">
        <div class="pointer-events-none absolute inset-0 opacity-30"
          style="background-image:radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 18px 18px;"></div>
        <div class="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

        <div class="relative flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium
                           bg-white/20 backdrop-blur border border-white/20 text-white">
                <i :class="iconForStage(reserva?.situacao?.nome)" class="text-[10px]"></i>
                {{ reserva?.situacao?.nome || 'Sem situação' }}
              </span>
              <span v-if="isVendida"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold
                       bg-white/30 backdrop-blur border border-white/30 text-white">
                <i class="fas fa-flag-checkered text-[10px]"></i>Vendida (CRM)
              </span>
              <span class="text-[11px] text-white/70 font-mono">#{{ reserva?.idreserva }}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
              {{ reserva?.titular?.nome || '—' }}
            </h2>
            <p class="text-xs text-white/70 mt-1 font-mono">
              {{ reserva?.documento || '—' }} · {{ reserva?.empreendimento || '—' }}
            </p>
          </div>

          <button @click="emit('fechar')" aria-label="Fechar"
            class="h-9 w-9 grid place-items-center rounded-lg
                   bg-white/15 hover:bg-white/25 backdrop-blur
                   text-white transition-colors shrink-0">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div v-if="cvLink" class="relative mt-4">
          <a :href="cvLink" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                   bg-white/15 hover:bg-white/30 backdrop-blur border border-white/20
                   text-white text-xs font-medium transition-all hover:-translate-y-0.5">
            <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
            Abrir no CV CRM
          </a>
        </div>
      </div>

      <!-- Tabs -->
      <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="tab" :options="tabOptions" size="sm" class="overflow-x-auto" />
      </div>

      <!-- Content -->
      <div class="p-4 sm:p-5 max-h-[60vh] overflow-y-auto">
        <div v-if="loading" class="py-12 flex flex-col items-center gap-3 text-ink-muted">
          <Spinner size="lg" />
          <p class="text-sm">Carregando detalhes...</p>
        </div>

        <!-- TAB: GERAL -->
        <template v-else-if="tab === 'geral'">
          <div class="space-y-5">
            <!-- Status / Repasse / Vendida -->
            <section>
              <div class="flex items-center gap-1.5 mb-2">
                <i class="fas fa-circle-info text-xs text-accent"></i>
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</h4>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Situação</p>
                  <Badge size="sm" :variant="isVendida ? 'success' : isCancelada ? 'danger' : 'accent'" class="mt-1">
                    <i :class="iconForStage(reserva?.situacao?.nome)" class="text-[10px]"></i>
                    {{ reserva?.situacao?.nome || '—' }}
                  </Badge>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Status repasse</p>
                  <p class="text-sm text-ink mt-0.5">{{ reserva?.status_repasse || '—' }}</p>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken"
                  v-tippy="'Etapa do CRM marcada como Vendida — não significa venda concretizada'">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Etapa Vendida (CRM)</p>
                  <p class="text-sm font-semibold mt-0.5"
                    :class="isVendida ? 'text-emerald-500' : 'text-ink-subtle'">
                    {{ isVendida ? 'Sim' : 'Não' }}
                  </p>
                </div>
              </div>
            </section>

            <!-- Empreendimento / Imobiliária / etc -->
            <section>
              <div class="flex items-center gap-1.5 mb-2">
                <i class="fas fa-building text-xs text-accent"></i>
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Imóvel e responsáveis</h4>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div v-for="item in [
                  { label: 'Empreendimento',         value: reserva?.empreendimento },
                  { label: 'Etapa / Bloco / Unidade', value: [reserva?.etapa, reserva?.bloco, reserva?.unidade].filter(Boolean).join(' / ') },
                  { label: 'Tipo venda',              value: reserva?.tipovenda },
                  { label: 'Imobiliária',             value: reserva?.imobiliaria?.nome },
                  { label: 'Corretor',                value: reserva?.corretor?.nome },
                  { label: 'Empresa correspondente',  value: reserva?.empresa_correspondente?.nome },
                ]" :key="item.label"
                  class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">{{ item.label }}</p>
                  <p class="text-sm text-ink truncate">{{ item.value || '—' }}</p>
                </div>
              </div>
            </section>

            <!-- Datas -->
            <section>
              <div class="flex items-center gap-1.5 mb-2">
                <i class="far fa-calendar text-xs text-accent"></i>
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Datas e referências</h4>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Cadastro reserva</p>
                  <p class="text-sm text-ink font-mono">{{ fmt(reserva?.data_reserva) }}</p>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Data contrato</p>
                  <p class="text-sm text-ink font-mono">{{ fmt(reserva?.data_contrato) }}</p>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken"
                  v-tippy="'Data em que a etapa Vendida foi marcada no CRM'">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Etapa Vendida</p>
                  <p class="text-sm font-mono"
                    :class="reserva?.data_venda ? 'text-emerald-500 font-semibold' : 'text-ink'">
                    {{ fmt(reserva?.data_venda) }}
                  </p>
                </div>
                <div class="rounded-lg p-2.5 border border-accent/30 bg-accent-soft">
                  <p class="text-[10px] uppercase tracking-wider text-accent font-mono">Dias em reserva</p>
                  <p class="text-sm font-bold text-accent tabular-nums">
                    {{ Number(reserva?.dias_em_reserva || 0).toFixed(1) }}d
                  </p>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Pré-cadastro #</p>
                  <p class="text-sm text-ink font-mono">{{ reserva?.idprecadastro || '—' }}</p>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Proposta CV</p>
                  <p class="text-sm text-ink font-mono">{{ reserva?.idproposta_cv || '—' }}</p>
                </div>
                <div class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Proposta interna</p>
                  <p class="text-sm text-ink font-mono">{{ reserva?.idproposta_int || '—' }}</p>
                </div>
              </div>
            </section>

            <!-- Observações -->
            <section v-if="reserva?.observacoes">
              <div class="flex items-center gap-1.5 mb-2">
                <i class="fas fa-comment-dots text-xs text-accent"></i>
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Observações</h4>
              </div>
              <div class="rounded-lg p-3 border border-line bg-surface-sunken">
                <p class="text-sm text-ink leading-relaxed whitespace-pre-line">{{ reserva.observacoes }}</p>
              </div>
            </section>
          </div>
        </template>

        <!-- TAB: CONTRATOS -->
        <template v-else-if="tab === 'contratos'">
          <EmptyState v-if="!contratos.length"
            icon="fas fa-file-contract" title="Sem contratos"
            description="Esta reserva não possui contratos vinculados." />

          <div v-else class="space-y-2.5">
            <div v-for="(c, i) in contratos" :key="i"
              class="rounded-xl border border-line bg-surface-sunken p-3 border-l-4 border-l-emerald-500">
              <div class="text-sm font-semibold text-ink mb-2">
                Contrato #{{ c.idcontrato || c.numero_contrato || (i + 1) }}
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span class="text-ink-subtle font-mono">Data: </span>
                  <span class="text-ink">{{ fmt(c.data_contrato || c.data) }}</span>
                </div>
                <div>
                  <span class="text-ink-subtle font-mono">Situação: </span>
                  <span class="text-ink">{{ c.situacao || c.status || '—' }}</span>
                </div>
                <div>
                  <span class="text-ink-subtle font-mono">Tipo: </span>
                  <span class="text-ink">{{ c.tipo || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- TAB: HISTÓRICO -->
        <template v-else-if="tab === 'historico'">
          <EmptyState v-if="!historico.length"
            icon="fas fa-clock-rotate-left" title="Nenhum snapshot ainda"
            description="O histórico aparece quando há mudanças de etapa ou repasse." />

          <ol v-else class="relative border-l-2 border-line ml-3 space-y-4">
            <li v-for="(s, i) in historico" :key="i" class="ml-4">
              <div class="absolute -left-[7px] mt-1.5 w-3 h-3 bg-accent rounded-full ring-4 ring-surface-raised"></div>
              <div class="text-[11px] font-mono text-ink-subtle">{{ fmt(s.captured_at) }}</div>
              <div class="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="accent" size="sm">{{ s.status_reserva || '—' }}</Badge>
                <span v-if="s.status_repasse" class="text-xs text-ink-muted">
                  Repasse: <span class="text-ink font-medium">{{ s.status_repasse }}</span>
                </span>
              </div>
            </li>
          </ol>
        </template>

        <!-- TAB: LEADS -->
        <template v-else-if="tab === 'leads'">
          <EmptyState v-if="!leads.length"
            icon="fas fa-arrow-right-arrow-left" title="Sem leads associados"
            description="Esta reserva não possui leads vinculados." />

          <div v-else class="rounded-xl border border-line overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-surface-sunken/40 border-b border-line">
                <tr>
                  <th class="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">ID Lead</th>
                  <th class="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Situação</th>
                  <th class="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Cadastro</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="l in leads" :key="l.idlead" class="hover:bg-surface-sunken/40 transition-colors">
                  <td class="px-3 py-2 font-mono text-xs text-accent">{{ l.idlead }}</td>
                  <td class="px-3 py-2 text-xs text-ink">{{ l.idsituacao }}</td>
                  <td class="px-3 py-2 text-xs text-ink-muted font-mono">{{ fmt(l.data_cad) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- TAB: MENSAGENS -->
        <template v-else-if="tab === 'mensagens'">
          <EmptyState v-if="!mensagens.length"
            icon="fas fa-envelope" title="Sem mensagens"
            description="Esta reserva não possui mensagens registradas." />

          <div v-else class="space-y-2.5">
            <div v-for="(m, i) in mensagens" :key="i"
              class="rounded-xl border border-line bg-surface-sunken p-3">
              <div class="text-[11px] font-mono text-ink-subtle mb-1">{{ fmt(m.data_cad || m.data) }}</div>
              <div class="text-sm text-ink whitespace-pre-line leading-relaxed">{{ m.mensagem || m.texto || '—' }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('fechar')">Fechar</Button>
    </template>
  </Modal>
</template>
