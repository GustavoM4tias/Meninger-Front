<script setup>
/**
 * ChatBlock - o dispatcher: recebe UM EmeBlock e decide o componente.
 * ─────────────────────────────────────────────────────────────────────────────
 * dataset  → VizFrame + (VizTable | VizChart | VizRank | VizFunnel), com o
 *            visual pedido pela tool, trocado pela pessoa ou escolhido pela
 *            régua (escolherVisual). Trocar não volta ao servidor.
 * kpis/cards/detail/timeline/map → VizFrame + componente.
 * text/nav/choice/confirm → componente direto (não pedem moldura).
 * legacy   → o renderer antigo, até a tool dele passar a devolver blocks.
 *
 * Tudo assíncrono menos o texto: o ECharts e o ExcelJS só entram quando a
 * resposta tem gráfico ou tabela (mesma decisão do ChatMessage antigo).
 */
import { ref, computed, watch, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { validarBlock } from './emeBlock.js';
import { visuaisPossiveis, visualDoBloco } from './escolherVisual.js';
import { exportarDatasetExcel, copiarDataset } from './exportar.js';
import VizFrame from './VizFrame.vue';

const VizTable = defineAsyncComponent(() => import('./VizTable.vue'));
const VizChart = defineAsyncComponent(() => import('./VizChart.vue'));
const VizRank = defineAsyncComponent(() => import('./VizRank.vue'));
const VizFunnel = defineAsyncComponent(() => import('./VizFunnel.vue'));
const VizKpis = defineAsyncComponent(() => import('./VizKpis.vue'));
const VizCards = defineAsyncComponent(() => import('./VizCards.vue'));
const VizDetail = defineAsyncComponent(() => import('./VizDetail.vue'));
const VizChoice = defineAsyncComponent(() => import('./VizChoice.vue'));
const VizConfirm = defineAsyncComponent(() => import('./VizConfirm.vue'));
const VizNav = defineAsyncComponent(() => import('./VizNav.vue'));
const VizTimeline = defineAsyncComponent(() => import('./VizTimeline.vue'));
const VizMap = defineAsyncComponent(() => import('./VizMap.vue'));
const ChatText = defineAsyncComponent(() => import('../renderers/ChatText.vue'));

/* Renderers antigos, por `legacyType`. Somem na fase 5. */
const LEGADOS = {
  detail: defineAsyncComponent(() => import('../renderers/ChatEnterpriseDetail.vue')),
  precadastros_summary: defineAsyncComponent(() => import('../renderers/ChatPrecadastrosSummary.vue')),
  reservas_summary: defineAsyncComponent(() => import('../renderers/ChatReservasSummary.vue')),
  open_alert_editor: defineAsyncComponent(() => import('../renderers/ChatAlertEditor.vue')),
  academy_cards: defineAsyncComponent(() => import('../renderers/ChatAcademyCards.vue')),
  imobiliaria_cards: defineAsyncComponent(() => import('../renderers/ChatImobiliariaCards.vue')),
  condition_sheet: defineAsyncComponent(() => import('../renderers/ChatConditionSheet.vue')),
  campaign_cards: defineAsyncComponent(() => import('../renderers/ChatCampaignCards.vue')),
  person_cards: defineAsyncComponent(() => import('../renderers/ChatPersonCards.vue')),
  notification_prefs: defineAsyncComponent(() => import('../renderers/ChatNotificationPrefs.vue')),
  report_cards: defineAsyncComponent(() => import('../renderers/ChatReportCards.vue')),
  checklist_cards: defineAsyncComponent(() => import('../renderers/ChatChecklistCards.vue')),
  checklist_tasks: defineAsyncComponent(() => import('../renderers/ChatChecklistCards.vue')),
  assistant_tasks: defineAsyncComponent(() => import('../renderers/ChatAssistantTasks.vue')),
  assistant_task: defineAsyncComponent(() => import('../renderers/ChatAssistantTasks.vue')),
  assistant_invites: defineAsyncComponent(() => import('../renderers/ChatAssistantInvites.vue')),
  meeting_card: defineAsyncComponent(() => import('../renderers/ChatMeetingCard.vue')),
};
/* Faixas de sugestão por módulo (recebem `context`, não `action`). */
const FAIXAS = {
  'source:leads': defineAsyncComponent(() => import('../renderers/ChatLeadsActions.vue')),
  'source:events': defineAsyncComponent(() => import('../renderers/ChatEventsActions.vue')),
  'source:enterprises': defineAsyncComponent(() => import('../renderers/ChatEnterprisesActions.vue')),
  'source:mcmv': defineAsyncComponent(() => import('../renderers/ChatMcmvActions.vue')),
  'source:precadastros': defineAsyncComponent(() => import('../renderers/ChatPrecadastrosActions.vue')),
  'source:reservas': defineAsyncComponent(() => import('../renderers/ChatReservasActions.vue')),
};

const props = defineProps({
  block: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});
const router = useRouter();

const valido = computed(() => validarBlock(props.block));
const b = computed(() => props.block);

/* Visual do dataset: o que a pessoa escolheu neste bloco vence; senão a régua. */
const escolhaDaPessoa = ref(null);
watch(() => props.block?.id, () => { escolhaDaPessoa.value = null; });
const visual = computed(() => escolhaDaPessoa.value || visualDoBloco(b.value));
const visuais = computed(() => (b.value.kind === 'dataset' ? visuaisPossiveis(b.value.dataset) : []));

const compDataset = computed(() => {
  switch (visual.value) {
    case 'table': return VizTable;
    case 'rank': return VizRank;
    case 'funnel': return VizFunnel;
    default: return VizChart;
  }
});

const ds = computed(() => b.value.dataset || { columns: [], rows: [] });
const vazio = computed(() => b.value.kind === 'dataset' && !ds.value.rows?.length);
const chartRef = ref(null);
const copiado = ref(false);

async function copiar() {
  if (chartRef.value?.copiarImagem && !['table', 'rank', 'funnel'].includes(visual.value)) await chartRef.value.copiarImagem();
  else await copiarDataset(ds.value);
  copiado.value = true;
  setTimeout(() => { copiado.value = false; }, 1800);
}
function acao(a) {
  if (a?.kind === 'navigate' && a.payload?.route) router.push({ path: a.payload.route, query: a.payload.filters || {} });
}
</script>

<template>
  <!-- Bloco inválido: aviso discreto, nunca tela branca -->
  <p v-if="!valido.ok" class="mt-2 text-micro text-data-warn"><i class="fas fa-triangle-exclamation mr-1"></i>Bloco da resposta não pôde ser exibido ({{ valido.erros[0] }}).</p>

  <!-- Dataset: moldura + visual -->
  <VizFrame v-else-if="b.kind === 'dataset'"
    :title="b.title" :subtitle="b.subtitle || (ds.total ? `${ds.total.toLocaleString('pt-BR')} registro${ds.total === 1 ? '' : 's'}` : '')"
    :source="b.source" :padded="false" :empty="vazio"
    :visual="visual" :visuais="visuais" :total="ds.total" :exibidos="ds.rows?.length" :truncated="ds.truncated"
    :actions="b.actions" @visual="v => escolhaDaPessoa = v" @action="acao">
    <template #actions>
      <button type="button" @click="copiar" v-tippy="['table','rank','funnel'].includes(visual) ? 'Copiar como texto' : 'Copiar imagem'"
        class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors duration-120 focus-ring">
        <i :class="copiado ? 'fas fa-check text-data-pos' : 'far fa-copy'"></i>
        <span class="hidden sm:inline">{{ copiado ? 'Copiado' : 'Copiar' }}</span>
      </button>
      <button type="button" @click="exportarDatasetExcel(ds, b.title)" v-tippy="'Baixar em Excel'"
        class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium bg-data-pos/10 text-data-pos hover:bg-data-pos/20 transition-colors duration-120 focus-ring">
        <i class="fas fa-file-excel"></i><span class="hidden sm:inline">Excel</span>
      </button>
    </template>
    <component v-if="!vazio" :is="compDataset" ref="chartRef" :dataset="ds" :visual="visual" :compact="compact" />
  </VizFrame>

  <VizFrame v-else-if="b.kind === 'kpis' && !b.inline" :title="b.title" :subtitle="b.subtitle" :source="b.source" :padded="false" :actions="b.actions" @action="acao">
    <VizKpis :kpis="b.kpis" :inline="false" :compact="compact" />
  </VizFrame>
  <div v-else-if="b.kind === 'kpis'" class="mt-2 rounded-xl border border-line bg-surface-raised"><VizKpis :kpis="b.kpis" inline :compact="compact" /></div>

  <VizFrame v-else-if="b.kind === 'cards'" :title="b.title" :subtitle="b.subtitle || `${b.cards.length} item${b.cards.length === 1 ? '' : 's'}`" :source="b.source" :padded="false" :empty="!b.cards.length" empty-text="Nenhum item para mostrar." :actions="b.actions" @action="acao">
    <VizCards :cards="b.cards" :compact="compact" @action="acao" />
  </VizFrame>

  <VizFrame v-else-if="b.kind === 'detail'" :title="b.title" :subtitle="b.subtitle" :source="b.source" :icon="b.icon" :padded="false" :actions="b.actions" @action="acao">
    <VizDetail :detail="b.detail" :compact="compact" />
  </VizFrame>

  <VizFrame v-else-if="b.kind === 'timeline'" :title="b.title" :subtitle="b.subtitle" :source="b.source" :padded="false" :empty="!b.timeline.events?.length" :actions="b.actions" @action="acao">
    <VizTimeline :timeline="b.timeline" />
  </VizFrame>

  <VizFrame v-else-if="b.kind === 'map'" :title="b.title" :subtitle="b.subtitle" :source="b.source" :padded="false" :actions="b.actions" @action="acao">
    <VizMap :map="b.map" />
  </VizFrame>

  <div v-else-if="b.kind === 'text'" class="mt-2"><ChatText :content="b.text" /></div>
  <VizNav v-else-if="b.kind === 'nav'" :nav="b.nav" />
  <div v-else-if="b.kind === 'choice'" class="mt-2"><VizChoice :choice="b.choice" :compact="compact" /></div>
  <VizConfirm v-else-if="b.kind === 'confirm'" :confirm="b.confirm" />

  <!-- Legado -->
  <component v-else-if="b.kind === 'legacy' && FAIXAS[b.legacyType]" :is="FAIXAS[b.legacyType]"
    :context="b.action?.context || {}" :rows="b.action?.rows || b.action?.rawRows || []" />
  <component v-else-if="b.kind === 'legacy' && LEGADOS[b.legacyType] && !(b.legacyType === 'condition_sheet' && b.action?.precisa_desambiguar)"
    :is="LEGADOS[b.legacyType]" :action="b.action" />
</template>
