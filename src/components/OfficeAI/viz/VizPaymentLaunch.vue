<script setup>
/**
 * VizPaymentLaunch - o cartão de lançamento de pagamento dentro do chat.
 * ─────────────────────────────────────────────────────────────────────────────
 * payment: { draft, ok, motivos[], avisos[], passos[{label}], tipo{name,documento},
 *            credor{id,name}, contrato{label,...}, item{descricao,saldo} }
 *
 * A Eme leu a NF e o boleto e rodou o PORTÃO DE REGRAS (a mesma prévia da
 * tela). Nada foi lançado: quem lança é o clique em Confirmar, pela rota
 * /sienge/payment-flow/eme/confirm, que roda o portão DE NOVO no servidor e
 * cria pelo mesmo caminho do cadastro da tela. Recusado pelo portão = sem botão.
 *
 * "Já lançado" fica em localStorage por id do bloco: conversa reaberta mostra
 * o cartão fechado em vez de oferecer o mesmo lançamento de novo (o servidor
 * também recusa: NF repetida do mesmo fornecedor).
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const props = defineProps({
  block: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const router = useRouter();
const toast = useToast();
const CHAVE = 'eme_pagamentos_lancados';

const p = computed(() => props.block?.payment || {});
const d = computed(() => p.value.draft || {});

const estado = ref('idle'); // idle | sending | done | error
const erro = ref('');
const motivosServidor = ref([]);
const criado = ref(null);

function lidos() {
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || '{}'); return v && typeof v === 'object' ? v : {}; }
  catch { return {}; }
}
function marcar(id, launchId) {
  try {
    const v = lidos();
    v[id] = launchId;
    const chaves = Object.keys(v).slice(-50);
    localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries(chaves.map(k => [k, v[k]]))));
  } catch { /* sem storage: só não lembra depois de recarregar */ }
}
const jaLancado = lidos()[props.block?.id];
if (jaLancado) { estado.value = 'done'; criado.value = { id: jaLancado }; }

