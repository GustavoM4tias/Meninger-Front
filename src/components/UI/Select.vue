<template>
    <div class="select-field w-full">
        <select
            class="py-3 px-2 border text-lg md:text-xl text-gray-700 dark:text-gray-300 dark:bg-gray-500 border-gray-100 dark:border-gray-600 rounded-lg focus:outline-none shadow-sm w-full"
            :value="modelValue" @change="updateValue" :class="classes" :required="required">
            <option value="" disabled hidden>{{ placeholder }}</option>
            <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
    </div>
</template>

<script setup>
const props = defineProps({
    modelValue: [String, Number], // Valor selecionado
    options: { // Array de opções de seleção
        type: Array,
        required: true,
        default: () => []
    },
    placeholder: { type: String, default: 'Selecione uma opção' },
    required: { type: Boolean, default: false },
    classes: { type: String, default: '' }
});

const emit = defineEmits();

const updateValue = (event) => {
    emit('update:modelValue', event.target.value); // Emite o evento de atualização
};
</script>