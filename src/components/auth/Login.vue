<template>
  <div>
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <input v-model="username" type="text" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
      <div v-if="errorMessage">{{ errorMessage }}</div>
    </form>
    <Carregamento />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { loginUser } from '../../utils/api';
import { useRouter } from 'vue-router';
import Carregamento from '../Carregamento.vue';

const router = useRouter();
const userStore = useUserStore();
const username = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = ''; // Limpa a mensagem de erro antes de tentar o login
  try {
    const result = await loginUser(username.value, password.value);

    // console.log('Login result:', result); // Adiciona log do resultado

    // Acessa o token na estrutura correta da resposta
    if (result.success && result.data.token) {
      userStore.setToken(result.data.token); // Armazena o token na store
      router.push('/'); // Redireciona após o login
    } else {
      errorMessage.value = result.error ; // Exibe mensagem de erro
    }
  } catch (error) {
    console.error('Login error:', error); // Adiciona log do erro
    errorMessage.value = 'Erro ao tentar fazer login. Tente novamente.'; // Mensagem genérica
  }
};

// Obriga a logar novamente caso volte a tela de login
onMounted(() => {
  if (userStore.isAuthenticated()) {
    userStore.clearUser(); // Limpa os dados do usuário se já estiver autenticado
  }
});

</script>

<style scoped>
/* Estilos para o Login */
.error {
  color: red;
}
</style>
