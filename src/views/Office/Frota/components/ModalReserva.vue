<script setup>
/* Reservar.
 *
 * A reserva é uma JANELA com hora, não um turno. O modelo de manhã/tarde
 * quebrava em dois casos reais: reserva de vários dias não conseguia dizer a
 * hora da volta, e duas pessoas não conseguiam dividir o mesmo dia quando uma
 * devolve 12h e a outra pega 14h - o turno inteiro ficava bloqueado.
 *
 * A tela consulta a disponibilidade ENQUANTO a pessoa escolhe, em vez de deixar
 * preencher tudo e levar um erro no fim. Quem decide é sempre o servidor: esta
 * é a mesma consulta que barra o envio.
 */
import { ref, watch, computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import { verificarDisponibilidade } from '@/utils/Frota/apiFrota';
import { mensagemDeErro } from '@/utils/mensagemDeErro';

const OUTRO = '__outro__';

const props = defineProps({
    open: { type: Boolean, default: false },
    vehicleId: { type: [Number, String], default: null },
    config: { type: Object, default: () => ({}) },
    salvando: { type: Boolean, default: false },
    preSelecao: { type: Object, default: null },
    erroSalvar: { type: String, default: '' },
});

const emit = defineEmits(['close', 'confirmar']);

const form = ref(vazio());
const erro = ref('');
const checando = ref(false);
const disponibilidade = ref(null);

function vazio() {
    return {
        dia_inicio: '',
        dia_fim: '',
        hora_inicio: props.config.hora_inicio_manha || '08:00',
        hora_fim: props.config.hora_fim_tarde || '18:00',
        departamento: '',
        departamento_outro: '',
        destino: '',
        solicitado_por: '',
        observacao: '',
    };
}

/* "Outro" existe porque a lista nunca cobre tudo (visita de fornecedor, obra
   nova, evento). Sem ele, a pessoa escolhe qualquer um e o relatório mente. */
const departamentoOptions = computed(() => [
    ...(props.config.departamentos || []).map(d => ({ value: d, label: d })),
    { value: OUTRO, label: 'Outro (escrever)' },
]);

const variosDias = computed(() =>
    Boolean(form.value.dia_fim && form.value.dia_fim !== form.value.dia_inicio));

const horaInvertida = computed(() =>
    !variosDias.value && form.value.hora_fim <= form.value.hora_inicio);

const departamentoFinal = computed(() =>
    form.value.departamento === OUTRO
        ? form.value.departamento_outro.trim()
        : form.value.departamento);

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    form.value = vazio();
    erro.value = '';
    disponibilidade.value = null;
    if (props.preSelecao?.dia_inicio) {
        form.value.dia_inicio = props.preSelecao.dia_inicio;
        form.value.dia_fim = props.preSelecao.dia_fim || props.preSelecao.dia_inicio;
    }
    checar();
});

/* Só o que muda a JANELA dispara consulta: destino e observação não mexem em
   conflito e não precisam bater no servidor a cada tecla. */
watch(() => [form.value.hora_inicio, form.value.hora_fim], checar);

async function checar() {
    if (!props.vehicleId || !form.value.dia_inicio) return;
    if (horaInvertida.value) { disponibilidade.value = null; return; }
    checando.value = true;
    erro.value = '';
    try {
        disponibilidade.value = await verificarDisponibilidade({
            vehicle_id: props.vehicleId,
            dia_inicio: form.value.dia_inicio,
            dia_fim: form.value.dia_fim || form.value.dia_inicio,
            periodo: 'personalizado',
            hora_inicio: form.value.hora_inicio,
            hora_fim: form.value.hora_fim,
        });
    } catch (e) {
        disponibilidade.value = null;
        erro.value = mensagemDeErro(e, 'Não foi possível verificar a disponibilidade.');
    } finally {
        checando.value = false;
    }
}

function dataBonita(iso) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo',
    }).format(new Date(`${iso}T12:00:00-03:00`));
}

