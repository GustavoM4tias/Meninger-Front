<script setup>
// Plano de Eventos - lista dos planos mensais.
//
// O recorte segue o padrão das Fichas Comerciais: a lista é POR EMPREENDIMENTO
// e o mês de referência é um filtro. Cada card mostra o plano daquele
// empreendimento no mês selecionado, e o histórico dos outros meses fica no
// próprio card.
//
// Uma tela só para os três papéis: o gestor vê os empreendimentos dele, quem
// valida vê a fila aguardando decisão. O papel vem do backend (/permissions).

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useEventPlanStore, PLAN_STATUS_LABEL } from '@/stores/Comercial/EventPlan/eventPlanStore';
import { getSelectableEnterprises } from '@/utils/Event/apiEvents';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import ConsolidatedTab from './components/ConsolidatedTab.vue';

const store = useEventPlanStore();
const router = useRouter();
const toast = useToast();

const tab = ref('meus');
const newOpen = ref(false);
const enterprises = ref([]);
const form = ref({ idempreendimento: '', reference_month: '' });

// ── Filtros (padrão da Ficha Comercial: busca + mês + status) ────────────────
const search = ref('');
const filterMonth = ref('');
const filterStatus = ref('');

const STATUS_VARIANT = {
    draft: 'neutral',
    pending_comercial: 'warning',
    pending_marketing: 'info',
    returned: 'danger',
    approved: 'success',
    closed: 'neutral',
};

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const ym = (v) => String(v || '').slice(0, 7);

function monthLabel(value) {
    const [year, month] = ym(value).split('-');
    const label = MESES[Number(month) - 1];
    return label ? `${label} de ${year}` : String(value || '');
}

function currentYm() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// O ciclo é sempre planejar o mês que vem.
function nextYm() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

// ── Agrupamento por empreendimento ──────────────────────────────────────────

const grupos = computed(() => {
    const map = new Map();
    for (const plan of store.plans) {
        const key = plan.idempreendimento;
        if (!map.has(key)) {
            map.set(key, {
                idempreendimento: key,
                nome: plan.enterprise_name || `Empreendimento ${key}`,
                planos: [],
            });
        }
        map.get(key).planos.push(plan);
    }
    for (const g of map.values()) {
        g.planos.sort((a, b) => String(b.reference_month).localeCompare(String(a.reference_month)));
    }
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome));
});

// Meses que existem, mais recente primeiro. Alimenta o seletor.
const mesesDisponiveis = computed(() => {
    const set = new Set(store.plans.map(p => ym(p.reference_month)).filter(Boolean));
    // O mês do próximo ciclo entra mesmo sem plano ainda, para o gestor
    // conseguir filtrar por ele assim que a janela abrir.
    set.add(nextYm());
    return [...set].sort().reverse();
});

const monthOptions = computed(() =>
    mesesDisponiveis.value.map(m => ({ value: m, label: monthLabel(`${m}-01`) }))
);

