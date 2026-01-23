<script setup>
</script>

<template>
    <footer id="footer" class="bg-gray-950 text-gray-100 pt-10 pb-4">
        <div class="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            <div>
                <a href="https://www.menin.com.br/" target="_blank" rel="noopener noreferrer"><img src="/Mlogotext.png"
                        class="w-40 mb-4"></a>
                <p class="text-sm text-gray-500 w-11/12">
                    A Menin esta oferecendo de maneira gratuita o treinamento para plataforma de CRM interna,
                    capacitando os profissionais na sua utilização, em caso de dúvidas entre em
                    contato com nosso Departamento Pessoal.
                </p>
            </div>

            <div class="md:block hidden"></div>

            <div>
                <h3 class="text-xl font-semibold mb-3 md:text-end">Navegação</h3>
                <ul class="space-y-1 text-lg text-gray-400 md:text-end">
                    <li>
                        <a href="#home" class="hover:text-blue-400 transition-colors duration-200">Home</a>
                    </li>
                    <li>
                        <a href="#cursos" class="hover:text-blue-400 transition-colors duration-200">Cursos</a>
                    </li>
                    <li>
                        <a href="#sobre" class="hover:text-blue-400 transition-colors duration-200">Sobre</a>
                    </li>
                    <li>
                        <a href="/certificados"
                            class="hover:text-blue-400 transition-colors duration-200">Certificados</a>
                    </li>
                </ul>
            </div>

            <div>
                <h3 class="text-xl font-semibold mb-3 md:text-end">Siga-nos</h3>
                <ul class="flex space-x-4 md:justify-end">
                    <li>
                        <a href="https://www.facebook.com/meninengenhariaa/" target="_blank" rel="noopener noreferrer"
                            class="hover:text-blue-400 transition-colors duration-200">
                            <i class="fab fa-facebook text-[28px]"></i>
                        </a>
                    </li>
                    <li>
                        <a href="https://www.instagram.com/meninengenharia/" target="_blank" rel="noopener noreferrer"
                            class="transition-colors duration-200 ">
                            <i
                                class="fab fa-instagram text-3xl bg-white hover:bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#feda77] bg-clip-text text-transparent"></i>
                        </a>
                    </li>
                    <li>
                        <a href="https://www.tiktok.com/@meninengenharia?_t=ZM-8vMUB8qf1tf&_r=1" target="_blank"
                            rel="noopener noreferrer" class="hover:text-white transition-colors duration-200">
                            <i
                                class="fab fa-tiktok text-[28px] transition hover:[filter:drop-shadow(1px_1px_0_rgba(255,0,80,1))_drop-shadow(-1px_-1px_0_rgba(0,242,234,1))]"></i>
                        </a>

                    </li>
                    <li>
                        <a href="https://www.linkedin.com/company/menin-engenharia/posts/?feedView=all" target="_blank"
                            rel="noopener noreferrer" class="hover:text-blue-500 transition-colors duration-200">
                            <i class="fab fa-linkedin text-3xl"></i>
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <div class="container mx-auto px-4 mt-8 border-t border-gray-700 pt-4">
            <div class="flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
                <p>&copy; {{ new Date().getFullYear() }} Menin. Todos os direitos reservados.</p>
                <a href="https://www.gdmd.com.br" target="_blank" rel="noopener noreferrer">
                    <p class="flex">Desenvolvido por
                        <!-- <img class="h-6 w-4 ms-1 -mt-1" src="/gd.png"> -->
                    </p>
                </a>
            </div>

        </div>
    </footer>
</template>