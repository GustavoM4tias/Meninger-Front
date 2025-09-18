<!-- src/components/Events/EventModal.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import EditEventModal from './EditEventModal.vue';
import { deleteEvent } from '../../utils/Event/apiEvents';
import { useAuthStore } from '../../stores/Auth/authStore';

const authStore = useAuthStore();

const props = defineProps({
  event: { type: Object, required: true },
});
const emit = defineEmits(['close']);

const isEditModalOpen = ref(false);
const imagemAtual = ref(0);
const isDropdownOpen = ref(false);
const isDeleting = ref(false);

const closeModal = () => emit('close');
const openEditModal = () => { isEditModalOpen.value = true; isDropdownOpen.value = false; };

const excluirEvento = async () => {
  const confirmar = confirm('Você tem certeza que deseja excluir este evento?');
  if (confirmar) {
    isDeleting.value = true;
    try {
      await deleteEvent(props.event.id);
      closeModal();
    } catch (e) {
      console.error('Erro ao excluir evento:', e);
    } finally {
      isDeleting.value = false;
    }
  }
  isDropdownOpen.value = false;
};

const imagemTotal = computed(() => props.event?.images?.length || 0);
const hasMultipleImages = computed(() => imagemTotal.value > 1);

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatTime = (dateString) =>
  new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const isEventPast = computed(() => new Date(props.event.event_date) < new Date());

const proximo = () => { imagemAtual.value = (imagemAtual.value + 1) % imagemTotal.value; };
const anterior = () => { imagemAtual.value = (imagemAtual.value - 1 + imagemTotal.value) % imagemTotal.value; };
const goToImage = (i) => { imagemAtual.value = i; };

