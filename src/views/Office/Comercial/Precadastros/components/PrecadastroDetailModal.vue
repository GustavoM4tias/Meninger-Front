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
  precadastro: { type: Object, default: null },
  visivel: { type: Boolean, default: false },
});
const emit = defineEmits(['fechar']);

const detalhe = ref(null);
const loading = ref(false);
const tab = ref('geral');

const tabOptions = computed(() => [
  { value: 'geral',     label: 'Geral',                                      icon: 'fas fa-circle-info' },
  { value: 'historico', label: `Histórico${historico.value.length ? ' (' + historico.value.length + ')' : ''}`, icon: 'fas fa-clock-rotate-left' },
  { value: 'leads',     label: `Leads${leads.value.length ? ' (' + leads.value.length + ')' : ''}`,             icon: 'fas fa-arrow-right-arrow-left' },
]);

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
};

async function carregarDetalhe(id) {
  loading.value = true;
  try {
    const r = await fetch(`${API_URL}/cv/precadastros/${id}`, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) detalhe.value = d;
  } finally { loading.value = false; }
}

watch(() => [props.visivel, props.precadastro?.idprecadastro], ([v, id]) => {
  if (v && id) { detalhe.value = null; tab.value = 'geral'; carregarDetalhe(id); }
});

const historico = computed(() => {
  const h = detalhe.value?.status_historico;
  return Array.isArray(h) ? h : [];
});
const leads = computed(() => {
  const l = detalhe.value?.leads_associados;
  return Array.isArray(l) ? l : [];
});

const fmt = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('pt-BR'); };
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
};

// Banner gradient by status
const bannerGradient = computed(() => {
  const s = props.precadastro?.situacao_nome || '';
  if (/aprovad/i.test(s) && !/restri/i.test(s)) return 'from-emerald-700 via-emerald-600 to-teal-600';
  if (/reserva/i.test(s))                       return 'from-amber-700 via-orange-600 to-amber-600';
  if (/reprovad|negad|cancelad|distrat/i.test(s)) return 'from-red-700 via-red-600 to-rose-600';
  if (/análise|analise|aguardando/i.test(s))    return 'from-purple-700 via-violet-600 to-purple-600';
  return 'from-blue-700 via-blue-600 to-indigo-600';
});

const statusVariant = computed(() => {
  const s = props.precadastro?.situacao_nome || '';
  if (/aprovad/i.test(s) && !/restri/i.test(s)) return 'success';
  if (/reserva/i.test(s))                       return 'warning';
  if (/reprovad|negad|cancelad|distrat/i.test(s)) return 'danger';
  if (/análise|analise|aguardando/i.test(s))    return 'accent';
  return 'info';
});

// Cards financeiros
const financialCards = computed(() => [
  { label: 'Avaliação', value: fmtMoney(props.precadastro?.valor_avaliacao), accent: 'text-blue-500' },
  { label: 'Aprovado', value: fmtMoney(props.precadastro?.valor_aprovado), accent: 'text-emerald-500' },
  { label: 'FGTS', value: fmtMoney(props.precadastro?.valor_fgts), accent: 'text-amber-500' },
  { label: 'Subsídio', value: fmtMoney(props.precadastro?.valor_subsidio), accent: 'text-purple-500' },
  { label: 'Total', value: fmtMoney(props.precadastro?.valor_total), accent: 'text-cyan-500' },
  { label: 'Prestação', value: fmtMoney(props.precadastro?.valor_prestacao), accent: 'text-orange-500' },
  { label: 'Saldo Devedor', value: fmtMoney(props.precadastro?.saldo_devedor), accent: 'text-red-500' },
  { label: 'Renda Total', value: fmtMoney(props.precadastro?.renda_total), accent: 'text-indigo-500' },
]);
</script>

