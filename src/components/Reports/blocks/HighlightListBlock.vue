<script setup>
import { tone } from '../format.js'

defineProps({
  // groups: [{ title, tone ('success'|'warning'|'danger'|...), items: [string | { title, text }] }]
  groups: { type: Array, default: () => [] },
})

const itemTitle = (it) => (typeof it === 'string' ? null : it.title)
const itemText = (it) => (typeof it === 'string' ? it : it.text)
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div
      v-for="(g, gi) in groups" :key="gi"
      class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4"
    >
      <p class="flex items-center gap-2 text-sm font-semibold" :class="tone(g.tone).text">
        <span class="w-2 h-2 rounded-full" :class="tone(g.tone).dot" />
        {{ g.title }}
      </p>
      <ul class="mt-3 space-y-2.5">
        <li v-for="(it, ii) in g.items" :key="ii" class="flex gap-2.5 text-sm">
          <span class="mt-[7px] w-1 h-1 rounded-full bg-ink-subtle flex-shrink-0" />
          <div class="min-w-0">
            <p v-if="itemTitle(it)" class="font-medium text-ink">{{ itemTitle(it) }}</p>
            <p class="text-ink-muted">{{ itemText(it) }}</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
