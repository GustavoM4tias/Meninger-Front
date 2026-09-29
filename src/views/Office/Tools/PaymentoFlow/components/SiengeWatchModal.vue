<script setup>
/**
 * SiengeWatchModal — confere se as telas do Sienge que o robô usa continuam
 * como ele espera. Abre cada tela com a SUA credencial do Sienge e fecha sem
 * salvar nada (o "Nova Medição" é aberto e cancelado). Serve para achar a
 * mudança de tela antes de ela derrubar um lançamento.
 */
import { ref } from 'vue';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';

const emit = defineEmits(['close']);
const store = usePaymentFlowStore();

const running = ref(false);
const resultado = ref(null);
const erro = ref(null);

async function rodar() {
  running.value = true;
  erro.value = null;
  resultado.value = null;
  try {
    resultado.value = await store.runSiengeWatch();
  } catch (err) {
    erro.value = err.message || 'Falha ao rodar o vigia.';
  } finally {
    running.value = false;
  }
}

const hora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '');
</script>

<template>
  <Modal :open="true" size="md" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-binoculars text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Vigia do Sienge</h2>
          <p class="text-ink-muted mt-0.5">Confere as telas que o robô usa, sem salvar nada.</p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-ink-muted">
        Entra no Sienge com a sua credencial, abre Medição, Liberação de medições (título) e Contratos, e verifica se os
        campos que o robô preenche continuam lá. O "Nova Medição" é aberto e cancelado. Leva cerca de 1 minuto.
      </p>

      <div v-if="running" class="py-8 grid place-items-center gap-2 text-accent">
        <Spinner size="md" />
        <span>Abrindo as telas do Sienge...</span>
      </div>

      <div v-if="erro" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-data-neg">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ erro }}
      </div>

      <div v-if="resultado" class="space-y-2">
        <p class="font-semibold flex items-center gap-1.5" :class="resultado.ok ? 'text-data-pos' : 'text-data-neg'">
          <i :class="resultado.ok ? 'fas fa-circle-check' : 'fas fa-triangle-exclamation'"></i>
          {{ resultado.ok ? 'Tudo como o robô espera' : 'Alguma tela mudou ou não abriu' }}
          <span class="font-normal text-ink-subtle font-mono text-micro ml-auto">{{ hora(resultado.rodadoEm) }}</span>
        </p>
        <div v-for="t in resultado.telas" :key="t.tela"
          class="rounded-lg border px-3 py-2"
          :class="t.ok ? 'border-data-pos/30 bg-data-pos/10' : 'border-data-neg/30 bg-data-neg/10'">
          <p class="flex items-center gap-2 text-sm font-medium" :class="t.ok ? 'text-data-pos' : 'text-data-neg'">
            <i :class="t.ok ? 'fas fa-check' : 'fas fa-xmark'"></i>{{ t.tela }}
            <span class="ml-auto text-micro text-ink-subtle font-mono">{{ (t.ms / 1000).toFixed(1) }}s</span>
          </p>
          <p class="text-ink-muted break-words mt-0.5">{{ t.detalhe }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Fechar</Button>
      <Button :loading="running" icon="fas fa-play" @click="rodar">{{ resultado ? 'Rodar de novo' : 'Rodar vigia' }}</Button>
    </template>
  </Modal>
</template>
