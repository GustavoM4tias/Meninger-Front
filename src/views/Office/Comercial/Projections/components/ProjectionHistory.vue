<script setup>
/**
 * ProjectionHistory — linha do tempo LIMPA de uma projeção.
 * Abre num drawer à direita, mostra só ações relevantes (o backend não grava
 * mais VIEW_DETAIL) com rótulo amigável, autor e a descrição do que mudou.
 */
import { ref } from 'vue';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Spinner from '@/components/UI/Spinner.vue';
import { formatDateTime } from '../projectionUtils';

const props = defineProps({ id: { type: Number, required: true } });

const store = useProjectionsStore();
const open = ref(false);
const loading = ref(false);

const META = {
  CREATED:          { label: 'Criada',        icon: 'fas fa-plus',            tone: 'accent' },
  CLONED:           { label: 'Clonada',       icon: 'fas fa-copy',            tone: 'accent' },
  SAVED:            { label: 'Salva',         icon: 'fas fa-floppy-disk',     tone: 'emerald' },
  UPSERT_LINES:     { label: 'Metas salvas',  icon: 'fas fa-floppy-disk',     tone: 'emerald' },
  UPSERT_DEFAULTS:  { label: 'Ajustes salvos',icon: 'fas fa-sliders',         tone: 'emerald' },
  LOCKED:           { label: 'Bloqueada',     icon: 'fas fa-lock',            tone: 'amber' },
  UNLOCKED:         { label: 'Desbloqueada',  icon: 'fas fa-lock-open',       tone: 'sky' },
  ACTIVATED:        { label: 'Ativada',       icon: 'fas fa-circle-check',    tone: 'emerald' },
  DEACTIVATED:      { label: 'Desativada',    icon: 'fas fa-circle-dot',      tone: 'slate' },
  UPDATED_META:     { label: 'Editada',       icon: 'fas fa-pen',             tone: 'sky' },
};
const meta = (a) => META[a] || { label: a, icon: 'fas fa-clock-rotate-left', tone: 'slate' };

const toneClass = {
  accent:  'bg-accent-soft text-accent border-accent/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  sky:     'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  slate:   'bg-surface-sunken text-ink-muted border-line',
};

async function show() {
  open.value = true;
  loading.value = true;
  try { await store.fetchLogs(props.id); } finally { loading.value = false; }
}
</script>

<template>
  <div class="inline-flex">
    <Button variant="secondary" size="sm" icon="fas fa-clock-rotate-left" @click="show">
      Histórico
    </Button>

    <Modal :open="open" size="lg" position="right" title="Histórico da projeção" @close="open = false">
      <template #header>
        <div class="flex items-center gap-3 min-w-0">
          <span class="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0">
            <i class="fas fa-clock-rotate-left"></i>
          </span>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-ink truncate">Histórico da projeção</h2>
            <p class="text-xs text-ink-muted">
              {{ store.logs?.length || 0 }} alteraç{{ store.logs?.length === 1 ? 'ão' : 'ões' }} registradas
            </p>
          </div>
        </div>
      </template>

      <div v-if="loading" class="py-16 grid place-items-center">
        <Spinner />
      </div>

      <EmptyState v-else-if="!store.logs?.length"
        icon="fas fa-clock-rotate-left"
        title="Sem alterações ainda"
        description="Quando alguém salvar, ativar ou bloquear esta projeção, o registro aparece aqui." />

      <ol v-else class="relative border-l border-line ml-3 space-y-4 py-1">
        <li v-for="l in store.logs" :key="l.id" class="ml-5 relative">
          <span
            class="absolute -left-[27px] top-0.5 grid place-items-center h-6 w-6 rounded-full border text-[10px]"
            :class="toneClass[meta(l.action).tone]">
            <i :class="meta(l.action).icon"></i>
          </span>

          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-sm font-semibold text-ink">{{ meta(l.action).label }}</span>
            <span class="text-[11px] text-ink-subtle font-mono">{{ formatDateTime(l.created_at || l.createdAt) }}</span>
          </div>

          <p v-if="l.note" class="text-sm text-ink-muted leading-relaxed mt-0.5">{{ l.note }}</p>

          <p class="text-[11px] text-ink-subtle mt-1">
            <i class="far fa-user text-[10px] mr-1"></i>
            {{ l.actor?.username || l.actor?.email || ('Usuário #' + (l.user_id ?? '—')) }}
          </p>
        </li>
      </ol>

      <template #footer>
        <Button variant="ghost" size="sm" icon="fas fa-rotate" :loading="loading" @click="show">Atualizar</Button>
        <Button size="sm" @click="open = false">Fechar</Button>
      </template>
    </Modal>
  </div>
</template>
