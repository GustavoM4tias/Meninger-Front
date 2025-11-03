<!-- src/components/Auth/LoginForm.vue -->
<template>
  <form @submit.prevent="handleLogin">
    <p class="text-xl font-light uppercase my-2 text-gray-500 dark:text-gray-200">Acesse sua conta </p>
    <hr class="border-t border-gray-400 dark:border-gray-100 mb-10">
    </hr>
    <Input class="my-6" v-model="email" type="email" placeholder="Email" required />
    <Input class="my-6" v-model="password" type="password" placeholder="Senha" required />
    <p class="text-sm -mt-3 mb-2 text-blue-500 underline cursor-pointer hover:text-blue-600">Esqueceu a Senha? </p>
    <Button type="submit">Login</Button>
    <div v-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
    <hr class="border-t border-gray-400 dark:border-gray-100 mt-6">
    </hr>
    <a @click="$emit('changeLogin')" class="text-sm mt-1 text-blue-500 cursor-pointer hover:text-blue-600">
      Não tem uma conta? Crie agora.
    </a>

    <div class="mt-4 flex gap-2 items-center">
      <Button v-if="faceEnabled" type="button" @click="loginFacial">Entrar com o rosto</Button>
    </div>

    <!-- modal pequenino para captura durante o login -->
    <div v-if="faceLoginOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 p-4 rounded-xl w-full max-w-md">
        <h3 class="text-lg font-semibold mb-2">Autenticação facial</h3>
        <video ref="videoLoginRef" autoplay playsinline muted class="w-full rounded-md border"></video>
        <div class="mt-3 flex gap-2">
          <Button :disabled="loginLoading" @click="doFaceLogin">{{ loginLoading ? 'Validando...' : 'Confirmar'
          }}</Button>
          <Button outlined @click="closeFaceLogin">Cancelar</Button>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup>
import { watch, ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { loginUser } from '@/utils/Auth/apiAuth';
import { useRouter } from 'vue-router';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const router = useRouter();
const authStore = useAuthStore();
const faceStore = useFaceStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  try {
    const result = await loginUser(email.value, password.value);

    if (result.success && result.data.token) {
      authStore.setToken(result.data.token);
      authStore.fetchUserInfo()
      router.push('/');
    } else {
      errorMessage.value = result.error;
    }
  } catch (error) {
    errorMessage.value = (error);
  }
};




const faceEnabled = ref(true);

const faceLoginOpen = ref(false);
const videoLoginRef = ref(null);
const streamRef = ref(null);
const loginLoading = ref(false);

function openFaceLogin() { faceLoginOpen.value = true; }
function closeFaceLogin() { stopCamera(); faceLoginOpen.value = false; }

async function startCamera() {
  streamRef.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  const v = videoLoginRef.value;
  v.srcObject = streamRef.value;

  // espera os metadados
  if (!(v.readyState >= 2 && v.videoWidth && v.videoHeight)) {
    await new Promise((resolve) => {
      v.onloadedmetadata = () => resolve();
    });
  }
  console.log('[FaceLogin] video ready', v.videoWidth, 'x', v.videoHeight);
}

function stopCamera() {
  streamRef.value?.getTracks()?.forEach(t => t.stop());
  streamRef.value = null;
}

async function loginFacial() {
  await faceStore.loadModelsOnce();
  openFaceLogin();
  await startCamera();
}

async function doFaceLogin() {
  loginLoading.value = true;
  try {
    const embedding = await faceStore.getOneGoodEmbedding(videoLoginRef.value);
    if (!embedding) throw new Error('Rosto não detectado.');

    console.log('[FaceLogin] emb typeof:', typeof embedding, 'isArray:', Array.isArray(embedding), 'len:', embedding?.length);

    const r = await faceStore.identify(embedding); // << só o embedding aqui
    if (r.success && r.data?.token) {
      authStore.setToken(r.data.token);
      await authStore.fetchUserInfo();
      closeFaceLogin();
      router.push('/');
    } else {
      errorMessage.value = r.error || 'Falha no reconhecimento. Use a senha.';
      closeFaceLogin();
    }
  } catch (e) {
    errorMessage.value = e.message || 'Erro na autenticação facial.';
    closeFaceLogin();
  } finally {
    loginLoading.value = false;
  }
}




onMounted(() => {
  if (authStore.isAuthenticated()) {
    router.push('/');
  } else {
    authStore.clearUser();
  }
});





onBeforeUnmount(() => stopCamera());
</script>
