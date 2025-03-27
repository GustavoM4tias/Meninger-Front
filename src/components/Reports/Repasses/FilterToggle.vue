<template>
    <div class="flex gap-1.5">
        <label data-ripple-dark="true" for="checkbox"
            class="relative cursor-pointer h-4 w-4 items-center rounded-full">
            <input id="checkbox"
                class="before:content[''] peer relative h-4 w-4 cursor-pointer appearance-none rounded-md border border-gray-400 dark:border-blue-gray-200 transition-all checked:border-cyan-500 checked:bg-cyan-500 checked:before:bg-cyan-500 hover:before:opacity-10"
                type="checkbox" :id="id" v-model="checked" @change="onChange" />
            <span
                class="pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                <i class="fas fa-check text-[10px]"></i>
            </span>
        </label>
        <label for="checkbox" class="select-none text-xs font-light my-auto">
            {{ label }}
        </label>
    </div>
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