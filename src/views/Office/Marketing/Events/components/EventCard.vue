<script setup>
import { computed } from 'vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  event: { type: Object, required: true },
  past: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);

const formatDate = (s) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const formatTime = (s) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const eventStatus = computed(() => {
  const ev = new Date(props.event.event_date);
  const now = new Date();
  const days = Math.round(
    (new Date(ev.getFullYear(), ev.getMonth(), ev.getDate()) -
     new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000
  );
  if (days < 0)  return { text: 'Finalizado', variant: 'neutral' };
  if (days === 0) return { text: 'Hoje',     variant: 'danger',  pulse: true };
  if (days === 1) return { text: 'Amanhã',   variant: 'warning' };
  if (days <= 7)  return { text: `${days} dias`, variant: 'warning' };
  return { text: `em ${days} dias`, variant: 'accent' };
});

const imageUrl = computed(() =>
  props.event.images?.[0] || '/noimg.jpg'
);

const creatorAvatar = computed(() => {
  const initials = (props.event.created_by ?? '')
    .split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join(' ');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random`;
});
</script>

<template>
  <article
    class="group relative flex flex-col bg-surface-raised border border-line rounded-xl overflow-hidden
           shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
           transition-all duration-200 ease-out-expo cursor-pointer surface-gradient h-full"
    :class="{ 'opacity-70 hover:opacity-100': past }"
    @click="emit('click', event)">

    <!-- Imagem -->
    <div class="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
      <img :src="imageUrl" :alt="event.title" loading="lazy"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

      <div class="absolute top-3 left-3">
        <Badge :variant="eventStatus.variant" dot
          :class="eventStatus.pulse ? 'animate-pulse-soft' : ''">
          {{ eventStatus.text }}
        </Badge>
      </div>
    </div>

    <!-- Conteúdo -->
    <div class="flex flex-col flex-1 p-4 gap-3">
      <h3 class="text-base font-semibold text-ink line-clamp-2 group-hover:text-accent transition-colors">
        {{ event.title }}
      </h3>

      <!-- Data + local -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span class="inline-flex items-center gap-1.5">
          <i class="far fa-calendar text-accent"></i>
          {{ formatDate(event.event_date) }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <i class="far fa-clock text-accent"></i>
          {{ formatTime(event.event_date) }}
        </span>
        <span v-if="event.address?.city" class="inline-flex items-center gap-1.5 truncate">
          <i class="fas fa-location-dot text-ink-subtle"></i>
          <span class="truncate">{{ event.address.city }}<span v-if="event.address.state">, {{ event.address.state }}</span></span>
        </span>
      </div>

      <!-- Tags -->
      <div v-if="event.tags?.length" class="flex flex-wrap gap-1">
        <Badge v-for="tag in event.tags.slice(0, 3)" :key="tag" variant="accent" size="sm">
          {{ tag }}
        </Badge>
        <Badge v-if="event.tags.length > 3" size="sm">
          +{{ event.tags.length - 3 }}
        </Badge>
      </div>

      <!-- Descrição -->
      <p v-if="event.description"
         class="text-sm text-ink-muted line-clamp-2 leading-relaxed">
        {{ event.description }}
      </p>

      <!-- Footer -->
      <div class="mt-auto pt-3 border-t border-line flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <img :src="creatorAvatar" alt="" class="w-6 h-6 rounded-full ring-1 ring-line shrink-0" />
          <span class="text-xs text-ink-muted truncate">{{ event.created_by }}</span>
        </div>
        <span class="text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
          Detalhes
          <i class="fas fa-arrow-right text-[10px]"></i>
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
