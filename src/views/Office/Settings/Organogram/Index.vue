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
import Favorite from '@/components/config/Favorite.vue';

import OrganogramFlow from './components/OrganogramFlow.vue';

const store = useAuthStore();
const rootData = ref(null);
const allUsersMap = ref({});
const positionDescMap = ref({});
const totalVisible = ref(0);

const search = ref('');
const selectedPerson = ref(null);

// ── Helpers ─────────────────────────────────────────
function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&rounded=true&background=random&bold=true&format=svg&size=96`;
}
function whatsappUrl(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `https://wa.me/55${digits}`;
}

function buildHierarchy(user, visibleUsers) {
  return {
    key: String(user.id),
    type: 'person',
    data: {
      id: user.id, image: avatarUrl(user.username),
      name: user.username, city: user.city,
      title: user.position, email: user.email,
      phone: user.phone || null, manager_id: user.manager_id,
    },
    children: user.subordinates
      .map(sub => visibleUsers.find(u => u.id === sub.id))
      .filter(Boolean)
      .map(sub => buildHierarchy(sub, visibleUsers))
      .filter(Boolean),
  };
}

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

  const users = store.users;
  allUsersMap.value = Object.fromEntries(users.map(u => [u.id, u]));

  const visibleUsers = users.filter(u => u.status && u.show_in_organogram);
  const visibleIds = new Set(visibleUsers.map(u => u.id));
  totalVisible.value = visibleUsers.length;

  const topLevelUsers = visibleUsers.filter(u =>
    u.manager_id === null || !visibleIds.has(u.manager_id)
  );

  rootData.value = {
    key: 'root', type: 'company',
    data: { image: '/Mlogo.png', name: 'Menin Engenharia', city: 'Marília, SP' },
    children: topLevelUsers.map(top => buildHierarchy(top, visibleUsers)).filter(Boolean),
  };
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
          @select="selectPerson" />

        <!-- Painel info flutuante -->
        <Transition name="slide-right">
          <aside v-if="selectedPerson"
            class="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] z-20
                   bg-surface-overlay border border-line rounded-2xl shadow-overlay overflow-hidden surface-gradient"
            @click.stop>

            <!-- Banner -->
            <div class="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 text-white px-4 pt-4 pb-3 overflow-hidden">
              <div class="pointer-events-none absolute inset-0 opacity-30"
                style="background-image:radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 14px 14px;"></div>

              <div class="relative flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <img :src="selectedPerson.image" :alt="selectedPerson.name"
                    class="w-10 h-10 rounded-lg ring-2 ring-white/30 shrink-0" />
                  <div class="min-w-0">
                    <h3 class="font-semibold text-sm truncate leading-tight">{{ selectedPerson.name }}</h3>
                    <p class="text-xs text-white/80 truncate mt-0.5">{{ selectedPerson.title }}</p>
                  </div>
                </div>
                <button @click="closePerson" aria-label="Fechar"
                  class="h-8 w-8 grid place-items-center rounded-lg bg-white/15 hover:bg-white/30 backdrop-blur text-white transition-colors shrink-0">
                  <i class="fas fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="p-4 space-y-3">
              <div v-if="selectedPerson.positionDesc"
                class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5 text-xs text-accent leading-relaxed">
                {{ selectedPerson.positionDesc }}
              </div>

              <ul class="space-y-1.5 text-sm">
                <li v-if="selectedPerson.city" class="flex items-center gap-2.5 text-ink-muted">
                  <div class="h-7 w-7 rounded-lg bg-surface-sunken border border-line grid place-items-center shrink-0">
                    <i class="fas fa-location-dot text-ink-subtle text-xs"></i>
                  </div>
                  <span class="truncate text-xs">{{ selectedPerson.city }}</span>
                </li>
                <li v-if="selectedPerson.managerName" class="flex items-center gap-2.5 text-ink-muted">
                  <div class="h-7 w-7 rounded-lg bg-surface-sunken border border-line grid place-items-center shrink-0">
                    <i class="fas fa-user-tie text-ink-subtle text-xs"></i>
                  </div>
                  <span class="truncate text-xs">{{ selectedPerson.managerName }}</span>
                </li>
                <li v-if="selectedPerson.phone" class="flex items-center gap-2.5 text-ink-muted">
                  <div class="h-7 w-7 rounded-lg bg-surface-sunken border border-line grid place-items-center shrink-0">
                    <i class="fas fa-phone text-ink-subtle text-xs"></i>
                  </div>
                  <span class="truncate text-xs font-mono">{{ selectedPerson.phone }}</span>
                </li>
              </ul>

              <div class="grid gap-2 pt-1" :class="selectedPerson.phone ? 'grid-cols-2' : 'grid-cols-1'">
                <a v-if="selectedPerson.email" :href="`mailto:${selectedPerson.email}`"
                  class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                         bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-soft">
                  <i class="fas fa-envelope text-[11px]"></i> E-mail
                </a>
                <a v-if="selectedPerson.phone" :href="whatsappUrl(selectedPerson.phone)" target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                         bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors shadow-soft">
                  <i class="fab fa-whatsapp text-sm"></i> WhatsApp
                </a>
              </div>
            </div>
          </aside>
        </Transition>
      </Surface>
    </div>
  </div>
</template>

<style scoped>
.slide-right-enter-active, .slide-right-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
