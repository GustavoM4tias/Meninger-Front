<!-- src/components/Auth/LoginForm.vue -->
<template>
  <form @submit.prevent="handleLogin" class="relative">
    <!-- ✅ select como antes (paths) -->
    <select v-model="loginType"
      class="absolute top-20 text-md bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-3 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer z-10">
      <option value="/">Office</option>
      <option value="/panel">Academy</option>
    </select>

    <p class="text-xl font-light uppercase my-2 text-gray-500 dark:text-gray-200">Acesse sua conta</p>
    <hr class="border-t border-gray-400 dark:border-gray-100 mb-10" />

    <Input class="my-6" v-model="email" type="email" placeholder="Email" required />
    <Input class="my-6" v-model="password" type="password" placeholder="Senha" required />

    <p class="text-sm -mt-3 mb-2 text-blue-500 underline cursor-pointer hover:text-blue-600">
      Esqueceu a Senha?
    </p>

    <Button type="submit" :disabled="loginLoading">
      {{ loginLoading ? 'Entrando...' : 'Login' }}
    </Button>

    <div v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</div>

    <hr class="border-t border-gray-400 dark:border-gray-100 mt-6" />

    <a @click="register()" class="text-sm mt-1 text-blue-500 cursor-pointer hover:text-blue-600">
      Não tem uma conta? Crie agora.
    </a>

    <div class="mt-4 flex gap-2 items-center">
      <Button v-if="faceEnabled" type="button" @click="loginFacial" :disabled="loginLoading">
        Entrar com o Face ID
      </Button>
    </div>

    <!-- FACE MODAL -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="faceLoginOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" tabindex="-1">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeFaceLogin" />

          <div
            class="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 dark:bg-gray-900/75 shadow-2xl backdrop-blur-xl overflow-hidden">
            <!-- header -->
            <div class="p-4 border-b border-black/5 dark:border-white/10 flex items-start justify-between">
              <div>
                <div class="text-sm font-semibold text-gray-900 dark:text-white">Autenticação facial</div>
                <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">Siga as instruções para validar.</div>
              </div>

              <button type="button"
                class="h-9 w-9 rounded-xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 transition"
                @click="closeFaceLogin" :disabled="loginLoading" aria-label="Fechar">
                <i class="fas fa-times text-gray-700 dark:text-gray-200"></i>
              </button>
            </div>

            <!-- status bar -->
            <div class="h-1.5 w-full transition-colors duration-200" :class="statusBarClass"></div>

            <!-- content -->
            <div class="p-4">
              <!-- instruções -->
              <div class="mb-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-100 mb-2">Como alinhar o rosto</div>
                <ul class="text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
                  <li>Centralize o rosto dentro da <b>moldura oval</b>.</li>
                  <li>Mantenha os <b>olhos na linha</b> horizontal indicada.</li>
                  <li>Fique a ~<b>40–60 cm</b> da câmera e com boa luz.</li>
                  <li>Evite óculos escuros, bonés e movimento rápido.</li>
                </ul>
              </div>

              <!-- video + overlay -->
              <div class="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black"
                :class="glowClass">
                <video ref="videoLoginRef" autoplay playsinline muted class="w-full aspect-video" />

                <!-- overlay clean -->
                <div class="pointer-events-none absolute inset-0">
                  <div class="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>

                  <!-- “forma de rosto” (muda cor) -->
                  <div class="absolute inset-0 grid place-items-center">
                    <div class="relative">
                      <!-- oval -->
                      <div class="h-44 w-36 rounded-[999px] border transition-colors duration-200"
                        :class="frameBorderClass"></div>

                      <!-- linha dos olhos -->
                      <div class="absolute left-1/2 top-[38%] -translate-x-1/2 w-44 h-px transition-colors duration-200"
                        :class="frameLineClass"></div>

                      <!-- marcadores laterais -->
                      <div class="absolute -left-2 top-1/2 -translate-y-1/2 h-10 w-px transition-colors duration-200"
                        :class="frameLineClass"></div>
                      <div class="absolute -right-2 top-1/2 -translate-y-1/2 h-10 w-px transition-colors duration-200"
                        :class="frameLineClass"></div>
                    </div>
                  </div>

                  <div class="absolute bottom-3 left-3 text-[11px] font-mono text-white/80">
                    {{ statusText }}
                  </div>
                </div>
              </div>

              <!-- ações -->
              <div class="mt-3 flex items-center justify-between gap-3">
                <div class="text-xs text-gray-600 dark:text-gray-300">
                  <span
                    class="font-mono px-2 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5">
                    {{ statusPill }}
                  </span>
                </div>

                <div class="flex gap-2">
                  <Button type="button" :disabled="loginLoading || !cameraReady" @click="doFaceLogin">
                    {{ loginLoading ? 'Validando...' : 'Confirmar' }}
                  </Button>
                  <Button outlined type="button" @click="closeFaceLogin" :disabled="loginLoading">
                    Cancelar
                  </Button>
                </div>
              </div>

              <div v-if="faceError" class="mt-3 text-sm text-red-500">
                {{ faceError }}
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </form>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { loginUser } from '@/utils/Auth/apiAuth';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

