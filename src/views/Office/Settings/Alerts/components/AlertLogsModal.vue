<script setup>
import { onMounted } from 'vue';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import Modal from '@/components/UI/Modal.vue';
import Spinner from '@/components/UI/Spinner.vue';

const props = defineProps({ rule: { type: Object, required: true } });
const emit = defineEmits(['close']);

const store = useAlertStore();
onMounted(() => store.fetchLogs(props.rule.id));

const STATUS_CLS = {
  success:              'text-data-pos bg-data-pos/10 border-data-pos/20',
  partial:              'text-data-warn  bg-data-warn/10  border-data-warn/20',
  failed:               'text-data-neg    bg-data-neg/10    border-data-neg/20',
  suppressed_cooldown:  'text-ink-muted bg-surface-sunken border-line',
  suppressed_disabled:  'text-ink-muted bg-surface-sunken border-line',
};

const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
</script>

<template>
  <Modal :open="true" @close="emit('close')" :title="`Histórico — ${rule.name}`" size="lg">
    <div v-if="store.loadingLogs" class="py-12 grid place-items-center"><Spinner /></div>

    <div v-else-if="!store.logs.length" class="py-12 text-center text-sm text-ink-muted">
      Nenhum disparo registrado.
    </div>

    <div v-else class="space-y-2">
      <div v-for="log in store.logs" :key="log.id"
        class="rounded-lg border border-line bg-surface-raised px-3 py-2.5 text-sm">
        <div class="flex items-center justify-between gap-3">
          <span :class="['text-micro px-2 py-0.5 rounded border', STATUS_CLS[log.status] || '']">
            {{ log.status }}
          </span>
          <span class="text-xs text-ink-muted">{{ fmt(log.fired_at) }}</span>
        </div>
        <p v-if="log.tool_result_summary" class="text-xs text-ink mt-1.5 line-clamp-2">{{ log.tool_result_summary }}</p>
        <p v-if="log.error_message" class="text-xs text-data-neg mt-1">{{ log.error_message }}</p>
      </div>
    </div>
  </Modal>
</template>
