<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import EditEventModal from './EditEventModal.vue';
import { deleteEvent } from '@/utils/Event/apiEvents';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import IconButton from '@/components/UI/IconButton.vue';

const authStore = useAuthStore();
const props = defineProps({ event: { type: Object, required: true } });
const emit = defineEmits(['close']);

const isEditOpen = ref(false);
const imageIndex = ref(0);
const isDeleting = ref(false);
const confirmDelete = ref(false);

const close = () => emit('close');
const openEdit = () => { isEditOpen.value = true; };

async function excluir() {
  isDeleting.value = true;
  try {
    await deleteEvent(props.event.id);
    close();
  } catch (e) {
    console.error(e);
  } finally {
    isDeleting.value = false;
    confirmDelete.value = false;
  }
}

const imageTotal = computed(() => props.event?.images?.length || 0);
const hasMultipleImages = computed(() => imageTotal.value > 1);

const formatDate = (s) => new Date(s).toLocaleDateString('pt-BR',
  { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (s) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const isPast = computed(() => new Date(props.event.event_date) < new Date());

const eventStatus = computed(() => {
  const ev = new Date(props.event.event_date);
  const now = new Date();
  const days = Math.round(
    (new Date(ev.getFullYear(), ev.getMonth(), ev.getDate()) -
     new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000
  );
  if (days < 0)  return { text: 'Finalizado', variant: 'neutral' };
  if (days === 0) return { text: 'Hoje',     variant: 'danger' };
  if (days === 1) return { text: 'Amanhã',   variant: 'warning' };
  if (days <= 7)  return { text: `${days} dias`, variant: 'warning' };
  return { text: `em ${days} dias`, variant: 'accent' };
});

const next = () => { imageIndex.value = (imageIndex.value + 1) % imageTotal.value; };
const prev = () => { imageIndex.value = (imageIndex.value - 1 + imageTotal.value) % imageTotal.value; };

function onArrows(e) {
  if (e.key === 'ArrowLeft' && hasMultipleImages.value) prev();
  if (e.key === 'ArrowRight' && hasMultipleImages.value) next();
}

onMounted(() => document.addEventListener('keydown', onArrows));
onUnmounted(() => document.removeEventListener('keydown', onArrows));

const creatorAvatar = computed(() => {
  const initials = (props.event.created_by ?? '')
    .split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join(' ');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=56`;
});
</script>

<template>
  <Modal :open="true" size="lg" hide-close @close="close">
    <template #header>
      <!-- Header customizado: título do evento + ações + close -->
      <div class="flex items-start justify-between gap-3 w-full">
        <div class="flex items-center gap-2.5 min-w-0">
          <Badge :variant="eventStatus.variant" dot>{{ eventStatus.text }}</Badge>
          <h2 class="text-base font-semibold text-ink truncate">{{ event.title }}</h2>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <template v-if="!confirmDelete">
            <IconButton icon="fas fa-pen" size="sm" label="Editar" @click="openEdit" />
            <IconButton icon="fas fa-trash" size="sm" label="Excluir" variant="ghost"
              @click="confirmDelete = true" />
          </template>
          <div v-else
            class="flex items-center gap-1 px-2 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs">
            <span>Excluir?</span>
            <button @click="excluir" :disabled="isDeleting" class="font-semibold hover:underline">
              {{ isDeleting ? '...' : 'Sim' }}
            </button>
            <span class="opacity-40">|</span>
            <button @click="confirmDelete = false" class="opacity-70 hover:opacity-100">Não</button>
          </div>
          <IconButton icon="fas fa-xmark" size="sm" label="Fechar" @click="close" />
        </div>
      </div>
    </template>

    <div class="-m-5 flex flex-col">
      <!-- Hero (imagem) -->
      <div class="relative bg-surface-sunken h-56 sm:h-64 overflow-hidden">
        <img :src="event.images?.[imageIndex] || '/noimg.jpg'" :alt="event.title"
          class="w-full h-full object-cover transition-opacity duration-300"
          :class="{ 'opacity-60': isPast }" />

        <template v-if="hasMultipleImages">
          <button @click="prev" aria-label="Anterior"
            class="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center
                   bg-black/40 text-white hover:bg-black/60 backdrop-blur transition-colors">
            <i class="fas fa-chevron-left text-xs"></i>
          </button>
          <button @click="next" aria-label="Próximo"
            class="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center
                   bg-black/40 text-white hover:bg-black/60 backdrop-blur transition-colors">
            <i class="fas fa-chevron-right text-xs"></i>
          </button>
          <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <button v-for="(_, i) in event.images" :key="i" @click="imageIndex = i"
              :class="['h-1.5 rounded-full transition-all duration-300',
                       imageIndex === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70']"></button>
          </div>
        </template>
      </div>

      <!-- Tags -->
      <div v-if="event.tags?.length" class="px-5 pt-4 flex flex-wrap gap-1.5">
        <Badge v-for="tag in event.tags" :key="tag" variant="accent" size="sm">{{ tag }}</Badge>
      </div>

      <!-- Meta row -->
      <div class="px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm border-b border-line">
        <span class="inline-flex items-center gap-2 text-ink">
          <i class="far fa-calendar text-accent"></i>
          <span class="capitalize">{{ formatDate(event.event_date) }}</span>
        </span>
        <span class="inline-flex items-center gap-2 text-ink-muted">
          <i class="far fa-clock text-accent"></i>{{ formatTime(event.event_date) }}
        </span>
        <span v-if="event.address?.city" class="inline-flex items-center gap-2 text-ink-muted">
          <i class="fas fa-location-dot text-ink-subtle"></i>
          {{ event.address.city }}<span v-if="event.address.state">, {{ event.address.state }}</span>
        </span>
      </div>

      <!-- Body -->
      <div class="px-5 py-5 space-y-6 max-h-[40vh] overflow-y-auto">

        <section v-if="event.description">
          <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5">Descrição</p>
          <p class="text-sm text-ink leading-relaxed whitespace-pre-line">{{ event.description }}</p>
        </section>

        <section v-if="event.address && (event.address.street || event.address.zip_code)">
          <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5">Endereço</p>
          <div class="text-sm text-ink space-y-0.5">
            <p v-if="event.address.street">
              {{ event.address.street }}<span v-if="event.address.number">, {{ event.address.number }}</span>
            </p>
            <p v-if="event.address.neighborhood" class="text-ink-muted">{{ event.address.neighborhood }}</p>
            <p v-if="event.address.zip_code" class="text-ink-subtle text-xs font-mono">CEP {{ event.address.zip_code }}</p>
          </div>
        </section>

        <section v-if="event.organizers?.length">
          <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Organizadores</p>
          <div class="space-y-1.5">
            <div v-for="(o, i) in event.organizers" :key="i"
              class="flex items-center gap-3 p-2.5 rounded-lg bg-surface-sunken border border-line">
              <div class="w-8 h-8 rounded-md bg-accent-soft text-accent grid place-items-center shrink-0">
                <i class="fas fa-user text-[10px]"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink truncate">{{ o.name }}</p>
                <p class="text-xs text-ink-muted truncate">
                  <span v-if="o.position">{{ o.position }} · </span>
                  <span>{{ o.type === 'user' ? 'Usuário' : 'Externo' }}</span>
                  <span v-if="o.email"> · {{ o.email }}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Criado por -->
        <section class="flex items-center gap-2.5 pt-3 border-t border-line">
          <img :src="creatorAvatar" alt="criado por"
            class="w-7 h-7 rounded-full ring-1 ring-line" />
          <p class="text-xs text-ink-muted">
            Criado por <span class="font-medium text-ink">{{ event.created_by }}</span>
          </p>
        </section>
      </div>
    </div>

    <!-- Edit -->
    <EditEventModal v-if="isEditOpen" :event="event" :users="authStore.activeUsers"
      @close="isEditOpen = false" />
  </Modal>
</template>
