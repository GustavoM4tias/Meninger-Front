<!--
  Detalhe de um recebimento do ato (linha do AVC) + o confronto com o ato.

  Mesma casca do BoletoDetailModal, a aba vizinha: `hide-close` com o cabeçalho
  do primitivo vazio, banner de identidade colorido pelo ESTADO com o X dentro
  dele, e o corpo rolando por conta própria. Duas abas da mesma tela não podem
  abrir detalhe de jeitos diferentes.

  Antes isto era uma linha que ABRIA dentro da tabela (`expandable`): empurrava
  as linhas de baixo e ficava ruim de ler.
-->
<template>
  <Modal :open="open" size="xl" hide-close @close="emit('close')">
    <template #header><div class="hidden"></div></template>

    <div v-if="item" class="-m-4 sm:-m-5">

      <!-- Banner de identidade: a cor vem do resultado do confronto, que é a
           informação que decide o que fazer com esta linha. -->
      <div class="relative text-white px-5 sm:px-6 pt-5 pb-4 overflow-hidden" :class="bannerCor">
        <div class="pointer-events-none absolute inset-0 opacity-30"
          style="background-image:radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 18px 18px;"></div>

        <div class="relative flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <span v-if="item.conciliacao"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-medium
                       bg-surface-raised/20 border border-white/20 text-white">
                <i :class="iconeStatus"></i>{{ rotuloStatus }}
              </span>
              <span v-if="item.conciliacao?.ambiguo"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-medium
                       bg-surface-raised/20 border border-white/20 text-white">
                <i class="fas fa-triangle-exclamation"></i>Homônimo
              </span>
              <span class="text-micro text-white/70 font-mono tabular-nums">{{ item.documento }}</span>
            </div>

            <h2 class="text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
              {{ item.cliente }}
            </h2>
            <p class="text-xs text-white/70 mt-1">
              {{ item.unidade || 'Sem unidade' }} · {{ item.empreendimento || 'Sem empreendimento' }}
            </p>
            <p class="text-micro text-white/70 mt-1 font-mono tabular-nums">
              Título {{ item.nutitulo }} · parcela {{ item.parcela }} ·
              baixado em {{ dataBR(item.data_baixa) }} · {{ moeda(item.valor_baixa) }}
            </p>
          </div>

          <button @click="emit('close')" aria-label="Fechar"
            class="h-10 w-10 grid place-items-center rounded-lg shrink-0
                   bg-surface-raised/15 hover:bg-surface-raised/25 text-white
                   transition-colors duration-120">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- ── Tabs ─────────────────────────────────────────────────────────── -->
      <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="abaAtiva" :options="abas" size="sm" />
      </div>

      <!-- ── Body ─────────────────────────────────────────────────────────── -->
      <div class="p-4 sm:p-5 max-h-[60vh] overflow-y-auto">

        <!-- ── ABA: RESUMO ──────────────────────────────────────────────── -->
        <div v-if="abaAtiva === 'resumo'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-1">Valor da baixa</p>
              <p class="text-xl font-bold text-ink font-mono tabular-nums">{{ moeda(item.valor_baixa) }}</p>
              <p v-if="Math.abs(item.liquido - item.valor_baixa) >= 0.01" class="text-ink-subtle mt-1 text-xs">
                Líquido: {{ moeda(item.liquido) }}
              </p>
            </div>
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-1">Datas</p>
              <p class="text-sm text-ink font-mono tabular-nums">Baixa: {{ dataBR(item.data_baixa) }}</p>
              <p class="text-xs text-ink-muted font-mono tabular-nums mt-0.5">
                Emissão: {{ dataBR(item.data_emissao) }} · Vencto: {{ dataBR(item.data_vencimento) }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Cód. cliente" :valor="item.cod_cliente" mono />
            <Campo rotulo="Parc / TC" :valor="`${item.parcela} · ${item.tipo_condicao || '-'}`" mono />
            <Campo rotulo="Portador" :valor="item.portador ?? '-'" mono />
            <Campo rotulo="Unid. princ" :valor="item.unidade || '-'" />
          </div>

          <div>
            <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-1">Origem</p>
            <p class="text-sm text-ink">{{ item.empresa }}</p>
            <p class="text-xs text-ink-muted">{{ item.empreendimento || '-' }}</p>
          </div>
        </div>

        <!-- ── ABA: CONFRONTO ───────────────────────────────────────────── -->
        <div v-else-if="abaAtiva === 'confronto'" class="space-y-4">
          <div v-if="!item.conciliacao"
            class="rounded-lg border border-line bg-surface-sunken/40 p-4 text-sm text-ink-muted">
            A mesclagem com o Ato está desligada. Ligue o filtro "Mesclar com o Ato" para ver o confronto.
          </div>

          <template v-else>
            <div class="rounded-lg border p-3" :class="molduraConfronto">
              <p class="text-sm text-ink whitespace-pre-line">{{ explicacao }}</p>
            </div>

            <div v-if="item.conciliacao.ato" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Campo rotulo="Valor do ato" :valor="moeda(item.conciliacao.ato.valor)" mono />
              <Campo rotulo="Valor da baixa" :valor="moeda(item.valor_baixa)" mono />
              <Campo rotulo="Diferença" :valor="sinal(item.conciliacao.ato.diferenca)" mono />
              <Campo rotulo="Ato pago em" :valor="dataBR(item.conciliacao.ato.pago_em)" mono />
              <Campo rotulo="Forma" :valor="item.conciliacao.ato.tipo === 'cartao' ? 'Cartão' : 'Boleto'" />
              <Campo rotulo="Reserva" :valor="item.conciliacao.ato.idreserva ? `#${item.conciliacao.ato.idreserva}` : '-'" mono />
            </div>

            <a v-if="item.conciliacao.ato?.idreserva" :href="cvLink" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line
                     bg-surface-sunken/40 hover:bg-surface-sunken text-ink text-xs font-medium
                     transition-all hover:-translate-y-0.5">
              <i class="fas fa-arrow-up-right-from-square text-micro"></i>
              Abrir a reserva no CV
            </a>
          </template>
        </div>

        <!-- ── ABA: ACESSÓRIOS ──────────────────────────────────────────── -->
        <div v-else class="space-y-4">
          <p class="text-xs text-ink-muted">
            Colunas acessórias do relatório do Sienge. Em AVC elas são sempre zero - por isso
            o líquido é igual ao valor da baixa.
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Acréscimo" :valor="moeda(item.acrescimo)" mono />
            <Campo rotulo="Seguro" :valor="moeda(item.seguro)" mono />
            <Campo rotulo="Taxa adm" :valor="moeda(item.taxa_adm)" mono />
            <Campo rotulo="Desconto" :valor="moeda(item.desconto)" mono />
            <Campo rotulo="Vl. baixa" :valor="moeda(item.valor_baixa)" mono />
            <Campo rotulo="Líquido" :valor="moeda(item.liquido)" mono />
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch, h } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const abas = [
  { value: 'resumo', label: 'Resumo', icon: 'fas fa-circle-info' },
  { value: 'confronto', label: 'Confronto', icon: 'fas fa-code-compare' },
  { value: 'acessorios', label: 'Acessórios', icon: 'fas fa-coins' },
];
const abaAtiva = ref('resumo');
// Reabrir noutra linha tem que voltar ao Resumo: manter a aba anterior faria a
// pessoa achar que está vendo o registro que acabou de fechar.
watch(() => props.item, () => { abaAtiva.value = 'resumo'; });

