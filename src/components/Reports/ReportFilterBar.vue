<script setup>
// Barra de filtros dos relatórios interativos, no MESMO padrão das telas do
// Office (Leads, Pré-cadastros, Reservas): toolbar com contador de filtros
// ativos, abrir/fechar e "Limpar". Antes era um painel sempre aberto, fora do
// padrão, e o campo de período nascia em branco.
//
// Mobile-first: campos empilham em 1 coluna, alvos >= 40px.
import { computed, ref } from 'vue'
import { fieldBase } from '@/components/UI/_classes.js'
import Badge from '@/components/UI/Badge.vue'
import Button from '@/components/UI/Button.vue'

const props = defineProps({
  filters: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({}) },
  // Opções dinâmicas calculadas pelo servidor (options_from)
  options: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  refreshedAt: { type: String, default: null },
  hasActive: { type: Boolean, default: false },
  // Abre expandido (usado no builder, onde o admin está testando os filtros)
  defaultOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'clear'])

const fieldCls = `${fieldBase} rounded-lg px-3 text-sm h-10 w-full`
const aberto = ref(props.defaultOpen)

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

const dataBR = (iso) => {
  if (!iso) return ''
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('pt-BR')
}

// Resumo do que está aplicado. Fica VISÍVEL mesmo com a barra fechada: num
// relatório o leitor precisa saber sobre que recorte são os números.
const resumo = computed(() =>
  props.filters
    .map((f) => {
      const v = props.modelValue[f.key]
      if (v == null || v === '') return null
      if (f.type === 'date-range') {
        if (!v.from && !v.to) return null
        const texto = v.from && v.to
          ? `${dataBR(v.from)} a ${dataBR(v.to)}`
          : v.from ? `a partir de ${dataBR(v.from)}` : `até ${dataBR(v.to)}`
        return { key: f.key, label: f.label, value: texto }
      }
      return { key: f.key, label: f.label, value: String(v) }
    })
    .filter(Boolean)
)

const refreshedLabel = computed(() => {
  if (!props.refreshedAt) return ''
  const d = new Date(props.refreshedAt)
  if (Number.isNaN(d.getTime())) return ''
  return `dados de ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
})
</script>

<template>
  <section
    v-if="filters.length"
    class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient"
  >
    <!-- Toolbar (sempre visível) -->
    <div class="filters-toolbar flex-wrap gap-y-1.5" style="height: auto; min-height: 3.25rem;">
      <button type="button" class="filters-toolbar-trigger" :aria-expanded="aberto" @click="aberto = !aberto">
        <i class="fas fa-filter text-xs text-ink-muted" />
        <span>Filtros</span>
        <Badge v-if="resumo.length" variant="accent" size="sm">
          {{ resumo.length }} ativo{{ resumo.length > 1 ? 's' : '' }}
        </Badge>
        <i
          class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': aberto }"
        />
      </button>

      <span v-if="loading" class="text-[11px] text-ink-subtle flex items-center gap-1.5">
        <i class="fas fa-circle-notch fa-spin text-accent" />atualizando
      </span>
      <span v-else-if="refreshedLabel" class="text-[11px] text-ink-subtle hidden sm:inline">{{ refreshedLabel }}</span>

      <div class="ml-auto flex items-center gap-1.5">
        <Button v-if="hasActive" variant="ghost" size="sm" icon="fas fa-eraser" @click="emit('clear')">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
      </div>
    </div>

    <!-- Resumo do recorte aplicado: visível também com a barra fechada -->
    <div v-if="resumo.length && !aberto" class="px-3 sm:px-4 py-2 flex flex-wrap gap-1.5 border-t border-line">
      <span
        v-for="r in resumo" :key="r.key"
        class="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] text-ink-muted max-w-full"
      >
        <span class="text-ink-subtle flex-shrink-0">{{ r.label }}:</span>
        <span class="text-ink truncate">{{ r.value }}</span>
      </span>
    </div>

    <!-- Campos -->
    <div
      v-show="aberto"
      class="p-3 sm:p-4 border-t border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
    >
      <div v-for="f in filters" :key="f.key" :class="f.type === 'date-range' ? 'sm:col-span-2' : ''">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">{{ f.label }}</label>

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

        <!-- período: de / até (nasce preenchido com o período do relatório) -->
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
  </section>
</template>
