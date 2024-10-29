<template>
  <div>
    menu
    <RouterLink to="/Login">Login</RouterLink>
    <RouterLink to="/Register">Register</RouterLink>
    <div v-if="user">
      <p><strong>Username:</strong> {{ user.data.username }}</p>
      <p><strong>Email:</strong> {{ user.data.email }}</p>
    </div>
    <div v-else>
      <p>Carregando informações do usuário...</p>
    </div>
    <div v-if="errorMessage">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/userStore';
import { getUserInfo } from '../utils/api';

const userStore = useUserStore();
const user = ref(null);
const errorMessage = ref('');

const fetchUserInfo = async () => {
  errorMessage.value = ''; 
  try {
    const result = await getUserInfo(); 
    user.value = result; 
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    errorMessage.value = 'Erro ao carregar informações do usuário.';
  }
};

onMounted(() => {
  if (userStore.isAuthenticated()) {
    fetchUserInfo(); 
  } else {
    errorMessage.value = 'Usuário não está autenticado.';
  }
});

</script>

<style scoped>
/* Estilos para o perfil do usuário */
.error {
  color: red;
}
</style>
