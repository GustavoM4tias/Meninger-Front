<template>
    <div class="relative px-3 md:px-5">
        <!-- Botão de notificações -->
        <button id="notificationDropdownButton" data-dropdown-toggle="notificationDropdown"
            class="relative text-3xl text-gray-600 dark:text-gray-200 focus:outline-none" type="button">
            <i class="far fa-bell"></i>
            <i v-if="notificationStore.notifications.length > 0"
                class="fas fa-circle text-sm text-red-500 absolute -top-1 -right-1 fa-bounce slow-animation"></i>
        </button>

        <!-- Dropdown de notificações -->
        <div id="notificationDropdown"
            class="z-20 hidden w-72 max-h-72 overflow-y-auto bg-white dark:bg-gray-700 divide-y divide-gray-100 rounded-lg shadow">
            <div v-if="notificationStore.notifications.length > 0"
                class="py-2 text-sm text-gray-700 dark:text-gray-200">
                <div v-for="(notification, index) in notificationStore.notifications" :key="index"
                    class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                    <NotificationItem :notification="notification" />
                </div>
            </div>
            <div v-else class="px-4 py-4 text-center text-gray-700 dark:text-gray-300 text-sm">
                Sem Notificações
            </div>
        </div>
    </div>
</template>


<script setup>
import { onMounted } from 'vue';
import NotificationItem from './NotificationItem.vue';
import { useNotificationStore } from '@/stores/Config/notificationStore';

const notificationStore = useNotificationStore();

onMounted(() => {
    notificationStore.fetchNotifications();
});
</script>