const authStore = useAuthStore();
const faceStore = useFaceStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');

/**
 * "/" = office root
 * "/panel" = academy panel (host academy)
 */
const loginType = ref('/');

const faceEnabled = ref(true);
const faceLoginOpen = ref(false);
const videoLoginRef = ref(null);
const streamRef = ref(null);

const loginLoading = ref(false);
const cameraReady = ref(false);

const faceError = ref('');
// idle | opening | ready | validating | success | error
const faceStatus = ref('idle');

function isLocal() {
  const h = window.location.hostname;
  return h === 'localhost' || h.endsWith('.localhost');
}

function resolveRedirectUrl(selectedPath) {
  const isAcademy = selectedPath === '/panel';

  if (isLocal()) {
    // ajuste se seu academy local estiver em outra porta
    if (isAcademy) return 'http://localhost:5174/panel';
    return 'http://localhost:5173/';
  }

  if (isAcademy) return 'https://academy.menin.com.br/panel';
  return 'https://office.menin.com.br/';
}

async function redirectAfterLogin() {
  closeFaceLogin();
  await nextTick();
  window.location.assign(resolveRedirectUrl(loginType.value));
}

/* login normal */
async function handleLogin() {
  errorMessage.value = '';
  loginLoading.value = true;

  try {
    const result = await loginUser(email.value, password.value);

    if (result?.success && result?.data?.token) {
      authStore.setToken(result.data.token);
      await authStore.fetchUserInfo();
      await redirectAfterLogin();
      return;
    }

    errorMessage.value = result?.error || 'Falha no login.';
  } catch (e) {
    errorMessage.value = e?.message || String(e) || 'Erro ao tentar login.';
  } finally {
    loginLoading.value = false;
  }
}

async function register() {
  toast.info('Solicite acesso a seu gestor.');
}

/* modal face */
function openFaceLogin() {
  faceError.value = '';
  cameraReady.value = false;
  faceStatus.value = 'opening';
  faceLoginOpen.value = true;
}

function stopCamera() {
  try {
    streamRef.value?.getTracks()?.forEach((t) => t.stop());
  } catch { }
  streamRef.value = null;
  cameraReady.value = false;
}

function closeFaceLogin() {
  stopCamera();
  faceLoginOpen.value = false;
  faceStatus.value = 'idle';
}

async function startCamera() {
  const v = videoLoginRef.value;
  if (!v) throw new Error('Video element não disponível.');

  streamRef.value = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false,
  });

  v.srcObject = streamRef.value;

  if (!(v.readyState >= 2 && v.videoWidth && v.videoHeight)) {
    await new Promise((resolve) => {
      v.onloadedmetadata = () => resolve();
    });
  }

  cameraReady.value = true;
  faceStatus.value = 'ready';
}

