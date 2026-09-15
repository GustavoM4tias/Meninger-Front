<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-chart-line"
                :eyebrow="store.cons ? `Visão consolidada · ${store.cons.n} empreendimentos` : 'Marketing'"
                subtitle="Onde o investimento de marketing está indo e se estamos dentro do orçamento aprovado.">
                <template #title>
                    Projeção de Investimentos
                    <Favorite :router="'/marketing/projecao-investimentos'" :section="'Projeção de Investimentos'" />
                </template>
                <template #actions>
                    <PageHelp storage-key="marketing-projecao-investimentos" title="Como usar a Projeção de Investimentos"
                        intro="Esta tela lê a planilha PROJEÇÃO X INVESTIMENTO MKT direto do SharePoint: cada aba da planilha é um empreendimento aqui. Ela se atualiza sozinha ao abrir, sem ninguém precisar subir arquivo."
                        :steps="[
                            { title: 'Leia os dois números do topo', text: 'Valor realizado é o que foi pago no mês escolhido; valor liberado é o que estava planejado para ele. Troque o mês no seletor ao lado.' },
                            { title: 'Compare com o passado', text: 'O botão 2024-2025 mostra o acumulado que a planilha registra antes do exercício atual e quanto da viabilidade total ele já consumiu.' },
                            { title: 'Encontre quem precisa de atenção', text: 'Na lista, ordene por % viab. consumida clicando no cabeçalho. Amarelo é acima da régua de atenção; vermelho, acima do teto.' },
                            { title: 'Abra o empreendimento', text: 'Clique numa linha para ver o mês a mês, o liberado × utilizado e os itens que compõem o valor.' },
                            { title: 'Forçar uma releitura', text: 'Acabou de salvar a planilha? Clique em Atualizar: o Office confere o arquivo no SharePoint na hora.' },
                        ]"
                        :tips="[
                            'Status = MKT investido desde o lançamento ÷ viabilidade de MKT aprovada. A régua (atenção e estouro) é configurável pelo administrador.',
                            'Meses fechados são os anteriores ao mês atual; o mês corrente aparece à parte como Atual e Liberado.',
                            'Se um empreendimento sumir da lista, confira se a aba dele na planilha ainda tem as linhas VIABILIDADE MKT, TOTAL REALIZADO e o cabeçalho com as datas dos meses.',
                        ]" />
                    <Button variant="secondary" size="sm" icon="fas fa-rotate" :loading="store.refreshing"
                        title="Confere no SharePoint se a planilha mudou e relê na hora" @click="atualizar">
                        Atualizar
                    </Button>
                    <Button v-if="canConfigure" variant="ghost" size="sm" icon="fas fa-sliders" @click="configOpen = true">
                        Configurar
                    </Button>
                </template>
            </PageHeader>

            <Surface v-if="store.error" variant="raised" padding="sm" class="mb-5 border-data-neg/30 bg-data-neg/10">
                <div class="text-sm text-data-neg flex items-center gap-2">
                    <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                </div>
            </Surface>
            <Surface v-if="store.meta?.problemas?.length" variant="raised" padding="sm" class="mb-5 border-data-warn/30 bg-data-warn/10">
                <div class="text-sm text-data-warn flex items-start gap-2">
                    <i class="fas fa-triangle-exclamation mt-0.5"></i>
                    <div>
                        <b>{{ store.meta.problemas.length }} aba(s) da planilha sem as linhas esperadas:</b>
                        <span v-for="p in store.meta.problemas" :key="p.aba" class="block text-xs">
                            {{ p.aba }}: falta {{ p.faltando.join(', ') }}
                        </span>
                    </div>
                </div>
            </Surface>

            <!-- Fonte e frescor: de onde vem o número e de quando ele é. -->
            <div v-if="store.meta" class="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4 text-xs text-ink-muted">
                <Badge variant="accent" outlined size="sm">Realizado até {{ mesFechado }}/{{ store.exercicio }}</Badge>
                <span class="inline-flex items-center gap-1.5 min-w-0">
                    <i class="fas fa-file-excel text-data-pos"></i>
                    <a v-if="store.meta.webUrl" :href="store.meta.webUrl" target="_blank" rel="noopener"
                        class="truncate max-w-[60vw] sm:max-w-md hover:text-accent underline-offset-2 hover:underline"
                        :title="store.meta.fileName">{{ store.meta.fileName }}</a>
                    <span v-else class="truncate">{{ store.meta.fileName }}</span>
                </span>
                <span :title="`Planilha salva em ${fmtDateTime(store.meta.lastModified)} · lida pelo Office em ${fmtDateTime(store.meta.syncedAt)}`">
                    <i class="far fa-clock mr-1"></i>planilha salva {{ fmtRelative(store.meta.lastModified) }} · lida {{ fmtRelative(store.meta.syncedAt) }}
                </span>
            </div>

            <!-- Período e mês -->
            <div class="flex flex-wrap items-center gap-3 mb-4">
                <SegmentedControl v-model="periodo" size="sm" :options="periodos" />
                <div v-if="periodo === 'exercicio'" class="flex items-center gap-2">
                    <span class="text-xs text-ink-muted">Ver mês:</span>
                    <Select v-model="mesSel" :options="mesesOpts" size="sm" class="w-28" />
                </div>
            </div>

            <StatRow :items="kpis" :cols="{ sm: 2, md: 2, lg: 2 }" :loading="store.loading && !store.cons" :scroll-mobile="false" class="mb-2" />
            <p v-if="periodo === 'anterior'" class="text-xs text-ink-subtle mb-4">
                A planilha registra 2024 e 2025 como um único total acumulado por empreendimento (sem quebra mês a mês).
            </p>

            <!-- Empreendimentos -->
            <div class="flex items-center justify-between gap-3 mt-5 mb-3">
                <h2 class="text-sm font-semibold text-ink">
                    <i class="fas fa-building-user mr-1.5 text-ink-subtle"></i>Empreendimentos
                    <span class="text-xs font-normal text-ink-subtle">· clique numa linha para ver o detalhe</span>
                </h2>
            </div>

            <DataTable :columns="colunas" :rows="linhas" row-key="tab" clickable :loading="store.loading && !store.enr.length"
                density="comfortable" sort-by="nome" sort-dir="asc"
                empty-icon="fas fa-file-excel" empty-title="Nenhum empreendimento lido"
                empty-text="A planilha não tem nenhuma aba no formato esperado. Confira o link em Configurar."
                @row-click="abrir">
                <template #cell-nome="{ row }">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="statusMeta(row.st).dot"></span>
                        <div class="min-w-0">
                            <div class="font-semibold text-ink truncate" :title="row.nome">{{ row.nome }}</div>
                            <div class="text-micro text-ink-subtle truncate">{{ row.cidade || '-' }}</div>
                        </div>
                    </div>
                </template>
                <template #cell-pctLabel="{ row }">
                    <div class="flex items-center justify-end gap-2">
                        <span class="hidden md:block w-16 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                            <span class="block h-full rounded-full" :class="statusMeta(row.st).bar"
                                :style="{ width: Math.min(row.pct * 100, 100) + '%' }"></span>
                        </span>
                        <span class="metric tabular-nums" :class="statusMeta(row.st).text">{{ pct(row.pct * 100) }}</span>
                    </div>
                </template>
                <template #cell-status="{ row }">
                    <Badge :variant="statusMeta(row.st).variant" size="sm">{{ statusMeta(row.st).label }}</Badge>
                </template>
            </DataTable>

            <p class="text-xs text-ink-subtle mt-3">
                Status = MKT investido desde o lançamento ÷ viabilidade de MKT aprovada. Amarelo: acima de
                {{ store.meta?.attentionPct ?? 80 }}% do teto · vermelho: acima de {{ store.meta?.overrunPct ?? 100 }}%.
                Liberado {{ mesAtual }} = planejado para o mês atual. Fonte: planilha PROJEÇÃO × INVESTIMENTO MKT {{ store.exercicio }}.
            </p>
        </PageContainer>

        <SettingsModal :open="configOpen" @close="configOpen = false" />
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useMktProjectionStore, statusMeta } from '@/stores/Marketing/MktProjection/mktProjectionStore';
import { useCan } from '@/composables/useCan';
import { fmtDateTime, fmtRelative } from '@/utils/format';
import { brl, brlCheio, pct } from './projFormat';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Favorite from '@/components/config/Favorite.vue';
import SettingsModal from './SettingsModal.vue';

