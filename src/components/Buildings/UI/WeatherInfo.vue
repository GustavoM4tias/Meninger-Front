<script setup>
import { computed } from 'vue';

const props = defineProps({
    weather: {
        type: Object,
        default: null, // Permite valores nulos inicialmente
    },
    city: {
        type: String,
        required: true,
    },
});

// Ícones do clima baseados no código da API
const weatherIcons = {
    0: {
        day: "fas fa-sun", // Dia
        night: "fas fa-moon", // Noite
        text: "Céu Limpo"
    },
    1: {
        day: "fas fa-cloud-sun", // Dia
        night: "fas fa-cloud-moon", // Noite
        text: "Poucas Nuvens"
    },
    2: {
        day: "fas fa-cloud", // Dia
        night: "fas fa-cloud-moon", // Noite
        text: "Nublado"
    },
    3: {
        day: "fas fa-cloud-sun-rain", // Dia
        night: "fas fa-cloud-moon-rain", // Noite
        text: "Céu Encoberto"
    },
    61: {
        day: "fas fa-cloud-rain", // Dia
        night: "fas fa-cloud-rain", // Noite
        text: "Chuva Leve"
    },
    95: {
        day: "fas fa-cloud-showers-heavy", // Dia
        night: "fas fa-cloud-showers-heavy", // Noite
        text: "Tempestade"
    }
};

// Computed para selecionar o ícone com base no código do clima
const weatherIcon = computed(() => {
    if (!props.weather) return null;
    const weatherCode = props.weather.weathercode;
    const isDay = props.weather.is_day === 1;

    if (weatherIcons[weatherCode]) {
        return isDay ? weatherIcons[weatherCode].day : weatherIcons[weatherCode].night;
    }
    return null;
});

// Computed para selecionar o texto com base no código do clima
const weatherText = computed(() => {
    if (!props.weather) return '';
    if (weatherIcons[props.weather.weathercode]) {
        return weatherIcons[props.weather.weathercode].text;
    }
    return '';
});


const weatherTemperature = computed(() => {
    if (!props.weather || !props.weather.temperature) return null;

    const temperature = props.weather.temperature;

    if (temperature <= 5) {
        return "fas fa-temperature-empty"; // Ícone de neve ou frio
    } else if (temperature > 5 && temperature <= 15) {
        return "fas fa-temperature-quarter"; // Ícone de frio
    } else if (temperature > 15 && temperature <= 25) {
        return "fas fa-temperature-half"; // Ícone de clima ameno
    } else if (temperature > 25 && temperature <= 35) {
        return "fas fa-temperature-three-quarters"; // Ícone de clima quente
    } else {
        return "fas fa-temperature-full"; // Ícone de calor extremo
    }
});

// Função para formatar a data para o horário de Brasília e o dia da semana
const formatDateToBrasilia = (dateString) => {
    const date = new Date(dateString); // Cria um objeto Date a partir da string

    // Ajusta a hora para o fuso horário de Brasília (subtrai 3 horas)
    date.setHours(date.getHours() - 3); // Subtrai 3 horas

    // Define o fuso horário para o Brasil
    const options = {
        weekday: 'long', // Nome do dia da semana
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo', // Fuso horário de Brasília
    };

    // Formata a data
    const formattedDate = date.toLocaleString('pt-BR', options);

    return formattedDate; // Retorna o horário com a hora correta, ajustado para Brasília
};

// Computed para formatar a data no formato desejado
const formattedTime = computed(() => {
    if (props.weather && props.weather.time) {
        return formatDateToBrasilia(props.weather.time);
    }
    return '';
});
</script>

<template>
    <div class="w-16">
      <div v-if="weather" class="relative group inline-block">
        <!-- Elemento que ativa o tooltip -->
        <div v-if="weatherIcon" class="icon flex items-end cursor-pointer">
          <i class="text-6xl filter drop-shadow-sm text-gray-50" :class="weatherIcon"></i>
        </div>
  
        <!-- Tooltip/modal -->
        <div class="absolute -translate-x-1/2 bottom-full mb-2 hidden group-hover:block dark:bg-gray-800 dark:text-gray-200 bg-gray-200 text-gray-600 text-sm rounded-xl px-4 py-3 shadow-lg z-60" >
          <div v-if="weatherIcon" class="icon flex items-end">
            <i class="text-5xl" :class="weatherIcon"></i>
            <p class="text-xl ms-2">{{ weatherText }}</p>
          </div>
  
          <div class="flex flex-col text-center mt-2">
            <div class="flex items-center">
              <i class="me-1 text-3xl" :class="weatherTemperature"></i>
              <p class="text-xl">
                {{ city }}, <strong>{{ weather.temperature }}°C</strong>
              </p>
            </div>
            <p class="text-lg">
              {{ formattedTime.charAt(0).toUpperCase() + formattedTime.slice(1) }}.
            </p>
            <p class="text-sm">Ventos de <strong>{{ weather?.windspeed.toFixed(0) }}Km/h.</strong></p>
          </div>
        </div>
      </div>
    </div>
  </template>
  