<script setup>
// Ranking de uma dimensão (imobiliária, corretor, mídia, campanha...).
//
// Clicar numa linha abre o modal padrão de vendas (EnterpriseDetailModal), com
// as vendas que compõem aquela linha - mesmo comportamento da tabela do
// Faturamento, onde a linha do empreendimento abre a listagem.
//
// A barra de participação fica DENTRO da própria linha, presa ao elemento -
// nada de camada translúcida atravessando o fundo da tabela.
//
// Mobile-first: em telas estreitas cada linha vira um cartão empilhado; a
// tabela só aparece a partir de sm.
import { computed, ref } from 'vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  titulo: { type: String, default: '' },
  labelHeader: { type: String, default: 'Item' },
  icon: { type: String, default: 'fas fa-list' },
  // Coluna "de lead": só faz sentido nos rankings de quem vendeu.
  showLead: { type: Boolean, default: false },
  initialLimit: { type: Number, default: 12 },
  emptyText: { type: String, default: 'Nada para mostrar neste período.' },
});

const emit = defineEmits(['selecionar']);

const expandido = ref(false);
const visiveis = computed(() =>
  expandido.value ? props.rows : props.rows.slice(0, props.initialLimit));
const restantes = computed(() => Math.max(0, props.rows.length - props.initialLimit));

const moeda = (v) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(Number(v) || 0);

const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

const totalVendas = computed(() => props.rows.reduce((s, r) => s + (r.vendas || 0), 0));
const totalValor = computed(() => props.rows.reduce((s, r) => s + (Number(r.valor) || 0), 0));

// Barra proporcional ao maior valor da lista (não ao total): com cauda longa,
// escalar pelo total deixa tudo achatado e ilegível.
const maiorValor = computed(() =>
  props.rows.reduce((m, r) => Math.max(m, Number(r.valor) || 0), 0));
const larguraBarra = (row) =>
  maiorValor.value > 0 ? `${Math.max(2, (row.valor / maiorValor.value) * 100)}%` : '0%';

const abrir = (row) => { if (row?.itens?.length) emit('selecionar', row); };
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised surface-gradient overflow-hidden">
    <!-- Cabeçalho da seção -->
    <header v-if="titulo"
      class="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 border-b border-line">
      <div class="flex items-center gap-2 min-w-0">
        <i :class="icon" class="text-xs text-accent"></i>
        <h3 class="text-sm font-semibold text-ink truncate">{{ titulo }}</h3>
        <Badge v-if="rows.length" variant="neutral" size="sm">{{ rows.length }}</Badge>
      </div>
      <p v-if="rows.length" class="text-[11px] font-mono text-ink-subtle tabular-nums shrink-0">
        {{ totalVendas }} venda{{ totalVendas === 1 ? '' : 's' }} · {{ moeda(totalValor) }}
      </p>
    </header>

    <EmptyState v-if="!rows.length" :icon="icon" title="Sem dados" :description="emptyText" />

    <template v-else>
      <!-- Cartões (mobile) -->
      <div class="sm:hidden divide-y divide-line">
        <article v-for="(row, i) in visiveis" :key="row.chave"
          class="p-3 space-y-2 transition-colors active:bg-surface-sunken/60"
          :class="row.itens?.length && 'cursor-pointer'"
          @click="abrir(row)">
          <div class="flex items-start gap-2">
            <span class="text-[10px] font-mono text-ink-subtle mt-0.5 w-5 shrink-0">{{ i + 1 }}º</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink break-words"
                :class="row.semDado && 'text-ink-muted italic font-normal'">{{ row.label }}</p>
              <p class="text-[11px] text-ink-subtle font-mono mt-0.5">
                {{ row.vendas }} venda{{ row.vendas === 1 ? '' : 's' }} · ticket {{ moeda(row.ticket) }}
              </p>
            </div>
            <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              {{ moeda(row.valor) }}
            </span>
          </div>
          <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div class="h-full rounded-full bg-accent/70" :style="{ width: larguraBarra(row) }"></div>
          </div>
          <div class="flex items-center justify-between text-[11px] text-ink-muted font-mono">
            <span>{{ pct(row.shareValor) }} do VGV</span>
            <span v-if="showLead && row.comLead">
              <i class="fas fa-bullhorn text-accent text-[9px] mr-1"></i>{{ row.comLead }} de lead
            </span>
          </div>
        </article>
      </div>

      <!-- Tabela (sm+) -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-line bg-surface-sunken/60">
              <th class="px-3 py-2 text-left w-10 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">#</th>
              <th class="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                {{ labelHeader }}
              </th>
              <th class="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Vendas</th>
              <th v-if="showLead" class="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">De lead</th>
              <th class="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Ticket</th>
              <th class="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">VGV</th>
              <th class="px-3 py-2 text-left w-[22%] text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Participação</th>
              <th class="w-8"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in visiveis" :key="row.chave"
              class="group border-b border-line/60 last:border-0 transition-colors hover:bg-surface-sunken/40"
              :class="row.itens?.length && 'cursor-pointer'"
              @click="abrir(row)">
              <td class="px-3 py-2 text-[11px] font-mono text-ink-subtle">{{ i + 1 }}</td>
              <td class="px-3 py-2 max-w-[260px]">
                <span class="block truncate font-medium text-ink"
                  :class="row.semDado && 'text-ink-muted italic font-normal'"
                  :title="row.label">{{ row.label }}</span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums text-ink">{{ row.vendas }}</td>
              <td v-if="showLead" class="px-3 py-2 text-right tabular-nums">
                <span v-if="row.comLead" class="text-accent font-medium">{{ row.comLead }}</span>
                <span v-else class="text-ink-subtle">—</span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums text-ink-muted">{{ moeda(row.ticket) }}</td>
              <td class="px-3 py-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {{ moeda(row.valor) }}
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                    <div class="h-full rounded-full bg-accent/70 transition-all duration-300 ease-out-expo"
                      :style="{ width: larguraBarra(row) }"></div>
                  </div>
                  <span class="text-[11px] font-mono text-ink-muted tabular-nums w-11 text-right">
                    {{ pct(row.shareValor) }}
                  </span>
                </div>
              </td>
              <td class="pr-3 text-right">
                <i v-if="row.itens?.length"
                  class="fas fa-chevron-right text-[10px] text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100"></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="restantes > 0" class="px-3 py-2 border-t border-line bg-surface flex justify-center">
        <Button variant="ghost" size="sm"
          :icon="expandido ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
          @click="expandido = !expandido">
          {{ expandido ? 'Mostrar menos' : `Ver mais ${restantes}` }}
        </Button>
      </div>
    </template>
  </section>
</template>
