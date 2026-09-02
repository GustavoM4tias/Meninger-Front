<script setup>
/* Veículo corporativo.
 *
 * A tela responde três perguntas, nesta ordem, porque é a ordem em que elas
 * aparecem na vida: quem está com o carro agora, quando ele está livre, e o
 * que eu tenho para resolver (retirar, devolver, cancelar).
 *
 * Mobile primeiro: quem usa isto está no estacionamento com o celular na mão.
 */
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFrotaStore } from '@/stores/Frota/frotaStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useCan } from '@/composables/useCan';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { mensagemDeErro } from '@/utils/mensagemDeErro';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Favorite from '@/components/config/Favorite.vue';

import CardPosse from './components/CardPosse.vue';
import CalendarioMes from './components/CalendarioMes.vue';
import ModalReserva from './components/ModalReserva.vue';
import ModalRetirada from './components/ModalRetirada.vue';
import ModalDevolucao from './components/ModalDevolucao.vue';
import ModalBloqueio from './components/ModalBloqueio.vue';
import { STATUS_RESERVA, dataHora, rotuloVeiculo } from './frota.js';

const router = useRouter();
const store = useFrotaStore();
const auth = useAuthStore();
const can = useCan('/frota');

const reservaOpen = ref(false);
const retiradaOpen = ref(false);
const devolucaoOpen = ref(false);
const bloqueioOpen = ref(false);
const retiradaDireta = ref(false);
const alvo = ref(null);
const preSelecao = ref(null);
const calendarioRef = ref(null);
const erroModal = ref('');

const usuarioId = computed(() => auth.user?.id || null);

/* A reserva que ESTE usuário tem em uso: é ela que troca o botão principal do
   cartão de "Reservar" para "Registrar devolução". */
const minhaEmUso = computed(() =>
    store.minhasReservas.find(r => r.status === 'em_uso') || null);

/* Minha reserva cuja janela já começou (com duas horas de folga para quem
   chega adiantado) e ainda não terminou. É ela que o cartão oferece retirar. */
const minhaParaRetirar = computed(() => {
    const agora = Date.now();
    return store.minhasReservas.find(r =>
        r.status === 'reservada'
        && new Date(r.inicio).getTime() - 2 * 3600000 <= agora
        && new Date(r.fim).getTime() > agora) || null;
});

const veiculoOptions = computed(() =>
    store.veiculos.map(v => ({ value: v.id, label: rotuloVeiculo(v) })));

onMounted(() => store.carregar());

function abrirReserva(pre = null) {
    preSelecao.value = pre;
    erroModal.value = '';
    reservaOpen.value = true;
}

function abrirRetirada(reserva, direta = false) {
    alvo.value = reserva;
    retiradaDireta.value = direta;
    erroModal.value = '';
    retiradaOpen.value = true;
}

function abrirDevolucao(reserva) {
    alvo.value = reserva;
    erroModal.value = '';
    devolucaoOpen.value = true;
}

async function confirmarReserva(payload) {
    try {
        await store.reservar(payload);
        reservaOpen.value = false;
        calendarioRef.value?.limpar();
    } catch (e) {
        erroModal.value = mensagemDeErro(e, 'Não foi possível reservar.');
    }
}

async function confirmarRetirada(payload) {
    try {
        if (retiradaDireta.value) await store.retirarSemReserva(payload);
        else await store.retirar(alvo.value.id, payload);
        retiradaOpen.value = false;
    } catch (e) {
        erroModal.value = mensagemDeErro(e, 'Não foi possível registrar a retirada.');
    }
}

async function confirmarDevolucao(payload) {
    try {
        await store.devolver(alvo.value.id, payload);
        devolucaoOpen.value = false;
    } catch (e) {
        erroModal.value = mensagemDeErro(e, 'Não foi possível registrar a devolução.');
    }
}

async function confirmarBloqueio(payload) {
    try {
        await store.bloquear(payload);
        bloqueioOpen.value = false;
    } catch (e) {
        erroModal.value = mensagemDeErro(e, 'Não foi possível bloquear o período.');
    }
}

