<script setup>
import LoginForm from '../components/auth/LoginForm.vue'
</script>
<!-- src/views/Login.vue -->
<template>
  <div class="grid grid-cols-12">

    <div class="h-screen relative flex col-span-12 lg:col-span-5 bg-gray-100 shadow-2xl z-20">
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
        <img src="/Mlogotext.png" class="filter invert m-auto w-4/6">
        <LoginForm />
      </div>
      <div class="links absolute grid grid-cols-3 bottom-0 p-8 w-full">
        <div class="icons flex m-auto ml-0 text-sm md:text-2xl text-gray-600 hover:text-gray-700">
          <a href="https://www.youtube.com/@meninengenharia" target="_blank"
            class="icon bg-gray-300 hover:bg-gray-400 duration-200 cursor-pointer mx-1 px-1 p-0.5 md:mx-2 md:px-2 md:p-1 rounded-full">
            <i class="fab fa-youtube rounded-full"></i>
          </a>
          <a href="https://www.linkedin.com/company/menin-engenharia" target="_blank"
            class="icon bg-gray-300 hover:bg-gray-400 duration-200 cursor-pointer mx-1 px-1 p-0.5 md:mx-2 md:px-2 md:p-1 rounded-full">
            <i class="fab fa-linkedin-in rounded-full px-0.5"></i>
          </a>
          <a href="https://www.instagram.com/meninengenharia/" target="_blank"
            class="icon bg-gray-300 hover:bg-gray-400 duration-200 cursor-pointer mx-1 px-1 p-0.5 md:mx-2 md:px-2 md:p-1 rounded-full">
            <i class="fab fa-instagram rounded-full px-0.5"></i>
          </a>
        </div>
        <div class="version m-auto">
          <button class="bg-gray-200 truncate text-sm md:text-md text-gray-600 px-1 pt-0.5 md:px-2 md:py-1  rounded-lg border border-gray-300">
            Versão: 1.07
          </button>
        </div>
        <div class="credits m-auto mr-0">
          <a class="flex" href="https://gdmd.digital" target="_blank">
            <p class="hidden md:block mt-5 mr-1 text-lg text-gray-900 font-semibold">Feito por</p>
            <img src="https://www.gdmd.digital/icondark.png" class="filter invert h-10 md:h-14">
          </a>
          <!-- <p class="text-white mt-6">Marketing Digital</p> -->
        </div>
      </div>
    </div>

    <div class="h-screen flex hidden lg:block md:col-span-7 bg-gray-50 relative">
      <div class="z-10 relative">

        <!-- insira o conteudo adicional de visualizaçao aqui -->

      </div>
      <div class="bg-img h-full w-full absolute top-0 left-0 z-0"></div>
    </div>
    

  </div>
</template>

<style scoped>
.bg-img {
  background-image: url(/Mlogo.png);
}
</style>
