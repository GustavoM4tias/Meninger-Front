<script setup>
/**
 * Espelho do módulo da ficha comercial: a grade de unidades com a situação de
 * cada uma, clicável. Recebe a grade já montada pelo back (montarEspelho com a
 * etapa do módulo), nos dois formatos:
 *   - horizontal (loteamento): uma fileira de lotes por quadra;
 *   - vertical: uma grade por torre, andares de cima para baixo x finais.
 * Clicar numa unidade emite `select` com a célula inteira (preço, desconto,
 * séries da tabela, área, reserva).
 */
import { ref, computed } from 'vue';
import { SITUACAO, situacaoDe, aVenda } from './fichaUtils';

const props = defineProps({
  torres: { type: Array, default: () => [] },
  modo: { type: String, default: 'vertical' },
});
const emit = defineEmits(['select']);

const soDisponiveis = ref(false);
const horizontal = computed(() => props.modo === 'horizontal');
const lotes = (t) => t.andares.flatMap((a) => a.unidades);
const livres = (t) => lotes(t).filter(aVenda).length;

const LEGENDA = [SITUACAO.disponivel, SITUACAO.reserva_ativa, SITUACAO.vendida, SITUACAO.bloqueada];
const temSegurado = computed(() => props.torres.some((t) => lotes(t).some((c) => c.estoque_comercial)));

const rotuloCel = (c) => (horizontal.value ? (c.final || c.numero || '?') : (c.numero || c.nome));
const dica = (c) => `${c.nome} · ${situacaoDe(c).rotulo}`;
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-ink-muted mr-auto" aria-label="Legenda">
        <li v-for="s in LEGENDA" :key="s.rotulo" class="inline-flex items-center gap-1.5"><i class="w-3 h-3 rounded-sm" :class="s.leg"></i>{{ s.rotulo }}</li>
        <li v-if="temSegurado" class="inline-flex items-center gap-1.5"><i class="w-3 h-3 rounded-sm" :class="SITUACAO.estoque.leg"></i>{{ SITUACAO.estoque.rotulo }}</li>
      </ul>
      <button type="button" class="h-10 px-3 rounded-lg border text-xs font-medium focus-ring transition-colors"
        :class="soDisponiveis ? 'bg-ink text-surface border-ink' : 'bg-surface border-line text-ink-muted hover:text-ink'"
        :aria-pressed="soDisponiveis" @click="soDisponiveis = !soDisponiveis">
        <i class="fas fa-filter mr-1.5"></i>Só disponíveis
      </button>
    </div>

    <!-- Loteamento: quadra x lotes -->
    <div v-if="horizontal" class="space-y-2">
      <div v-for="t in torres" :key="t.key" class="grid grid-cols-1 sm:grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1 items-start">
        <div class="pt-2">
          <div class="text-xs font-semibold text-ink">{{ t.nome }}</div>
          <div class="text-micro text-ink-subtle">{{ livres(t) }} livres</div>
        </div>
        <div class="flex flex-wrap gap-1">
          <button v-for="c in lotes(t)" :key="c.idunidade" type="button" v-tippy="dica(c)"
            class="w-10 h-10 rounded-md text-micro font-semibold tabular-nums focus-ring transition-opacity hover:ring-2 hover:ring-ink/40"
            :class="[situacaoDe(c).cel, soDisponiveis && !aVenda(c) ? 'opacity-20' : '']"
            :aria-label="dica(c)" @click="emit('select', c)">
            {{ rotuloCel(c) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Vertical: torre x andar x final -->
    <div v-else class="flex flex-wrap gap-x-6 gap-y-5">
      <div v-for="t in torres" :key="t.key" class="min-w-0">
        <div class="flex items-baseline justify-between gap-3 mb-1.5">
          <span class="text-xs font-semibold text-ink">{{ t.nome }}</span>
          <span class="text-micro text-ink-subtle">{{ livres(t) }} livres</span>
        </div>
        <div class="overflow-x-auto">
          <table class="border-separate border-spacing-1">
            <tbody>
              <tr v-for="a in t.andares" :key="String(a.andar)">
                <th scope="row" class="text-micro font-normal text-ink-subtle text-right pr-1 whitespace-nowrap">{{ a.nome }}</th>
                <td v-for="col in t.colunas" :key="col.final" class="p-0">
                  <template v-for="c in a.unidades.filter((u) => u.final === col.final)" :key="c.idunidade">
                    <button type="button" v-tippy="dica(c)"
                      class="w-12 h-10 rounded-md text-micro font-semibold tabular-nums focus-ring transition-opacity hover:ring-2 hover:ring-ink/40"
                      :class="[situacaoDe(c).cel, soDisponiveis && !aVenda(c) ? 'opacity-20' : '']"
                      :aria-label="dica(c)" @click="emit('select', c)">
                      {{ rotuloCel(c) }}
                    </button>
                  </template>
                  <span v-if="!a.unidades.some((u) => u.final === col.final)" class="block w-12 h-10"></span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
