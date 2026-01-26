<script setup> 
import Login from '@/components/Auth/Login.vue' 
import Link from '@/components/Auth/Link.vue'
import Banner from '@/components/Auth/Banner.vue'
 
</script>
<!-- src/views/Auth.vue -->
<template>
  <div class="grid grid-cols-12 h-full min-h-screen">
    <div class="h-full relative flex col-span-12 lg:col-span-5 bg-gray-100 dark:bg-gray-800 shadow-2xl z-20">
      <div class="form m-auto w-4/6">
        <img src="/Mlogotext.png" class="filter invert dark:invert-0 m-auto w-4/6">
        <Login />
      </div>
      <Link />
    </div>

    <div class="h-full hidden lg:block md:col-span-7 bg-gray-50 dark:bg-gray-900 relative">
      <div class="z-10 relative h-full w-full flex">
        <Banner class="m-auto !h-[43rem] !w-[27rem]" :interval="4000" :autoplay="true" :navigationButton="false" />
      </div>
      <div class="bg-img dark:invert dark:opacity-15 h-full w-full absolute top-0 left-0 z-0"></div>
    </div>
  </div>
</template>

<style scoped>
.bg-img {
  background-image: url(/Mlogo.png);
}
</style>
