<script setup>
// Wrapper das páginas do Academy DENTRO do Office (usa a nav do OfficeShell).
// Replica o container padrão do Office (components/UI/PageContainer.vue, size xl)
// para o conteúdo ficar com o mesmo respiro/largura das demais telas do Office.
// O AcademyShell (nav própria do Academy) fica reservado ao host academy.* .
</script>

<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <router-view />
        </div>
    </div>
</template>