const statusOptions = [
    { value: '', label: 'Todos os status' },
    ...Object.entries(PLAN_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

// Para cada empreendimento, o plano do mês selecionado. Sem plano no mês, o
// empreendimento não aparece — igual à Ficha.
const gruposDoMes = computed(() =>
    grupos.value
        .map(g => ({ ...g, plano: g.planos.find(p => ym(p.reference_month) === filterMonth.value) }))
        .filter(g => g.plano)
);

const gruposFiltrados = computed(() => {
    let r = gruposDoMes.value;
    if (filterStatus.value) r = r.filter(g => g.plano.status === filterStatus.value);
    const s = search.value.trim().toLowerCase();
    if (s) r = r.filter(g => g.nome.toLowerCase().includes(s));
    return r;
});

// ── Aba "aguardando você" ───────────────────────────────────────────────────

const awaitingMe = computed(() => {
    const stages = store.permissions.decidableStages || [];
    return store.plans.filter(p =>
        (p.status === 'pending_comercial' && stages.includes('COMERCIAL'))
        || (p.status === 'pending_marketing' && stages.includes('MARKETING'))
    );
});

const tabOptions = computed(() => {
    const options = [{ value: 'meus', label: 'Planos', icon: 'fas fa-calendar-days', count: gruposFiltrados.value.length }];
    if (store.permissions.canDecide) {
        options.push({ value: 'decidir', label: 'Aguardando você', icon: 'fas fa-gavel', count: awaitingMe.value.length });
    }
    options.push({ value: 'consolidado', label: 'Consolidado', icon: 'fas fa-cart-shopping' });
    return options;
});

const enterpriseOptions = computed(() =>
    enterprises.value.map(e => ({ value: String(e.idempreendimento), label: e.nome }))
);

function abrir(planId) {
    router.push(`/comercial/plano-eventos/${planId}`);
}

async function criarPlano() {
    if (!form.value.idempreendimento || !form.value.reference_month) {
        toast.warning('Escolha o empreendimento e o mês.');
        return;
    }
    try {
        const plan = await store.createPlan({
            idempreendimento: Number(form.value.idempreendimento),
            reference_month: form.value.reference_month,
        });
        newOpen.value = false;
        router.push(`/comercial/plano-eventos/${plan.id}`);
    } catch (e) {
        if (e?.status === 409 && e?.payload?.id) {
            newOpen.value = false;
            toast.info('Este empreendimento já tem plano neste mês. Abrindo o plano existente.');
            router.push(`/comercial/plano-eventos/${e.payload.id}`);
            return;
        }
        toast.error(e?.message || 'Não foi possível criar o plano.');
    }
}

onMounted(async () => {
    form.value.reference_month = nextYm();
    await Promise.all([
        store.loadPermissions(),
        store.loadPlans(),
        getSelectableEnterprises().then(list => { enterprises.value = list || []; }).catch(() => {}),
    ]);
    // Abre no mês corrente se houver plano; senão, no mês mais recente que existe.
    const disponiveis = mesesDisponiveis.value;
    filterMonth.value = disponiveis.includes(currentYm()) ? currentYm() : (disponiveis[0] || currentYm());
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Plano de Eventos"
            subtitle="Proposta mensal de eventos por empreendimento: o que fazer, quando, com quais itens e quanto custa"
            icon="fas fa-calendar-check"
        >
            <template #actions>
                <PageHelp
                    storage-key="comercial-plano-eventos"
                    title="Como usar o Plano de Eventos"
                    intro="Todo mês você propõe os eventos do empreendimento que gerencia. O Comercial valida, o Marketing aceita, e o que for aprovado entra na agenda já programado."
                    :steps="[
                        { title: 'A janela abre sozinha', text: 'Na última semana de cada mês o plano do mês seguinte é aberto automaticamente e você recebe um e-mail. Não precisa criar nada na mão.' },
                        { title: 'Cadastre os eventos', text: 'Um evento por ação: café da manhã, corrida, pedágio. Informe a data, para que serve e a prioridade. A prioridade ajuda quem decide a escolher se o mês estourar.' },
                        { title: 'Liste os itens de cada evento', text: 'Cada custo é um item: café da padaria, brinde, panfleto. Marque se o item é obrigatório (sem ele o evento não acontece) e se o valor já é orçamento fechado ou ainda é estimativa.' },
                        { title: 'Envie quando quiser', text: 'Pode enviar a qualquer momento dentro da janela. Se não enviar, no último dia do mês o plano vai automaticamente para a validação do Comercial, do jeito que estiver.' },
                        { title: 'Acompanhe as decisões', text: 'Você vê o que foi aprovado, o que foi cortado e o motivo de cada corte. Nada some: evento reprovado fica registrado com a justificativa.' },
                    ]"
                    :tips="[
                        'A janela é a última semana do mês anterior. O plano de setembro abre por volta do dia 25 de agosto e fecha em 31 de agosto.',
                        'Item marcado como obrigatório não é reprovado sozinho: quem decide precisa reprovar o evento inteiro ou reclassificar o item.',
                        'Depois do plano aprovado ainda dá para incluir um evento extra, que corre sozinho sem reabrir o que já foi decidido.',
                    ]"
                />
                <Button
                    v-if="store.permissions.isAdmin"
                    variant="ghost"
                    icon="fas fa-sliders"
                    v-tippy="'Configurações do módulo'"
                    @click="router.push('/comercial/plano-eventos/settings')"
                />
                <Button variant="primary" icon="fas fa-plus" @click="newOpen = true">Novo plano</Button>
            </template>
        </PageHeader>

        <div class="mb-4">
            <SegmentedControl v-model="tab" :options="tabOptions" block />
        </div>

        <ConsolidatedTab v-if="tab === 'consolidado'" />

        <template v-else>
            <!-- Filtros: mesmo recorte da Ficha Comercial -->
            <Surface v-if="tab === 'meus'" class="mb-4" padding="sm">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_13rem_13rem]">
                    <Input v-model="search" placeholder="Buscar empreendimento..." icon-left="fas fa-magnifying-glass" />
                    <Select v-model="filterMonth" :options="monthOptions" placeholder="Mês de referência" />
                    <Select v-model="filterStatus" :options="statusOptions" />
                </div>
            </Surface>

            <div v-if="store.loading" class="flex justify-center py-16"><Spinner /></div>

            <!-- Aba: aguardando decisão -->
            <template v-else-if="tab === 'decidir'">
                <EmptyState
                    v-if="!awaitingMe.length"
                    icon="far fa-circle-check"
                    title="Nada aguardando você"
                    description="Quando um gestor enviar o plano do mês, ele aparece aqui para você decidir."
                />
                <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Surface
                        v-for="plan in awaitingMe"
                        :key="plan.id"
                        interactive
                        class="cursor-pointer"
                        @click="abrir(plan.id)"
                    >
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="truncate font-semibold text-ink">{{ plan.enterprise_name }}</p>
                                <p class="text-sm text-ink-muted">{{ monthLabel(plan.reference_month) }}</p>
                            </div>
                            <Badge :variant="STATUS_VARIANT[plan.status]" size="sm">
                                {{ PLAN_STATUS_LABEL[plan.status] }}
                            </Badge>
                        </div>
                        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                            <span>{{ plan.totals?.events_proposed || 0 }} evento(s)</span>
                            <span>Proposto <strong class="text-ink">{{ money(plan.totals?.proposed) }}</strong></span>
                        </div>
                    </Surface>
                </div>
            </template>

            <!-- Aba: planos por empreendimento -->
            <template v-else>
                <EmptyState
                    v-if="!gruposFiltrados.length"
                    icon="far fa-calendar"
                    title="Nenhum plano neste mês"
                    description="Troque o mês no filtro, ou clique em Novo plano para montar a proposta."
                />

                <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Surface
                        v-for="grupo in gruposFiltrados"
                        :key="grupo.idempreendimento"
                        interactive
                        class="cursor-pointer"
                        @click="abrir(grupo.plano.id)"
                    >
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="truncate font-semibold text-ink">{{ grupo.nome }}</p>
                                <p class="text-sm text-ink-muted">{{ monthLabel(grupo.plano.reference_month) }}</p>
                            </div>
                            <Badge :variant="STATUS_VARIANT[grupo.plano.status] || 'neutral'" size="sm">
                                {{ PLAN_STATUS_LABEL[grupo.plano.status] || grupo.plano.status }}
                            </Badge>
                        </div>

                        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span class="text-ink-muted">
                                <i class="fas fa-calendar-day mr-1 text-ink-subtle"></i>
                                {{ grupo.plano.totals?.events_proposed || 0 }} evento(s)
                            </span>
                            <span class="text-ink-muted">
                                Proposto <strong class="text-ink">{{ money(grupo.plano.totals?.proposed) }}</strong>
                            </span>
                            <span v-if="grupo.plano.totals?.approved" class="text-emerald-600 dark:text-emerald-400">
                                Aprovado <strong>{{ money(grupo.plano.totals?.approved) }}</strong>
                            </span>
                        </div>

                        <p v-if="grupo.plano.owner_unresolved" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            <i class="fas fa-triangle-exclamation mr-1"></i>
                            Sem gestor responsável na ficha comercial deste empreendimento.
                        </p>

                        <!-- Outros meses do mesmo empreendimento -->
                        <div v-if="grupo.planos.length > 1" class="mt-3 border-t border-line pt-2">
                            <p class="mb-1 text-xs text-ink-subtle">Outros meses</p>
                            <div class="flex flex-wrap gap-1.5">
                                <button
                                    v-for="outro in grupo.planos.filter(p => p.id !== grupo.plano.id).slice(0, 6)"
                                    :key="outro.id"
                                    class="rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-muted transition hover:border-accent hover:text-accent"
                                    @click.stop="abrir(outro.id)"
                                >
                                    {{ String(outro.reference_month).slice(5, 7) }}/{{ String(outro.reference_month).slice(2, 4) }}
                                </button>
                            </div>
                        </div>
                    </Surface>
                </div>
            </template>
        </template>

        <Modal :open="newOpen" title="Novo plano do mês" size="sm" @close="newOpen = false">
            <div class="space-y-4">
                <Select
                    v-model="form.idempreendimento"
                    label="Empreendimento"
                    :options="enterpriseOptions"
                    placeholder="Escolha o empreendimento"
                    required
                />
                <Input
                    v-model="form.reference_month"
                    type="month"
                    label="Mês de referência"
                    hint="O plano cobre o mês inteiro. O padrão é o mês que vem."
                    required
                />
                <p class="rounded-lg border border-line bg-surface-sunken p-2.5 text-sm text-ink-muted">
                    Normalmente não é preciso criar na mão: o plano do mês seguinte abre sozinho na última semana do mês.
                    O gestor responsável é lido da Ficha Comercial do empreendimento.
                </p>
            </div>
            <template #footer>
                <Button variant="ghost" @click="newOpen = false">Cancelar</Button>
                <Button variant="primary" :loading="store.saving" @click="criarPlano">Criar plano</Button>
            </template>
        </Modal>
    </PageContainer>
</template>
