<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Modal from '@/components/UI/Modal.vue';
import Favorite from '@/components/config/Favorite.vue';

import OrganogramFlow from './components/OrganogramFlow.vue';

const store = useAuthStore();
const rootData = ref(null);
const allUsersMap = ref({});
const positionDescMap = ref({});
const totalVisible = ref(0);

const search = ref('');
const selectedPerson = ref(null);

// ── Ajustes do organograma (camada de overrides) ───
// { [user_id]: { display_parent_id, display_order, pos_x, pos_y } }. Sem nada aqui,
// o organograma renderiza idêntico ao automático (zero regressão).
const overrideMap = ref({});
const editMode = ref(false);
const reparentTarget = ref('');   // valor do select "posicionar no grupo de" do painel
const savingEdit = ref(false);

const isAdmin = computed(() =>
  store.user?.role === 'admin' || localStorage.getItem('role') === 'admin'
);

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  };
}

// ── Helpers ─────────────────────────────────────────
function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&rounded=true&background=random&bold=true&format=svg&size=96`;
}
function whatsappUrl(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `https://wa.me/55${digits}`;
}

// Pai efetivo: override.display_parent_id (se definido) senão o manager_id real.
function effectiveParentId(user) {
  const ov = overrideMap.value[user.id];
  if (ov && ov.display_parent_id != null) return ov.display_parent_id;
  return user.manager_id ?? null;
}

function nodeFor(user) {
  return {
    key: String(user.id),
    type: 'person',
    data: {
      id: user.id, image: avatarUrl(user.username),
      name: user.username, city: user.city,
      title: user.position, email: user.email,
      phone: user.phone || null, manager_id: user.manager_id,
    },
    children: [],
  };
}

// Ordena irmãos: quem tem display_order primeiro (por valor), resto por id (≈ ordem atual).
function siblingOrderKey(user) {
  const o = overrideMap.value[user.id]?.display_order;
  return o == null ? Number.POSITIVE_INFINITY : o;
}
function sortSiblings(arr) {
  return arr.sort((a, b) => {
    const ka = siblingOrderKey(a), kb = siblingOrderKey(b);
    if (ka !== kb) return ka - kb;
    return a.id - b.id;
  });
}

// Monta a árvore a partir do pai efetivo (aplica reparent + reorder). Guard de ciclo.
function buildTree() {
  const users = store.users;
  allUsersMap.value = Object.fromEntries(users.map(u => [u.id, u]));

  const visibleUsers = users.filter(u => u.status && u.show_in_organogram);
  const visibleIds = new Set(visibleUsers.map(u => u.id));
  totalVisible.value = visibleUsers.length;

  const childrenByParent = {};
  for (const u of visibleUsers) {
    const p = effectiveParentId(u);
    const key = (p != null && visibleIds.has(p)) ? p : '__root__';
    (childrenByParent[key] ||= []).push(u);
  }

  const visited = new Set();
  function build(user) {
    if (visited.has(user.id)) return null; // corta ciclo
    visited.add(user.id);
    const node = nodeFor(user);
    node.children = sortSiblings([...(childrenByParent[user.id] || [])])
      .map(build).filter(Boolean);
    return node;
  }

  const topLevel = sortSiblings([...(childrenByParent['__root__'] || [])]);
  const children = topLevel.map(build).filter(Boolean);

  // Rede de segurança: visíveis nunca alcançados a partir da raiz (ciclo indireto de
  // reparent) entrariam como "sumidos". Reanexa ao topo para não desaparecerem.
  const orphans = sortSiblings(visibleUsers.filter(u => !visited.has(u.id)));
  children.push(...orphans.map(build).filter(Boolean));

  rootData.value = {
    key: 'root', type: 'company',
    data: { image: '/Mlogo.png', name: 'Menin Engenharia', city: 'Marília, SP' },
    children,
  };
}

// ── Overrides: API ──────────────────────────────────
async function loadOverrides() {
  try {
    const res = await fetch(`${API_URL}/organogram/overrides`, { headers: authHeaders() });
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json?.data || []);
    overrideMap.value = Object.fromEntries(list.map(o => [o.user_id, o]));
  } catch (e) {
    console.error('Erro ao carregar ajustes do organograma:', e);
    overrideMap.value = {};
  }
}

