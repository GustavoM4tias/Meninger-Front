<script setup>
import { onMounted, ref, computed } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import LeadFormEditModal from './components/LeadFormEditModal.vue';
import MetaLeadFormsTable from './components/MetaLeadFormsTable.vue';

const store = useLeadFormsStore();
const metaStore = useMetaFormsStore();

const modalOpen = ref(false);
const editing = ref(null);

// Tabs: 'internal' (LPs do site) | 'meta' (Lead Ads)
const tab = ref('internal');

function openCreate() { editing.value = null; modalOpen.value = true; }
function openEdit(f)  { editing.value = f;    modalOpen.value = true; }
function onSaved()    { modalOpen.value = false; store.fetchAll(); }

onMounted(() => {
    store.fetchAll();
    // Carrega Meta também — assim o badge na tab mostra contagem.
    metaStore.fetchAll();
});

const internalCount = computed(() => store.forms.length);
const metaCount = computed(() => metaStore.forms.length);
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Formulários de Captação"
        subtitle="Gerencie os formulários internos (LPs) e o mapeamento dos formulários Meta Lead Ads."
        icon="fas fa-square-poll-vertical">
        <template #actions>
          <template v-if="tab === 'internal'">
            <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" @click="store.fetchAll">Atualizar</Button>
            <Button variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">Novo formulário</Button>
          </template>
        </template>
      </PageHeader>

      <!-- Tabs -->
      <div class="mb-4 border-b border-line">
        <nav class="flex gap-1">
          <button @click="tab = 'internal'"
            :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              tab === 'internal'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink']">
            <i class="fas fa-globe"></i>
            Formulários internos
            <span class="text-[10px] font-mono rounded bg-surface-sunken/60 px-1.5 py-0.5">{{ internalCount }}</span>
          </button>
          <button @click="tab = 'meta'"
            :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              tab === 'meta'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink']">
            <i class="fab fa-meta"></i>
            Formulários Meta
            <span class="text-[10px] font-mono rounded bg-surface-sunken/60 px-1.5 py-0.5">{{ metaCount }}</span>
          </button>
        </nav>
      </div>

      <!-- Tab: Internos -->
      <div v-show="tab === 'internal'">
        <div v-if="store.error"
          class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ store.error }}
        </div>

        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Slug</th>
                  <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Nome</th>
                  <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
                  <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Origem</th>
                  <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreend.</th>
                  <th class="px-4 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ativo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-if="store.loading">
                  <td colspan="6" class="px-4 py-10 text-center text-ink-subtle">
                    <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
                  </td>
                </tr>
                <tr v-else-if="!store.forms.length">
                  <td colspan="6" class="px-4 py-10 text-center text-ink-subtle">
                    Nenhum formulário ainda. Clique em "Novo formulário".
                  </td>
                </tr>
                <tr v-else v-for="f in store.forms" :key="f.id"
                  @click="openEdit(f)"
                  class="hover:bg-surface-hover/40 cursor-pointer transition-colors">
                  <td class="px-4 py-2.5 font-mono text-xs text-ink">{{ f.slug }}</td>
                  <td class="px-4 py-2.5 text-ink font-medium">{{ f.name }}</td>
                  <td class="px-4 py-2.5 text-ink-muted">{{ f.midia_slug || '—' }}</td>
                  <td class="px-4 py-2.5 text-ink-muted">{{ f.cv_origem || '—' }}</td>
                  <td class="px-4 py-2.5 text-ink-muted">
                    {{ Array.isArray(f.bound_empreendimentos) && f.bound_empreendimentos.length
                         ? f.bound_empreendimentos.join(', ')
                         : '—' }}
                  </td>
                  <td class="px-4 py-2.5 text-center">
                    <span :class="['inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                      f.active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border-slate-500/20']">
                      {{ f.active ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      <!-- Tab: Meta -->
      <div v-show="tab === 'meta'">
        <MetaLeadFormsTable />
      </div>

      <LeadFormEditModal v-model:open="modalOpen" :form="editing" @saved="onSaved" />
    </PageContainer>
  </div>
</template>
