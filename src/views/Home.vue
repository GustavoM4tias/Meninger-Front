<template>

  <div class="flex px-4 h-12 w-full justify-between items-end">
    <p class="text-lg md:text-2xl font-semibold truncate">
      Olá<span v-if="authStore.user">, {{ authStore.user?.username }}</span>!
    </p>

    <p class="text-lg text-end md:text-xl font-semibold truncate">
      Faltam {{ remaining.days }} dias, {{ remaining.hours }} horas, {{ remaining.minutes }} minutos e {{
        remaining.seconds }} segundos! 
    </p>
  </div>

  <main class="grid p-4 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 lg:grid-rows-4 auto-rows-[minmax(140px,auto)]
         lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-6.5rem)] overflow-hidden">

    <div class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-6 lg:row-span-2 order-1">
      <div class="h-full flex flex-col">
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
      <LeadsPanel class="shadow-lg" />
    </div>

    <!-- Card do meio inferior (slot 3) -->
    <div
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:col-start-4 lg:row-start-3 order-4 lg:order-3">
      <ValidatorPanel class="shadow-lg" />
    </div>

    <!-- Notificações (sidebar direita) -->
    <aside
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:col-start-7 lg:row-start-1 order-2 lg:order-4 overflow-hidden">
      <EventNotification class="h-full overflow-y-auto " />
    </aside>

    <!-- Carrossel (base da direita) -->
    <div class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:col-start-7 lg:row-start-3 order-5">
      <EventCarrossel />
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import EventNotification from '@/components/Home/Notifications/EventNotification.vue'
import EventCarrossel from '@/components/Home/Events/EventCarrossel.vue'
import { useAuthStore } from '@/stores/Auth/authStore'
import ValidatorPanel from '@/components/Home/Validator/ValidatorPanel.vue'
import LeadsPanel from '@/components/Home/Leads/LeadsPanel.vue'

const authStore = useAuthStore()

const now = ref(new Date())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => clearInterval(timer))

// Próximo mês (início)
const endOfMonth = computed(() => new Date(now.value.getFullYear(), now.value.getMonth() + 1, 1, 0, 0, 0))

const remaining = computed(() => {
  const diff = endOfMonth.value - now.value
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

  const sec = 1000
  const min = 60 * sec
  const hour = 60 * min
  const day = 24 * hour

  const days = Math.floor(diff / day)
  const hours = Math.floor((diff % day) / hour)
  const minutes = Math.floor((diff % hour) / min)
  const seconds = Math.floor((diff % min) / sec)

  return { days, hours, minutes, seconds }
})
</script>

<!--
Notas de layout:
- A grade passa de 1 coluna (mobile) → 2 colunas (sm) → 8 colunas (lg).
- auto-rows cria linhas com altura mínima de 140px e expande conforme conteúdo.
- As ordens (order-*) garantem uma leitura natural no mobile: Hero → Notificações → blocos inferiores → Carrossel.
- No desktop (lg), usamos col-start/row-start para fixar as posições sem CSS customizado.
- Todos os cartões recebem bordas/rounded e mantêm consistência no tema dark.
-->
