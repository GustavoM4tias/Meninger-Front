<script setup>
// Robô do painel do CV: a sessão que uma pessoa conecta e a reaprovação
// automática de reservas.
//
// Por que existe: no CV, editar a condição tira a aprovação da reserva, e ela
// só volta com o clique de um aprovador no painel - mesmo quando a condição
// voltou para dentro da regra. Aprovar não tem API; é o formulário do painel,
// e o login do painel tem CAPTCHA. Então uma pessoa entra no CV com o usuário
// do robô e cola aqui a sessão; o Office a mantém viva e aprova pelo mesmo
// formulário do botão, só o que está dentro da regra do empreendimento.
//
// O cookie nunca volta do servidor: a tela só sabe se há sessão e se está viva.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { CV_ORIGIN } from '@/utils/cvLinks';

import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const store = useRealEstateStore();
const toast = useToast();

// Nomes das séries no CV (medidos em 15/10/2026) só para a tela mostrar nome
// em vez de número. Série que não estiver aqui aparece como "Série N".
const NOMES_SERIES = {
    1: 'Parcelas Mensais', 9: 'Ato', 15: 'FGTS', 16: 'Entrada', 17: 'Financiamento', 18: 'Parcelas Anuais',
    19: 'Parcelas Semestrais', 20: 'Recurso Próprio Parcelado', 21: 'Recurso Próprio à Vista',
    22: 'Desconto Construtora', 23: 'Casa Paulista', 24: 'Subsídio Federal', 26: 'Entrega das Chaves',
    30: 'Casa Fácil', 33: 'Bônus Emendas', 34: 'Documentação', 35: 'Pré-Chaves', 36: 'Ser Família Habitação',
    37: 'Parcelas Mensais (Urban)', 38: 'Parcelas Semestrais (Urban)', 39: 'Parcelas Anuais (Urban)',
};
const rotuloSerie = (id) => `${NOMES_SERIES[id] || 'Série'} (${id})`;
const idDoRotulo = (txt) => Number(String(txt).match(/\((\d+)\)\s*$/)?.[1]);
const OPCOES_SERIES = Object.keys(NOMES_SERIES).map(Number).map(rotuloSerie);

const MODOS = [
    { value: 'simular', label: 'Só simular', icon: 'fas fa-flask' },
    { value: 'aprovar', label: 'Aprovar de verdade', icon: 'fas fa-check-double' },
];

const DECISOES = {
    aprovada: { rotulo: 'Aprovada', variant: 'success' },
    simulada: { rotulo: 'Aprovaria', variant: 'info' },
    fora_da_regra: { rotulo: 'Fora da regra', variant: 'warning' },
    ignorada: { rotulo: 'Ignorada', variant: 'neutral' },
    erro: { rotulo: 'Erro', variant: 'danger' },
};

const r = computed(() => store.cvRobo);
const sessao = computed(() => r.value?.sessao || {});
const situacoesConhecidas = computed(() => r.value?.situacoes_conhecidas || {});
const opcoesSituacoes = computed(() => Object.entries(situacoesConhecidas.value).map(([id, nome]) => `${nome} (${id})`));

const cookie = ref('');
const conectando = ref(false);
const removendo = ref(false);
const salvando = ref(false);
const simulando = ref(false);

const ativo = ref(false);
const modo = ref('simular');
const situacoes = ref([]);
const seriesPs = ref([]);
const seriesBloq = ref([]);
const tolerancia = ref('1');
const comentario = ref('');
const mostrarHistorico = ref(15);

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-';

