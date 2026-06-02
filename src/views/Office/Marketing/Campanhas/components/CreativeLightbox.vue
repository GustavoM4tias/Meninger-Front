<script setup>
// Lightbox fullscreen pra preview do criativo de um ad:
//  - Imagem: zoom in
//  - Vídeo: <video> tag se temos URL .mp4 direta
//  - Fallback: thumbnail HD + link "Abrir no Facebook" (permalink ou Ad Library)
//
// Vídeos de ad (uploaded ao ad account) NÃO funcionam no iframe embed do
// Facebook — esses só funcionam pra videos publicados em Page. Aí o fallback
// é mostrar thumbnail + link.

import { ref, computed, watch } from 'vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    imageUrl: { type: String, default: null },
    videoUrl: { type: String, default: null },
    videoId: { type: String, default: null },
    videoPermalink: { type: String, default: null },
    title: { type: String, default: null },
    subtitle: { type: String, default: null },
});
const emit = defineEmits(['update:open']);

function close() { emit('update:open', false); }

const isVideo = computed(() => !!(props.videoUrl || props.videoId));
const videoFailed = ref(false);

watch(() => props.open, (v) => {
    if (v) videoFailed.value = false;     // reset ao abrir
});

function onVideoError() {
    console.warn('[lightbox] video falhou ao carregar — caindo no fallback');
    videoFailed.value = true;
}

const facebookLink = computed(() => {
    if (props.videoPermalink) return props.videoPermalink;
    if (props.videoId)        return `https://www.facebook.com/${props.videoId}`;
    return null;
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[100] bg-black/90 flex flex-col" @click.self="close">

    <header class="flex items-start gap-3 px-5 py-3 text-white shrink-0">
      <div class="flex-1 min-w-0">
        <h3 v-if="title" class="text-base font-medium leading-tight truncate">{{ title }}</h3>
        <p v-if="subtitle" class="text-xs text-white/60 mt-0.5 truncate">{{ subtitle }}</p>
      </div>
      <a v-if="facebookLink" :href="facebookLink" target="_blank" rel="noopener"
        class="text-xs text-white/70 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/20">
        <i class="fab fa-facebook"></i>Abrir no Facebook
      </a>
      <button @click="close" class="text-white/80 hover:text-white text-2xl leading-none p-1" aria-label="Fechar">
        <i class="fas fa-times"></i>
      </button>
    </header>

    <div class="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden" @click.self="close">

      <!-- Vídeo: tenta video tag direto -->
      <video v-if="isVideo && videoUrl && !videoFailed"
        :src="videoUrl"
        class="max-w-full max-h-full rounded-lg shadow-2xl bg-black"
        controls autoplay playsinline
        @error="onVideoError"
        @click.stop />

      <!-- Vídeo fallback: thumbnail + CTAs -->
      <div v-else-if="isVideo" class="max-w-2xl w-full text-center" @click.stop>
        <div class="rounded-xl overflow-hidden bg-surface border border-white/10 shadow-2xl">
          <div class="relative aspect-video bg-black flex items-center justify-center">
            <img v-if="imageUrl"
              :src="imageUrl"
              class="w-full h-full object-contain opacity-80"
              alt="Thumbnail do vídeo" />
            <div v-else class="text-white/30 text-5xl"><i class="fas fa-video"></i></div>
            <div class="absolute inset-0 flex items-center justify-center bg-black/30">
              <div class="text-center text-white px-4">
                <i class="fas fa-circle-exclamation text-4xl mb-2 text-amber-400"></i>
                <p class="font-medium">Vídeo não pode ser reproduzido aqui</p>
                <p class="text-xs text-white/70 mt-1 max-w-md">
                  Vídeos de anúncio do Facebook precisam ser abertos no Ads Manager
                  (este sistema só consegue exibir vídeos públicos).
                </p>
              </div>
            </div>
          </div>

          <div class="p-3 flex flex-wrap items-center justify-center gap-2 bg-surface-sunken/40">
            <a v-if="facebookLink" :href="facebookLink" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <i class="fab fa-facebook"></i>Abrir no Facebook
            </a>
            <a v-if="videoId" :href="`https://business.facebook.com/ads/library/?id=${videoId}`" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-white/20 text-white/80 hover:bg-white/10 text-sm transition-colors">
              <i class="fas fa-book"></i>Ad Library
            </a>
            <span class="text-[10px] text-white/40 font-mono px-2">video_id: {{ videoId }}</span>
          </div>
        </div>
      </div>

      <!-- Imagem -->
      <img v-else-if="imageUrl"
        :src="imageUrl"
        class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        alt="Creative preview"
        @click.stop />

      <div v-else class="text-white/60 text-center">
        <i class="fas fa-image text-6xl mb-3 block"></i>
        <p class="text-sm">Sem preview disponível</p>
      </div>
    </div>

    <div class="text-center text-white/40 text-xs pb-3 shrink-0">
      <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-white/80">Esc</kbd> ou clique fora pra fechar
    </div>
  </div>
</template>
