<script setup>
// Cards de campanhas das Fichas Comerciais (action.type === 'campaign_cards').
// Resultado plural do search_condition_campaigns: um card por empreendimento ×
// campanha, com descrição, regulamento, período, valor e fonte — substitui a
// tabela genérica que escondia as informações principais.
import { computed, ref } from 'vue'

const props = defineProps({
  action: { type: Object, required: true },
})

const campanhas = computed(() => props.action.campanhas || [])

// Controle de expansão por card (descrição longa / regulamento).
const openDesc = ref({})
const openRules = ref({})

const fmtBRL = (v) => (v == null ? null
  : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

function openFicha(c) {
  if (!c.ficha_id) return
  window.dispatchEvent(new CustomEvent('eme:navigate', {
    detail: { route: `/comercial/conditions/${c.ficha_id}` },
  }))
}
</script>

<template>
  <div class="rounded-xl border border-line bg-surface-raised overflow-hidden">
    <!-- Header -->
    <div class="px-3.5 py-2.5 border-b border-line flex items-center gap-2 min-w-0">
      <span class="h-7 w-7 grid place-items-center rounded-lg bg-accent-soft text-accent shrink-0">
        <i class="fas fa-bullhorn text-xs"></i>
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink truncate">{{ action.title || 'Campanhas' }}</p>
        <p class="text-[11px] text-ink-subtle truncate">
          {{ action.total }} campanha{{ action.total > 1 ? 's' : '' }}
          <template v-if="action.subtitle"> · {{ action.subtitle }}</template>
        </p>
      </div>
    </div>

    <!-- Cards -->
    <div class="divide-y divide-line/70">
      <div v-for="(c, i) in campanhas" :key="i" class="px-3.5 py-3 space-y-1.5">
        <!-- Empreendimento + fonte -->
        <div class="flex items-start justify-between gap-2 min-w-0">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink break-words">{{ c.empreendimento }}</p>
            <p v-if="c.cidade" class="text-[11px] text-ink-subtle">{{ c.cidade }}</p>
          </div>
          <span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
            :class="c.autorizada
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'"
            :title="c.autorizada ? 'Dados de ficha autorizada' : 'Ficha ainda NÃO autorizada — dados sujeitos a alteração'">
            <i class="fas text-[9px]" :class="c.autorizada ? 'fa-circle-check' : 'fa-triangle-exclamation'"></i>
            {{ c.mes_referencia }} · {{ c.status }}
          </span>
        </div>

        <!-- Campanha + chips -->
        <p class="text-sm text-accent font-medium break-words">{{ c.titulo }}</p>
        <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
          <span v-if="c.periodo" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line">
            <i class="far fa-calendar text-[9px]"></i>{{ c.periodo }}
          </span>
          <span v-if="c.valor != null" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line font-medium text-ink">
            <i class="fas fa-coins text-[9px]"></i>{{ fmtBRL(c.valor) }}
          </span>
          <span v-if="c.pago_por" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line">
            Pago por {{ c.pago_por }}
          </span>
          <span v-if="c.modulo" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line">
            {{ c.modulo }}
          </span>
        </div>

        <!-- Descrição -->
        <div v-if="c.descricao" class="text-xs text-ink-muted leading-relaxed break-words [overflow-wrap:anywhere]">
          <p :class="openDesc[i] ? '' : 'line-clamp-3'">{{ c.descricao }}</p>
          <button v-if="c.descricao.length > 140" type="button"
            @click="openDesc[i] = !openDesc[i]"
            class="mt-0.5 text-[11px] text-accent hover:underline">
            {{ openDesc[i] ? 'ver menos' : 'ver mais' }}
          </button>
        </div>

        <!-- Regulamento (colapsado) -->
        <div v-if="c.regulamento">
          <button type="button" @click="openRules[i] = !openRules[i]"
            class="inline-flex items-center gap-1.5 text-[11px] text-ink-subtle hover:text-ink-muted transition-colors">
            <i class="fas text-[9px]" :class="openRules[i] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            Regulamento
          </button>
          <p v-if="openRules[i]"
            class="mt-1 text-xs text-ink-muted leading-relaxed break-words [overflow-wrap:anywhere] pl-3 border-l-2 border-line">
            {{ c.regulamento }}
          </p>
        </div>

        <!-- Abrir ficha -->
        <button v-if="c.ficha_id" type="button" @click="openFicha(c)"
          class="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline">
          <i class="fas fa-arrow-up-right-from-square text-[9px]"></i>
          Abrir ficha completa
        </button>
      </div>
    </div>
  </div>
</template>