/* Campo rótulo+valor: são muitos, e repetir a marcação inteira em cada um
   escondia o conteúdo no meio do ruído. */
const Campo = (p) => h('div', [
  h('p', { class: 'text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-1' }, p.rotulo),
  h('p', { class: p.mono ? 'text-sm text-ink font-mono tabular-nums' : 'text-sm text-ink' },
    String(p.valor ?? '-')),
]);
Campo.props = ['rotulo', 'valor', 'mono'];

const moeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sinal = v => (Number(v) > 0 ? '+' : '') + moeda(v);
function dataBR(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

const status = computed(() => props.item?.conciliacao?.status);

// Mesma lógica de cor do BoletoDetailModal: o banner conta o estado.
const bannerCor = computed(() => ({
  conciliado: 'bg-gradient-to-br from-data-pos to-data-pos/70',
  divergente: 'bg-gradient-to-br from-data-warn to-data-warn/70',
  sem_ato: 'bg-gradient-to-br from-data-neutral to-data-neutral/70',
}[status.value] || 'bg-gradient-to-br from-accent to-accent/70'));

const rotuloStatus = computed(() => ({
  conciliado: 'Conciliado', divergente: 'Valor divergente', sem_ato: 'Sem ato',
}[status.value] || '-'));

const iconeStatus = computed(() => ({
  conciliado: 'fas fa-check', divergente: 'fas fa-scale-unbalanced', sem_ato: 'fas fa-circle-question',
}[status.value] || 'fas fa-circle-info'));

const molduraConfronto = computed(() => ({
  conciliado: 'border-data-pos/30 bg-data-pos/5',
  divergente: 'border-data-warn/30 bg-data-warn/5',
  sem_ato: 'border-line bg-surface-sunken/40',
}[status.value] || 'border-line'));

const cvLink = computed(() => {
  const id = props.item?.conciliacao?.ato?.idreserva;
  return id ? `https://menin.cvcrm.com.br/gestor/comercial/reservas/${id}/administrar#index_condicao_pagamento` : null;
});

/* "Divergente" sozinho não resolve nada: quem confere precisa saber qual lado
   é qual e de quanto é a diferença. Mesmo texto do tooltip da tabela. */
const explicacao = computed(() => {
  const c = props.item?.conciliacao;
  if (!c) return '';
  const partes = [];
  const tipo = c.ato?.tipo === 'cartao' ? 'Cartão' : 'Boleto';

  if (c.status === 'sem_ato') {
    partes.push('Nenhum ato pago encontrado para este cliente.');
    partes.push('Ou o recebimento não é de ato, ou o ato foi cobrado fora do Office, ou o nome está grafado diferente nos dois sistemas.');
  } else {
    partes.push(`${tipo} de ${moeda(c.ato.valor)}, pago em ${dataBR(c.ato.pago_em)}.`);
    partes.push(`Sienge baixou ${moeda(props.item.valor_baixa)} em ${dataBR(props.item.data_baixa)}.`);
    if (c.status === 'divergente') {
      const d = Number(c.ato.diferenca);
      partes.push(d > 0
        ? `O Sienge baixou ${moeda(Math.abs(d))} A MAIS do que o ato cobrou.`
        : `O Sienge baixou ${moeda(Math.abs(d))} A MENOS do que o ato cobrou.`);
    } else {
      partes.push('Os valores batem.');
    }
  }
  if (c.ambiguo) {
    partes.push('ATENÇÃO: havia mais de um ato com este nome; foi escolhido o mais próximo em valor e data. Conferir na mão.');
  }
  return partes.join('\n');
});
</script>
