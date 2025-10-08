<script setup>
const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    class: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        required: true,
    },
    value: {
        type: [String, Number],
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
});

</script>

<template>
    <div class="card flex flex-col w-full p-4 hover:-translate-y-0.5 transition-all rounded-xl border border-gray-300/70 dark:border-gray-600/50 shadow shadow-black/5 hover:shadow-black/10 dark:shadow-white/5 dark:hover:shadow-white/10 duration-150"
        :class="props.class">
        <div class="flex justify-between text-lg w-full cursor-pointer">
            <h3 v-tippy="`${props.title}`" class="truncate font-semibold">{{ props.title }}</h3>
            <i class="text-end w-1/6" :class="icon"></i>
        </div>
        <h1 class="text-2xl lg:text-3xl flex-1 flex items-center font-bold truncate">
            {{ props.value }}
        </h1>
        <span class="text-xs text-gray-400 truncate">{{ props.label }}</span>
    </div>
</template>