async function putOverride(userId, patch) {
  const res = await fetch(`${API_URL}/organogram/overrides/${userId}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(patch),
  });
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || 'Falha ao salvar ajuste.');
  }
  return json?.data;
}

// Arrasto livre — persiste a posição e atualiza só o mapa local (sem rebuild p/ não "pular").
async function onUpdatePosition({ userId, x, y }) {
  try {
    const saved = await putOverride(userId, { pos_x: x, pos_y: y });
    overrideMap.value = {
      ...overrideMap.value,
      [userId]: saved || { ...(overrideMap.value[userId] || {}), user_id: userId, pos_x: x, pos_y: y },
    };
  } catch (e) {
    console.error(e);
  }
}

async function applyReparent() {
  if (!selectedPerson.value) return;
  const userId = selectedPerson.value.id;
  const parentId = reparentTarget.value === '' ? null : Number(reparentTarget.value);
  savingEdit.value = true;
  try {
    // Ao mover de grupo, limpa a posição livre p/ a pessoa entrar no fluxo do novo grupo.
    await putOverride(userId, { display_parent_id: parentId, pos_x: null, pos_y: null });
    await loadOverrides();
    buildTree();
  } catch (e) { alert(e.message); }
  finally { savingEdit.value = false; }
}

async function reorder(direction) {
  if (!selectedPerson.value) return;
  const userId = selectedPerson.value.id;
  const user = allUsersMap.value[userId];
  if (!user) return;
  const pid = effectiveParentId(user);
  const siblings = sortSiblings(
    store.users.filter(u => u.status && u.show_in_organogram && effectiveParentId(u) === pid)
  );
  const idx = siblings.findIndex(u => u.id === userId);
  const swap = idx + direction;
  if (idx < 0 || swap < 0 || swap >= siblings.length) return;
  [siblings[idx], siblings[swap]] = [siblings[swap], siblings[idx]];
  savingEdit.value = true;
  try {
    // Materializa display_order sequencial p/ todos os irmãos (ordem determinística).
    await Promise.all(siblings.map((u, i) => putOverride(u.id, { display_order: i })));
    await loadOverrides();
    buildTree();
  } catch (e) { alert(e.message); }
  finally { savingEdit.value = false; }
}

async function resetPositionOnly() {
  if (!selectedPerson.value) return;
  savingEdit.value = true;
  try {
    await putOverride(selectedPerson.value.id, { pos_x: null, pos_y: null });
    await loadOverrides();
    buildTree();
  } catch (e) { alert(e.message); }
  finally { savingEdit.value = false; }
}

async function resetPerson() {
  if (!selectedPerson.value) return;
  savingEdit.value = true;
  try {
    const res = await fetch(`${API_URL}/organogram/overrides/${selectedPerson.value.id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    const json = await res.json();
    if (!res.ok || json?.success === false) throw new Error(json?.error || 'Falha ao resetar.');
    reparentTarget.value = '';
    await loadOverrides();
    buildTree();
  } catch (e) { alert(e.message); }
  finally { savingEdit.value = false; }
}

function toggleEditMode() {
  editMode.value = !editMode.value;
  selectedPerson.value = null; // evita painel em estado inconsistente ao alternar
}

// Opções do select "posicionar no grupo de" — visíveis, exceto a própria pessoa.
const reparentOptions = computed(() => {
  const selfId = selectedPerson.value?.id;
  return store.users
    .filter(u => u.status && u.show_in_organogram && u.id !== selfId)
    .map(u => ({ id: u.id, label: `${u.username}${u.position ? ' · ' + u.position : ''}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
});
const selectedOverride = computed(() =>
  selectedPerson.value ? (overrideMap.value[selectedPerson.value.id] || null) : null
);
const hasManualPos = computed(() =>
  !!(selectedOverride.value && selectedOverride.value.pos_x != null && selectedOverride.value.pos_y != null)
);

// ── Search: filtra preservando ancestrais ──────────
function filterTree(node, query) {
  if (!query) return node;
  const q = query.toLowerCase();
  const matches = (n) => [n.data.name, n.data.title, n.data.city, n.data.email]
    .filter(Boolean).some(s => s.toLowerCase().includes(q));

  function walk(n) {
    const filteredChildren = (n.children || []).map(walk).filter(Boolean);
    if (matches(n) || filteredChildren.length) {
      return { ...n, children: filteredChildren };
    }
    return null;
  }
  return walk(node);
}

const filteredRoot = computed(() => {
  if (!rootData.value) return null;
  return filterTree(rootData.value, search.value);
});

const visibleChildren = computed(() => filteredRoot.value?.children || []);
const hasResults = computed(() => visibleChildren.value.length > 0);

// ── Selection ──────────────────────────────────────
function selectPerson(personData) {
  const full = allUsersMap.value[personData.id];
  selectedPerson.value = {
    ...personData,
    managerName: full?.manager?.username ?? null,
    positionDesc: positionDescMap.value[personData.title] || '',
  };
  reparentTarget.value = overrideMap.value[personData.id]?.display_parent_id ?? '';
}
function closePerson() { selectedPerson.value = null; }

// ── Init ───────────────────────────────────────────
onMounted(async () => {
  const [, resPos] = await Promise.allSettled([
    store.getAllUsers(),
    fetch(`${API_URL}/admin/positions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }),
  ]);

  if (resPos.status === 'fulfilled') {
    const posData = await resPos.value.json();
    const posList = Array.isArray(posData) ? posData : (posData?.data || []);
    positionDescMap.value = Object.fromEntries(
      posList.filter(p => p?.active).map(p => [p.name, p.description || ''])
    );
  }

  await loadOverrides();
  buildTree();
});
</script>

