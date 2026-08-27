<template>
    <div class="flex flex-col gap-5">
        <Surface variant="raised" padding="sm">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <p class="text-sm text-ink-muted min-w-0 flex-1">
                    Como o gasto é apurado pelo <span class="text-ink font-medium">departamento</span>, o número depende
                    de quem lança o título marcar o departamento certo. Aqui está o que já está certo e o que ainda
                    falta acertar no Sienge, nos stands que você enxerga.
                </p>
                <div class="shrink-0 text-right">
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Dados do Sienge até</p>
                    <p class="text-sm font-mono tabular-nums" :class="dadosVelhos ? 'text-data-warn' : 'text-ink'"
                        :title="dadosVelhos
                            ? 'A carga do Sienge não rodou hoje: correção feita depois desta data ainda não aparece aqui.'
                            : 'O espelho do Sienge é recarregado uma vez por dia.'">
                        {{ dataDados }}
                    </p>
                </div>
            </div>
            <p v-if="dadosVelhos" class="text-xs text-data-warn mt-2 flex items-start gap-2">
                <i class="fas fa-triangle-exclamation mt-0.5"></i>
                <span>
                    O espelho está {{ diasAtraso }} dia{{ diasAtraso === 1 ? '' : 's' }} atrás. Título corrigido depois
                    dessa data só aparece aqui depois da próxima carga do backup.
                </span>
            </p>
        </Surface>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Surface v-for="s in situacoes" :key="s.key" variant="flat" padding="sm" bordered interactive
                class="cursor-pointer transition-colors"
                :class="filtro === s.key ? 'border-accent/40 bg-accent-soft/40' : ''"
                :title="s.hint"
                @click="filtro = filtro === s.key ? '' : s.key">
                <div class="flex items-center gap-2 mb-1">
                    <span class="w-2 h-2 rounded-full" :class="s.dot"></span>
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">{{ s.label }}</p>
                </div>
                <p class="font-mono tabular-nums font-bold text-metric-sm" :class="s.text">
                    {{ fmtBRL(total(s.key).valor) }}
                </p>
                <p class="text-micro text-ink-subtle mt-0.5">
                    {{ total(s.key).titulos }} título{{ total(s.key).titulos === 1 ? '' : 's' }}
                    <span v-if="participacao(s.key)"> · {{ participacao(s.key) }} do total</span>
                </p>
            </Surface>
        </div>

        <!-- Conferência ao vivo: a API do Sienge responde AGORA, o espelho só
             amanhã. Serve para ver se a correção pedida ao administrativo chegou. -->
        <Panel v-if="canManage" title="Já corrigiram no Sienge?" icon="fas fa-satellite-dish"
            subtitle="Consulta título a título na API do Sienge, ao vivo. Só leitura: nada é alterado no ERP.">
            <template #actions>
                <Button variant="primary" size="sm" icon="fas fa-satellite-dish" :loading="store.liveChecking"
                    :title="`Consulta os ${lote} títulos divergentes de maior valor direto na API do Sienge`"
                    @click="conferir(false)">
                    {{ live ? 'Conferir de novo' : 'Conferir agora' }}
                </Button>
            </template>

            <div v-if="!live && !store.liveChecking" class="text-sm text-ink-muted">
                O espelho do Sienge é recarregado uma vez por dia. Enquanto a próxima carga não roda, esta consulta
                pergunta direto na API em que departamento e em que conta cada título divergente está agora.
            </div>

            <div v-else-if="store.liveChecking && !live" class="flex items-center gap-2.5 text-sm text-ink-muted">
                <Spinner size="sm" />
                Consultando o Sienge título a título...
            </div>

            <div v-else class="flex flex-col gap-3">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div title="Já corrigidos no Sienge, esperando só a próxima carga do backup">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Já corrigidos</p>
                        <p class="font-mono tabular-nums font-bold text-series-1 text-metric-sm">{{ live.resolved }}</p>
                    </div>
                    <div title="Continuam errados no Sienge neste momento">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Ainda pendentes</p>
                        <p class="font-mono tabular-nums font-bold text-data-warn text-metric-sm">{{ live.pending }}</p>
                    </div>
                    <div v-if="live.errors" title="Títulos que a API do Sienge não respondeu">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Sem resposta</p>
                        <p class="font-mono tabular-nums font-bold text-ink-muted text-metric-sm">{{ live.errors }}</p>
                    </div>
                    <div :title="`${live.checked.length} conferidos de ${live.total} títulos divergentes`">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Conferidos</p>
                        <p class="font-mono tabular-nums font-bold text-ink text-metric-sm">
                            {{ live.checked.length }}<span class="text-ink-subtle text-sm">/{{ live.total }}</span>
                        </p>
                    </div>
                </div>

                <p v-if="live.remaining > 0" class="text-xs text-ink-muted flex flex-wrap items-center gap-2">
                    Faltam {{ live.remaining }} títulos para conferir (a API do Sienge recusa mais de ~100 consultas por
                    minuto, então vai por partes).
                    <Button variant="ghost" size="sm" icon="fas fa-plus" :loading="store.liveChecking"
                        title="Continua a conferência do ponto em que parou" @click="conferir(true)">
                        Conferir mais {{ Math.min(lote, live.remaining) }}
                    </Button>
                </p>

                <DataTable v-if="corrigidos.length" :columns="colunasLive" :rows="corrigidos" row-key="chave"
                    density="compact" sort-by="valor" sort-dir="desc"
                    empty-title="Nenhum corrigido ainda" empty-text="" />
                <p v-else class="text-xs text-ink-subtle">
                    Nenhum dos títulos conferidos foi corrigido no Sienge ainda.
                </p>
            </div>
        </Panel>

        <DataTable :columns="colunas" :rows="linhas" row-key="chave" :loading="store.auditLoading"
            density="comfortable" sort-by="valor" sort-dir="desc"
            empty-icon="fas fa-clipboard-check" empty-title="Nada a conferir"
            :empty-text="filtro ? 'Nenhuma linha nesta situação.' : 'Nenhum lançamento de stand nos centros de custo que você enxerga.'">
            <template #cell-situacao="{ row }">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-micro font-medium"
                    :class="[meta(row.situacao).bg, meta(row.situacao).border, meta(row.situacao).text]"
                    :title="meta(row.situacao).hint">
                    <i :class="meta(row.situacao).icon" class="text-micro"></i>{{ meta(row.situacao).curto }}
                </span>
            </template>
        </DataTable>
    </div>
