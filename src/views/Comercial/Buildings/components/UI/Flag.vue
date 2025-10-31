<script setup>
const props = defineProps({
    stage: {
        type: String,
        required: true,
    },
    rotate: {
        type: Boolean,
        required: false,
    }
});



// Objeto que mapeia os valores de `stage` para classes CSS
const stageClasses = {
    'Pré-Lançamento': 'bg-emerald-500',
    'Lançamento': 'bg-sky-500',
    'Em construção': 'bg-amber-400',
    'Finalizado': 'bg-red-500',
    'Portal do Cliente': 'bg-purple-600'
};
</script>

<template>
    <div :class="[
        'flag absolute z-50 py-1 text-gray-100 font-semibold shadow-lg',
        stageClasses[stage] || 'bg-blue-500',
        rotate ? 'rotate pe-6 ps-3' : 'ps-6 pe-3'
    ]">
        {{ stage }}
    </div>
</template>



<style scoped>
.flag {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 100% 100%, 12% 100%);
}

.rotate {
    clip-path: polygon(0 0, 100% 0, 88% 100%, 100% 100%, 0 100%) !important;
    ;
}
</style>
