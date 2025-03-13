<!-- UserList.vue -->
<script setup>
const props = defineProps({
  users: {
    type: Array,
    required: true
  },
  startEditing: {
    type: Function,
    required: true
  }
});
</script>

<template>
  <ul v-if="users.length">
    <li v-for="user in users" :key="user.id">
      <div class="relative bg-gray-200 dark:bg-gray-600 flex justify-between items-center lg:mx-48 m-4 rounded-2xl p-4 md:px-8 shadow">

        <p class="absolute top-3.5 left-0 w-14 md:w-20 rounded-br-3xl rounded-tr-sm text-gray-900 text-center text-xs md:text-base font-semibold" :class="{ 'bg-green-400 dark:bg-green-500': user.status === 1, 'bg-red-400 dark:bg-red-500': user.status === 0 }">{{ user.status === 1 ? 'Ativo' : 'Inativo' }}</p> 

        <div class="infos flex items-center py-1 overflow-hidden">
          <div class="profile-img flex bg-gray-400 rounded-full min-w-12 h-12 md:w-16 md:h-16 text-xl md:text-3xl m-auto overflow-hidden shadow">
            <p class="text-gray-100 m-auto">{{ user?.username?.split(" ").slice(0, 2).map(name => name[0].toUpperCase()).join("") }}</p>
          </div>
          <div class="infos-user ms-2 md:ms-5 min-w-0 absolute left-16 md:left-24 w-[calc(100%-7rem)] md:w-[calc(100%-14rem)]">
            <p class="text-gray-800 dark:text-gray-100 text-lg md:text-2xl font-semibold truncate">{{ user.username }}</p>
            <p class="text-gray-700 dark:text-gray-200 text-sm md:text-xl truncate">{{ user.email }}</p>
            <p v-if="user.city" class="text-gray-600 dark:text-gray-300 text-sm md:text-lg truncate">{{ user.city }} - {{ user.position }}</p>
          </div>
        </div>
        <i class="fas fa-pen text-gray-500 dark:text-gray-300 text-xl md:text-3xl filter drop-shadow cursor-pointer" @click="startEditing(user)"></i>
      </div>
    </li>
  </ul>
</template>
