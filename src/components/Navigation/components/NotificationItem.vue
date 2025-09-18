<!-- src/components/config/NotificationItem.vue -->
<template> 
    <div class="m-auto p-1 w-full flex group">
        <button
            class="flex w-full truncate justify-center rounded cursor-pointer duration-100 shadow-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-500 hover:text-gray-200">
            <RouterLink :to="notification?.link" class="m-auto flex justify-between w-full truncate">

                <!-- Imagem (quando houver) -->
                <div v-if="notification.image" class="w-24 h-16">
                    <img :src="notification.image" alt="" class="h-full w-full rounded-st object-cover" />
                </div> 
                <!-- Aniversário: usa notification.birth -->
                <div v-else-if="isBirthday && notification.birth"
                    class="date min-w-14 h-14 my-auto text-center flex flex-col justify-center text-md md:text-xl rounded-md font-semibold bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-400 dark:hover:bg-gray-600 dark:group-hover:bg-gray-500 text-gray-700 dark:text-gray-100">
                    <p class="day">{{ formatDay(notification.birth) }}</p>
                    <p class="month -mt-2">{{ formatMonth(notification.birth) }}</p>
                </div>

                <!-- Conteúdo -->
                <div class="flex flex-col w-full text-start p-2 truncate">
                    <h4 class="text-gray-800 dark:text-gray-100 -mb-1 font-semibold truncate">
                        {{ notification?.title }}
                    </h4>
                    <p class="text-xs truncate text-gray-500 dark:text-gray-300">
                        {{ notification?.type }}
                    </p>

                    <!-- Linha com data completa humanizada -->
                    <p class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatFull(notification?.date) }}
                    </p>
                </div>
            </RouterLink>
        </button>
    </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';
const props = defineProps({
    notification: { type: Object, required: true }
});

const isEvent = props.notification?.type === 'Evento';
const isBirthday = props.notification?.type === 'Aniversário';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const toDate = (d) => d instanceof Date ? d : new Date(d);

const formatDay = (d) => String(toDate(d).getDate()).padStart(2, '0');
const formatMonth = (d) => MONTHS[toDate(d).getMonth()];
const formatHourMin = (d) =>
    toDate(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatFull = (d) => {
    const dt = toDate(d);
    const date = dt.toLocaleDateString('pt-BR', { /* weekday: 'long',*/ day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${date} • ${time}`;
};
</script>
