<script setup>
import { computed } from 'vue'

const props = defineProps({
    weather: { type: Object, default: null },
    city: { type: String, required: true },
})

// Normaliza caso venha { current_weather: {...} }
const w = computed(() => props.weather?.current_weather ?? props.weather ?? null)

// Mapeamento básico Open-Meteo
const weatherMap = {
    0: { day: 'fas fa-sun', night: 'fas fa-moon', text: 'Céu limpo' },
    1: { day: 'fas fa-cloud-sun', night: 'fas fa-cloud-moon', text: 'Poucas nuvens' },
    2: { day: 'fas fa-cloud', night: 'fas fa-cloud', text: 'Nublado' },
    3: { day: 'fas fa-cloud', night: 'fas fa-cloud', text: 'Encoberto' },
    61: { day: 'fas fa-cloud-rain', night: 'fas fa-cloud-rain', text: 'Chuva leve' },
    63: { day: 'fas fa-cloud-showers-heavy', night: 'fas fa-cloud-showers-heavy', text: 'Chuva' },
    65: { day: 'fas fa-cloud-showers-heavy', night: 'fas fa-cloud-showers-heavy', text: 'Chuva forte' },
    95: { day: 'fas fa-bolt', night: 'fas fa-bolt', text: 'Tempestade' },
}

const code = computed(() => w.value?.weathercode ?? null)
const isDay = computed(() => (w.value?.is_day ?? 1) === 1)
const temperature = computed(() =>
    typeof w.value?.temperature === 'number'
        ? Math.round(w.value.temperature)
        : null
)

const wind = computed(() =>
    typeof w.value?.windspeed === 'number'
        ? Math.round(w.value.windspeed)
        : null
)

const weatherText = computed(() => {
    if (code.value == null) return ''
    return weatherMap[code.value]?.text ?? 'Condição climática'
})

const weatherIcon = computed(() => {
    if (code.value == null) return 'fas fa-cloud'
    const item = weatherMap[code.value]
    if (!item) return 'fas fa-cloud'
    return isDay.value ? item.day : item.night
})

const iconColor = computed(() => {
    if (code.value === 0) return 'text-yellow-400'
    if (code.value === 95) return 'text-amber-300'
    if ([61, 63, 65].includes(code.value)) return 'text-sky-300'
    return 'text-slate-200'
})

/* ================================
   FRASES CORPORATIVAS (VARIAÇÕES)
================================ */

const headline = computed(() => {
    if (!w.value) return ''

    const temp = temperature.value ?? 0

    if (code.value === 0 && isDay.value)
        return 'Ótimo dia para avançar nas negociações.'

    if (code.value === 0 && !isDay.value)
        return 'Noite tranquila para organizar resultados.'

    if ([1, 2].includes(code.value))
        return 'Clima favorável para visitas e reuniões.'

    if (code.value === 3)
        return 'Bora focar em produtividade.'

    if ([61, 63].includes(code.value))
        return 'Boa oportunidade para contatos remotos.'

    if (code.value === 65)
        return 'Por hoje, priorize atendimentos internos.'

    if (code.value === 95)
        return 'Planejamento estratégico é o recomendado.'

    if (temp >= 30)
        return 'Mantenha o ritmo e hidratação.'

    if (temp <= 12)
        return 'Organização e planejamento são prioridade.'

    return 'Acompanhe o desempenho do dia.'
})

const subtitle = computed(() => {
    if (!w.value) return ''

    const parts = [
        props.city,
        temperature.value != null ? `${temperature.value}°C` : null,
        weatherText.value,
        // wind.value != null ? `Vento ${wind.value} km/h` : null,
    ].filter(Boolean)

    return parts.join(' • ')
})
</script>


<template>
    <div class="w-fit max-w-full">
        <div v-if="w" class="flex items-center justify-between gap-6 my-2">
            <!-- Texto -->
            <div class="min-w-0 text-end">
                <p class="dark:text-gray-200 text-xl md:text-2xl px-1 font-semibold truncate">
                    {{ headline }}
                    <i :class="[weatherIcon, iconColor]" class="text-2xl md:text-3xl drop-shadow" />
                </p>

                 <p class="dark:text-slate-300 text-xs px-1 md:text-sm truncate">
                    {{ subtitle }}
                </p>  
            </div>

        </div>
    </div>
</template>