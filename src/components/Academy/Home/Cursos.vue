<template>
    <main class="bg-gray-100 pt-10 pb-14" id="cursos">
        <section class="flex flex-col items-center justify-center py-6 text-center">
            <h2 class="text-4xl sm:text-5xl text-blue-900 font-bold py-2">Nossos Cursos</h2>
            <p class="text-gray-500 w-5/6 sm:w-3/6 sm:text-lg">Capacitação especializada para profissionais do
                mercado
                imobiliário, com foco em resultados e excelência na utilização de nossas plataformas internas.</p>
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
                                class="whitespace-nowrap m-auto mb-0 me-0 px-4 py-2 font-semibold rounded-md border border-gray-100 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-300">
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
                                class="whitespace-nowrap m-auto mb-0 me-0 px-4 py-2 font-semibold rounded-md border border-gray-100 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-300">
                                Saiba Mais <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    </main>
</template>
