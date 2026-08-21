<script setup>
// Modal de liberação de EMPREENDIMENTOS (dados) para um sujeito:
//   subject-type="user"    → liberação individual
//   subject-type="profile" → liberação do perfil vivo (propaga p/ vinculados)
//
// A liberação é sempre por EMPREENDIMENTO (auditável; empreendimento novo não
// entra sozinho). Cidade e empresa são caminhos para chegar neles.
//
// ── Por que mudou (2026-08-20) ───────────────────────────────────────────────
// Antes, cidade era uma grade de ~60 chips que a pessoa caçava a olho, e cada
// chip concedia direto. Dois problemas: achar a cidade era o trabalho, e a
// mesma cidade aparecia duas vezes quando o cadastro tinha duas grafias
// ("Marilia" e "Marília"), com os empreendimentos divididos entre as duas -
// quem liberasse por uma delas deixava a outra metade de fora, calado.
//
// Agora ACHAR e CONCEDER são passos separados: cidade e empresa são FILTROS
// (no MultiSelector do sistema, com busca), e a concessão em massa é explícita
// sobre o que está filtrado - com o número na frente do botão. A cidade vem
// agrupada e com o nome oficial do município, resolvido pelo backend.
import { ref, computed, watch } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { useIncrementalList } from '@/composables/useIncrementalList';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  subjectType: { type: String, default: 'user' },   // 'user' | 'profile'
  subjectId: { type: [Number, String], default: null },
  subjectName: { type: String, default: '' },
});
const emit = defineEmits(['close', 'saved']);

const options = ref([]);       // [{ id, name, city, cityKey, cityLabel, uf, companyId, companyName, pairStatus }]
const selected = ref(new Set());
const original = ref(new Set());
const loading = ref(false);
const saving = ref(false);
const error = ref('');

const busca = ref('');
const cidadesSel = ref([]);
const empresasSel = ref([]);
const listaEl = ref(null);

const dirty = computed(() => {
  if (selected.value.size !== original.value.size) return true;
  for (const id of selected.value) if (!original.value.has(id)) return true;
  return false;
});

/* ── Opções dos filtros ────────────────────────────────────────────────────
   Cidade vem agrupada pelo backend (cityLabel): duas grafias da mesma cidade
   são UMA opção, com todos os empreendimentos das duas. */
const cidadesOptions = computed(() => {
  const set = new Set();
  for (const o of options.value) if (o.cityLabel) set.add(o.cityLabel);
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
});
const empresasOptions = computed(() => {
  const set = new Set();
  for (const o of options.value) set.add(o.companyName || 'Sem empresa vinculada');
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const empresaDe = (o) => o.companyName || 'Sem empresa vinculada';

const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  const cid = new Set(cidadesSel.value);
  const emp = new Set(empresasSel.value);
  return options.value.filter(o => {
    if (cid.size && !cid.has(o.cityLabel)) return false;
    if (emp.size && !emp.has(empresaDe(o))) return false;
    if (!q) return true;
    return (o.name || '').toLowerCase().includes(q)
      || (o.cityLabel || '').toLowerCase().includes(q)
      || empresaDe(o).toLowerCase().includes(q);
  });
});

const temFiltro = computed(() => !!(busca.value.trim() || cidadesSel.value.length || empresasSel.value.length));
const liberadosNoFiltro = computed(() => filtrados.value.filter(o => selected.value.has(o.id)).length);

/* 1.624 empreendimentos não cabem no DOM de uma vez - a lista cresce conforme
   se rola, como no resto do sistema. */
const inc = useIncrementalList(filtrados, { step: 50, root: listaEl });

/* Agrupa só a fatia visível: a árvore continua sendo Empresa → Empreendimentos,
   mas sem montar 1.624 linhas de saída. */
