<script setup>
import LoginForm from '../components/auth/LoginForm.vue'
import LinkAuth from '../components/auth/LinkAuth.vue'
</script>
<!-- src/views/Login.vue -->
<template>
  <div class="grid grid-cols-12">

    <div class="h-screen relative flex col-span-12 lg:col-span-5 bg-gray-100 dark:bg-gray-800 shadow-2xl z-20">
      <div class="acesso absolute m-8">
        <select
          class="py-2 px-2 rounded-lg text-gray-50 hover:text-white bg-blue-500 hover:bg-blue-600 cursor-pointer duration-200"
          name="" id="">
          <option value="gestor">Gestor</option>
          <option value="financeiro">Financeiro</option>
          <option value="marketing">Marketing</option>
          <option value="comercial">Comercial</option>
          <option value="usuario">Usuário</option>
          <option value="diretoria">Diretoria</option>
        </select>
      </div>
      <div class="form m-auto w-4/6">
        <img src="/Mlogotext.png" class="filter invert dark:invert-0 m-auto w-4/6">
        <LoginForm />
      </div>
      <LinkAuth />
    </div>

    <div class="h-screen hidden lg:block md:col-span-7 bg-gray-50 dark:bg-gray-900 relative">
      <div class="z-10 relative">

        <!-- insira o conteudo adicional de visualizaçao aqui -->

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