</template>

<script setup>
// Conferência do departamento. Depois que a apuração passou a sair do
// departamento do Sienge, a qualidade do número depende de quem lança marcar
// certo — e cobrar isso exige um lugar que mostre o tamanho do problema e que
// ele está encolhendo.
//
// Traz também até quando o espelho do Sienge está em dia: correção feita hoje
// no ERP só aparece depois da próxima carga do backup, e sem isso todo mundo
// acha que a tela não respondeu.
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import { fmtBRL } from '../standFormat';

import Surface from '@/components/UI/Surface.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import DataTable from '@/components/UI/DataTable.vue';

defineProps({
    canManage: { type: Boolean, default: false },
});

const store = useSalesStandStore();
const toast = useToast();
const filtro = ref('');
const lote = 40;

const live = computed(() => store.liveCheck);
const corrigidos = computed(() => (live.value?.checked || [])
    .filter((c) => c.resolved)
    .map((c) => ({ ...c, chave: `${c.billId}-${c.contaCode}` })));

async function conferir(continuar) {
    try {
        const offset = continuar ? (live.value?.offset || 0) + (live.value?.checked?.length || 0) : 0;
        const r = await store.revalidarConferencia({ limit: lote, offset, acumular: continuar });
        toast.info(`${r.resolved} de ${r.checked.length} títulos já estão corrigidos no Sienge.`);
    } catch (e) {
        toast.error(e.message || 'Não foi possível consultar o Sienge agora.');
    }
}

