<script setup>
import { ref } from 'vue';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({ id: { type: Number, required: true } });
const store = useProjectionsStore();
const open = ref(false);
const showTech = ref(false);

async function load() {
  if (!open.value) {
    open.value = true;
    await store.fetchLogs(props.id);
  } else {
    open.value = false;
  }
}

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleString('pt-BR');
};
</script>

<template>
  <div>
    <div class="flex items-center gap-2">
      <Button variant="secondary" size="sm" :icon="open ? 'fas fa-eye-slash' : 'fas fa-clock-rotate-left'"
        @click="load">
        {{ !open ? 'Ver histórico' : 'Ocultar histórico' }}
      </Button>
      <Button v-if="open" variant="ghost" size="sm" :icon="showTech ? 'fas fa-eye-slash' : 'fas fa-code'"
        @click="showTech = !showTech">
        {{ showTech ? 'Ocultar técnico' : 'Detalhes técnicos' }}
      </Button>
    </div>

    <div v-if="open"
      class="mt-3 rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-sunken/40">
        <h3 class="font-semibold text-sm text-ink flex items-center gap-2">
          <i class="fas fa-clock-rotate-left text-xs text-accent"></i>
          Linha do tempo
        </h3>
        <span class="text-xs text-ink-subtle font-mono">
          {{ store.logs?.length || 0 }} alteraç{{ store.logs?.length === 1 ? 'ão' : 'ões' }}
        </span>
      </div>

      <ul v-if="store.logs?.length" class="p-3 space-y-2.5 max-h-96 overflow-auto">
        <li v-for="l in store.logs" :key="l.id"
          class="rounded-lg border border-line bg-surface-sunken p-3">
          <div class="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <Badge variant="accent" size="sm">{{ l.action }}</Badge>
              <span class="text-xs text-ink-muted truncate">
                por <strong class="text-ink">{{ l.actor?.username || ('Usuário #' + (l.user_id ?? '—')) }}</strong>
              </span>
            </div>
            <span class="text-[11px] text-ink-subtle font-mono">{{ formatDate(l.created_at || l.createdAt) }}</span>
          </div>

          <p v-if="l.note" class="text-sm text-ink leading-relaxed">{{ l.note }}</p>

          <details v-if="showTech" class="mt-2">
            <summary class="text-[11px] text-ink-subtle font-mono cursor-pointer hover:text-ink-muted transition-colors">
              <i class="fas fa-code text-[9px] mr-1"></i>Payload bruto
            </summary>
            <pre class="text-[10px] bg-surface-raised border border-line p-2 rounded mt-1.5 overflow-auto text-ink-muted font-mono leading-relaxed">{{ { before: l.payload_before, after: l.payload_after } }}</pre>
          </details>
        </li>
      </ul>

      <div v-else class="p-8 text-center text-ink-subtle">
        <i class="fas fa-folder-open text-2xl mb-2 opacity-50"></i>
        <p class="text-xs">Nenhum log registrado.</p>
      </div>
    </div>
  </div>
</template>
