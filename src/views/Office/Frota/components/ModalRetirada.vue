<script setup>
/* Retirada: o momento de pegar a chave.
 *
 * Pergunta só o que MUDA agora e ninguém sabe de antemão: o odômetro e o
 * combustível. Departamento e destino já foram respondidos na reserva, e
 * repetir a pergunta ensina a pessoa que o sistema não guarda o que ela digita.
 *
 * Avaria também não se pergunta aqui. Descrever todas as marcas de um carro
 * rodado, de pé, com a chave na mão, é um pedágio que ninguém paga - e o que
 * saía dali era "teste" ou "nenhuma". As avarias conhecidas aparecem como
 * LEITURA, vindas do histórico do veículo, que é onde elas se acumulam.
 */
import { ref, watch, computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import FotosVeiculo from './FotosVeiculo.vue';
import LeituraOdometro from './LeituraOdometro.vue';
import ConferenciaFacial from './ConferenciaFacial.vue';
import { NIVEIS_COMBUSTIVEL, dataHora } from '../frota.js';

const props = defineProps({
    open: { type: Boolean, default: false },
    reserva: { type: Object, default: null },
    veiculo: { type: Object, default: null },
    config: { type: Object, default: () => ({}) },
    salvando: { type: Boolean, default: false },
    /* Retirada sem reserva prévia: a pessoa está na frente do carro agora. */
    direta: { type: Boolean, default: false },
    avarias: { type: Array, default: () => [] },
    /* Se a conta já tem rosto cadastrado. Falso manda cadastrar na hora, em vez
       de barrar. */
    faceCadastrada: { type: Boolean, default: false },
    erro: { type: String, default: '' },
});

const emit = defineEmits(['close', 'confirmar']);

const form = ref(vazio());

function vazio() {
    return {
        km_saida: '', combustivel_saida: '', obs_saida: '', fim_previsto: '',
        fotos: [], face_descriptor: null,
    };
}

const odometroRef = ref(null);
const jaCadastrou = ref(false);

const faceOk = computed(() => !props.config.exigir_face || Boolean(form.value.face_descriptor));
const fotosOk = computed(() => form.value.fotos.length >= (props.config.min_fotos_saida ?? 1));
const odometroOk = computed(() => !odometroRef.value?.problema);

const podeConfirmar = computed(() => faceOk.value && fotosOk.value && odometroOk.value && !kmInvalido.value);

const kmMinimo = computed(() => Number(props.veiculo?.km_atual) || 0);

const kmInvalido = computed(() => {
    if (form.value.km_saida === '') return Boolean(props.config.exigir_km !== false);
    return Number(form.value.km_saida) < kmMinimo.value;
});

/* Devolução prevista para o fim do expediente de hoje: é o palpite certo na
   maioria das vezes e evita a pessoa digitar data e hora do zero. */
function fimDoExpedienteHoje() {
    const hora = props.config.hora_fim_tarde || '18:00';
    const agora = new Date();
    const [h, m] = hora.split(':').map(Number);
    const fim = new Date(agora);
    fim.setHours(h, m, 0, 0);
    // Já passou do expediente: propõe daqui a duas horas, não uma hora no passado.
    if (fim <= agora) fim.setTime(agora.getTime() + 2 * 3600000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}T${pad(fim.getHours())}:${pad(fim.getMinutes())}`;
}

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    form.value = vazio();
    jaCadastrou.value = false;
    // O odômetro quase sempre é o último conhecido: pré-preencher poupa a
    // digitação e deixa claro qual número o sistema já tem.
    if (props.veiculo?.km_atual) form.value.km_saida = String(props.veiculo.km_atual);
    if (props.direta) form.value.fim_previsto = fimDoExpedienteHoje();
});

function confirmar() {
    emit('confirmar', {
        ...form.value,
        km_saida: form.value.km_saida === '' ? null : Number(form.value.km_saida),
    });
}
</script>

<template>
  <Modal :open="open" size="lg"
         :title="direta ? 'Pegar o carro agora' : 'Registrar retirada'"
         :subtitle="direta
           ? 'Isso reserva o veículo a partir de agora e já registra a saída.'
           : 'Confirme o odômetro e o combustível ao pegar a chave.'"
         @close="$emit('close')">
    <div class="flex flex-col gap-4">

      <!-- O que a pessoa reservou, para ela conferir que está retirando a
           reserva certa (e não a de amanhã). -->
      <div v-if="reserva" class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-sm">
        <p class="text-ink">
          <i class="fas fa-calendar-check text-ink-subtle"></i>
          Sua reserva: <strong>{{ dataHora(reserva.inicio) }}</strong> até <strong>{{ dataHora(reserva.fim) }}</strong>
        </p>
        <p v-if="reserva.destino" class="text-xs text-ink-muted mt-0.5">Destino: {{ reserva.destino }}</p>
      </div>

      <Input v-if="direta" v-model="form.fim_previsto" type="datetime-local"
             label="Até quando você fica com o carro" required
             hint="A agenda usa isto para saber quando o veículo volta a ficar livre. Dá para devolver antes." />

      <LeituraOdometro ref="odometroRef" v-model="form.km_saida"
                       label="KM do odômetro agora"
                       :piso="kmMinimo" :km-max-dia="config.km_max_por_dia || 1000"
                       :desde="veiculo?.km_atualizado_em"
                       :obrigatorio="config.exigir_km !== false" />

      <Select v-model="form.combustivel_saida" :options="NIVEIS_COMBUSTIVEL"
              label="Combustível no painel" placeholder="Selecione"
              :required="config.exigir_combustivel !== false" />

      <!-- Leitura, não digitação: o que o carro já tinha antes de você pegar. -->
      <div v-if="avarias.length" class="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
        <p class="text-sm font-medium text-amber-700 dark:text-amber-400">
          <i class="fas fa-triangle-exclamation"></i>
          Avarias já registradas neste veículo
        </p>
        <ul class="mt-1.5 flex flex-col gap-1">
          <li v-for="a in avarias" :key="a.id" class="text-xs text-ink-muted">
            <span class="text-ink">{{ a.descricao }}</span>
            <span v-if="a.ocorrido_em"> · {{ dataHora(a.ocorrido_em) }}</span>
          </li>
        </ul>
        <p class="mt-1.5 text-micro text-ink-subtle">
          Viu algo que não está nesta lista? Registre na devolução: é lá que a avaria entra no histórico do carro.
        </p>
      </div>

      <FotosVeiculo v-model="form.fotos" :vehicle-id="veiculo?.id"
                    :reservation-id="reserva?.id" momento="saida"
                    :minimo="config.min_fotos_saida ?? 1" />

      <ConferenciaFacial v-if="config.exigir_face"
                         :cadastrado="faceCadastrada || jaCadastrou"
                         @cadastrou="jaCadastrou = true"
                         @confirmado="form.face_descriptor = $event" />

      <Input v-model="form.obs_saida" label="Observações (opcional)" />

      <p v-if="erro" class="text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Cancelar</Button>
      <Button variant="primary" icon="fas fa-key" :loading="salvando" :disabled="!podeConfirmar"
              @click="confirmar">
        {{ direta ? 'Pegar o carro' : 'Confirmar retirada' }}
      </Button>
    </template>
  </Modal>
</template>
