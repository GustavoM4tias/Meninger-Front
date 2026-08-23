<script setup>
// Gestão do Mural de Avisos. Lista comunicados, cria/edita, publica, acompanha
// aderência, arquiva e exclui.
//
// Delegável por alçada desde 2026-08-20: quem tem a tela redige e publica;
// EXCLUIR é admin (some com a trilha de leitura). A regra mora no backend
// (lib/screenCapabilities.js) e chega pronta — ver composables/useCan.js.

import { ref, onMounted } from 'vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { useMuralAdminStore } from '@/stores/Mural/muralAdminStore';
import { useCan } from '@/composables/useCan';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import ComunicadoEditModal from './components/ComunicadoEditModal.vue';
import AdherencePanel from './components/AdherencePanel.vue';
import { kindMeta, formatDate } from '@/utils/Mural/muralFormat';

const store = useMuralAdminStore();

/* Excluir comunicado nao tem desfazer e some da tela de quem ja recebeu. */
const aExcluir = ref(null);
const can = useCan('/mural/admin');

const editOpen = ref(false);
const editing = ref(null);
const adherenceOpen = ref(false);
const adherenceId = ref(null);
const statusFilter = ref('');
const actionError = ref('');

const STATUS_BADGE = {
    DRAFT: { variant: 'neutral', label: 'Rascunho' },
    PUBLISHED: { variant: 'success', label: 'Publicado' },
    ARCHIVED: { variant: 'neutral', label: 'Arquivado' },
};

const FILTERS = [
    { v: '', l: 'Todos' },
    { v: 'DRAFT', l: 'Rascunhos' },
    { v: 'PUBLISHED', l: 'Publicados' },
    { v: 'ARCHIVED', l: 'Arquivados' },
];

onMounted(() => store.fetchList());

function openCreate() { editing.value = null; editOpen.value = true; }

async function openEdit(c) {
    const full = await store.fetchOne(c.id); // traz assignments para o editor
    editing.value = full || c;
    editOpen.value = true;
}

function onSaved() { editOpen.value = false; store.fetchList(statusFilter.value || undefined); }

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

function remove(c) {
    aExcluir.value = c;
}

async function excluirConfirmado() {
    const c = aExcluir.value;
    aExcluir.value = null;
    if (!c) return;
    actionError.value = '';
    const ok = await store.remove(c.id);
    if (!ok) actionError.value = store.error || 'Erro ao excluir.';
}

