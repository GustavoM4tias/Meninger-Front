<script setup>
import { useOfficeAIStore } from '@/stores/officeAIStore'

const props = defineProps({
  context: { type: Object, required: true },
})

const aiStore = useOfficeAIStore()

function openDashboard() {
  window.dispatchEvent(new CustomEvent('eme:navigate', {
    detail: { route: '/comercial/mcmv', filters: {}, message: 'Abrindo dashboard MCMV...' },
  }))
}

function ask(prompt) {
  aiStore.sendMessage(prompt)
}

function buildPrompt(topic) {
  const cidade = props.context.cidade
  const base = cidade ? `em ${cidade}` : ''
  const map = {
    populacao:    `Qual a população ${base}?`,
    anterior:     `Qual era o teto anterior da Faixa 2 ${base}?`,
    classificacao:`Qual a classificação hierárquica do município ${base}?`,
    faixa3:       `Qual o teto da Faixa 3 ${base}?`,
  }
  return map[topic] || ''
}
</script>

<template>
  <div class="mt-3 pt-3 border-t border-white/5">
    <p class="text-[11px] text-slate-600 uppercase tracking-wide mb-2">Sugestões</p>
    <div class="flex flex-wrap gap-1.5">
      <button
        @click="openDashboard"
        :disabled="aiStore.isStreaming"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40
               bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 ring-indigo-500/20"
      >
        <i class="fas fa-arrow-up-right-from-square text-[10px]" />
        Abrir Dashboard
      </button>
      <button
        v-if="context.cidade"
        @click="ask(buildPrompt('anterior'))"
        :disabled="aiStore.isStreaming"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40
               bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 ring-amber-500/20"
      >
        <i class="fas fa-clock-rotate-left text-[10px]" />
        Valor Anterior
      </button>
      <button
        v-if="context.cidade"
        @click="ask(buildPrompt('populacao'))"
        :disabled="aiStore.isStreaming"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40
               bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 ring-cyan-500/20"
      >
        <i class="fas fa-users text-[10px]" />
        População
      </button>
      <button
        v-if="context.cidade"
        @click="ask(buildPrompt('faixa3'))"
        :disabled="aiStore.isStreaming"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40
               bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 ring-blue-500/20"
      >
        <i class="fas fa-layer-group text-[10px]" />
        Teto Faixa 3
      </button>
      <button
        v-if="context.cidade"
        @click="ask(buildPrompt('classificacao'))"
        :disabled="aiStore.isStreaming"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40
               bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 ring-violet-500/20"
      >
        <i class="fas fa-sitemap text-[10px]" />
        Classificação
      </button>
    </div>
  </div>
</template>
