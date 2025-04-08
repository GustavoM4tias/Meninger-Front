<script setup>

</script>

<template>
    <header class="absolute top-0 left-0 w-screen">
        <div class="bg-gradient-to-b from-black/40 via-black/20 to-transparent">
            <main class="flex h-20 ps-4 sm:ps-0 pb-4 justify-between container m-auto">
                <router-link to="/academy"><img class="pt-2 h-20" src="/Mlogotext.png"></router-link>

                <nav class="sm:flex hidden space-x-8 items-center text-2xl text-gray-200">
                    <router-link class="hover:text-white" to="/academy/corretor">Corretores</router-link>
                    <router-link class="hover:text-white" to="/academy/imobiliaria">Imobiliárias</router-link>
                    <!-- <router-link class="hover:text-white" to="/">Certificados</router-link> -->
                    <a class="hover:text-white bg-blue-950 px-3 py-1 rounded-lg shadow-[inset_-2px_-2px_4px_rgba(255,255,255,.05),inset_2px_2px_4px_rgba(0,0,0,.2),-2px_-2px_6px_rgba(255,255,255,.1),_2px_2px_6px_rgba(0,0,0,.3)] transition duration-300 hover:shadow-[inset_-2px_-2px_6px_rgba(255,255,255,.1),inset_2px_2px_4px_rgba(0,0,0,.2),-3px_-3px_8px_rgba(255,255,255,.1),_3px_3px_6px_rgba(0,0,0,.2)]"
                         href="#cursos">Cadastrar</a>
                </nav>
            </main>
        </div>
    </header>
</template>