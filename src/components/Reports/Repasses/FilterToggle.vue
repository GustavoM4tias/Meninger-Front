<template>
    <label class="flex items-center gap-2 cursor-pointer">
        <div class="relative inline-block w-10 align-middle select-none">
            <input type="checkbox" :id="id" v-model="checked" @change="onChange" class="peer sr-only" />
            <div
                class="h-6 w-10 bg-gray-700 dark:bg-gray-200 rounded-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-1 after:left-0.5 after:bg-white after:border-gray-300 after:border after:h-4 after:w-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5">
            </div>
        </div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
    </label>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    id: {
        type: String,
        required: true
    },
    modelValue: {
        type: Boolean,
        required: true
    },
    label: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:modelValue', 'change']);

const checked = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
    checked.value = newValue;
});

const onChange = () => {
    emit('update:modelValue', checked.value);
    emit('change');
};
</script>