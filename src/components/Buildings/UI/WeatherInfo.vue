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
  <div class="w-fit">
    <div v-if="weather" class="relative group">
      <!-- Ícone do tempo -->
      <div v-if="weatherIcon" class="flex justify-center items-center cursor-pointer">
        <i :class="weatherIcon" class="text-6xl text-blue-50 drop-shadow"></i>
      </div>

      <!-- Tooltip bonito e clean -->
      <div class="absolute -left-12 bottom-full -translate-x-1/2 mb-3 hidden group-hover:flex flex-col items-center gap-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-lg rounded-lg px-4 py-3 w-52 text-sm z-50">
        <p class="text-xl font-semibold text-center">{{ weatherText }}</p>

        <div class="flex items-center justify-center gap-2 text-lg">
          <i :class="weatherTemperature" class="text-xl"></i>
          <span>{{ city }}, <strong>{{ weather.temperature }}°C</strong></span>
        </div>

        <p class="text-center text-sm">
          {{ formattedTime.charAt(0).toUpperCase() + formattedTime.slice(1) }}.
        </p>

        <p class="text-center text-sm">
          Ventos de <strong>{{ weather?.windspeed.toFixed(0) }}Km/h</strong>.
        </p>
      </div>
    </div>
  </div>
</template>

  