<template>
  <div class="h-[calc(100vh-3.5rem)] flex flex-col bg-surface" @click="closePerson">

    <!-- Header compacto -->
    <PageContainer size="full" :padded="false" class="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3">
      <PageHeader
        title="Organograma"
        subtitle="Estrutura hierárquica da equipe"
        icon="fas fa-sitemap">
        <template #title>
          <span>Organograma</span>
          <Favorite :router="'/settings/organograma'" :section="'Organograma'" />
        </template>
        <template #actions>
          <Badge v-if="totalVisible > 0" variant="neutral" size="sm">
            <i class="fas fa-users text-[9px]"></i>
            {{ totalVisible }} pessoa(s)
          </Badge>
          <Button v-if="isAdmin" size="sm"
            :variant="editMode ? 'primary' : 'secondary'"
            :icon="editMode ? 'fas fa-check' : 'fas fa-pen-ruler'"
            @click.stop="toggleEditMode">
            {{ editMode ? 'Concluir edição' : 'Editar layout' }}
          </Button>
          <div class="w-56 sm:w-72" @click.stop>
            <Input v-model="search" size="sm" placeholder="Buscar..."
              iconLeft="fas fa-magnifying-glass" />
          </div>
        </template>
      </PageHeader>
    </PageContainer>

    <!-- Diagrama: ocupa todo o resto da tela -->
    <div class="flex-1 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 min-h-0" @click.stop>
      <Surface variant="raised" padding="none" class="w-full h-full overflow-hidden relative">

        <!-- Empty -->
        <EmptyState v-if="rootData && !rootData.children.length" size="lg"
          icon="fas fa-sitemap" title="Nenhum colaborador no organograma"
          description='Acesse o painel de usuários e ative "Exibir no organograma" para cada colaborador.' />

        <EmptyState v-else-if="search && !hasResults" size="lg"
          icon="fas fa-magnifying-glass" title="Nenhum resultado"
          :description="`Nenhuma pessoa corresponde a &quot;${search}&quot;.`">
          <template #actions>
            <Button variant="secondary" @click="search = ''">Limpar busca</Button>
          </template>
        </EmptyState>

        <!-- Diagrama -->
        <OrganogramFlow v-else-if="filteredRoot"
          :root-node="filteredRoot"
          :selected-id="selectedPerson?.id"
          :edit-mode="editMode"
          :override-map="overrideMap"
          @select="selectPerson"
          @update-position="onUpdatePosition" />

        <!-- Faixa de dica no modo edição (absoluta — ordem no DOM não afeta a cadeia v-if acima) -->
        <div v-if="editMode" @click.stop
          class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                 px-3.5 py-2 rounded-full bg-surface-overlay border border-accent/30 shadow-elevated
                 text-xs text-ink-muted backdrop-blur pointer-events-none">
          <i class="fas fa-pen-ruler text-accent"></i>
          <span>Modo edição — <strong class="text-ink">arraste</strong> os cards ou <strong class="text-ink">clique</strong> numa pessoa para mover de grupo / reordenar.</span>
        </div>

      </Surface>
    </div>

    <!-- Modal de informações / edição da pessoa (centralizado, padrão do sistema) -->
    <Modal :open="!!selectedPerson" size="sm" @close="closePerson">
      <template #header>
        <div class="flex items-center gap-3 min-w-0">
          <img :src="selectedPerson?.image" :alt="selectedPerson?.name"
            class="w-11 h-11 rounded-xl ring-1 ring-line shrink-0" />
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-semibold text-ink truncate leading-tight">{{ selectedPerson?.name }}</h3>
            <p v-if="selectedPerson?.title" class="text-xs text-accent truncate mt-0.5">{{ selectedPerson.title }}</p>
          </div>
          <span v-if="editMode"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent
                   text-[10px] font-medium border border-accent/20 shrink-0">
            <i class="fas fa-pen-ruler text-[9px]"></i> Editando
          </span>
        </div>
      </template>

      <!-- Modo edição: ajustes do organograma -->
      <div v-if="editMode" class="space-y-3">
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Ajustes do organograma</p>

        <div>
          <label class="text-xs text-ink-muted">Posicionar no grupo de</label>
          <select v-model="reparentTarget" :disabled="savingEdit" @change="applyReparent"
            class="org-edit-select">
            <option value="">— Usar gestor real —</option>
            <option v-for="o in reparentOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-ink-muted">Ordem entre colegas</span>
          <div class="flex gap-1.5">
            <button class="org-edit-chip" :disabled="savingEdit" @click="reorder(-1)" title="Mover para a esquerda">
              <i class="fas fa-arrow-left"></i>
            </button>
            <button class="org-edit-chip" :disabled="savingEdit" @click="reorder(1)" title="Mover para a direita">
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <button v-if="hasManualPos" class="org-edit-btn" :disabled="savingEdit" @click="resetPositionOnly">
            <i class="fas fa-arrows-to-dot text-[11px]"></i> Resetar posição manual
          </button>
          <button class="org-edit-btn is-danger" :disabled="savingEdit" @click="resetPerson">
            <i class="fas fa-rotate-left text-[11px]"></i> Resetar todos os ajustes
          </button>
        </div>

        <p class="text-[11px] text-ink-subtle leading-relaxed pt-2 border-t border-line/60">
          <i class="fas fa-hand-pointer text-accent"></i>
          Arraste o card no organograma para posicioná-lo livremente.
        </p>
      </div>

      <!-- Modo leitura: informações -->
      <div v-else class="space-y-4">
        <div v-if="selectedPerson?.positionDesc"
          class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5 text-xs text-accent leading-relaxed">
          {{ selectedPerson.positionDesc }}
        </div>

        <ul class="space-y-1.5 text-sm">
          <li v-if="selectedPerson?.city" class="flex items-center gap-2.5 text-ink-muted">
            <div class="h-7 w-7 rounded-lg bg-surface-sunken border border-line grid place-items-center shrink-0">
              <i class="fas fa-location-dot text-ink-subtle text-xs"></i>
            </div>
            <span class="truncate text-xs">{{ selectedPerson.city }}</span>
          </li>
          <li v-if="selectedPerson?.managerName" class="flex items-center gap-2.5 text-ink-muted">
            <div class="h-7 w-7 rounded-lg bg-surface-sunken border border-line grid place-items-center shrink-0">
              <i class="fas fa-user-tie text-ink-subtle text-xs"></i>
            </div>
            <span class="truncate text-xs">{{ selectedPerson.managerName }}</span>
          </li>
          <li v-if="selectedPerson?.phone" class="flex items-center gap-2.5 text-ink-muted">
            <div class="h-7 w-7 rounded-lg bg-surface-sunken border border-line grid place-items-center shrink-0">
              <i class="fas fa-phone text-ink-subtle text-xs"></i>
            </div>
            <span class="truncate text-xs font-mono">{{ selectedPerson.phone }}</span>
          </li>
        </ul>

        <div class="grid gap-2 pt-1" :class="selectedPerson?.phone ? 'grid-cols-2' : 'grid-cols-1'">
          <a v-if="selectedPerson?.email" :href="`mailto:${selectedPerson.email}`"
            class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                   bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-soft">
            <i class="fas fa-envelope text-[11px]"></i> E-mail
          </a>
          <a v-if="selectedPerson?.phone" :href="whatsappUrl(selectedPerson.phone)" target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                   bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors shadow-soft">
            <i class="fab fa-whatsapp text-sm"></i> WhatsApp
          </a>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
