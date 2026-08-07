<script setup>
// Escolha do que entra na planilha. O relatório costuma ter uma consulta por
// etapa do funil (leads, pré-cadastros, reservas, repasses) e nem sempre o
// leitor quer todas — exportar tudo virava um arquivo com abas que ele ia
// descartar.
//
// A exportação continua saindo do servidor, com os filtros aplicados e as
// alçadas de quem exporta: aqui só se escolhe QUAIS consultas entram.
import { computed, ref, watch } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // Uma entrada por FONTE de dados: [{ id, label, hint }]
  datasets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // Resumo do recorte aplicado, para o leitor saber o que vai baixar
  resumoFiltros: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])

const selecionados = ref([])

// Reabrir o modal volta com tudo marcado: é o padrão que o botão tinha antes.
watch(() => props.open, (aberto) => {
  if (aberto) selecionados.value = props.datasets.map((d) => d.id)
})

const todos = computed(() => selecionados.value.length === props.datasets.length)
const nenhum = computed(() => selecionados.value.length === 0)

function alternar(id) {
  selecionados.value = selecionados.value.includes(id)
    ? selecionados.value.filter((x) => x !== id)
    : [...selecionados.value, id]
}

function alternarTodos() {
  selecionados.value = todos.value ? [] : props.datasets.map((d) => d.id)
}

function confirmar() {
  if (nenhum.value || props.loading) return
  emit('confirm', [...selecionados.value])
}
</script>

<template>
  <Modal :open="open" size="md" title="Exportar dados" @close="emit('close')">
    <template #header>
      <h2 class="text-base font-semibold text-ink">Exportar dados</h2>
      <p class="text-xs text-ink-muted mt-0.5">
        Uma aba por consulta escolhida, com os filtros aplicados no relatório.
      </p>
    </template>

    <p v-if="resumoFiltros" class="mb-3 text-xs text-ink-muted flex items-start gap-1.5">
      <i class="fas fa-filter text-[10px] mt-0.5 text-ink-subtle" />
      <span>{{ resumoFiltros }}</span>
    </p>

    <div class="flex items-center justify-between mb-2">
      <span class="text-[11px] uppercase tracking-wider text-ink-subtle">Dados disponíveis</span>
      <button
        type="button"
        class="text-xs font-medium text-accent hover:underline min-h-10 px-1"
        @click="alternarTodos"
      >
        {{ todos ? 'Desmarcar todos' : 'Marcar todos' }}
      </button>
    </div>

    <ul class="space-y-1.5">
      <li v-for="d in datasets" :key="d.id">
        <label
          class="flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors min-h-[3rem]"
          :class="selecionados.includes(d.id)
            ? 'border-accent/60 bg-accent-soft/40'
            : 'border-line bg-surface-raised hover:bg-surface-sunken/50'"
        >
          <input
            type="checkbox"
            class="w-4 h-4 accent-current text-accent flex-shrink-0"
            :checked="selecionados.includes(d.id)"
            @change="alternar(d.id)"
          />
          <span class="min-w-0">
            <span class="block text-sm text-ink leading-tight truncate">{{ d.label }}</span>
            <span v-if="d.hint" class="block text-[11px] text-ink-subtle leading-tight truncate">{{ d.hint }}</span>
          </span>
        </label>
      </li>
    </ul>

    <p v-if="nenhum" class="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
      Escolha ao menos uma consulta para exportar.
    </p>

    <template #footer>
      <Button variant="ghost" :disabled="loading" @click="emit('close')">Cancelar</Button>
      <Button
        variant="primary" icon="fas fa-file-excel"
        :disabled="nenhum" :loading="loading"
        @click="confirmar"
      >
        Exportar {{ selecionados.length }} {{ selecionados.length === 1 ? 'aba' : 'abas' }}
      </Button>
    </template>
  </Modal>
</template>
