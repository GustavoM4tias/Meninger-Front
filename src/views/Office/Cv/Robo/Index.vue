<script setup>
// CV CRM > Robô de aprovação.
//
// No CV, editar a condição de uma reserva tira a aprovação, e ela só volta com
// o clique de um aprovador - mesmo quando a condição voltou para dentro da
// regra. O robô faz esse clique pelo mesmo formulário do painel, só para o que
// está dentro da regra do empreendimento (lida no próprio CV).
//
// Era um cartão dentro de CV CRM > Configurações. Virou tela porque tem vida
// própria: regra, frequência, o que ele vai cobrar em cada empreendimento e o
// histórico de cada decisão. A SESSÃO dele continua em Configurações, junto das
// outras credenciais do CV - aqui só aparece o estado dela.

import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { CV_ORIGIN } from '@/utils/cvLinks';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import CvJobsCard from '@/components/Cv/CvJobsCard.vue';

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
const cfg = computed(() => r.value?.config || {});
const situacoesConhecidas = computed(() => r.value?.situacoes_conhecidas || {});
const opcoesSituacoes = computed(() => Object.entries(situacoesConhecidas.value).map(([id, nome]) => `${nome} (${id})`));

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-';
const brl = (v) => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const linkReserva = (id) => `${CV_ORIGIN}/gestor/comercial/reservas/${id}/administrar`;

// ── Regra da reaprovação ─────────────────────────────────────────────────────
const salvando = ref(false);
const simulando = ref(false);
const ativo = ref(false);
const modo = ref('simular');
const situacoes = ref([]);
const seriesPs = ref([]);
const seriesBloq = ref([]);
const tolerancia = ref('0');
const empFora = ref([]);
const mensagemCv = ref(true);
const minutosReprovacao = ref('10');
const rotuloEmp = (id) => {
    const e = store.enterprises.find((x) => Number(x.id) === Number(id));
    return `${e?.nome || 'Empreendimento'} (${id})`;
};
const opcoesEmpFora = computed(() => store.enterprises.map((e) => `${e.nome} (${e.id})`));
const maxPorRodada = ref('40');
const comentario = ref('');

function preencher() {
    const c = cfg.value;
    ativo.value = !!c.ativo;
    modo.value = c.modo || 'simular';
    const nomes = situacoesConhecidas.value;
    situacoes.value = (c.situacoes || []).map((id) => `${nomes[id] || 'Situação'} (${id})`);
    seriesPs.value = (c.series_pro_soluto || []).map(rotuloSerie);
    seriesBloq.value = (c.series_bloqueiam || []).map(rotuloSerie);
    tolerancia.value = String(c.tolerancia_reais ?? 0);
    empFora.value = (c.empreendimentos_fora || []).map(rotuloEmp);
    mensagemCv.value = c.mensagem_cv !== false;
    minutosReprovacao.value = String(c.mensagem_reprovacao_minutos ?? 10);
    maxPorRodada.value = String(c.max_por_rodada ?? 40);
    comentario.value = c.comentario || '';
}

