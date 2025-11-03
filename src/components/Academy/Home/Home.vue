<script setup>
import Carrossel from '@/components/Carrossel.vue';
</script>

<template>
    <main class="relative h-screen w-screen" id="home">
        <img class="absolute inset-0 h-full w-full object-cover" style="object-position: 20% 60%;"
            src="https://www.menin.com.br/wp-content/uploads/2024/12/urban_esmeraldas.jpg" />
        <div
            class="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-950/30 to-transparent pointer-events-none">
        </div>
 
        <main class="absolute top-0 left-0 w-screen h-screen z-10">
            <section class="flex flex-col sm:flex-row h-full justify-center items-center container m-auto p-3">

                <section class="w-full px-2 pb-6 sm:pb-0 sm:ps-8 sm:w-6/12">
                    <div class="space-y-2 pb-4">
                        <h1 class="text-6xl sm:text-7xl font-extrabold text-gray-100 drop-shadow">
                            Menin <br> Academy
                        </h1>
                        <p class="sm:text-xl w-6/6 sm:w-4/6 text-gray-300 drop-shadow">Transforme seu potencial em
                            resultado com nossos mini cursos especializados para utilização do CRM.</p>
                    </div>
                    <div class="text-sm sm:text-lg space-x-2 sm:space-x-3 font-semibold">
                        <a href="#cursos"
                            class="px-4 py-2 rounded-md text-gray-100 hover:text-gray-200 bg-blue-950 hover:bg-blue-900 transition-color duration-300 shadow-md hover:shadow-lg">
                            Conhecer Cursos <i class="fas ps-1 fa-arrow-right"></i>
                        </a>
                        <a href="#sobre"
                            class="px-4 py-2 rounded-md text-blue-800 hover:text-blue-900 bg-gray-100 hover:bg-gray-200 transition-color duration-300 shadow-md hover:shadow-lg">
                            Sobre a Menin
                        </a>
                    </div>
                </section>

                <article class="w-full sm:w-6/12 relative pt-10 sm:ps-5"> 
                    <Carrossel />
                </article>

            </section>
        </main>
    </main>
</template>