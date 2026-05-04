<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const props = defineProps({
  autoplay: { type: Boolean, default: true },
  interval: { type: Number, default: 5000 },
  navigationButton: { type: Boolean, default: false },
  swipeThreshold: { type: Number, default: 50 }, // px para trocar de slide
});

const authStore = useAuthStore();
const banners = computed(() => authStore.banners || []);
const currentIndex = ref(0);
let timer = null;

const formatImageUrl = (url) =>
  url.replace('[[LARGURA]]', '700').replace('[[ALTURA]]', '1100');

// ── Navegação ──────────────────────────────────────
const next = () => {
  if (!banners.value.length) return;
  currentIndex.value = (currentIndex.value + 1) % banners.value.length;
};
const prev = () => {
  if (!banners.value.length) return;
  currentIndex.value = (currentIndex.value - 1 + banners.value.length) % banners.value.length;
};
function goTo(i) {
  currentIndex.value = i;
  startAutoplay();
}

// ── Autoplay ───────────────────────────────────────
function startAutoplay() {
  stopAutoplay();
  if (props.autoplay && banners.value.length > 1) {
    timer = setInterval(next, props.interval);
  }
}
function stopAutoplay() { if (timer) { clearInterval(timer); timer = null; } }

// ── Drag/swipe ─────────────────────────────────────
const trackEl = ref(null);
const dragging = ref(false);
const dragOffset = ref(0); // px de deslocamento durante o drag

let startX = 0;
let trackWidth = 0;

function pointerDown(e) {
  if (banners.value.length <= 1) return;
  dragging.value = true;
  startX = e.touches ? e.touches[0].clientX : e.clientX;
  trackWidth = trackEl.value?.offsetWidth || 0;
  stopAutoplay();
  document.body.style.userSelect = 'none';
}

function pointerMove(e) {
  if (!dragging.value) return;
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const delta = x - startX;
  // limita arrasto além das bordas (resistência)
  const isFirst = currentIndex.value === 0 && delta > 0;
  const isLast = currentIndex.value === banners.value.length - 1 && delta < 0;
  dragOffset.value = (isFirst || isLast) ? delta * 0.3 : delta;
}

function pointerUp() {
  if (!dragging.value) return;
  const delta = dragOffset.value;
  dragging.value = false;
  dragOffset.value = 0;
  document.body.style.userSelect = '';

  if (Math.abs(delta) >= props.swipeThreshold) {
    delta < 0 ? next() : prev();
  }
  startAutoplay();
}

// transform total: índice atual + offset do drag (em %)
const transformStyle = computed(() => {
  const basePct = -currentIndex.value * 100;
  if (dragging.value && trackWidth > 0) {
    const dragPct = (dragOffset.value / trackWidth) * 100;
    return { transform: `translateX(calc(${basePct}% + ${dragPct}%))`, transition: 'none' };
  }
  return { transform: `translateX(${basePct}%)` };
});

// ── Lifecycle ──────────────────────────────────────
onMounted(async () => {
  try {
    await authStore.getBanners();
    startAutoplay();
  } catch (e) {
    console.error('Erro ao carregar banners:', e);
  }
  // listeners globais para drag fora do componente
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  window.addEventListener('touchmove', pointerMove, { passive: true });
  window.addEventListener('touchend', pointerUp);
});

onBeforeUnmount(() => {
  stopAutoplay();
  window.removeEventListener('mousemove', pointerMove);
  window.removeEventListener('mouseup', pointerUp);
  window.removeEventListener('touchmove', pointerMove);
  window.removeEventListener('touchend', pointerUp);
});

watch(() => banners.value.length, (n) => {
  if (currentIndex.value >= n) currentIndex.value = 0;
  startAutoplay();
});
watch(() => props.autoplay, (v) => v ? startAutoplay() : stopAutoplay());
</script>

<template>
  <div class="relative w-full h-full overflow-hidden rounded-2xl shadow-overlay bg-surface-sunken select-none"
       @mouseenter="stopAutoplay" @mouseleave="startAutoplay">

    <!-- Loading state -->
    <div v-if="!banners.length"
      class="absolute inset-0 grid place-items-center text-ink-subtle">
      <div class="flex flex-col items-center gap-3">
        <div class="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin"></div>
        <p class="text-xs">Carregando...</p>
      </div>
    </div>

    <!-- Track arrastável -->
    <div ref="trackEl"
         class="flex h-full w-full transition-transform duration-700 ease-out-expo"
         :class="dragging ? 'cursor-grabbing' : (banners.length > 1 ? 'cursor-grab' : '')"
         :style="transformStyle"
         @mousedown.prevent="pointerDown"
         @touchstart.passive="pointerDown">

      <div v-for="banner in banners" :key="banner.imagem.nome"
           class="relative shrink-0 w-full h-full overflow-hidden">
        <a :href="banner.link.url"
           :target="banner.link.abertura === 'nova_pagina' ? '_blank' : '_self'"
           rel="noopener noreferrer"
           class="block w-full h-full"
           draggable="false"
           @click="dragging && $event.preventDefault()">
          <img :src="formatImageUrl(banner.imagem.url)"
               :alt="banner.texto || banner.imagem.nome"
               loading="lazy" draggable="false"
               class="w-full h-full object-cover pointer-events-none" />

          <div v-if="banner.texto"
               class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent
                      px-6 pt-12 pb-12 text-white">
            <p class="text-sm font-medium drop-shadow-md text-center">{{ banner.texto }}</p>
          </div>
        </a>
      </div>
    </div>

    <!-- Indicadores -->
    <div v-if="banners.length > 1"
      class="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
      <button v-for="(_, i) in banners" :key="`dot-${i}`"
        @click="goTo(i)"
        :class="[
          'h-1.5 rounded-full transition-all duration-300 ease-out-expo',
          currentIndex === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
        ]"
        :aria-label="`Ir para slide ${i + 1}`">
      </button>
    </div>

    <!-- Setas (opcional) -->
    <template v-if="navigationButton && banners.length > 1">
      <button @click="prev" aria-label="Anterior"
        class="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full grid place-items-center
               bg-black/30 text-white hover:bg-black/50 backdrop-blur transition">
        <i class="fas fa-chevron-left text-sm"></i>
      </button>
      <button @click="next" aria-label="Próximo"
        class="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full grid place-items-center
               bg-black/30 text-white hover:bg-black/50 backdrop-blur transition">
        <i class="fas fa-chevron-right text-sm"></i>
      </button>
    </template>
  </div>
</template>
