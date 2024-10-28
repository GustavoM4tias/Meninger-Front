<!-- src/components/Auth/Register.vue -->
<template>
  <div>
    <h2>Register</h2>
    <form @submit.prevent="handleRegister">
      <input v-model="username" type="text" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <button type="submit">Register</button>
      <div v-if="errorMessage">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { registerUser } from '../../utils/api';
import { useRouter } from 'vue-router';

const router = useRouter();
const userStore = useUserStore();
const username = ref('');
const password = ref('');
const email = ref('');
const errorMessage = ref('');

const handleRegister = async () => {
  errorMessage.value = ''; // Limpa a mensagem de erro antes de tentar o login

  try {
    const result = await registerUser(username.value, password.value, email.value);

    // console.log('Register result:', result); // Adiciona log do resultado

    // Acessa o token na estrutura correta da resposta
    if (result.success) {
      userStore.setToken(result.data.token); // Armazena o token na store
      router.push('/'); // Redireciona após o login
    } else {
      errorMessage.value = result.error; // Exibe mensagem de erro
    }
  } catch (error) {
    console.error('Register error:', error); // Adiciona log do erro
    errorMessage.value = 'Erro ao tentar registrar. Tente novamente.'; // Mensagem genérica
  }
};

// Obriga a logar novamente caso volte a tela de registro
onMounted(() => {
  if (userStore.isAuthenticated()) {
    userStore.clearUser(); // Limpa os dados do usuário se já estiver autenticado
  }
});

</script>

<style scoped>
/* Estilos para o Registro */
</style>