<template>
  <Modal :open="visivel" size="xl" hide-close @close="emit('fechar')">
    <template #header><div class="hidden"></div></template>

    <div class="-m-4 sm:-m-5">

      <!-- Banner gradient -->
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
                <i :class="iconForStage(precadastro?.situacao_nome)" class="text-[10px]"></i>
                {{ precadastro?.situacao_nome || 'Sem situação' }}
              </span>
              <span class="text-[11px] text-white/70 font-mono">#{{ precadastro?.idprecadastro }}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
              {{ precadastro?.nome_cliente || precadastro?.cliente?.nome || '—' }}
            </h2>
            <p class="text-xs text-white/70 mt-1 font-mono">
              {{ precadastro?.documento || '—' }} · Cadastrado em {{ fmt(precadastro?.data_cad) }}
            </p>
          </div>

          <button @click="emit('fechar')" aria-label="Fechar"
            class="h-9 w-9 grid place-items-center rounded-lg
                   bg-white/15 hover:bg-white/25 backdrop-blur
                   text-white transition-colors shrink-0">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div v-if="precadastro?.link" class="relative mt-4">
          <a :href="precadastro.link" target="_blank" rel="noopener"
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
            <!-- Cards financeiros -->
            <section>
              <div class="flex items-center gap-1.5 mb-2">
                <i class="fas fa-coins text-xs text-accent"></i>
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Financeiro</h4>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div v-for="c in financialCards" :key="c.label"
                  class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">{{ c.label }}</p>
                  <p class="text-sm font-semibold tabular-nums" :class="c.accent">{{ c.value }}</p>
                </div>
              </div>
            </section>

            <!-- Empreendimento / Imobiliária / etc -->
            <section>
              <div class="flex items-center gap-1.5 mb-2">
                <i class="fas fa-circle-info text-xs text-accent"></i>
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Detalhes</h4>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div v-for="item in [
                  { label: 'Empreendimento',   value: precadastro?.empreendimento?.nome },
                  { label: 'Unidade',          value: precadastro?.unidade?.nome },
                  { label: 'Imobiliária',      value: precadastro?.imobiliaria?.nome },
                  { label: 'Corretor',         value: precadastro?.corretor?.nome },
                  { label: 'Empresa',          value: precadastro?.empresa_correspondente?.nome },
                  { label: 'Correspondente',   value: precadastro?.correspondente?.nome },
                  { label: 'Intenção',         value: precadastro?.intencao_compra },
                  { label: 'Tabela',           value: precadastro?.tabela },
                  { label: 'Aprovado por',     value: precadastro?.usuario_aprovou?.nome },
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
                <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Datas e prazos</h4>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div v-for="item in [
                  { label: 'Cadastro',             value: fmt(precadastro?.data_cad) },
                  { label: 'Finalização',          value: fmt(precadastro?.data_fim) },
                  { label: 'Cancelamento',         value: fmt(precadastro?.data_cancelamento) },
                  { label: 'Vencimento aprovação', value: precadastro?.vencimento_aprovacao },
                ]" :key="item.label"
                  class="rounded-lg p-2.5 border border-line bg-surface-sunken">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">{{ item.label }}</p>
                  <p class="text-sm text-ink font-mono">{{ item.value || '—' }}</p>
                </div>
                <div class="rounded-lg p-2.5 border border-accent/30 bg-accent-soft">
                  <p class="text-[10px] uppercase tracking-wider text-accent font-mono">Dias em análise</p>
                  <p class="text-sm font-bold text-accent tabular-nums">
                    {{ Number(precadastro?.dias_em_analise || 0).toFixed(1) }}d
                  </p>
                </div>
              </div>
            </section>
          </div>
        </template>

        <!-- TAB: HISTÓRICO -->
        <template v-else-if="tab === 'historico'">
          <EmptyState v-if="!historico.length"
            icon="fas fa-clock-rotate-left" title="Nenhum snapshot ainda"
            description="O histórico aparece quando há mudanças de etapa ou valor." />

          <ol v-else class="relative border-l-2 border-line ml-3 space-y-4">
            <li v-for="(s, i) in historico" :key="i" class="ml-4">
              <div class="absolute -left-[7px] mt-1.5 w-3 h-3 bg-accent rounded-full ring-4 ring-surface-raised"></div>
              <div class="text-[11px] font-mono text-ink-subtle">{{ fmt(s.captured_at) }}</div>
              <div class="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="accent" size="sm">{{ s.situacao_nome || '—' }}</Badge>
                <span class="text-xs text-emerald-500 font-semibold tabular-nums">{{ fmtMoney(s.valor_aprovado) }}</span>
              </div>
            </li>
          </ol>
        </template>

        <!-- TAB: LEADS -->
        <template v-else-if="tab === 'leads'">
          <EmptyState v-if="!leads.length"
            icon="fas fa-arrow-right-arrow-left" title="Sem leads associados"
            description="Este pré-cadastro não possui leads vinculados." />

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
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('fechar')">Fechar</Button>
    </template>
  </Modal>
</template>
