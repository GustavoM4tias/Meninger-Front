<script setup>
import { ref, watch } from 'vue';
import BuildingCard from './BuildingCardHome.vue';

const props = defineProps({
  buildings: {
    type: Array,
    required: true,
  },
});

const currentIndex = ref(0);

watch(() => props.buildings, (newBuildings) => {
  if (newBuildings.length > 0) {
    currentIndex.value = 0;
  }
});

const prev = () => {
  if (currentIndex.value === 0) {
    currentIndex.value = props.buildings.length - 1;
  } else {
    currentIndex.value--;
  }
};

const next = () => {
  if (currentIndex.value === props.buildings.length - 1) {
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
  <div class="relative overflow-hidden rounded-xl">

    <div class="flex transition-transform duration-700 ease-in-out"
      :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <div v-for="building in props.buildings" :key="building.id" class="w-full flex-shrink-0">
        <BuildingCard :building="building" />
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
      <div v-for="(building, index) in props.buildings" :key="building.id" @click="goToSlide(index)" :class="{
        'w-5 h-1 rounded-full': true,
        'bg-gray-100': currentIndex !== index,
        'bg-gray-400': currentIndex === index,
        'cursor-pointer': true
      }"></div>
    </div>

  </div>
</template>
