<script setup>
// Gestão do mural: escrever, publicar e acompanhar a leitura. É a ABA de gestão
// da tela /mural, não uma tela própria - quem administra o mural também recebe
// do mural.
//
// Segue a receita de tela do Office (_design/RECEITA-DE-TELA.md):
//
//   StatRow (recorta a tabela)  →  linha de estado  →  DataTable
//
// A lista era um empilhado de cartões com os botões todos à mostra em cada
// linha. Vira tabela: o estado de cada comunicado se compara na vertical
// (rascunho x publicado, 3/12 cientes x 12/12) e as ações ficam na linha.
//
// Delegável por alçada desde 2026-08-20: quem tem a tela redige e publica;
// EXCLUIR é admin (some com a trilha de leitura). A regra mora no backend
// (lib/screenCapabilities.js) e chega pronta - ver composables/useCan.js. A aba
// só é oferecida a quem tem `view`, mas quem barra de verdade é o
// requireCapability na API.
import { ref, computed, onMounted } from 'vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { useMuralAdminStore } from '@/stores/Mural/muralAdminStore';
import { useCan } from '@/composables/useCan';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import ComunicadoEditModal from './ComunicadoEditModal.vue';
import AdherencePanel from './AdherencePanel.vue';
import { kindMeta, formatDate } from '@/utils/Mural/muralFormat';

const store = useMuralAdminStore();
const can = useCan('/mural/admin');

/* Excluir comunicado nao tem desfazer e some da tela de quem ja recebeu. */
const aExcluir = ref(null);

const editOpen = ref(false);
const editing = ref(null);
const adherenceOpen = ref(false);
const adherenceId = ref(null);
const recorte = ref('');            // '' | DRAFT | PUBLISHED | ARCHIVED
const actionError = ref('');

const STATUS_BADGE = {
  DRAFT: { variant: 'neutral', label: 'Rascunho' },
  PUBLISHED: { variant: 'success', label: 'Publicado' },
  ARCHIVED: { variant: 'neutral', label: 'Arquivado' },
};

const COLUNAS = [
  { key: 'title', label: 'Comunicado', priority: 1 },
  { key: 'status', label: 'Situação', priority: 2, width: '9rem' },
  { key: 'ciencia', label: 'Ciência', priority: 2, width: '9rem' },
  { key: 'data', label: 'Atualizado', priority: 3, width: '9rem' },
];

onMounted(() => store.fetchList());

// A lista vem inteira do servidor; o recorte é local, então clicar num cartão
// não custa ida ao banco.
const todos = computed(() => store.list || []);
const porStatus = (s) => todos.value.filter(c => c.status === s);

const filas = computed(() => [
  { key: '', label: 'Todos', raw: todos.value.length, icon: 'fas fa-bullhorn', tone: 'accent',
    hint: 'comunicados criados' },
  { key: 'DRAFT', label: 'Rascunhos', raw: porStatus('DRAFT').length, icon: 'fas fa-pen',
    tone: 'warn', hint: 'ninguém vê ainda' },
  { key: 'PUBLISHED', label: 'Publicados', raw: porStatus('PUBLISHED').length,
    icon: 'fas fa-paper-plane', tone: 'pos', hint: 'no ar' },
  { key: 'ARCHIVED', label: 'Arquivados', raw: porStatus('ARCHIVED').length,
    icon: 'fas fa-box-archive', tone: 'neutral', hint: 'fora de circulação' },
]);

const linhas = computed(() => (recorte.value ? porStatus(recorte.value) : todos.value));

function aoClicarFila(item) {
  recorte.value = (!item.key || recorte.value === item.key) ? '' : item.key;
}

const rotuloRecorte = computed(() => STATUS_BADGE[recorte.value]?.label || '');

function openCreate() { editing.value = null; editOpen.value = true; }

async function openEdit(c) {
  const full = await store.fetchOne(c.id); // traz assignments para o editor
  editing.value = full || c;
  editOpen.value = true;
}

function onSaved() { editOpen.value = false; store.fetchList(); }

async function publish(c) {
  actionError.value = '';
  try { await store.publish(c.id); }
  catch (e) { actionError.value = `Não foi possível publicar "${c.title}": ${e.message}`; }
}

function openAdherence(c) { adherenceId.value = c.id; adherenceOpen.value = true; }

async function archive(c) {
  actionError.value = '';
  try { await store.setStatus(c.id, 'ARCHIVED'); }
  catch (e) { actionError.value = e.message; }
}

async function reactivate(c) {
  actionError.value = '';
  try { await store.setStatus(c.id, 'DRAFT'); }
  catch (e) { actionError.value = e.message; }
}

function remove(c) { aExcluir.value = c; }

async function excluirConfirmado() {
  const c = aExcluir.value;
  aExcluir.value = null;
  if (!c) return;
  actionError.value = '';
  const ok = await store.remove(c.id);
  if (!ok) actionError.value = store.error || 'Erro ao excluir.';
}

// Percentual de ciência: o número sozinho ("3/12") não diz se está bom.
const pctCiencia = (c) => {
  const total = c.stats?.recipients || 0;
  if (!total) return null;
  return Math.round((100 * (c.stats?.acked || 0)) / total);
};
</script>

