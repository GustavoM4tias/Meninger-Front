<script setup>
import { ref } from 'vue';

defineProps({
  fila: { type: Object, required: true },
  podeEditar: { type: Boolean, default: false },
});

defineEmits(['desvincular']);

const open = ref(false);
</script>

<template>
  <div class="rounded-lg border border-line bg-surface-raised overflow-hidden surface-gradient">
    <!-- Header (sempre visível) -->
    <button type="button" @click="open = !open"
      class="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-sunken/40 transition-colors"
      :aria-expanded="open">
      <!-- Status dot -->
      <!-- Cinza = a API não listou atendente. Pode ser fila por grupo ou fila
           inativa: o CV não conta qual dos dois, então isto é aviso, não veredito. -->
      <span class="h-2 w-2 rounded-full shrink-0"
        :title="fila.corretores_e_imobiliarias?.length ? '' : 'A API do CV não lista atendente nesta fila (pode ser fila por grupo ou inativa)'"
        :class="fila.corretores_e_imobiliarias?.length ? 'bg-data-pos' : 'bg-ink-subtle'"></span>

      <h3 class="flex-1 text-sm font-medium text-ink truncate text-left" :title="fila.nome">
        {{ fila.nome }}
      </h3>

      <span class="text-micro font-mono text-ink-subtle">
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
        <!-- Quem a fila atende. É o vínculo que decide para onde vai o lead que
             volta com interesse novo: sem ele, o CV represa o lead. -->
        <div v-if="fila.empreendimentos?.length" class="px-3 py-2 border-b border-line bg-surface-sunken/30">
          <p class="text-micro uppercase tracking-wide text-ink-subtle mb-1.5">Atende</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="e in fila.empreendimentos" :key="e.idempreendimento"
              :title="e.motivo"
              class="inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded-md bg-surface-raised border border-line text-ink-muted">
              {{ e.nome }}
              <button v-if="podeEditar" type="button" title="Remover vínculo"
                class="text-ink-subtle hover:text-data-neg transition-colors"
                @click.stop="$emit('desvincular', e.idempreendimento)">
                <i class="fas fa-xmark text-[9px]"></i>
              </button>
            </span>
          </div>
        </div>

        <div v-if="fila.corretores_e_imobiliarias?.length"
          class="max-h-64 overflow-y-auto divide-y divide-line">
          <div v-for="(c, i) in fila.corretores_e_imobiliarias" :key="i"
            class="flex items-center gap-2 px-3 py-2 hover:bg-surface-sunken/40 transition-colors">
            <div class="h-6 w-6 rounded-full bg-accent-soft text-accent grid place-items-center shrink-0">
              <i class="fas fa-user text-[9px]"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium text-ink truncate">{{ c.nome_corretor || '—' }}</p>
              <p v-if="c.nome_imobiliaria" class="text-micro text-ink-muted truncate font-mono">
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
