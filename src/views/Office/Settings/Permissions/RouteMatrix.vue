<script setup>
/**
 * A grade de telas, agrupada por categoria do navRegistry.
 *
 * Usada nos dois sujeitos que concedem tela: o usuário (com perfil por baixo e
 * exceções por cima) e o perfil (que é só a lista dele).
 *
 * O switch mostra o EFETIVO. A origem do efetivo vira selo ao lado, porque um
 * switch ligado não diz se veio do perfil ou de uma exceção - e é justamente
 * essa diferença que se revisa depois.
 */
import Panel from '@/components/UI/Panel.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  /* [{ key, label, icon, pages: [{ route, name, icon }] }] */
  grupos: { type: Array, default: () => [] },
  /* (route) => { efetivo, herdado, excecaoMais, excecaoMenos, travada } */
  estado: { type: Function, required: true },
  /* 'usuario' mostra as três camadas; 'perfil' é uma lista simples */
  modo: { type: String, default: 'usuario' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle', 'toggle-grupo']);

const contagem = (grupo) => grupo.pages.filter(p => props.estado(p.route).efetivo).length;
const todasLigadas = (grupo) => grupo.pages.length > 0 && grupo.pages.every(p => props.estado(p.route).efetivo);

/* Selo da origem. Só aparece quando há o que explicar: tela ligada pelo perfil
   sem exceção nenhuma não precisa de rótulo, é o caso comum. */
function selo(st) {
  if (st.travada) return { texto: 'travada', variante: 'neutral', dica: 'Somente admin: travada na aba Telas' };
  if (st.excecaoMais) return { texto: 'exceção: liberada', variante: 'info', dica: 'Liberada só para esta pessoa, além do perfil' };
  if (st.excecaoMenos) return { texto: 'exceção: negada', variante: 'warning', dica: 'Negada só para esta pessoa, apesar do perfil' };
  if (st.herdado && st.efetivo) return { texto: 'do perfil', variante: 'neutral', dica: 'Vem do perfil vinculado' };
  return null;
}
</script>

<template>
  <div class="space-y-3">
    <Panel v-for="grupo in grupos" :key="grupo.key" :padded="false">
      <template #title>
        <span class="flex items-center gap-2 min-w-0">
          <i v-if="grupo.icon" :class="[grupo.icon, 'text-xs text-ink-subtle shrink-0']"></i>
          <span class="truncate">{{ grupo.label }}</span>
          <Badge size="sm" :variant="contagem(grupo) ? 'accent' : 'neutral'">
            {{ contagem(grupo) }}/{{ grupo.pages.length }}
          </Badge>
        </span>
      </template>

      <template #actions>
        <Switch :model-value="todasLigadas(grupo)" size="sm" :disabled="disabled"
          :label="todasLigadas(grupo) ? 'Tirar todas' : 'Dar todas'"
          @update:modelValue="v => emit('toggle-grupo', grupo, v)" />
      </template>

      <ul class="divide-y divide-line-subtle">
        <li v-for="page in grupo.pages" :key="page.route"
          class="flex items-center gap-3 px-4 py-2.5 min-h-[3rem]">
          <Switch :model-value="estado(page.route).efetivo" size="sm"
            :disabled="disabled || estado(page.route).travada"
            @update:modelValue="v => emit('toggle', page.route, v)" />

          <div class="min-w-0 flex-1">
            <p class="text-sm text-ink truncate flex items-center gap-1.5">
              <i v-if="page.icon" :class="[page.icon, 'text-micro text-ink-subtle shrink-0']"></i>
              {{ page.name }}
            </p>
            <p class="text-micro font-mono text-ink-subtle truncate">{{ page.route }}</p>
          </div>

          <Badge v-if="modo === 'usuario' && selo(estado(page.route))"
            :variant="selo(estado(page.route)).variante" size="sm"
            class="shrink-0" v-tippy="selo(estado(page.route)).dica">
            {{ selo(estado(page.route)).texto }}
          </Badge>
        </li>
      </ul>
    </Panel>

    <p v-if="!grupos.length" class="text-sm text-ink-muted">Nenhuma tela delegável.</p>
  </div>
</template>
