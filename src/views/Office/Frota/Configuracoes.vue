<script setup>
/* Configuração da frota.
 *
 * Tela própria e não modal: é edição principal, e edição principal em modal é
 * proibida pela receita. Sub-tela de /frota (herda a alçada pelo
 * meta.permissionRoute), com as ações cobradas pela capacidade 'configurar'.
 *
 * Tudo que a operação pode querer mudar aparece aqui. Config que existe no
 * banco e não aparece na tela não existe.
 */
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { mensagemDeErro } from '@/utils/mensagemDeErro';
import {
    fetchSettings, salvarSettings, fetchVeiculos, salvarVeiculo, fetchUsuarios,
} from '@/utils/Frota/apiFrota';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Modal from '@/components/UI/Modal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import ActionBar from '@/components/UI/ActionBar.vue';

const router = useRouter();
const toast = useToast();

const carregando = ref(true);
const salvando = ref(false);
const erro = ref('');

const config = ref({});
/* Cópia do que veio do servidor. É ela que responde "tem alteração pendente?" -
   sem isso a barra de salvar apareceria sempre, e uma barra que está sempre lá
   não avisa nada. */
const original = ref('{}');
const veiculos = ref([]);
const usuarios = ref([]);

const veiculoOpen = ref(false);
const veiculoEditando = ref(null);
const formVeiculo = ref(veiculoVazio());
const erroVeiculo = ref('');

const novoDepartamento = ref('');

/* O MultiSelector trabalha com uma lista de STRINGS: ele usa a própria opção
   como valor e a imprime na tela. Passar `{ value, label }` faz a opção
   aparecer como objeto.
   O que fica GRAVADO continua sendo o id do usuário, então a tela mostra nome e
   o banco guarda id: a tradução acontece aqui, nas duas direções. O username é
   único no cadastro, então não há ambiguidade na volta. */
const usuariosOptions = computed(() =>
    usuarios.value.map(u => u.username || u.email));

function rotuloDoUsuario(u) {
    return u.username || u.email;
}

const gestoresSelecionados = computed({
    get() {
        const ids = (config.value.gestor_user_ids || []).map(Number);
        return usuarios.value.filter(u => ids.includes(Number(u.id))).map(rotuloDoUsuario);
    },
    set(rotulos) {
        const escolhidos = new Set(rotulos);
        config.value.gestor_user_ids = usuarios.value
            .filter(u => escolhidos.has(rotuloDoUsuario(u)))
            .map(u => Number(u.id));
    },
});

function veiculoVazio() {
    return { placa: '', modelo: '', apelido: '', cor: '', ano: '', tipo: 'proprio', km_atual: '', observacao: '', ativo: true };
}

onMounted(carregar);

async function carregar() {
    carregando.value = true;
    erro.value = '';
    try {
        const [cfg, lista, pessoas] = await Promise.all([fetchSettings(), fetchVeiculos(), fetchUsuarios()]);
        config.value = cfg;
        original.value = JSON.stringify(cfg);
        veiculos.value = lista;
        usuarios.value = pessoas;
    } catch (e) {
        erro.value = mensagemDeErro(e, 'Não foi possível carregar a configuração.');
    } finally {
        carregando.value = false;
    }
}

/* QUANTOS campos mudaram desde que a tela abriu, não só "mudou algo": a barra
   diz o tamanho do que está pendente, e o rótulo do descartar diz que ele
   DESCARTA, não que limpa. */
const camposAlterados = computed(() => {
    let antes;
    try { antes = JSON.parse(original.value); } catch { return 0; }
    const chaves = new Set([...Object.keys(antes || {}), ...Object.keys(config.value || {})]);
    let n = 0;
    for (const chave of chaves) {
        if (JSON.stringify(antes?.[chave]) !== JSON.stringify(config.value?.[chave])) n += 1;
    }
    return n;
});

