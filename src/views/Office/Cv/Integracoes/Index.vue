<script setup>
// CV CRM > Integrações — os dois lados da ponte com o CV, na mesma tela.
//
// De um lado, o que o CV tem cadastrado: para onde ele manda os avisos. Do
// outro, o que o Office tem ligado: o que ele aceita receber. Estavam em
// lugares diferentes (um no painel do CV, outro em lugar nenhum), e a
// divergência entre os dois é justamente o defeito mais silencioso desta
// integração — o CV chamando um endereço que o Office ignora, sem nada
// quebrar visivelmente de nenhum dos lados. Aqui isso vira um aviso na linha.
//
// Duas restrições da API do CV moldam a tela e aparecem no texto dela:
//
//   Não existe edição. A API tem POST e DELETE, não tem PUT. Renomear é
//   recriar, e por isso "Padronizar nome" avisa que troca o id do webhook.
//
//   Não dá para escolher a forma de envio. Uns webhooks mandam só o id e
//   outros o objeto inteiro, e isso é decidido pelo CV. Por isso o Office lê
//   o id de várias formas em vez de depender de um formato.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { useCvIntegrationStore } from '@/stores/Cv/cvIntegrationStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Modal from '@/components/UI/Modal.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useCvIntegrationStore();
const toast = useToast();

const ocupado = ref(null);
const criando = ref(false);
const detalhe = ref(null);

// ── Formulário de criação ────────────────────────────────────────────────────
const form = ref({ funcionalidade: '', gatilho: '', destino: '', endereco: '', nome: '', ativo: true });

const funcDoCatalogo = computed(() =>
    store.catalogo.map(f => ({ value: f.funcionalidade, label: `${f.nome} (${f.funcionalidade})` })));

const gatilhosDaFunc = computed(() => {
    const f = store.catalogo.find(x => x.funcionalidade === form.value.funcionalidade);
    if (!f) return [];
    // O gatilho -2 ("Alteração de situação") cobre qualquer mudança de etapa
    // com um cadastro só; os positivos são um por situação. Ele vem primeiro
    // porque é quase sempre o que se quer para sincronizar dado.
    return [...f.gatilhos]
        .sort((a, b) => (a.gatilho < 0 ? -1 : 1) - (b.gatilho < 0 ? -1 : 1))
        .map(g => ({ value: String(g.gatilho), label: `${g.nome}` }));
});

const gatilhoEscolhido = computed(() => {
    const f = store.catalogo.find(x => x.funcionalidade === form.value.funcionalidade);
    return f?.gatilhos.find(g => String(g.gatilho) === String(form.value.gatilho)) || null;
});

