<script setup>
/* Bloqueio por manutenção. Só o gestor da frota chega aqui.
   O aviso do que vai ser derrubado aparece ANTES de salvar: bloquear um
   período que já tem reserva cancela a reserva de outra pessoa, e isso não
   pode acontecer calado. */
import { ref, watch, computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import { PERIODOS, chaveDoDia, dataHora, nomeDoCondutor } from '../frota.js';
import { verificarDisponibilidade } from '@/utils/Frota/apiFrota';

const props = defineProps({
    open: { type: Boolean, default: false },
    vehicleId: { type: [Number, String], default: null },
    salvando: { type: Boolean, default: false },
    erro: { type: String, default: '' },
});

const emit = defineEmits(['close', 'confirmar']);

const hoje = chaveDoDia(new Date());
const form = ref(vazio());
const afetadas = ref([]);

function vazio() {
    return {
        dia_inicio: hoje,
        dia_fim: '',
        periodo: 'dia',
        hora_inicio: '08:00',
        hora_fim: '18:00',
        tipo: 'manutencao',
        motivo: '',
        observacao: '',
    };
}

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    form.value = vazio();
    afetadas.value = [];
    checar();
});

watch(() => [form.value.dia_inicio, form.value.dia_fim, form.value.periodo], checar);

async function checar() {
    if (!props.vehicleId || !form.value.dia_inicio) return;
    try {
        const r = await verificarDisponibilidade({
            vehicle_id: props.vehicleId,
            dia_inicio: form.value.dia_inicio,
            dia_fim: form.value.dia_fim || form.value.dia_inicio,
            periodo: form.value.periodo,
            hora_inicio: form.value.hora_inicio,
            hora_fim: form.value.hora_fim,
        });
        afetadas.value = r.reservas || [];
    } catch {
        afetadas.value = [];
    }
}

const emUso = computed(() => afetadas.value.some(r => r.status === 'em_uso'));

function confirmar() {
    emit('confirmar', { ...form.value, dia_fim: form.value.dia_fim || form.value.dia_inicio });
}
</script>

<template>
  <Modal :open="open" size="lg" title="Marcar veículo como indisponível"
         subtitle="Manutenção, revisão ou qualquer período em que o carro não pode ser usado."
         @close="$emit('close')">
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="form.dia_inicio" type="date" label="De" required />
        <Input v-model="form.dia_fim" type="date" label="Até (opcional)" :min="form.dia_inicio" />
      </div>

      <Select v-model="form.periodo" :options="PERIODOS" label="Período" />

      <Select v-model="form.tipo" label="Tipo"
              :options="[
                { value: 'manutencao', label: 'Manutenção' },
                { value: 'indisponivel', label: 'Indisponível (outro motivo)' },
              ]" />

      <Input v-model="form.motivo" label="Motivo" required
             placeholder="Ex.: revisão dos 40.000 km" />
      <Input v-model="form.observacao" label="Observação (opcional)" />

      <!-- A consequência escrita, com nome e número: confirmar sem saber quem
           perde a reserva é o que faz a pessoa desconfiar da agenda. -->
      <div v-if="afetadas.length"
           class="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        <p class="font-medium">
          <i class="fas fa-triangle-exclamation"></i>
          {{ afetadas.length }} reserva{{ afetadas.length > 1 ? 's' : '' }} neste período
          {{ afetadas.length > 1 ? 'serão canceladas' : 'será cancelada' }}:
        </p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="r in afetadas" :key="r.id">
            {{ nomeDoCondutor(r) }} · {{ dataHora(r.inicio) }}
          </li>
        </ul>
        <p v-if="emUso" class="mt-1 font-medium">
          Uma delas está EM USO: a devolução precisa ser registrada antes do bloqueio.
        </p>
      </div>

      <p v-if="erro" class="text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Cancelar</Button>
      <Button variant="danger" icon="fas fa-screwdriver-wrench" :loading="salvando"
              :disabled="emUso || !form.motivo" @click="confirmar">
        {{ afetadas.length ? `Bloquear e cancelar ${afetadas.length}` : 'Bloquear período' }}
      </Button>
    </template>
  </Modal>
</template>
