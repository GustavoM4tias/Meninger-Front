<script setup>
// Central Meta › aba Formulários — gerencia formulários INTERNOS (LPs
// hospedadas, embeds em site externo). Forms da Meta são gerenciados dentro
// das Campanhas — abrindo o anúncio que usa aquele form.
// (Panel do hub /meta — sem PageContainer/PageHeader próprios.)

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
  <div>
      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 mb-3">
          <Button variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">Novo formulário</Button>
      </div>

      <!-- Aviso sobre forms Meta -->
      <div class="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-surface-sunken/30 px-3 py-2.5 text-xs text-ink-muted">
        <i class="fab fa-meta text-blue-500 mt-0.5"></i>
        <div>
          <b class="text-ink">Forms da Meta?</b> São gerenciados em
          <RouterLink to="/meta?tab=campanhas" class="text-accent hover:underline">Campanhas → abrir campanha → aba Anúncios → badge do form</RouterLink>.
          O mapeamento (empreendimento, mídia) vive na campanha; o de campos (pergunta → CV) vive no form.
        </div>
      </div>

      <InternalLeadFormsTable @edit="openEdit" />

      <LeadFormEditModal v-model:open="modalOpen" :form="editing" @saved="onSaved" />
  </div>
</template>
