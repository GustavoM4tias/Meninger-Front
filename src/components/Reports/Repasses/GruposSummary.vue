<template>
    <div class="flex flex-wrap gap-3 mb-4">
        <div v-for="grupoInfo in gruposSumarizados" :key="grupoInfo.id"
            class="rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow duration-150 flex flex-col"
            :style="{
                backgroundColor: getGrupoColor(grupoInfo.id),
                color: getGrupoTextColor(grupoInfo.id)
            }">
            <div class="px-4 py-1.5 flex items-center justify-between">
                <span class="font-medium">{{ grupoInfo.nome }}</span>
                <span class="ml-2 px-2 py-0.5 text-sm font-bold rounded-full" :style="{
                    backgroundColor: adjustColor(getGrupoColor(grupoInfo.id), 0.2),
                    color: getGrupoTextColor(grupoInfo.id)
                }">
                    {{ grupoInfo.total }}
                </span>
            </div>
            <div class="px-4 py-1 text-sm font-semibold bg-opacity-10 bg-black dark:bg-opacity-25 dark:bg-white">
                {{ formatMoney(grupoInfo.valorTotal) }}
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    gruposSumarizados: {
        type: Array,
        required: true
    },
    getGrupoColor: {
        type: Function,
        required: true
    },
    getGrupoTextColor: {
        type: Function,
        required: true
    },
    adjustColor: {
        type: Function,
        required: true
    },
    formatMoney: {
        type: Function,
        required: true
    }
});
</script>