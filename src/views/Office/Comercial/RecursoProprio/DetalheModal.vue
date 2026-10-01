<script setup>
// Detalhe de uma reserva no relatório de Recurso Próprio.
//
// Tudo que aparece aqui já veio na linha do relatório (séries do CV, recebimentos
// do Sienge, conferência da ficha): o modal não consulta nada, só abre o que a
// tabela resume. A única escrita é a observação da reserva.
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { fmtMoney, fmtNum, fmtDate, fmtDateTime } from '@/utils/format';
import { fieldBase } from '@/components/UI/_classes';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import { cvReservaFinanceiroUrl, cvReservaUrl } from './cvLinks';

const props = defineProps({
  open: { type: Boolean, default: false },
  linha: { type: Object, default: null },
  podeAnotar: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open', 'nota-salva']);
const toast = useToast();

const fieldCls = `${fieldBase} px-3 py-2 text-sm rounded-lg`;
const brl = (v) => fmtMoney(v);
const pct = (v, casas = 1) => `${fmtNum(v * 100, casas)}%`;

const GRUPO = {
  ato: 'Ato', mensais: 'Parcela mensal', outras_parcelas: 'Outra parcela', financiamento: 'Financiamento',
  fgts: 'FGTS', federal: 'Subsídio federal', estadual: 'Subsídio estadual', desconto: 'Desconto',
};
const RECURSO_PROPRIO = new Set(['ato', 'mensais', 'outras_parcelas']);

const aba = ref('condicao');
const ABAS = computed(() => [
  { value: 'condicao', label: 'Condição no CV', icon: 'fas fa-file-invoice-dollar' },
  { value: 'recebido', label: `Recebido${props.linha?.recebimentos?.length ? ` (${props.linha.recebimentos.length})` : ''}`, icon: 'fas fa-hand-holding-dollar' },
  { value: 'regra', label: `Regra${props.linha?.foraDaRegra?.length ? ` (${props.linha.foraDaRegra.length})` : ''}`, icon: 'fas fa-clipboard-check' },
  { value: 'obs', label: 'Observação', icon: 'fas fa-comment' },
]);

const texto = ref('');
const tom = ref('alerta');
const salvando = ref(false);
const TONS = [
  { value: 'alerta', label: 'Ícone de alerta' },
  { value: 'info', label: 'Ícone de informação' },
];

watch(() => [props.open, props.linha?.id], ([aberto]) => {
  if (!aberto) return;
  aba.value = 'condicao';
  texto.value = props.linha?.nota?.texto || '';
  tom.value = props.linha?.nota?.tom || 'alerta';
}, { immediate: true });

const l = computed(() => props.linha || {});
const recebido = computed(() => (l.value.recebidoAto || 0) + (l.value.recebidoMensais || 0));
const falta = computed(() => Math.max(0, (l.value.recursoProprio || 0) - recebido.value));
const pctRecebido = computed(() => (l.value.recursoProprio ? recebido.value / l.value.recursoProprio : 0));

const corRenda = computed(() => (l.value.nivelRenda === 'alto' ? 'text-data-neg'
  : l.value.nivelRenda === 'atencao' ? 'text-data-warn' : 'text-ink'));

const resumo = computed(() => [
  { k: 'Valor de venda', v: brl(l.value.venda) },
  { k: 'Financiamento', v: brl(l.value.financiamento) },
  { k: 'FGTS', v: brl(l.value.fgts) },
  { k: 'Subsídio federal', v: brl(l.value.federal) },
  { k: 'Subsídio estadual', v: brl(l.value.estadual) },
  ...(l.value.desconto ? [{ k: 'Desconto construtora', v: brl(l.value.desconto) }] : []),
  { k: 'Ato', v: brl(l.value.ato) },
  { k: 'Parcelas', v: l.value.nParcelas ? `${l.value.nParcelas}x ${brl(l.value.parcela)}` : 'só o ato' },
]);

function abrir(url) { window.open(url, '_blank', 'noopener'); }

async function salvarNota() {
  salvando.value = true;
  try {
    const res = await requestWithAuth(`/recurso-proprio/notas/${l.value.id}`, {
      method: 'PUT', body: JSON.stringify({ texto: texto.value, tom: tom.value }),
    });
    emit('nota-salva', { id: l.value.id, nota: res.nota });
    toast.success(res.nota ? 'Observação salva. Ela aparece para todos que abrem este relatório.' : 'Observação apagada.');
  } catch (e) {
    toast.error(e.message || 'Não foi possível salvar a observação.');
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <Modal :open="open" size="xl" :title="l.nome || 'Reserva'"
    :subtitle="`Reserva #${l.id} · ${l.unidade || '-'} · ${l.modulo || l.etapa || '-'}`"
    @update:open="(v) => emit('update:open', v)" @close="emit('update:open', false)">
    <div v-if="linha" class="space-y-5">
      <!-- Situação + atalhos -->
      <div class="flex flex-wrap items-center gap-2">
        <Badge :variant="l.situacao === 'Vendida' ? 'success' : 'neutral'">{{ l.situacao }}</Badge>
        <span class="text-xs text-ink-muted">Reservada em {{ fmtDate(l.dataReserva) }}</span>
        <span class="text-xs text-ink-muted">· {{ l.corretor || '-' }} · {{ l.imobiliaria || '-' }}</span>
        <div class="flex gap-2 ml-auto">
          <Button size="sm" icon="fas fa-arrow-up-right-from-square" @click="abrir(cvReservaFinanceiroUrl(l.id))">Financeiro no CV</Button>
          <Button size="sm" variant="secondary" icon="fas fa-bookmark" @click="abrir(cvReservaUrl(l.id))">Reserva no CV</Button>
        </div>
      </div>

      <!-- Números principais -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-xl border border-line bg-surface-sunken/40 p-3">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">Recurso próprio</p>
          <p class="text-lg font-bold tabular-nums text-ink">{{ brl(l.recursoProprio) }}</p>
          <p class="text-micro text-ink-subtle tabular-nums">{{ brl(l.ato) }} ato + {{ brl(l.parcelas) }}</p>
        </div>
        <div class="rounded-xl border border-line bg-surface-sunken/40 p-3">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">% da renda</p>
          <p :class="['text-lg font-bold tabular-nums', corRenda]">{{ l.pctRenda ? pct(l.pctRenda) : '-' }}</p>
          <p class="text-micro text-ink-subtle tabular-nums">renda {{ l.renda ? brl(l.renda) : 'não informada' }} · limite {{ fmtNum(l.limiteRendaPct, 0) }}%</p>
        </div>
        <div class="rounded-xl border border-line bg-surface-sunken/40 p-3">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">Recebido</p>
          <p class="text-lg font-bold tabular-nums text-data-pos">{{ brl(recebido) }}</p>
          <p class="text-micro text-ink-subtle tabular-nums">{{ pct(pctRecebido) }} · falta {{ brl(falta) }}</p>
        </div>
        <div class="rounded-xl border border-line bg-surface-sunken/40 p-3">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">Regra da ficha</p>
          <p :class="['text-lg font-bold', !l.fichaUsada ? 'text-ink-subtle' : l.foraDaRegra?.length ? 'text-data-warn' : 'text-data-pos']">
            {{ !l.fichaUsada ? 'Não conferida' : l.foraDaRegra?.length ? `${l.foraDaRegra.length} fora` : 'Dentro' }}
          </p>
          <p class="text-micro text-ink-subtle">{{ l.fichaUsada ? `ficha de ${String(l.fichaUsada.mes).slice(5, 7)}/${String(l.fichaUsada.mes).slice(0, 4)}` : 'sem ficha da época' }}</p>
        </div>
      </div>

      <div v-if="l.nota" :class="['rounded-xl border p-3 text-sm flex gap-2', l.nota.tom === 'info' ? 'border-accent/20 bg-accent-soft text-ink' : 'border-data-neg/20 bg-data-neg/10 text-ink']">
        <i :class="[l.nota.tom === 'info' ? 'fas fa-circle-info text-accent' : 'fas fa-triangle-exclamation text-data-neg', 'mt-0.5']"></i>
        <span class="whitespace-pre-line">{{ l.nota.texto }}</span>
      </div>
      <p v-for="p in l.pendencias" :key="p" class="text-sm text-data-warn"><i class="fas fa-clock mr-1"></i>{{ p }}</p>
      <div v-if="l.fiadores?.length" class="rounded-xl border border-accent/20 bg-accent-soft p-3 text-sm text-ink flex gap-2">
        <i class="fas fa-user-shield text-accent mt-0.5"></i>
        <div>
          <p><b>Com fiador:</b> {{ l.fiadores.map((f) => `${f.nome} (${f.tipo})`).join(', ') }}</p>
          <p v-if="l.rendaComFiador" class="text-xs text-ink-muted">A parcela passa do limite da renda do titular e o fiador cobre pela regra da ficha. O CV não traz a renda do fiador: confira se ela atende o limite.</p>
        </div>
      </div>

      <div class="overflow-x-auto -mx-1 px-1">
        <SegmentedControl v-model="aba" :options="ABAS" size="sm" />
      </div>

      <!-- Condição -->
      <div v-if="aba === 'condicao'" class="space-y-4">
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
          <div v-for="i in resumo" :key="i.k">
            <dt class="text-micro uppercase tracking-wide text-ink-subtle">{{ i.k }}</dt>
            <dd class="text-sm font-semibold tabular-nums text-ink">{{ i.v }}</dd>
          </div>
        </dl>
        <div class="rounded-xl border border-line overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-surface-sunken text-micro uppercase tracking-wide text-ink-subtle">
              <tr>
                <th class="text-left px-3 py-2">Série</th>
                <th class="text-left px-3 py-2 hidden sm:table-cell">Entra como</th>
                <th class="text-right px-3 py-2">Parcelas</th>
                <th class="text-right px-3 py-2">Total</th>
                <th class="text-right px-3 py-2 hidden sm:table-cell">1º vencimento</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="(s, i) in l.series" :key="i" :class="RECURSO_PROPRIO.has(s.grupo) ? 'bg-accent-soft/30' : ''">
                <td class="px-3 py-2">
                  <p class="text-ink">{{ s.serie }}</p>
                  <p class="text-micro text-ink-subtle sm:hidden">{{ GRUPO[s.grupo] || 'fora da conta' }}</p>
                </td>
                <td class="px-3 py-2 hidden sm:table-cell">
                  <span :class="s.grupo ? 'text-ink-muted' : 'text-data-warn'">{{ GRUPO[s.grupo] || 'fora da conta' }}</span>
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{{ s.quantidade }}x {{ brl(s.valor) }}</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{{ brl(s.total) }}</td>
                <td class="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{{ fmtDate(s.vencimento) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-micro text-ink-subtle">Linhas destacadas somam o recurso próprio. Valores exatamente como estão no financeiro da reserva no CV.</p>
      </div>

      <!-- Recebido -->
      <div v-else-if="aba === 'recebido'" class="space-y-3">
        <p v-if="!l.recebimentos?.length" class="text-sm text-ink-muted">Nada recebido no Sienge para esta reserva.</p>
        <div v-else class="rounded-xl border border-line overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-surface-sunken text-micro uppercase tracking-wide text-ink-subtle">
              <tr>
                <th class="text-left px-3 py-2">Data</th>
                <th class="text-left px-3 py-2">Tipo</th>
                <th class="text-left px-3 py-2 hidden sm:table-cell">Título / parcela</th>
                <th class="text-right px-3 py-2">Valor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="(r, i) in l.recebimentos" :key="i">
                <td class="px-3 py-2 tabular-nums">{{ fmtDate(r.data) }}</td>
                <td class="px-3 py-2">
                  <Badge size="sm" :variant="r.ato ? 'accent' : 'neutral'">{{ r.ato ? 'Ato' : 'Mensal' }}</Badge>
                  <span class="text-micro text-ink-subtle ml-1">{{ r.condicao }}</span>
                </td>
                <td class="px-3 py-2 tabular-nums text-ink-muted hidden sm:table-cell">{{ r.titulo }} · {{ r.parcela || '-' }}</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{{ brl(r.valor) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-micro text-ink-subtle">
          Entrada de caixa no Sienge (Recebimento e Adiantamento).
          <template v-if="l.casouPor === 'nome'">Casado pelo nome do titular.</template>
          <template v-else-if="l.casouPor?.includes('unidade')">Cliente com mais de uma unidade: separado pela unidade.</template>
        </p>
      </div>

      <!-- Regra -->
      <div v-else-if="aba === 'regra'" class="space-y-2 text-sm">
        <p v-if="!l.fichaUsada" class="text-ink-muted">Não conferida: reserva anterior à primeira ficha comercial do empreendimento, ou empreendimento sem ficha.</p>
        <p v-else-if="!l.foraDaRegra?.length" class="text-data-pos"><i class="fas fa-check mr-1"></i>Dentro da regra da ficha.</p>
        <p v-for="f in l.foraDaRegra" :key="f.codigo" class="text-data-warn"><i class="fas fa-triangle-exclamation mr-1"></i>{{ f.texto }}</p>
        <p v-if="l.seriesNaoClassificadas?.length" class="text-data-warn">
          Série sem grupo, fora da conta: {{ l.seriesNaoClassificadas.map((s) => `${s.serie} (${s.idserie}) ${brl(s.total)}`).join(', ') }}
        </p>
      </div>

      <!-- Observação -->
      <div v-else class="space-y-2">
        <template v-if="podeAnotar">
          <textarea v-model="texto" rows="4" :class="[fieldCls, 'w-full resize-y']"
            placeholder="Ex.: tem proposta para quitação, que será ajustada antes da assinatura do contrato CEF."></textarea>
          <div class="flex items-center gap-2">
            <div class="w-52"><Select v-model="tom" size="sm" :options="TONS" /></div>
            <Button size="sm" :loading="salvando" @click="salvarNota">Salvar</Button>
          </div>
          <p class="text-micro text-ink-subtle">Aparece para todos que abrem o relatório. Deixe em branco e salve para apagar.</p>
        </template>
        <p v-else-if="!l.nota" class="text-sm text-ink-muted">Sem observação.</p>
        <p v-if="l.nota?.por" class="text-micro text-ink-subtle">Por {{ l.nota.por }} em {{ fmtDateTime(l.nota.em) }}</p>
      </div>
    </div>
  </Modal>
</template>