const handleKeydown = (e) => {
  if (e.key === 'Escape') closeModal();
  else if (e.key === 'ArrowLeft' && hasMultipleImages.value) anterior();
  else if (e.key === 'ArrowRight' && hasMultipleImages.value) proximo();
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
});
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="closeModal">
    <div
      class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
      <!-- Header Actions -->
      <div class="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div class="relative">
          <button @click="isDropdownOpen = !isDropdownOpen"
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            <i class="fas fa-ellipsis-vertical"></i>
          </button>
          <div v-if="isDropdownOpen"
            class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 z-30"
            @click.stop>
            <button @click="openEditModal"
              class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors rounded-t-xl">
              <i class="fas fa-edit text-blue-500"></i>
              <span class="text-gray-700 dark:text-gray-200">Editar Evento</span>
            </button>
            <button @click="excluirEvento" :disabled="isDeleting"
              class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl">
              <i class="fas fa-trash text-red-500" :class="{ 'fa-spin fa-spinner': isDeleting }"></i>
              <span class="text-red-600 dark:text-red-400">{{ isDeleting ? 'Excluindo...' : 'Excluir Evento' }}</span>
            </button>
          </div>
        </div>

        <button @click="closeModal"
          class="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Image TOP -->
      <div class="relative bg-gray-900">
        <div class="relative h-64 md:h-96">
          <img :src="event.images?.[imagemAtual] || '/noimg.jpg'" :alt="event.title"
            class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

          <!-- Title + tags on image -->
          <div class="absolute bottom-4 left-4 right-4">
            <h1 class="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-2xl">
              {{ event.title }}
            </h1>
            <div v-if="event.tags?.length" class="flex flex-wrap gap-2">
              <span v-for="tag in event.tags" :key="tag"
                class="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/30">
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Carousel controls -->
          <button v-if="hasMultipleImages" @click="anterior"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
            aria-label="Imagem anterior">
            <i class="fas fa-chevron-left text-white"></i>
          </button>
          <button v-if="hasMultipleImages" @click="proximo"
            class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
            aria-label="Próxima imagem">
            <i class="fas fa-chevron-right text-white"></i>
          </button>

          <!-- Indicators -->
          <div v-if="hasMultipleImages" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            <button v-for="(img, i) in event.images" :key="i" @click="goToImage(i)"
              :class="['w-2.5 h-2.5 rounded-full', imagemAtual === i ? 'bg-white' : 'bg-white/50 hover:bg-white/80']" />
          </div>
        </div>
      </div>

      <!-- INFO BELOW -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-16rem)] md:max-h-[calc(90vh-24rem)] space-y-6">
        <!-- status -->
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-calendar-alt text-white"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Detalhes do Evento</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ isEventPast ? 'Evento finalizado' : 'Evento ativo' }}
            </p>
          </div>
        </div>

        <!-- Data e horário -->
        <div
          class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4">
          <div class="flex items-center gap-3 mb-2">
            <i class="fas fa-calendar text-blue-500"></i>
            <h3 class="font-semibold text-gray-900 dark:text-white">Data e Horário</h3>
          </div>
          <p class="text-gray-700 dark:text-gray-300 capitalize">{{ formatDate(event.event_date) }}</p>
          <p class="text-gray-600 dark:text-gray-400">{{ formatTime(event.event_date) }}</p>
        </div>

        <!-- Descrição -->
        <div v-if="event.description" class="space-y-2">
          <div class="flex items-center gap-3">
            <i class="fas fa-align-left text-gray-500"></i>
            <h3 class="font-semibold text-gray-900 dark:text-white">Descrição</h3>
          </div>
          <p class="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            {{ event.description }}
          </p>
        </div>

        <!-- Localização -->
        <div v-if="event.address" class="space-y-2">
          <div class="flex items-center gap-3">
            <i class="fas fa-map-marker-alt text-red-500"></i>
            <h3 class="font-semibold text-gray-900 dark:text-white">Localização</h3>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
            <div v-if="event.address.street" class="flex items-center gap-2">
              <i class="fas fa-road text-gray-400 text-sm"></i>
              <span class="text-gray-700 dark:text-gray-300">
                {{ event.address.street }}<span v-if="event.address.number">, {{ event.address.number }}</span>
              </span>
            </div>
            <div v-if="event.address.neighborhood" class="flex items-center gap-2">
              <i class="fas fa-map text-gray-400 text-sm"></i>
              <span class="text-gray-700 dark:text-gray-300">{{ event.address.neighborhood }}</span>
            </div>
            <div v-if="event.address.city || event.address.state" class="flex items-center gap-2">
              <i class="fas fa-city text-gray-400 text-sm"></i>
              <span class="text-gray-700 dark:text-gray-300">
                {{ event.address.city }}<span v-if="event.address.state">, {{ event.address.state }}</span>
              </span>
            </div>
            <div v-if="event.address.zip_code" class="flex items-center gap-2">
              <i class="fas fa-mail-bulk text-gray-400 text-sm"></i>
              <span class="text-gray-700 dark:text-gray-300">{{ event.address.zip_code }}</span>
            </div>
          </div>
        </div>

        <!-- Organizador -->
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <i class="fas fa-users text-green-500"></i>
            <h3 class="font-semibold">Organizadores</h3>
          </div>

          <div class="rounded-xl space-y-2">
            <div v-if="event.organizers?.length">
              <div v-for="(o, i) in event.organizers" :key="i" class="flex items-center gap-3 my-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 ">
                <div
                  class="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <i class="fas fa-user text-white"></i>
                </div>
                <div>
                  <p class="font-medium">{{ o.name }} <span class="text-gray-400 text-sm" v-if="o.position">- {{ o.position }}</span></p>
                  <p class="text-sm text-gray-500" v-if="o.email">{{ o.email }}</p> 
                  <p class="text-xs text-gray-400">({{ o.type === 'user' ? 'Usuário' : 'Externo' }})</p>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">—</p>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <EditEventModal v-if="isEditModalOpen" :event="event" :users="authStore.users" @close="isEditModalOpen = false" />

      <!-- Click away overlay -->
      <div v-if="isDropdownOpen" @click="isDropdownOpen = false" class="fixed inset-0"></div>
    </div>
  </div>
</template>
