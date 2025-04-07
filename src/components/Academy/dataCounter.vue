<script setup>
import { ref, onMounted } from 'vue'

// Refs que armazenam os valores (0 até o valor final)
const countUnidades = ref(0)
const countAnos = ref(0)
const countM2 = ref(0)
const countCidades = ref(0)

// Refs para vincular no DOM (usados pelo Intersection Observer)
const targetUnidades = ref(null)
const targetAnos = ref(null)
const targetM2 = ref(null)
const targetCidades = ref(null)

/**
 * Função para animar o valor de 'start' até 'end' em 'duration' ms
 * usando requestAnimationFrame.
 */
function animateValue(counterRef, start, end, duration) {
    let startTimestamp = null

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp
        const progress = Math.min((timestamp - startTimestamp) / duration, 1)
        // Calcula o valor atual com base no progresso
        counterRef.value = Math.floor(progress * (end - start) + start)
        // Se ainda não chegou a 100% do tempo, continua animando
        if (progress < 1) {
            window.requestAnimationFrame(step)
        }
    }

    window.requestAnimationFrame(step)
}

/**
 * Cria um IntersectionObserver que, ao ver o elemento, inicia a animação.
 */
function createObserver(element, finalValue, counterRef) {
    if (!element) return

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Anima de 0 até o valor final em 2 segundos (2000ms)
                animateValue(counterRef, 0, finalValue, 2000)
                // Para de observar (evita reiniciar a animação toda vez que rolar)
                obs.unobserve(entry.target)
            }
        })
    })

    observer.observe(element)
}

// Quando o componente montar, iniciamos os observers
onMounted(() => {
    createObserver(targetUnidades.value, 80, countUnidades) 
    const anosExperiencia = new Date().getFullYear() - (1986 + 1) // +1 por conta do 0
    createObserver(targetAnos.value, anosExperiencia, countAnos)
    createObserver(targetM2.value, 3000000, countM2)
    createObserver(targetCidades.value, 50, countCidades)
})

</script>

<template>
    <div class="data grid grid-cols-1 sm:grid-cols-2 gap-8">
        <!-- Unidades entregues -->
        <div ref="targetUnidades" class="text-center">
            <p class="text-5xl font-black text-blue-900">+ {{ countUnidades }} MIL</p>
            <span class="text-gray-600">unidades entregues</span>
        </div>

        <!-- Anos de experiência -->
        <div ref="targetAnos" class="text-center">
            <p class="text-5xl font-black text-blue-900">+ {{ countAnos }} anos</p>
            <span class="text-gray-600">de experiência</span>
        </div>

        <!-- M² construídos -->
        <div ref="targetM2" class="text-center">
            <p class="text-5xl font-black text-blue-900">+ {{ countM2.toLocaleString() }}</p>
            <span class="text-gray-600">m² construídos</span>
        </div>

        <!-- Cidades de atuação -->
        <div ref="targetCidades" class="text-center">
            <p class="text-5xl font-black text-blue-900">+ {{ countCidades }}</p>
            <span class="text-gray-600">cidades de atuação</span>
        </div>
    </div>
</template>
