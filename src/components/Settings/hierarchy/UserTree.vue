<script setup>
import UserCard from './UserCard.vue';

defineProps({
    users: Array,
    managerId: Number
});
</script>

<template>
    <div class="flex flex-col items-center relative">
        <template v-for="user in users.filter(u => u.manager === managerId)" :key="user.id">
            <div class="relative flex flex-col items-center">
                <UserCard :user="user" />
                <div v-if="users.some(u => u.manager === user.id)" class="w-px bg-blue-500 h-6"></div>
            </div>
            <div class="flex mt-4 space-x-4 relative">
                <div v-if="users.some(u => u.manager === user.id)"
                    class="absolute top-0 left-0 right-0 h-px bg-blue-500"></div>
                <UserTree :users="users" :managerId="user.id" />
            </div>
        </template>
    </div>
</template>