const moeda = (v) => (v == null || v === '' ? '—'
  : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const data = (v) => { if (!v) return '—'; const [y, m, dd] = String(v).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };
const doc = (v) => {
  const s = String(v || '').replace(/\D/g, '');
  if (s.length === 14) return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (s.length === 11) return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return v || '—';
};

const linhas = computed(() => [
  ['Tipo', p.value.tipo?.name || d.value.launchType],
  ['Fornecedor', d.value.providerName],
  ['CNPJ/CPF', doc(d.value.providerCnpj)],
  ['Empreendimento', d.value.enterpriseName],
  ['Valor', moeda(d.value.unitPrice)],
  ['Documento', [d.value.nfType, d.value.nfNumber && `nº ${d.value.nfNumber}`].filter(Boolean).join(' ') || '—'],
  ['Emissão', data(d.value.nfIssueDate)],
  ['Vencimento', data(d.value.boletoDueDate)],
  ...(p.value.contrato?.label ? [['Contrato', p.value.contrato.label]] : []),
  ...(p.value.item ? [['Item', `${p.value.item.descricao} · saldo ${moeda(p.value.item.saldo)}`]] : []),
].filter(([, v]) => v));

const motivos = computed(() => (motivosServidor.value.length ? motivosServidor.value : p.value.motivos || []));
const podeConfirmar = computed(() => p.value.ok && !motivosServidor.value.length && estado.value !== 'sending');

async function confirmar() {
  if (!podeConfirmar.value) return;
  estado.value = 'sending';
  erro.value = '';
  try {
    const r = await requestWithAuth(`${API_URL}/sienge/payment-flow/eme/confirm`, {
      method: 'POST',
      body: JSON.stringify({ draft: d.value }),
    });
    criado.value = r?.launch || null;
    estado.value = 'done';
    marcar(props.block?.id, criado.value?.id);
    toast.success(`Lançamento #${criado.value?.id} criado. A esteira já está rodando.`);
  } catch (err) {
    estado.value = 'error';
    // 422 do portão: o Sienge mudou desde o cartão (ou a NF já foi lançada).
    const msg = err?.message || 'Não foi possível lançar.';
    if (err?.status === 422 || err?.status === 409) motivosServidor.value = msg.split(/(?<=\.)\s+/).filter(Boolean);
    else erro.value = msg;
  }
}

function abrirTela() {
  router.push({ path: '/financeiro/paymentflow', query: criado.value?.id ? { search: d.value.nfNumber || '' } : {} });
}
</script>

<template>
  <div class="rounded-xl border bg-surface-raised overflow-hidden"
    :class="estado === 'done' ? 'border-data-pos/40' : p.ok ? 'border-line' : 'border-data-neg/40'">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-line bg-surface-sunken/50">
      <i class="fas fa-file-invoice-dollar" :class="p.ok ? 'text-accent' : 'text-data-neg'"></i>
      <span class="text-sm font-semibold text-ink truncate">Lançamento no Sienge</span>
      <span class="ml-auto text-micro font-mono"
        :class="estado === 'done' ? 'text-data-pos' : p.ok ? 'text-ink-subtle' : 'text-data-neg'">
        {{ estado === 'done' ? 'lançado' : p.ok ? 'para conferir' : 'recusado' }}
      </span>
    </div>

    <div class="p-3 space-y-3">
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <template v-for="[k, v] in linhas" :key="k">
          <dt class="text-ink-subtle">{{ k }}</dt>
          <dd class="text-ink truncate" :title="String(v)">{{ v }}</dd>
        </template>
      </dl>

      <div v-if="p.passos?.length && !compact">
        <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1">Vai acontecer</p>
        <p class="text-xs text-ink-muted">{{ p.passos.map(s => s.label).join(' → ') }}</p>
      </div>

      <div v-if="motivos.length" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-data-neg space-y-1 text-xs">
        <p class="font-semibold flex items-center gap-1.5"><i class="fas fa-shield-halved"></i>O portão de regras não deixa lançar</p>
        <p v-for="(m, i) in motivos" :key="i">{{ m }}</p>
      </div>

      <div v-if="p.avisos?.length" class="rounded-lg border border-data-warn/30 bg-data-warn/10 px-3 py-2 text-data-warn space-y-1 text-xs">
        <p v-for="(a, i) in p.avisos" :key="i"><i class="fas fa-triangle-exclamation mr-1"></i>{{ a }}</p>
      </div>

      <p v-if="erro" class="text-xs text-data-neg"><i class="fas fa-circle-exclamation mr-1"></i>{{ erro }}</p>

      <div v-if="estado === 'done'" class="rounded-lg border border-data-pos/30 bg-data-pos/10 px-3 py-2 text-data-pos text-xs flex items-center gap-2">
        <i class="fas fa-circle-check"></i>
        <span>Lançamento <b v-if="criado?.id">#{{ criado.id }}</b> criado. Acompanhe no Fluxo de Pagamento.</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button v-if="estado !== 'done' && p.ok" type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 min-h-[40px] disabled:opacity-50"
          :disabled="!podeConfirmar" @click="confirmar">
          <i :class="estado === 'sending' ? 'fas fa-spinner fa-spin' : 'fas fa-check'"></i>
          {{ estado === 'sending' ? 'Lançando...' : 'Confirmar lançamento' }}
        </button>
        <button type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-line text-ink-muted hover:bg-surface-sunken text-xs px-3 min-h-[40px]"
          @click="abrirTela">
          <i class="fas fa-arrow-up-right-from-square"></i>Abrir Fluxo de Pagamento
        </button>
      </div>
      <p v-if="estado !== 'done' && p.ok" class="text-micro text-ink-subtle">
        Ao confirmar, o lançamento é criado e a esteira começa a rodar no Sienge com a sua credencial.
      </p>
    </div>
  </div>
</template>
