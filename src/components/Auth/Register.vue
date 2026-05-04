<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { registerUser } from '@/utils/Auth/apiAuth';

import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Select from '@/components/UI/Select.vue';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const city = ref('');
const position = ref('');
const email = ref('');
const birth_date = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

const optionsCity = [
  { value: 'Marília', label: 'Marília' },
  { value: 'Garça', label: 'Garça' },
  { value: 'Bauru', label: 'Bauru' },
  { value: 'Jacarezinho', label: 'Jacarezinho' },
  { value: 'Bady Bassitt', label: 'Bady Bassitt' },
  { value: 'Dourados', label: 'Dourados' },
];

const optionsPosition = [
  { value: 'Financeiro', label: 'Financeiro' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Diretor', label: 'Diretor' },
];

async function handleRegister() {
  errorMessage.value = '';
  loading.value = true;
  try {
    const result = await registerUser(
      username.value, password.value, email.value, position.value, city.value, birth_date.value
    );
    if (result.success) {
      authStore.setToken(result.data.token);
      authStore.fetchUserInfo();
      router.push('/');
    } else {
      errorMessage.value = result.error;
    }
  } catch (error) {
    console.error('Register error:', error);
    errorMessage.value = 'Erro ao tentar registrar, tente novamente mais tarde.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (authStore.isAuthenticated()) router.push('/');
});
</script>

<template>
  <form @submit.prevent="handleRegister" class="space-y-5">
    <div>
      <p class="text-xs uppercase tracking-wider text-ink-subtle font-mono">Cadastro</p>
      <h2 class="text-xl font-semibold text-ink">Crie sua conta</h2>
    </div>
    <div class="hairline"></div>

    <Input v-model="username" type="text" label="Nome completo" placeholder="Nome e sobrenome" iconLeft="fas fa-user" required />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Select v-model="city" :options="optionsCity" label="Cidade" placeholder="Cidade" required />
      <Select v-model="position" :options="optionsPosition" label="Cargo" placeholder="Cargo" required />
    </div>

    <Input v-model="birth_date" type="date" label="Data de nascimento" required />
    <Input v-model="email" type="email" label="E-mail" placeholder="seu@email.com" iconLeft="fas fa-envelope" required />
    <Input v-model="password" type="password" label="Senha" placeholder="Defina uma senha" iconLeft="fas fa-lock" required />

    <transition name="fade">
      <div v-if="errorMessage"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ errorMessage }}
      </div>
    </transition>

    <Button type="submit" block size="lg" :loading="loading">Criar conta</Button>

    <div class="hairline"></div>

    <a @click="$emit('changeLogin')"
       class="block text-center text-xs text-ink-muted hover:text-accent cursor-pointer transition-colors">
      Já tem uma conta? <span class="text-accent">Entrar.</span>
    </a>
  </form>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
