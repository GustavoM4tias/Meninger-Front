<script setup>
defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  iconColor: { type: String, default: '' },        // cor de marca fixa (ex.: Meta) — vence o hover
  iconSlot: { type: Boolean, default: false },     // se quiser passar SVG/etc via slot
  level: { type: String, default: 'category' },    // category | sub
  active: { type: Boolean, default: false },        // contém a rota atual (trilha)
});

defineEmits(['toggle']);
</script>

<template>
  <div>
    <button type="button" @click="$emit('toggle')"
      :class="[
        'relative flex items-center w-full px-2 rounded-lg group text-ink transition-colors duration-150',
        collapsed ? 'justify-center' : '',
        level === 'sub' ? 'h-8 text-[13px] font-normal' : 'h-9 text-sm font-medium',
        active && collapsed ? 'bg-accent-soft/60' : '',
        active && !collapsed ? 'hover:bg-accent-soft/40' : '',
        !active ? 'hover:bg-surface-sunken' : '',
      ]"
      :aria-expanded="open">

      <!-- Trilha ativa quando fechado/expandido: barra de acento à esquerda -->
      <span v-if="active && !collapsed && !open"
        class="absolute left-0 top-1/2 -translate-y-1/2 h-4/6 w-[3px] rounded-full bg-accent"></span>

      <slot v-if="iconSlot" name="icon" />
      <i v-else-if="icon"
         :style="iconColor ? { color: iconColor } : undefined"
         class="w-5 text-sm shrink-0 transition-colors"
         :class="[icon, (active || open) ? 'text-accent' : 'text-ink-muted group-hover:text-accent']"></i>

      <span v-show="!collapsed"
            class="flex-1 ms-3 text-left truncate transition-opacity duration-200"
            :class="active ? 'text-accent' : ''">
        {{ label }}
      </span>

      <i v-show="!collapsed"
         class="text-[10px] transition-transform duration-200"
         :class="[
           open ? 'fas fa-chevron-down' : 'fas fa-chevron-right',
           active ? 'text-accent/70' : 'text-ink-subtle',
         ]"></i>
    </button>

    <transition
      enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[1200px]"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-[1200px]"
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
