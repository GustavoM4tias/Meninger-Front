<script setup>
import Login from '@/components/Auth/Login.vue';
import Link from '@/components/Auth/Link.vue';
import Banner from '@/components/Auth/Banner.vue';
</script>

<template>
  <div class="grid grid-cols-12 min-h-screen bg-surface">
    <!-- Coluna esquerda: form -->
    <section class="relative col-span-12 lg:col-span-5 flex flex-col bg-surface border-r border-line z-20">
      <!-- Glow accent muito sutil ao fundo -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-accent/8 blur-3xl"></div>
      </div>

      <div class="relative flex-1 flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-sm">
          <img src="/Mlogotext.png" alt="Menin"
               class="block mx-auto mb-10 w-40 dark:invert-0 invert" />
          <Login />
        </div>
      </div>
      <Link />
    </section>

    <!-- Coluna direita: banner -->
    <aside class="hidden lg:flex col-span-7 relative bg-surface-sunken">
      <div class="absolute inset-0 dark:invert dark:opacity-10"
           style="background-image:url('/Mlogo.png'); background-repeat:no-repeat; background-position:center; background-size:55% auto;">
      </div>
      <div class="relative m-auto w-[27rem] h-[43rem] max-h-[80vh]">
        <Banner :interval="4500" :autoplay="true" :navigationButton="false" />
      </div>
    </aside>
  </div>
</template>
