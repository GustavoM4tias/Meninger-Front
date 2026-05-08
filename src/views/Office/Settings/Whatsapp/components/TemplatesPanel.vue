<script setup>
import { onMounted, ref, computed } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import TemplateCreateModal from './TemplateCreateModal.vue';

const showCreate = ref(false);
const onCreated = () => store.fetchTemplates();

const onDelete = async (t) => {
  if (!confirm(`Excluir o template "${t.name}"? Isso remove na Meta também.`)) return;
  try {
    await store.deleteTemplate(t.name);
  } catch (e) {
    alert('Falha ao excluir: ' + (e?.message || ''));
  }
};

const store = useWhatsappStore();

onMounted(() => store.fetchTemplates());

const grouped = computed(() => {
  const map = new Map();
  for (const t of store.templates) {
    if (!map.has(t.status)) map.set(t.status, []);
    map.get(t.status).push(t);
  }
  // ordem: APPROVED > PENDING > REJECTED > DISABLED > PAUSED
  const order = ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'];
  return order.filter(s => map.has(s)).map(s => ({ status: s, items: map.get(s) }));
});

const STATUS_CLS = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  PENDING:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  DISABLED: 'bg-surface-sunken text-ink-muted border-line',
  PAUSED:   'bg-surface-sunken text-ink-muted border-line',
};

const onSync = async () => {
  const r = await store.syncTemplates().catch(() => null);
  if (r) console.log('[whatsapp templates sync]', r);
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-xs text-ink-muted flex-1 min-w-[200px]">
        Apenas templates <strong>APPROVED</strong> são usados em envios. Após criar, a Meta leva alguns minutos a 24h pra aprovar.
      </p>
      <div class="flex gap-2">
        <Button :loading="store.syncing" icon="fas fa-rotate" size="sm" variant="secondary" @click="onSync">
          Sincronizar
        </Button>
        <Button icon="fas fa-plus" size="sm" @click="showCreate = true">
          Novo template
        </Button>
      </div>
    </div>

    <TemplateCreateModal v-model:open="showCreate" @created="onCreated" />

    <div v-if="store.loadingTemplates" class="py-12 grid place-items-center"><Spinner /></div>

    <div v-else-if="!store.templates.length"
      class="py-12 text-center text-sm text-ink-muted rounded-xl border border-dashed border-line bg-surface-raised">
      Nenhum template encontrado. Cadastre os templates no Meta Business e clique em "Sincronizar com Meta".
    </div>

    <section v-else v-for="block in grouped" :key="block.status" class="space-y-2">
      <h3 class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
        {{ block.status }} · {{ block.items.length }}
      </h3>
      <div class="rounded-xl border border-line bg-surface-raised divide-y divide-line overflow-hidden">
        <div v-for="t in block.items" :key="t.id"
          class="group grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center text-sm">
          <div class="min-w-0">
            <p class="font-medium text-ink truncate">{{ t.name }}</p>
            <p v-if="t.body_text" class="text-xs text-ink-muted line-clamp-1">{{ t.body_text }}</p>
          </div>
          <div class="text-xs text-ink-muted">{{ t.language }}</div>
          <div class="text-xs"><span class="px-2 py-0.5 rounded-md border bg-surface-sunken">{{ t.category }}</span></div>
          <div class="text-xs flex items-center gap-2">
            <span :class="['inline-flex items-center px-2 py-0.5 rounded-md border', STATUS_CLS[t.status] || '']">
              {{ t.status }}
            </span>
            <span class="text-ink-subtle">{{ t.variables_count }} var{{ t.variables_count === 1 ? '' : 's' }}</span>
          </div>
          <button type="button" @click="onDelete(t)"
            class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle opacity-0
                   group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
            title="Excluir template">
            <i class="fas fa-trash text-[11px]"></i>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
