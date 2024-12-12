<script setup>
import EventNotification from '../components/Home/Notifications/EventNotification.vue';
import EventCarrossel from '../components/Home/Events/EventCarrossel.vue';
import BuildingCarrossel from '../components/Home/Buildings/BuildingCarrossel.vue';
</script>

<template>
  <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800">

    <!-- Primeira coluna -->
    <div class="w-full md:w-2/3 flex flex-col">

      <div class="w-full ">
        <EventCarrossel class="flex-1 filter drop-shadow-xl" />
      </div>

      <div class="others flex-1">
        Others
      </div>

    </div>

    <!-- Segunda coluna -->
    <div class="w-full md:w-1/3 f-full flex flex-col">

      <EventNotification class="flex-1 p-4 md:h-[60%] md:min-h-[60%] filter drop-shadow-xl order-2 md:order-1" />

      <div class="enterprise h-[40%] flex-1 order-1 md:order-2">
        <BuildingCarrossel class="flex-1 filter drop-shadow-xl h-full m-auto" />
      </div>

    </div>

  </div>
</template>
