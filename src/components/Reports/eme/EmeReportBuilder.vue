<script setup>
// Fase A — Eme protagonista: chat guiado com chips de escolha rápida e
// progresso visível da busca de dados. Ocupa o painel esquerdo do builder.
import { ref, computed } from 'vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import EmeChatThread from './EmeChatThread.vue'

const store = useReportsStore()
const draft = ref('')

const emptyThread = computed(() => !store.messages.length && !store.isStreaming)

// Chips de partida (Fase A) — um toque preenche o pedido
const STARTERS = [
  { label: 'Relatório comercial completo', text: 'Monte um relatório comercial completo com leads, pré-cadastros, reservas e funil de conversão.' },
  { label: 'Funil de conversão', text: 'Monte um relatório focado no funil: leads gerados, pré-cadastros e reservas, com as taxas de conversão entre as etapas.' },
  { label: 'Leads do mês', text: 'Monte um relatório da geração de leads deste mês: total, evolução semanal e origem.' },
]
const REFINERS = [
  { label: 'Resumir textos', text: 'Resuma os textos de análise, deixe mais executivo.' },
  { label: 'Pontos fortes e de atenção', text: 'Adicione ao final uma seção de pontos fortes e pontos de atenção.' },
  { label: 'Mais gráficos', text: 'Onde houver tabela com poucas linhas, troque por gráfico.' },
]

function send(text) {
  const msg = (text || draft.value).trim()
  if (!msg) return
  draft.value = ''
  store.sendMessage(msg)
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Cabeçalho da Eme -->
    <div class="flex items-center gap-2.5 px-3.5 py-3 border-b border-line flex-shrink-0">
      <span class="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center">
        <i class="fas fa-wand-magic-sparkles text-sm" />
      </span>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-ink leading-tight">Eme</p>
        <p class="text-[11px] text-ink-subtle leading-tight">Modo relatório · me diga o que você quer ver</p>
      </div>
    </div>

    <!-- Boas-vindas + chips -->
    <div v-if="emptyThread" class="px-4 pt-4 space-y-3 flex-shrink-0">
      <p class="text-sm text-ink-muted">
        Me conte o que esse relatório precisa mostrar - empreendimento, período e temas
        (leads, pré-cadastro, reservas...). Eu busco os dados reais e monto tudo, e você
        vai me pedindo ajustes até ficar do seu jeito.
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in STARTERS" :key="c.label"
          class="px-3 py-1.5 rounded-full border border-line bg-surface-raised text-xs text-ink hover:border-accent hover:text-accent transition"
          @click="send(c.text)"
        >{{ c.label }}</button>
      </div>
    </div>

    <EmeChatThread
      :messages="store.messages"
      :streaming-text="store.streamingText"
      :is-streaming="store.isStreaming"
      :tool-progress="store.toolProgress"
    />

    <!-- Chips de refinamento quando já há relatório -->
    <div v-if="!emptyThread && store.blockCount > 0 && !store.isStreaming" class="px-3 pb-1.5 flex flex-wrap gap-1.5 flex-shrink-0">
      <button
        v-for="c in REFINERS" :key="c.label"
        class="px-2.5 py-1 rounded-full border border-line bg-surface-raised text-[11px] text-ink-muted hover:border-accent hover:text-accent transition"
        @click="send(c.text)"
      >{{ c.label }}</button>
    </div>

    <!-- Composer -->
    <div class="p-3 border-t border-line flex-shrink-0">
      <form class="flex items-end gap-2" @submit.prevent="send()">
        <textarea
          v-model="draft"
          rows="2"
          placeholder="Ex.: relatório do Ingá com leads e reservas do trimestre..."
          class="flex-1 resize-none rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-ring"
          @keydown.enter.exact.prevent="send()"
        />
        <button
          type="submit"
          :disabled="store.isStreaming || !draft.trim()"
          class="h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 transition flex-shrink-0"
          aria-label="Enviar"
        >
          <i class="fas fa-paper-plane text-sm" />
        </button>
      </form>
    </div>
  </div>
</template>
