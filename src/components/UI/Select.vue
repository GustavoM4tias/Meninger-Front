<template>
    <div class="w-full">
        <label v-if="label"
            class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            {{ label }}
        </label>
        <select class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100
             bg-white dark:bg-gray-900/60
             border border-gray-200 dark:border-gray-700
             rounded-md shadow-sm
             outline-none transition-all duration-150
             focus:border-blue-400 dark:focus:border-blue-500
             focus:ring-2 focus:ring-blue-500/15 dark:focus:ring-blue-500/20
             disabled:opacity-50 disabled:cursor-not-allowed" :value="modelValue" @change="updateValue"
            :class="classes" :required="required">
            <option value="" disabled hidden>{{ placeholder }}</option>
            <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
    </div>
</template>

<script setup>
const props = defineProps({
    modelValue: { type: [String, Number, Array], default: '' },
    options: { type: Array, required: true, default: () => [] },
    placeholder: { type: String, default: 'Selecione uma opção' },
    label: { type: String, default: '' },
    required: { type: Boolean, default: false },
    classes: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
const updateValue = (e) => emit('update:modelValue', e.target.value);
</script>