const duracao = computed(() => {
    const m = sessao.value.duracao_min;
    if (m === null || m === undefined) return '-';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return h < 48 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} dias e ${h % 24} h`;
});

const historico = computed(() => (r.value?.historico || []).slice(0, mostrarHistorico.value));
const resumo7 = computed(() => r.value?.ultimos7dias || {});

function preencher() {
    const c = r.value?.config || {};
    ativo.value = !!c.ativo;
    modo.value = c.modo || 'simular';
    const nomes = situacoesConhecidas.value;
    situacoes.value = (c.situacoes || []).map((id) => `${nomes[id] || 'Situação'} (${id})`);
    seriesPs.value = (c.series_pro_soluto || []).map(rotuloSerie);
    seriesBloq.value = (c.series_bloqueiam || []).map(rotuloSerie);
    tolerancia.value = String(c.tolerancia_reais ?? 1);
    comentario.value = c.comentario || '';
}

async function carregar() {
    await store.fetchCvRobo();
    preencher();
}

async function conectar() {
    if (!cookie.value.trim()) { toast.error('Cole o valor do cookie CVid.'); return; }
    conectando.value = true;
    try {
        const data = await store.conectarCvRobo(cookie.value.trim());
        cookie.value = '';
        if (data?.teste?.ok) toast.success(data.teste.mensagem);
        else toast.error(data?.teste?.mensagem || 'O CV não aceitou a sessão.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao conectar a sessão.');
    } finally {
        conectando.value = false;
    }
}

async function remover() {
    if (!await pedirConfirmacao({
        title: 'Remover a sessão do robô?',
        consequence: 'O Office para de manter a sessão viva e a reaprovação automática para. Para voltar, alguém precisa entrar no CV com o usuário do robô e colar a sessão de novo.',
        confirmLabel: 'Remover sessão',
    })) return;
    removendo.value = true;
    try {
        const data = await store.desconectarCvRobo();
        toast.success(data?.teste?.mensagem || 'Sessão removida.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao remover a sessão.');
    } finally {
        removendo.value = false;
    }
}

async function salvar() {
    const ids = (lista) => lista.map(idDoRotulo).filter(Boolean);
    if (modo.value === 'aprovar' && r.value?.config?.modo !== 'aprovar') {
        if (!await pedirConfirmacao({
            title: 'Ligar a aprovação de verdade?',
            consequence: 'A cada rodada, o robô aprova no CV as reservas das situações escolhidas que estiverem dentro da regra do empreendimento, em nome do usuário do robô. O que estiver fora da regra continua esperando o aprovador.',
            confirmLabel: 'Ligar aprovação',
            tone: 'accent',
        })) return;
    }
    salvando.value = true;
    try {
        await store.salvarCvRoboConfig({
            ativo: ativo.value,
            modo: modo.value,
            situacoes: ids(situacoes.value),
            series_pro_soluto: ids(seriesPs.value),
            series_bloqueiam: ids(seriesBloq.value),
            tolerancia_reais: Number(String(tolerancia.value).replace(',', '.')),
            comentario: comentario.value,
        });
        preencher();
        toast.success('Regra do robô salva.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao salvar a regra do robô.');
    } finally {
        salvando.value = false;
    }
}

async function simular() {
    simulando.value = true;
    try {
        const data = await store.simularCvRobo();
        const s = data?.resultado || {};
        if (s.pulado) toast.info(`Não rodou: ${s.pulado}.`);
        else toast.success(`Simulação: ${s.candidatos} na fila, ${s.simuladas} aprovaria, ${s.fora_da_regra} fora da regra, ${s.ja_aprovadas} já aprovada(s), ${s.erros} erro(s).`);
    } catch (err) {
        toast.error(err?.message || 'Erro ao simular.');
    } finally {
        simulando.value = false;
    }
}

const linkReserva = (id) => `${CV_ORIGIN}/gestor/comercial/reservas/${id}/administrar`;

onMounted(() => {
    carregar().catch((err) => toast.error(err?.message || 'Não foi possível carregar o robô do CV.'));
});
</script>

<template>
    <Panel title="Robô do CV" icon="fas fa-robot"
        subtitle="Reaprova reservas que voltaram para dentro da regra"
        :loading="store.cvRoboLoading && !r" loading-variant="text">
        <div class="space-y-5">
            <!-- 1. Sessão -->
            <section class="space-y-3">
                <div class="rounded-xl border border-line bg-surface-sunken p-3.5 space-y-1.5">
                    <div class="flex flex-wrap items-center gap-2">
                        <Badge v-if="sessao.viva" variant="success" size="sm">Sessão viva</Badge>
                        <Badge v-else-if="sessao.conectada" variant="danger" size="sm">Sessão caiu</Badge>
                        <Badge v-else variant="neutral" size="sm">Sem sessão</Badge>
                        <span v-if="sessao.conectada" class="text-xs text-ink-muted">
                            Conectada por {{ sessao.definida_por_nome || '-' }} em {{ fmt(sessao.definida_em) }}
                        </span>
                    </div>
                    <p v-if="sessao.conectada" class="text-xs text-ink-muted">
                        Último sinal: {{ fmt(sessao.ultimo_ok_em) }} · {{ sessao.pings_ok }} sinais · durou {{ duracao }}
                    </p>
                    <p v-if="sessao.perdida_em" class="text-xs text-data-neg">
                        <i class="fas fa-triangle-exclamation mr-1"></i>
                        Caiu em {{ fmt(sessao.perdida_em) }}: {{ sessao.perdida_motivo }}
                    </p>
                </div>

                <ol class="text-xs text-ink-muted space-y-1 list-decimal pl-4">
                    <li>Abra uma janela anônima e entre no CV com o usuário do robô (sistema@menin.com.br).</li>
                    <li>Aperte F12 &gt; Aplicativo &gt; Cookies &gt; menin.cvcrm.com.br e copie o valor de <strong class="text-ink">CVid</strong>.</li>
                    <li>Cole abaixo e conecte. Depois feche a janela <strong class="text-ink">sem clicar em Sair</strong> - sair encerra a sessão.</li>
                </ol>

                <Input v-model="cookie" type="password" label="Sessão do robô (cookie CVid)"
                    placeholder="Cole aqui o valor do CVid"
                    hint="O Office testa no CV antes de gravar e guarda criptografado. Não use este usuário em outro lugar: entrar com ele de novo pode derrubar a sessão do robô." />

                <div class="flex flex-wrap justify-end gap-2">
                    <Button v-if="sessao.conectada" variant="ghost" icon="fas fa-link-slash" :loading="removendo"
                        @click="remover">Remover sessão</Button>
                    <Button variant="primary" icon="fas fa-plug" :loading="conectando" @click="conectar">
                        {{ sessao.conectada ? 'Trocar sessão' : 'Conectar sessão' }}
                    </Button>
                </div>
            </section>

            <!-- 2. Regra da reaprovação -->
            <section class="pt-4 border-t border-line-subtle space-y-3">
                <div>
                    <p class="text-sm font-medium text-ink">Reaprovação automática</p>
                    <p class="text-xs text-ink-muted">
                        A regra de cada empreendimento é lida do próprio CV (Regras Simulações/Reservas e Séries). Qualquer
                        coisa que o robô não saiba avaliar fica para o aprovador, com o motivo no histórico abaixo.
                        Para rodar sozinho, ligue também o "Robô do painel" em Sincronizações automáticas.
                    </p>
                </div>

                <Switch v-model="ativo" label="Reaprovação ligada" />
                <SegmentedControl v-model="modo" :options="MODOS" size="sm" />

                <MultiSelector v-model="situacoes" :options="opcoesSituacoes" label="Situações que o robô olha" />
                <MultiSelector v-model="seriesPs" :options="OPCOES_SERIES" label="Séries que contam como pró-soluto" />
                <MultiSelector v-model="seriesBloq" :options="OPCOES_SERIES" label="Séries que sempre vão para o aprovador" />

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input v-model="tolerancia" label="Tolerância (R$)"
                        hint="Arredondamento aceito abaixo da tabela." />
                    <div class="sm:col-span-2">
                        <Input v-model="comentario" label="Comentário gravado no CV"
                            hint="Fica no histórico da aprovação da reserva." />
                    </div>
                </div>

                <div class="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" icon="fas fa-flask" :loading="simulando"
                        v-tippy="'Roda a fila agora sem aprovar nada e registra o que aprovaria'"
                        @click="simular">Simular agora</Button>
                    <Button variant="primary" icon="fas fa-check" :loading="salvando" @click="salvar">Salvar regra</Button>
                </div>
            </section>

            <!-- 3. Histórico -->
            <section class="pt-4 border-t border-line-subtle space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm font-medium text-ink">O que o robô decidiu</p>
                    <div class="flex flex-wrap gap-1.5">
                        <Badge v-for="(d, k) in DECISOES" :key="k" :variant="d.variant" size="sm">
                            {{ d.rotulo }}: {{ resumo7[k] || 0 }}
                        </Badge>
                        <span class="text-micro text-ink-subtle self-center">últimos 7 dias</span>
                    </div>
                </div>

                <p v-if="!historico.length" class="text-xs text-ink-muted">Nada registrado ainda.</p>

                <ul v-else class="space-y-2">
                    <li v-for="h in historico" :key="h.id"
                        class="rounded-xl border border-line bg-surface p-3 space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <Badge :variant="DECISOES[h.decisao]?.variant || 'neutral'" size="sm">
                                {{ DECISOES[h.decisao]?.rotulo || h.decisao }}
                            </Badge>
                            <a :href="linkReserva(h.idreserva)" target="_blank" rel="noopener"
                                class="text-sm font-medium text-ink hover:underline">Reserva {{ h.idreserva }}</a>
                            <span class="text-xs text-ink-muted">{{ h.empreendimento || '-' }} · {{ h.situacao || '-' }}</span>
                            <span class="text-micro text-ink-subtle ml-auto">{{ fmt(h.created_at) }}</span>
                        </div>
                        <ul v-if="h.motivos?.length" class="text-xs text-ink-muted list-disc pl-4">
                            <li v-for="(m, i) in h.motivos" :key="i">{{ m }}</li>
                        </ul>
                    </li>
                </ul>

                <div v-if="(r?.historico || []).length > mostrarHistorico" class="flex justify-center">
                    <Button variant="ghost" size="sm" @click="mostrarHistorico += 15">Ver mais</Button>
                </div>
            </section>
        </div>
    </Panel>
</template>