// Destino: o endpoint do Office monta a URL com o token certo. Digitar um
// token de 48 caracteres à mão é onde o erro acontece, e o erro só aparece
// quando o dado deixa de chegar.
const opcoesDestino = computed(() => ([
    ...store.endpoints.map(e => ({ value: e.funcionalidade, label: `Office - ${e.funcionalidade} (URL com token)` })),
    { value: 'livre', label: 'Outro endereço (integração de terceiro)' },
]));

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const nomeSugerido = computed(() => {
    const g = gatilhoEscolhido.value;
    if (!g || !form.value.funcionalidade) return '';
    // O rótulo vem do mapa do BACKEND, não do catálogo do CV: os dois divergem
    // (o CV chama RS de "Reserva", o Office de "Reservas"), e a prévia daqui
    // precisa bater exatamente com o nome que o servidor grava quando o campo
    // é deixado em branco.
    const rotulo = store.funcionalidades[form.value.funcionalidade] || form.value.funcionalidade;
    const func = semAcento(rotulo).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const gat = semAcento(g.nome).toLowerCase()
        .replace(/^quando entrar na situacao\s+/, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return `office-${func}-${gat}`;
});

function abrirCriacao() {
    form.value = { funcionalidade: '', gatilho: '', destino: '', endereco: '', nome: '', ativo: true };
    criando.value = true;
    store.carregarCatalogo().catch(err => toast.error(err?.message || 'Não foi possível ler os gatilhos do CV.'));
}

async function salvarNovo() {
    const ehLocal = form.value.destino && form.value.destino !== 'livre';
    const payload = {
        nome: (form.value.nome || nomeSugerido.value || '').trim(),
        funcionalidade: form.value.funcionalidade,
        gatilho: Number(form.value.gatilho),
        gatilho_nome: gatilhoEscolhido.value?.nome,
        ativo: form.value.ativo,
        ...(ehLocal ? { destino_local: form.value.destino } : { endereco: form.value.endereco }),
    };
    ocupado.value = 'novo';
    try {
        await store.criarWebhook(payload);
        criando.value = false;
        toast.success(`Webhook "${payload.nome}" criado no CV.`);
    } catch (err) {
        toast.error(err?.message || 'Não foi possível criar o webhook no CV.');
    } finally {
        ocupado.value = null;
    }
}

async function apagar(w) {
    const alvo = w.do_office ? 'o Office' : 'um sistema de terceiro';
    if (!await pedirConfirmacao({
        title: `Apagar o webhook "${w.nome}" do CV?`,
        // A consequência precisa dizer o que PARA de acontecer, não "tem certeza".
        consequence: `O CV deixa de avisar ${alvo} quando ${(w.gatilho_nome || 'o gatilho').toLowerCase()}`
            + ` em ${w.funcionalidade_nome}`
            + (w.empreendimentos.length ? `, nos ${w.empreendimentos.length} empreendimentos configurados.` : '.'),
        hint: 'A API do CV não desfaz: recriar exige cadastrar de novo, e o webhook recebe um id novo.',
        confirmLabel: 'Apagar do CV',
    })) return;

    ocupado.value = w.idwebhook;
    try {
        await store.apagarWebhook(w.idwebhook);
        toast.success('Webhook apagado do CV.');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível apagar.');
    } finally {
        ocupado.value = null;
    }
}

async function padronizar(w) {
    if (!await pedirConfirmacao({
        title: `Renomear para "${w.nome_padrao}"?`,
        consequence: 'A API do CV não tem edição, então o webhook é recriado: ele recebe um id novo'
            + (w.empreendimentos.length ? ` e os ${w.empreendimentos.length} empreendimentos são recadastrados.` : '.'),
        hint: 'O novo é criado antes de o antigo ser apagado - se algo falhar no meio, o atual continua funcionando.',
        tone: 'accent',
        confirmLabel: 'Renomear',
    })) return;

    ocupado.value = w.idwebhook;
    try {
        await store.padronizarNome(w.idwebhook);
        toast.success('Nome padronizado.');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível renomear.');
    } finally {
        ocupado.value = null;
    }
}

async function alternarNoCv(w) {
    if (!await pedirConfirmacao({
        title: w.ativo ? `Desativar "${w.nome}" no CV?` : `Ativar "${w.nome}" no CV?`,
        consequence: w.ativo
            ? `O CV para de avisar quando ${(w.gatilho_nome || 'o gatilho').toLowerCase()} em ${w.funcionalidade_nome}.`
            : `O CV passa a avisar o Office quando ${(w.gatilho_nome || 'o gatilho').toLowerCase()} em ${w.funcionalidade_nome}.`,
        hint: 'A API do CV não tem edição, então o webhook é recriado e recebe um id novo. Endereço, gatilho e empreendimentos são mantidos.',
        tone: w.ativo ? 'danger' : 'accent',
        confirmLabel: w.ativo ? 'Desativar' : 'Ativar',
    })) return;
    ocupado.value = w.idwebhook;
    try {
        await store.alternarAtivoNoCv(w.idwebhook);
        toast.success(w.ativo ? 'Webhook desativado no CV.' : 'Webhook ativado no CV.');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível alterar.');
    } finally {
        ocupado.value = null;
    }
}

async function alternarEndpoint(e, campo) {
    ocupado.value = e.funcionalidade;
    try {
        await store.salvarEndpoint(e.funcionalidade, { [campo]: !e[campo] });
        toast.success('Configuração salva.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao salvar.');
    } finally {
        ocupado.value = null;
    }
}

async function regenerar(e) {
    if (!await pedirConfirmacao({
        title: `Gerar um token novo para ${e.funcionalidade}?`,
        consequence: 'A URL atual para de valer na hora. Todo webhook do CV que aponta para ela deixa de ser aceito'
            + ' até você cadastrar a URL nova.',
        confirmLabel: 'Gerar token novo',
    })) return;
    ocupado.value = e.funcionalidade;
    try {
        await store.regenerarToken(e.funcionalidade);
        toast.success('Token novo gerado. Atualize a URL nos webhooks do CV.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao regenerar.');
    } finally {
        ocupado.value = null;
    }
}

async function copiar(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        toast.success('URL copiada.');
    } catch {
        toast.error('Não foi possível copiar. Selecione a URL e copie à mão.');
    }
}

