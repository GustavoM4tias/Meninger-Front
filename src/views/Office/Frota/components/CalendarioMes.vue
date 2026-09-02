<script setup>
/* O calendário do veículo.
 *
 * Substituiu uma lista de 14 dias que era honesta e ilegível: para achar um dia
 * livre a pessoa rolava a tela inteira. Aqui o mês cabe de uma vez e a pergunta
 * "quando dá para pegar o carro" se responde olhando.
 *
 * A escolha é um INTERVALO: primeiro toque marca a saída, segundo marca a
 * volta. Tocar de novo recomeça. É o mesmo gesto de qualquer reserva de hotel,
 * então ninguém precisa aprender nada.
 *
 * O que este componente pinta é uma DICA visual. Quem decide se a reserva pode
 * existir é sempre o servidor, na confirmação - senão a tela poderia ficar mais
 * permissiva que a API.
 */
import { computed, ref } from 'vue';
import Panel from '@/components/UI/Panel.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Button from '@/components/UI/Button.vue';
import { chaveDoDia, nomeDoCondutor, apenasHora } from '../frota.js';

const props = defineProps({
    reservas: { type: Array, default: () => [] },
    bloqueios: { type: Array, default: () => [] },
    config: { type: Object, default: () => ({}) },
    usuarioId: { type: [Number, String], default: null },
});

const emit = defineEmits(['selecionar']);

const hojeISO = chaveDoDia(new Date());
const mesBase = ref(primeiroDiaDoMes(new Date()));
const inicio = ref('');
const fim = ref('');

function primeiroDiaDoMes(d) {
    const data = new Date(d);
    data.setDate(1);
    data.setHours(12, 0, 0, 0);   // meio-dia evita virada de fuso na navegação
    return data;
}

function mudarMes(passo) {
    const d = new Date(mesBase.value);
    d.setMonth(d.getMonth() + passo);
    mesBase.value = primeiroDiaDoMes(d);
}

const rotuloMes = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
        .format(mesBase.value));

/* Um item ocupa o turno quando existe qualquer sobreposição com a faixa dele. */
function ocupaTurno(item, diaISO, turno) {
    const [hIni, hFim] = turno === 'manha'
        ? [props.config.hora_inicio_manha || '07:00', props.config.hora_fim_manha || '12:00']
        : [props.config.hora_inicio_tarde || '13:00', props.config.hora_fim_tarde || '18:00'];
    const faixaIni = new Date(`${diaISO}T${hIni}:00-03:00`);
    const faixaFim = new Date(`${diaISO}T${hFim}:00-03:00`);
    return new Date(item.inicio) < faixaFim && new Date(item.fim) > faixaIni;
}

const dias = computed(() => {
    const base = mesBase.value;
    const ano = base.getFullYear();
    const mes = base.getMonth();

    const primeiro = new Date(ano, mes, 1, 12);
    const ultimo = new Date(ano, mes + 1, 0, 12);

    // A grade começa no domingo anterior para as colunas baterem com o cabeçalho.
    const inicioGrade = new Date(primeiro);
    inicioGrade.setDate(primeiro.getDate() - primeiro.getDay());

    const total = Math.ceil((ultimo.getDate() + primeiro.getDay()) / 7) * 7;

    return Array.from({ length: total }, (_, i) => {
        const data = new Date(inicioGrade);
        data.setDate(inicioGrade.getDate() + i);
        data.setHours(12, 0, 0, 0);
        const diaISO = chaveDoDia(data);

        const bloqueio = props.bloqueios.find(b => ocupaTurno(b, diaISO, 'manha') || ocupaTurno(b, diaISO, 'tarde'));
        const manha = props.reservas.find(r => ocupaTurno(r, diaISO, 'manha'));
        const tarde = props.reservas.find(r => ocupaTurno(r, diaISO, 'tarde'));
        const reserva = manha || tarde;
        const minha = reserva && Number(reserva.user_id) === Number(props.usuarioId);

        let estado = 'livre';
        if (bloqueio) estado = 'bloqueado';
        else if (manha && tarde) estado = 'ocupado';
        else if (manha || tarde) estado = 'parcial';

        return {
            diaISO,
            numero: data.getDate(),
            doMes: data.getMonth() === mes,
            passado: diaISO < hojeISO,
            hoje: diaISO === hojeISO,
            estado,
            minha,
            reserva,
            bloqueio,
        };
    });
});

/* Dia sem nenhuma folga não pode iniciar nem terminar uma reserva. O parcial
   pode: metade do dia continua livre, e o turno é escolhido na confirmação. */
function selecionavel(dia) {
    return !dia.passado && dia.estado !== 'ocupado' && dia.estado !== 'bloqueado';
}

function noIntervalo(dia) {
    if (!inicio.value || !fim.value) return false;
    return dia.diaISO >= inicio.value && dia.diaISO <= fim.value;
}

