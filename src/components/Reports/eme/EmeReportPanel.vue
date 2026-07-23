<script setup>
// Painel da Eme no builder de relatórios: fixo à esquerda, altura total.
// É a ÚNICA Eme da tela (o player global fica oculto nesta rota).
// Abas: Chat (conversa), Itens (outline + seleção) e Tema (layout do relatório).
import { ref, computed } from 'vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import { specOutline, BLOCK_LABELS } from '../blocks/registry.js'
import { REPORT_THEMES } from '../themes.js'
import EmeChatThread from './EmeChatThread.vue'

const emit = defineEmits(['goto-block'])

const store = useReportsStore()
const tab = ref('chat') // chat | outline | theme
const draft = ref('')

const outline = computed(() => specOutline(store.spec))
const emptyThread = computed(() => !store.messages.length && !store.isStreaming)
const selCount = computed(() => store.selectedIds.length)

const STARTERS = [
  { label: 'Relatório comercial completo', text: 'Monte um relatório comercial completo com leads, pré-cadastros, reservas e funil de conversão.' },
  { label: 'Funil de conversão', text: 'Monte um relatório focado no funil: leads gerados, pré-cadastros e reservas, com as taxas de conversão entre as etapas.' },
  { label: 'Leads do mês', text: 'Monte um relatório da geração de leads deste mês: total, evolução semanal e origem.' },
]
const REFINERS = [
  { label: 'Analisar padrões', text: 'Analise os dados que você já buscou e me diga que padrões relevantes existem (origem, horário, conversão por etapa). Adicione os achados ao relatório.' },
  { label: 'Pontos fortes e de atenção', text: 'Adicione ao final uma seção de pontos fortes e pontos de atenção.' },
  { label: 'Resumir textos', text: 'Resuma os textos de análise, deixe mais executivo.' },
  { label: 'Mais gráficos', text: 'Onde houver tabela com poucas linhas, troque por gráfico.' },
]

function send(text) {
  const msg = (text || draft.value).trim()
  if (!msg) return
  draft.value = ''
  store.sendMessage(msg)
}

const placeholder = computed(() => {
  if (selCount.value === 1) return 'O que mudar neste bloco?'
  if (selCount.value > 1) return `O que mudar nos ${selCount.value} blocos selecionados?`
  return 'Peça um relatório ou um ajuste...'
})
</script>

