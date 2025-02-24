<!-- src/components/Auth/LoginForm.vue -->
 <template>
  <form @submit.prevent="handleLogin">
    <p class="text-xl font-light uppercase my-2 text-gray-500 dark:text-gray-200">Acesse sua conta </p>
    <hr class="border-t border-gray-400 dark:border-gray-100 mb-10"></hr>
    <Input class="my-6" v-model="email" type="email" placeholder="Email" required />
    <Input class="my-6" v-model="password" type="password" placeholder="Senha" required />
    <p class="text-sm -mt-3 text-blue-500 underline cursor-pointer hover:text-blue-600">Esquecer a Senha? </p>
    <Button type="submit">Login</Button>
    <div v-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
    <hr class="border-t border-gray-400 dark:border-gray-100 mt-6"></hr>
    <RouterLink to="/register" class="text-sm mt-1 text-blue-500 cursor-pointer hover:text-blue-600">Não tem uma conta? Crie agora. </RouterLink>
  </form>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/Auth/authStore';
import { loginUser } from '../../utils/Auth/apiAuth';
import { useRouter } from 'vue-router';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';

const router = useRouter();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  try {
    const result = await loginUser(email.value, password.value);

    if (result.success && result.data.token) {
      authStore.setToken(result.data.token);
      router.push('/');
    } else {
      errorMessage.value = result.error;
    }
  } catch (error) {
    errorMessage.value = (error);
  }
};

onMounted(() => {
  if (authStore.isAuthenticated()) {
    router.push('/');
  } else {
    authStore.clearUser();
  }
});
</script>
