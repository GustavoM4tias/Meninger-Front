<template>
  <div>
    menu
    <RouterLink class="text-blue-500 hover:text-blue-100 m-2 px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded-lg cursor-pointer" to="/Login">Login</RouterLink>
    <RouterLink class="text-blue-500 hover:text-blue-100 m-2 px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded-lg cursor-pointer" to="/Register">Register</RouterLink>
    <RouterLink class="text-blue-500 hover:text-blue-100 m-2 px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded-lg cursor-pointer" to="/Events">Events</RouterLink>
    <div v-if="user">
      <p><strong>Username:</strong> {{ user.username }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
    </div>
    <div v-else>
      <p>Carregando informações do usuário...</p>
    </div>
    <div v-if="errorMessage">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

// Puxa informações do usuario 
import { useFetchUserInfo } from '../utils/fetchUserInfo';
const { user, errorMessage, fetchUserInfo } = useFetchUserInfo();

// Validação de Autenticação
import { useUserStore } from '../stores/userStore';
const userStore = useUserStore();

onMounted(() => {
  if (userStore.isAuthenticated()) {
    fetchUserInfo(); 
  } else {
    errorMessage.value = 'Usuário não está autenticado.';
  }
});

</script>

<style scoped>
.error {
  color: red;
}
</style>
