<script setup>
import Nav from '@/components/Academy/Nav.vue'; 
import Footer from '@/components/Academy/Footer.vue'; 
import Home from '@/components/Academy/Home/Home.vue';
import Cursos from '@/components/Academy/Home/Cursos.vue';
import Sobre from '@/components/Academy/Home/Sobre.vue';
import Institucional from '@/components/Academy/Home/Institucional.vue';
</script>

<template>
    <Nav class="z-20" />
    <Home />
    <Cursos />
    <Sobre />
    <Institucional />
    <Footer />
</template>