<!-- src/components/Auth/Register.vue -->
<template>
  <div>
    <form @submit.prevent="handleRegister">
      <p class="text-xl font-light uppercase my-2 text-gray-500 dark:text-gray-200">Crie sua conta </p>
      <hr class="border-t border-gray-400 dark:border-gray-100 mb-10">
      </hr>
      <Input class="my-3" v-model="username" type="text" placeholder="Nome e sobrenome" required />
      <div class="flex gap-2 my-3">
        <Select v-model="city" :options="optionsCity" placeholder="Cidade" required />
        <Select v-model="position" :options="optionsPosition" placeholder="Cargo" required />
      </div>
      <Input v-model="birth_date" type="date" placeholder="Data de Nascimento" required />
      <Input class="my-3" v-model="email" type="email" placeholder="Email" required />
      <Input class="my-3" v-model="password" type="password" placeholder="Senha" required />
      <div class="text-red-500" v-if="errorMessage">{{ errorMessage }}</div>
      <Button type="submit">Criar Conta</Button>
      <hr class="border-t border-gray-400 dark:border-gray-100 mt-6">
      </hr>
      <RouterLink to="/login" class="text-sm mt-1 text-blue-500 cursor-pointer hover:text-blue-600">Já tem uma conta?
        Entrar. </RouterLink>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/Auth/authStore';
import { registerUser } from '../../utils/Auth/apiAuth';
import { useRouter } from 'vue-router';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';
import Select from '../UI/Select.vue';

const router = useRouter();
const authStore = useAuthStore();
const username = ref('');
const city = ref('');
const position = ref('');
const email = ref('');
const birth_date = ref('');
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
    const result = await registerUser(username.value, password.value, email.value, position.value, city.value, birth_date.value);

    // console.log('Register result:', result); // Adiciona log do resultado

    // Acessa o token na estrutura correta da resposta
    if (result.success) {
      authStore.setToken(result.data.token); // Armazena o token na store
      router.push('/'); // Redireciona após o login
    } else {
      errorMessage.value = result.error; // Exibe mensagem de erro
    }
  } catch (error) {
    console.error('Register error:', error); // Adiciona log do erro
    errorMessage.value = 'Erro ao tentar registrar, tente novamente mais tarde.'; // Mensagem genérica
  }
};

// Obriga a logar novamente caso volte a tela de registro
onMounted(() => {
  if (authStore.isAuthenticated()) {
    router.push('/'); // Redireciona após o login
  }
});

</script>