async function cancelar(reserva) {
    const ok = await pedirConfirmacao({
        title: 'Cancelar esta reserva?',
        consequence: `O período de ${dataHora(reserva.inicio)} até ${dataHora(reserva.fim)} volta a ficar livre para outras pessoas.`,
        confirmLabel: 'Cancelar reserva',
    });
    if (!ok) return;
    try {
        await store.cancelar(reserva.id);
    } catch (e) {
        store.erro = mensagemDeErro(e, 'Não foi possível cancelar.');
    }
}
</script>

<template>
  <PageContainer size="lg">
    <PageHeader subtitle="Reserve o carro da empresa, registre a retirada e a devolução."
                icon="fas fa-car-side">
      <template #title>
        <span>Veículo</span>
        <Favorite :router="'/frota'" :section="'Veículo'" />
      </template>
      <template #actions>
        <Button v-if="store.gestor" size="sm" variant="secondary" icon="fas fa-screwdriver-wrench"
                @click="bloqueioOpen = true">
          <span class="hidden sm:inline">Manutenção</span>
        </Button>
        <Button v-if="can('configurar')" size="sm" variant="ghost" icon="fas fa-sliders"
                @click="router.push('/frota/configuracoes')">
          <span class="hidden sm:inline">Configurar</span>
        </Button>
        <PageHelp
          storage-key="frota"
          title="Como usar o Veículo"
          intro="Esta tela substitui o combinado por mensagem no grupo. O topo mostra quem está com o carro agora; abaixo, o calendário do mês diz quais dias estão livres."
          :steps="[
            { title: 'Veja se está livre', text: 'O cartão do topo diz quem está com a chave e até quando. Se estiver livre, o botão Reservar aparece ali mesmo.' },
            { title: 'Escolha os dias e as horas', text: 'No calendário, toque no dia da saída e depois no dia da volta (ou confirme em Só esse dia). Depois ajuste a hora da saída e a da devolução: é a hora que decide o conflito, então dá para alguém devolver 12h e outra pessoa pegar às 14h do mesmo dia.' },
            { title: 'Retire o carro', text: 'Quando a hora chegar, o botão do topo vira Retirar. Confirme o odômetro e o combustível: é só isso, porque destino e departamento você já respondeu na reserva.' },
            { title: 'Devolva', text: 'Ao voltar, informe o KM final, o combustível e se houve abastecimento ou avaria. O veículo volta a ficar livre na hora, mesmo que você devolva antes do previsto.' },
            { title: 'Vai pegar agora, sem ter reservado?', text: 'Use Pegar agora, sem reserva: ele cria a reserva a partir deste minuto e registra a saída de uma vez. Basta dizer até quando o carro fica com você.' },
          ]"
          :tips="[
            'Avaria é histórico do CARRO, não da sua viagem: você registra na devolução e ela aparece para quem pegar o veículo depois.',
            'Reserva que não tem a retirada registrada expira sozinha e libera o período - por isso a agenda continua confiável.',
            'Dia em âmbar tem meio período livre: dá para reservar a manhã ou a tarde. Dia em vermelho já está inteiro ocupado.',
            'Enquanto o carro está ocupado, existe um evento no calendário com as pessoas que têm acesso a esta tela, então quem só olha o Outlook também vê.',
          ]"
        />
      </template>
    </PageHeader>

    <!-- Erro diz o que houve E oferece a saída: banner sem botão deixa a pessoa
         sem ação a não ser recarregar a página na mão. -->
    <div v-if="store.erro"
         class="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
      <p class="flex-1 text-sm text-red-600 dark:text-red-400">{{ store.erro }}</p>
      <Button size="sm" variant="secondary" icon="fas fa-rotate-right"
              class="shrink-0 min-h-[40px]" @click="store.carregar()">
        Tentar de novo
      </Button>
    </div>

    <!-- Esqueleto na forma do que vem: um cartão de estado e a grade do mês. -->
    <div v-if="store.carregando" class="flex flex-col lg:flex-row gap-4">
      <div class="flex flex-col gap-4 lg:w-80 lg:shrink-0">
        <Skeleton variant="stat" />
      </div>
      <div class="flex-1">
        <Skeleton variant="table" />
      </div>
    </div>

    <template v-else-if="!store.veiculos.length">
      <Panel padded>
        <EmptyState icon="fas fa-car-side" title="Nenhum veículo cadastrado"
                    description="Um administrador precisa cadastrar o veículo em Configurações antes de a agenda existir." />
      </Panel>
    </template>

    <!-- Duas colunas no largo, empilhado no estreito.
         A regra de paridade proíbe esticar uma coluna de celular no desktop: o
         calendário é o bloco que ganha com espaço (o mês inteiro sem apertar),
         então ele fica na coluna maior, e estado e pendências viram a lateral.
         No celular a ordem volta a ser a da vida: o que está acontecendo, o que
         eu tenho para resolver, e só então a agenda. -->
    <div v-else class="flex flex-col lg:flex-row lg:items-start gap-4">

      <div class="flex flex-col gap-4 lg:w-80 lg:shrink-0">
        <Select v-if="veiculoOptions.length > 1" :model-value="store.veiculoId"
                :options="veiculoOptions" label="Veículo"
                @update:model-value="store.trocarVeiculo(Number($event))" />

        <CardPosse :veiculo="store.veiculo" :podeUsar="can('reservar')"
                   :minha-reserva-em-uso="minhaEmUso"
                   :minha-reserva-para-retirar="minhaParaRetirar"
                   @reservar="abrirReserva()"
                   @retirar="abrirRetirada($event)"
                   @retirar-agora="abrirRetirada(null, true)"
                   @devolver="abrirDevolucao" />

        <Panel v-if="store.minhasAtivas.length" title="Suas reservas" icon="fas fa-user-clock" padded>
          <div class="flex flex-col divide-y divide-line">
            <!-- Empilhado sempre: esta lista vive numa coluna de 320px no
                 desktop e na largura do celular no estreito. Nas duas, botão ao
                 lado de texto espremeria os dois. -->
            <div v-for="r in store.minhasAtivas" :key="r.id"
                 class="py-3 first:pt-0 last:pb-0 flex flex-col gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-ink">{{ dataHora(r.inicio) }} até {{ dataHora(r.fim) }}</span>
                  <Badge :variant="STATUS_RESERVA[r.status]?.variant || 'neutral'" size="sm">
                    {{ STATUS_RESERVA[r.status]?.label || r.status }}
                  </Badge>
                </div>
                <p v-if="r.destino" class="text-xs text-ink-muted truncate mt-0.5">{{ r.destino }}</p>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button v-if="r.status === 'reservada'" size="sm" variant="primary" icon="fas fa-key"
                        class="min-h-[40px]" @click="abrirRetirada(r)">Retirar</Button>
                <Button v-if="r.status === 'em_uso'" size="sm" variant="primary" icon="fas fa-flag-checkered"
                        class="min-h-[40px]" @click="abrirDevolucao(r)">Devolver</Button>
                <Button v-if="r.status === 'reservada'" size="sm" variant="ghost" icon="fas fa-xmark"
                        class="min-h-[40px]" @click="cancelar(r)">Cancelar</Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div class="min-w-0 flex-1">
        <CalendarioMes ref="calendarioRef" :reservas="store.reservas" :bloqueios="store.bloqueios"
                       :config="store.config" :usuario-id="usuarioId"
                       @selecionar="can('reservar') && abrirReserva($event)" />
      </div>
    </div>

    <ModalReserva :open="reservaOpen" :vehicle-id="store.veiculoId" :config="store.config"
                  :salvando="store.salvando" :pre-selecao="preSelecao" :erro-salvar="erroModal"
                  @close="reservaOpen = false" @confirmar="confirmarReserva" />

    <ModalRetirada :open="retiradaOpen" :reserva="alvo" :veiculo="store.veiculo"
                   :config="store.config" :salvando="store.salvando" :direta="retiradaDireta"
                   :avarias="store.avarias" :face-cadastrada="Boolean(auth.user?.face_enabled)"
                   :erro="erroModal"
                   @close="retiradaOpen = false" @confirmar="confirmarRetirada" />

    <ModalDevolucao :open="devolucaoOpen" :reserva="alvo" :config="store.config"
                    :salvando="store.salvando" :erro="erroModal"
                    @close="devolucaoOpen = false" @confirmar="confirmarDevolucao" />

    <ModalBloqueio :open="bloqueioOpen" :vehicle-id="store.veiculoId"
                   :salvando="store.salvando" :erro="erroModal"
                   @close="bloqueioOpen = false" @confirmar="confirmarBloqueio" />
  </PageContainer>
</template>
