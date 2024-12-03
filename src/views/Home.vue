<script setup>
import EventNotification from '../components/Home/Events/EventNotification.vue';
import EventCarrossel from '../components/Home/Events/EventCarrossel.vue';

</script>

<template>
  <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row">

    <!-- Primeira coluna -->
    <div class="w-full md:w-2/3 flex flex-col order-2 md:order-1">

      <div class="w-full ">
        <EventCarrossel class="flex-1" />
      </div>

      <div class="others bg-purple-200 p-4 md:p-8 flex-1">
        Others
      </div>

    </div>

    <!-- Segunda coluna -->
    <div class="w-full md:w-1/3 flex flex-col order-1 md:order-2">
      <EventNotification class="flex-1" />
      <div class="enterprise bg-yellow-200 flex-1">
        Empreendimentos
      </div>
    </div>

  </div>
</template>
