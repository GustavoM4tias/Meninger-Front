<script setup>
import { RouterLink, useRoute } from 'vue-router';
import { computed } from 'vue';

const props = defineProps({
  to: { type: [String, Object], default: null },
  icon: { type: String, default: '' },
  iconImg: { type: String, default: '' },   // PNG/SVG opcional no lugar do ícone FontAwesome
  iconColor: { type: String, default: '' }, // cor de marca fixa (ex.: WhatsApp) — vence o hover
  label: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  favorite: { type: Boolean, default: null },  // null = no fav button
  size: { type: String, default: 'md' },        // sm | md
  asButton: { type: Boolean, default: false },
});

const emit = defineEmits(['click', 'toggleFavorite']);

const route = useRoute();

const heightClass = computed(() => props.size === 'sm' ? 'h-8' : 'h-9');
const textClass   = computed(() => props.size === 'sm' ? 'text-[13px]' : 'text-sm');

// Ativo = caminho bate e, havendo section no `to`, o ?section= também bate.
const isActive = computed(() => {
  if (props.asButton || !props.to) return false;
  const path = typeof props.to === 'string' ? props.to : props.to.path;
  if (route.path !== path) return false;
  const sec = typeof props.to === 'object' ? props.to.query?.section : undefined;
  if (sec == null) return true;
  return route.query.section === sec;
});

// Tooltip só faz sentido quando recolhido (o rótulo some).
const tip = computed(() => (props.collapsed ? props.label : ''));
</script>

<template>
  <div v-tippy:right="tip"
    class="relative flex items-center group/item rounded-lg transition-colors duration-150"
    :class="[heightClass, isActive ? 'bg-accent-soft/60' : 'hover:bg-surface-sunken']">

    <!-- Indicador de rota ativa (barra de acento à esquerda) -->
    <span v-if="isActive"
      class="absolute left-0 top-1/2 -translate-y-1/2 h-4/6 w-[3px] rounded-full bg-accent
             animate-scale-in"></span>

    <component :is="asButton ? 'button' : RouterLink"
      v-bind="asButton ? {} : { to }"
      @click="$emit('click', $event)"
      :class="[
        'flex-1 flex items-center px-2 min-w-0',
        textClass,
        isActive ? 'text-accent font-medium' : 'text-ink',
        collapsed ? 'justify-center' : '',
      ]">
      <img v-if="iconImg" :src="iconImg" :alt="label"
           class="w-5 h-5 rounded-sm object-cover shrink-0" />
      <i v-else-if="icon"
         :style="iconColor ? { color: iconColor } : undefined"
         class="w-5 text-sm shrink-0 transition-colors"
         :class="[icon, isActive ? 'text-accent' : 'text-ink-muted group-hover/item:text-accent']"></i>
      <span v-show="!collapsed"
            class="ms-3 truncate transition-opacity duration-200">{{ label }}</span>
    </component>

    <button v-if="favorite !== null && !collapsed"
      @click.stop="$emit('toggleFavorite')"
      class="mr-1 h-7 w-7 grid place-items-center rounded-md transition-colors"
      :class="favorite
        ? 'text-amber-400 hover:bg-amber-400/10'
        : 'text-ink-subtle opacity-0 group-hover/item:opacity-100 hover:bg-surface-sunken hover:text-amber-400'"
      :aria-label="favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'">
      <i :class="favorite ? 'fas fa-star' : 'far fa-star'" class="text-xs"></i>
    </button>
  </div>
</template>