const gruposVisiveis = computed(() => {
  const mapa = new Map();
  for (const o of inc.visiveis.value) {
    const chave = o.companyId || 'sem-empresa';
    if (!mapa.has(chave)) mapa.set(chave, { companyId: o.companyId, companyName: empresaDe(o), items: [] });
    mapa.get(chave).items.push(o);
  }
  return [...mapa.values()];
});

/* ── Ações ─────────────────────────────────────────────────────────────── */
function alternarUm(id) {
  const s = new Set(selected.value);
  s.has(id) ? s.delete(id) : s.add(id);
  selected.value = s;
}
function alternarGrupo(grupo, conceder) {
  const s = new Set(selected.value);
  for (const o of grupo.items) conceder ? s.add(o.id) : s.delete(o.id);
  selected.value = s;
}
const grupoTodoSelecionado = (grupo) => grupo.items.every(o => selected.value.has(o.id));

/* Ação em massa sobre O QUE ESTÁ FILTRADO, com o número no rótulo. Antes só
   havia "liberar tudo" e "limpar tudo", sem meio-termo: com 1.624
   empreendimentos, o meio-termo é justamente o que se usa. */
function liberarFiltrados() {
  const s = new Set(selected.value);
  for (const o of filtrados.value) s.add(o.id);
  selected.value = s;
}
function tirarFiltrados() {
  const s = new Set(selected.value);
  for (const o of filtrados.value) s.delete(o.id);
  selected.value = s;
}
function limparFiltro() {
  busca.value = ''; cidadesSel.value = []; empresasSel.value = [];
}

