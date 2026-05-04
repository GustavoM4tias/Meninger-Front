// Composable: lógica de login facial (camera, captura, identificação).
// O componente que usa precisa passar o videoRef (template ref do <video>).

import { ref, nextTick, computed } from 'vue';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

export function useFaceLogin({ videoRef, onSuccess } = {}) {
  const faceStore = useFaceStore();
  const authStore = useAuthStore();

  const open = ref(false);
  const streamRef = ref(null);
  const ready = ref(false);
  const loading = ref(false);
  const error = ref('');
  const status = ref('idle'); // idle | opening | ready | validating | success | error

  const statusText = computed(() => ({
    opening: 'iniciando câmera...',
    ready: 'alinhe o rosto na moldura',
    validating: 'coletando frames e validando...',
    success: 'aprovado ✓',
    error: 'reprovado ✕',
  }[status.value] ?? 'aguardando...'));

  const statusPill = computed(() => ({
    success: 'APROVADO',
    error: 'REPROVADO',
    validating: 'VALIDANDO',
    ready: 'PRONTO',
    opening: 'INICIANDO',
  }[status.value] ?? 'AGUARDANDO'));

  function stopCamera() {
    try { streamRef.value?.getTracks()?.forEach(t => t.stop()); } catch { /* noop */ }
    streamRef.value = null;
    ready.value = false;
    const video = videoRef?.value;
    if (video) video.srcObject = null;
  }

  function close() {
    stopCamera();
    open.value = false;
    status.value = 'idle';
  }

  async function startCamera() {
    const video = videoRef?.value;
    if (!video) throw new Error('Video element não disponível.');
    streamRef.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    video.srcObject = streamRef.value;
    if (!(video.readyState >= 2 && video.videoWidth && video.videoHeight)) {
      await new Promise((resolve) => { video.onloadedmetadata = () => resolve(); });
    }
    ready.value = true;
    status.value = 'ready';
  }

  async function start() {
    error.value = '';
    loading.value = true;
    try {
      await faceStore.loadModelsOnce();
      open.value = true;
      ready.value = false;
      status.value = 'opening';
      // espera dois ticks: 1) modal abrir, 2) <video> ser montado
      await nextTick();
      await nextTick();
      await startCamera();
    } catch (err) {
      error.value = err?.message || 'Erro ao iniciar câmera.';
      status.value = 'error';
      close();
    } finally {
      loading.value = false;
    }
  }

  async function authenticate() {
    error.value = '';
    loading.value = true;
    status.value = 'validating';
    try {
      const video = videoRef?.value;
      if (!video) throw new Error('Câmera não inicializada.');

      const embedding = await faceStore.getAveragedEmbedding(video, 5);
      if (!embedding) {
        throw new Error('Rosto não detectado com qualidade suficiente. Melhore a iluminação e alinhe na moldura.');
      }

      const result = await faceStore.identify(embedding);
      if (result?.success && result?.data?.token) {
        authStore.setToken(result.data.token);
        await authStore.fetchUserInfo();
        status.value = 'success';
        await nextTick();
        setTimeout(() => onSuccess?.(), 350);
        return true;
      }
      status.value = 'error';
      error.value = result?.error || 'Falha no reconhecimento. Tente novamente ou use senha.';
      return false;
    } catch (err) {
      status.value = 'error';
      error.value = err?.message || 'Erro na autenticação facial.';
      return false;
    } finally {
      loading.value = false;
      if (status.value !== 'success' && ready.value) status.value = 'ready';
    }
  }

  return {
    open, ready, loading, error, status,
    statusText, statusPill,
    start, close, authenticate,
  };
}
