<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

import EventNotification from '@/components/Home/Notifications/EventNotification.vue'
import EventCarrossel from '@/components/Home/Events/EventCarrossel.vue'
import { useAuthStore } from '@/stores/Settings/Auth/authStore'
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore'
import ValidatorPanel from '@/components/Home/Validator/ValidatorPanel.vue'
import LeadsPanel from '@/components/Home/Leads/LeadsPanel.vue' 
import WeatherInfo from '@/components/Home/WeatherInfo.vue'

const authStore = useAuthStore()
const buildingStore = useBuildingStore()

const now = ref(new Date())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => clearInterval(timer))

// carrega clima assim que tiver cidade (user pode carregar depois)
watch(
  () => authStore.user?.city,
  async (city) => {
    if (!city) {
      buildingStore.weather = null
      return
    }
    await buildingStore.getWeatherByCity(city)
  },
  { immediate: true }
)

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

<template>
  <div class="flex md:flex-row flex-col px-4 md:h-20 w-full justify-between items-end">
    <p class="text-2xl w-full font-semibold truncate h-full mt-2 md:mt-0 md:-mb-4 flex items-center">
      Olá<span v-if="authStore.user">, {{ authStore.user?.username }}</span>!
    </p>

    <WeatherInfo v-if="authStore.user" :weather="buildingStore.weather?.current_weather ?? buildingStore.weather"
      :city="authStore.user.city" />
  </div>

  <main class="grid px-4 py-2 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 lg:grid-rows-4 auto-rows-[minmax(140px,auto)]
         lg:h-[calc(100vh-9rem)] overflow-hidden">

    <div class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-6 lg:row-span-2 order-1">
      <div class="h-full flex flex-col">
        <div class="min-h-0 flex-1 flex">
          <div class="bg-gray-700/30 w-full flex overflow-hidden">
            <p class="m-auto text-2xl text-gray-400">Em Andamento</p>
          </div>
        </div>
      </div>
    </div>

    <div
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-3 order-3 lg:order-2">
      <LeadsPanel class="shadow-lg" />
    </div>

    <div
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:col-start-4 lg:row-start-3 order-4 lg:order-3">
      <ValidatorPanel class="shadow-lg" />
    </div>

    <aside
      class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:col-start-7 lg:row-start-1 order-2 lg:order-4 overflow-hidden">
      <EventNotification class="h-full flex flex-1 overflow-y-auto" />
    </aside>

    <div class="min-h-0 col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:col-start-7 lg:row-start-3 order-5">
      <EventCarrossel />
    </div>
  </main>
</template>