function onFilter(s) { statusFilter.value = s; store.fetchList(s || undefined); }
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Gestão de Comunicados"
        subtitle="Mural de avisos - criar, publicar e acompanhar a ciência."
        icon="fas fa-bullhorn">
        <template #actions>
          <PageHelp
            storage-key="mural-admin"
            title="Como publicar um comunicado"
            intro="Aqui se escreve, publica e acompanha a leitura dos avisos. Publicar dispara notificação para o público escolhido, então vale conferir o alcance antes."
            :steps="[
              { title: 'Escreva', text: 'Título e corpo. Um comunicado que cabe em três linhas é lido; um que parece documento, não.' },
              { title: 'Escolha o público', text: 'É ele que decide quem vê o aviso no Mural. Público errado é a causa mais comum de gente reclamando que não foi avisada.' },
              { title: 'Publique', text: 'Sair do rascunho notifica todo mundo do público. Antes disso, ninguém vê.' },
              { title: 'Acompanhe a ciência', text: 'A aderência mostra quem já leu. Serve para cobrar quem falta sem mandar aviso novo para todos.' },
            ]"
            :tips="[
              'Rascunho pode ser revisto à vontade: a notificação só sai na publicação.',
              'Comunicado com pedido de ciência fica na tela da pessoa até ela confirmar.',
            ]" />
          <Button v-if="can('manage')" variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">Novo comunicado</Button>
        </template>
      </PageHeader>

      <div class="flex gap-1 mb-4">
        <button
          v-for="f in FILTERS"
          :key="f.v"
          class="px-3 py-1.5 rounded-lg text-sm transition-colors"
          :class="statusFilter === f.v ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"
          @click="onFilter(f.v)">
          {{ f.l }}
        </button>
      </div>

      <p v-if="actionError" class="mb-3 rounded-lg border border-data-neg/30 bg-data-neg/5 px-3 py-2 text-sm text-data-neg">
        <i class="fas fa-circle-exclamation"></i> {{ actionError }}
      </p>

      <div v-if="store.loading" class="py-16 grid place-items-center text-ink-subtle">
        <i class="fas fa-circle-notch fa-spin text-2xl"></i>
      </div>

      <EmptyState
        v-else-if="!store.list.length"
        icon="fas fa-bullhorn"
        title="Nenhum comunicado"
        description="Crie o primeiro comunicado do mural.">
        <template #actions>
          <Button v-if="can('manage')" variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">Novo comunicado</Button>
        </template>
      </EmptyState>

      <div v-else class="space-y-2">
        <div
          v-for="c in store.list"
          :key="c.id"
          class="rounded-xl border border-line bg-surface-raised p-3 sm:p-4 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <Badge :variant="kindMeta(c.kind).badge" size="sm">
                <i :class="kindMeta(c.kind).icon"></i> {{ kindMeta(c.kind).label }}
              </Badge>
              <Badge :variant="STATUS_BADGE[c.status]?.variant || 'neutral'" size="sm">
                {{ STATUS_BADGE[c.status]?.label || c.status }}
              </Badge>
              <Badge v-if="c.pinned" variant="accent" size="sm"><i class="fas fa-thumbtack"></i> Fixado</Badge>
              <Badge v-if="c.requiresAck" variant="info" size="sm"><i class="fas fa-signature"></i> Exige ciência</Badge>
            </div>
            <h3 class="text-sm font-semibold text-ink truncate">{{ c.title }}</h3>
            <p class="text-xs text-ink-subtle mt-0.5">
              <span v-if="c.status === 'PUBLISHED'">
                {{ c.stats?.acked || 0 }}/{{ c.stats?.recipients || 0 }} cientes · publicado {{ formatDate(c.publishedAt) }}
              </span>
              <span v-else>Atualizado {{ formatDate(c.updatedAt) }}</span>
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <Button v-if="can('manage') && c.status !== 'PUBLISHED'" variant="ghost" size="sm" icon="fas fa-pen" title="Editar" @click="openEdit(c)" />
            <Button v-if="can('manage') && c.status === 'DRAFT'" variant="primary" size="sm" icon="fas fa-paper-plane" @click="publish(c)">Publicar</Button>
            <Button v-if="c.status === 'PUBLISHED'" variant="secondary" size="sm" icon="fas fa-chart-pie" @click="openAdherence(c)">Aderência</Button>
            <Button v-if="can('manage') && c.status === 'PUBLISHED'" variant="ghost" size="sm" icon="fas fa-box-archive" title="Arquivar" @click="archive(c)" />
            <Button v-if="can('manage') && c.status === 'ARCHIVED'" variant="ghost" size="sm" icon="fas fa-rotate-left" title="Reativar" @click="reactivate(c)" />
            <Button v-if="can('remove')" variant="ghost" size="sm" icon="fas fa-trash" title="Excluir" @click="remove(c)" />
          </div>
        </div>
      </div>

      <p v-if="store.error && !actionError" class="mt-4 text-sm text-data-neg">{{ store.error }}</p>
    </PageContainer>

    <ComunicadoEditModal v-model:open="editOpen" :comunicado="editing" @saved="onSaved" />
    <AdherencePanel v-model:open="adherenceOpen" :comunicado-id="adherenceId" />
  </div>

  <ConfirmDialog :open="!!aExcluir" tone="danger"
    :title="`Excluir o comunicado ${aExcluir?.title}?`"
    consequence="Ele some do Mural de todo mundo que o recebeu, junto com o registro de quem já tinha dado ciência."
    hint="Não tem desfazer. Para tirar de circulação guardando o histórico, despublique em vez de excluir."
    confirm-label="Excluir comunicado"
    @confirm="excluirConfirmado" @cancel="aExcluir = null" />
</template>
