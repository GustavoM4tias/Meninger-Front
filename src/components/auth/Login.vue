<!-- src/components/Auth/Login.vue -->
<template>
  <div>
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <input v-model="username" type="text" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
      <div v-if="errorMessage">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { loginUser } from '../../utils/apiAuth';
import { useRouter } from 'vue-router';

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
      // console.log(result.data.token)
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
    userStore.clearUser()
    router.push('/login');
  }
});

</script>

<style scoped>
.error {
  color: red;
}
</style>