async function salvar() {
    salvando.value = true;
    erro.value = '';
    try {
        config.value = await salvarSettings(config.value);
        original.value = JSON.stringify(config.value);
        // Aviso é toast: o botão que gerou a ação fica na barra fixa, e um
        // banner no topo da página apareceria fora do campo de visão de quem
        // acabou de salvar lá embaixo.
        toast.success('Configuração salva. Vale a partir de agora.');
    } catch (e) {
        erro.value = mensagemDeErro(e, 'Não foi possível salvar.');
    } finally {
        salvando.value = false;
    }
}

function adicionarDepartamento() {
    const valor = novoDepartamento.value.trim();
    if (!valor) return;
    const atual = config.value.departamentos || [];
    if (atual.includes(valor)) { novoDepartamento.value = ''; return; }
    config.value.departamentos = [...atual, valor];
    novoDepartamento.value = '';
}

function removerDepartamento(nome) {
    config.value.departamentos = (config.value.departamentos || []).filter(c => c !== nome);
}

function abrirVeiculo(veiculo = null) {
    veiculoEditando.value = veiculo;
    formVeiculo.value = veiculo ? { ...veiculo } : veiculoVazio();
    erroVeiculo.value = '';
    veiculoOpen.value = true;
}

async function salvarVeiculoForm() {
    salvando.value = true;
    erroVeiculo.value = '';
    try {
        await salvarVeiculo(veiculoEditando.value?.id || null, {
            ...formVeiculo.value,
            ano: formVeiculo.value.ano === '' ? null : Number(formVeiculo.value.ano),
            km_atual: formVeiculo.value.km_atual === '' ? null : Number(formVeiculo.value.km_atual),
        });
        veiculos.value = await fetchVeiculos();
        veiculoOpen.value = false;
    } catch (e) {
        erroVeiculo.value = mensagemDeErro(e, 'Não foi possível salvar o veículo.');
    } finally {
        salvando.value = false;
    }
}

async function alternarAtivo(veiculo) {
    const desativando = veiculo.ativo;
    if (desativando) {
        const ok = await pedirConfirmacao({
            title: `Desativar ${veiculo.apelido || veiculo.modelo}?`,
            consequence: 'Ele some do seletor de quem vai reservar. As reservas já gravadas continuam no histórico, e dá para reativar aqui a qualquer momento.',
            confirmLabel: 'Desativar veículo',
        });
        if (!ok) return;
    }
    try {
        await salvarVeiculo(veiculo.id, { ...veiculo, ativo: !veiculo.ativo });
        veiculos.value = await fetchVeiculos();
    } catch (e) {
        erro.value = mensagemDeErro(e, 'Não foi possível alterar o veículo.');
    }
}
</script>

