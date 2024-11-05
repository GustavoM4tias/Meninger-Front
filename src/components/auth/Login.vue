<template>
  <form @submit.prevent="handleLogin">
    <InputField v-model="username" type="text" placeholder="Username" required />
    <InputField v-model="password" type="password" placeholder="Password" required />
    <p class="text-sm -mt-3 text-blue-500 underline cursor-pointer hover:text-blue-600">Esquecer a Senha? </p>
    <Button type="submit">Login</Button>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
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
const username = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  try {
    const result = await loginUser(username.value, password.value);

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

<style scoped>
.error {
  color: red;
}
</style>