function escolher(dia) {
    if (!selecionavel(dia)) return;

    // Sem início, ou já existe um intervalo fechado: recomeça deste dia.
    if (!inicio.value || (inicio.value && fim.value)) {
        inicio.value = dia.diaISO;
        fim.value = '';
        return;
    }
    // Segundo toque antes do primeiro: vira o novo início (em vez de recusar,
    // que obrigaria a pessoa a descobrir sozinha que a ordem importa).
    if (dia.diaISO < inicio.value) {
        inicio.value = dia.diaISO;
        return;
    }
    fim.value = dia.diaISO;
    emit('selecionar', { dia_inicio: inicio.value, dia_fim: fim.value });
}

/* Um dia só também é uma reserva: sem isto seria preciso tocar duas vezes no
   mesmo dia para reservar a tarde de amanhã. */
function confirmarDiaUnico() {
    if (!inicio.value || fim.value) return;
    fim.value = inicio.value;
    emit('selecionar', { dia_inicio: inicio.value, dia_fim: fim.value });
}

function limpar() {
    inicio.value = '';
    fim.value = '';
}

defineExpose({ limpar });

const legenda = [
    { classe: 'bg-surface-sunken border-line', texto: 'Livre' },
    { classe: 'bg-amber-500/20 border-amber-500/40', texto: 'Meio período' },
    { classe: 'bg-red-500/15 border-red-500/40', texto: 'Ocupado' },
    { classe: 'bg-accent-soft border-accent/40', texto: 'Sua reserva' },
];
</script>

<template>
  <Panel padded>
    <template #title>
      <span class="capitalize">{{ rotuloMes }}</span>
    </template>
    <template #actions>
      <IconButton icon="fas fa-chevron-left" label="Mês anterior" @click="mudarMes(-1)" />
      <IconButton icon="fas fa-chevron-right" label="Próximo mês" @click="mudarMes(1)" />
    </template>

    <div class="grid grid-cols-7 gap-1 mb-1">
      <div v-for="d in ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']" :key="d"
           class="text-center text-micro uppercase tracking-wide text-ink-subtle py-1">
        {{ d }}
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <button v-for="dia in dias" :key="dia.diaISO" type="button"
              class="relative min-h-[44px] rounded-lg border text-sm transition-colors flex flex-col items-center justify-center"
              :class="[
                !dia.doMes ? 'opacity-35' : '',
                dia.passado ? 'border-transparent text-ink-subtle cursor-default'
                : dia.estado === 'bloqueado' ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 cursor-default'
                : dia.estado === 'ocupado' ? 'border-red-500/40 bg-red-500/15 text-ink-muted cursor-default'
                : dia.minha ? 'border-accent/40 bg-accent-soft text-accent'
                : dia.estado === 'parcial' ? 'border-amber-500/40 bg-amber-500/20 text-ink hover:border-accent/60'
                : 'border-line bg-surface-sunken text-ink hover:border-accent/60 hover:bg-accent-soft/40',
                noIntervalo(dia) ? 'ring-2 ring-accent' : '',
                dia.diaISO === inicio && !fim ? 'ring-2 ring-accent' : '',
              ]"
              :disabled="!selecionavel(dia)"
              :title="dia.bloqueio ? (dia.bloqueio.motivo || 'Indisponível')
                    : dia.reserva ? `${nomeDoCondutor(dia.reserva)} · ${apenasHora(dia.reserva.inicio)}`
                    : ''"
              @click="escolher(dia)">
        <span :class="dia.hoje ? 'font-bold underline underline-offset-2' : ''">{{ dia.numero }}</span>
        <i v-if="dia.estado === 'bloqueado'" class="fas fa-screwdriver-wrench text-micro mt-0.5"></i>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-line">
      <span v-for="l in legenda" :key="l.texto" class="inline-flex items-center gap-1.5 text-micro text-ink-muted">
        <span class="h-3 w-3 rounded border" :class="l.classe"></span>{{ l.texto }}
      </span>
    </div>

    <!-- A escolha em andamento fica visível: sem isto, quem toca uma vez não
         sabe se o sistema registrou nada. -->
    <div v-if="inicio" class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2">
      <p class="text-sm text-ink flex-1">
        <strong>Saída:</strong> {{ inicio.split('-').reverse().join('/') }}
        <template v-if="fim">
          · <strong>Volta:</strong> {{ fim.split('-').reverse().join('/') }}
        </template>
        <span v-else class="text-ink-muted"> · escolha o dia da volta, ou confirme para um dia só</span>
      </p>
      <div class="flex gap-2 shrink-0">
        <Button v-if="!fim" size="sm" variant="primary" class="min-h-[40px]"
                @click="confirmarDiaUnico">
          Só esse dia
        </Button>
        <Button size="sm" variant="ghost" class="min-h-[40px]" @click="limpar">
          Limpar
        </Button>
      </div>
    </div>
  </Panel>
</template>
