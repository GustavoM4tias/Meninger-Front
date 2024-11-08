<!-- src/components/Auth/RegisterForm.vue -->
<template>
  <div>
    <form @submit.prevent="handleRegister">
      <p class="text-xl font-light uppercase my-2 text-gray-500">Crie sua conta </p>
      <hr class="border-t border-gray-400 mb-10">
      </hr>
      <Input v-model="username" type="text" placeholder="Nome e sobrenome" required />
      <div class="flex gap-5">
        <Select v-model="city" :options="optionsCity" placeholder="Cidade de Atuação" required />
        <Select v-model="position" :options="optionsPosition" placeholder="Cargo de Atuação" required />
      </div>
      <Input v-model="email" type="email" placeholder="Email" required />
      <Input v-model="password" type="password" placeholder="Senha" required />
      <div class="text-red-500" v-if="errorMessage">{{ errorMessage }}</div>
      <Button type="submit">Criar Conta</Button>
      <hr class="border-t border-gray-400 mt-6">
      </hr>
      <RouterLink to="/login" class="text-sm mt-1 text-blue-500 cursor-pointer hover:text-blue-600">Já tem uma conta?
        Entrar. </RouterLink>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { registerUser } from '../../utils/apiAuth';
import { useRouter } from 'vue-router';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';
import Select from '../UI/Select.vue';

const router = useRouter();
const userStore = useUserStore();
const username = ref('');
const city = ref('');
const position = ref('');
const email = ref('');
const password = ref('');
const errorMessage = ref('');


const optionsCity = [
  { value: 'marilia', label: 'Marília' },
  { value: 'garca', label: 'Garça' },
  { value: 'bauru', label: 'Bauru' },
  { value: 'jacarezinho', label: 'Jacarezinho' },
  { value: 'bady bassitt', label: 'Bady Bassitt' },
  { value: 'dourados', label: 'Dourados' }
];

const optionsPosition = [
  { value: 'gestor', label: 'Gestor' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'diretoria', label: 'Diretoria' }
];

const handleRegister = async () => {
  errorMessage.value = ''; // Limpa a mensagem de erro antes de tentar o login

  try {
    const result = await registerUser(username.value, password.value, email.value, position.value, city.value);

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
    router.push('/'); // Redireciona após o login
  }
});

</script>