const store = useMktProjectionStore();
const router = useRouter();
const toast = useToast();
const can = useCan('/marketing/projecao-investimentos');
const canConfigure = computed(() => can('configure'));

const configOpen = ref(false);
const periodo = ref('exercicio');
const mesSel = ref(null);

const periodos = computed(() => [
    { value: 'exercicio', label: String(store.exercicio) },
    { value: 'anterior', label: `${store.exercicio - 2}-${store.exercicio - 1}` },
]);
const mesesOpts = computed(() => store.meses.map((m, i) => ({ value: i, label: m })));
// O <select> nativo devolve string; o índice do mês é número.
const idxSel = computed(() => Number(mesSel.value ?? store.curIdx));
const mesAtual = computed(() => store.meses[store.curIdx]);
const mesFechado = computed(() => store.meses[store.closedIdx]);

const kpis = computed(() => {
    const c = store.cons;
    if (!c) return [];
    const obras = `${c.n} obra${c.n === 1 ? '' : 's'}`;
    const saude = c.nEstouro || c.nAtencao
        ? ` · ${c.nOk} dentro${c.nAtencao ? `, ${c.nAtencao} em atenção` : ''}${c.nEstouro ? `, ${c.nEstouro} em estouro` : ''}`
        : ` · todas dentro da viabilidade`;
    if (periodo.value === 'anterior') {
        const pctViab = c.viabMkt ? (c.mktPrior / c.viabMkt) * 100 : 0;
        return [
            { key: 'prior', label: `Investido em ${store.exercicio - 2}-${store.exercicio - 1}`, raw: c.mktPrior, format: brl, icon: 'fas fa-box-archive', tone: 'neutral', hint: `soma antes do exercício ${store.exercicio} · ${obras}`, tooltip: brlCheio(c.mktPrior) },
            { key: 'priorPct', label: '% da viabilidade total', raw: pctViab, format: (v) => pct(v), decimals: 1, icon: 'fas fa-scale-balanced', tone: 'accent', hint: `já consumido antes de ${store.exercicio}${saude}` },
        ];
    }
    const i = idxSel.value;
    const realizado = c.realMonths?.[i] || 0;
    const liberado = c.projMonths?.[i] || 0;
    return [
        { key: 'realizado', label: 'Valor realizado', raw: realizado, format: brl, icon: 'fas fa-money-bill-wave', tone: 'accent', hint: `${store.meses[i]}/${store.exercicio} · pagos · ${obras}`, tooltip: brlCheio(realizado) },
        { key: 'liberado', label: 'Valor liberado', raw: liberado, format: brl, icon: 'fas fa-bullseye', tone: 'pos', hint: `${store.meses[i]}/${store.exercicio} · planejado${saude}`, tooltip: brlCheio(liberado) },
    ];
});

