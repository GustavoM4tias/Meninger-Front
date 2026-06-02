<script setup>
// Gerencia formulários INTERNOS (LPs hospedadas, embeds em site externo).
// Forms da Meta agora são gerenciados dentro das Campanhas — abrindo o anúncio
// que usa aquele form.

import { onMounted, ref } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
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
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Formulários de Captação"
        subtitle="Formulários internos hospedados (LPs em lp.menin.com.br + embeds em site externo)."
        icon="fas fa-square-poll-vertical">
        <template #actions>
          <Button variant="primary" size="sm" icon="fas fa-plus" @click="openCreate">Novo formulário</Button>
        </template>
      </PageHeader>

      <!-- Aviso sobre forms Meta -->
      <div class="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
        <i class="fas fa-circle-info mr-1"></i>
        <b>Forms da Meta?</b> Agora são gerenciados em
        <RouterLink to="/marketing/campanhas" class="underline">Campanhas → abrir campanha → aba Anúncios → clicar no badge do form</RouterLink>.
        O mapeamento (empreendimento, mídia) vive na campanha; o mapeamento de campos (pergunta → CV) vive no form.
      </div>

      <InternalLeadFormsTable @edit="openEdit" />

      <LeadFormEditModal v-model:open="modalOpen" :form="editing" @saved="onSaved" />
    </PageContainer>
  </div>
</template>
