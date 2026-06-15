<script setup>
defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  iconSlot: { type: Boolean, default: false },     // se quiser passar SVG/etc via slot
  level: { type: String, default: 'category' },    // category | sub
});

defineEmits(['toggle']);
</script>

<template>
  <div>
    <button type="button" @click="$emit('toggle')"
      :class="[
        'flex items-center w-full px-2 rounded-lg text-ink',
        'hover:bg-surface-sunken transition-colors group',
        collapsed ? 'justify-center' : '',
        level === 'sub' ? 'h-8 text-[13px] font-normal' : 'h-9 text-sm font-medium',
      ]"
      :aria-expanded="open">
      <slot v-if="iconSlot" name="icon" />
      <i v-else-if="icon" :class="icon"
         class="w-5 text-ink-muted group-hover:text-accent transition-colors text-sm shrink-0"></i>

      <span v-show="!collapsed"
            class="flex-1 ms-3 text-left truncate transition-opacity duration-200">
        {{ label }}
      </span>

      <i v-show="!collapsed"
         class="text-[10px] text-ink-subtle transition-transform duration-200"
         :class="open ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
    </button>

    <transition
      enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[1000px]"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-[1000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <ul v-show="!collapsed && open"
        :class="[
          'space-y-0.5 mt-1',
          level === 'sub' ? 'ml-4 pl-2 border-l border-line' : 'ml-3 pl-2 border-l border-line',
        ]">
        <slot />
      </ul>
    </transition>
  </div>
</template>
