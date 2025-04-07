<script setup>
import Nav from '@/components/Academy/Nav.vue'; 
import Footer from '@/components/Academy/Footer.vue'; 
</script>

<template>
    <Nav class="z-20" />
    <RouterView id="academy" />   
    <Footer />
</template>