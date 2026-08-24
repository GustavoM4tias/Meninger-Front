<script setup>
// Mural de atualizações: o que mudou na plataforma desde a última vez que esta
// pessoa entrou. Abre sozinho, uma vez por publicação, e é a única tela do
// Office que interrompe para FALAR em vez de pedir algo.
//
// O conteúdo vem de config/changelog.js — o mesmo catálogo da tela /docs. Aqui
// ele é lido na ordem em que a pergunta aparece na cabeça de quem usa:
// "o que passou a existir?", "o que melhorou?", "o que estava errado?" e, por
// último e em destaque, "mudou alguma REGRA que eu preciso saber?".
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import { usePlatformUpdatesStore } from '@/stores/Platform/platformUpdatesStore';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const router = useRouter();
const store = usePlatformUpdatesStore();

const novidades = computed(() => store.novidades);
const principal = computed(() => novidades.value[0] || null);

const formatarData = (d) => {
  if (!(d instanceof Date)) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Ler é o suficiente: fechar por qualquer caminho marca como visto. O modal não
// volta na próxima abertura, e quem quiser reler tem o histórico em /docs.
async function concluir() {
  emit('close');
  await store.marcarVisto();
}

async function abrirTela(link) {
  await concluir();
  if (link) router.push(link).catch(() => { /* já está na rota */ });
}

async function verHistorico() {
  await concluir();
  router.push('/docs').catch(() => {});
}
</script>

<template>
  <Modal :open="open" size="lg" :padded="false" hide-close :close-on-backdrop="false" @close="concluir">
    <div class="flex flex-col">
      <!-- Cabeçalho próprio: o primitivo não desenha barra de título quando
           recebe hide-close e nenhum slot de header. -->
      <div class="relative overflow-hidden px-5 sm:px-6 py-5 border-b border-line bg-accent-soft/50">
        <div class="flex items-start gap-3">
          <div class="shrink-0 h-11 w-11 rounded-xl grid place-items-center
                      bg-surface-raised border border-accent/25 text-accent">
            <i class="fas fa-wand-magic-sparkles"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-micro font-mono uppercase tracking-wider text-accent">
              Novidades da plataforma
            </p>
            <h2 class="text-lg sm:text-xl font-semibold text-ink tracking-tight mt-0.5">
              {{ novidades.length > 1 ? `${novidades.length} atualizações novas` : 'O que mudou no Office' }}
            </h2>
            <p v-if="principal" class="text-xs text-ink-muted mt-0.5">
              {{ principal.version }} · {{ formatarData(principal.date) }}
            </p>
          </div>
          <button type="button" @click="concluir"
            class="shrink-0 h-9 w-9 grid place-items-center rounded-lg text-ink-muted
                   hover:bg-surface-sunken hover:text-ink transition-colors duration-120"
            aria-label="Fechar">
            <i class="fas fa-xmark text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Corpo -->
      <div class="max-h-[60dvh] sm:max-h-[62vh] overflow-y-auto px-5 sm:px-6 py-5 space-y-8">
        <section v-for="release in novidades" :key="release.version" class="space-y-5">
          <!-- Cabeçalho da versão: só quando há mais de uma, para não repetir
               a informação que já está no topo. -->
          <div v-if="novidades.length > 1" class="flex items-center gap-2">
            <span class="text-micro font-mono px-2 py-0.5 rounded-md bg-surface-sunken border border-line text-ink-muted">
              {{ release.version }}
            </span>
            <span class="text-micro text-ink-subtle">{{ formatarData(release.date) }}</span>
          </div>

          <p v-if="release.description" class="text-sm text-ink leading-relaxed">
            {{ release.description }}
          </p>

          <!-- Mudou uma regra: vem PRIMEIRO. É o único bloco que pode mudar o
               que a pessoa precisa fazer amanhã. -->
          <div v-if="release.breakingChanges?.length"
            class="rounded-xl border border-data-warn/30 bg-data-warn-soft px-4 py-3">
            <p class="text-micro font-mono uppercase tracking-wider text-data-warn mb-2">
              <i class="fas fa-triangle-exclamation mr-1"></i> Mudou uma regra
            </p>
            <ul class="space-y-1.5">
              <li v-for="b in release.breakingChanges" :key="b.id" class="text-xs text-ink leading-relaxed">
                {{ b.description }}
              </li>
            </ul>
          </div>

          <!-- O que passou a existir -->
          <div v-if="release.features?.length" class="space-y-2.5">
            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Novidades</p>
            <div v-for="f in release.features" :key="f.id"
              class="rounded-xl border border-line bg-surface-raised p-3.5">
              <div class="flex items-start gap-3">
                <div class="shrink-0 h-8 w-8 rounded-lg grid place-items-center
                            bg-accent-soft border border-accent/20 text-accent">
                  <i class="fas fa-plus text-xs"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-ink">{{ f.title }}</p>
                  <p class="text-xs text-ink-muted leading-relaxed mt-1">{{ f.description }}</p>
                  <!-- O tutorial de tela nova é isto: um caminho, não um texto
                       explicando onde fica. -->
                  <button v-if="f.link" type="button" @click="abrirTela(f.link)"
                    class="mt-2 text-micro font-medium text-accent inline-flex items-center gap-1
                           hover:underline">
                    Abrir a tela
                    <i class="fas fa-arrow-right text-[9px] transition-transform duration-120"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- O que melhorou -->
          <div v-if="release.improvements?.length" class="space-y-2">
            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Melhorias</p>
            <ul class="space-y-2">
              <li v-for="i in release.improvements" :key="i.id" class="flex items-start gap-2.5">
                <i class="fas fa-arrow-trend-up text-data-pos text-[11px] mt-0.5 shrink-0"></i>
                <p class="text-xs text-ink-muted leading-relaxed">
                  <span v-if="i.category" class="text-ink font-medium">{{ i.category }}: </span>{{ i.description }}
                </p>
              </li>
            </ul>
          </div>

          <!-- O que estava errado -->
          <div v-if="release.fixes?.length" class="space-y-2">
            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Correções</p>
            <ul class="space-y-2">
              <li v-for="c in release.fixes" :key="c.id" class="flex items-start gap-2.5">
                <i class="fas fa-wrench text-ink-subtle text-[11px] mt-0.5 shrink-0"></i>
                <p class="text-xs text-ink-muted leading-relaxed">{{ c.description }}</p>
              </li>
            </ul>
          </div>
        </section>

        <p v-if="store.alemDoTeto > 0" class="text-micro text-ink-subtle border-t border-line pt-3">
          Há mais {{ store.alemDoTeto }} {{ store.alemDoTeto === 1 ? 'atualização anterior' : 'atualizações anteriores' }}
          que você ainda não leu. Todas ficam em Documentação.
        </p>
      </div>

      <!-- Rodapé -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-3.5 border-t border-line bg-surface">
        <Button variant="ghost" size="sm" icon="fas fa-clock-rotate-left" @click="verHistorico">
          Histórico completo
        </Button>
        <Button variant="primary" size="sm" icon="fas fa-check" @click="concluir">
          Entendi
        </Button>
      </div>
    </div>
  </Modal>
</template>
