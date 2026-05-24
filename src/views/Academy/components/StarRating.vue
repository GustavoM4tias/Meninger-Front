<template>
    <div class="inline-flex items-center gap-1" :class="readonly ? '' : 'cursor-pointer'">
        <button v-for="n in 5" :key="n" type="button" :disabled="readonly"
            class="transition-transform" :class="readonly ? 'cursor-default' : 'hover:scale-110 active:scale-95'"
            @click="!readonly && pick(n)" @mouseenter="!readonly && (hover = n)" @mouseleave="hover = 0"
            :aria-label="`${n} estrela${n > 1 ? 's' : ''}`">
            <i class="fa-solid fa-star" :class="[
                sizeClass,
                (hover || modelValue) >= n
                    ? 'text-amber-400'
                    : 'text-slate-200 dark:text-slate-700'
            ]"></i>
        </button>

        <span v-if="showValue" class="ml-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {{ Number(modelValue || 0).toFixed(1) }}
        </span>
        <span v-if="count != null" class="ml-1 text-xs text-slate-400 dark:text-slate-500">
            ({{ count }})
        </span>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    modelValue: { type: Number, default: 0 },   // valor atual (0-5, aceita decimal pra média)
    readonly: { type: Boolean, default: false }, // só exibe (não permite clicar)
    showValue: { type: Boolean, default: false },// mostra "4.3" ao lado
    count: { type: Number, default: null },      // mostra "(12)" total de avaliações
    size: { type: String, default: 'md' },       // sm | md | lg
});

const emit = defineEmits(['update:modelValue', 'rate']);

const hover = ref(0);

const sizeClass = computed(() => ({
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
}[props.size] || 'text-base'));

function pick(n) {
    emit('update:modelValue', n);
    emit('rate', n);
}
</script>
