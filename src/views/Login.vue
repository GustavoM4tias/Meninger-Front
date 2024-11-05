<script setup>
import Login from '../components/auth/Login.vue'
</script>
<!-- src/views/Login.vue -->
<template>
  <div class="grid grid-cols-12">


    <div class="h-screen flex col-span-12 md:col-span-5 bg-green-400">

      <div class="form m-auto w-4/6">
        <Login />
      </div>

    </div>
    <div class="h-screen flex hidden md:block md:col-span-7 bg-red-400">
      
      <div class="">
        content 2
      </div>
    </div>

  </div>

</template>
