<script setup>
/* O cartão que responde a pergunta que o grupo do Teams nunca respondia:
   quem está com a chave agora. É o primeiro elemento da tela de propósito -
   no celular, é o único que cabe sem rolar. */
import { computed } from 'vue';
import Panel from '@/components/UI/Panel.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import { SITUACOES, dataHora, nomeDoCondutor, rotuloVeiculo } from '../frota.js';

const props = defineProps({
    veiculo: { type: Object, default: null },
    podeUsar: { type: Boolean, default: false },
    minhaReservaEmUso: { type: Object, default: null },
    /* Minha reserva cuja hora já chegou. Sem ela, quem reservou e voltou para
       pegar a chave caía em "Vou pegar agora" e recebia um conflito com a
       PRÓPRIA reserva - o sistema dizia não para quem tinha feito tudo certo. */
    minhaReservaParaRetirar: { type: Object, default: null },
});

defineEmits(['reservar', 'retirar-agora', 'devolver', 'retirar']);

const estado = computed(() => props.veiculo?.estado || null);
const selo = computed(() => SITUACOES[estado.value?.situacao] || SITUACOES.livre);

const linha = computed(() => {
    const e = estado.value;
    if (!e) return 'Sem veículo cadastrado.';
    if (e.situacao === 'em_uso') {
        const quem = nomeDoCondutor(e.em_uso);
        return e.atrasado
            ? `${quem} está com o carro. A devolução era ${dataHora(e.em_uso.fim)}.`
            : `${quem} está com o carro. Devolve ${dataHora(e.em_uso.fim)}.`;
    }
    if (e.situacao === 'indisponivel') {
        return `Indisponível até ${dataHora(e.bloqueio?.fim)}${e.bloqueio?.motivo ? ` (${e.bloqueio.motivo})` : ''}.`;
    }
    if (e.situacao === 'reservado_agora') {
        return `Reservado por ${nomeDoCondutor(e.proxima)} até ${dataHora(e.proxima?.fim)}, mas a retirada ainda não foi registrada.`;
    }
    if (e.proxima) return `Livre agora. Próxima reserva: ${nomeDoCondutor(e.proxima)}, ${dataHora(e.proxima.inicio)}.`;
    return 'Livre agora, sem nenhuma reserva pela frente.';
});
</script>

<template>
  <Panel padded>
    <div class="flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3 min-w-0">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base font-semibold text-ink truncate">{{ rotuloVeiculo(veiculo) }}</h2>
            <Badge :variant="selo.variant" size="sm">
              <i :class="selo.icon"></i>
              {{ selo.label }}
            </Badge>
            <Badge v-if="estado?.atrasado" variant="danger" size="sm">Devolução atrasada</Badge>
          </div>
          <p class="text-sm text-ink-muted mt-1">{{ linha }}</p>
          <p v-if="veiculo?.km_atual" class="text-xs text-ink-subtle mt-1">
            Odômetro: {{ Number(veiculo.km_atual).toLocaleString('pt-BR') }} km
          </p>
        </div>
        <i class="fas fa-car-side text-2xl text-ink-subtle hidden sm:block shrink-0"></i>
      </div>

      <!-- Alvos de 40px+ e largura cheia no celular: a diretoria usa isto de pé,
           no estacionamento, com uma mão só. -->
      <div v-if="podeUsar" class="flex flex-col sm:flex-row gap-2">
        <Button v-if="minhaReservaEmUso" variant="primary" icon="fas fa-flag-checkered"
                class="min-h-[40px]" block @click="$emit('devolver', minhaReservaEmUso)">
          Registrar devolução
        </Button>
        <!-- Você reservou e a hora chegou: o caminho é retirar a SUA reserva,
             não criar outra. -->
        <template v-else-if="minhaReservaParaRetirar">
          <Button variant="primary" icon="fas fa-key" class="min-h-[40px]" block
                  @click="$emit('retirar', minhaReservaParaRetirar)">
            Retirar o carro
          </Button>
        </template>
        <template v-else>
          <Button variant="primary" icon="fas fa-calendar-plus" class="min-h-[40px]" block
                  @click="$emit('reservar')">
            Reservar
          </Button>
          <Button v-if="estado?.situacao === 'livre'" variant="secondary" icon="fas fa-key"
                  class="min-h-[40px]" block @click="$emit('retirar-agora')">
            Pegar agora, sem reserva
          </Button>
        </template>
      </div>
    </div>
  </Panel>
</template>
