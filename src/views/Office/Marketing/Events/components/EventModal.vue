<!-- src/views/Office/Marketing/Events/components/EventModal.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import EditEventModal from './EditEventModal.vue';
import { deleteEvent } from '@/utils/Event/apiEvents';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const authStore = useAuthStore();
const props = defineProps({ event: { type: Object, required: true } });
const emit = defineEmits(['close']);

const isEditModalOpen = ref(false);
const imagemAtual = ref(0);
const isDeleting = ref(false);
const confirmDelete = ref(false);

const closeModal = () => emit('close');
const openEdit = () => { isEditModalOpen.value = true; };

const excluir = async () => {
  isDeleting.value = true;
  try {
    await deleteEvent(props.event.id);
    closeModal();
  } catch (e) {
    console.error(e);
  } finally {
    isDeleting.value = false;
    confirmDelete.value = false;
  }
};

const imagemTotal = computed(() => props.event?.images?.length || 0);
const hasMultipleImages = computed(() => imagemTotal.value > 1);

const formatDate = (s) => new Date(s).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (s) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const isEventPast = computed(() => new Date(props.event.event_date) < new Date());

const eventStatus = computed(() => {
  const ev = new Date(props.event.event_date);
  const now = new Date();
  const diffDays = Math.round((new Date(ev.getFullYear(), ev.getMonth(), ev.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (diffDays < 0) return { text: 'Finalizado', cls: 'bg-gray-500' };
  if (diffDays === 0) return { text: 'Hoje', cls: 'bg-red-500' };
  if (diffDays === 1) return { text: 'Amanhã', cls: 'bg-orange-500' };
  if (diffDays <= 7) return { text: `${diffDays} dias`, cls: 'bg-yellow-500' };
  return { text: `${diffDays} dias`, cls: 'bg-blue-500' };
});

const proximo = () => { imagemAtual.value = (imagemAtual.value + 1) % imagemTotal.value; };
const anterior = () => { imagemAtual.value = (imagemAtual.value - 1 + imagemTotal.value) % imagemTotal.value; };
const goTo = (i) => { imagemAtual.value = i; };

const handleKey = (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft' && hasMultipleImages.value) anterior();
  if (e.key === 'ArrowRight' && hasMultipleImages.value) proximo();
};

onMounted(() => { document.addEventListener('keydown', handleKey); document.body.style.overflow = 'hidden'; });
onUnmounted(() => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; });
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="closeModal">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />

    <div
      class="relative w-full max-w-2xl bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      style="animation: modalIn .2s cubic-bezier(.4,0,.2,1)">

      <!-- IMAGE HERO -->
      <div class="relative shrink-0 bg-gray-900" :style="{ height: '14rem' }">
        <img :src="event.images?.[imagemAtual] || '/noimg.jpg'" :alt="event.title" class="w-full h-full object-cover"
          :class="{ 'opacity-60': isEventPast }" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <!-- Controls top -->
        <div class="absolute top-3 right-3 flex items-center gap-2 z-10">
          <!-- Edit -->
          <button @click="openEdit"
            class="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-medium transition">
            <i class="fas fa-pen text-[10px]"></i>Editar
          </button>

          <!-- Delete (com confirm inline) -->
          <template v-if="!confirmDelete">
            <button @click="confirmDelete = true"
              class="h-8 w-8 rounded-lg bg-white/15 hover:bg-red-500/70 backdrop-blur-sm text-white grid place-items-center transition"
              title="Excluir">
              <i class="fas fa-trash text-[10px]"></i>
            </button>
          </template>
          <template v-else>
            <div
              class="flex items-center gap-1.5 px-2 h-8 rounded-lg bg-red-600/90 backdrop-blur-sm text-white text-xs">
              <span>Excluir?</span>
              <button @click="excluir" :disabled="isDeleting" class="font-semibold hover:underline">
                {{ isDeleting ? '…' : 'Sim' }}
              </button>
              <span class="opacity-50">|</span>
              <button @click="confirmDelete = false" class="opacity-70 hover:opacity-100">Não</button>
            </div>
          </template>

          <!-- Close -->
          <button @click="closeModal"
            class="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white grid place-items-center transition">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>

        <!-- Status badge -->
        <div class="absolute top-3 left-3">
          <span :class="['px-2.5 py-1 rounded-full text-[11px] font-semibold text-white', eventStatus.cls]">
            {{ eventStatus.text }}
          </span>
        </div>

        <!-- Carousel arrows -->
        <button v-if="hasMultipleImages" @click="anterior"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white grid place-items-center transition">
          <i class="fas fa-chevron-left text-xs"></i>
        </button>
        <button v-if="hasMultipleImages" @click="proximo"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white grid place-items-center transition">
          <i class="fas fa-chevron-right text-xs"></i>
        </button>

        <!-- Dots -->
        <div v-if="hasMultipleImages" class="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5">
          <button v-for="(_, i) in event.images" :key="i" @click="goTo(i)"
            :class="['w-1.5 h-1.5 rounded-full transition', imagemAtual === i ? 'bg-white' : 'bg-white/40']" />
        </div>

        <!-- Title + tags over image -->
        <div class="absolute bottom-0 left-0 right-0 px-5 py-4">
          <h1 class="text-lg font-bold text-white drop-shadow leading-snug line-clamp-2 mb-2">{{ event.title }}</h1>
          <div v-if="event.tags?.length" class="flex flex-wrap gap-1.5">
            <span v-for="tag in event.tags" :key="tag"
              class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 backdrop-blur-sm text-white border border-white/20">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 overflow-y-auto">

        <!-- Meta row -->
        <div class="px-5 py-4 flex flex-wrap items-center gap-4 border-b border-gray-100 dark:border-gray-800">
          <!-- Data/hora -->
          <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <i class="far fa-calendar text-blue-500 text-xs"></i>
            <span class="font-medium capitalize">{{ formatDate(event.event_date) }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <i class="far fa-clock text-blue-500 text-xs"></i>
            <span>{{ formatTime(event.event_date) }}</span>
          </div>
          <!-- Localização -->
          <div v-if="event.address?.city" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <i class="fas fa-map-marker-alt text-red-400 text-xs"></i>
            <span>{{ event.address.city }}<span v-if="event.address.state">, {{ event.address.state }}</span></span>
          </div>
        </div>

        <div class="px-5 py-5 space-y-6">

          <!-- Descrição -->
          <div v-if="event.description" class="space-y-1.5">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Descrição</p>
            <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{{ event.description
              }}
            </p>
          </div>

          <!-- Endereço completo -->
          <div v-if="event.address && (event.address.street || event.address.zip_code)" class="space-y-1.5">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Endereço</p>
            <div class="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
              <p v-if="event.address.street">{{ event.address.street }}<span v-if="event.address.number">, {{
                event.address.number }}</span></p>
              <p v-if="event.address.neighborhood">{{ event.address.neighborhood }}</p>
              <p v-if="event.address.zip_code" class="text-gray-400 text-xs">CEP: {{ event.address.zip_code }}</p>
            </div>
          </div>

          <!-- Organizadores -->
          <div v-if="event.organizers?.length" class="space-y-2">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Organizadores</p>
            <div class="space-y-2">
              <div v-for="(o, i) in event.organizers" :key="i"
                class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div
                  class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 grid place-items-center shrink-0">
                  <i class="fas fa-user text-white text-[10px]"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ o.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    <span v-if="o.position">{{ o.position }} · </span>
                    <span>{{ o.type === 'user' ? 'Usuário' : 'Externo' }}</span>
                    <span v-if="o.email"> · {{ o.email }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Criado por -->
          <div class="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <img class="w-7 h-7 rounded-lg object-cover"
              :src="`https://ui-avatars.com/api/?name=${encodeURIComponent((event.created_by || '').split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join(' '))}&background=random&size=56`"
              alt="criado por" />
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Criado por <span class="font-medium text-gray-700 dark:text-gray-300">{{ event.created_by }}</span>
            </p>
          </div>

        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <EditEventModal v-if="isEditModalOpen" :event="event" :users="authStore.users" @close="isEditModalOpen = false" />
  </div>
</template>

<style scoped>
@keyframes modalIn {
  from {
    transform: translateY(1rem);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>