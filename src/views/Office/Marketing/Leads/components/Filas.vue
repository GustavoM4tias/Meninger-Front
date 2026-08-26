<script setup>
import { ref, computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Fila from './Fila.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import { useLeadsStore } from '@/stores/Marketing/Lead/leadsStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';

const props = defineProps({
  filas: { type: [Array, Object], default: () => [] },
  // Empreendimentos que ainda não têm fila. Chegam do mesmo endpoint das filas.
  semVinculo: { type: Array, default: () => [] },
  // Todos os empreendimentos com a fila atual — a lista de edição do vínculo.
  empreendimentos: { type: Array, default: () => [] },
});

const store = useLeadsStore();
const perm = usePermissionStore();
// A gaveta é de quem tem a tela de Leads; mexer no vínculo é de admin.
const podeEditar = computed(() => perm.isAdmin);

const open = ref(false);
const escopo = ref('ativas');   // ativas | todas — padrão mostra só as ativas
const busca = ref('');
const sincronizando = ref(false);
const salvando = ref(null);     // idempreendimento em gravação
const erro = ref('');

const escopoOptions = [
  { value: 'ativas', label: 'Ativas' },
  { value: 'todas',  label: 'Todas' },
];

// A gaveta responde duas perguntas diferentes: "quem está em cada fila" e "qual
// fila atende cada empreendimento". A segunda tem que existir sempre, não só
// quando falta vínculo, senão não há como trocar depois de tudo vinculado.
const aba = ref('filas');
const abaOptions = [
  { value: 'filas',    label: 'Filas' },
  { value: 'vinculos', label: 'Vínculos' },
];
const buscaEmp = ref('');

const empreendimentosFiltrados = computed(() => {
  const q = buscaEmp.value.trim().toLowerCase();
  const list = q
    ? props.empreendimentos.filter(e => `${e.nome} ${e.cidade || ''}`.toLowerCase().includes(q))
    : props.empreendimentos;
  // Sem fila primeiro: é o que trava o retorno automático.
  return [...list].sort((a, b) => (a.idfila ? 1 : 0) - (b.idfila ? 1 : 0)
    || String(a.nome).localeCompare(String(b.nome)));
});

async function sincronizar() {
  sincronizando.value = true;
  erro.value = '';
  try {
    await store.sincronizarFilas();
  } catch (e) {
    erro.value = e.message;
  } finally {
    sincronizando.value = false;
  }
}

async function vincular(idempreendimento, idfila) {
  salvando.value = idempreendimento;
  erro.value = '';
  try {
    await store.vincularFila(idempreendimento, idfila ? Number(idfila) : null);
  } catch (e) {
    erro.value = e.message;
  } finally {
    salvando.value = null;
  }
}

const todas = computed(() =>
  Array.isArray(props.filas) ? props.filas : Object.values(props.filas || {})
);

// O CV não expõe um campo único de "ativa" — aceitamos as variações mais comuns
// e, na falta de todas, caímos na regra prática: fila com corretor é fila em uso.
// Se o CV passar a mandar um campo próprio, basta incluí-lo aqui.
function isAtiva(f) {
  const flag = f?.ativo ?? f?.ativa ?? f?.status ?? null;
  if (typeof flag === 'boolean') return flag;
  if (typeof flag === 'number') return flag === 1;
  if (typeof flag === 'string') {
    const v = flag.trim().toLowerCase();
    if (['s', 'sim', '1', 'true', 'ativo', 'ativa'].includes(v)) return true;
    if (['n', 'nao', 'não', '0', 'false', 'inativo', 'inativa'].includes(v)) return false;
  }
  return (f?.corretores_e_imobiliarias?.length || 0) > 0;
}

// Toda fila que existe no CV pode ser destino. A API não devolve os grupos de
// atendimento nem se a fila está ativa, então "sem corretor listado" NÃO prova
// fila vazia — filtrar por isso esconderia fila boa. O que dá para mostrar é o
// aviso, e a conferência de verdade é depois: se a fila não entregar, o lead
// volta como "sem dono" e o Office avisa.
const destinos = computed(() =>
  todas.value.filter(f => f.presente_no_cv !== false)
    .map(f => ({
      id: f.idfila_distribuicao_leads,
      nome: f.nome,
      semLista: !!f.sem_atendente_listado,
    }))
);

const ativasCount = computed(() => todas.value.filter(isAtiva).length);

const filtradas = computed(() => {
  let list = escopo.value === 'ativas' ? todas.value.filter(isAtiva) : todas.value;
  const q = busca.value.trim().toLowerCase();
  if (q) list = list.filter(f => String(f?.nome || '').toLowerCase().includes(q));
  return list;
});
</script>

<template>
  <!-- Botão integrado (usado na PageHeader actions) -->
  <Button variant="secondary" size="sm" icon="fas fa-people-group" @click="open = true">
    <span class="hidden sm:inline">Filas</span>
    <span v-if="ativasCount"
      class="font-mono text-micro px-1.5 py-0.5 rounded-md bg-accent-soft text-accent">
      {{ ativasCount }}
    </span>
    <span v-if="semVinculo.length" :title="`${semVinculo.length} empreendimento(s) sem fila`"
      class="font-mono text-micro px-1.5 py-0.5 rounded-md bg-data-warn/15 text-data-warn">
      {{ semVinculo.length }}
    </span>
  </Button>

  <Modal :open="open" position="right" size="md" @close="open = false">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-people-group text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold text-ink">Filas de distribuição</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono">{{ ativasCount }}</span> ativa(s) de
            <span class="font-mono">{{ todas.length }}</span>
          </p>
        </div>
        <Button v-if="podeEditar" variant="ghost" size="sm" icon="fas fa-rotate"
          :loading="sincronizando" title="Buscar as filas no CV agora"
          @click="sincronizar">
          <span class="hidden sm:inline">Sincronizar</span>
        </Button>
      </div>
    </template>

    <p v-if="erro" class="mb-3 text-xs text-data-neg bg-data-neg/10 border border-data-neg/20 rounded-lg px-3 py-2">
      {{ erro }}
    </p>

    <SegmentedControl v-model="aba" :options="abaOptions" size="sm" class="mb-3 w-full" />

    <!-- ABA VÍNCULOS: qual fila atende cada empreendimento. Sempre disponível,
         porque trocar um vínculo já feito é tão comum quanto criar o primeiro. -->
    <div v-if="aba === 'vinculos'">
      <p class="text-micro text-ink-muted mb-2">
        A fila escolhida aqui é quem recebe o lead que volta com interesse novo
        neste empreendimento. O vínculo é guardado pelo id da fila, então
        renomear a fila no CV não quebra nada.
      </p>

      <p v-if="semVinculo.length"
        class="mb-3 text-xs text-ink bg-data-warn/10 border border-data-warn/25 rounded-lg px-3 py-2">
        <i class="fas fa-triangle-exclamation text-data-warn mr-1"></i>
        <span class="font-mono">{{ semVinculo.length }}</span> sem fila: nesses, o
        retorno automático não age.
      </p>

      <div class="relative mb-3">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
        <input v-model="buscaEmp" type="text" placeholder="Buscar empreendimento..."
          class="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-surface-sunken border border-line text-ink
                 placeholder:text-ink-subtle outline-none
                 focus:border-accent focus:ring-2 focus:ring-accent-ring/20 transition-colors" />
      </div>

      <div class="space-y-2">
        <div v-for="e in empreendimentosFiltrados" :key="e.idempreendimento"
          class="rounded-lg border px-3 py-2"
          :class="e.idfila ? 'border-line bg-surface-raised' : 'border-data-warn/30 bg-data-warn/5'">
          <div class="flex items-baseline gap-2">
            <p class="text-xs font-medium text-ink flex-1 truncate" :title="e.nome">{{ e.nome }}</p>
            <span class="text-micro font-mono text-ink-subtle shrink-0">{{ e.cidade }}</span>
          </div>
          <p v-if="e.fila_sumiu_do_cv" class="text-micro text-data-neg mt-0.5">
            A fila vinculada não existe mais no CV. Escolha outra.
          </p>
          <select v-if="podeEditar" :value="e.idfila || ''"
            :disabled="salvando === e.idempreendimento"
            class="mt-1.5 w-full h-8 px-2 text-xs rounded-lg bg-surface-sunken border border-line text-ink
                   outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring/20 disabled:opacity-50"
            @change="vincular(e.idempreendimento, $event.target.value)">
            <option value="">Sem fila</option>
            <option v-for="d in destinos" :key="d.id" :value="d.id">
              {{ d.nome }}{{ d.semLista ? ' (sem corretor listado)' : '' }}
            </option>
          </select>
          <p v-else class="text-micro text-ink-muted mt-0.5">
            {{ e.fila_nome || 'Sem fila' }}
          </p>
        </div>
        <p v-if="!empreendimentosFiltrados.length" class="text-center py-8 text-xs text-ink-subtle">
          Nenhum empreendimento para esta busca.
        </p>
      </div>
    </div>

    <template v-else>
    <!-- Filtro simples: escopo + busca por nome -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <SegmentedControl v-model="escopo" :options="escopoOptions" size="sm" />
      <div class="relative flex-1 min-w-[10rem]">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
        <input v-model="busca" type="text" placeholder="Buscar fila..."
          class="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-surface-sunken border border-line text-ink
                 placeholder:text-ink-subtle outline-none
                 focus:border-accent focus:ring-2 focus:ring-accent-ring/20 transition-colors" />
      </div>
    </div>

    <div v-if="filtradas.length" class="space-y-2">
      <Fila v-for="fila in filtradas" :key="fila.idfila_distribuicao_leads" :fila="fila"
        :pode-editar="podeEditar" @desvincular="vincular($event, null)" />
    </div>

    <div v-else class="text-center py-12 text-ink-subtle">
      <i class="fas fa-inbox text-2xl mb-2 block"></i>
      <p class="text-sm">
        {{ todas.length ? 'Nenhuma fila para este filtro' : 'Nenhuma fila configurada' }}
      </p>
      <button v-if="todas.length && escopo === 'ativas'" type="button"
        @click="escopo = 'todas'" class="mt-2 text-xs text-accent hover:underline">
        Ver todas as filas
      </button>
    </div>
    </template>
  </Modal>
</template>