<template>
  <PageContainer size="lg">
    <PageHeader title="Configuração do veículo"
                subtitle="Veículos da frota, prazos da agenda, evento no calendário e quem é o gestor."
                icon="fas fa-sliders">
      <template #actions>
        <Button size="sm" variant="ghost" icon="fas fa-arrow-left" @click="router.push('/frota')">
          <span class="hidden sm:inline">Voltar</span>
        </Button>
        <PageHelp
          storage-key="frota-config"
          title="Como configurar"
          intro="Esta tela define como a agenda do veículo se comporta. O que estiver aqui vale na hora, sem depender de publicação."
          :steps="[
            { title: 'Cadastre o veículo', text: 'Sem pelo menos um veículo ativo a tela principal abre vazia. O carro reserva que a locadora empresta durante a manutenção entra como um segundo veículo, do tipo Reserva.' },
            { title: 'Defina o gestor da frota', text: 'Quem estiver nessa lista pode bloquear o veículo por manutenção e cancelar a reserva de outras pessoas, sem precisar ser administrador do Office.' },
            { title: 'Ajuste os prazos', text: 'O prazo de expiração é o que mantém a agenda honesta: reserva sem retirada registrada some depois dele e o período volta a ficar livre.' },
            { title: 'Escolha a caixa do evento', text: 'Vazio significa que o evento nasce na agenda do próprio condutor. Uma caixa dedicada (frota@) mantém o histórico quando a pessoa sai da empresa e é o que permite o evento de manutenção.' },
          ]"
          :tips="[
            'Os participantes do evento são as pessoas que têm a tela na alçada: para elas aparecerem, libere /frota em Alçadas.',
            'O evento nasce marcado como Livre para não pintar a agenda de todo mundo de ocupado. Só troque para Ocupado se a diretoria pedir.',
          ]"
        />
      </template>
    </PageHeader>

    <div v-if="erro"
         class="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
      <p class="flex-1 text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
      <Button size="sm" variant="secondary" icon="fas fa-rotate-right"
              class="shrink-0 min-h-[40px]" @click="carregar">
        Recarregar
      </Button>
    </div>

    <div v-if="carregando" class="flex flex-col gap-4">
      <Skeleton variant="table" />
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- ── Veículos ─────────────────────────────────────────────── -->
      <Panel title="Veículos" icon="fas fa-car-side" padded>
        <template #actions>
          <Button size="sm" variant="secondary" icon="fas fa-plus" @click="abrirVeiculo()">
            Cadastrar
          </Button>
        </template>

        <EmptyState v-if="!veiculos.length" size="sm" icon="fas fa-car-side"
                    title="Nenhum veículo cadastrado"
                    description="Cadastre o carro da empresa para a agenda existir." />

        <div v-else class="flex flex-col divide-y divide-line">
          <div v-for="v in veiculos" :key="v.id"
               class="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-ink">{{ v.apelido || v.modelo }}</span>
                <Badge size="sm" variant="neutral">{{ v.placa }}</Badge>
                <Badge v-if="v.tipo === 'reserva'" size="sm" variant="info">Carro reserva</Badge>
                <Badge v-if="!v.ativo" size="sm" variant="danger">Inativo</Badge>
              </div>
              <p class="text-xs text-ink-muted mt-0.5">
                {{ v.modelo }}<template v-if="v.ano"> · {{ v.ano }}</template>
                <template v-if="v.km_atual"> · {{ Number(v.km_atual).toLocaleString('pt-BR') }} km</template>
              </p>
            </div>
            <div class="flex gap-1 shrink-0">
              <IconButton icon="fas fa-pen" label="Editar" @click="abrirVeiculo(v)" />
              <IconButton :icon="v.ativo ? 'fas fa-toggle-on' : 'fas fa-toggle-off'"
                          :label="v.ativo ? 'Desativar' : 'Reativar'" @click="alternarAtivo(v)" />
            </div>
          </div>
        </div>
      </Panel>

      <!-- ── Gestor da frota ──────────────────────────────────────── -->
      <Panel title="Gestor da frota" icon="fas fa-user-shield" padded>
        <p class="text-sm text-ink-muted mb-3">
          Quem estiver aqui pode bloquear o veículo por manutenção e cancelar a reserva de
          outras pessoas. É papel do módulo: não precisa ser administrador do Office.
        </p>
        <MultiSelector v-model="gestoresSelecionados" :options="usuariosOptions"
                       label="Pessoas" placeholder="Escolha quem cuida do carro" />
      </Panel>

      <!-- ── Regras da agenda ─────────────────────────────────────── -->
      <Panel title="Regras da agenda" icon="fas fa-clock" padded>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model.number="config.horas_expirar_sem_retirada" type="number"
                 label="Expira sem retirada (horas)"
                 hint="Reserva sem retirada registrada some depois disto e libera o período." />
          <Input v-model.number="config.max_dias_reserva" type="number"
                 label="Máximo de dias por reserva" />
          <Input v-model.number="config.antecedencia_max_dias" type="number"
                 label="Antecedência máxima (dias)" />
          <Input v-model.number="config.lembrete_retirada_horas" type="number"
                 label="Lembrete antes da retirada (horas)"
                 hint="Zero desliga o lembrete." />
          <Input v-model.number="config.km_max_por_dia" type="number"
                 label="Limite de KM por dia"
                 hint="Não é meta de uso: é o teto acima do qual a leitura do odômetro é quase certamente erro de digitação. Aceita de 100 a 5.000." />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-line">
          <Input v-model.number="config.min_fotos_saida" type="number" min="0" max="8"
                 label="Fotos obrigatórias na retirada"
                 hint="Zero desliga a exigência." />
          <Input v-model.number="config.min_fotos_chegada" type="number" min="0" max="8"
                 label="Fotos obrigatórias na devolução"
                 hint="A comparação entre saída e chegada é o que mostra o que aconteceu na viagem." />
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Input v-model="config.hora_inicio_manha" type="time" label="Manhã começa" />
          <Input v-model="config.hora_fim_manha" type="time" label="Manhã termina" />
          <Input v-model="config.hora_inicio_tarde" type="time" label="Tarde começa" />
          <Input v-model="config.hora_fim_tarde" type="time" label="Tarde termina" />
        </div>

        <div class="flex flex-col gap-3 mt-4 pt-4 border-t border-line">
          <Switch v-model="config.exigir_km" label="Exigir KM do odômetro"
                  description="Sem ele não existe relatório de quilometragem nem rateio." />
          <Switch v-model="config.exigir_combustivel" label="Exigir nível de combustível" />
          <Switch v-model="config.exigir_destino" label="Exigir destino ou rota prevista" />
          <Switch v-model="config.exigir_face" label="Exigir reconhecimento facial na retirada"
                  description="Amarra a retirada a uma pessoa de verdade. Quem ainda não tem rosto cadastrado cadastra na hora, sem sair da tela." />
        </div>
      </Panel>

      <!-- ── Centros de custo ─────────────────────────────────────── -->
      <Panel title="Departamentos" icon="fas fa-sitemap" padded>
        <p class="text-sm text-ink-muted mb-3">
          A lista que aparece na reserva. É o que permite, depois, dizer quanto cada área
          rodou. Quem não achar o seu escolhe "Outro" e escreve.
        </p>
        <div class="flex flex-wrap gap-2 mb-3">
          <span v-for="c in (config.departamentos || [])" :key="c"
                class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-xs text-ink">
            {{ c }}
            <button type="button" class="text-ink-subtle hover:text-red-500" @click="removerDepartamento(c)">
              <i class="fas fa-xmark"></i>
            </button>
          </span>
          <span v-if="!(config.departamentos || []).length" class="text-xs text-ink-subtle">
            Nenhum departamento cadastrado: o campo não aparece na reserva.
          </span>
        </div>
        <div class="flex gap-2">
          <Input v-model="novoDepartamento" placeholder="Ex.: Suprimentos" class="flex-1"
                 @keyup.enter="adicionarDepartamento" />
          <Button variant="secondary" icon="fas fa-plus" @click="adicionarDepartamento">Adicionar</Button>
        </div>
      </Panel>

      <!-- ── Evento no calendário ─────────────────────────────────── -->
      <Panel title="Evento no calendário" icon="fas fa-calendar-check" padded>
        <div class="flex flex-col gap-3">
          <Switch v-model="config.evento_ativo" label="Criar evento enquanto o carro estiver ocupado"
                  description="O evento nasce na reserva, acompanha a retirada e termina na devolução." />

          <Input v-model="config.evento_organizador_email" type="email"
                 label="Caixa que organiza o evento"
                 placeholder="frota@menin.com.br"
                 hint="Vazio: o evento nasce na agenda do próprio condutor. Uma caixa dedicada mantém o histórico quando a pessoa sai da empresa, e é obrigatória para o evento de manutenção existir." />

          <Select v-model="config.evento_participantes" label="Participantes"
                  :options="[
                    { value: 'alcada', label: 'Quem tem a tela na alçada' },
                    { value: 'nenhum', label: 'Ninguém (evento sem convidados)' },
                  ]"
                  hint="Os convidados entram como opcionais: ninguém precisa aceitar nada." />

          <Select v-model="config.evento_mostrar_como" label="Aparece na agenda como"
                  :options="[
                    { value: 'free', label: 'Livre (recomendado)' },
                    { value: 'busy', label: 'Ocupado' },
                  ]"
                  hint="O carro ocupado não significa que a pessoa está ocupada. Ocupado pinta a agenda de todos os convidados." />

          <Input v-model.number="config.evento_lembrete_minutos" type="number"
                 label="Lembrete do evento (minutos antes)" hint="Zero desliga." />
        </div>
      </Panel>

      <!-- ── Teams ────────────────────────────────────────────────── -->
      <Panel title="Aviso no grupo do Teams" icon="fab fa-microsoft" padded>
        <p class="text-sm text-ink-muted mb-3">
          Mantém o grupo atual recebendo a retirada e a devolução, para quem ainda não usa a tela.
          Use um webhook de entrada do canal: o Office não tem permissão para escrever no Teams
          pelo caminho normal.
        </p>
        <div class="flex flex-col gap-3">
          <Switch v-model="config.teams_webhook_ativo" label="Avisar no canal" />
          <Input v-model="config.teams_webhook_url" label="URL do webhook do canal"
                 placeholder="https://..." />
        </div>
      </Panel>

      <!-- Espaço para a barra fixa não cobrir o último painel. -->
      <div class="h-16"></div>
    </div>

    <!-- Arquétipo Configuração: "o salvar vira barra fixa quando há alteração
         pendente". Seis painéis empurravam o botão para fora da tela, e no
         celular ele exigia rolar tudo de volta. -->
    <ActionBar :count="camposAlterados"
               :unit="camposAlterados === 1 ? 'ajuste não salvo' : 'ajustes não salvos'"
               summary="Valem para todo mundo assim que você salvar"
               clear-label="Descartar alterações" @clear="carregar">
      <Button variant="primary" icon="fas fa-check" :loading="salvando" @click="salvar">
        Salvar configuração
      </Button>
    </ActionBar>

    <!-- ── Cadastro do veículo ──────────────────────────────────── -->
    <Modal :open="veiculoOpen" size="lg"
           :title="veiculoEditando ? 'Editar veículo' : 'Cadastrar veículo'"
           @close="veiculoOpen = false">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="formVeiculo.placa" label="Placa" required placeholder="ABC1D23" />
          <Input v-model="formVeiculo.modelo" label="Modelo" required placeholder="Ex.: Toyota Corolla" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="formVeiculo.apelido" label="Apelido (opcional)"
                 hint="É o nome que aparece na tela. Ex.: Corolla prata." />
          <Input v-model="formVeiculo.cor" label="Cor (opcional)" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="formVeiculo.ano" type="number" label="Ano (opcional)" />
          <Input v-model="formVeiculo.km_atual" type="number" label="KM atual do odômetro"
                 hint="A primeira retirada não pode informar um KM menor que este." />
        </div>
        <Select v-model="formVeiculo.tipo" label="Tipo"
                :options="[
                  { value: 'proprio', label: 'Próprio' },
                  { value: 'reserva', label: 'Carro reserva (emprestado na manutenção)' },
                ]" />
        <Input v-model="formVeiculo.observacao" label="Observação (opcional)" />
        <Switch v-model="formVeiculo.ativo" label="Ativo"
                description="Inativo some do seletor de quem vai reservar." />

        <p v-if="erroVeiculo" class="text-sm text-red-600 dark:text-red-400">{{ erroVeiculo }}</p>
      </div>

      <template #footer>
        <Button variant="ghost" @click="veiculoOpen = false">Cancelar</Button>
        <Button variant="primary" icon="fas fa-check" :loading="salvando"
                :disabled="!formVeiculo.placa || !formVeiculo.modelo" @click="salvarVeiculoForm">
          Salvar veículo
        </Button>
      </template>
    </Modal>
  </PageContainer>
</template>
