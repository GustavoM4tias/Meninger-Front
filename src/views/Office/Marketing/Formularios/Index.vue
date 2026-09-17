<script setup>
// Central Meta › aba Formulários - gerencia formulários INTERNOS (LPs
// hospedadas, embeds em site externo). Forms da Meta são gerenciados dentro
// das Campanhas - abrindo o anúncio que usa aquele form.
// (Panel do hub /meta - sem PageContainer/PageHeader próprios.)

import { onMounted, ref } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import Button from '@/components/UI/Button.vue';
import LeadFormEditModal from './components/LeadFormEditModal.vue';
import InternalLeadFormsTable from './components/InternalLeadFormsTable.vue';

const store = useLeadFormsStore();

const modalOpen = ref(false);
const editing = ref(null);

function openCreate() { editing.value = null; modalOpen.value = true; }
function openEdit(f)  { editing.value = f;    modalOpen.value = true; }
function onSaved()    { modalOpen.value = false; store.fetchAll(); }

onMounted(() => store.fetchAll());
</script>

<template>
  <div class="space-y-4">
      <!-- Toolbar da aba (o header vive no hub Central Meta). Forms da Meta não
           moram aqui: abrem pela campanha que os usa. -->
      <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-ink-muted flex items-center gap-1.5 min-w-0">
            <i class="fab fa-meta text-accent"></i>
            <span>Forms da Meta ficam em
              <RouterLink to="/meta?tab=campanhas" class="text-accent hover:underline">Campanhas</RouterLink>:
              abra a campanha, aba Estrutura, selo do form.</span>
          </p>
          <Button variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">Novo formulário</Button>
      </div>

      <InternalLeadFormsTable @edit="openEdit" />

      <LeadFormEditModal v-model:open="modalOpen" :form="editing" @saved="onSaved" />
  </div>
</template>
