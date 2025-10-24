<template>
  <!-- Container principal: colunas responsivas e linhas automáticas com altura mínima -->
  <section class="grid p-4 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 lg:grid-rows-4 auto-rows-[minmax(140px,auto)]
         lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-3.5rem)] overflow-hidden">
    <!-- HERO / Boas‑vindas + Em andamento (ocupar mais espaço) -->
    <div class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-6 lg:row-span-2 order-1">
      <div class="h-full flex flex-col">
        <p class="text-lg md:text-2xl font-semibold py-1 truncate">
          Olá<span v-if="authStore.user">, {{ authStore.user?.username }}</span>!
        </p>
        <div class="min-h-0 flex-1 flex">
          <div class="bg-gray-700/30 w-full flex overflow-hidden">
            <p class="m-auto text-2xl text-gray-400">Em Andamento</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Card da esquerda inferior (slot 2) -->
    <div
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-3 order-3 lg:order-2">
      <div class="h-full bg-gray-100 dark:bg-gray-800 p-4 overflow-hidden">
        <slot name="left-bottom">2</slot>
      </div>
    </div>

    <!-- Card do meio inferior (slot 3) -->
    <div
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:col-start-4 lg:row-start-3 order-4 lg:order-3">
      <ValidatorPanel />
    </div>

    <!-- Notificações (sidebar direita) -->
    <aside
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-3 lg:col-start-7 lg:row-start-1 order-2 lg:order-4 overflow-hidden">
      <p class="text-lg md:text-2xl font-semibold py-1 truncate text-end">
        Olá<span v-if="authStore.user">, {{ authStore.user?.username }}</span>!
      </p>
      <EventNotification class="h-full max-h-full overflow-y-auto filter drop-shadow-xl" />
    </aside>

    <!-- Carrossel (base da direita) -->
    <div class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-1 lg:col-start-7 lg:row-start-4 order-5">
      <EventCarrossel class="h-full duration-300 transform hover:scale-[101%] filter drop-shadow-xl overflow-hidden" />
    </div>
  </section>
</template>

<script setup>
import EventNotification from '@/components/Home/Notifications/EventNotification.vue'
import EventCarrossel from '@/components/Home/Events/EventCarrossel.vue'
import { useAuthStore } from '@/stores/Auth/authStore'
import ValidatorPanel from '@/components/Home/Validator/ValidatorPanel.vue'

const authStore = useAuthStore()
</script>

<!--
Notas de layout:
- A grade passa de 1 coluna (mobile) → 2 colunas (sm) → 8 colunas (lg).
- auto-rows cria linhas com altura mínima de 140px e expande conforme conteúdo.
- As ordens (order-*) garantem uma leitura natural no mobile: Hero → Notificações → blocos inferiores → Carrossel.
- No desktop (lg), usamos col-start/row-start para fixar as posições sem CSS customizado.
- Todos os cartões recebem bordas/rounded e mantêm consistência no tema dark.
-->
