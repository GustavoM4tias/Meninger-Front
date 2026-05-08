<script setup>
import { onMounted, ref, watch } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const store = useWhatsappStore();

const filters = ref({ status: '', direction: 'out', q: '' });
const limit = 50;
const offset = ref(0);

const directionTabs = [
  { value: 'out', label: 'Enviadas' },
  { value: 'in',  label: 'Recebidas' },
];

const statusOptions = ['', 'queued', 'sent', 'delivered', 'read', 'failed', 'dry_run', 'received'];

async function load() {
  await store.fetchMessages({
    status: filters.value.status || undefined,
    direction: filters.value.direction || undefined,
    q: filters.value.q || undefined,
    limit, offset: offset.value,
  });
}

onMounted(load);
watch(() => filters.value.direction, () => { offset.value = 0; load(); });

const STATUS_CLS = {
  queued:    'text-ink-muted bg-surface-sunken border-line',
  sent:      'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  delivered: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  read:      'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed:    'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  dry_run:   'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  received:  'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
};

const formatDt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <SegmentedControl v-model="filters.direction" :options="directionTabs" size="sm" />

      <div class="flex-1">
        <Input v-model="filters.q" placeholder="Buscar por telefone, wamid, template..."
          iconLeft="fas fa-magnifying-glass" size="sm"
          @keydown.enter="(offset = 0, load())" />
      </div>

      <select v-model="filters.status"
        class="h-8 px-3 rounded-md border border-line bg-surface-raised text-xs text-ink min-w-[140px]">
        <option v-for="s in statusOptions" :key="s" :value="s">{{ s ? s : 'Todos os status' }}</option>
      </select>

      <Button icon="fas fa-rotate" size="sm" variant="secondary"
        :loading="store.loadingMessages"
        @click="(offset = 0, load())">Aplicar</Button>
    </div>

    <div v-if="store.loadingMessages && !store.messages.length" class="py-12 grid place-items-center"><Spinner /></div>

    <div v-else-if="!store.messages.length"
      class="py-12 text-center text-sm text-ink-muted rounded-xl border border-dashed border-line bg-surface-raised">
      Nenhuma mensagem encontrada.
    </div>

    <div v-else class="rounded-xl border border-line bg-surface-raised overflow-hidden">
      <div class="hidden sm:grid grid-cols-[140px_1fr_180px_140px_180px] px-4 py-2 border-b border-line
                  text-[11px] font-mono uppercase tracking-wider text-ink-subtle bg-surface-sunken/40">
        <span>Status</span><span>Conteúdo</span><span>Para / De</span><span>Categoria</span><span>Quando</span>
      </div>

      <div class="divide-y divide-line">
        <div v-for="m in store.messages" :key="m.id"
          class="grid grid-cols-1 sm:grid-cols-[140px_1fr_180px_140px_180px] gap-2 px-4 py-3 items-start text-sm">
          <span :class="['inline-flex w-fit items-center px-2 py-0.5 rounded-md border text-xs',
            STATUS_CLS[m.status] || STATUS_CLS.queued]">{{ m.status }}</span>

          <div class="min-w-0">
            <p class="text-ink font-medium truncate">{{ m.template_name || (m.type + ' • ' + (m.body || '—')) }}</p>
            <p v-if="m.error_message" class="text-xs text-red-600 dark:text-red-400 truncate">
              {{ m.error_code }} — {{ m.error_message }}
            </p>
            <p v-else-if="m.body && m.template_name" class="text-xs text-ink-muted line-clamp-1">{{ m.body }}</p>
          </div>

          <div class="text-xs">
            <p class="text-ink truncate">{{ m.direction === 'in' ? m.from_phone : m.to_phone }}</p>
            <p v-if="m.user?.username" class="text-ink-subtle truncate">{{ m.user.username }}</p>
          </div>

          <div class="text-xs text-ink-muted">{{ m.cost_category || '—' }}</div>
          <div class="text-xs text-ink-muted">{{ formatDt(m.sent_at || m.created_at) }}</div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between text-xs text-ink-subtle">
      <span>Mostrando {{ store.messages.length }} de {{ store.messagesTotal }}</span>
      <div class="flex gap-2">
        <Button size="sm" variant="secondary"
          :disabled="offset === 0"
          @click="(offset = Math.max(0, offset - limit), load())">Anterior</Button>
        <Button size="sm" variant="secondary"
          :disabled="offset + limit >= store.messagesTotal"
          @click="(offset = offset + limit, load())">Próxima</Button>
      </div>
    </div>
  </div>
</template>