<template>
  <aside class="flex flex-col h-full min-h-0 bg-surface-raised border-r border-line">
    <!-- Header no padrão do player da Eme -->
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-line flex-shrink-0">
      <img src="/Mlogo.png" class="h-4 flex-shrink-0 invert dark:invert-0" alt="Eme" />
      <span class="text-xs text-ink-muted flex-1 min-w-0 truncate">Eme · Modo relatório</span>
    </div>

    <!-- Abas -->
    <div class="flex items-center gap-1 px-2.5 py-2 border-b border-line flex-shrink-0">
      <button
        v-for="t in [
          { key: 'chat', label: 'Chat', icon: 'fas fa-comments' },
          { key: 'outline', label: `Itens (${store.blockCount})`, icon: 'fas fa-list-ul' },
          { key: 'theme', label: 'Tema', icon: 'fas fa-palette' },
        ]"
        :key="t.key"
        class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition"
        :class="tab === t.key ? 'bg-accent-soft text-accent font-medium' : 'text-ink-subtle hover:bg-surface-sunken'"
        @click="tab = t.key"
      >
        <i :class="t.icon" class="text-[10px]" />
        <span class="truncate">{{ t.label }}</span>
      </button>
    </div>

    <!-- ── CHAT ────────────────────────────────────────────────────────────── -->
    <template v-if="tab === 'chat'">
      <div v-if="emptyThread" class="px-4 pt-4 space-y-3 flex-shrink-0">
        <p class="text-sm text-ink-muted">
          Me conte o que esse relatório precisa mostrar - empreendimento, período e temas
          (leads, pré-cadastro, reservas...). Eu busco os dados reais e monto tudo, e você
          vai me pedindo ajustes até ficar do seu jeito.
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in STARTERS" :key="c.label"
            class="px-3 py-1.5 rounded-full border border-line bg-surface text-xs text-ink hover:border-accent hover:text-accent transition"
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

      <div v-if="!emptyThread && store.blockCount > 0 && !store.isStreaming" class="px-3 pb-1.5 flex flex-wrap gap-1.5 flex-shrink-0">
        <button
          v-for="c in REFINERS" :key="c.label"
          class="px-2.5 py-1 rounded-full border border-line bg-surface text-[11px] text-ink-muted hover:border-accent hover:text-accent transition"
          @click="send(c.text)"
        >{{ c.label }}</button>
      </div>

      <!-- Contexto: blocos selecionados -->
      <div v-if="selCount" class="mx-3 mb-1.5 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-xs text-accent flex-shrink-0">
        <i class="fas fa-crosshairs" />
        <span class="truncate">
          {{ selCount === 1
            ? `Editando: ${store.selectedBlocks[0]?.props?.title || BLOCK_LABELS[store.selectedBlocks[0]?.type] || ''}`
            : `${selCount} blocos selecionados` }}
        </span>
        <button class="ml-auto hover:opacity-70" aria-label="Limpar seleção" @click="store.clearSelection()">
          <i class="fas fa-xmark" />
        </button>
      </div>

      <div class="p-3 border-t border-line flex-shrink-0">
        <form class="flex items-end gap-2" @submit.prevent="send()">
          <textarea
            v-model="draft"
            rows="2"
            :placeholder="placeholder"
            class="flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-ring"
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
    </template>

    <!-- ── ITENS (outline) ─────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'outline'" class="flex-1 overflow-y-auto px-2.5 py-2.5 min-h-0">
      <div v-if="selCount" class="mb-2 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
        <span class="font-medium">{{ selCount }} selecionado(s)</span>
        <button class="ml-auto hover:opacity-70" @click="store.clearSelection()">Limpar</button>
        <button class="text-rose-600 dark:text-rose-400 hover:opacity-70" @click="store.removeBlocks([...store.selectedIds])">
          <i class="far fa-trash-can mr-1" />Remover
        </button>
      </div>

      <div v-for="sec in outline" :key="sec.id" class="mb-1.5">
        <div
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer"
          :class="store.selectedIds.includes(sec.id) ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-sunken'"
          @click="emit('goto-block', sec.id)"
        >
          <button class="flex-shrink-0" @click.stop="store.toggleBlock(sec.id)">
            <i :class="store.selectedIds.includes(sec.id) ? 'fas fa-square-check text-accent' : 'far fa-square text-ink-subtle'" class="text-xs" />
          </button>
          <span v-if="sec.num" class="w-5 h-5 rounded-full border border-accent/40 text-accent text-[10px] flex items-center justify-center flex-shrink-0">{{ sec.num }}</span>
          <span class="truncate">{{ sec.title }}</span>
        </div>
        <div
          v-for="child in sec.children" :key="child.id"
          class="w-full flex items-center gap-2 pl-4 pr-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
          :class="store.selectedIds.includes(child.id) ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'"
          @click="emit('goto-block', child.id)"
        >
          <button class="flex-shrink-0 ml-1" @click.stop="store.toggleBlock(child.id)">
            <i :class="store.selectedIds.includes(child.id) ? 'fas fa-square-check text-accent' : 'far fa-square text-ink-subtle'" class="text-[10px]" />
          </button>
          <span class="truncate">{{ child.label }}</span>
          <span class="ml-auto text-[10px] text-ink-subtle flex-shrink-0">{{ BLOCK_LABELS[child.type] }}</span>
        </div>
      </div>
      <p v-if="!outline.length" class="text-xs text-ink-subtle px-2.5 py-4 text-center">Nenhum bloco ainda.</p>
    </div>

    <!-- ── TEMA ────────────────────────────────────────────────────────────── -->
    <div v-else class="flex-1 overflow-y-auto px-3 py-3 min-h-0">
      <p class="text-xs text-ink-muted mb-3">Escolha a identidade visual do relatório. Muda fonte, cores e formato - o conteúdo permanece igual.</p>
      <div class="space-y-2">
        <button
          v-for="(t, key) in REPORT_THEMES" :key="key"
          class="w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition"
          :class="store.theme === key ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50 bg-surface'"
          @click="store.setTheme(key)"
        >
          <span class="mt-0.5 w-8 h-8 rounded-lg flex-shrink-0 border border-line" :style="{ backgroundColor: t.swatch }" />
          <span class="min-w-0">
            <span class="block text-sm font-medium" :class="store.theme === key ? 'text-accent' : 'text-ink'">{{ t.label }}</span>
            <span class="block text-[11px] text-ink-subtle leading-snug">{{ t.description }}</span>
          </span>
          <i v-if="store.theme === key" class="fas fa-check text-accent text-xs mt-1 flex-shrink-0" />
        </button>
      </div>
    </div>
  </aside>
</template>