async function loginFacial() {
  faceError.value = '';
  loginLoading.value = true;

  try {
    await faceStore.loadModelsOnce();
    openFaceLogin();
    await nextTick();
    await startCamera();
  } catch (e) {
    faceError.value = e?.message || 'Erro ao iniciar câmera.';
    faceStatus.value = 'error';
    closeFaceLogin();
  } finally {
    loginLoading.value = false;
  }
}

async function doFaceLogin() {
  faceError.value = '';
  loginLoading.value = true;
  faceStatus.value = 'validating';

  try {
    const videoEl = videoLoginRef.value;
    if (!videoEl) throw new Error('Câmera não inicializada.');

    const embedding = await faceStore.getOneGoodEmbedding(videoEl);
    if (!embedding) throw new Error('Rosto não detectado. Alinhe na moldura.');

    const r = await faceStore.identify(embedding);

    if (r?.success && r?.data?.token) {
      authStore.setToken(r.data.token);
      await authStore.fetchUserInfo();

      faceStatus.value = 'success';
      await nextTick();

      setTimeout(() => {
        redirectAfterLogin();
      }, 350);

      return;
    }

    faceStatus.value = 'error';
    faceError.value = r?.error || 'Falha no reconhecimento. Tente novamente ou use senha.';
  } catch (e) {
    faceStatus.value = 'error';
    faceError.value = e?.message || 'Erro na autenticação facial.';
  } finally {
    loginLoading.value = false;
    if (faceStatus.value !== 'success') {
      if (cameraReady.value) faceStatus.value = 'ready';
    }
  }
}

/* UI computed */
const statusText = computed(() => {
  if (faceStatus.value === 'opening') return 'iniciando câmera...';
  if (faceStatus.value === 'ready') return 'alinhe o rosto na moldura';
  if (faceStatus.value === 'validating') return 'validando...';
  if (faceStatus.value === 'success') return 'aprovado ✓';
  if (faceStatus.value === 'error') return 'reprovado ✕';
  return 'aguardando...';
});

const statusPill = computed(() => {
  if (faceStatus.value === 'success') return 'APROVADO';
  if (faceStatus.value === 'error') return 'REPROVADO';
  if (faceStatus.value === 'validating') return 'VALIDANDO';
  if (faceStatus.value === 'ready') return 'PRONTO';
  if (faceStatus.value === 'opening') return 'INICIANDO';
  return 'AGUARDANDO';
});

const statusBarClass = computed(() => {
  if (faceStatus.value === 'success') return 'bg-green-500';
  if (faceStatus.value === 'error') return 'bg-red-500';
  if (faceStatus.value === 'validating') return 'bg-blue-500';
  return 'bg-gray-300 dark:bg-gray-700';
});

/* ✅ moldura muda cor */
const frameBorderClass = computed(() => {
  if (faceStatus.value === 'success') return 'border-green-400';
  if (faceStatus.value === 'error') return 'border-red-400';
  if (faceStatus.value === 'validating') return 'border-blue-400';
  return 'border-white/60 dark:border-white/35';
});

const frameLineClass = computed(() => {
  if (faceStatus.value === 'success') return 'bg-green-400';
  if (faceStatus.value === 'error') return 'bg-red-400';
  if (faceStatus.value === 'validating') return 'bg-blue-400';
  return 'bg-white/60';
});

/* glow leve (opcional, mas clean) */
const glowClass = computed(() => {
  if (faceStatus.value === 'success') return 'shadow-[0_0_0_2px_rgba(34,197,94,0.25)]';
  if (faceStatus.value === 'error') return 'shadow-[0_0_0_2px_rgba(239,68,68,0.25)]';
  if (faceStatus.value === 'validating') return 'shadow-[0_0_0_2px_rgba(59,130,246,0.25)]';
  return '';
});

/* evita push SPA e loops */
onMounted(() => {
  if (authStore.isAuthenticated()) {
    redirectAfterLogin();
    return;
  }
  authStore.clearUser();
});

onBeforeUnmount(() => {
  closeFaceLogin();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
