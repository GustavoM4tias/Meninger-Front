<script setup>
// Mural de atualizações: o que mudou na plataforma desde a última vez que esta
// pessoa entrou. Abre sozinho, uma vez por publicação, e é a única tela do
// Office que interrompe para FALAR em vez de pedir algo.
//
// Por isso ele é CURTO. A versão mais recente vem aberta; as anteriores ficam
// dobradas, uma linha cada, para quem quiser. O texto completo de todas está na
// tela /docs, que lê exatamente a mesma lista (config/changelog.js).
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import ReleaseBloco from './ReleaseBloco.vue';
import { usePlatformUpdatesStore } from '@/stores/Platform/platformUpdatesStore';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const router = useRouter();
const store = usePlatformUpdatesStore();

const novidades = computed(() => store.novidades);
const principal = computed(() => novidades.value[0] || null);
const anteriores = computed(() => novidades.value.slice(1));

// Qual das anteriores está aberta (uma por vez, para o modal não crescer).
const expandida = ref(null);
watch(() => props.open, (v) => { if (v) expandida.value = null; });

const dataCurta = (d) => (d instanceof Date
  ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
  : '');

// Ler é o suficiente: fechar por qualquer caminho marca como visto.
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
      <div class="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-line bg-accent-soft/40">
        <div class="shrink-0 h-9 w-9 rounded-lg grid place-items-center
                    bg-surface-raised border border-accent/25 text-accent">
          <i class="fas fa-wand-magic-sparkles text-sm"></i>
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-ink tracking-tight leading-tight">
            Novidades do Office
          </h2>
          <!-- O tema diz o ASSUNTO antes de a pessoa ler qualquer linha; a
               versão sozinha não situa ninguém. -->
          <p v-if="principal" class="text-micro text-ink-muted">
            <span v-if="principal.theme" class="text-ink font-medium">{{ principal.theme }}</span>
            <span v-if="principal.theme"> · </span>{{ dataCurta(principal.date) }}
            <span v-if="anteriores.length"> · mais {{ anteriores.length }} desde a sua última visita</span>
          </p>
        </div>
        <button type="button" @click="concluir"
          class="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-ink-muted
                 hover:bg-surface-sunken hover:text-ink transition-colors duration-120"
          aria-label="Fechar">
          <i class="fas fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Corpo -->
      <div class="max-h-[58dvh] sm:max-h-[60vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
        <ReleaseBloco v-if="principal" :release="principal" @abrir-tela="abrirTela" />

        <!-- Anteriores: uma linha cada, abre a que interessar. -->
        <div v-if="anteriores.length" class="space-y-1.5 pt-1">
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Antes disso</p>

          <div v-for="r in anteriores" :key="r.version"
            class="rounded-lg border border-line bg-surface-raised overflow-hidden">
            <button type="button"
              @click="expandida = expandida === r.version ? null : r.version"
              class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-sunken
                     transition-colors duration-120">
              <span class="text-micro font-mono text-ink-subtle shrink-0 w-12">{{ dataCurta(r.date) }}</span>
              <span class="text-xs truncate flex-1">
                <span v-if="r.theme" class="font-medium text-ink">{{ r.theme }}: </span>
                <span class="text-ink-muted">{{ r.description }}</span>
              </span>
              <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200 shrink-0"
                 :class="{ 'rotate-180': expandida === r.version }"></i>
            </button>
            <div v-if="expandida === r.version" class="px-3 pb-3 pt-1 border-t border-line">
              <ReleaseBloco :release="r" @abrir-tela="abrirTela" />
            </div>
          </div>
        </div>

        <p v-if="store.alemDoTeto > 0" class="text-micro text-ink-subtle">
          E mais {{ store.alemDoTeto }} {{ store.alemDoTeto === 1 ? 'atualização' : 'atualizações' }} em Documentação.
        </p>
      </div>

      <!-- Rodapé -->
      <div class="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-line bg-surface">
        <Button variant="ghost" size="sm" icon="fas fa-clock-rotate-left" @click="verHistorico">
          Ver tudo
        </Button>
        <Button variant="primary" size="sm" icon="fas fa-check" @click="concluir">
          Entendi
        </Button>
      </div>
    </div>
  </Modal>
</template>
