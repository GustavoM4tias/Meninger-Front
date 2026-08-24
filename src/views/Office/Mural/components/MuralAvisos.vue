<script setup>
// Mural, visão de quem RECEBE.
//
// O layout antigo era uma pilha só, do mais recente para o mais antigo, e o
// comunicado que exigia ciência ficava no meio dos demais - com a mesma cara de
// quem já tinha sido resolvido. Medido em 24/08/2026: 13 de 36 destinatários
// tinham dado ciência.
//
// Agora o que DEPENDE da pessoa vem separado, em cima, e some da seção assim que
// ela confirma. O resto é leitura.
import { ref, computed, onMounted } from 'vue';
import { useMuralStore } from '@/stores/Mural/muralStore';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import { kindMeta, formatDate, formatDateTime } from '@/utils/Mural/muralFormat';

const store = useMuralStore();
const ackingId = ref(null);

onMounted(() => {
  store.fetchMine();
  store.fetchPending();
});

const pendentes = computed(() => store.items.filter(c => c.requiresAck && !c.acked));
const lidos = computed(() => store.items.filter(c => !(c.requiresAck && !c.acked)));

async function confirmar(c) {
  ackingId.value = c.id;
  try { await store.ack(c.id); } finally { ackingId.value = null; }
}
</script>

<template>
  <div>
    <Skeleton v-if="store.loading && !store.items.length" variant="row" :lines="3" />

    <EmptyState v-else-if="!store.items.length"
      icon="fas fa-bullhorn"
      title="Nenhum aviso ativo"
      description="Quando houver comunicados direcionados a você, eles aparecem aqui." />

    <div v-else class="space-y-6 max-w-3xl">
      <!-- O que depende de você -->
      <section v-if="pendentes.length">
        <h2 class="text-micro font-mono uppercase tracking-wider text-data-warn mb-2">
          <i class="fas fa-hand mr-1"></i>
          {{ pendentes.length === 1 ? 'Aguarda a sua confirmação' : 'Aguardam a sua confirmação' }}
        </h2>

        <div class="space-y-2.5">
          <article v-for="c in pendentes" :key="c.id"
            class="rounded-xl border border-data-warn/35 bg-data-warn-soft/40 overflow-hidden">
            <div class="p-3.5 sm:p-4">
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                  <Badge :variant="kindMeta(c.kind).badge" size="sm">
                    <i :class="kindMeta(c.kind).icon"></i> {{ kindMeta(c.kind).label }}
                  </Badge>
                  <Badge v-if="c.pinned" variant="accent" size="sm">
                    <i class="fas fa-thumbtack"></i> Fixado
                  </Badge>
                  <span v-if="c.publishedAt" class="text-micro text-ink-subtle">{{ formatDate(c.publishedAt) }}</span>
                </div>
              </div>

              <h3 class="mt-2 text-base font-semibold text-ink leading-snug">{{ c.title }}</h3>
              <p class="mt-1 text-sm text-ink-muted whitespace-pre-line leading-relaxed">{{ c.body }}</p>

              <a v-if="c.link" :href="c.link" target="_blank" rel="noopener"
                class="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                <i class="fas fa-arrow-up-right-from-square text-xs"></i> Abrir link
              </a>

              <div class="mt-3 flex items-center gap-3 flex-wrap">
                <Button variant="primary" size="sm" icon="fas fa-check"
                  :loading="ackingId === c.id" @click="confirmar(c)">
                  Li e estou ciente
                </Button>
                <!-- A consequência dita: confirmar é registro, não formalidade. -->
                <span class="text-micro text-ink-subtle">
                  Fica registrado com o seu nome e a data.
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Leitura -->
      <section v-if="lidos.length">
        <h2 v-if="pendentes.length" class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2">
          Demais comunicados
        </h2>

        <div class="space-y-2.5">
          <article v-for="c in lidos" :key="c.id"
            class="rounded-xl border bg-surface-raised shadow-soft overflow-hidden"
            :class="c.kind === 'URGENTE' ? 'border-data-neg/30' : c.pinned ? 'border-accent/30' : 'border-line'">
            <div class="p-3.5 sm:p-4">
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                  <Badge :variant="kindMeta(c.kind).badge" size="sm">
                    <i :class="kindMeta(c.kind).icon"></i> {{ kindMeta(c.kind).label }}
                  </Badge>
                  <Badge v-if="c.pinned" variant="accent" size="sm">
                    <i class="fas fa-thumbtack"></i> Fixado
                  </Badge>
                  <span v-if="c.publishedAt" class="text-micro text-ink-subtle">{{ formatDate(c.publishedAt) }}</span>
                </div>
                <span v-if="c.acked" class="text-micro text-data-pos shrink-0">
                  <i class="fas fa-circle-check"></i>
                  Ciente em {{ formatDateTime(c.ackedAt) }}
                </span>
              </div>

              <h3 class="mt-2 text-base font-semibold text-ink leading-snug">{{ c.title }}</h3>
              <p class="mt-1 text-sm text-ink-muted whitespace-pre-line leading-relaxed">{{ c.body }}</p>

              <a v-if="c.link" :href="c.link" target="_blank" rel="noopener"
                class="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                <i class="fas fa-arrow-up-right-from-square text-xs"></i> Abrir link
              </a>
            </div>
          </article>
        </div>
      </section>
    </div>

    <p v-if="store.error" class="mt-4 text-sm text-data-neg">{{ store.error }}</p>
  </div>
</template>
