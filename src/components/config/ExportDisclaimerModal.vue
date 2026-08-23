<script setup>
// Aviso de responsabilidade exibido SEMPRE antes de exportar qualquer relatório.
// Serve de respaldo: mostra quem está exportando, que o conteúdo é de autoria da
// Menin e que a transmissão do arquivo é responsabilidade de quem exporta.
// O aceite é explícito (checkbox) para não virar clique automático.
//
// Compartilhado: usado pelo Export.vue (todos os relatórios) e pela tela de Leads.
import { ref, computed, watch } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  open:    { type: Boolean, default: false },
  formato: { type: String, default: '' },          // pdf | html | excel | xlsx | csv
  titulo:  { type: String, default: 'Relatório' }, // nome do relatório exportado
  autor:   { type: Object, default: () => ({}) },  // { nome, email }
});
const emit = defineEmits(['confirmar', 'cancelar']);

const aceito = ref(false);

// Cada abertura recomeça sem o aceite marcado.
watch(() => props.open, (v) => { if (v) aceito.value = false; });

const FORMATOS = {
  pdf:   { label: 'PDF',   icon: 'fas fa-file-pdf',   desc: 'documento para impressão ou envio' },
  html:  { label: 'HTML',  icon: 'fas fa-file-code',  desc: 'relatório interativo em arquivo único' },
  excel: { label: 'Excel', icon: 'fas fa-file-excel', desc: 'planilha com os dados detalhados' },
  xlsx:  { label: 'Excel', icon: 'fas fa-file-excel', desc: 'planilha com os dados detalhados' },
  csv:   { label: 'CSV',   icon: 'fas fa-file-csv',   desc: 'dados em texto separado por delimitador' },
};
const fmt = computed(() => FORMATOS[props.formato] || { label: 'Arquivo', icon: 'fas fa-file-export', desc: '' });

const autorLinha = computed(() => {
  const n = props.autor?.nome?.trim();
  const e = props.autor?.email?.trim();
  if (!n && !e) return 'Usuário não identificado';
  return e ? `${n || 'Sem nome'} (${e})` : n;
});
</script>

<template>
  <Modal :open="open" size="lg" @close="emit('cancelar')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400
                    border border-amber-500/20 grid place-items-center shrink-0">
          <i class="fas fa-shield-halved text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink">Antes de exportar</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            Confidencialidade e responsabilidade sobre o arquivo
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- O que será gerado -->
      <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-sunken border border-line">
        <i :class="fmt.icon" class="text-lg text-accent shrink-0"></i>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-ink truncate">{{ titulo }} · {{ fmt.label }}</p>
          <p class="text-xs text-ink-muted truncate">{{ fmt.desc }}</p>
        </div>
      </div>

      <div class="text-sm text-ink-muted space-y-2.5">
        <p class="flex gap-2.5">
          <i class="fas fa-building-lock text-ink-subtle mt-0.5 w-4 text-center shrink-0"></i>
          <span>
            Este relatório pode conter <b class="text-ink">informações oficiais, estratégicas
            e comerciais</b> da Menin, incluindo dados pessoais.
          </span>
        </p>
        <p class="flex gap-2.5">
          <i class="fas fa-copyright text-ink-subtle mt-0.5 w-4 text-center shrink-0"></i>
          <span>
            Os dados são de <b class="text-ink">autoria e propriedade da Menin</b>, destinados
            exclusivamente a uso interno e a pessoas autorizadas.
          </span>
        </p>
        <p class="flex gap-2.5">
          <i class="fas fa-user-shield text-ink-subtle mt-0.5 w-4 text-center shrink-0"></i>
          <span>
            A <b class="text-ink">responsabilidade pela transmissão, compartilhamento e guarda</b>
            deste arquivo é de quem o exporta. Encaminhar a terceiros não autorizados pode violar
            políticas internas e a legislação de proteção de dados.
          </span>
        </p>
        <p class="flex gap-2.5">
          <i class="fas fa-fingerprint text-ink-subtle mt-0.5 w-4 text-center shrink-0"></i>
          <span>
            A exportação fica <b class="text-ink">registrada com seu nome e a data/hora</b>.
          </span>
        </p>
      </div>

      <!-- Quem está exportando -->
      <div class="p-3 rounded-xl bg-accent-soft/40 border border-accent/20">
        <p class="text-micro uppercase tracking-wider font-semibold text-ink-subtle mb-1">
          Exportando como
        </p>
        <p class="text-sm font-medium text-ink break-all">{{ autorLinha }}</p>
      </div>

      <!-- Aceite explícito -->
      <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
        :class="aceito ? 'border-accent/50 bg-accent-soft/30' : 'border-line hover:bg-surface-sunken'">
        <input type="checkbox" v-model="aceito"
          class="mt-0.5 h-4 w-4 rounded border-line text-accent
                 focus:ring-2 focus:ring-accent-ring/40 shrink-0 cursor-pointer" />
        <span class="text-sm text-ink">
          Li e estou ciente. Assumo a responsabilidade pelo uso e compartilhamento
          deste relatório.
        </span>
      </label>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <Button variant="secondary" size="sm" @click="emit('cancelar')">Cancelar</Button>
        <Button size="sm" icon="fas fa-file-export" :disabled="!aceito"
          @click="emit('confirmar')">
          Exportar {{ fmt.label }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
