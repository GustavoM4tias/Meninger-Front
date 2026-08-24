<script setup>
// Mural, visão de quem RECEBE. Segue a receita de tela do Office
// (_design/RECEITA-DE-TELA.md) na versão executiva: no lugar dos KPIs, uma
// barra de PENDÊNCIAS que recorta a lista - aqui não se mede número, se resolve
// fila.
//
//   StatRow (pendências, clicáveis)  →  linha de estado  →  Panel com a lista
//
// O comunicado não vira DataTable de propósito: é texto para ler, não registro
// para comparar. O corpo fica em três linhas e abre no lugar, então a lista
// continua escaneável sem esconder o conteúdo atrás de um clique obrigatório.
import { ref, computed, onMounted } from 'vue';
import { useMuralStore } from '@/stores/Mural/muralStore';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import { kindMeta, formatDate, formatDateTime } from '@/utils/Mural/muralFormat';

const store = useMuralStore();
const ackingId = ref(null);
const recorte = ref('');            // '' = tudo
const abertos = ref(new Set());     // comunicados com o corpo inteiro à mostra

onMounted(() => {
  store.fetchMine();
  store.fetchPending();
});

const todos = computed(() => store.items || []);
const pendentes = computed(() => todos.value.filter(c => c.requiresAck && !c.acked));
const urgentes = computed(() => todos.value.filter(c => c.kind === 'URGENTE'));
const fixados = computed(() => todos.value.filter(c => c.pinned));

// Fila, não medida: o número diz quanto falta fazer, e clicar recorta a lista.
const filas = computed(() => [
  { key: '', label: 'Todos', raw: todos.value.length, icon: 'fas fa-bullhorn', tone: 'accent',
    hint: 'comunicados ativos', tooltip: 'Ver todos' },
  { key: 'pendentes', label: 'Aguardam você', raw: pendentes.value.length, icon: 'fas fa-hand',
    tone: pendentes.value.length ? 'warn' : 'neutral', hint: 'confirmação de leitura',
    tooltip: 'Ver só o que espera a sua confirmação' },
  { key: 'urgentes', label: 'Urgentes', raw: urgentes.value.length, icon: 'fas fa-fire',
    tone: urgentes.value.length ? 'neg' : 'neutral', hint: 'marcados como urgente' },
  { key: 'fixados', label: 'Fixados', raw: fixados.value.length, icon: 'fas fa-thumbtack',
    tone: 'accent', hint: 'sempre no topo' },
]);

const lista = computed(() => {
  if (recorte.value === 'pendentes') return pendentes.value;
  if (recorte.value === 'urgentes') return urgentes.value;
  if (recorte.value === 'fixados') return fixados.value;
  // Sem recorte, o que depende da pessoa vem primeiro - o resto é leitura.
  return [...todos.value].sort((a, b) => {
    const pa = a.requiresAck && !a.acked ? 0 : 1;
    const pb = b.requiresAck && !b.acked ? 0 : 1;
    return pa - pb;
  });
});

const rotuloRecorte = computed(() => ({
  pendentes: 'aguardam você',
  urgentes: 'urgentes',
  fixados: 'fixados',
}[recorte.value] || ''));

// O mesmo gesto liga e desliga; "Todos" sempre volta ao conjunto inteiro.
function aoClicarFila(item) {
  recorte.value = (!item.key || recorte.value === item.key) ? '' : item.key;
}

const estaAberto = (c) => abertos.value.has(c.id);
function alternarCorpo(c) {
  const s = new Set(abertos.value);
  s.has(c.id) ? s.delete(c.id) : s.add(c.id);
  abertos.value = s;
}

async function confirmar(c) {
  ackingId.value = c.id;
  try { await store.ack(c.id); } finally { ackingId.value = null; }
}
</script>

