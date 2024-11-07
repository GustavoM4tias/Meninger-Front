<template>
  <form @submit.prevent="handleLogin">
    <p class="text-xl font-light uppercase my-2 text-gray-500">Acesse sua conta </p>
    <hr class="border-t border-gray-400 mb-10"></hr>
    <InputField v-model="email" type="email" placeholder="Email" required />
    <InputField v-model="password" type="password" placeholder="Senha" required />
    <p class="text-sm -mt-3 text-blue-500 underline cursor-pointer hover:text-blue-600">Esquecer a Senha? </p>
    <Button type="submit">Login</Button>
    <div v-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
    <hr class="border-t border-gray-400 my-6"></hr>
  </form>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { loginUser } from '../../utils/apiAuth';
import { useRouter } from 'vue-router';
import InputField from '../UI/InputField.vue';
import Button from '../UI/Button.vue';

const router = useRouter();
const userStore = useUserStore();
const email = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  try {
    const result = await loginUser(email.value, password.value);

    if (result.success && result.data.token) {
      userStore.setToken(result.data.token);
      router.push('/');
    } else {
      errorMessage.value = result.error;
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = 'Erro ao tentar fazer login. Tente novamente.';
  }
};

onMounted(() => {
  if (userStore.isAuthenticated()) {
    router.push('/');
  } else {
    userStore.clearUser();
  }
});
</script>
