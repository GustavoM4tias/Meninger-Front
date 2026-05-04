<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  icon: { type: String, default: 'fas fa-cog' },
  iconColor: { type: String, default: 'accent' }, // accent | success | warning | danger | neutral
  title: { type: String, required: true },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },              // ex: "Conectado", "Não configurado"
  badgeVariant: { type: String, default: 'neutral' },// neutral | success | warning | accent | danger
  collapsible: { type: Boolean, default: true },
  modelValue: { type: Boolean, default: false },
  defaultOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'toggle']);

const open = ref(props.defaultOpen ?? props.modelValue ?? false);
watch(() => props.modelValue, (v) => { open.value = v; });

function toggle() {
  if (!props.collapsible) return;
  open.value = !open.value;
  emit('update:modelValue', open.value);
  emit('toggle', open.value);
}

const iconClass = computed(() => ({
  accent:  'bg-accent-soft text-accent border-accent/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  danger:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  neutral: 'bg-surface-sunken text-ink-muted border-line',
}[props.iconColor] || 'bg-accent-soft text-accent border-accent/20'));

const badgeClass = computed(() => ({
  neutral: 'text-ink-muted',
  accent:  'text-accent',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger:  'text-red-600 dark:text-red-400',
}[props.badgeVariant] || 'text-ink-muted'));
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient overflow-hidden">
    <component :is="collapsible ? 'button' : 'div'"
      :type="collapsible ? 'button' : undefined"
      @click="collapsible && toggle()"
      :class="[
        'w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 text-left',
        collapsible ? 'hover:bg-surface-sunken/40 transition-colors' : '',
      ]"
      :aria-expanded="collapsible ? open : undefined">

      <div class="h-9 w-9 rounded-lg border grid place-items-center shrink-0" :class="iconClass">
        <i :class="icon" class="text-sm"></i>
      </div>

      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-ink truncate">{{ title }}</p>
        <p v-if="description || badge || $slots.description"
           class="text-xs text-ink-muted mt-0.5 truncate">
          <slot name="description">
            <span v-if="badge" :class="badgeClass" class="font-medium">
              <i v-if="badgeVariant === 'success'" class="fas fa-circle-check mr-1 text-[9px]"></i>
              {{ badge }}<span v-if="description"> · </span>
            </span>
            {{ description }}
          </slot>
        </p>
      </div>

      <i v-if="collapsible"
         class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200 shrink-0"
         :class="{ 'rotate-180': open }"></i>
    </component>

    <transition
      enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[2000px]"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-[2000px]"
      leave-to-class="opacity-0 max-h-0">
      <div v-show="!collapsible || open" class="px-4 sm:px-5 pb-5 border-t border-line">
        <div class="pt-4">
          <slot />
        </div>
      </div>
    </transition>
  </section>
</template>
