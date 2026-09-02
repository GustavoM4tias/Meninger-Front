<script setup>
/* Devolução.
   O formulário original do Forms tinha três perguntas repetidas por engano
   (a hora e o nível de combustível apareciam duas vezes, e as avarias
   perguntavam "na saída" dentro do formulário de devolução). Aqui cada coisa é
   perguntada uma vez só, e a avaria perguntada é a do USO - que é a que
   interessa na volta. */
import { ref, watch, computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import FotosVeiculo from './FotosVeiculo.vue';
import LeituraOdometro from './LeituraOdometro.vue';
import { NIVEIS_COMBUSTIVEL } from '../frota.js';

const props = defineProps({
    open: { type: Boolean, default: false },
    reserva: { type: Object, default: null },
    config: { type: Object, default: () => ({}) },
    salvando: { type: Boolean, default: false },
    erro: { type: String, default: '' },
});

const emit = defineEmits(['close', 'confirmar']);

const form = ref(vazio());

function vazio() {
    return {
        km_chegada: '',
        combustivel_chegada: '',
        houve_abastecimento: false,
        abastecimento_desc: '',
        houve_avaria: false,
        avaria_desc: '',
        obs_chegada: '',
        fotos: [],
    };
}

const odometroRef = ref(null);

const fotosOk = computed(() => form.value.fotos.length >= (props.config.min_fotos_chegada ?? 1));
const podeConfirmar = computed(() => fotosOk.value && !odometroRef.value?.problema);

watch(() => props.open, (aberto) => { if (aberto) form.value = vazio(); });

const rodou = computed(() => {
    const saida = Number(props.reserva?.km_saida);
    const chegada = Number(form.value.km_chegada);
    if (!Number.isFinite(saida) || !Number.isFinite(chegada) || chegada < saida) return null;
    return chegada - saida;
});

function confirmar() {
    emit('confirmar', {
        ...form.value,
        km_chegada: form.value.km_chegada === '' ? null : Number(form.value.km_chegada),
    });
}
</script>

<template>
  <Modal :open="open" size="lg" title="Registrar devolução"
         subtitle="Depois disto o veículo volta a ficar livre na agenda."
         @close="$emit('close')">
    <div class="flex flex-col gap-4">
      <LeituraOdometro ref="odometroRef" v-model="form.km_chegada"
                       label="KM do odômetro na chegada"
                       :piso="Number(reserva?.km_saida) || 0"
                       piso-rotulo="KM registrado na saída"
                       :km-max-dia="config.km_max_por_dia || 1000"
                       :desde="reserva?.retirado_em"
                       :obrigatorio="config.exigir_km !== false" />

      <p v-if="rodou !== null" class="-mt-2 text-xs text-ink-muted">
        Essa viagem rodou <strong class="text-ink">{{ rodou.toLocaleString('pt-BR') }} km</strong>.
      </p>

      <Select v-model="form.combustivel_chegada" :options="NIVEIS_COMBUSTIVEL"
              label="Nível de combustível na devolução" placeholder="Selecione"
              :required="config.exigir_combustivel !== false" />

      <div class="rounded-lg border border-line p-3 flex flex-col gap-3">
        <Switch v-model="form.houve_abastecimento" label="Houve abastecimento durante o uso?" />
        <Input v-if="form.houve_abastecimento" v-model="form.abastecimento_desc"
               label="Litros e valor (R$)" required
               placeholder="Ex.: 38 litros, R$ 240,00"
               hint="Apresentar o cupom fiscal ao financeiro. O valor entra no diário de bordo do veículo." />
      </div>

      <div class="rounded-lg border border-line p-3 flex flex-col gap-3">
        <Switch v-model="form.houve_avaria" label="Houve avaria ou ocorrência no uso?" />
        <Input v-if="form.houve_avaria" v-model="form.avaria_desc"
               label="Descreva a avaria ou ocorrência" required
               hint="Apresentar laudo fotográfico ao gestor da frota." />
      </div>

      <FotosVeiculo v-model="form.fotos" :vehicle-id="reserva?.vehicle_id"
                    :reservation-id="reserva?.id" momento="chegada"
                    :minimo="config.min_fotos_chegada ?? 1" />

      <Input v-model="form.obs_chegada" label="Observações gerais (opcional)" />

      <p v-if="erro" class="text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Cancelar</Button>
      <Button variant="primary" icon="fas fa-flag-checkered" :loading="salvando" :disabled="!podeConfirmar" @click="confirmar">
        Confirmar devolução
      </Button>
    </template>
  </Modal>
</template>