const colunasLive = computed(() => [
    { key: 'standName', label: 'Stand', priority: 1, sortable: true, format: (v) => v || '-' },
    { key: 'valor', label: 'Valor', priority: 1, numeric: true, sortable: true, format: (v) => fmtBRL(v) },
    {
        key: 'doc', label: 'Documento', priority: 2, truncate: false,
        value: (r) => [r.docType, r.docNumber].filter(Boolean).join(' '),
    },
    {
        key: 'contaCode', label: 'Conta', priority: 2, sortable: true,
        format: (v, r) => `${v} - ${r.contaName || 'sem nome'}`,
    },
    {
        key: 'mudanca', label: 'No espelho / no Sienge agora', priority: 2, truncate: false,
        value: (r) => `depto ${JSON.stringify(r.deptosEspelho)} -> ${JSON.stringify(r.liveDepartments)}`,
    },
]);

const SITUACOES = {
    certo: {
        key: 'certo', label: 'Certo', curto: 'Certo', icon: 'fas fa-circle-check',
        dot: 'bg-series-1', text: 'text-series-1', bg: 'bg-series-1-soft', border: 'border-series-1/30',
        hint: 'Está no departamento do stand E numa conta do plano de stand. Nada a fazer.',
    },
    sem_conta: {
        key: 'sem_conta', label: 'No depto, conta de fora', curto: 'Conta de fora', icon: 'fas fa-arrow-right-from-bracket',
        dot: 'bg-data-warn', text: 'text-data-warn', bg: 'bg-data-warn/10', border: 'border-data-warn/30',
        hint: 'Marcado no departamento do stand, mas a conta não é de stand. Ou a conta está errada, ou o '
            + 'departamento foi indevido. Entra na tela como "sem classificação" até ganhar uma categoria.',
    },
    sem_departamento: {
        key: 'sem_departamento', label: 'Conta de stand sem o depto', curto: 'Sem depto', icon: 'fas fa-sitemap',
        dot: 'bg-data-neg', text: 'text-data-neg', bg: 'bg-data-neg/10', border: 'border-data-neg/30',
        hint: 'É conta do plano de stand, mas ninguém marcou o departamento. Este valor NÃO está entrando na conta '
            + 'do stand hoje.',
    },
};

const meta = (k) => SITUACOES[k] || SITUACOES.certo;
const situacoes = computed(() => Object.values(SITUACOES));

const total = (k) => store.audit?.totals?.[k] || { titulos: 0, valor: 0 };
const somaGeral = computed(() => Object.keys(SITUACOES).reduce((s, k) => s + Number(total(k).valor || 0), 0));
const participacao = (k) => (somaGeral.value
    ? `${Math.round((Number(total(k).valor || 0) / somaGeral.value) * 100)}%`
    : '');

const linhas = computed(() => (store.audit?.rows || [])
    .filter((r) => !filtro.value || r.situacao === filtro.value)
    .map((r) => ({ ...r, chave: `${r.situacao}-${r.costCenterId}-${r.contaCode}` })));

const dataDados = computed(() => {
    const iso = store.audit?.freshness?.lastChange;
    if (!iso) return 'não informado';
    const [d, h] = iso.split('T');
    const [y, m, dia] = d.split('-');
    return `${dia}/${m} ${String(h || '').slice(0, 5)}`;
});

const diasAtraso = computed(() => {
    const iso = store.audit?.freshness?.lastChange;
    if (!iso) return 0;
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return Math.max(0, dias);
});
// Um dia de atraso é o normal (a carga é diária); dois já é carga que não rodou.
const dadosVelhos = computed(() => diasAtraso.value >= 2);

const colunas = computed(() => [
    { key: 'situacao', label: 'Situação', priority: 1, sortable: true, truncate: false, sortValue: (r) => meta(r.situacao).label },
    { key: 'standName', label: 'Stand', priority: 1, sortable: true, format: (v) => v || '-' },
    { key: 'valor', label: 'Valor pago', priority: 1, numeric: true, sortable: true, format: (v) => fmtBRL(v) },
    {
        key: 'contaCode', label: 'Conta do Sienge', priority: 2, sortable: true,
        format: (v, r) => `${v} - ${r.contaName || 'sem nome'}`,
    },
    { key: 'titulos', label: 'Títulos', priority: 2, numeric: true, sortable: true },
    { key: 'costCenterName', label: 'Centro de custo', priority: 3, sortable: true },
]);

onMounted(() => {
    if (!store.audit) store.fetchAudit();
});
</script>
