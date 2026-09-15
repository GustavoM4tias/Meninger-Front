<script setup>
/**
 * Adimplência premiada (Desconto Construtora) por unidade.
 *
 * No CV esse valor mora na UNIDADE, não na tabela de preço, e a API não o
 * devolve: o cadastro é do Office. Cada unidade tem um valor vigente (R$ ou %
 * do preço de tabela); trocar o valor encerra o período anterior e abre outro,
 * então a tabela guarda o histórico. O sync das tabelas de preço ainda congela
 * uma cópia por tabela, e a aba Tabelas de preço desconta por padrão.
 *
 * Quem tem a ação `configure` edita; o resto só lê o vigente e o histórico.
 */
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { getAdimplencia, saveAdimplencia } from '@/utils/Building/apiBuilding';

import Modal from '@/components/UI/Modal.vue';
import Panel from '@/components/UI/Panel.vue';
import DataTable from '@/components/UI/DataTable.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import MetricInline from '@/components/UI/MetricInline.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  idempreendimento: { type: Number, required: true },
  canConfigure: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'saved']);
const toast = useToast();

// ── formatadores ───────────────────────────────────────────
const fmtBRL = (v) => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const fmtArea = (v) => (v == null ? '-' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`);
const fmtDate = (ymd) => { if (!ymd) return '-'; const [y, m, d] = String(ymd).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const fmtValor = (tipo, valor) => (valor == null ? '-' : tipo === 'percentual' ? `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : fmtBRL(valor));
const hojeYmd = () => new Date().toISOString().slice(0, 10);

// situacao_mapa_disponibilidade do CV, mesmas cores do resto da tela
const SITUACAO = {
  1: { label: 'Disponível', variant: 'success' }, 2: { label: 'Reserva início', variant: 'accent' }, 5: { label: 'Reserva ativa', variant: 'warning' },
  3: { label: 'Vendida', variant: 'danger' }, 4: { label: 'Bloqueada', variant: 'neutral' },
};
const sit = (u) => SITUACAO[u.situacao] || { label: 'Não informado', variant: 'neutral' };

// ── dados ──────────────────────────────────────────────────
const loading = ref(false);
const erro = ref('');
const dados = ref(null); // { unidades, historico, resumo }
const carregar = async () => {
  loading.value = true; erro.value = '';
  try { dados.value = await getAdimplencia(props.idempreendimento); }
  catch (e) { erro.value = e.message || 'Não foi possível carregar.'; }
  finally { loading.value = false; }
};
watch(() => props.open, (v) => { if (v) { limparEdicao(); carregar(); } }, { immediate: true });

// ── filtros ────────────────────────────────────────────────
const busca = ref('');
const situacao = ref('todas');
const soComAdimplencia = ref(false);
const filtrosAtivos = computed(() => (busca.value ? 1 : 0) + (situacao.value !== 'todas' ? 1 : 0) + (soComAdimplencia.value ? 1 : 0));
const limparFiltros = () => { busca.value = ''; situacao.value = 'todas'; soComAdimplencia.value = false; };
const situacaoOptions = [{ value: 'todas', label: 'Todas as situações' }, ...Object.entries(SITUACAO).map(([v, s]) => ({ value: v, label: s.label }))];

const unidadesFiltradas = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return (dados.value?.unidades || []).filter((u) => {
    if (situacao.value !== 'todas' && String(u.situacao) !== situacao.value) return false;
    if (soComAdimplencia.value && u.valor == null && edicoes.value[u.idunidade] == null) return false;
    if (!q) return true;
    return [u.nome, u.bloco, u.etapa, u.tipologia].some((v) => (v || '').toLowerCase().includes(q));
  });
});

// ── edição (só quem configura) ─────────────────────────────
// edicoes[idunidade] = número (0 = tirar a adimplência); tipo é um só por lote
const edicoes = ref({});
const tipo = ref('valor');
const valorLote = ref('');
const vigenciaDe = ref(hojeYmd());
const observacao = ref('');
const limparEdicao = () => { edicoes.value = {}; valorLote.value = ''; vigenciaDe.value = hojeYmd(); observacao.value = ''; limparFiltros(); };

const numero = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const definir = (u, v) => {
  const n = numero(v);
  if (n == null) { const { [u.idunidade]: _, ...resto } = edicoes.value; edicoes.value = resto; return; }
  edicoes.value = { ...edicoes.value, [u.idunidade]: n };
};
const aplicarLote = () => {
  const n = numero(valorLote.value);
  if (n == null) { toast.warning('Informe o valor para aplicar às unidades filtradas.'); return; }
  const novo = { ...edicoes.value };
  for (const u of unidadesFiltradas.value) novo[u.idunidade] = n;
  edicoes.value = novo;
};
const zerarLote = () => {
  const novo = { ...edicoes.value };
  for (const u of unidadesFiltradas.value) if (u.valor != null) novo[u.idunidade] = 0;
  edicoes.value = novo;
};