async function salvar() {
    const ids = (lista) => lista.map(idDoRotulo).filter(Boolean);
    if (modo.value === 'aprovar' && cfg.value.modo !== 'aprovar') {
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
            max_por_rodada: Number(maxPorRodada.value),
            empreendimentos_fora: ids(empFora.value),
            mensagem_cv: mensagemCv.value,
            mensagem_reprovacao_minutos: Number(minutosReprovacao.value),
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

// ── Regra de cada empreendimento, lida no CV ─────────────────────────────────
const empSel = ref('');
const lendoRegra = ref(false);
const regraEmp = ref(null);
const opcoesEmp = computed(() => store.enterprises.map(e => ({ value: String(e.id), label: `${e.nome} (${e.id})` })));

async function lerRegra() {
    if (!empSel.value) { toast.error('Escolha o empreendimento.'); return; }
    lendoRegra.value = true;
    regraEmp.value = null;
    try {
        regraEmp.value = await store.lerRegraCvRobo(Number(empSel.value));
    } catch (err) {
        toast.error(err?.message || 'Não foi possível ler a regra no CV.');
    } finally {
        lendoRegra.value = false;
    }
}

// ── Conferir reservas avulsas ────────────────────────────────────────────────
const idsTexto = ref('');
const conferindo = ref(false);
const conferidas = ref([]);

async function conferir() {
    const ids = [...new Set(String(idsTexto.value).split(/[^\d]+/).map(Number).filter(n => n > 0))];
    if (!ids.length) { toast.error('Digite o número de ao menos uma reserva.'); return; }
    if (ids.length > 60) { toast.error('No máximo 60 reservas por vez.'); return; }
    conferindo.value = true;
    try {
        conferidas.value = await store.avaliarCvRobo(ids) || [];
    } catch (err) {
        toast.error(err?.message || 'Erro ao conferir as reservas.');
    } finally {
        conferindo.value = false;
    }
}

// ── Histórico ────────────────────────────────────────────────────────────────
const filtroDecisao = ref('todas');
const buscaReserva = ref('');
const mostrar = ref(20);
const opcoesDecisao = [{ value: 'todas', label: 'Todas as decisões' }, ...Object.entries(DECISOES).map(([v, d]) => ({ value: v, label: d.rotulo }))];
const historicoFiltrado = computed(() => {
    const busca = String(buscaReserva.value).replace(/\D/g, '');
    return (r.value?.historico || []).filter((h) => (filtroDecisao.value === 'todas' || h.decisao === filtroDecisao.value)
        && (!busca || String(h.idreserva).includes(busca)));
});
const historico = computed(() => historicoFiltrado.value.slice(0, mostrar.value));
const resumo7 = computed(() => r.value?.ultimos7dias || {});

// ── Fila de agora ────────────────────────────────────────────────────────────
const fila = computed(() => r.value?.fila || []);
const minutosDesde = (d) => (d ? Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)) : null);
const espera = (d) => {
    const m = minutosDesde(d);
    if (m == null) return '-';
    if (m < 60) return `${m} min`;
    if (m < 1440) return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
    return `${Math.floor(m / 1440)} dia(s)`;
};

/** Situação da mensagem no CV de uma linha do histórico ou da fila. */
function estadoMensagem(h) {
    if (h.mensagem_cv_em) return { texto: `Mensagem no CV ${fmt(h.mensagem_cv_em)}`, variant: 'success' };
    if (h.mensagem_cv_erro) return { texto: `Mensagem no CV falhou: ${h.mensagem_cv_erro}`, variant: 'danger' };
    if (h.decisao === 'fora_da_regra' && cfg.value.mensagem_cv && cfg.value.modo === 'aprovar') {
        return { texto: `Mensagem no CV depois de ${cfg.value.mensagem_reprovacao_minutos} min sem mudança`, variant: 'neutral' };
    }
    return null;
}

async function recarregar() {
    await Promise.all([store.fetchCvRobo(), store.fetchEnterprises().catch(() => {})]);
    preencher();
}

