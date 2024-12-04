<script setup>
import { ref } from 'vue';
import UsersList from '../../components/users/usersList.vue';
import UserModal from '../../components/users/userModal.vue';

const editableUser = ref(null); 
</script>

<template>
  <div class="bg-gray-300 dark:bg-gray-800">
    <UsersList />
    <!-- Modal -->
    <UserModal v-if="editableUser" />
  </div>
</template>
