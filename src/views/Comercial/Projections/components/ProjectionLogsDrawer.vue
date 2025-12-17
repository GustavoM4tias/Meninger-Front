<script setup>
import { ref } from 'vue';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';

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

function priceBRL(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button @click="load"
      class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
      {{ !open ? 'Ver Histórico' : 'Ocultar Histórico' }}
    </button>
    <button v-if="open" @click="showTech = !showTech"
      class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70 text-xs">
      {{ showTech ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos' }}
    </button>
  </div>

  <div v-if="open" class="mt-3 p-4 rounded-2xl border dark:border-gray-700 bg-white/75 dark:bg-gray-900/50 shadow-sm">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold">Linha do tempo</h3>
      <span class="text-xs text-gray-500">{{ store.logs?.length || 0 }} alterações</span>
    </div>

    <ul class="space-y-3 max-h-96 overflow-auto">
      <li v-for="l in store.logs" :key="l.id"
        class="border dark:border-gray-700 rounded-xl p-3 bg-white/80 dark:bg-gray-800">
        <div class="flex items-center justify-between mb-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 border dark:border-gray-700">
              {{ l.action }}
            </span>
            <span class="text-xs text-gray-600 dark:text-gray-300">
              por <strong>{{ l.actor?.username || ('Usuário #' + (l.user_id ?? '—')) }}</strong>
            </span>
          </div>
          <span class="text-xs text-gray-500">
            {{ new Date(l.created_at || l.createdAt).toLocaleString('pt-BR') }}
          </span>
        </div>

        <p v-if="l.note" class="text-sm text-gray-800 dark:text-gray-200 mb-2">
          {{ l.note }}
        </p>

        <div v-if="showTech" class="mt-2">
          <details>
            <summary class="text-xs text-gray-600 dark:text-gray-300 cursor-pointer hover:underline">
              Payload bruto
            </summary>
            <pre class="text-[11px] bg-black/5 dark:bg-white/5 p-2 rounded mt-1 overflow-auto">
{{ { before: l.payload_before, after: l.payload_after } }}
            </pre>
          </details>
        </div>
      </li>
    </ul>
  </div>
</template>