<template>
  <div>
    <StatRow :items="filas" :cols="{ sm: 2, md: 4 }" size="sm"
      selectable :active-key="recorte" :loading="store.loading && !todos.length"
      @select="aoClicarFila" />

    <!-- Linha de estado: impede ler uma lista recortada achando que é o total. -->
    <div class="mt-3 mb-3 flex items-center gap-2 flex-wrap text-xs text-ink-muted">
      <span><span class="tabular-nums">{{ lista.length }}</span> de
        <span class="tabular-nums">{{ todos.length }}</span> comunicados</span>
      <button v-if="recorte" type="button" @click="recorte = ''"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-accent/30
               bg-accent-soft text-accent text-micro hover:border-accent/60 transition-colors duration-120">
        {{ rotuloRecorte }}
        <i class="fas fa-xmark text-[10px]"></i>
      </button>
    </div>

    <Panel :padded="false"
      :loading="store.loading && !todos.length" loading-variant="row"
      :empty="!lista.length"
      empty-icon="fas fa-bullhorn"
      :empty-title="recorte ? 'Nada neste recorte' : 'Nenhum aviso ativo'"
      :empty-text="recorte
        ? 'Toque em Todos para ver os demais comunicados.'
        : 'Quando houver comunicados direcionados a você, eles aparecem aqui.'">
      <ul class="divide-y divide-line">
        <li v-for="c in lista" :key="c.id"
          class="p-3.5 sm:p-4 transition-colors duration-120"
          :class="c.requiresAck && !c.acked ? 'bg-data-warn-soft/30' : ''">
          <!-- Cabeçalho da linha -->
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <Badge :variant="kindMeta(c.kind).badge" size="sm">
                <i :class="kindMeta(c.kind).icon"></i> {{ kindMeta(c.kind).label }}
              </Badge>
              <Badge v-if="c.pinned" variant="accent" size="sm">
                <i class="fas fa-thumbtack"></i> Fixado
              </Badge>
              <span v-if="c.publishedAt" class="text-micro text-ink-subtle font-mono">
                {{ formatDate(c.publishedAt) }}
              </span>
            </div>
            <span v-if="c.acked" class="text-micro text-data-pos shrink-0">
              <i class="fas fa-circle-check"></i> Ciente em {{ formatDateTime(c.ackedAt) }}
            </span>
            <span v-else-if="c.requiresAck" class="text-micro text-data-warn shrink-0 font-medium">
              <i class="fas fa-hand"></i> Aguarda você
            </span>
          </div>

          <h3 class="mt-1.5 text-sm sm:text-base font-semibold text-ink leading-snug">{{ c.title }}</h3>

          <p class="mt-1 text-sm text-ink-muted whitespace-pre-line leading-relaxed"
            :class="estaAberto(c) ? '' : 'line-clamp-3'">{{ c.body }}</p>

          <div class="mt-2 flex items-center gap-3 flex-wrap">
            <!-- Abre no lugar: ler não deveria custar uma troca de tela. -->
            <button v-if="(c.body || '').length > 180" type="button"
              @click="alternarCorpo(c)"
              class="text-micro text-accent hover:underline inline-flex items-center gap-1">
              <i class="fas fa-chevron-down text-[9px] transition-transform duration-200"
                 :class="{ 'rotate-180': estaAberto(c) }"></i>
              {{ estaAberto(c) ? 'Recolher' : 'Ler tudo' }}
            </button>

            <a v-if="c.link" :href="c.link" target="_blank" rel="noopener"
              class="text-micro text-accent hover:underline inline-flex items-center gap-1">
              <i class="fas fa-arrow-up-right-from-square text-[9px]"></i> Abrir link
            </a>
          </div>

          <div v-if="c.requiresAck && !c.acked" class="mt-3 flex items-center gap-3 flex-wrap">
            <Button variant="primary" size="sm" icon="fas fa-check"
              :loading="ackingId === c.id" @click="confirmar(c)">
              Li e estou ciente
            </Button>
            <!-- A consequência dita: confirmar é registro, não formalidade. -->
            <span class="text-micro text-ink-subtle">Fica registrado com o seu nome e a data.</span>
          </div>
        </li>
      </ul>
    </Panel>

    <p v-if="store.error" class="mt-4 text-sm text-data-neg">{{ store.error }}</p>
  </div>
</template>
