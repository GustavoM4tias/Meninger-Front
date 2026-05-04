<script setup>
import { ref, computed } from 'vue';
import { useAIStore } from '@/stores/Config/aiStore.js';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Favorite from '@/components/config/Favorite.vue';
import History from './components/History.vue';

const aiStore = useAIStore();

const contratoCaixa = ref(null);
const confissaoDivida = ref(null);
const resultado = ref(null);
const loading = ref(false);

async function handleSubmit() {
  loading.value = true;
  resultado.value = null;
  const formData = new FormData();
  formData.append('contrato_caixa', contratoCaixa.value);
  formData.append('confissao_divida', confissaoDivida.value);
  await aiStore.validateDocuments(formData);
  resultado.value = aiStore.validatorResult;
  loading.value = false;
}

const messageBorderClass = (nivel) => ({
  correto: 'border-emerald-500/30 bg-emerald-500/10',
  alerta: 'border-amber-500/30 bg-amber-500/10',
  incorreto: 'border-red-500/30 bg-red-500/10',
}[nivel] || 'border-line bg-surface-sunken');

const messageVariant = (nivel) => ({
  correto: 'success', alerta: 'warning', incorreto: 'danger',
}[nivel] || 'neutral');

const iconNivel = (nivel) => ({
  correto: '✅', alerta: '⚠️', incorreto: '❌',
}[nivel] || '❓');

const countByLevel = (nivel) => resultado.value?.mensagens?.filter(m => m.nivel === nivel).length || 0;

const stats = computed(() => {
  const list = aiStore.validatorHistory || [];
  return {
    total: list.length,
    aprovados: list.filter(v => v.status === 'APROVADO').length,
    reprovados: list.filter(v => v.status === 'REPROVADO').length,
  };
});