/* ── Controles do modo edição (painel) ── */
.org-edit-select {
  margin-top: 0.25rem;
  width: 100%;
  font-size: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(var(--line));
  background: rgb(var(--surface-sunken));
  color: rgb(var(--ink));
  padding: 0.5rem 0.5rem;
  outline: none;
}
.org-edit-select:focus { border-color: rgb(var(--accent) / 0.6); }

.org-edit-chip {
  height: 30px; width: 34px;
  display: grid; place-items: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(var(--line));
  background: rgb(var(--surface-sunken));
  color: rgb(var(--ink-muted));
  font-size: 11px;
  transition: all 0.15s ease;
}
.org-edit-chip:hover:not(:disabled) {
  border-color: rgb(var(--accent) / 0.5);
  color: rgb(var(--accent));
}
.org-edit-chip:disabled { opacity: 0.5; cursor: not-allowed; }

.org-edit-btn {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(var(--line));
  background: rgb(var(--surface-sunken));
  color: rgb(var(--ink-muted));
  font-size: 0.75rem; font-weight: 500;
  transition: all 0.15s ease;
}
.org-edit-btn:hover:not(:disabled) {
  border-color: rgb(var(--accent) / 0.5);
  color: rgb(var(--accent));
}
.org-edit-btn.is-danger:hover:not(:disabled) {
  border-color: rgb(239 68 68 / 0.5);
  color: rgb(239 68 68);
}
.org-edit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