// só o que de fato muda em relação ao vigente
const mudancas = computed(() => Object.entries(edicoes.value).map(([id, valor]) => {
  const u = (dados.value?.unidades || []).find((x) => x.idunidade === Number(id));
  if (!u) return null;
  const igual = u.valor != null && u.tipo === tipo.value && Math.abs(u.valor - valor) < 0.005;
  const semNada = u.valor == null && valor === 0;
  if (igual || semNada) return null;
  return { idunidade: u.idunidade, nome: u.nome, tipo: tipo.value, valor };
}).filter(Boolean));

const salvando = ref(false);
const salvar = async () => {
  if (!mudancas.value.length) return;
  const zeradas = mudancas.value.filter((m) => m.valor === 0).length;
  const n = mudancas.value.length;
  if (n > 1 && !await pedirConfirmacao({
    tone: 'accent',
    title: `Gravar adimplência premiada em ${n} unidades?`,
    consequence: `A partir de ${fmtDate(vigenciaDe.value)} ${n - zeradas ? `${n - zeradas} unidade(s) passam a ter ${fmtValor(tipo.value, mudancas.value.find((m) => m.valor)?.valor)}` : ''}${zeradas ? `${n - zeradas ? ' e ' : ''}${zeradas} unidade(s) ficam sem adimplência` : ''}. O valor anterior fica no histórico; as tabelas de preço vigentes passam a descontar o novo valor.`,
    confirmLabel: 'Gravar',
  })) return;
  salvando.value = true;
  try {
    const r = await saveAdimplencia(props.idempreendimento, {
      vigencia_de: vigenciaDe.value, observacao: observacao.value || undefined,
      unidades: mudancas.value.map(({ idunidade, tipo: t, valor }) => ({ idunidade, tipo: t, valor })),
    });
    dados.value = r;
    edicoes.value = {}; valorLote.value = '';
    toast.success(`${r.gravadas} valor(es) gravado(s)${r.encerradas ? `, ${r.encerradas} período(s) encerrado(s)` : ''}. As tabelas de preço já descontam o novo valor.`);
    emit('saved');
  } catch (e) {
    toast.error(e.message || 'Não foi possível gravar.');
  } finally {
    salvando.value = false;
  }
};

// ── números do topo ────────────────────────────────────────
const metricas = computed(() => {
  const us = dados.value?.unidades || [];
  const com = us.filter((u) => u.valor != null);
  const emReais = com.filter((u) => u.tipo !== 'percentual').reduce((s, u) => s + u.valor, 0);
  return [
    { key: 'un', label: 'Unidades', raw: us.length },
    { key: 'com', label: 'Com adimplência', raw: com.length, tone: com.length ? 'pos' : 'neutral' },
    { key: 'tot', label: 'Total em R$', raw: emReais, format: fmtBRL, tone: 'accent', hint: com.some((u) => u.tipo === 'percentual') ? 'fora as em %' : undefined },
    { key: 'mud', label: 'Alterações pendentes', raw: mudancas.value.length, tone: mudancas.value.length ? 'warn' : 'neutral' },
  ];
});

const calc = (fn) => ({ value: fn, sortValue: fn });
const COLUNAS = computed(() => [
  { key: 'nome',    label: 'Unidade',   priority: 1, sortable: true },
  { key: 'atual',   label: 'Vigente',   priority: 1, numeric: true, sortable: true, ...calc((u) => u.valor ?? -1), width: '150px' },
  ...(props.canConfigure ? [{ key: 'novo', label: `Novo (${tipo.value === 'percentual' ? '%' : 'R$'})`, priority: 1, width: '150px' }] : []),
  { key: 'situacao', label: 'Situação', priority: 2, sortable: true, width: '130px' },
  { key: 'bloco',   label: 'Bloco',     priority: 3, sortable: true, width: '130px' },
  { key: 'area_privativa', label: 'Área', priority: 3, numeric: true, sortable: true, format: fmtArea, width: '110px' },
  { key: 'desde',   label: 'Desde',     priority: 3, sortable: true, ...calc((u) => u.vigencia_de), format: fmtDate, width: '110px' },
]);
const COLUNAS_HIST = [
  { key: 'unidade',      label: 'Unidade',  priority: 1, sortable: true },
  { key: 'valor',        label: 'Valor',    priority: 1, numeric: true, sortable: true, format: (v, r) => fmtValor(r.tipo, v), width: '130px' },
  { key: 'vigencia_de',  label: 'De',       priority: 2, sortable: true, format: fmtDate, width: '110px' },
  { key: 'vigencia_ate', label: 'Até',      priority: 2, sortable: true, format: (v) => (v ? fmtDate(v) : 'vigente'), width: '110px' },
  { key: 'observacao',   label: 'Observação', priority: 3 },
];
</script>

