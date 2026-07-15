<script setup>
import { computed, onMounted, ref } from 'vue';
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { syncPriceTables } from '@/utils/Building/apiBuilding';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import WeatherInfo from './UI/WeatherInfo.vue';

const props = defineProps({
  building: { type: Object, required: true },
});
const emit = defineEmits(['close']);

const buildingStore = useBuildingStore();

// ── Abas do modal ──────────────────────────────────────────
const activeTab = ref('geral');

const closeModal = () => emit('close');

const fetchWeather = async () => {
  if (props.building?.latitude && props.building?.longitude) {
    try { await buildingStore.getWeather(props.building.latitude, props.building.longitude); }
    catch (e) { console.error('Erro ao buscar o clima:', e); }
  } else {
    buildingStore.weather = null;
  }
};

const formatDate = (d) => d || 'Não informado';
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ —';
};

// ── Status helpers ─────────────────────────────────────────
const UNIT_STATUS = {
  1: { text: 'Disponível',     dot: 'bg-emerald-500', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' },
  2: { text: 'Reserva início', dot: 'bg-blue-500',    cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20' },
  3: { text: 'Vendido',        dot: 'bg-rose-500',    cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20' },
  4: { text: 'Bloqueado',      dot: 'bg-slate-400',   cls: 'bg-surface-sunken text-ink-muted border-line' },
  5: { text: 'Reserva ativa',  dot: 'bg-yellow-500',  cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 border-yellow-500/20' },
};
const getUnitStatus = (u) => UNIT_STATUS[u.situacao?.situacao_mapa_disponibilidade] || {
  text: 'Não informado', dot: 'bg-slate-400', cls: 'bg-surface-sunken text-ink-muted border-line',
};

// ── Resumo ─────────────────────────────────────────────────
const totalUnits = computed(() => {
  if (!props.building.etapas) return 0;
  return props.building.etapas.reduce((total, etapa) =>
    total + (etapa.blocos?.reduce((b, bloco) =>
      b + (bloco.paginacao_unidade?.total || 0), 0) || 0), 0);
});

const totalBlocks = computed(() => {
  if (!props.building.etapas) return 0;
  return props.building.etapas.reduce((total, etapa) => total + (etapa.blocos?.length || 0), 0);
});

const unitStatusCounts = computed(() => {
  const c = { disponivel: 0, reserva_inicio: 0, vendido: 0, bloqueado: 0, reserva_ativa: 0 };
  if (!props.building.etapas) return c;
  props.building.etapas.forEach(etapa => {
    etapa.blocos?.forEach(bloco => {
      bloco.unidades?.forEach(u => {
        const s = u.situacao?.situacao_mapa_disponibilidade;
        if (s === 1) c.disponivel++;
        else if (s === 2) c.reserva_inicio++;
        else if (s === 3) c.vendido++;
        else if (s === 4) c.bloqueado++;
        else if (s === 5) c.reserva_ativa++;
      });
    });
  });
  return c;
});

const kpiCards = computed(() => [
  { label: 'Unidades',       value: totalUnits.value, icon: 'fas fa-house', accent: 'text-accent bg-accent-soft' },
  { label: 'Blocos',         value: totalBlocks.value, icon: 'fas fa-building', accent: 'text-emerald-500 bg-emerald-500/10' },
  { label: 'Etapas',         value: props.building.etapas?.length || 0, icon: 'fas fa-layer-group', accent: 'text-purple-500 bg-purple-500/10' },
  { label: 'Materiais',      value: props.building.materiais_campanha?.length || 0, icon: 'fas fa-images', accent: 'text-amber-500 bg-amber-500/10' },
]);

const materialsCount = computed(() =>
  (props.building.materiais_campanha?.length || 0) + (props.building.plantas_mapeadas?.length || 0));

const tabOptions = computed(() => [
  { value: 'geral',     label: 'Visão geral', icon: 'fas fa-grip' },
  { value: 'unidades',  label: 'Unidades',    icon: 'fas fa-house',  count: totalUnits.value },
  { value: 'materiais', label: 'Materiais & Plantas', icon: 'fas fa-images', count: materialsCount.value },
]);

const statusBreakdown = computed(() => [
  { key: 'disponivel',     label: 'Disponíveis',    value: unitStatusCounts.value.disponivel,     dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'reserva_inicio', label: 'Reserva início', value: unitStatusCounts.value.reserva_inicio, dot: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400' },
  { key: 'reserva_ativa',  label: 'Reservas ativas', value: unitStatusCounts.value.reserva_ativa, dot: 'bg-yellow-500',  text: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'vendido',        label: 'Vendidas',       value: unitStatusCounts.value.vendido,        dot: 'bg-rose-500',    text: 'text-rose-600 dark:text-rose-400' },
  { key: 'bloqueado',      label: 'Bloqueadas',     value: unitStatusCounts.value.bloqueado,      dot: 'bg-slate-400',   text: 'text-ink-muted' },
]);

const cvLink = computed(() =>
  `https://menin.cvcrm.com.br/gestor/cadastros/empreendimentos/${props.building.idempreendimento}/cadastro_simplificado`
);

// ── Sync de tabelas de preço (CV → Office) — somente admin ──
const authStore = useAuthStore();
const isAdmin = computed(() => authStore?.user?.role === 'admin');
const syncingTables = ref(false);
const syncResult = ref(null); // { ok, synced } | { ok: false, error }

const syncTables = async () => {
  syncingTables.value = true;
  syncResult.value = null;
  try {
    const r = await syncPriceTables(props.building.idempreendimento);
    syncResult.value = { ok: true, synced: r.synced ?? 0 };
  } catch (e) {
    syncResult.value = { ok: false, error: e.message || 'Erro ao sincronizar tabelas.' };
  } finally {
    syncingTables.value = false;
  }
};

const syncLabel = computed(() => {
  if (syncingTables.value) return 'Sincronizando...';
  if (syncResult.value?.ok) return `${syncResult.value.synced} tabela(s) sincronizada(s)`;
  if (syncResult.value && !syncResult.value.ok) return 'Erro — tentar de novo';
  return 'Sincronizar tabelas';
});

const stage = computed(() => props.building.situacao_comercial?.[0]?.nome ?? null);
const stageChips = computed(() => [
  props.building.situacao_comercial?.[0]?.nome,
  props.building.tipo_empreendimento?.[0]?.nome,
  props.building.situacao_obra?.[0]?.nome,
  props.building.segmento?.[0]?.nome,
].filter(Boolean));

onMounted(fetchWeather);
</script>

<template>
  <Modal :open="true" size="full" hide-close @close="closeModal">
    <template #header><div class="hidden"></div></template>

    <div class="-m-4 sm:-m-5">

      <!-- Hero com foto + gradient (faixa de identidade, não protagonista) -->
      <div class="relative h-40 sm:h-48 overflow-hidden">
        <img :src="building.foto || '/noimg.jpg'" :alt="building.nome"
          class="absolute inset-0 w-full h-full object-cover" />

        <!-- Fade leve só na base, para o título ficar legível sem sombrear a foto -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        <!-- Close button -->
        <button @click="closeModal" aria-label="Fechar"
          class="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-lg
                 bg-white/15 hover:bg-white/30 backdrop-blur-md text-white border border-white/20
                 transition-colors z-10">
          <i class="fas fa-xmark text-sm"></i>
        </button>

        <!-- Weather (hover tooltip) -->
        <div class="absolute bottom-4 right-4 z-10 text-3xl z-20">
          <WeatherInfo :weather="buildingStore.weather" :city="building.cidade" />
        </div>

        <!-- Title + Chips -->
        <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span v-if="stage"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
                     bg-white/20 backdrop-blur-md border border-white/30
                     text-white text-xs font-semibold">
              <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
              {{ stage }}
            </span>
            <span v-for="chip in stageChips.slice(1)" :key="chip"
              class="inline-flex items-center px-2 py-0.5 rounded-md
                     bg-white/15 backdrop-blur-md border border-white/20
                     text-white/90 text-[11px] font-medium">
              {{ chip }}
            </span> 
          </div>
          <h1 class="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight drop-shadow-lg">
            {{ building.nome }}
          </h1>
          <p class="text-sm text-white/85 mt-1 inline-flex items-center gap-1.5 drop-shadow">
            <i class="fas fa-location-dot text-xs"></i>
            {{ building.cidade }}<template v-if="building.estado">/{{ building.estado }}</template>
          </p>
        </div>
      </div>

      <!-- Barra de abas (fixa, fora do scroll) -->
      <div class="px-4 sm:px-6 py-2.5 border-b border-line bg-surface overflow-x-auto">
        <SegmentedControl v-model="activeTab" :options="tabOptions" size="sm" />
      </div>

      <!-- Conteúdo scrollável (uma rolagem só) -->
      <div class="max-h-[62vh] overflow-y-auto">
        <div class="p-4 sm:p-6 space-y-5">

          <!-- ── Aba: Visão geral ─────────────────────────────────── -->
          <template v-if="activeTab === 'geral'">

          <!-- Números do empreendimento (KPIs + status das unidades) -->
          <Surface variant="raised" padding="md">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div v-for="k in kpiCards" :key="k.label" class="flex items-center gap-3 p-2.5 rounded-xl bg-surface-sunken border border-line">
                <span class="h-10 w-10 rounded-lg grid place-items-center text-base shrink-0" :class="k.accent">
                  <i :class="k.icon"></i>
                </span>
                <div class="min-w-0">
                  <p class="text-2xl font-semibold text-ink tabular-nums leading-none">{{ k.value }}</p>
                  <p class="text-[11px] uppercase tracking-wider font-mono text-ink-subtle mt-1">{{ k.label }}</p>
                </div>
              </div>
            </div>
            <div v-if="building.etapas?.length" class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-line">
              <span v-for="s in statusBreakdown" :key="s.key" class="inline-flex items-center gap-1.5 text-xs">
                <span class="h-2 w-2 rounded-full" :class="s.dot"></span>
                <span class="font-semibold tabular-nums" :class="s.text">{{ s.value }}</span>
                <span class="text-ink-subtle">{{ s.label }}</span>
              </span>
            </div>
          </Surface>

          <!-- Grid de informações: 3 colunas (Sienge / Localização / Cronograma) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Sienge / Empresa -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <i class="fas fa-building-circle-check text-accent text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Sienge / Empresa</h3>
              </div>
              <div class="space-y-2">
                <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Empresa</p>
                  <p class="text-sm font-semibold text-ink truncate">{{ building.nome_empresa || '—' }}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                    <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">ID Empresa</p>
                    <p class="text-base font-bold text-accent tabular-nums">{{ building.idempresa_int || '—' }}</p>
                  </div>
                  <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                    <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">CDC Sienge</p>
                    <p class="text-base font-bold text-accent tabular-nums">{{ building.idempreendimento_int || '—' }}</p>
                  </div>
                </div>
                <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Matrícula</p>
                  <p class="text-sm text-ink font-mono truncate">{{ building.matricula || '—' }}</p>
                </div>
                <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">CNPJ</p>
                  <p class="text-sm text-ink font-mono truncate">{{ building.cnpj_empesa || '—' }}</p>
                </div>
              </div>
            </Surface>

            <!-- Localização -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <i class="fas fa-location-dot text-accent text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Localização</h3>
              </div>
              <ul class="space-y-2 text-sm">
                <li class="flex items-start gap-2.5">
                  <i class="fas fa-road text-[11px] text-ink-subtle mt-1 w-4 text-center"></i>
                  <span class="text-ink-muted">
                    {{ building.endereco_emp || 'Endereço não informado' }}<template v-if="building.numero">, {{ building.numero }}</template>
                  </span>
                </li>
                <li v-if="building.bairro" class="flex items-start gap-2.5">
                  <i class="fas fa-map-pin text-[11px] text-ink-subtle mt-1 w-4 text-center"></i>
                  <span class="text-ink-muted">{{ building.bairro }}</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <i class="fas fa-city text-[11px] text-ink-subtle mt-1 w-4 text-center"></i>
                  <span class="text-ink-muted">
                    {{ building.cidade || '—' }}<template v-if="building.estado"> · {{ building.estado }}</template>
                  </span>
                </li>
                <li v-if="building.cep" class="flex items-start gap-2.5">
                  <i class="fas fa-mailbox text-[11px] text-ink-subtle mt-1 w-4 text-center"></i>
                  <span class="text-ink-muted font-mono">{{ building.cep }}</span>
                </li>
                <li v-if="building.regiao" class="flex items-start gap-2.5">
                  <i class="fas fa-globe-americas text-[11px] text-ink-subtle mt-1 w-4 text-center"></i>
                  <span class="text-ink-muted">{{ building.regiao }}</span>
                </li>
              </ul>

              <!-- Botão Google Maps -->
              <a v-if="building.latitude && building.longitude"
                :href="`https://www.google.com/maps?q=${building.latitude},${building.longitude}`"
                target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 mt-1 text-xs text-accent hover:text-accent-hover transition-colors">
                <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
                Abrir no Google Maps
              </a>
            </Surface>

            <!-- Cronograma + Tabela de preços -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <i class="far fa-calendar-check text-accent text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Cronograma</h3>
              </div>
              <div class="space-y-2">
                <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Previsão de entrega</p>
                  <p class="text-base font-bold text-amber-500 dark:text-amber-300 tabular-nums">
                    {{ formatDate(building.data_entrega) }}
                  </p>
                </div>
                <div v-if="building.periodo_venda_inicio" class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Início das vendas</p>
                  <p class="text-sm font-semibold text-ink font-mono">{{ formatDate(building.periodo_venda_inicio) }}</p>
                </div>
              </div>

              <!-- Tabela de preços (se existir) -->
              <template v-if="building.tabela">
                <div class="border-t border-line pt-3 flex items-center gap-2">
                  <i class="fas fa-tags text-accent text-sm"></i>
                  <h4 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Tabela de preços</h4>
                  <Badge :variant="building.tabela.aprovado === 'S' ? 'success' : 'danger'" size="sm" class="ml-auto">
                    {{ building.tabela.aprovado === 'S' ? 'Aprovada' : 'Pendente' }}
                  </Badge>
                </div>
                <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Nome</p>
                  <p class="text-sm font-semibold text-ink truncate">{{ building.tabela.nome }}</p>
                </div>
                <div class="rounded-lg border border-line bg-surface-sunken p-2.5">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Vigência</p>
                  <p class="text-xs text-ink font-mono">
                    {{ building.tabela.data_vigencia_de }} <span class="text-ink-subtle">→</span> {{ building.tabela.data_vigencia_ate }}
                  </p>
                </div>
              </template>
            </Surface>
          </div>
          </template>

          <!-- ── Aba: Materiais & Plantas ─────────────────────────── -->
          <template v-else-if="activeTab === 'materiais'">

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Materiais campanha -->
            <Surface v-if="building.materiais_campanha?.length" variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <i class="fas fa-images text-amber-500 text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Materiais de campanha</h3>
                <Badge variant="neutral" size="sm" class="ml-auto">{{ building.materiais_campanha.length }}</Badge>
              </div>
              <div class="space-y-2">
                <a v-for="mat in building.materiais_campanha" :key="mat.idarquivo"
                  :href="mat.tipo === 'youtube' ? mat.servidor : mat.arquivo"
                  target="_blank" rel="noopener" @click.stop
                  class="flex items-center gap-2.5 rounded-lg border border-line bg-surface-sunken p-2.5
                         hover:bg-surface-hover hover:border-accent/30 transition-colors group">
                  <i :class="mat.tipo === 'youtube' ? 'fab fa-youtube text-rose-500' : 'fas fa-file text-accent'"
                    class="text-base shrink-0"></i>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">{{ mat.nome }}</p>
                    <p class="text-[11px] text-ink-subtle font-mono">
                      {{ mat.tipo }}<span v-if="mat.tamanho > 0"> · {{ (mat.tamanho / 1024 / 1024).toFixed(2) }} MB</span>
                    </p>
                  </div>
                  <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle group-hover:text-accent transition-colors"></i>
                </a>
              </div>
            </Surface>

            <!-- Plantas -->
            <Surface v-if="building.plantas_mapeadas?.length" variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-drafting-compass text-teal-500 text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Plantas mapeadas</h3>
                <Badge variant="neutral" size="sm" class="ml-auto">{{ building.plantas_mapeadas.length }}</Badge>
              </div>
              <div class="space-y-2">
                <a v-for="planta in building.plantas_mapeadas" :key="planta.idplanta_mapeada"
                  :href="planta.link" target="_blank" rel="noopener"
                  class="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-sunken p-2.5
                         hover:bg-surface-hover hover:border-accent/30 transition-colors group">
                  <span class="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">
                    {{ planta.nome }}
                  </span>
                  <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle group-hover:text-accent transition-colors"></i>
                </a>
              </div>
            </Surface>
          </div>

          <!-- Mapa -->
          <Surface v-if="building.latitude && building.longitude" variant="raised" padding="md" class="space-y-2">
            <div class="flex items-center gap-2">
              <i class="fas fa-map-location-dot text-sky-500 text-sm"></i>
              <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Mapa</h3>
            </div>
            <div class="rounded-lg overflow-hidden border border-line">
              <iframe
                :src="`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1579.2792625838822!2d${building.longitude}!3d${building.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1spt-BR!2sbr!4v1738328467636!5m2!1spt-BR!2sbr`"
                allowfullscreen="" loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                class="w-full h-64"></iframe>
            </div>
          </Surface>

          <div v-if="!materialsCount && !(building.latitude && building.longitude)"
            class="py-12 flex flex-col items-center gap-2 text-ink-subtle text-center">
            <i class="fas fa-images text-xl"></i>
            <p class="text-sm">Nenhum material, planta ou mapa cadastrado</p>
          </div>
          </template>

          <!-- ── Aba: Unidades (disponibilidade detalhada) ────────── -->
          <template v-else-if="activeTab === 'unidades'">

          <div v-if="!building.etapas?.length" class="py-12 flex flex-col items-center gap-2 text-ink-subtle text-center">
            <i class="fas fa-house text-xl"></i>
            <p class="text-sm">Nenhuma etapa/unidade cadastrada no CV</p>
          </div>

          <div v-else class="space-y-5">
                  <div v-for="etapa in building.etapas" :key="etapa.idetapa">
                    <div class="flex items-center gap-2 mb-3">
                      <i class="fas fa-layer-group text-purple-500 text-xs"></i>
                      <h4 class="text-sm font-semibold text-ink">{{ etapa.nome }}</h4>
                      <Badge variant="accent" size="sm">{{ etapa.blocos?.length || 0 }} bloco{{ (etapa.blocos?.length || 0) === 1 ? '' : 's' }}</Badge>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3" v-if="etapa.blocos?.length">
                      <div v-for="bloco in etapa.blocos" :key="bloco.idbloco"
                        class="rounded-xl border border-line bg-surface-sunken overflow-hidden">
                        <div class="px-3 py-2.5 border-b border-line flex items-center justify-between gap-2">
                          <h5 class="text-sm font-semibold text-ink truncate">{{ bloco.nome }}</h5>
                          <Badge variant="success" size="sm">
                            <span class="font-mono tabular-nums">{{ bloco.paginacao_unidade?.total || 0 }}</span> un.
                          </Badge>
                        </div>

                        <div class="p-2.5 space-y-1.5"
                          v-if="bloco.unidades?.length">
                          <div v-for="unidade in bloco.unidades" :key="unidade.idunidade"
                            class="rounded-lg border border-line bg-surface-raised p-2.5
                                   hover:border-accent/30 transition-colors">
                            <div class="flex items-start justify-between gap-2">
                              <div class="flex-1 min-w-0">
                                <p class="text-sm font-semibold text-ink">{{ unidade.nome }}</p>
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-ink-muted">
                                  <span v-if="unidade.area_privativa" class="inline-flex items-center gap-1 font-mono">
                                    <i class="fas fa-ruler-combined text-[9px] text-ink-subtle"></i>
                                    {{ parseFloat(unidade.area_privativa).toFixed(2) }} m²
                                  </span>
                                  <span v-if="unidade.vagas_garagem" class="inline-flex items-center gap-1 font-mono">
                                    <i class="fas fa-car text-[9px] text-ink-subtle"></i>
                                    {{ unidade.vagas_garagem }} vaga(s)
                                  </span>
                                  <span v-if="unidade.idunidade_int" class="inline-flex items-center gap-1 font-mono text-ink-subtle">
                                    ID {{ unidade.idunidade_int }}
                                  </span>
                                </div>
                                <p v-if="unidade.valor"
                                  class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                                  {{ fmtMoney(unidade.valor) }}
                                </p>
                              </div>
                              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0"
                                :class="getUnitStatus(unidade).cls">
                                <span class="h-1.5 w-1.5 rounded-full" :class="getUnitStatus(unidade).dot"></span>
                                {{ getUnitStatus(unidade).text }}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p v-else class="text-xs text-ink-subtle text-center py-4">
                          Nenhuma unidade encontrada
                        </p>
                      </div>
                    </div>
                  </div>
          </div>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <button v-if="isAdmin" @click="syncTables" :disabled="syncingTables"
        v-tippy="'Puxa do CV as tabelas de preço deste empreendimento (usadas nas fichas comerciais)'"
        class="mr-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line bg-surface-raised hover:bg-surface-hover text-sm font-medium transition-colors shadow-soft disabled:opacity-50"
        :class="syncResult && !syncResult.ok ? 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800' : 'text-ink'">
        <i class="fas text-xs"
          :class="syncingTables ? 'fa-spinner fa-spin' : syncResult?.ok ? 'fa-check text-emerald-500' : syncResult ? 'fa-triangle-exclamation' : 'fa-rotate'"></i>
        <span>{{ syncLabel }}</span>
      </button>
      <Button variant="ghost" @click="closeModal">Fechar</Button>
      <a :href="cvLink" target="_blank" rel="noopener" v-tippy="'Abrir no CV CRM'"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-soft">
        <img src="/CVLogo.png" alt="CV CRM" class="h-4 brightness-0 invert" />
        <span>Abrir no CV CRM</span>
        <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
      </a>
    </template>
  </Modal>
</template>
