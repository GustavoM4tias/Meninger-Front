<script setup>
// Mural de Avisos — visão do USUÁRIO. Lista os comunicados ativos direcionados
// a ele (já ordenados no backend: fixados/urgentes primeiro) e permite confirmar
// a ciência ("Li e estou ciente") dos que exigem.

import { ref, onMounted } from 'vue';
import { useMuralStore } from '@/stores/Mural/muralStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import { kindMeta, formatDate, formatDateTime } from '@/utils/Mural/muralFormat';

const store = useMuralStore();
const ackingId = ref(null);

onMounted(() => {
    store.fetchMine();
    store.fetchPending();
});

async function confirm(c) {
    ackingId.value = c.id;
    try {
        await store.ack(c.id);
    } finally {
        ackingId.value = null;
    }
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Mural de Avisos"
        subtitle="Comunicados e avisos internos direcionados a você."
        icon="fas fa-bullhorn">
        <template #actions>
          <Badge v-if="store.hasPending" variant="warning" size="md">
            <i class="fas fa-clock"></i>
            {{ store.pending }} pendente{{ store.pending > 1 ? 's' : '' }}
          </Badge>
        </template>
      </PageHeader>

      <div v-if="store.loading" class="py-16 grid place-items-center text-ink-subtle">
        <i class="fas fa-circle-notch fa-spin text-2xl"></i>
      </div>

      <EmptyState
        v-else-if="!store.items.length"
        icon="fas fa-bullhorn"
        title="Nenhum aviso ativo"
        description="Quando houver comunicados direcionados a você, eles aparecem aqui." />

      <div v-else class="space-y-3 max-w-3xl">
        <article
          v-for="c in store.items"
          :key="c.id"
          class="rounded-xl border bg-surface-raised shadow-soft surface-gradient overflow-hidden"
          :class="c.kind === 'URGENTE' ? 'border-red-500/30' : c.pinned ? 'border-accent/30' : 'border-line'">
          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2 flex-wrap">
                <Badge :variant="kindMeta(c.kind).badge" size="md">
                  <i :class="kindMeta(c.kind).icon"></i> {{ kindMeta(c.kind).label }}
                </Badge>
                <Badge v-if="c.pinned" variant="accent" size="sm">
                  <i class="fas fa-thumbtack"></i> Fixado
                </Badge>
                <span v-if="c.publishedAt" class="text-xs text-ink-subtle">{{ formatDate(c.publishedAt) }}</span>
              </div>
              <Badge v-if="c.acked" variant="success" size="sm">
                <i class="fas fa-check"></i> Ciente
              </Badge>
            </div>

            <h3 class="mt-2 text-base font-semibold text-ink">{{ c.title }}</h3>
            <p class="mt-1 text-sm text-ink-muted whitespace-pre-line leading-relaxed">{{ c.body }}</p>

            <a
              v-if="c.link"
              :href="c.link"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
              <i class="fas fa-arrow-up-right-from-square text-xs"></i> Abrir link
            </a>

            <div v-if="c.requiresAck" class="mt-3 flex items-center gap-3 flex-wrap">
              <Button
                v-if="!c.acked"
                variant="primary"
                size="sm"
                icon="fas fa-check"
                :loading="ackingId === c.id"
                @click="confirm(c)">
                Li e estou ciente
              </Button>
              <span v-else class="text-xs text-emerald-600 dark:text-emerald-400">
                <i class="fas fa-circle-check"></i> Confirmado em {{ formatDateTime(c.ackedAt) }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <p v-if="store.error" class="mt-4 text-sm text-red-500">{{ store.error }}</p>
    </PageContainer>
  </div>
</template>
