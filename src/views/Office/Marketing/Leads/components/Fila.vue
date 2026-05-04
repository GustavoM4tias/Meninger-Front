<script setup>
import { ref } from 'vue';

defineProps({
  fila: { type: Object, required: true },
});

const open = ref(false);
</script>

<template>
  <div class="rounded-lg border border-line bg-surface-raised overflow-hidden surface-gradient">
    <!-- Header (sempre visível) -->
    <button type="button" @click="open = !open"
      class="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-sunken/40 transition-colors"
      :aria-expanded="open">
      <!-- Status dot -->
      <span class="h-2 w-2 rounded-full shrink-0"
        :class="fila.corretores_e_imobiliarias?.length ? 'bg-emerald-500' : 'bg-ink-subtle'"></span>

      <h3 class="flex-1 text-sm font-medium text-ink truncate text-left" :title="fila.nome">
        {{ fila.nome }}
      </h3>

      <span class="text-[11px] font-mono text-ink-subtle">
        {{ fila.corretores_e_imobiliarias?.length || 0 }}
        corretor{{ fila.corretores_e_imobiliarias?.length === 1 ? '' : 'es' }}
      </span>

      <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
        :class="{ 'rotate-180': open }"></i>
    </button>

    <!-- Accordion: lista de atendentes -->
    <transition
      enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[500px]"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-[500px]"
      leave-to-class="opacity-0 max-h-0">
      <div v-show="open" class="border-t border-line">
        <div v-if="fila.corretores_e_imobiliarias?.length"
          class="max-h-64 overflow-y-auto divide-y divide-line">
          <div v-for="(c, i) in fila.corretores_e_imobiliarias" :key="i"
            class="flex items-center gap-2 px-3 py-2 hover:bg-surface-sunken/40 transition-colors">
            <div class="h-6 w-6 rounded-full bg-accent-soft text-accent grid place-items-center shrink-0">
              <i class="fas fa-user text-[9px]"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium text-ink truncate">{{ c.nome_corretor || '—' }}</p>
              <p v-if="c.nome_imobiliaria" class="text-[10px] text-ink-muted truncate font-mono">
                {{ c.nome_imobiliaria }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="px-3 py-4 text-center text-xs text-ink-subtle">
          Nenhum corretor nesta fila
        </div>
      </div>
    </transition>
  </div>
</template>
