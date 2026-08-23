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
    if (code.value === 0) return 'text-data-warn'
    if (code.value === 95) return 'text-data-warn'
    if ([61, 63, 65].includes(code.value)) return 'text-accent'
    return 'text-ink'
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
    <div v-if="w" class="group relative w-fit">
        <!-- Chip compacto -->
        <button type="button"
            class="flex items-center gap-2 px-3 h-9 rounded-xl bg-surface-raised border border-line
                   hover:border-accent/40 hover:bg-surface-sunken transition-colors cursor-default">
            <i :class="[weatherIcon, iconColor]" class="text-base shrink-0"></i>
            <span class="text-sm font-semibold text-ink whitespace-nowrap" v-if="temperature != null">{{ temperature }}°C</span>
            <span class="text-ink-subtle">·</span>
            <span class="text-sm text-ink-muted whitespace-nowrap truncate max-w-[9rem]">{{ city }}</span>
        </button>

        <!-- Modal ao hover -->
        <div class="pointer-events-none absolute right-0 top-full mt-2 w-64 z-50
                    opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                    focus-within:opacity-100 transition-all duration-150 ease-out">
            <div class="bg-surface-overlay border border-line rounded-xl shadow-overlay overflow-hidden text-left">
                <!-- Cabeçalho -->
                <div class="flex items-center gap-3 px-4 py-3 border-b border-line
                            bg-gradient-to-br from-surface-raised to-surface-sunken">
                    <i :class="[weatherIcon, iconColor]" class="text-2xl shrink-0"></i>
                    <div class="min-w-0">
                        <p class="text-lg font-semibold text-ink leading-none">
                            <span v-if="temperature != null">{{ temperature }}°C</span>
                            <span v-else>--</span>
                        </p>
                        <p class="text-xs text-ink-muted truncate mt-1">{{ city }}</p>
                    </div>
                </div>
                <!-- Detalhes -->
                <div class="px-4 py-3 space-y-2 text-sm">
                    <div class="flex items-center justify-between">
                        <span class="text-ink-muted flex items-center gap-1.5">
                            <i class="fas fa-cloud text-[11px] text-ink-subtle"></i> Condição
                        </span>
                        <span class="text-ink font-medium">{{ weatherText || '—' }}</span>
                    </div>
                    <div v-if="wind != null" class="flex items-center justify-between">
                        <span class="text-ink-muted flex items-center gap-1.5">
                            <i class="fas fa-wind text-[11px] text-ink-subtle"></i> Vento
                        </span>
                        <span class="text-ink font-medium">{{ wind }} km/h</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-ink-muted flex items-center gap-1.5">
                            <i class="fas fa-clock text-[11px] text-ink-subtle"></i> Período
                        </span>
                        <span class="text-ink font-medium">{{ isDay ? 'Dia' : 'Noite' }}</span>
                    </div>
                </div>
                <!-- Frase corporativa -->
                <div v-if="headline" class="px-4 py-2.5 border-t border-line bg-surface-sunken/50">
                    <p class="text-xs text-ink-muted italic leading-snug">{{ headline }}</p>
                </div>
            </div>
        </div>
    </div>
</template>