<template>
    <div
          class="group bg-gray-100 dark:bg-gray-600 cursor-pointer shadow absolute right-[-18rem] top-32 rounded-bl-lg transform transition-transform duration-300">
          <div
            class="button absolute -left-7 bg-gray-100 dark:bg-gray-600 shadow-[-3px_0_5px_rgba(0,0,0,.05)] cursor-pointer rounded-l-lg py-3 ps-2.5 pe-3.5">
            <i class="fas fa-chevron-left"></i>
          </div>
          <div class="content w-72 h-auto max-h-[60vh] overflow-auto p-2 gap-2 flex flex-col justify-between">
            <h2 class="text-2xl text-center font-semibold text-gray-800 dark:text-gray-100 px-1">
              Filas de Distribuição
            </h2>
            <!-- Exibindo as filas usando o componente Filas -->
            <Fila v-for="fila in props.filas" :key="fila.idfila_distribuicao_leads" :fila="fila" />
          </div>
        </div>
</template>

<script setup>
import Fila from "./Fila.vue";

const props = defineProps({
    filas: {
        type: Object,
        required: true
    },
});
</script>