<script setup>
import { onMounted, ref, computed } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import LeadFormEditModal from './components/LeadFormEditModal.vue';
import InternalLeadFormsTable from './components/InternalLeadFormsTable.vue';
import MetaLeadFormsTable from './components/MetaLeadFormsTable.vue';

const store = useLeadFormsStore();
const metaStore = useMetaFormsStore();

const modalOpen = ref(false);
const editing = ref(null);

const tab = ref('internal');

function openCreate() { editing.value = null; modalOpen.value = true; }
function openEdit(f)  { editing.value = f;    modalOpen.value = true; }
function onSaved()    { modalOpen.value = false; store.fetchAll(); }

onMounted(() => {
    store.fetchAll();
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

      <div v-show="tab === 'internal'">
        <InternalLeadFormsTable @edit="openEdit" />
      </div>

      <div v-show="tab === 'meta'">
        <MetaLeadFormsTable />
      </div>

      <LeadFormEditModal v-model:open="modalOpen" :form="editing" @saved="onSaved" />
    </PageContainer>
  </div>
</template>
