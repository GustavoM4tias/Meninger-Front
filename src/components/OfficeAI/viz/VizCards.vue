<script setup>
/**
 * VizCards - UM card para tudo que é "lista de coisas com nome": imobiliária,
 * pessoa, relatório, checklist, campanha, reunião, correspondente.
 * Card: { title, subtitle?, badges?: [{label, variant}], fields?: [{label, value, type?}],
 *         avatar?: {name, url}, meta?, actions?: [{kind, label, payload}] }
 * Variação é por props, nunca por componente novo (princípio 3 do plano).
 */
import { ref, computed } from 'vue';
import Badge from '@/components/UI/Badge.vue';
import UserAvatar from '@/components/UI/UserAvatar.vue';
import { formatarValor } from './formatos.js';

const props = defineProps({
  cards: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
  /* Quantos aparecem antes do "ver todos". */
  limit: { type: Number, default: 6 },
});
const emit = defineEmits(['action']);

const todos = ref(false);
const visiveis = computed(() => (todos.value ? props.cards : props.cards.slice(0, props.limit)));
const ocultos = computed(() => props.cards.length - visiveis.value.length);
const aberto = ref(new Set());
function alternar(i) { const s = new Set(aberto.value); s.has(i) ? s.delete(i) : s.add(i); aberto.value = s; }
const camposPrincipais = (c) => (c.fields || []).slice(0, props.compact ? 3 : 4);
const camposExtra = (c) => (c.fields || []).slice(props.compact ? 3 : 4);
</script>

<template>
  <div class="p-3 grid gap-2" :class="compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'">
    <article v-for="(c, i) in visiveis" :key="c.key || i"
      class="rounded-xl border border-line bg-surface-sunken/60 p-3 min-w-0 stagger-in transition-colors duration-120 hover:border-accent/30"
      :style="{ '--i': i }">
      <div class="flex items-start gap-2.5 min-w-0">
        <UserAvatar v-if="c.avatar" :name="c.avatar.name || c.title" :src="c.avatar.url" size="sm" class="shrink-0" />
        <span v-else-if="c.icon" class="h-8 w-8 rounded-lg grid place-items-center bg-accent-soft text-accent text-xs shrink-0"><i :class="c.icon"></i></span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink truncate" :title="c.title">{{ c.title }}</p>
          <p v-if="c.subtitle" class="text-micro text-ink-muted truncate">{{ c.subtitle }}</p>
          <div v-if="c.badges?.length" class="flex flex-wrap gap-1 mt-1">
            <Badge v-for="(b, j) in c.badges" :key="j" :variant="b.variant || 'neutral'" size="sm">{{ b.label }}</Badge>
          </div>
        </div>
      </div>

      <dl v-if="c.fields?.length" class="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div v-for="(f, j) in camposPrincipais(c)" :key="j" class="min-w-0" :class="f.wide ? 'col-span-2' : ''">
          <dt class="text-micro uppercase tracking-wider text-ink-subtle font-mono truncate">{{ f.label }}</dt>
          <dd class="text-xs text-ink truncate" :title="String(f.value ?? '')">
            <a v-if="f.type === 'link' && f.value" :href="String(f.value)" target="_blank" rel="noopener" class="text-accent hover:underline">{{ f.text || f.value }}</a>
            <template v-else>{{ formatarValor(f.value, f.type) }}</template>
          </dd>
        </div>
        <template v-if="aberto.has(i)">
          <div v-for="(f, j) in camposExtra(c)" :key="`x${j}`" class="min-w-0" :class="f.wide ? 'col-span-2' : ''">
            <dt class="text-micro uppercase tracking-wider text-ink-subtle font-mono truncate">{{ f.label }}</dt>
            <dd class="text-xs text-ink truncate">{{ formatarValor(f.value, f.type) }}</dd>
          </div>
        </template>
      </dl>

      <div v-if="camposExtra(c).length || c.actions?.length || c.meta" class="mt-2.5 flex items-center gap-2 flex-wrap">
        <span v-if="c.meta" class="text-micro text-ink-subtle mr-auto truncate">{{ c.meta }}</span>
        <button v-if="camposExtra(c).length" type="button" @click="alternar(i)"
          class="text-micro text-ink-muted hover:text-ink transition-colors duration-120">
          {{ aberto.has(i) ? 'Menos' : `+${camposExtra(c).length} campos` }}
        </button>
        <button v-for="(a, j) in c.actions || []" :key="j" type="button" @click="emit('action', a, c)"
          class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium bg-accent-soft text-accent hover:brightness-105 transition-all duration-120 focus-ring">
          <i v-if="a.icon" :class="a.icon" class="text-micro"></i>{{ a.label }}
        </button>
      </div>
    </article>

    <button v-if="ocultos > 0" type="button" @click="todos = true"
      class="text-xs text-ink-muted hover:text-ink py-1 transition-colors duration-120" :class="compact ? '' : 'md:col-span-2'">
      Ver todos ({{ ocultos }} a mais)
    </button>
  </div>
</template>
