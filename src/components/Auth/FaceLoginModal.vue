<script setup>
import { ref, computed, watch } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import { useFaceLogin } from './composables/useFaceLogin';

const props = defineProps({
  open: { type: Boolean, default: false },
  onSuccess: { type: Function, default: null },
});

const emit = defineEmits(['update:open', 'close']);

// template ref do <video> — precisa existir antes do composable usar
const videoEl = ref(null);

const face = useFaceLogin({
  videoRef: videoEl,
  onSuccess: () => props.onSuccess?.(),
});

watch(() => props.open, async (v) => {
  if (v) await face.start();
  else face.close();
});

function close() {
  face.close();
  emit('update:open', false);
  emit('close');
}

const statusBarClass = computed(() => ({
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  validating: 'bg-accent',
}[face.status.value] ?? 'bg-line'));

const frameBorderClass = computed(() => ({
  success: 'border-emerald-400',
  error: 'border-red-400',
  validating: 'border-accent',
}[face.status.value] ?? 'border-white/60 dark:border-white/35'));

const frameLineClass = computed(() => ({
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  validating: 'bg-accent',
}[face.status.value] ?? 'bg-white/60'));

const glowClass = computed(() => ({
  success: 'shadow-[0_0_0_2px_rgba(16,185,129,0.30)]',
  error: 'shadow-[0_0_0_2px_rgba(239,68,68,0.30)]',
  validating: 'shadow-[0_0_0_2px_rgba(59,130,246,0.30)]',
}[face.status.value] ?? ''));
</script>

<template>
  <Modal :open="open" size="md" @close="close">
    <template #header>
      <div>
        <h2 class="text-base font-semibold text-ink">Autenticação facial</h2>
        <p class="text-xs text-ink-muted mt-0.5">Siga as instruções para validar.</p>
      </div>
    </template>

    <div class="-m-5">
      <!-- status bar -->
      <div class="h-1 w-full transition-colors duration-200" :class="statusBarClass"></div>

      <div class="p-5 space-y-4">
        <div class="rounded-lg border border-line bg-surface-sunken p-3">
          <p class="text-xs font-semibold text-ink mb-2">Como alinhar o rosto</p>
          <ul class="text-xs text-ink-muted space-y-1 list-disc pl-4">
            <li>Centralize o rosto dentro da <b>moldura oval</b>.</li>
            <li>Mantenha os <b>olhos na linha</b> horizontal indicada.</li>
            <li>Fique a ~<b>40–60 cm</b> da câmera e com boa luz.</li>
            <li>Evite óculos escuros, bonés e movimento rápido.</li>
          </ul>
        </div>

        <div class="relative rounded-xl overflow-hidden border border-line bg-black" :class="glowClass">
          <video ref="videoEl" autoplay playsinline muted class="w-full aspect-video"></video>
          <div class="pointer-events-none absolute inset-0">
            <div class="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30"></div>
            <div class="absolute inset-0 grid place-items-center">
              <div class="relative">
                <div class="h-44 w-36 rounded-[999px] border-2 transition-colors duration-200" :class="frameBorderClass"></div>
                <div class="absolute left-1/2 top-[38%] -translate-x-1/2 w-44 h-px transition-colors duration-200" :class="frameLineClass"></div>
                <div class="absolute -left-2 top-1/2 -translate-y-1/2 h-10 w-px transition-colors duration-200" :class="frameLineClass"></div>
                <div class="absolute -right-2 top-1/2 -translate-y-1/2 h-10 w-px transition-colors duration-200" :class="frameLineClass"></div>
              </div>
            </div>
            <div class="absolute bottom-3 left-3 text-[11px] font-mono text-white/80">{{ face.statusText.value }}</div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-[11px] px-2 py-1 rounded-full border border-line bg-surface-sunken text-ink-muted">
            {{ face.statusPill.value }}
          </span>
          <div class="flex gap-2">
            <Button variant="outline" @click="close" :disabled="face.loading.value">Cancelar</Button>
            <Button :loading="face.loading.value" :disabled="!face.ready.value" @click="face.authenticate()">
              Confirmar
            </Button>
          </div>
        </div>

        <div v-if="face.error.value"
          class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ face.error.value }}
        </div>
      </div>
    </div>
  </Modal>
</template>
