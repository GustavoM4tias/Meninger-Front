<template>
    <div class="select-field w-full">
        <select class="p-3 border border-gray-100 rounded-lg focus:outline-none shadow-sm w-full text-gray-400" :value="modelValue" @change="updateValue"
            :required="required">
            <option value="" disabled hidden>{{ placeholder }}</option>
            <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
    modelValue: String, // Valor selecionado
    options: { // Array de opções de seleção
        type: Array,
        required: true,
        default: () => []
    },
    placeholder: { type: String, default: 'Selecione uma opção' },
    required: { type: Boolean, default: false }
});

const emit = defineEmits();

const updateValue = (event) => {
    emit('update:modelValue', event.target.value); // Emite o evento de atualização
};
</script>