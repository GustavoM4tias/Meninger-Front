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
    currentIndex.value = 0;
  }
});

const prev = () => {
  if (currentIndex.value === 0) {
    currentIndex.value = props.eventos.length - 1;
  } else {
    currentIndex.value--;
  }
};

const next = () => {
  if (currentIndex.value === props.eventos.length - 1) {
    currentIndex.value = 0;
  } else {
    currentIndex.value++;
  }
};

const goToSlide = (index) => {
  currentIndex.value = index;
};
</script>

<template>
  <div v-if="props.eventos.length > 0" class="relative overflow-hidden rounded-xl">

    <div class="flex transition-transform duration-700 ease-in-out"
      :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <div v-for="event in props.eventos" :key="event.id" class="w-full flex-shrink-0">
        <EventCard :event="event" />
      </div>
    </div>

    <!-- Controles de Navegação -->
    <button @click="prev" class="absolute top-1/2 left-4 -translate-y-1/2 text-gray-100 p-3">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button @click="next" class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-100 p-3">
      <i class="fas fa-chevron-right"></i>
    </button>
    <!-- Marcadores de Páginas -->
    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
      <div v-for="(event, index) in props.eventos" :key="event.id" @click="goToSlide(index)" :class="{
        'w-7 h-1 rounded-full': true,
        'bg-gray-100': currentIndex !== index,
        'bg-gray-400': currentIndex === index,
        'cursor-pointer': true
      }"></div>
    </div>
  </div> 
  <div class="relative rounded-xl overflow-hidden h-[350px] bg-gray-700 flex" v-else> 
    <p class="m-auto text-xl md:text-3xl text-gray-500">Nenhum evento em andamento.</p>
  </div>
</template>
