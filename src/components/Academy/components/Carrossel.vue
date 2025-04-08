<template>
    <div
        class="relative bg-gray-400 bg-opacity-20 border border-gray-500 rounded-2xl p-2 sm:p-6 h-[25vh] sm:h-[50vh] overflow-hidden">
        <!-- Wrapper adicional para aplicar recorte com bordas arredondadas -->
        <div class="w-full h-full overflow-hidden rounded-2xl">
            <!-- Container das imagens com efeito de slide lateral -->
            <div class="flex transition-transform duration-500 ease-out h-full w-full"
                :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
                <div v-for="(img, index) in images" :key="index" class="flex-none w-full h-full">
                    <img :src="img" class="w-full h-full shadow-lg object-cover" alt="Imagem do carrossel" />
                </div>
            </div>
        </div>
        <!-- Indicadores -->
        <div class="absolute bottom-1.5 left-0 right-0 flex justify-center space-x-2">
            <button v-for="(img, index) in images" :key="index" @click="goTo(index)"
                class="w-3 h-3 rounded-full focus:outline-none"
                :class="index === currentIndex ? 'bg-blue-800' : 'bg-gray-400 opacity-50'">
            </button>
        </div>
    </div>
    <!-- Texto sobre a história -->
    <span
        class="bg-blue-900 absolute right-0 sm:-right-4 p-2 sm:p-3 px-4 sm:px-4 -bottom-5 rounded-lg shadow sm:text-lg font-semibold">
        Desde 1986
    </span>
    <span class="bg-blue-900 absolute left-0 p-2 sm:p-3 px-4 sm:px-4 top-5 rounded-lg shadow sm:text-lg font-semibold">
        Construindo Sonhos
    </span>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const images = [
    'https://www.menin.com.br/wp-content/uploads/2024/11/PISCINAS-1140x815.jpg',
    'https://www.menin.com.br/wp-content/uploads/2024/06/FACHADA-1-DON-ADHARA_6526995f3064a-1.jpg',
    'https://www.menin.com.br/wp-content/uploads/2024/04/drumond.jpg',
    'https://www.menin.com.br/wp-content/uploads/2024/05/Fachada_Mond_High.jpg',
    'https://www.menin.com.br/wp-content/uploads/2024/06/drone-concept-carrossel-1.jpeg'
]

const currentIndex = ref(0)
let intervalId = null

const nextSlide = () => {
    currentIndex.value = (currentIndex.value + 1) % images.length
}

const goTo = (index) => {
    currentIndex.value = index
}

onMounted(() => {
    intervalId = setInterval(nextSlide, 3000)
})

onUnmounted(() => {
    clearInterval(intervalId)
})
</script>