<template>
  <div>
    <StatRow :items="filas" :cols="{ sm: 2, md: 4 }" size="sm"
      selectable :active-key="recorte" :loading="store.loading && !todos.length"
      @select="aoClicarFila" />

    <div class="mt-3 mb-3 flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap text-xs text-ink-muted">
        <span><span class="tabular-nums">{{ linhas.length }}</span> de
          <span class="tabular-nums">{{ todos.length }}</span> comunicados</span>
        <button v-if="recorte" type="button" @click="recorte = ''"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-accent/30
                 bg-accent-soft text-accent text-micro hover:border-accent/60 transition-colors duration-120">
          {{ rotuloRecorte }}
          <i class="fas fa-xmark text-[10px]"></i>
        </button>
      </div>

      <Button v-if="can('manage')" variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">
        <span class="hidden sm:inline">Novo comunicado</span>
      </Button>
    </div>

    <p v-if="actionError"
      class="mb-3 rounded-lg border border-data-neg/30 bg-data-neg-soft px-3 py-2 text-sm text-data-neg">
      <i class="fas fa-circle-exclamation"></i> {{ actionError }}
    </p>

    <Panel :padded="false" :loading="store.loading && !todos.length" loading-variant="table">
      <DataTable :columns="COLUNAS" :rows="linhas" row-key="id" density="compact"
        empty-icon="fas fa-bullhorn"
        :empty-title="recorte ? 'Nada nesta situação' : 'Nenhum comunicado'"
        :empty-text="recorte ? 'Toque em Todos para ver os demais.' : 'Crie o primeiro comunicado do mural.'">

        <template #cell-title="{ row }">
          <div class="min-w-0">
            <p class="text-sm font-medium text-ink truncate">{{ row.title }}</p>
            <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
              <Badge :variant="kindMeta(row.kind).badge" size="sm">
                <i :class="kindMeta(row.kind).icon"></i> {{ kindMeta(row.kind).label }}
              </Badge>
              <Badge v-if="row.pinned" variant="accent" size="sm"><i class="fas fa-thumbtack"></i> Fixado</Badge>
              <Badge v-if="row.requiresAck" variant="info" size="sm"><i class="fas fa-signature"></i> Exige ciência</Badge>
            </div>
          </div>
        </template>

        <template #cell-status="{ row }">
          <Badge :variant="STATUS_BADGE[row.status]?.variant || 'neutral'" size="sm">
            {{ STATUS_BADGE[row.status]?.label || row.status }}
          </Badge>
        </template>

        <template #cell-ciencia="{ row }">
          <span v-if="row.status !== 'PUBLISHED'" class="text-ink-subtle">-</span>
          <span v-else class="tabular-nums text-sm"
            :class="pctCiencia(row) === 100 ? 'text-data-pos' : 'text-ink'">
            {{ row.stats?.acked || 0 }}/{{ row.stats?.recipients || 0 }}
            <span v-if="pctCiencia(row) !== null" class="text-micro text-ink-subtle">
              ({{ pctCiencia(row) }}%)
            </span>
          </span>
        </template>

        <template #cell-data="{ row }">
          <span class="text-xs text-ink-muted font-mono">
            {{ formatDate(row.status === 'PUBLISHED' ? row.publishedAt : row.updatedAt) }}
          </span>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-1" @click.stop>
            <Button v-if="can('manage') && row.status !== 'PUBLISHED'" variant="ghost" size="sm"
              icon="fas fa-pen" title="Editar" @click="openEdit(row)" />
            <Button v-if="can('manage') && row.status === 'DRAFT'" variant="primary" size="sm"
              icon="fas fa-paper-plane" @click="publish(row)">
              <span class="hidden sm:inline">Publicar</span>
            </Button>
            <Button v-if="row.status === 'PUBLISHED'" variant="secondary" size="sm"
              icon="fas fa-chart-pie" title="Aderência" @click="openAdherence(row)">
              <span class="hidden sm:inline">Aderência</span>
            </Button>
            <Button v-if="can('manage') && row.status === 'PUBLISHED'" variant="ghost" size="sm"
              icon="fas fa-box-archive" title="Arquivar" @click="archive(row)" />
            <Button v-if="can('manage') && row.status === 'ARCHIVED'" variant="ghost" size="sm"
              icon="fas fa-rotate-left" title="Reativar" @click="reactivate(row)" />
            <Button v-if="can('remove')" variant="ghost" size="sm"
              icon="fas fa-trash" title="Excluir" @click="remove(row)" />
          </div>
        </template>
      </DataTable>
    </Panel>

    <p v-if="store.error && !actionError" class="mt-4 text-sm text-data-neg">{{ store.error }}</p>

    <ComunicadoEditModal v-model:open="editOpen" :comunicado="editing" @saved="onSaved" />
    <AdherencePanel v-model:open="adherenceOpen" :comunicado-id="adherenceId" />

    <ConfirmDialog :open="!!aExcluir" tone="danger"
      :title="`Excluir o comunicado ${aExcluir?.title}?`"
      consequence="Ele some do Mural de todo mundo que o recebeu, junto com o registro de quem já tinha dado ciência."
      hint="Não tem desfazer. Para tirar de circulação guardando o histórico, despublique em vez de excluir."
      confirm-label="Excluir comunicado"
      @confirm="excluirConfirmado" @cancel="aExcluir = null" />
  </div>
</template>
