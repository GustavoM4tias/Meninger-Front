<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
onMounted(() => router.replace({ name: 'AcademyCommunityType', params: { type: 'questions' } }));
</script>

<template>
    <div />
</template>
