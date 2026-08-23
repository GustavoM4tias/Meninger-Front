<script setup>
import { ref, computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Fila from './Fila.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
  filas: { type: [Array, Object], default: () => [] },
});

const open = ref(false);
const escopo = ref('ativas');   // ativas | todas — padrão mostra só as ativas
const busca = ref('');

const escopoOptions = [
  { value: 'ativas', label: 'Ativas' },
  { value: 'todas',  label: 'Todas' },
];

const todas = computed(() =>
  Array.isArray(props.filas) ? props.filas : Object.values(props.filas || {})
);

// O CV não expõe um campo único de "ativa" — aceitamos as variações mais comuns
// e, na falta de todas, caímos na regra prática: fila com corretor é fila em uso.
// Se o CV passar a mandar um campo próprio, basta incluí-lo aqui.
function isAtiva(f) {
  const flag = f?.ativo ?? f?.ativa ?? f?.status ?? null;
  if (typeof flag === 'boolean') return flag;
  if (typeof flag === 'number') return flag === 1;
  if (typeof flag === 'string') {
    const v = flag.trim().toLowerCase();
    if (['s', 'sim', '1', 'true', 'ativo', 'ativa'].includes(v)) return true;
    if (['n', 'nao', 'não', '0', 'false', 'inativo', 'inativa'].includes(v)) return false;
  }
  return (f?.corretores_e_imobiliarias?.length || 0) > 0;
}

const ativasCount = computed(() => todas.value.filter(isAtiva).length);

const filtradas = computed(() => {
  let list = escopo.value === 'ativas' ? todas.value.filter(isAtiva) : todas.value;
  const q = busca.value.trim().toLowerCase();
  if (q) list = list.filter(f => String(f?.nome || '').toLowerCase().includes(q));
  return list;
});
</script>

<template>
  <!-- Botão integrado (usado na PageHeader actions) -->
  <Button variant="secondary" size="sm" icon="fas fa-people-group" @click="open = true">
    <span class="hidden sm:inline">Filas</span>
    <span v-if="ativasCount"
      class="font-mono text-micro px-1.5 py-0.5 rounded-md bg-accent-soft text-accent">
      {{ ativasCount }}
    </span>
  </Button>

  <Modal :open="open" position="right" size="md" @close="open = false">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-people-group text-sm"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-ink">Filas de distribuição</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono">{{ ativasCount }}</span> ativa(s) de
            <span class="font-mono">{{ todas.length }}</span>
          </p>
        </div>
      </div>
    </template>

    <!-- Filtro simples: escopo + busca por nome -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <SegmentedControl v-model="escopo" :options="escopoOptions" size="sm" />
      <div class="relative flex-1 min-w-[10rem]">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
        <input v-model="busca" type="text" placeholder="Buscar fila..."
          class="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-surface-sunken border border-line text-ink
                 placeholder:text-ink-subtle outline-none
                 focus:border-accent focus:ring-2 focus:ring-accent-ring/20 transition-colors" />
      </div>
    </div>

    <div v-if="filtradas.length" class="space-y-2">
      <Fila v-for="fila in filtradas" :key="fila.idfila_distribuicao_leads" :fila="fila" />
    </div>

    <div v-else class="text-center py-12 text-ink-subtle">
      <i class="fas fa-inbox text-2xl mb-2 block"></i>
      <p class="text-sm">
        {{ todas.length ? 'Nenhuma fila para este filtro' : 'Nenhuma fila configurada' }}
      </p>
      <button v-if="todas.length && escopo === 'ativas'" type="button"
        @click="escopo = 'todas'" class="mt-2 text-xs text-accent hover:underline">
        Ver todas as filas
      </button>
    </div>
  </Modal>
</template>
