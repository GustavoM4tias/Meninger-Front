<script setup>
// Barra de filtros dos relatórios interativos. Renderiza o que o spec declara
// em `filters` (select / text / date-range) e devolve os valores escolhidos.
// Mobile-first: campos empilham em 1 coluna no celular, alvos >= 40px.
import { computed } from 'vue'
import { fieldBase } from '@/components/UI/_classes.js'

const props = defineProps({
  filters: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({}) },
  // Opções dinâmicas calculadas pelo servidor (options_from)
  options: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  refreshedAt: { type: String, default: null },
  hasActive: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'clear'])

const fieldCls = `${fieldBase} rounded-lg px-3 text-sm h-10`

function setValue(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function setRange(key, part, value) {
  const current = props.modelValue[key] && typeof props.modelValue[key] === 'object'
    ? { ...props.modelValue[key] } : {}
  current[part] = value || undefined
  emit('update:modelValue', { ...props.modelValue, [key]: current })
}

function optionsFor(filter) {
  if (Array.isArray(props.options[filter.key]) && props.options[filter.key].length) {
    return props.options[filter.key]
  }
  return filter.options || []
}

const refreshedLabel = computed(() => {
  if (!props.refreshedAt) return ''
  const d = new Date(props.refreshedAt)
  if (Number.isNaN(d.getTime())) return ''
  return `dados de ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
})
</script>

<template>
  <div
    v-if="filters.length"
    class="rounded-xl border border-line bg-surface-raised p-3 sm:p-4"
  >
    <div class="flex items-center gap-2 mb-2.5">
      <i class="fas fa-filter text-[11px] text-accent" />
      <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Filtrar este relatório</span>
      <i v-if="loading" class="fas fa-circle-notch fa-spin text-[11px] text-ink-subtle" aria-label="Atualizando dados" />
      <span v-else-if="refreshedLabel" class="text-[10px] text-ink-subtle">{{ refreshedLabel }}</span>
      <button
        v-if="hasActive"
        type="button"
        class="ml-auto text-[11px] text-accent hover:underline min-h-[40px] px-2 -mr-2"
        @click="emit('clear')"
      >
        Limpar filtros
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      <div v-for="f in filters" :key="f.key" :class="f.type === 'date-range' ? 'sm:col-span-2' : ''">
        <label class="block text-[11px] font-medium text-ink-muted mb-1">{{ f.label }}</label>

        <!-- select: "Todos" limpa o filtro -->
        <div v-if="f.type === 'select'" class="relative">
          <select
            :class="fieldCls"
            class="pr-9 appearance-none cursor-pointer"
            :value="modelValue[f.key] || ''"
            @change="setValue(f.key, $event.target.value)"
          >
            <option value="">{{ f.placeholder || 'Todos' }}</option>
            <option v-for="opt in optionsFor(f)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <i class="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-subtle pointer-events-none" />
        </div>

        <!-- período: de / até -->
        <div v-else-if="f.type === 'date-range'" class="flex items-center gap-2">
          <input
            type="date" :class="fieldCls" aria-label="Data inicial"
            :value="modelValue[f.key]?.from || ''"
            @change="setRange(f.key, 'from', $event.target.value)"
          />
          <span class="text-xs text-ink-subtle flex-shrink-0">até</span>
          <input
            type="date" :class="fieldCls" aria-label="Data final"
            :value="modelValue[f.key]?.to || ''"
            @change="setRange(f.key, 'to', $event.target.value)"
          />
        </div>

        <!-- texto livre (nome do cliente, corretor...) -->
        <input
          v-else
          type="text" :class="fieldCls"
          :placeholder="f.placeholder || 'Digite para filtrar'"
          :value="modelValue[f.key] || ''"
          @input="setValue(f.key, $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>