const linhas = computed(() => store.enr.map((e) => {
    const liberado = e.projMonths?.[store.curIdx] || 0;
    return {
        ...e,
        liberadoMes: liberado,
        pctLiberadoViab: e.viabMkt ? (liberado / e.viabMkt) * 100 : 0,
        pctLabel: e.pct,
        status: statusMeta(e.st).label,
    };
}));

const colunas = computed(() => [
    { key: 'nome', label: 'Empreendimento', priority: 1, sortable: true },
    { key: 'viabMkt', label: 'Viabilidade MKT', priority: 2, numeric: true, sortable: true, format: brl },
    { key: 'desde', label: 'Investido desde lanç.', priority: 1, numeric: true, sortable: true, format: brl, class: 'text-accent font-medium' },
    { key: 'liberadoMes', label: `Liberado ${mesAtual.value}`, priority: 2, numeric: true, sortable: true, format: brl, class: 'text-data-pos' },
    { key: 'pctLabel', label: '% viab. consumida', priority: 1, numeric: true, sortable: true, sortValue: (r) => r.pct, truncate: false },
    { key: 'pctLiberadoViab', label: '% liberado/viab.', priority: 3, numeric: true, sortable: true, format: (v) => pct(v) },
    { key: 'status', label: 'Status', priority: 2, sortable: true, truncate: false, align: 'center' },
]);

const abrir = (row) => router.push(`/marketing/projecao-investimentos/${encodeURIComponent(row.tab)}`);

async function atualizar() {
    const antes = store.meta?.lastModified;
    await store.fetchData({ force: true });
    if (store.error) return;
    if (store.meta?.lastModified && antes && store.meta.lastModified !== antes) {
        toast.success('Planilha relida: havia uma versão nova no SharePoint.');
    } else {
        toast.info('Conferido: a planilha no SharePoint não mudou desde a última leitura.');
    }
}

// O seletor de mês nasce no mês corrente da planilha lida.
watch(() => store.curIdx, (i) => { if (mesSel.value == null) mesSel.value = i; }, { immediate: true });

onMounted(() => store.fetchData());
</script>
