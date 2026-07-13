<script setup>
// Gerencia formulários INTERNOS (LPs hospedadas, embeds em site externo).
// Forms da Meta agora são gerenciados dentro das Campanhas — abrindo o anúncio
// que usa aquele form.

import { onMounted, ref } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import PeriodPicker from '../Campanhas/components/PeriodPicker.vue';
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

      <!-- Período mestre dos stats (padronizado com Campanhas/Leads/Captação) -->
      <div class="mb-3">
        <PeriodPicker :periodo="store.periodo" @update:periodo="store.setPeriodo" />
      </div>

      <!-- Aviso sobre forms Meta -->
      <div class="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-surface-sunken/30 px-3 py-2.5 text-xs text-ink-muted">
        <i class="fab fa-meta text-blue-500 mt-0.5"></i>
        <div>
          <b class="text-ink">Forms da Meta?</b> São gerenciados em
          <RouterLink to="/marketing/campanhas" class="text-accent hover:underline">Campanhas → abrir campanha → aba Anúncios → badge do form</RouterLink>.
          O mapeamento (empreendimento, mídia) vive na campanha; o de campos (pergunta → CV) vive no form.
        </div>
      </div>

      <InternalLeadFormsTable @edit="openEdit" />

      <LeadFormEditModal v-model:open="modalOpen" :form="editing" @saved="onSaved" />
    </PageContainer>
  </div>
</template>