async function load() {
  if (!props.subjectId) return;
  loading.value = true;
  error.value = '';
  try {
    const [opts, grants] = await Promise.all([
      requestWithAuth('/permissions/enterprise-options'),
      requestWithAuth(`/permissions/grants/${props.subjectType}/${props.subjectId}`),
    ]);
    options.value = Array.isArray(opts) ? opts : [];
    selected.value = new Set((grants?.enterpriseIds || []).map(Number));
    original.value = new Set(selected.value);
  } catch (e) {
    error.value = e.message || 'Erro ao carregar liberações.';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  try {
    await requestWithAuth(`/permissions/grants/${props.subjectType}/${props.subjectId}`, {
      method: 'PUT',
      body: JSON.stringify({ enterpriseIds: [...selected.value] }),
    });
    original.value = new Set(selected.value);
    emit('saved');
    emit('close');
  } catch (e) {
    error.value = e.message || 'Erro ao salvar liberações.';
  } finally {
    saving.value = false;
  }
}

watch(() => [props.open, props.subjectId], ([aberto]) => {
  if (aberto) { limparFiltro(); load(); }
});
</script>

<template>
  <Modal :open="open" size="xl" :title="`Empreendimentos de ${subjectName}`"
    :subtitle="subjectType === 'profile'
      ? 'Vale para todo mundo que aponta para este perfil.'
      : 'Liberação individual desta pessoa.'"
    @close="emit('close')">

    <div class="space-y-3">
      <div v-if="error"
        class="rounded-lg border border-data-neg/25 bg-data-neg/10 px-3 py-2 text-xs text-data-neg">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ error }}
      </div>

      <div v-if="loading" class="space-y-2">
        <Skeleton variant="text" :lines="2" />
        <Skeleton variant="table" :lines="5" />
      </div>

      <template v-else>
        <EmptyState v-if="!options.length" icon="far fa-building"
          title="Nenhum empreendimento no registro"
          description="Rode a Sincronização de empresas (Settings > Empresas) primeiro." />

        <template v-else>
          <!-- Achar: cidade e empresa são filtros, não concessão -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MultiSelector label="Cidade" :model-value="cidadesSel"
              @update:modelValue="v => cidadesSel = Array.isArray(v) ? v : []"
              :options="cidadesOptions" placeholder="Todas as cidades" overlay />
            <MultiSelector label="Empresa" :model-value="empresasSel"
              @update:modelValue="v => empresasSel = Array.isArray(v) ? v : []"
              :options="empresasOptions" placeholder="Todas as empresas" overlay />
          </div>

          <Input v-model="busca" placeholder="Buscar empreendimento pelo nome"
            iconLeft="fas fa-magnifying-glass" />

          <!-- Linha de estado: o que está liberado e o que o filtro alcança -->
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span class="tabular-nums">
              <b class="text-ink">{{ selected.size }}</b> de {{ options.length }} liberados
            </span>
            <template v-if="temFiltro">
              <span class="text-ink-subtle">·</span>
              <span class="tabular-nums">
                filtro alcança <b class="text-ink">{{ filtrados.length }}</b>
                ({{ liberadosNoFiltro }} já liberados)
              </span>
              <button type="button"
                class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                       text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
                @click="limparFiltro">
                limpar filtro <i class="fas fa-xmark text-micro"></i>
              </button>
            </template>
          </div>

          <!-- Conceder: explícito, e sempre com o número -->
          <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon="fas fa-check-double"
              :disabled="!filtrados.length || liberadosNoFiltro === filtrados.length"
              @click="liberarFiltrados">
              Liberar {{ temFiltro ? `os ${filtrados.length} filtrados` : 'todos' }}
            </Button>
            <Button size="sm" variant="ghost" icon="fas fa-ban"
              :disabled="!liberadosNoFiltro" @click="tirarFiltrados">
              Tirar {{ temFiltro ? `os ${liberadosNoFiltro} do filtro` : 'todos' }}
            </Button>
          </div>

          <EmptyState v-if="!filtrados.length" size="sm" icon="fas fa-magnifying-glass"
            title="Nada com esse filtro"
            description="Tire uma cidade ou apague a busca para ver mais." />

          <!-- Árvore Empresa → Empreendimentos, só a fatia visível -->
          <div v-else ref="listaEl" class="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
            <div v-for="grupo in gruposVisiveis" :key="grupo.companyId || 'none'"
              class="border border-line rounded-lg overflow-hidden bg-surface-raised">
              <div class="flex items-center justify-between gap-3 px-3 py-2 bg-surface-sunken/40">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-building text-ink-subtle text-xs"></i>
                  <span class="text-xs font-medium text-ink truncate">{{ grupo.companyName }}</span>
                  <span class="text-micro text-ink-subtle font-mono tabular-nums">
                    {{ grupo.items.filter(o => selected.has(o.id)).length }}/{{ grupo.items.length }}
                  </span>
                </div>
                <Switch :model-value="grupoTodoSelecionado(grupo)" size="sm"
                  @update:model-value="(v) => alternarGrupo(grupo, v)" />
              </div>
              <div class="divide-y divide-line-subtle">
                <div v-for="o in grupo.items" :key="o.id"
                  class="flex items-center justify-between gap-3 px-3 py-2 min-h-[2.75rem]
                         hover:bg-surface-sunken/30 transition-colors duration-120">
                  <div class="min-w-0 flex items-center gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-ink truncate">{{ o.name || '-' }}</p>
                      <p class="text-micro font-mono text-ink-subtle truncate">
                        {{ o.cityLabel || 'sem cidade' }}<span v-if="o.uf">/{{ o.uf }}</span>
                      </p>
                    </div>
                    <Badge v-if="o.pairStatus !== 'paired'" variant="warning" size="sm">
                      {{ o.pairStatus === 'cv_only' ? 'só CV' : 'só Sienge' }}
                    </Badge>
                  </div>
                  <Switch :model-value="selected.has(o.id)" size="sm"
                    @update:model-value="() => alternarUm(o.id)" />
                </div>
              </div>
            </div>

            <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
              class="py-4 flex items-center justify-center gap-2 text-micro text-ink-subtle">
              <Spinner size="sm" />
              carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
            </div>
          </div>
        </template>
      </template>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>
      <Button :loading="saving" :disabled="!dirty" icon="fas fa-floppy-disk" @click="save">
        {{ saving ? 'Salvando...' : 'Salvar liberações' }}
      </Button>
    </template>
  </Modal>
</template>