onMounted(() => {
    recarregar().catch((err) => toast.error(err?.message || 'Não foi possível carregar o robô do CV.'));
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Robô de aprovação"
            subtitle="Reaprova no CV as reservas que voltaram para dentro da regra do empreendimento"
            icon="fas fa-robot"
        >
            <template #actions>
                <PageHelp
                    storage-key="cv-robo"
                    title="Como usar o Robô de aprovação"
                    intro="Quando alguém edita a condição de uma reserva, o CV tira a aprovação e só um aprovador devolve. O robô faz isso sozinho para o que voltou para dentro da regra do empreendimento."
                    :steps="[
                        { title: 'Sessão', text: 'O robô entra no CV com uma sessão colada em CV CRM > Configurações. O selo no topo diz se ela está viva; se cair, é lá que se conecta de novo.' },
                        { title: 'Regra do robô', text: 'Escolha as situações que ele olha, as séries que contam como pró-soluto e as que sempre vão para o aprovador. Comece em Só simular: ele registra o que aprovaria, sem aprovar nada.' },
                        { title: 'Frequência', text: 'O cartão Frequência liga, desliga e muda o horário da rodada. Sem ele ligado, nada roda sozinho - nem a simulação.' },
                        { title: 'Regra do empreendimento', text: 'A regra de valores (desconto aceito, pró-soluto, limites de cada série) é a cadastrada no próprio CV. Escolha um empreendimento e leia para ver exatamente o que o robô vai cobrar.' },
                        { title: 'Conferir reservas', text: 'Digite números de reserva para ver na hora se estão dentro da regra e por quê. Não aprova nem grava nada.' },
                        { title: 'Fila de agora', text: 'Mostra as reservas paradas nas situações do robô, há quanto tempo, a última decisão e o motivo. O botão Abrir no CV leva direto para a reserva.' },
                        { title: 'Mensagem no CV', text: 'Ao aprovar, o robô escreve na reserva quais condições conferiu, contra qual regra e qual tabela. Fora da regra, ele espera os minutos configurados sem mudança na condição antes de escrever o motivo, para não poluir a reserva enquanto alguém ainda está ajustando.' },
                        { title: 'Histórico', text: 'Cada decisão fica registrada com o motivo e o que foi conferido. Uma reserva só ganha linha nova quando o resultado muda. Busque pelo número da reserva.' },
                    ]"
                    :tips="[
                        'Qualquer coisa que o robô não saiba avaliar fica para o aprovador, com o motivo escrito.',
                        'A reserva é conferida assim que entra na situação (aviso do CV) e de novo a cada rodada, então ajustes de condição também são pegos.',
                        'Empreendimentos fora do robô (os 30/70, por exemplo) vão sempre para o aprovador.',
                        'Ligar Aprovar de verdade pede confirmação: a partir daí ele aprova no CV em nome do usuário do robô.',
                    ]"
                />
                <Button variant="ghost" icon="fas fa-rotate" :loading="store.cvRoboLoading" @click="recarregar">Atualizar</Button>
            </template>
        </PageHeader>

        <!-- Estado em uma linha: sessão + regra -->
        <div class="mb-4 rounded-xl border border-line bg-surface-sunken p-3.5 flex flex-wrap items-center gap-2 text-xs">
            <Badge v-if="sessao.viva" variant="success" size="sm">Sessão viva</Badge>
            <Badge v-else-if="sessao.conectada" variant="danger" size="sm">Sessão caiu</Badge>
            <Badge v-else variant="neutral" size="sm">Sem sessão</Badge>
            <Badge :variant="cfg.ativo ? 'success' : 'neutral'" size="sm">Reaprovação {{ cfg.ativo ? 'ligada' : 'desligada' }}</Badge>
            <Badge :variant="cfg.modo === 'aprovar' ? 'accent' : 'info'" size="sm">{{ cfg.modo === 'aprovar' ? 'Aprovando de verdade' : 'Só simulando' }}</Badge>
            <span v-if="sessao.ultimo_ok_em" class="text-ink-muted">Último sinal da sessão: {{ fmt(sessao.ultimo_ok_em) }}</span>
            <RouterLink v-if="!sessao.viva" to="/crm/configuracoes" class="ml-auto text-accent hover:underline">
                <i class="fas fa-plug mr-1"></i>Conectar a sessão em Configurações
            </RouterLink>
        </div>
        <p v-if="sessao.perdida_em && !sessao.viva" class="mb-4 text-xs text-data-neg">
            <i class="fas fa-triangle-exclamation mr-1"></i>
            A sessão caiu em {{ fmt(sessao.perdida_em) }}: {{ sessao.perdida_motivo }}
        </p>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Regra do robô -->
            <Panel title="Regra do robô" icon="fas fa-sliders"
                subtitle="O que ele olha e o que manda sempre para o aprovador"
                :loading="store.cvRoboLoading && !r" loading-variant="text">
                <div class="space-y-3">
                    <Switch v-model="ativo" label="Reaprovação ligada" />
                    <SegmentedControl v-model="modo" :options="MODOS" size="sm" />

                    <MultiSelector v-model="situacoes" :options="opcoesSituacoes" label="Situações que o robô olha" />
                    <MultiSelector v-model="seriesPs" :options="OPCOES_SERIES" label="Séries que contam como pró-soluto" />
                    <MultiSelector v-model="seriesBloq" :options="OPCOES_SERIES" label="Séries que sempre vão para o aprovador" />

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input v-model="tolerancia" label="Tolerância (R$)"
                            hint="Arredondamento aceito abaixo da tabela. 0 = nenhum centavo abaixo." />
                        <Input v-model="maxPorRodada" type="number" label="Reservas por rodada"
                            hint="Teto de reservas olhadas a cada rodada (1 a 200)." />
                    </div>
                    <MultiSelector v-model="empFora" :options="opcoesEmpFora" label="Empreendimentos fora do robô (sempre no aprovador)" />
                    <Input v-model="comentario" label="Comentário gravado no CV"
                        hint="Fica no histórico da aprovação da reserva." />
                    <Switch v-model="mensagemCv" label="Escrever o resultado como mensagem na reserva do CV" />
                    <Input v-if="mensagemCv" v-model="minutosReprovacao" type="number" label="Espera da mensagem de reprovação (min)"
                        hint="Só escreve o motivo depois desse tempo sem mudança na condição. A aprovação é escrita na hora." />

                    <div class="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" icon="fas fa-flask" :loading="simulando"
                            v-tippy="'Roda a fila agora sem aprovar nada e registra o que aprovaria'"
                            @click="simular">Simular agora</Button>
                        <Button variant="primary" icon="fas fa-check" :loading="salvando" @click="salvar">Salvar regra</Button>
                    </div>
                </div>
            </Panel>

            <!-- Frequência: o cron do robô, e só ele -->
            <CvJobsCard :somente="['robo_painel']" titulo="Frequência"
                subtitulo="De quanto em quanto tempo o robô mantém a sessão viva e roda a fila" />

            <!-- Regra de cada empreendimento, lida no CV -->
            <Panel class="lg:col-span-2" title="Regra de cada empreendimento" icon="fas fa-building"
                subtitle="O que o robô vai cobrar, lido agora no CV (Regras Simulações/Reservas e Séries)">
                <div class="space-y-3">
                    <div class="flex flex-wrap items-end gap-2">
                        <div class="flex-1 min-w-[220px]">
                            <Select v-model="empSel" :options="opcoesEmp" label="Empreendimento" placeholder="Escolha o empreendimento" />
                        </div>
                        <Button variant="secondary" icon="fas fa-magnifying-glass" :loading="lendoRegra" @click="lerRegra">Ler no CV</Button>
                    </div>

                    <div v-if="regraEmp" class="space-y-3">
                        <div class="flex flex-wrap gap-2 text-xs">
                            <Badge :variant="regraEmp.vai_para_o_aprovador.length ? 'warning' : 'success'" size="sm">
                                {{ regraEmp.vai_para_o_aprovador.length ? 'Sempre no aprovador' : 'Robô avalia' }}
                            </Badge>
                            <Badge variant="neutral" size="sm">Vale para: {{ regraEmp.vale_para }}</Badge>
                            <Badge variant="neutral" size="sm">
                                Desconto aceito: {{ regraEmp.desconto_aceito_pct == null ? '-' : `${regraEmp.desconto_aceito_pct}%` }}
                            </Badge>
                            <Badge variant="neutral" size="sm">
                                Pró-soluto máx.: {{ regraEmp.pro_soluto_max_pct ? `${regraEmp.pro_soluto_max_pct}% do VGV` : 'sem limite' }}
                            </Badge>
                            <Badge variant="neutral" size="sm">Aprovação automática do CV: {{ regraEmp.aprovacao_automatica_cv ? 'ligada' : 'desligada' }}</Badge>
                        </div>

                        <ul v-if="regraEmp.vai_para_o_aprovador.length" class="text-xs text-data-warn list-disc pl-4">
                            <li v-for="(m, i) in regraEmp.vai_para_o_aprovador" :key="i">{{ m }}</li>
                        </ul>

                        <p class="text-xs text-ink-muted">
                            Perfis com aprovação automática:
                            <template v-for="(p, i) in regraEmp.perfis" :key="p.perfil">
                                <span :class="p.ligado ? 'text-ink' : 'text-ink-subtle line-through'">{{ p.perfil }} ({{ p.desconto_pct }}%)</span><span v-if="i < regraEmp.perfis.length - 1">, </span>
                            </template>
                        </p>

                        <div v-if="regraEmp.series.length" class="space-y-1.5">
                            <div v-for="s in regraEmp.series" :key="s.idserie"
                                class="rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span class="font-medium text-ink">{{ s.nome || rotuloSerie(s.idserie) }}</span>
                                <span class="text-ink-muted">mín. {{ brl(s.valor_min) }}</span>
                                <span class="text-ink-muted">máx. {{ s.sem_teto ? 'sem teto' : brl(s.valor_max) }}</span>
                                <span v-if="s.parcelas_max" class="text-ink-muted">até {{ s.parcelas_max }}x</span>
                                <span v-if="s.renda_pct" class="text-ink-muted">parcela até {{ s.renda_pct }}% da renda</span>
                                <Badge v-if="s.sempre_aprovador" variant="warning" size="sm">vai ao aprovador</Badge>
                                <Badge v-if="s.conta_pro_soluto" variant="info" size="sm">pró-soluto</Badge>
                            </div>
                        </div>
                        <p v-else class="text-xs text-ink-muted">Nenhuma série com limite cadastrada neste empreendimento.</p>
                    </div>
                </div>
            </Panel>

            <!-- Fila de agora -->
            <Panel class="lg:col-span-2" title="Fila de agora" icon="fas fa-hourglass-half"
                :subtitle="`${fila.length} reserva(s) nas situações do robô, da que espera há mais tempo para a mais nova`">
                <p v-if="!fila.length" class="text-xs text-ink-muted">Nenhuma reserva esperando.</p>
                <ul v-else class="space-y-2">
                    <li v-for="f in fila" :key="f.idreserva" class="rounded-xl border border-line bg-surface p-3 space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <Badge v-if="f.fora_do_robo" variant="neutral" size="sm">Fora do robô</Badge>
                            <Badge v-else-if="f.decisao" :variant="DECISOES[f.decisao]?.variant || 'neutral'" size="sm">{{ DECISOES[f.decisao]?.rotulo || f.decisao }}</Badge>
                            <Badge v-else variant="info" size="sm">Aguardando conferência</Badge>
                            <span class="text-sm font-medium text-ink">Reserva {{ f.idreserva }}</span>
                            <span class="text-xs text-ink-muted">{{ f.empreendimento || '-' }} · {{ f.situacao || '-' }}</span>
                            <a :href="linkReserva(f.idreserva)" target="_blank" rel="noopener"
                                class="ml-auto inline-flex items-center gap-1 min-h-[40px] px-3 rounded-lg border border-line text-xs text-accent hover:bg-surface-raised">
                                <i class="fas fa-arrow-up-right-from-square"></i>Abrir no CV
                            </a>
                        </div>
                        <p class="text-micro text-ink-subtle">
                            Na situação há {{ espera(f.na_situacao_desde) }} · última conferência {{ f.conferida_em ? `há ${espera(f.conferida_em)}` : '-' }}
                        </p>
                        <ul v-if="f.decisao === 'fora_da_regra' && f.motivos?.length" class="text-xs text-ink-muted list-disc pl-4">
                            <li v-for="(m, i) in f.motivos" :key="i">{{ m }}</li>
                        </ul>
                        <p v-if="estadoMensagem(f)" class="text-micro" :class="estadoMensagem(f).variant === 'danger' ? 'text-data-neg' : 'text-ink-subtle'">
                            {{ estadoMensagem(f).texto }}
                        </p>
                    </li>
                </ul>
            </Panel>

            <!-- Conferir reservas avulsas -->
            <Panel class="lg:col-span-2" title="Conferir reservas" icon="fas fa-list-check"
                subtitle="Diz na hora se a reserva está dentro da regra e por quê. Não aprova nem grava nada.">
                <div class="space-y-3">
                    <div class="flex flex-wrap items-end gap-2">
                        <div class="flex-1 min-w-[220px]">
                            <Input v-model="idsTexto" label="Números das reservas" placeholder="Ex.: 8833, 8850" />
                        </div>
                        <Button variant="secondary" icon="fas fa-list-check" :loading="conferindo" @click="conferir">Conferir</Button>
                    </div>
                    <ul v-if="conferidas.length" class="space-y-2">
                        <li v-for="c in conferidas" :key="c.idreserva" class="rounded-xl border border-line bg-surface p-3 space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <Badge v-if="c.erro" variant="danger" size="sm">Erro</Badge>
                                <Badge v-else-if="String(c.condicao_aprovada).toUpperCase() === 'S'" variant="success" size="sm">Já aprovada</Badge>
                                <Badge v-else :variant="c.dentro_da_regra ? 'info' : 'warning'" size="sm">
                                    {{ c.dentro_da_regra ? 'Dentro da regra' : 'Fora da regra' }}
                                </Badge>
                                <a :href="linkReserva(c.idreserva)" target="_blank" rel="noopener"
                                    class="text-sm font-medium text-ink hover:underline">Reserva {{ c.idreserva }}</a>
                                <span class="text-xs text-ink-muted">{{ c.empreendimento || '-' }} · {{ c.situacao || '-' }}</span>
                            </div>
                            <p v-if="c.erro" class="text-xs text-data-neg">{{ c.erro }}</p>
                            <ul v-if="c.motivos?.length" class="text-xs text-ink-muted list-disc pl-4">
                                <li v-for="(m, i) in c.motivos" :key="i">{{ m }}</li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </Panel>

            <!-- Histórico -->
            <Panel class="lg:col-span-2" title="O que o robô decidiu" icon="fas fa-clock-rotate-left"
                subtitle="Uma linha por mudança de resultado de cada reserva">
                <template #actions>
                    <div class="flex flex-wrap gap-2">
                        <div class="w-32">
                            <Input v-model="buscaReserva" placeholder="Nº da reserva" size="sm" />
                        </div>
                        <div class="w-48">
                            <Select v-model="filtroDecisao" :options="opcoesDecisao" size="sm" />
                        </div>
                    </div>
                </template>
                <div class="space-y-3">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <Badge v-for="(d, k) in DECISOES" :key="k" :variant="d.variant" size="sm">
                            {{ d.rotulo }}: {{ resumo7[k] || 0 }}
                        </Badge>
                        <span class="text-micro text-ink-subtle">últimos 7 dias</span>
                    </div>

                    <p v-if="!historico.length" class="text-xs text-ink-muted">Nada registrado ainda.</p>

                    <ul v-else class="space-y-2">
                        <li v-for="h in historico" :key="h.id"
                            class="rounded-xl border border-line bg-surface p-3 space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <Badge :variant="DECISOES[h.decisao]?.variant || 'neutral'" size="sm">
                                    {{ DECISOES[h.decisao]?.rotulo || h.decisao }}
                                </Badge>
                                <span class="text-sm font-medium text-ink">Reserva {{ h.idreserva }}</span>
                                <span class="text-xs text-ink-muted">{{ h.empreendimento || '-' }} · {{ h.situacao || '-' }}</span>
                                <span class="text-micro text-ink-subtle">{{ fmt(h.created_at) }}</span>
                                <a :href="linkReserva(h.idreserva)" target="_blank" rel="noopener"
                                    class="ml-auto inline-flex items-center gap-1 min-h-[40px] px-3 rounded-lg border border-line text-xs text-accent hover:bg-surface-raised">
                                    <i class="fas fa-arrow-up-right-from-square"></i>Abrir no CV
                                </a>
                            </div>
                            <p v-if="h.detalhes?.tabela" class="text-micro text-ink-subtle">Tabela: {{ h.detalhes.tabela }}</p>
                            <ul v-if="h.motivos?.length" class="text-xs text-ink-muted list-disc pl-4">
                                <li v-for="(m, i) in h.motivos" :key="i">{{ m }}</li>
                            </ul>
                            <ul v-else-if="h.detalhes?.conferencias?.length" class="text-xs text-ink-muted list-disc pl-4">
                                <li v-for="(m, i) in h.detalhes.conferencias" :key="i">{{ m }}</li>
                            </ul>
                            <p v-if="estadoMensagem(h)" class="text-micro" :class="estadoMensagem(h).variant === 'danger' ? 'text-data-neg' : 'text-ink-subtle'">
                                {{ estadoMensagem(h).texto }}
                            </p>
                        </li>
                    </ul>

                    <div v-if="historicoFiltrado.length > mostrar" class="flex justify-center">
                        <Button variant="ghost" size="sm" @click="mostrar += 20">Ver mais</Button>
                    </div>
                </div>
            </Panel>
        </div>
    </PageContainer>
</template>
