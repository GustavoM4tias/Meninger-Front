<script setup>
import { ref, watch } from 'vue';
import EventCard from './EventCardHome.vue';

const props = defineProps({
  eventos: {
    type: Array,
    required: true,
  },
});

const currentIndex = ref(0);

watch(() => props.eventos, (newEventos) => {
  if (newEventos.length > 0) {
    currentIndex.value = 0; // Reseta o índice quando os eventos mudarem
  }
});

// Função para ir para o slide anterior
const prev = () => {
  if (currentIndex.value === 0) {
    currentIndex.value = props.eventos.length - 1;
  } else {
    currentIndex.value--;
  }
};

// Função para ir para o slide seguinte
const next = () => {
  if (currentIndex.value === props.eventos.length - 1) {
    currentIndex.value = 0;
  } else {
    currentIndex.value++;
  }
};

// Função para ir para um slide específico ao clicar no marcador
const goToSlide = (index) => {
  currentIndex.value = index;
};
</script>

<template>
  <div class="relative overflow-hidden h-full"> <!-- Defina h-full aqui -->
    <!-- Contêiner do Carrossel -->
    <div class="flex transition-transform duration-700 ease-in-out h-full" 
      :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <!-- Cards dos Eventos -->
      <div v-for="event in props.eventos" :key="event.id" class="w-full h-full flex-shrink-0"> <!-- h-full aqui -->
        <EventCard :event="event" />
      </div>
    </div>

    <!-- Controles de Navegação: Setas -->
    <button @click="prev" class="absolute top-1/2 left-4 -translate-y-1/2 text-gray-100 font-black p-3 text-2xl hover:text-3xl hover:text-gray-200 duration-200">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button @click="next" class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-100 font-black p-3 text-2xl hover:text-3xl hover:text-gray-200 duration-200">
      <i class="fas fa-chevron-right"></i>
    </button>

    <!-- Marcadores de Páginas -->
    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
      <div v-for="(event, index) in props.eventos" :key="event.id" @click="goToSlide(index)" :class="{
        'w-3 h-3 rounded-full': true,
        'bg-gray-100': currentIndex !== index,
        'bg-gray-300': currentIndex === index,
        'cursor-pointer': true
      }"></div>
    </div>
  </div>
</template>
