<template>
    <div class="bg-gray-300 dark:bg-gray-800 flex flex-col px-4 md:px-8 h-[calc(100%-4rem)] w-full">

        <div class="bg-gray-200 dark:bg-gray-600 m-auto w-5/6 lg:w-2/6 rounded-xl shadow-xl p-6">
            <AccountForm />
        </div>

    </div>
</template>

<script setup>
import AccountForm from '../components/auth/AccountForm.vue'

</script>
