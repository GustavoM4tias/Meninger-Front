<template>
  <div class="banner-carousel relative w-full h-full overflow-hidden rounded filter drop-shadow-lg">
    <!-- Indicadores -->
    <div class="absolute bottom-4 left-0 right-0 flex justify-center z-10">
      <div v-for="(_, index) in banners" :key="`dot-${index}`" class="mx-1">
        <button @click="currentIndex = index" :class="[
          'w-3 h-3 rounded-full transition-all duration-300',
          currentIndex === index ? 'bg-blue-500 w-6' : 'bg-gray-300 hover:bg-gray-400'
        ]" :aria-label="`Ir para slide ${index + 1}`"></button>
      </div>
    </div>

    <!-- Setas de navegação -->
    <div v-if="props.navigationButton">
      <i @click="prevSlide"
        class="fas fa-chevron-left absolute cursor-pointer text-3xl hover:text-4xl left-4 top-1/2 transform -translate-y-1/2 drop-shadow-md z-10 transition-all duration-200"
        aria-label="Slide anterior">
      </i>

      <i @click="nextSlide"
        class="fas fa-chevron-right absolute cursor-pointer text-3xl hover:text-4xl right-4 top-1/2 transform -translate-y-1/2 drop-shadow-md z-10 transition-all duration-200"
        aria-label="Próximo slide">
      </i>
    </div>

    <!-- Container do carrossel com a animação horizontal original -->
    <div class="carousel-track flex transition-transform duration-500 ease-in-out h-full w-full"
      :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <div v-for="banner in banners" :key="banner.imagem.nome" class="carousel-slide">
        <a :href="banner.link.url" :target="banner.link.abertura === 'nova_pagina' ? '_blank' : '_self'"
          rel="noopener noreferrer" class="slide-link">
          <img :src="formatImageUrl(banner.imagem.url)" :alt="banner.texto || banner.imagem.nome" class="slide-image"
            loading="lazy" />
          <div v-if="banner.texto" class="slide-text">
            {{ banner.texto }}
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

// Props
const props = defineProps({
  autoplay: {
    type: Boolean,
    default: true
  },
  interval: {
    type: Number,
    default: 5000
  },
  navigationButton: {
    type: Boolean,
    default: true
  },
});

const authStore = useAuthStore();
const banners = computed(() => authStore.banners || []);
const currentIndex = ref(0);
let autoplayTimer = null;

// Função para formatar a URL da imagem, substituindo os marcadores
const formatImageUrl = (url) => {
  // Usar proporções adequadas para ocupar todo o espaço disponível
  // Valores maiores para garantir cobertura total em diferentes tamanhos de tela
  return url
    .replace('[[LARGURA]]', '700')
    .replace('[[ALTURA]]', '1100');
};

// Navegação de slides
const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % banners.value.length;
  resetAutoplay();
};

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + banners.value.length) % banners.value.length;
  resetAutoplay();
};

// Gerenciar autoplay
const startAutoplay = () => {
  if (props.autoplay && banners.value.length > 1) {
    stopAutoplay(); // Limpa o timer existente primeiro
    autoplayTimer = setInterval(nextSlide, props.interval);
  }
};

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
};

const resetAutoplay = () => {
  if (props.autoplay) {
    stopAutoplay();
    startAutoplay();
  }
};

// Buscar banners quando o componente é montado
onMounted(async () => {
  try {
    await authStore.getBanners();
    startAutoplay();
  } catch (error) {
    console.error('Erro ao carregar banners:', error);
  }
});

// Pausar autoplay quando o componente é desmontado
onBeforeUnmount(() => {
  stopAutoplay();
});

// Reiniciar autoplay se a prop autoplay mudar
watch(() => props.autoplay, (newValue) => {
  if (newValue) {
    startAutoplay();
  } else {
    stopAutoplay();
  }
});

// Atualizar o intervalo se a prop interval mudar
watch(() => props.interval, () => {
  if (props.autoplay) {
    resetAutoplay();
  }
});

// Observar mudanças nos banners
watch(() => banners.value.length, (newLength) => {
  if (newLength > 0) {
    // Reiniciar o índice se estiver fora do intervalo válido
    if (currentIndex.value >= newLength) {
      currentIndex.value = 0;
    }
    resetAutoplay();
  }
});
</script>

<style scoped>
.banner-carousel {
  touch-action: pan-y;
  width: 100%;
  height: 100%;
  position: relative;
}

.carousel-track {
  width: 100%;
  height: 100%;
}

.carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.slide-link {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.slide-text {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 1rem;
}

/* Adicionar animação de fade para os controles */
button {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

button:hover {
  opacity: 1;
}
</style>