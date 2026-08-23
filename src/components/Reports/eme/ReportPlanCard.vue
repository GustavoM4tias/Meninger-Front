<script setup>
// Plano de frentes da Eme: o pedido quebrado em partes, cada uma resolvida na
// sua vez. É o que torna a geração acompanhável - antes o usuário só via um
// "pensando..." longo e descobria no fim se tinha saído completo.
import { computed, ref } from 'vue'

const props = defineProps({
  plan: { type: Object, default: null },
})

const aberto = ref(true)

const fronts = computed(() => props.plan?.fronts || [])
const concluidas = computed(() => fronts.value.filter((f) => f.status === 'done').length)
const bloqueadas = computed(() => fronts.value.filter((f) => f.status === 'blocked').length)

const ICONE = {
  done: { cls: 'fas fa-circle-check text-data-pos', title: 'Concluída' },
  doing: { cls: 'fas fa-circle-notch fa-spin text-accent', title: 'Em andamento' },
  blocked: { cls: 'fas fa-circle-exclamation text-data-warn', title: 'Travada' },
  todo: { cls: 'far fa-circle text-ink-subtle', title: 'Na fila' },
}
const icone = (f) => ICONE[f.status] || ICONE.todo
</script>

<template>
  <section v-if="fronts.length" class="mx-3 mt-3 rounded-xl border border-line bg-surface overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-sunken transition"
      :aria-expanded="aberto"
      @click="aberto = !aberto"
    >
      <i class="fas fa-list-check text-micro text-accent" />
      <span class="text-micro font-semibold uppercase tracking-wider text-ink-muted">Plano</span>
      <span class="text-micro text-ink-subtle tabular-nums">{{ concluidas }}/{{ fronts.length }}</span>
      <span
        v-if="bloqueadas"
        class="text-micro text-data-warn"
      >{{ bloqueadas }} travada{{ bloqueadas > 1 ? 's' : '' }}</span>
      <i
        class="ml-auto fas fa-chevron-down text-micro text-ink-subtle transition-transform duration-200"
        :class="{ 'rotate-180': aberto }"
      />
    </button>

    <ul v-show="aberto" class="px-3 pb-2.5 space-y-1.5 border-t border-line pt-2">
      <li v-for="f in fronts" :key="f.id" class="flex items-start gap-2 text-xs">
        <i :class="icone(f).cls" class="mt-0.5 w-3.5 text-center flex-shrink-0 text-micro" :title="icone(f).title" />
        <div class="min-w-0">
          <p class="leading-snug" :class="f.status === 'done' ? 'text-ink-subtle line-through' : 'text-ink'">
            {{ f.title }}
          </p>
          <p v-if="f.note" class="text-micro text-ink-subtle leading-snug">{{ f.note }}</p>
          <p v-else-if="f.needs && f.status !== 'done'" class="text-micro text-ink-subtle leading-snug">
            Precisa: {{ f.needs }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