/** Quem está ocupando, dito com nome e hora - não "indisponível" e ponto. */
const ocupacao = computed(() => {
    const r = disponibilidade.value?.reservas?.[0];
    const b = disponibilidade.value?.bloqueios?.[0];
    if (b) return `Veículo indisponível: ${b.motivo || 'manutenção'}.`;
    if (!r) return '';
    const h = (d) => new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    }).format(new Date(d));
    return `${r.condutor?.username || 'Outra pessoa'} está com o carro de ${h(r.inicio)} até ${h(r.fim)}.`;
});

function confirmar() {
    emit('confirmar', {
        dia_inicio: form.value.dia_inicio,
        dia_fim: form.value.dia_fim || form.value.dia_inicio,
        periodo: 'personalizado',
        hora_inicio: form.value.hora_inicio,
        hora_fim: form.value.hora_fim,
        departamento: departamentoFinal.value || null,
        destino: form.value.destino,
        solicitado_por: form.value.solicitado_por,
        observacao: form.value.observacao,
    });
}
</script>

<template>
  <Modal :open="open" size="lg" title="Reservar o veículo"
         subtitle="Reservar é guardar o horário. Pegar a chave é o passo seguinte, na retirada."
         @close="$emit('close')">
    <div class="flex flex-col gap-4">

      <!-- Saída e volta lado a lado: é a pergunta central e some da tela se
           ficar espremida entre os outros campos. -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">Saída</p>
          <p class="text-sm font-medium text-ink capitalize">{{ dataBonita(form.dia_inicio) }}</p>
          <Input v-model="form.hora_inicio" type="time" class="mt-2" label="Hora da saída" size="sm" />
        </div>
        <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">Devolução prevista</p>
          <p class="text-sm font-medium text-ink capitalize">
            {{ dataBonita(form.dia_fim || form.dia_inicio) }}
          </p>
          <Input v-model="form.hora_fim" type="time" class="mt-2" label="Hora da volta" size="sm" />
        </div>
      </div>

      <p class="-mt-2 text-micro text-ink-subtle">
        As datas vêm do calendário. Feche esta janela para escolher outras.
      </p>

      <p v-if="horaInvertida" class="text-sm text-amber-700 dark:text-amber-400">
        <i class="fas fa-triangle-exclamation"></i>
        A hora da volta precisa ser depois da hora da saída.
      </p>

      <!-- A resposta do servidor, não um cálculo daqui. -->
      <div v-else class="rounded-lg border px-3 py-2 text-sm"
           :class="checando ? 'border-line text-ink-muted'
                 : disponibilidade?.livre ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                 : disponibilidade ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                 : 'border-line text-ink-muted'">
        <template v-if="checando"><i class="fas fa-circle-notch fa-spin"></i> Conferindo a agenda...</template>
        <template v-else-if="disponibilidade?.livre"><i class="fas fa-circle-check"></i> Horário livre.</template>
        <template v-else-if="disponibilidade">
          <i class="fas fa-triangle-exclamation"></i> {{ ocupacao }}
        </template>
        <template v-else>Escolha o horário para conferir a agenda.</template>
      </div>

      <Select v-if="departamentoOptions.length > 1" v-model="form.departamento"
              :options="departamentoOptions" label="Departamento" placeholder="Selecione" />
      <Input v-if="form.departamento === '__outro__'" v-model="form.departamento_outro"
             label="Qual departamento?" required placeholder="Escreva o nome" />

      <Input v-model="form.destino" label="Destino / rota prevista"
             :required="config.exigir_destino !== false"
             placeholder="Ex.: Tupã, visita ao empreendimento" />

      <Input v-model="form.solicitado_por" label="A pedido de (opcional)"
             placeholder="Ex.: PH" hint="Use quando a viagem foi pedida por outra pessoa." />

      <Input v-model="form.observacao" label="Observações (opcional)" />

      <p v-if="erro || erroSalvar" class="text-sm text-red-600 dark:text-red-400">{{ erro || erroSalvar }}</p>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Cancelar</Button>
      <Button variant="primary" icon="fas fa-check" :loading="salvando"
              :disabled="checando || horaInvertida || !disponibilidade?.livre" @click="confirmar">
        Reservar
      </Button>
    </template>
  </Modal>
</template>
