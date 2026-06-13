<script setup>
import { RouterLink } from 'vue-router';
import { computed } from 'vue';

const props = defineProps({
  to: { type: [String, Object], default: null },
  icon: { type: String, default: '' },
  iconImg: { type: String, default: '' },   // PNG/SVG opcional no lugar do ícone FontAwesome
  label: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  favorite: { type: Boolean, default: null },  // null = no fav button
  size: { type: String, default: 'md' },        // sm | md
  asButton: { type: Boolean, default: false },
});

const emit = defineEmits(['click', 'toggleFavorite']);

const heightClass = computed(() => props.size === 'sm' ? 'h-9' : 'h-10');
const textClass   = computed(() => props.size === 'sm' ? 'text-sm' : 'text-sm');
</script>

<template>
  <div class="flex items-center group/item rounded-lg
              hover:bg-surface-sunken transition-colors"
       :class="heightClass">
    <component :is="asButton ? 'button' : RouterLink"
      v-bind="asButton ? {} : { to }"
      @click="$emit('click', $event)"
      :class="[
        'flex-1 flex items-center px-2 text-ink',
        textClass,
        collapsed ? 'justify-center' : '',
      ]">
      <img v-if="iconImg" :src="iconImg" :alt="label"
           class="w-5 h-5 rounded-sm object-cover shrink-0" />
      <i v-else-if="icon" :class="icon"
         class="w-5 text-ink-muted group-hover/item:text-accent transition-colors text-sm shrink-0"></i>
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