<template>
  <Modal :open="open" size="xl" title="Adimplência premiada"
    subtitle="Desconto Construtora por unidade: sai do preço de tabela quando o cliente paga em dia. O CV não manda esse campo, o cadastro é aqui."
    @close="emit('close')">

    <Skeleton v-if="loading && !dados" variant="card" :lines="4" />
    <EmptyState v-else-if="erro" icon="fas fa-triangle-exclamation" title="Não deu para carregar" :description="erro">
      <template #actions><Button size="sm" @click="carregar">Tentar de novo</Button></template>
    </EmptyState>

    <div v-else-if="dados" class="space-y-4">
      <section class="panel"><MetricInline :items="metricas" /></section>

      <!-- Lote: um valor para todas as unidades filtradas -->
      <Panel v-if="canConfigure" title="Aplicar em lote" icon="fas fa-layer-group"
        subtitle="Filtre as unidades abaixo e aplique o mesmo valor em todas; depois ajuste uma a uma se precisar">
        <div class="flex flex-col md:flex-row md:items-end gap-3">
          <SegmentedControl v-model="tipo" size="sm"
            :options="[{ value: 'valor', label: 'R$ por unidade' }, { value: 'percentual', label: '% do preço' }]" />
          <div class="md:w-48">
            <Input v-model="valorLote" type="text" inputmode="decimal" :placeholder="tipo === 'percentual' ? 'ex.: 5' : 'ex.: 10.000,00'" label="Valor" />
          </div>
          <Button size="sm" icon="fas fa-wand-magic-sparkles" @click="aplicarLote">Aplicar às {{ unidadesFiltradas.length }} filtradas</Button>
          <Button size="sm" variant="ghost" icon="fas fa-eraser" @click="zerarLote"
            v-tippy="'Marca as filtradas que têm adimplência para ficar sem (encerra o período)'">Tirar das filtradas</Button>
        </div>
      </Panel>

      <FilterBar :active-count="filtrosAtivos" auto-apply :cols="3" @clear="limparFiltros">
        <Input v-model="busca" label="Busca" placeholder="Unidade, bloco, etapa" iconLeft="fas fa-magnifying-glass" />
        <Select v-model="situacao" label="Situação" :options="situacaoOptions" />
        <div class="flex items-end pb-1">
          <SegmentedControl :model-value="soComAdimplencia ? 'com' : 'todas'" size="sm"
            :options="[{ value: 'todas', label: 'Todas' }, { value: 'com', label: 'Só com adimplência' }]"
            @update:model-value="soComAdimplencia = $event === 'com'" />
        </div>
      </FilterBar>

      <Panel title="Unidades" icon="fas fa-house" :padded="false">
        <template #actions>
          <span class="text-xs text-ink-subtle font-mono tabular-nums">{{ unidadesFiltradas.length }} de {{ dados.unidades.length }}</span>
        </template>
        <div class="p-3 sm:p-4">
          <DataTable :columns="COLUNAS" :rows="unidadesFiltradas" row-key="idunidade" sort-by="nome" density="compact"
            empty-icon="fas fa-house" empty-title="Nenhuma unidade" empty-text="Nada com esses filtros.">
            <template #cell-nome="{ row }">
              <span class="font-medium text-ink">{{ row.nome }}</span>
              <span v-if="row.tipologia" class="ml-1.5 text-micro text-ink-subtle">{{ row.tipologia }}</span>
            </template>
            <template #cell-atual="{ row }">
              <span v-if="row.valor != null" class="font-semibold text-ink tabular-nums">{{ fmtValor(row.tipo, row.valor) }}</span>
              <span v-else class="text-ink-subtle">sem</span>
            </template>
            <template #cell-novo="{ row }">
              <Input :model-value="edicoes[row.idunidade] ?? ''" type="text" inputmode="decimal" size="sm"
                :placeholder="row.valor != null ? 'manter' : '-'" @update:model-value="definir(row, $event)" />
            </template>
            <template #cell-situacao="{ row }">
              <Badge :variant="sit(row).variant" size="sm">{{ sit(row).label }}</Badge>
            </template>
          </DataTable>
        </div>
      </Panel>

      <Collapsible title="Histórico de mudanças" icon="fas fa-clock-rotate-left" :hint="`${dados.historico.length} registro(s)`">
        <DataTable :columns="COLUNAS_HIST" :rows="dados.historico" row-key="id" sort-by="vigencia_de" sort-dir="desc" density="compact"
          empty-icon="fas fa-clock-rotate-left" empty-title="Sem histórico" empty-text="Nenhuma adimplência premiada foi cadastrada ainda." />
      </Collapsible>
    </div>

    <template #footer>
      <div v-if="canConfigure && dados" class="flex flex-col sm:flex-row sm:items-end gap-3 w-full">
        <div class="sm:w-44">
          <Input v-model="vigenciaDe" type="date" label="Vale a partir de" size="sm" />
        </div>
        <div class="flex-1">
          <Input v-model="observacao" label="Observação (opcional)" placeholder="Ex.: campanha de setembro" size="sm" />
        </div>
        <div class="flex items-center gap-2 sm:ml-auto">
          <Button variant="ghost" @click="emit('close')">Fechar</Button>
          <Button :disabled="!mudancas.length" :loading="salvando" icon="fas fa-check" @click="salvar">
            Gravar {{ mudancas.length ? `(${mudancas.length})` : '' }}
          </Button>
        </div>
      </div>
      <Button v-else variant="ghost" @click="emit('close')">Fechar</Button>
    </template>
  </Modal>
</template>