// ── Histórico ────────────────────────────────────────────────────────────────
const TODAS = 'todas';
const filtroOrigem = ref(TODAS);
const filtroStatus = ref(TODAS);
const semFiltro = (v) => (v === TODAS ? '' : v);

const STATUS = {
    ok:        { label: 'ok', variant: 'success' },
    erro:      { label: 'erro', variant: 'danger' },
    escuta:    { label: 'escuta', variant: 'info' },
    ignorado:  { label: 'ignorado', variant: 'neutral' },
    duplicado: { label: 'coalescido', variant: 'neutral' },
    parcial:   { label: 'parcial', variant: 'warning' },
};
const OPCOES_ORIGEM = [
    { value: TODAS, label: 'Toda origem' },
    { value: 'webhook', label: 'Webhook' },
    { value: 'cron', label: 'Cron' },
    { value: 'manual', label: 'Manual' },
];
const OPCOES_STATUS = [
    { value: TODAS, label: 'Todo status' },
    ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })),
];

function carregarEventos() {
    store.carregarEventos({
        origem: semFiltro(filtroOrigem.value),
        status: semFiltro(filtroStatus.value),
        limite: 50,
    }).catch(err => toast.error(err?.message || 'Não foi possível carregar o histórico.'));
}

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'nunca';

const duracao = (ms) => {
    if (ms == null) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}min`;
};

const doOffice = computed(() => store.webhooks.filter(w => w.do_office));
const deTerceiros = computed(() => store.webhooks.filter(w => !w.do_office));

onMounted(() => {
    store.carregar().catch(() => {});
    carregarEventos();
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Integrações"
            subtitle="Os webhooks cadastrados no CV e os endpoints que recebem no Office"
            icon-img="/CVLogo.png"
        >
            <template #actions>
                <PageHelp
                    storage-key="cv-integracoes"
                    title="Como usar a tela de Integrações"
                    intro="Webhook é o CV avisando o Office na hora em que algo muda, em vez de o Office perguntar de tempos em tempos. Esta tela mostra os dois lados: o que o CV tem cadastrado e o que o Office aceita receber."
                    :steps="[
                        { title: 'Ligar uma entrada nova', text: 'Ligue primeiro o endpoint do Office na seção de baixo, copie a URL, e então use Novo webhook para cadastrá-la no CV escolhendo a funcionalidade e o gatilho.' },
                        { title: 'Qual gatilho escolher', text: 'Alteração de situação cobre qualquer mudança de etapa com um cadastro só. Os outros gatilhos são um por situação e servem para automações específicas, como o cancelamento e o boleto do ato.' },
                        { title: 'Modo escuta', text: 'Endpoint ligado mas sem Sincronizar de verdade apenas guarda o que o CV mandou, sem alterar nada. Serve para conferir o formato do aviso antes de deixar o Office agir sobre ele.' },
                        { title: 'Nomes padronizados', text: 'O padrão é office-funcionalidade-gatilho. Como a API do CV não tem edição, renomear recria o webhook com um id novo - por isso é uma ação explícita e nunca automática.' },
                        { title: 'Histórico', text: 'Registra todas as execuções, de webhook, de cron e de disparo manual. É por ele que se acompanha se o CV está mesmo entregando os avisos.' },
                    ]"
                    :tips="[
                        'Webhook não substitui os crons: um aviso pode se perder numa queda ou num deploy, e é o cron que depois reconcilia.',
                        'Webhooks de terceiros (Webropay) aparecem aqui para você enxergar tudo que o CV dispara, mas cuidado ao apagá-los - não são do Office.',
                    ]"
                />
                <Button variant="primary" icon="fas fa-plus" @click="abrirCriacao">Novo webhook</Button>
            </template>
        </PageHeader>

        <div v-if="store.erro" class="rounded-xl border border-line bg-surface-sunken p-4 text-sm text-data-neg">
            <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ store.erro }}
        </div>

        <Skeleton v-else-if="store.carregando && !store.webhooks.length" variant="row" :lines="5" />

        <div v-else class="space-y-4">
            <!-- ── Webhooks do Office ───────────────────────────────────── -->
            <Panel title="Webhooks do Office no CV" icon="fas fa-bolt"
                :subtitle="`${doOffice.length} cadastrado(s) apontando para o Office`">
                <EmptyState v-if="!doOffice.length" icon="fas fa-bolt"
                    title="Nenhum webhook do Office cadastrado no CV"
                    description="Use Novo webhook para o CV passar a avisar o Office na hora." />

                <div v-else class="space-y-2.5">
                    <div v-for="w in doOffice" :key="w.idwebhook"
                        class="rounded-xl border border-line bg-surface-sunken p-3.5">
                        <div class="flex flex-wrap items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="font-medium text-ink text-sm break-all">
                                    {{ w.nome || '(sem nome)' }}
                                    <Badge :variant="w.ativo ? 'success' : 'neutral'" size="sm" class="ml-1.5">
                                        {{ w.ativo ? 'ativo no CV' : 'inativo no CV' }}
                                    </Badge>
                                    <Badge v-if="w.fora_do_padrao" variant="warning" size="sm" class="ml-1">
                                        fora do padrão
                                    </Badge>
                                </p>
                                <p class="text-xs text-ink-muted mt-0.5">
                                    {{ w.funcionalidade_nome }} · {{ w.gatilho_nome || `gatilho ${w.gatilho}` }}
                                    <template v-if="w.empreendimentos.length">
                                        · {{ w.empreendimentos.length }} empreendimento(s)
                                    </template>
                                    <template v-else> · todos os empreendimentos</template>
                                    <template v-if="w.forma_envio"> · envia {{ w.forma_envio }}</template>
                                </p>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <Button variant="ghost" size="sm"
                                    :icon="w.ativo ? 'fas fa-pause' : 'fas fa-play'"
                                    :loading="ocupado === w.idwebhook"
                                    v-tippy="w.ativo ? 'Desativar no CV (recria o webhook)' : 'Ativar no CV (recria o webhook)'"
                                    @click="alternarNoCv(w)">{{ w.ativo ? 'Desativar' : 'Ativar' }}</Button>
                                <Button v-if="w.fora_do_padrao" variant="ghost" size="sm" icon="fas fa-wand-magic-sparkles"
                                    :loading="ocupado === w.idwebhook"
                                    v-tippy="`Renomear para ${w.nome_padrao}`"
                                    @click="padronizar(w)">Padronizar</Button>
                                <Button variant="ghost" size="sm" icon="fas fa-trash"
                                    :loading="ocupado === w.idwebhook" @click="apagar(w)">Apagar</Button>
                            </div>
                        </div>

                        <code class="mt-2 block truncate rounded-lg border border-line bg-surface px-2.5 py-2
                                     text-[11px] text-ink-muted">{{ w.endereco }}</code>

                        <!-- O cruzamento dos dois lados: é aqui que aparece o CV
                             chamando um endereço que o Office não reconhece. -->
                        <p v-if="w.destino_desconhecido" class="mt-1.5 text-xs text-data-warn">
                            <i class="fas fa-circle-question mr-1"></i>
                            Aponta para o Office, mas não corresponde a nenhum endpoint de dados desta tela.
                            É uma automação com rota própria (cancelamento, boleto, contratos) ou um token
                            que foi regenerado depois deste cadastro.
                        </p>
                        <p v-else-if="w.endpoint_local && !w.endpoint_ligado" class="mt-1.5 text-xs text-data-neg">
                            <i class="fas fa-plug-circle-xmark mr-1"></i>
                            O CV está mandando, mas o endpoint "{{ w.endpoint_local }}" está DESLIGADO no Office -
                            os avisos estão sendo descartados.
                        </p>
                        <p v-else-if="w.endpoint_local && !w.endpoint_processa" class="mt-1.5 text-xs text-data-warn">
                            <i class="fas fa-ear-listen mr-1"></i>
                            Recebendo em modo escuta: o Office guarda o aviso e não altera nada.
                        </p>
                        <p v-else-if="w.endpoint_local" class="mt-1.5 text-xs text-data-pos">
                            <i class="fas fa-plug-circle-check mr-1"></i>
                            Ponta a ponta: o CV manda e o Office sincroniza.
                        </p>
                    </div>
                </div>
            </Panel>

            <!-- ── Endpoints do Office ──────────────────────────────────── -->
            <Panel title="Endpoints do Office" icon="fas fa-inbox"
                subtitle="O que o Office aceita receber, e a URL com token para cadastrar no CV">
                <div class="space-y-2.5">
                    <div v-for="e in store.endpoints" :key="e.funcionalidade"
                        class="rounded-xl border border-line bg-surface-sunken p-3.5">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="font-medium text-ink text-sm capitalize">
                                    {{ e.funcionalidade }}
                                    <Badge v-if="!e.active" variant="neutral" size="sm" class="ml-1.5">desligado</Badge>
                                    <Badge v-else-if="!e.processa" variant="info" size="sm" class="ml-1.5">modo escuta</Badge>
                                    <Badge v-else variant="success" size="sm" class="ml-1.5">sincronizando</Badge>
                                </p>
                                <p class="text-xs text-ink-muted mt-0.5">{{ e.descricao }}</p>
                            </div>
                            <Switch :model-value="e.active" :disabled="ocupado === e.funcionalidade"
                                @update:model-value="alternarEndpoint(e, 'active')" />
                        </div>

                        <div class="mt-2.5 flex flex-wrap items-center gap-2">
                            <code class="flex-1 min-w-0 truncate rounded-lg border border-line bg-surface
                                         px-2.5 py-2 text-[11px] text-ink-muted">{{ e.url }}</code>
                            <Button variant="outline" size="sm" icon="fas fa-copy" @click="copiar(e.url)">Copiar</Button>
                        </div>

                        <div class="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            <Badge v-if="e.last_status" :variant="(STATUS[e.last_status] || {}).variant || 'neutral'" size="sm">
                                {{ (STATUS[e.last_status] || {}).label || e.last_status }}
                            </Badge>
                            <span class="text-ink-muted">
                                <i class="fas fa-clock-rotate-left mr-1 text-ink-subtle"></i>{{ fmt(e.last_event_at) }}
                                · {{ e.eventos_recebidos }} evento(s)
                            </span>
                        </div>

                        <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                            <label class="flex items-center gap-2 text-xs text-ink-muted">
                                <Switch :model-value="e.processa" size="sm" :disabled="ocupado === e.funcionalidade"
                                    @update:model-value="alternarEndpoint(e, 'processa')" />
                                Sincronizar de verdade
                            </label>
                            <span class="text-xs text-ink-subtle">Desligado = guarda o aviso e não altera nada.</span>
                            <Button variant="ghost" size="sm" icon="fas fa-rotate"
                                :loading="ocupado === e.funcionalidade" @click="regenerar(e)">Novo token</Button>
                        </div>
                    </div>
                </div>
            </Panel>

            <!-- ── Terceiros ────────────────────────────────────────────── -->
            <Panel v-if="deTerceiros.length" title="Webhooks de terceiros" icon="fas fa-arrow-up-right-from-square"
                :subtitle="`${deTerceiros.length} cadastrado(s) no CV apontando para fora do Office`">
                <div class="space-y-2">
                    <div v-for="w in deTerceiros" :key="w.idwebhook"
                        class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-sm text-ink font-medium">{{ w.nome || '(sem nome)' }}</span>
                            <Badge :variant="w.ativo ? 'success' : 'neutral'" size="sm">
                                {{ w.ativo ? 'ativo' : 'inativo' }}
                            </Badge>
                            <span class="text-xs text-ink-muted">
                                {{ w.funcionalidade_nome }} · {{ w.gatilho_nome || `gatilho ${w.gatilho}` }}
                            </span>
                            <Button variant="ghost" size="sm" icon="fas fa-trash" class="ml-auto"
                                :loading="ocupado === w.idwebhook" @click="apagar(w)">Apagar</Button>
                        </div>
                        <code class="mt-1 block truncate text-[11px] text-ink-subtle">{{ w.endereco }}</code>
                    </div>
                </div>
                <template #footer>
                    <p class="text-xs text-ink-muted">
                        Não são do Office. Aparecem aqui para você enxergar tudo que o CV dispara - apagar um
                        deles quebra a integração de quem o cadastrou.
                    </p>
                </template>
            </Panel>

            <!-- ── Histórico ────────────────────────────────────────────── -->
            <Panel title="Histórico da integração" icon="fas fa-list-timeline"
                subtitle="Todas as execuções: webhook, cron e disparo manual, de todas as funcionalidades"
                :loading="store.carregandoEventos && !store.eventos.length" loading-variant="row">
                <div class="flex flex-wrap gap-2 mb-3">
                    <Select v-model="filtroOrigem" :options="OPCOES_ORIGEM" size="sm"
                        class="min-w-[130px]" @change="carregarEventos" />
                    <Select v-model="filtroStatus" :options="OPCOES_STATUS" size="sm"
                        class="min-w-[130px]" @change="carregarEventos" />
                    <Button variant="outline" size="sm" icon="fas fa-rotate" @click="carregarEventos">Atualizar</Button>
                </div>

                <EmptyState v-if="!store.eventos.length && !store.carregandoEventos"
                    icon="fas fa-list-timeline" title="Nada registrado ainda"
                    description="Assim que um cron rodar ou o CV chamar o webhook, as execuções aparecem aqui." />

                <div v-else class="space-y-1.5">
                    <div v-for="ev in store.eventos" :key="ev.id"
                        class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
                        <div class="flex flex-wrap items-center gap-2">
                            <Badge :variant="(STATUS[ev.status] || {}).variant || 'neutral'" size="sm">
                                {{ (STATUS[ev.status] || {}).label || ev.status }}
                            </Badge>
                            <span class="text-xs text-ink font-medium capitalize">{{ ev.funcionalidade }}</span>
                            <span class="text-xs text-ink-muted">{{ ev.origem }}</span>
                            <span v-if="ev.entidade_id" class="text-xs text-ink-muted">#{{ ev.entidade_id }}</span>
                            <span class="text-xs text-ink-subtle ml-auto">
                                {{ fmt(ev.created_at) }}
                                <template v-if="ev.duracao_ms != null"> · {{ duracao(ev.duracao_ms) }}</template>
                            </span>
                        </div>
                        <p v-if="ev.mensagem" class="mt-1 text-xs"
                            :class="ev.status === 'erro' ? 'text-data-neg' : 'text-ink-muted'">{{ ev.mensagem }}</p>
                        <template v-if="ev.payload">
                            <button type="button"
                                class="mt-1 text-xs text-ink-subtle hover:text-ink underline underline-offset-2"
                                @click="detalhe = detalhe === ev.id ? null : ev.id">
                                {{ detalhe === ev.id ? 'Ocultar' : 'Ver' }} o que o CV enviou
                            </button>
                            <pre v-if="detalhe === ev.id"
                                class="mt-1.5 overflow-x-auto rounded-lg border border-line bg-surface p-2.5
                                       text-[11px] text-ink-muted">{{ JSON.stringify(ev.payload, null, 2) }}</pre>
                        </template>
                    </div>
                </div>

                <template #footer>
                    <p class="text-xs text-ink-muted">
                        Mostrando {{ store.eventos.length }} de {{ store.eventosTotal }}. Retenção padrão de 30 dias.
                    </p>
                </template>
            </Panel>
        </div>

        <!-- ── Criação ──────────────────────────────────────────────────── -->
        <Modal :open="criando" title="Novo webhook no CV"
            subtitle="O CV passa a avisar este endereço quando o gatilho acontecer"
            size="lg" @close="criando = false">
            <div class="space-y-3">
                <Select v-model="form.funcionalidade" :options="funcDoCatalogo"
                    label="Funcionalidade" placeholder="Escolha a funcionalidade do CV"
                    @change="form.gatilho = ''" />

                <Select v-if="form.funcionalidade" v-model="form.gatilho" :options="gatilhosDaFunc"
                    label="Gatilho" placeholder="Escolha o que dispara o aviso"
                    hint="Alteração de situação cobre qualquer mudança de etapa. Os demais são um por situação." />

                <Select v-if="form.gatilho" v-model="form.destino" :options="opcoesDestino"
                    label="Destino" placeholder="Para onde o CV manda"
                    hint="Escolhendo um endpoint do Office, a URL com token é montada automaticamente." />

                <Input v-if="form.destino === 'livre'" v-model="form.endereco"
                    label="Endereço" placeholder="https://..." />

                <Input v-if="form.destino" v-model="form.nome" label="Nome no CV"
                    :placeholder="nomeSugerido"
                    :hint="`Padrão do sistema: ${nomeSugerido || 'escolha funcionalidade e gatilho'}. Em branco, usa o padrão.`" />

                <label v-if="form.destino" class="flex items-center gap-2 text-sm text-ink-muted">
                    <Switch v-model="form.ativo" size="sm" />
                    Já criar ativo no CV
                </label>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button variant="ghost" @click="criando = false">Cancelar</Button>
                    <Button variant="primary" icon="fas fa-check"
                        :disabled="!form.funcionalidade || !form.gatilho || !form.destino
                                   || (form.destino === 'livre' && !form.endereco)"
                        :loading="ocupado === 'novo'" @click="salvarNovo">Criar no CV</Button>
                </div>
            </template>
        </Modal>
    </PageContainer>
</template>
