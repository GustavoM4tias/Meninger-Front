<script setup>
/**
 * Aba "Espelho" do empreendimento: torres x andares x finais.
 *
 * É a leitura de quadra e corte: cada torre é uma grade com os andares de
 * cima para baixo e os finais da esquerda para a direita. A cor da célula é a
 * situação da unidade; o que aparece escrito dentro dela a pessoa escolhe
 * (preço, R$/m², área, dormitórios ou sol). Clicar numa célula abre a ficha da
 * unidade.
 *
 * O que o CV não sabe (lado do sol, dormitórios, tipologia por final, quantos
 * dígitos do número são o andar e o final, R$/m² por andar quando não há
 * tabela) é configurado aqui mesmo, no botão "Configurar" (capacidade
 * `configure` de /crm/buildings) - o back devolve a grade já montada.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { getMirror, saveMirrorSettings } from '@/utils/Building/apiBuilding';

import Panel from '@/components/UI/Panel.vue';
import MetricInline from '@/components/UI/MetricInline.vue';
import FunnelStrip from '@/components/UI/FunnelStrip.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const props = defineProps({
  idempreendimento: { type: Number, required: true },
  canConfigure: { type: Boolean, default: false },
});
const emit = defineEmits(['loaded']);
const toast = useToast();

// ── formatadores ───────────────────────────────────────────
const fmtBRL = (v) => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }));
const fmtBRL2 = (v) => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const fmtK = (v) => {
  if (v == null) return '-';
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  if (n >= 1000) return `${Math.round(n / 1000)} mil`;
  return String(Math.round(n));
};
const fmtArea = (v) => (v == null ? '-' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m²`);
const fmtNum = (v) => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
const fmtDate = (ymd) => (ymd ? String(ymd).slice(0, 10).split('-').reverse().join('/') : '-');

// ── situação (mesmas cores do resto da tela) ───────────────
const STATUS = {
  disponivel:     { key: 'disponivel',     label: 'Disponível',     icon: 'fas fa-circle-check',    variant: 'success', bar: 'bg-data-pos/70',     cell: 'bg-data-pos/15 border-data-pos/40 hover:bg-data-pos/25' },
  reserva_inicio: { key: 'reserva_inicio', label: 'Reserva início', icon: 'fas fa-hourglass-start', variant: 'accent',  bar: 'bg-accent/70',       cell: 'bg-accent/15 border-accent/40 hover:bg-accent/25' },
  reserva_ativa:  { key: 'reserva_ativa',  label: 'Reserva ativa',  icon: 'fas fa-hourglass-half',  variant: 'warning', bar: 'bg-data-warn/70',    cell: 'bg-data-warn/15 border-data-warn/40 hover:bg-data-warn/25' },
  vendida:        { key: 'vendida',        label: 'Vendida',        icon: 'fas fa-flag-checkered',  variant: 'danger',  bar: 'bg-data-neg/70',     cell: 'bg-data-neg/15 border-data-neg/40 hover:bg-data-neg/25' },
  bloqueada:      { key: 'bloqueada',      label: 'Bloqueada',      icon: 'fas fa-lock',            variant: 'neutral', bar: 'bg-data-neutral/70', cell: 'bg-surface-sunken border-line hover:bg-surface-hover' },
  sem_status:     { key: 'sem_status',     label: 'Não informado',  icon: 'fas fa-circle-question', variant: 'neutral', bar: 'bg-data-neutral/40', cell: 'bg-surface-sunken border-line' },
};
const st = (k) => STATUS[k] || STATUS.sem_status;

// Sol: um glifo por face, igual no cabeçalho da prumada e na célula
const SOL = {
  'manhã': { glifo: 'M', icon: 'fas fa-sun',       cls: 'text-data-warn', label: 'Sol da manhã' },
  'tarde': { glifo: 'T', icon: 'fas fa-cloud-sun', cls: 'text-data-neg',  label: 'Sol da tarde' },
  'dia':   { glifo: 'N', icon: 'fas fa-sun',       cls: 'text-data-pos',  label: 'Sol o dia todo' },
  'pouco': { glifo: 'S', icon: 'fas fa-cloud',     cls: 'text-ink-subtle', label: 'Pouco sol' },
};

// ── carga ──────────────────────────────────────────────────
const mirror = ref(null);
const loading = ref(false);
const error = ref('');
const carregar = async () => {
  loading.value = true; error.value = '';
  try {
    mirror.value = await getMirror(props.idempreendimento);
    emit('loaded', mirror.value.resumo?.unidades || 0);
  } catch (e) {
    error.value = e.message || 'Não foi possível montar o espelho.';
  } finally {
    loading.value = false;
  }
};
onMounted(carregar);

// ── controles de leitura ───────────────────────────────────
const mostrar = ref('preco'); // preco | m2 | area | dorm | sol
const MOSTRAR = [
  { value: 'preco', label: 'Preço',   icon: 'fas fa-tag' },
  { value: 'm2',    label: 'R$/m²',   icon: 'fas fa-ruler-combined' },
  { value: 'area',  label: 'Área',    icon: 'fas fa-vector-square' },
  { value: 'dorm',  label: 'Dorm.',   icon: 'fas fa-bed' },
  { value: 'sol',   label: 'Sol',     icon: 'fas fa-sun' },
];
const filtroStatus = ref([]);
const toggleStatus = (s) => {
  const i = filtroStatus.value.indexOf(s.key);
  if (i >= 0) filtroStatus.value.splice(i, 1); else filtroStatus.value.push(s.key);
};
const torreSel = ref('todas');
const torreOptions = computed(() => [
  { value: 'todas', label: 'Todas' },
  ...(mirror.value?.torres || []).map((t) => ({ value: t.key, label: t.nome, count: t.resumo.disponiveis })),
]);
const torresVisiveis = computed(() => (mirror.value?.torres || []).filter((t) => torreSel.value === 'todas' || t.key === torreSel.value));

const stages = computed(() => {
  const r = mirror.value?.resumo; if (!r) return [];
  return [
    { ...STATUS.disponivel, count: r.disponiveis },
    { key: 'reservada', label: 'Reservada', icon: 'fas fa-hourglass-half', bar: 'bg-data-warn/70', count: r.reservadas },
    { ...STATUS.vendida, count: r.vendidas },
    { ...STATUS.bloqueada, count: r.bloqueadas },
  ];
});
const celulaAtiva = (c) => {
  if (!filtroStatus.value.length) return true;
  const k = (c.status === 'reserva_inicio' || c.status === 'reserva_ativa') ? 'reservada' : c.status;
  return filtroStatus.value.includes(k);
};

const metricas = computed(() => {
  const r = mirror.value?.resumo; if (!r) return [];
  return [
    { key: 'u', label: 'Unidades', raw: r.unidades },
    { key: 'd', label: 'Disponíveis', raw: r.disponiveis, tone: 'pos', hint: r.unidades ? `${Math.round((r.disponiveis / r.unidades) * 100)}%` : '' },
    { key: 'v', label: 'Vendidas', raw: r.vendidas, tone: 'neg', hint: r.unidades ? `${Math.round((r.vendidas / r.unidades) * 100)}%` : '' },
    { key: 'r', label: 'Reservadas', raw: r.reservadas, tone: 'warn' },
    { key: 'b', label: 'Bloqueadas', raw: r.bloqueadas },
    { key: 'vgv', label: 'VGV disponível', raw: r.vgv_disponivel, format: fmtBRL, tone: 'accent' },
    { key: 'm2', label: 'R$/m² disponível', raw: r.valor_m2_disponivel, format: fmtBRL, hint: 'média ponderada' },
  ];
});

// Texto da segunda linha da célula, conforme o que a pessoa escolheu ver
const textoCelula = (c) => {
  switch (mostrar.value) {
    case 'preco': return c.valor != null ? fmtK(c.valor) : '-';
    case 'm2':    return c.valor_m2 != null ? fmtNum(c.valor_m2) : '-';
    case 'area':  return c.area != null ? Number(c.area).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '-';
    case 'dorm':  return c.dorm != null ? `${c.dorm} dorm${c.tipo_auto ? ` · ${c.tipo_auto}` : ''}` : (c.tipologia || '-');
    case 'sol':   return c.sol ? SOL[c.sol].label.replace('Sol ', '').replace('Pouco sol', 'pouco') : '-';
    default: return '';
  }
};
const dicaCelula = (c) => [
  `${c.nome} · ${st(c.status).label}`,
  c.valor != null ? `${fmtBRL2(c.valor)}${c.valor_fonte === 'estimado' ? ' (estimado)' : c.valor_fonte === 'tabela' ? ' (tabela)' : ''}` : 'Sem preço',
  c.area != null ? `${fmtArea(c.area)}${c.valor_m2 ? ` · ${fmtBRL(c.valor_m2)}/m²` : ''}` : null,
  [c.tipologia, c.dorm != null ? `${c.dorm} dorm` : null, c.sol_label].filter(Boolean).join(' · ') || null,
].filter(Boolean).join('  |  ');

// Nota da fonte do preço, para ninguém ler estimativa como tabela
const notaPreco = computed(() => {
  const f = mirror.value?.fonte_preco; if (!f) return '';
  const partes = [];
  if (f.cv) partes.push(`${f.cv} com valor do CV`);
  if (f.tabela) partes.push(`${f.tabela} da tabela ${f.tabela_ref?.nome || ''}${f.tabela_ref?.vigente ? ' (vigente)' : ' (mais recente)'}`);
  if (f.estimado) partes.push(`${f.estimado} estimadas pelo R$/m² do andar`);
  if (f.sem_preco) partes.push(`${f.sem_preco} sem preço`);
  return partes.length ? `Preço: ${partes.join(' · ')}.` : '';
});

const FONTE = { cadastro: 'cadastrado no espelho', cv: 'do CV', area: 'deduzido pela área privativa' };

// ── ficha da unidade ───────────────────────────────────────
const unidadeAberta = ref(null);
const fichaLinhas = computed(() => {
  const c = unidadeAberta.value; if (!c) return [];
  return [
    { label: 'Torre', value: c.torre_nome },
    { label: 'Andar', value: c.andar != null ? (c.andar === 0 ? mirror.value.settings.andar_zero_nome : `${c.andar}º`) : '-' },
    { label: 'Final', value: c.final },
    { label: 'Etapa / bloco', value: [c.etapa, c.bloco].filter(Boolean).join(' · ') },
    { label: 'Área privativa', value: fmtArea(c.area) },
    { label: 'Vagas', value: c.vagas ?? c.vagas_texto ?? '-', hint: c.vagas_fonte === 'padrao' ? 'padrão do empreendimento' : '' },
    { label: 'Tipologia', value: c.tipologia || '-', hint: FONTE[c.tipologia_fonte] || '' },
    { label: 'Dormitórios', value: c.dorm ?? '-', hint: FONTE[c.dorm_fonte] || '' },
    { label: 'Face / sol', value: c.face ? `${c.face} · ${c.sol_label}` : '-', hint: c.face ? '' : 'configure a face do final' },
    { label: 'Preço', value: c.valor != null ? fmtBRL2(c.valor) : '-', hint: c.valor_fonte === 'cv' ? 'valor da unidade no CV' : c.valor_fonte === 'tabela' ? 'tabela de preço' : c.valor_fonte === 'estimado' ? 'estimado: R$/m² do andar x área' : '' },
    { label: 'R$/m²', value: c.valor_m2 != null ? fmtBRL(c.valor_m2) : '-' },
    { label: 'ID Sienge', value: c.idunidade_int || '-' },
    { label: 'Bloqueio', value: c.data_bloqueio ? String(c.data_bloqueio).slice(0, 10).split('-').reverse().join('/') : null },
  ].filter((l) => l.value !== null);
});

// ── configuração (admin) ───────────────────────────────────
const configAberta = ref(false);
const salvando = ref(false);
const form = ref(null);
const FACE_OPTIONS = [
  { value: 'x', label: 'Não informada' },
  { value: 'L', label: 'Leste (sol da manhã)' },
  { value: 'O', label: 'Oeste (sol da tarde)' },
  { value: 'N', label: 'Norte (sol o dia todo)' },
  { value: 'S', label: 'Sul (pouco sol)' },
];
const abrirConfig = () => {
  const s = mirror.value.settings;
  const finais = {};
  for (const t of mirror.value.torres) {
    finais[t.key] = {};
    for (const f of t.finais) {
      const c = s.finais?.[t.key]?.[f] || {};
      finais[t.key][f] = { face: c.face || 'x', dorm: c.dorm ?? '', tipologia: c.tipologia || '', valor_m2: c.valor_m2 ?? '' };
    }
  }
  const andares = [...new Set(mirror.value.torres.flatMap((t) => t.andares.map((a) => a.andar)).filter((a) => a != null))].sort((a, b) => a - b);
  form.value = {
    digitos_final: s.digitos_final, digitos_andar: s.digitos_andar,
    andar_zero_nome: s.andar_zero_nome, imagem_url: s.imagem_url || '', observacao: s.observacao || '',
    vagas_padrao: s.vagas_padrao ?? '',
    dorm_por_area: (s.dorm_por_area || []).map((f) => ({ ate: f.ate ?? '', dorm: f.dorm })),
    finais,
    andares,
    valor_m2_andar: Object.fromEntries(andares.map((a) => [a, s.valor_m2_andar?.[a] ?? ''])),
  };
  configAberta.value = true;
};
// Copia a configuração de finais da primeira torre para as outras (torres
// gêmeas são o caso comum)
const copiarPrimeiraTorre = () => {
  const keys = Object.keys(form.value.finais); if (keys.length < 2) return;
  const base = form.value.finais[keys[0]];
  for (const k of keys.slice(1)) for (const f of Object.keys(form.value.finais[k])) {
    if (base[f]) form.value.finais[k][f] = { ...base[f] };
  }
};
const addFaixa = () => form.value.dorm_por_area.push({ ate: '', dorm: '' });
const rmFaixa = (i) => form.value.dorm_por_area.splice(i, 1);
const salvarConfig = async () => {
  salvando.value = true;
  try {
    const f = form.value;
    const settings = {
      digitos_final: f.digitos_final, digitos_andar: f.digitos_andar, andar_zero_nome: f.andar_zero_nome,
      imagem_url: f.imagem_url || null, observacao: f.observacao,
      vagas_padrao: f.vagas_padrao === '' ? null : Number(f.vagas_padrao),
      dorm_por_area: f.dorm_por_area.filter((x) => x.dorm !== '' && x.dorm != null),
      finais: Object.fromEntries(Object.entries(f.finais).map(([t, fs]) => [t, Object.fromEntries(Object.entries(fs).map(([k, v]) => [k, { face: v.face && v.face !== 'x' ? v.face : null, dorm: v.dorm === '' ? null : Number(v.dorm), tipologia: v.tipologia || null, valor_m2: v.valor_m2 === '' ? null : v.valor_m2 }]))])),
      valor_m2_andar: Object.fromEntries(Object.entries(f.valor_m2_andar).filter(([, v]) => v !== '' && v != null)),
    };
    mirror.value = await saveMirrorSettings(props.idempreendimento, settings);
    configAberta.value = false;
    toast.success('Espelho configurado. A grade já está com as faces, dormitórios e preços novos.');
  } catch (e) {
    toast.error(e.message || 'Não foi possível salvar a configuração.');
  } finally {
    salvando.value = false;
  }
};

// Se os dígitos mudam, a grade pode mudar de forma: recarrega a tela toda
watch(() => props.idempreendimento, carregar);
</script>

<template>
  <div class="space-y-4">
    <Skeleton v-if="loading && !mirror" variant="table" :lines="8" />

    <EmptyState v-else-if="error" icon="fas fa-triangle-exclamation" title="Não deu para montar o espelho" :description="error">
      <template #actions><Button size="sm" @click="carregar">Tentar de novo</Button></template>
    </EmptyState>

    <template v-else-if="mirror">
      <Panel v-if="!mirror.torres.length" empty empty-icon="fas fa-building" empty-title="Nenhuma unidade cadastrada no CV" />

      <template v-else>
        <!-- Resumo + situação -->
        <Panel title="Estoque" icon="fas fa-building" :padded="false"
          subtitle="Clique numa situação para destacar só ela na grade">
          <template #actions>
            <Button v-if="canConfigure" variant="secondary" size="sm" icon="fas fa-sliders" @click="abrirConfig"
              v-tippy="'Faces, dormitórios, tipologia por final, dígitos do número e R$/m² por andar'">
              <span class="hidden sm:inline">Configurar</span>
            </Button>
          </template>
          <MetricInline :items="metricas" />
          <div class="p-3 sm:p-4 border-t border-line-subtle">
            <FunnelStrip :stages="stages" :total="mirror.resumo.unidades" unit="unidades"
              :active="filtroStatus" @select="toggleStatus" @clear="filtroStatus = []" />
          </div>
        </Panel>

        <!-- Controles: o que a célula mostra + torre -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <span class="text-xs text-ink-muted shrink-0">Na célula:</span>
          <SegmentedControl v-model="mostrar" :options="MOSTRAR" size="sm" />
          <template v-if="mirror.torres.length > 1">
            <span class="text-xs text-ink-muted shrink-0 sm:ml-3">Torre:</span>
            <SegmentedControl v-model="torreSel" :options="torreOptions" size="sm" />
          </template>
        </div>

        <!-- Implantação (quando configurada) -->
        <Panel v-if="mirror.settings.imagem_url" title="Implantação" icon="fas fa-map" :padded="false">
          <img :src="mirror.settings.imagem_url" alt="Implantação do empreendimento" class="w-full max-h-[420px] object-contain bg-surface-sunken" />
        </Panel>

        <!-- Torres -->
        <div class="grid gap-4" :class="torresVisiveis.length > 1 ? 'grid-cols-1 2xl:grid-cols-2' : 'grid-cols-1'">
          <Panel v-for="t in torresVisiveis" :key="t.key" :title="t.nome" icon="fas fa-building" :padded="false">
            <template #actions>
              <div class="flex flex-wrap gap-1.5 justify-end">
                <Badge variant="success" size="sm">{{ t.resumo.disponiveis }} disp.</Badge>
                <Badge variant="danger" size="sm">{{ t.resumo.vendidas }} vend.</Badge>
                <Badge v-if="t.resumo.vgv_disponivel" variant="accent" size="sm">{{ fmtBRL(t.resumo.vgv_disponivel) }}</Badge>
              </div>
            </template>

            <div class="overflow-x-auto">
              <table class="border-separate border-spacing-1 text-xs min-w-full">
                <!-- Cabeçalho: finais, com face/sol e área típica -->
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 bg-surface-raised text-left px-2 py-1 metric-label whitespace-nowrap">Andar</th>
                    <th v-for="col in t.colunas" :key="col.final" class="px-1 py-1 text-center min-w-[64px]">
                      <div class="font-semibold text-ink tabular-nums">Final {{ col.final }}</div>
                      <div class="text-micro text-ink-subtle truncate" v-tippy="col.tipologia">{{ col.area ? fmtArea(col.area) : (col.tipologia || '') }}<template v-if="col.dorm != null"> · {{ col.dorm }}d</template></div>
                      <div v-if="col.sol" class="text-micro inline-flex items-center gap-1" :class="SOL[col.sol].cls" v-tippy="`${col.face_nome} · ${SOL[col.sol].label}`">
                        <i :class="SOL[col.sol].icon" class="text-[9px]"></i>{{ SOL[col.sol].label.replace('Sol ', '').replace('o dia todo', 'dia todo') }}
                      </div>
                    </th>
                    <th class="px-2 py-1 metric-label text-right whitespace-nowrap">Disp./total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in t.andares" :key="String(a.andar)">
                    <th scope="row" class="sticky left-0 z-10 bg-surface-raised text-left px-2 py-1 font-semibold text-ink whitespace-nowrap">{{ a.nome }}</th>
                    <td v-for="col in t.colunas" :key="col.final" class="p-0 align-top">
                      <template v-for="c in a.unidades.filter((u) => u.final === col.final)" :key="c.idunidade">
                        <button type="button" @click="unidadeAberta = c" v-tippy="dicaCelula(c)"
                          class="w-full min-h-[44px] rounded-md border px-1.5 py-1 text-left transition-all duration-150 focus-ring"
                          :class="[st(c.status).cell, celulaAtiva(c) ? 'opacity-100' : 'opacity-25']">
                          <div class="flex items-center justify-between gap-1">
                            <span class="font-semibold text-ink tabular-nums truncate">{{ c.numero || c.nome }}</span>
                            <i v-if="c.sol" :class="[SOL[c.sol].icon, SOL[c.sol].cls]" class="text-[9px] shrink-0"></i>
                          </div>
                          <div class="text-micro tabular-nums truncate" :class="c.valor_fonte === 'estimado' && mostrar === 'preco' ? 'text-ink-subtle italic' : 'text-ink-muted'">
                            {{ textoCelula(c) }}
                          </div>
                        </button>
                      </template>
                      <div v-if="!a.unidades.some((u) => u.final === col.final)" class="min-h-[44px] rounded-md border border-dashed border-line-subtle"></div>
                    </td>
                    <td class="px-2 py-1 text-right tabular-nums text-ink-muted whitespace-nowrap">
                      <span class="text-data-pos font-semibold">{{ a.resumo.disponiveis }}</span>/{{ a.resumo.unidades }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th class="sticky left-0 z-10 bg-surface-raised text-left px-2 py-1 metric-label whitespace-nowrap">Disp./total</th>
                    <td v-for="col in t.colunas" :key="col.final" class="px-1 py-1 text-center tabular-nums text-ink-muted">
                      <span class="text-data-pos font-semibold">{{ col.resumo.disponiveis }}</span>/{{ col.resumo.unidades }}
                    </td>
                    <td class="px-2 py-1 text-right tabular-nums text-ink-muted whitespace-nowrap">
                      <span class="text-data-pos font-semibold">{{ t.resumo.disponiveis }}</span>/{{ t.resumo.unidades }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <template #footer>
              <span v-if="t.resumo.valor_m2_disponivel">R$/m² médio do disponível: <b class="text-ink">{{ fmtBRL(t.resumo.valor_m2_disponivel) }}</b> · </span>
              <span v-for="(s, k, i) in SOL" :key="k" class="inline-flex items-center gap-1 mr-2"><i :class="[s.icon, s.cls]" class="text-[9px]"></i>{{ s.label }}</span>
            </template>
          </Panel>
        </div>

        <p class="text-micro text-ink-subtle">
          {{ notaPreco }}
          <template v-if="!mirror.configurado"> Faces, dormitórios e tipologias ainda não foram configurados para este empreendimento{{ canConfigure ? ': use o botão Configurar.' : '.' }}</template>
          <template v-if="mirror.settings.observacao"> {{ mirror.settings.observacao }}</template>
        </p>
      </template>
    </template>

    <!-- Ficha da unidade -->
    <Modal :open="!!unidadeAberta" size="md" :title="unidadeAberta?.nome || ''"
      :subtitle="unidadeAberta ? st(unidadeAberta.status).label : ''" @close="unidadeAberta = null">
      <dl v-if="unidadeAberta" class="divide-y divide-line-subtle">
        <div v-for="l in fichaLinhas" :key="l.label" class="flex items-baseline justify-between gap-3 py-1.5 text-sm">
          <dt class="text-ink-muted shrink-0">{{ l.label }}</dt>
          <dd class="text-right min-w-0">
            <span class="font-medium text-ink">{{ l.value }}</span>
            <span v-if="l.hint" class="block text-micro text-ink-subtle">{{ l.hint }}</span>
          </dd>
        </div>
      </dl>
      <template #footer>
        <Badge v-if="unidadeAberta" :variant="st(unidadeAberta.status).variant" class="mr-auto">
          <i :class="st(unidadeAberta.status).icon" class="text-[9px]"></i>{{ st(unidadeAberta.status).label }}
        </Badge>
        <Button variant="ghost" @click="unidadeAberta = null">Fechar</Button>
      </template>
    </Modal>

    <!-- Configuração do espelho (admin) -->
    <Modal :open="configAberta" size="xl" title="Configurar espelho"
      subtitle="O que o CV não sabe sobre este empreendimento: vale para todo mundo que abrir a aba" @close="configAberta = false">
      <div v-if="form" class="space-y-5">
        <section class="space-y-3">
          <h4 class="text-sm font-semibold text-ink">Como ler o número da unidade</h4>
          <p class="text-xs text-ink-muted">Quando o CV não manda andar e coluna, eles saem do número: os últimos dígitos são o final, os anteriores o andar, e o que sobra é a torre. Ex.: 278 com 1 e 1 = torre 2, 7º andar, final 8.</p>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input v-model="form.digitos_final" type="number" label="Dígitos do final" hint="1 a 3" />
            <Input v-model="form.digitos_andar" type="number" label="Dígitos do andar" hint="1 ou 2" />
            <Input v-model="form.andar_zero_nome" label="Nome do andar 0" placeholder="Térreo, Giardino..." />
            <Input v-model="form.vagas_padrao" type="number" label="Vagas por unidade" hint="quando o CV não informa" />
            <Input v-model="form.imagem_url" label="Implantação (URL da imagem)" placeholder="https://..." />
          </div>
        </section>

        <section class="space-y-2">
          <h4 class="text-sm font-semibold text-ink">Dormitórios pela área</h4>
          <p class="text-xs text-ink-muted">Vale quando nem o cadastro do final nem o CV dizem. Faixas em ordem: "até X m² = N dorm"; a última sem limite é o "acima disso".</p>
          <div class="flex flex-wrap items-end gap-2">
            <div v-for="(fx, i) in form.dorm_por_area" :key="i" class="flex items-end gap-1.5 rounded-lg border border-line bg-surface-sunken p-2">
              <Input v-model="fx.ate" type="number" size="sm" label="Até (m²)" placeholder="acima" />
              <Input v-model="fx.dorm" type="number" size="sm" label="Dorm." />
              <Button variant="ghost" size="sm" icon="fas fa-xmark" @click="rmFaixa(i)" />
            </div>
            <Button variant="ghost" size="sm" icon="fas fa-plus" @click="addFaixa">Faixa</Button>
          </div>
        </section>

        <section v-for="t in mirror.torres" :key="t.key" class="space-y-2">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-semibold text-ink">{{ t.nome }}: finais</h4>
            <Button v-if="t.key === mirror.torres[0].key && mirror.torres.length > 1" variant="ghost" size="sm" icon="fas fa-copy" class="ml-auto" @click="copiarPrimeiraTorre">
              Copiar para as outras torres
            </Button>
          </div>
          <div class="overflow-x-auto rounded-xl border border-line">
            <table class="w-full text-sm">
              <thead><tr class="bg-surface-sunken/60 metric-label">
                <th class="text-left px-3 py-2">Final</th><th class="text-left px-3 py-2">Face / sol</th>
                <th class="text-left px-3 py-2 w-24">Dorm.</th><th class="text-left px-3 py-2">Tipologia</th>
                <th class="text-left px-3 py-2 w-32">R$/m² do final</th>
              </tr></thead>
              <tbody>
                <tr v-for="f in t.finais" :key="f" class="border-t border-line">
                  <td class="px-3 py-1.5 font-semibold tabular-nums">Final {{ f }}<span class="block text-micro text-ink-subtle font-normal">{{ t.colunas.find((c) => c.final === f)?.area ? fmtArea(t.colunas.find((c) => c.final === f).area) : '' }}</span></td>
                  <td class="px-3 py-1.5"><Select v-model="form.finais[t.key][f].face" :options="FACE_OPTIONS" size="sm" /></td>
                  <td class="px-3 py-1.5"><Input v-model="form.finais[t.key][f].dorm" type="number" size="sm" :placeholder="String(t.colunas.find((c) => c.final === f)?.dorm ?? '-')" /></td>
                  <td class="px-3 py-1.5"><Input v-model="form.finais[t.key][f].tipologia" size="sm" :placeholder="t.colunas.find((c) => c.final === f)?.tipologia || 'Tipo 1, Garden...'" /></td>
                  <td class="px-3 py-1.5"><Input v-model="form.finais[t.key][f].valor_m2" type="number" size="sm" placeholder="-" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="space-y-2">
          <h4 class="text-sm font-semibold text-ink">R$/m² por andar (estimativa)</h4>
          <p class="text-xs text-ink-muted">Só entra quando a unidade não tem valor no CV nem em tabela de preço. Andar sem valor cai no "R$/m² do final" da tabela acima (Giardino com preço por tipo, por exemplo). O preço estimado sai em itálico na grade e como "estimado" na ficha.</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <Input v-for="a in form.andares" :key="a" v-model="form.valor_m2_andar[a]" type="number" size="sm"
              :label="a === 0 ? form.andar_zero_nome : `${a}º`" placeholder="R$/m²" />
          </div>
        </section>

        <Input v-model="form.observacao" label="Observação (aparece no rodapé do espelho)" placeholder="Ex.: preços de jul/26; rua ao norte" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="configAberta = false">Cancelar</Button>
        <Button :loading="salvando" icon="fas fa-check" @click="salvarConfig">Salvar configuração</Button>
      </template>
    </Modal>
  </div>
</template>
