<!-- <template>
    <div class="flex absolute top-0 left-0 group">
      <div class="menu flex h-screen w-16 flex-col justify-between border border-gray-800 bg-gray-700 z-30">
        <div>
          <div class="inline-flex size-16 items-center justify-center p-2">
            <img src="/public/logo.png" class="filter drop-shadow" />
          </div>
          <div class="px-2 text-2xl">
            <ul class="space-y-1 border-t border-gray-500 pt-4">
              <li class="group relative flex justify-center rounded cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                <i class="fa-solid fa-calendar-days"></i>
              </li>
              <li class="group relative flex justify-center rounded cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                <i class="fa-solid fa-chart-line"></i>
              </li>
              <li class="group relative flex justify-center rounded cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                <i class="fa-solid fa-money-bills"></i>
              </li>
              <li class="group relative flex justify-center rounded cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                <i class="fa-solid fa-gear"></i>
              </li>
            </ul>
          </div>
        </div>
        <div class="sticky inset-x-0 bottom-0 border-t border-gray-800 p-2 text-2xl">
          <button class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
  
      <div class="menu-hover flex h-screen flex-1 flex-col justify-between border-e bg-gray-700 z-20 transform -translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-16">
        <div class="px-4 py-6">
          <ul class="mt-12 space-y-1">
            <li>
              <RouterLink to="" class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-2.5 py-2 text-sm font-medium">
                Eventos
              </RouterLink>
            </li>
            <li>
              <RouterLink to="" class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-2.5 py-2 text-sm font-medium">
                Relatórios
              </RouterLink>
            </li>
            <li>
              <RouterLink to="" class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-2.5 py-2 text-sm font-medium">
                Financeiro
              </RouterLink>
            </li>
            <li>
              <RouterLink to="" class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-2.5 py-2 text-sm font-medium">
                Configurações
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  .menu-hover {
    transform: translateX(-160px); /* Posiciona fora da tela inicialmente */
  }
  
  .group:hover .menu-hover {
    transform: translateX(0); /* Move para a posição ao lado do menu */
  }
  </style>
   -->
<!-- src/components/Nav.vue -->
<template>
    <div @click="toggleMenu" class="menu fixed flex h-screen w-16 flex-col justify-between cursor-pointer border border-gray-800 bg-gray-700 z-30">
        <div>
            <div class="inline-flex size-16 items-center justify-center p-2">
                <img src="/public/logo.png" class="filter drop-shadow" />
            </div>
            <div class="px-2 text-2xl">
                <ul class="space-y-1 border-t border-gray-500 pt-3">
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-calendar-days"></i>
                    </div>
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-money-bills"></i>
                    </div>
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-gear"></i>
                    </div>
                </ul>
            </div>
        </div>
        <div class="sticky inset-x-0 bottom-0 border-t border-gray-800 p-2 text-2xl">
            <button @click="logout()"
                class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
        </div>
    </div>


    <div :class="{ 'translate-x-0': menuOpen, '-translate-x-full': !menuOpen }"
        class="menu-hover fixed flex h-screen flex-1 flex-col justify-between border-e bg-gray-700 z-20 transform transition-transform duration-300 ease-in-out">
        <div class="px-4 pb-6">
            <p class="text-gray-200 text-center font-bold text-xl leading-5 py-2.5">Bem vindo <br> {{ user?.username }}
            </p>
            <ul class="mt- space-y-1">

                <!-- <li>
                        <div x-data="{ isActive: false }" class="relative">

                            <div class="flex justify-between rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 py-2 text-sm font-medium">
                                <RouterLink to="/events">Eventos</RouterLink>
                                <i x-on:click="isActive = !isActive" class="fas fa-chevron-down my-auto cursor-pointer"></i>
                            </div>

                            <div class="absolute end-0 z-10 w-full rounded-md border border-gray-500 bg-gray-400 rounded-lg shadow-lg" role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false" x-on:keydown.escape.window="isActive = false">

                                <div class="px-1 py-1">
                                    <a class="block rounded-lg px-4 py-2 cursor-pointer text-sm  text-gray-50 bg-gray-500 hover:bg-gray-600 hover:text-gray-200" 
                                        role="menuitem" @click="$emit('openAddEventModal')">
                                        <i class="far text-xl fa-calendar-plus mr-1"></i>
                                        Evento
                                    </a>
                                </div>

                            </div>
                        </div>
                    </li> -->

                <li>
                    <RouterLink to="/Events"
                        class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                        Eventos
                    </RouterLink>
                </li>
                <li>
                    <RouterLink to="/"
                        class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                        Relatórios
                    </RouterLink>
                </li>
                <li>
                    <RouterLink to=""
                        class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                        Financeiro
                    </RouterLink>
                </li>
                <li>
                    <RouterLink to=""
                        class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                        Configurações
                    </RouterLink>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { onMounted } from 'vue';

// Puxa informações do usuario 
import { useFetchUserInfo } from '../utils/fetchUserInfo';
const { user, errorMessage, fetchUserInfo } = useFetchUserInfo();

// Validação de Autenticação
import { useUserStore } from '../stores/userStore';
const userStore = useUserStore();

import { useRouter } from 'vue-router';
const router = useRouter();

onMounted(() => {
    if (userStore.isAuthenticated()) {
        fetchUserInfo();
    } else {
        errorMessage.value = 'Usuário não está autenticado.';
    }
});

const menuOpen = ref(false)

// Função para alternar a visibilidade do menu
const toggleMenu = () => {
    menuOpen.value = !menuOpen.value
}

// Função para logout
const logout = () => {
    userStore.clearUser(); // Limpa os dados do usuário
    router.push('/login');
};

</script>

<style scoped>
.menu-hover {
    transform: translateX(-10);
}

.menu-hover.translate-x-0 {
    transform: translateX(63px);
}
</style>