function onFileChange(target, event) {
  if (target === 'contrato') contratoCaixa.value = event.target.files[0];
  else confissaoDivida.value = event.target.files[0];
}
function clearFile(target) {
  if (target === 'contrato') contratoCaixa.value = null;
  else confissaoDivida.value = null;
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <PageHeader
        title="Validador de Contratos"
        subtitle="Validação automática de documentos da construtora via IA."
        icon="fas fa-file-shield">
        <template #title>
          <span>Validador de Contratos</span>
          <Favorite :router="'/tools/validator'" :section="'Validador'" />
        </template>
        <template #actions>
          <History />
        </template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">

        <!-- Sidebar -->
        <aside class="lg:col-span-1 lg:order-2 space-y-3">
          <Surface variant="raised" padding="md">
            <h3 class="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <i class="fas fa-circle-info text-accent text-xs"></i>
              Como validar
            </h3>
            <ul class="space-y-2 text-xs text-ink-muted leading-relaxed">
              <li v-for="tip in [
                'Envie apenas PDFs legíveis (até 1MB)',
                'Envie os documentos na ordem correta (Contrato CEF | Confissão)',
                'Aguarde o resultado (pode levar até 100s)',
                'Consulte o histórico no botão acima',
              ]" :key="tip" class="flex items-start gap-2">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <span>{{ tip }}</span>
              </li>
            </ul>
          </Surface>

          <Surface variant="raised" padding="md">
            <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-3">Estatísticas</p>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-ink-muted">Validações totais</span>
                <span class="font-mono font-semibold text-ink">{{ stats.total }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-ink-muted">Aprovadas</span>
                <span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{{ stats.aprovados }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-ink-muted">Reprovadas</span>
                <span class="font-mono font-semibold text-red-600 dark:text-red-400">{{ stats.reprovados }}</span>
              </div>
            </div>
          </Surface>
        </aside>

        <!-- Main -->
        <main class="lg:col-span-3 lg:order-1 space-y-4">

          <!-- Form -->
          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div class="px-5 py-3.5 border-b border-line">
              <h2 class="text-sm font-semibold text-ink">Enviar documentos</h2>
              <p class="text-xs text-ink-muted mt-0.5">Selecione os arquivos em PDF (máx. 1MB cada)</p>
            </div>

            <form @submit.prevent="handleSubmit" class="p-5 space-y-5" novalidate>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label class="block text-xs font-medium text-ink-muted mb-1.5">
                    Contrato Caixa <span class="text-red-500">*</span>
                  </label>
                  <label for="dropzone-contrato"
                    class="relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                    :class="contratoCaixa
                      ? 'border-accent/40 bg-accent-soft/30'
                      : 'border-line hover:border-accent/40 hover:bg-surface-sunken/40'">
                    <i class="far fa-file-pdf text-3xl mb-2"
                      :class="contratoCaixa ? 'text-accent' : 'text-ink-subtle'"></i>
                    <p v-if="contratoCaixa?.name"
                      class="text-xs text-center font-medium text-ink truncate w-11/12">
                      {{ contratoCaixa.name }}
                    </p>
                    <p v-else class="text-sm text-center text-ink-muted">
                      <span class="font-semibold text-ink">Clique ou arraste</span><br />
                      <span class="text-xs text-ink-subtle font-mono">Apenas PDF · máx. 1MB</span>
                    </p>
                    <input id="dropzone-contrato" type="file" accept="application/pdf"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      @change="(e) => onFileChange('contrato', e)" />
                  </label>
                  <button v-if="contratoCaixa" type="button" @click="clearFile('contrato')"
                    class="mt-2 text-xs text-red-500 hover:underline">
                    <i class="fas fa-xmark text-[10px]"></i> Remover
                  </button>
                </div>

                <div>
                  <label class="block text-xs font-medium text-ink-muted mb-1.5">
                    Confissão de Dívida <span class="text-red-500">*</span>
                  </label>
                  <label for="dropzone-confissao"
                    class="relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                    :class="confissaoDivida
                      ? 'border-accent/40 bg-accent-soft/30'
                      : 'border-line hover:border-accent/40 hover:bg-surface-sunken/40'">
                    <i class="far fa-file-pdf text-3xl mb-2"
                      :class="confissaoDivida ? 'text-accent' : 'text-ink-subtle'"></i>
                    <p v-if="confissaoDivida?.name"
                      class="text-xs text-center font-medium text-ink truncate w-11/12">
                      {{ confissaoDivida.name }}
                    </p>
                    <p v-else class="text-sm text-center text-ink-muted">
                      <span class="font-semibold text-ink">Clique ou arraste</span><br />
                      <span class="text-xs text-ink-subtle font-mono">Apenas PDF · máx. 1MB</span>
                    </p>
                    <input id="dropzone-confissao" type="file" accept="application/pdf"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      @change="(e) => onFileChange('confissao', e)" />
                  </label>
                  <button v-if="confissaoDivida" type="button" @click="clearFile('confissao')"
                    class="mt-2 text-xs text-red-500 hover:underline">
                    <i class="fas fa-xmark text-[10px]"></i> Remover
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-end pt-3 border-t border-line">
                <Button type="submit" :loading="loading"
                  :disabled="!contratoCaixa || !confissaoDivida || loading"
                  icon="fas fa-robot" size="lg">
                  {{ loading ? 'Validando documentos...' : 'Validar documentos' }}
                </Button>
              </div>
            </form>
          </Surface>

          <!-- Resultado -->
          <Surface v-if="resultado" variant="raised" padding="none" class="overflow-hidden" aria-live="polite">
            <div class="px-5 py-3.5 border-b border-line">
              <h2 class="text-sm font-semibold text-ink">Resultado da validação</h2>
            </div>

            <div class="p-5 space-y-5">
              <!-- Status -->
              <div class="text-center">
                <span v-if="resultado.status === 'APROVADO'"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-sm font-bold">
                  <i class="fas fa-check"></i> DOCUMENTOS APROVADOS
                </span>
                <span v-else-if="resultado.status === 'REPROVADO'"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 text-sm font-bold">
                  <i class="fas fa-xmark"></i> DOCUMENTOS REPROVADOS
                </span>
                <span v-else
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-sm font-bold">
                  <i class="fas fa-triangle-exclamation"></i> ERRO NA VALIDAÇÃO
                </span>
              </div>

              <!-- Mensagens -->
              <div v-if="resultado.mensagens?.length" class="space-y-3">
                <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">
                  Detalhes da validação
                </p>

                <div v-for="(msg, i) in resultado.mensagens" :key="i"
                  class="rounded-lg border-l-4 p-3 surface-gradient"
                  :class="messageBorderClass(msg.nivel)">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h4 class="font-semibold text-sm text-ink mb-1 flex items-center gap-2">
                        <span>{{ iconNivel(msg.nivel) }}</span>
                        <span>{{ msg.tipo }}</span>
                      </h4>
                      <p class="text-sm text-ink-muted leading-relaxed">{{ msg.descricao }}</p>
                    </div>
                    <Badge :variant="messageVariant(msg.nivel)" size="sm" class="shrink-0 uppercase">
                      {{ msg.nivel }}
                    </Badge>
                  </div>
                </div>

                <!-- Resumo -->
                <div class="rounded-xl bg-surface-sunken border border-line p-4 surface-gradient">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-3">
                    Resumo
                  </p>
                  <div class="grid grid-cols-3 gap-3 text-center">
                    <div class="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {{ countByLevel('correto') }}
                      </p>
                      <p class="text-xs text-emerald-700 dark:text-emerald-300">Corretos</p>
                    </div>
                    <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {{ countByLevel('alerta') }}
                      </p>
                      <p class="text-xs text-amber-700 dark:text-amber-300">Alertas</p>
                    </div>
                    <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                      <p class="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {{ countByLevel('incorreto') }}
                      </p>
                      <p class="text-xs text-red-700 dark:text-red-300">Incorretos</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Erro de parsing -->
              <div v-else-if="resultado.status === 'ERRO'"
                class="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p class="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                  <i class="fas fa-triangle-exclamation"></i>Erro na validação
                </p>
                <pre class="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 text-ink-muted bg-surface rounded p-3 border border-line">{{ resultado.resultado }}</pre>
              </div>
            </div>
          </Surface>
        </main>
      </div>
    </PageContainer>
  </div>
</template>
