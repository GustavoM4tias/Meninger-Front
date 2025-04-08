<script setup>
import DataCounter from '@/components/Academy/components/dataCounter.vue';

</script>

<template>
    <main class="bg-gray-200 pt-10 pb-14" id="sobre">
        <section class="flex flex-col items-center justify-center py-6 text-center">
            <h2 class="text-4xl sm:text-5xl text-blue-900 font-bold py-2">Sobre a Menin</h2>
            <p class="text-gray-500 w-5/6 sm:w-3/6 sm:text-lg">Especialistas em construir sonhos</p>
        </section>

        <section class="w-full flex flex-col lg:flex-row gap-4 container m-auto">
            <div class="flex flex-col lg:flex-row justify-end space-y-6 lg:space-x-6 w-full lg:w-6/12 lg:p-5">
                <div
                    class="card group relative h-96 w-72 rounded-2xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,.3)] hover:shadow-[6px_6px_12px_rgba(0,0,0,.4)] duration-300 m-auto lg:m-0">
                    <img class="absolute inset-0 h-full w-full object-cover"
                        src="https://www.menin.com.br/wp-content/uploads/2024/02/menin.jpeg">
                    <div class="absolute inset-0 pointer-events-none">
                        <div
                            class="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/60 to-transparent transition-opacity duration-300 group-hover:opacity-0">
                        </div>
                        <div
                            class="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-blue-950/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        </div>
                    </div>

                    <!-- Conteúdo (header) com z-index maior -->
                    <section class="absolute flex flex-col justify-between top-0 left-0 w-full h-full z-10 p-5">
                        <h2 class="text-2xl lg:text-4xl font-semibold"></h2> <!-- Texto topo -->
                        <div class="flex flex-col w-full">
                            <p class="text-xl font-semibold pb-1"><i class="fas fa-location-dot pe-2"></i>Marília -
                                SP</p>
                            <p class="relative text-xs lg:text-sm text-justify">Ponto estratégico no interior de São
                                Paulo, refletindo nossa capacidade de atuação diversificada e abrangente.</p>
                        </div>
                    </section>
                </div>
                <div
                    class="card group relative h-96 w-72 rounded-2xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,.3)] hover:shadow-[6px_6px_12px_rgba(0,0,0,.4)] duration-300 m-auto lg:m-0">
                    <img class="absolute inset-0 h-full w-full object-cover"
                        src="https://ryazbek.com.br/wp-content/uploads/2020/01/004.jpg">
                    <div class="absolute inset-0 pointer-events-none">
                        <div
                            class="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/60 to-transparent transition-opacity duration-300 group-hover:opacity-0">
                        </div>
                        <div
                            class="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-blue-950/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        </div>
                    </div>

                    <!-- Conteúdo (header) com z-index maior -->
                    <section class="absolute flex flex-col justify-between top-0 left-0 w-full h-full z-10 p-5">
                        <h2 class="text-2xl lg:text-4xl font-semibold"></h2> <!-- Texto topo -->
                        <div class="flex flex-col w-full">
                            <p class="text-xl font-semibold pb-1"><i class="fas fa-location-dot pe-2"></i>São Paulo
                                - SP</p>
                            <p class="relative text-xs lg:text-sm text-justify">Coração financeiro e cultural do
                                Brasil, onde planejamos e gerenciamos nossos projetos mais ambiciosos.</p>
                        </div>
                    </section>
                </div>
            </div>
            <div class="w-full lg:w-6/12 px-8 p-5">
                <div class="text space-y-3">
                    <h3 class="text-3xl text-gray-900 font-semibold">Desde 1986, a Menin se destaca no mercado da
                        construção
                        civil, entregando mais do que apenas obras: entregamos sonhos.</h3>
                    <p class="text-gray-500 lg:text-lg">Com mais de 3.000.000m² construídos e 80.000 unidades
                        entregues, nossa jornada é marcada pela dedicação à excelência, inovação e um compromisso
                        inabalável com a qualidade.</p>
                </div>
                <div class="data py-4">
                    <DataCounter />
                </div>
            </div>
        </section>
    </main>
</template>