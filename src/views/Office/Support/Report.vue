<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        subtitle="Reporte um problema, sugestão ou bug encontrado no sistema"
        icon="fas fa-flag">
        <template #title>Reportar Problema</template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <!-- Sidebar -->
        <aside class="lg:col-span-1 space-y-4">
          <Surface variant="raised" padding="md" class="surface-gradient lg:sticky lg:top-4">
            <div class="space-y-5">
              <!-- Dicas -->
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <i class="fas fa-lightbulb text-amber-500 text-sm"></i>
                  <h4 class="text-xs uppercase tracking-wider font-mono text-ink-muted">
                    Dicas Importantes
                  </h4>
                </div>
                <ul class="space-y-2 text-sm text-ink-muted">
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                    <span>Seja específico sobre o problema</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                    <span>Descreva os passos para reproduzir</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                    <span>Inclua capturas de tela se possível</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                    <span>Mencione o navegador utilizado</span>
                  </li>
                </ul>
              </div>

              <!-- Estatísticas -->
              <div class="border-t border-line pt-4">
                <div class="flex items-center gap-2 mb-3">
                  <i class="fas fa-chart-simple text-accent text-sm"></i>
                  <h4 class="text-xs uppercase tracking-wider font-mono text-ink-muted">
                    Estatísticas
                  </h4>
                </div>
                <div class="space-y-2.5">
                  <div class="flex justify-between text-sm">
                    <span class="text-ink-muted">Problemas Reportados</span>
                    <span class="font-mono tabular-nums font-medium text-ink">{{ stats.totalReports || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-ink-muted">Finalizados este mês</span>
                    <span class="font-mono tabular-nums font-medium text-red-500">{{ counts.closed || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-ink-muted">Resolvidos este mês</span>
                    <span class="font-mono tabular-nums font-medium text-emerald-500">{{ stats.resolved || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </aside>

        <!-- Main Content -->
        <main class="lg:col-span-3">
          <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
            <div class="px-5 sm:px-6 py-4 border-b border-line bg-surface-sunken/40">
              <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                <i class="fas fa-file-pen text-accent"></i>
                Formulário de Reporte
              </h3>
              <p class="text-xs text-ink-muted mt-0.5">Preencha os campos abaixo com o máximo de detalhes possível</p>
            </div>

            <form @submit.prevent="handleSubmit" class="p-5 sm:p-6 space-y-5">

              <!-- Basic Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  v-model="form.userName"
                  label="Nome Completo"
                  required
                  placeholder="Seu nome completo" />

                <Input
                  v-model="form.email"
                  type="email"
                  label="E-mail"
                  required
                  placeholder="email@empresa.com" />
              </div>

              <!-- Problem Classification -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  v-model="form.problemType"
                  label="Tipo de Problema"
                  required
                  placeholder="Selecione o tipo"
                  :options="problemTypeOptions" />

                <Select
                  v-model="form.priority"
                  label="Prioridade"
                  required
                  placeholder="Selecione a prioridade"
                  :options="priorityOptions" />

                <Select
                  v-model="form.module"
                  label="Módulo Afetado"
                  placeholder="Selecione o módulo"
                  :options="moduleOptions" />
              </div>

              <!-- Problem Title -->
              <div>
                <Input
                  v-model="form.title"
                  label="Título do Problema"
                  required
                  placeholder="Descreva o problema em uma frase"
                  :hint="`${form.title.length}/100 caracteres`" />
              </div>

              <!-- Detailed Description -->
              <div>
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Descrição Detalhada <span class="text-red-500">*</span>
                </label>
                <textarea v-model="form.description"
                  placeholder="Descreva o problema detalhadamente:&#10;- O que você estava fazendo?&#10;- O que esperava que acontecesse?&#10;- O que realmente aconteceu?&#10;- Consegue reproduzir o problema?"
                  rows="6" required
                  class="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-ring/40 focus:border-accent transition-colors resize-none">
                </textarea>
              </div>

              <!-- Steps to Reproduce -->
              <div>
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Passos para Reproduzir
                </label>
                <textarea v-model="form.stepsToReproduce"
                  placeholder="Liste os passos numerados:&#10;1. Primeiro passo...&#10;2. Segundo passo...&#10;3. Terceiro passo..."
                  rows="4"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-ring/40 focus:border-accent transition-colors resize-none">
                </textarea>
              </div>

              <!-- System Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  v-model="form.browser"
                  label="Navegador Utilizado"
                  placeholder="Selecione o navegador"
                  :options="browserOptions" />

                <Select
                  v-model="form.os"
                  label="Sistema Operacional"
                  placeholder="Selecione o SO"
                  :options="osOptions" />
              </div>

              <!-- File Upload -->
              <div>
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Capturas de Tela ou Arquivos
                </label>
                <div class="border-2 border-dashed border-line rounded-xl p-6 text-center bg-surface-sunken/40 hover:border-accent/40 transition-colors">
                  <i class="fas fa-cloud-arrow-up text-3xl text-ink-subtle mb-2"></i>
                  <p class="text-sm text-ink-muted mb-1">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <p class="text-xs text-ink-subtle mb-3">
                    Formatos aceitos: PNG, JPG, GIF, PDF (máx. 10MB cada)
                  </p>
                  <input ref="fileInput" type="file" multiple accept="image/*,.pdf" class="hidden"
                    @change="handleFileSelect" />
                  <Button type="button" variant="secondary" size="sm" icon="fas fa-paperclip"
                    @click="$refs.fileInput.click()">
                    Selecionar Arquivos
                  </Button>
                </div>

                <!-- File List -->
                <div v-if="form.attachments.length > 0" class="mt-3 space-y-2">
                  <div v-for="(file, index) in form.attachments" :key="index"
                    class="flex items-center justify-between bg-surface-sunken rounded-lg px-3 py-2 border border-line">
                    <div class="flex items-center gap-2 min-w-0">
                      <i class="fas fa-file text-ink-subtle"></i>
                      <span class="text-sm text-ink truncate">{{ file.name }}</span>
                      <span class="text-xs text-ink-subtle font-mono">({{ formatFileSize(file.size) }})</span>
                    </div>
                    <IconButton
                      icon="fas fa-trash"
                      label="Remover anexo"
                      variant="danger"
                      size="sm"
                      class="!h-7 !w-7"
                      @click="removeFile(index)" />
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-line">
                <label class="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
                  <input v-model="form.allowContact" type="checkbox"
                    class="w-4 h-4 text-accent bg-surface-raised border-line rounded focus:ring-accent-ring/40" />
                  Autorizo contato para esclarecimentos adicionais
                </label>

                <div class="flex gap-2 w-full sm:w-auto">
                  <Button type="button" variant="ghost" @click="resetForm">
                    Limpar
                  </Button>
                  <Button type="submit" variant="primary" icon="fas fa-paper-plane"
                    :loading="isSubmitting" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Enviando...' : 'Enviar Reporte' }}
                  </Button>
                </div>
              </div>
            </form>
          </Surface>
        </main>
      </div>
    </PageContainer>

    <!-- Success Modal -->
    <Modal :open="showSuccessModal"
      size="sm"
      title="Reporte enviado!"
      @close="showSuccessModal = false">
      <div class="text-center space-y-4">
        <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <i class="fas fa-check text-emerald-500 text-2xl"></i>
        </div>
        <p class="text-sm text-ink-muted">
          Seu problema foi reportado e nossa equipe técnica foi notificada.
          Você receberá uma resposta em até 48 horas.
        </p>
        <div class="rounded-xl bg-surface-sunken border border-line p-3">
          <p class="text-sm text-ink">
            <strong>Protocolo:</strong>
            <span class="font-mono">#{{ reportProtocol }}</span>
          </p>
        </div>
      </div>
      <template #footer>
        <Button variant="primary" @click="showSuccessModal = false">Fechar</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useSupportStore } from '@/stores/Support/supportStore';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';

const toast = useToast();
const authStore = useAuthStore();
const supportStore = useSupportStore();
const { stats } = storeToRefs(supportStore);
const { counts } = storeToRefs(supportStore);

// State
const isSubmitting = ref(false);
const showSuccessModal = ref(false);
const reportProtocol = ref('');

// ── Options ───────────────────────────────────────────────────────────────────
const problemTypeOptions = [
  { value: 'bug',         label: 'Bug/Erro' },
  { value: 'performance', label: 'Performance' },
  { value: 'ui',          label: 'Interface/Visual' },
  { value: 'feature',     label: 'Sugestão' },
  { value: 'security',    label: 'Segurança' },
  { value: 'other',       label: 'Outro' },
];

const priorityOptions = [
  { value: 'critical', label: 'Crítica' },
  { value: 'high',     label: 'Alta' },
  { value: 'medium',   label: 'Média' },
  { value: 'low',      label: 'Baixa' },
];

const moduleOptions = [
  { value: 'dashboard',     label: 'Dashboard' },
  { value: 'vendas',        label: 'Vendas' },
  { value: 'leads',         label: 'Leads' },
  { value: 'relatorios',    label: 'Relatórios' },
  { value: 'validador',     label: 'Validador' },
  { value: 'configuracoes', label: 'Configurações' },
  { value: 'geral',         label: 'Sistema Geral' },
];

const browserOptions = [
  { value: 'chrome',  label: 'Google Chrome' },
  { value: 'firefox', label: 'Mozilla Firefox' },
  { value: 'safari',  label: 'Safari' },
  { value: 'edge',    label: 'Microsoft Edge' },
  { value: 'other',   label: 'Outro' },
];

const osOptions = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos',   label: 'macOS' },
  { value: 'linux',   label: 'Linux' },
  { value: 'ios',     label: 'iOS' },
  { value: 'android', label: 'Android' },
];

onMounted(async () => {
  try {
    await Promise.all([supportStore.fetchStats(), supportStore.fetchCounts()]);
  } catch (e) {
    console.warn('Falha ao buscar estatísticas:', e);
  }
});

const form = reactive({
  userName:         authStore.user?.username || '',
  email:            authStore.user?.email || '',
  problemType:      '',
  priority:         '',
  module:           '',
  title:            '',
  description:      '',
  stepsToReproduce: '',
  browser:          '',
  os:               '',
  pageUrl:          '',
  attachments:      [],
  allowContact:     true,
});

// Methods
const validateForm = () => {
  const requiredFields = [
    { field: 'userName',    label: 'Nome Completo' },
    { field: 'email',       label: 'E-mail' },
    { field: 'problemType', label: 'Tipo de Problema' },
    { field: 'priority',    label: 'Prioridade' },
    { field: 'title',       label: 'Título do Problema' },
    { field: 'description', label: 'Descrição Detalhada' },
  ];

  for (const { field, label } of requiredFields) {
    if (!form[field] || form[field].trim() === '') {
      toast.warning(`Por favor, preencha o campo: ${label}`);
      return false;
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    toast.warning('Por favor, insira um e-mail válido');
    return false;
  }

  return true;
};

const uploadAttachment = async (file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('context', 'support_attachment');

  const response = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Falha ao enviar ${file.name}`);

  return { url: data.url, name: file.name, mimeType: data.mimeType, size: data.size };
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  isSubmitting.value = true;

  try {
    let uploadedAttachments = [];
    if (form.attachments.length > 0) {
      for (const file of form.attachments) {
        const att = await uploadAttachment(file);
        uploadedAttachments.push(att);
      }
    }

    const payload = {
      userName:         form.userName,
      email:            form.email,
      problemType:      form.problemType,
      priority:         form.priority,
      module:           form.module,
      title:            form.title,
      description:      form.description,
      stepsToReproduce: form.stepsToReproduce,
      browser:          form.browser,
      os:               form.os,
      pageUrl:          form.pageUrl,
      attachments:      uploadedAttachments,
      allowContact:     form.allowContact,
    };

    const res = await supportStore.openTicket(payload);
    reportProtocol.value = res.protocol;

    await Promise.all([supportStore.fetchStats(), supportStore.fetchCounts()]);

    toast.success('Reporte enviado com sucesso!');
    showSuccessModal.value = true;
    resetForm();
  } catch (e) {
    toast.error('Erro ao enviar o reporte. Tente novamente.');
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  Object.assign(form, {
    userName:         authStore.user?.username || '',
    email:            authStore.user?.email || '',
    problemType:      '',
    priority:         '',
    module:           '',
    title:            '',
    description:      '',
    stepsToReproduce: '',
    browser:          '',
    os:               '',
    pageUrl:          '',
    attachments:      [],
    allowContact:     true,
  });
};

const handleFileSelect = (event) => {
  const selectedFiles = Array.from(event.target.files);
  const maxSize = 10 * 1024 * 1024;

  for (const file of selectedFiles) {
    if (file.size > maxSize) {
      toast.warning(`O arquivo "${file.name}" excede o tamanho máximo de 10MB`);
      continue;
    }

    if (!form.attachments.find(f => f.name === file.name)) {
      form.attachments.push(file);
    }
  }

  event.target.value = '';
};

const removeFile = (index) => {
  form.attachments.splice(index, 1);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>
