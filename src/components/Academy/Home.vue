<script setup lang="ts">
import DataCounter from './dataCounter.vue';

</script>

<template>

    <body>
        <main class="relative h-screen w-screen">
            <img class="absolute inset-0 h-full w-full object-cover" style="object-position: 20% 60%;"
                src="https://www.menin.com.br/wp-content/uploads/2024/12/urban_esmeraldas.jpg" />
            <div
                class="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-950/30 to-transparent pointer-events-none">
            </div>

            <!-- Conteúdo (header) com z-index maior -->
            <main class="absolute top-0 left-0 w-screen h-screen z-10">
                <section class="flex flex-col sm:flex-row h-full justify-center items-center container m-auto p-3">

                    <section class="w-full sm:ps-8 sm:w-6/12">
                        <div class="space-y-2 pb-4">
                            <h1 class="text-6xl sm:text-7xl font-extrabold text-gray-100 drop-shadow">
                                Menin <br> Academy
                            </h1>
                            <p class="sm:text-xl w-6/6 sm:w-4/6 text-gray-300 drop-shadow">Transforme seu potencial em
                                resultado com nossos cursos especializados para corretores e
                                imobiliárias.</p>
                        </div>
                        <div class="text-sm sm:text-lg space-x-2 sm:space-x-3 font-semibold">
                            <a href="#cursos"
                                class="px-4 py-2 rounded-md text-gray-100 hover:text-gray-200 bg-blue-950 hover:bg-blue-900 transition-color duration-300 shadow-md hover:shadow-lg">
                                Conhecer Cursos <i class="fas ps-1 fa-arrow-right"></i>
                            </a>
                            <button
                                class="px-4 py-2 rounded-md text-blue-800 hover:text-blue-900 bg-gray-100 hover:bg-gray-200 transition-color duration-300 shadow-md hover:shadow-lg">
                                Sobre a Menin
                            </button>
                        </div>
                    </section>

                    <article class="w-full sm:w-6/12 relative py-5 sm:ps-5">
                        <figure
                            class="flex bg-gray-400 bg-opacity-20 border border-gray-500 rounded-2xl p-3 sm:p-6   sm:h-[70%]">
                            <img class="rounded-2xl w-full shadow-lg object-cover"
                                src="https://www.menin.com.br/wp-content/uploads/2024/06/FACHADA-1-DON-ADHARA_6526995f3064a-1.jpg">
                        </figure>
                        <span
                            class="bg-blue-900 absolute right-0 sm:-right-4 p-2 sm:p-4 px-4 sm:px-6 bottom-1 rounded-lg shadow sm:text-lg font-semibold">Desde
                            1986</span>
                    </article>

                </section>
            </main>
        </main>

        <main class="bg-gray-100 pt-10 pb-14" id="cursos">
            <section class="flex flex-col items-center justify-center py-6 text-center">
                <h2 class="text-4xl sm:text-5xl text-blue-900 font-bold py-2">Nossos Cursos</h2>
                <p class="text-gray-500 w-5/6 sm:w-3/6 sm:text-lg">Capacitação especializada para profissionais do
                    mercado
                    imobiliário, com foco em resultados e excelência na utilização de nossas plataformas.</p>
            </section>

            <section class="w-full flex flex-col sm:flex-row gap-4 container m-auto">
                <div class="w-full sm:w-6/12 p-5">
                    <div
                        class="card group relative h-96 rounded-2xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,.3)] hover:shadow-[6px_6px_12px_rgba(0,0,0,.4)] duration-300">
                        <img class="absolute inset-0 h-full w-full object-cover"
                            src="https://www.menin.com.br/wp-content/uploads/2024/06/Objeto-Inteligente-de-Vetor.jpg">
                        <div class="absolute inset-0 pointer-events-none">
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent transition-opacity duration-300 group-hover:opacity-0">
                            </div>
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            </div>
                        </div>

                        <!-- Conteúdo (header) com z-index maior -->
                        <section class="absolute flex flex-col justify-between top-0 left-0 w-full h-full z-10 p-5">
                            <h2 class="text-2xl sm:text-4xl font-semibold">Corretores</h2>
                            <div class="flex w-full">
                                <p class="relative text-md sm:text-xl w-9/12">Aprenda as principais funcionalidades de
                                    corretor do
                                    nosso CRM em
                                    um mini curso, e saia apto para vender Menin.</p>
                                <button
                                    class="whitespace-nowrap m-auto mb-0 me-0 px-4 py-2 rounded-md border border-gray-100 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-300">
                                    Saiba Mais <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
                <div class="w-full sm:w-6/12 p-5">
                    <div
                        class="card group relative h-96 rounded-2xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,.3)] hover:shadow-[6px_6px_12px_rgba(0,0,0,.4)] duration-300">
                        <img class="absolute inset-0 h-full w-full object-cover"
                            src="https://www.menin.com.br/wp-content/uploads/2024/03/2147831963.jpg">
                        <div class="absolute inset-0 pointer-events-none">
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent transition-opacity duration-300 group-hover:opacity-0">
                            </div>
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            </div>
                        </div>
                        <!-- Conteúdo (header) com z-index maior -->
                        <section class="absolute flex flex-col justify-between top-0 left-0 w-full h-full z-10 p-5">
                            <h2 class="text-2xl sm:text-4xl font-semibold">Imobiliárias</h2>
                            <div class="flex w-full">
                                <p class="relative text-md sm:text-xl w-9/12">Aprenda as principais funcionalidades para
                                    imobiliárias do nosso CRM em
                                    um mini curso, e saia apto para administrar suas vendas Menin.</p>
                                <button
                                    class="whitespace-nowrap m-auto mb-0 me-0 px-4 py-2 rounded-md border border-gray-100 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-300">
                                    Saiba Mais <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </main>

        <main class="bg-gray-200 pt-10 pb-14" id="sobre">
            <section class="flex flex-col items-center justify-center py-6 text-center">
                <h2 class="text-4xl sm:text-5xl text-blue-900 font-bold py-2">Sobre a Menin</h2>
                <p class="text-gray-500 w-5/6 sm:w-3/6 sm:text-lg">Especialistas em construir sonhos</p>
            </section>

            <section class="w-full flex flex-col sm:flex-row gap-4 container m-auto">
                <div class="flex flex-col sm:flex-row justify-end space-y-6 sm:space-x-6 w-full sm:w-6/12 sm:p-5">
                    <div
                        class="card group relative h-96 w-72 rounded-2xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,.3)] hover:shadow-[6px_6px_12px_rgba(0,0,0,.4)] duration-300 m-auto sm:m-0">
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
                            <h2 class="text-2xl sm:text-4xl font-semibold"></h2> <!-- Texto topo -->
                            <div class="flex flex-col w-full">
                                <p class="text-xl font-semibold pb-1"><i class="fas fa-location-dot pe-2"></i>Marília -
                                    SP</p>
                                <p class="relative text-xs sm:text-sm text-justify">Ponto estratégico no interior de São
                                    Paulo, refletindo nossa capacidade de atuação diversificada e abrangente.</p>
                            </div>
                        </section>
                    </div>
                    <div
                        class="card group relative h-96 w-72 rounded-2xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,.3)] hover:shadow-[6px_6px_12px_rgba(0,0,0,.4)] duration-300 m-auto sm:m-0">
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
                            <h2 class="text-2xl sm:text-4xl font-semibold"></h2> <!-- Texto topo -->
                            <div class="flex flex-col w-full">
                                <p class="text-xl font-semibold pb-1"><i class="fas fa-location-dot pe-2"></i>São Paulo
                                    - SP</p>
                                <p class="relative text-xs sm:text-sm text-justify">Coração financeiro e cultural do
                                    Brasil, onde planejamos e gerenciamos nossos projetos mais ambiciosos.</p>
                            </div>
                        </section>
                    </div>
                </div>
                <div class="w-full sm:w-6/12 p-5">
                    <div class="text space-y-3">
                        <h3 class="text-3xl text-gray-900 font-semibold">Desde 1986, a Menin se destaca no mercado da
                            construção
                            civil, entregando mais do que apenas obras: entregamos sonhos.</h3>
                        <p class="text-gray-500 sm:text-lg">Com mais de 3.000.000m² construídos e 80.000 unidades
                            entregues, nossa jornada é marcada pela dedicação à excelência, inovação e um compromisso
                            inabalável com a qualidade.</p>
                    </div>
                    <div class="data py-4">
                        <DataCounter />
                    </div>
                </div>
            </section>
        </main>

        <main class="bg-gray-100 pt-10 pb-14" id="institucional">
            <section class="flex flex-col items-center justify-center">
                <iframe class="rounded-xl shadow-lg h-[10.1rem] w-72 sm:h-96 sm:w-[682px]" 
                    src="https://www.youtube.com/embed/xOzLAuwffHc?start=1&rel=0&modestbranding=1&showinfo=0&controls=1"
                    title="YouTube video player" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            </section>
        </main>
    </body>
</template>