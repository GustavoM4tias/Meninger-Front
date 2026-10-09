<template>
    <SrSkeleton v-if="store.auditLoading && !store.audit" variant="audit" :rows="8"
        label="Conferindo departamento e conta dos títulos no espelho do Sienge…" />
    <div v-else class="sr sr-wrap">
        <header class="sr-head">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">Conferência do departamento</p>
                    <h1 class="display">{{ fmtK(total('certo').valor) }} certos, {{ fmtK(total('sem_departamento').valor + total('sem_conta').valor) }} a acertar no Sienge</h1>
                </div>
                <span class="sr-chip" :class="{ warn: dadosVelhos }"
                    :data-tip="dadosVelhos
                        ? 'A carga do Sienge não rodou hoje: correção feita depois desta data ainda não aparece aqui.'
                        : 'O espelho do Sienge é recarregado uma vez por dia.'">
                    <i class="fas fa-database"></i>Dados do Sienge até <b class="num">{{ dataDados }}</b>
                </span>
            </div>
            <p class="lede">O gasto do stand sai do departamento que quem lançou marcou no título. Aqui está o que já está certo e o que ainda falta acertar no Sienge, nos stands que você enxerga. Clique numa situação para filtrar.</p>
            <p v-if="dadosVelhos" class="sr-note warn">
                <i class="fas fa-triangle-exclamation"></i>
                <span>O espelho está {{ diasAtraso }} dia{{ diasAtraso === 1 ? '' : 's' }} atrás. Título corrigido depois dessa data só aparece aqui depois da próxima carga do backup.</span>
            </p>
        </header>

        <section class="sr-sec">
            <div class="sr-kpis" style="--cols: 3">
                <button v-for="s in situacoes" :key="s.key" type="button" class="sr-kpi" :aria-pressed="filtro === s.key"
                    :data-tip="`<b>${s.label}</b><span class='t'>${s.hint}</span>`" @click="filtro = filtro === s.key ? '' : s.key">
                    <span class="eyebrow"><i class="sw" :style="{ background: s.cor }"></i> {{ s.label }}</span>
                    <span class="v num" :style="{ color: s.key === 'certo' ? 'var(--sr-ink)' : s.cor }">{{ fmtK(total(s.key).valor) }}</span>
                    <span class="d">{{ total(s.key).titulos }} título{{ total(s.key).titulos === 1 ? '' : 's' }}<template v-if="participacao(s.key)"> · {{ participacao(s.key) }} do total</template></span>
                </button>
            </div>
            <div v-if="somaGeral" class="prop">
                <i v-for="s in situacoes" :key="s.key" :style="{ width: (Number(total(s.key).valor || 0) / somaGeral * 100) + '%', background: s.cor }"
                    :data-tip="`<b>${s.label}</b><span class='t'>${fmtBRL(total(s.key).valor)} · ${participacao(s.key)} do total</span>`"></i>
            </div>
        </section>

        <section v-if="canManage" class="sr-sec">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">Ao vivo no Sienge</p>
                    <h2 class="display">Já corrigiram no Sienge?</h2>
                    <p>O espelho só atualiza amanhã. Esta consulta pergunta direto na API do Sienge, título a título, em que departamento e conta cada título divergente está agora. Só leitura: nada é alterado no ERP.</p>
                </div>
                <button type="button" class="sr-btn" :disabled="store.liveChecking"
                    :data-tip="`Consulta os ${lote} títulos divergentes de maior valor direto na API do Sienge`" @click="conferir(false)">
                    <i class="fas fa-satellite-dish"></i>{{ store.liveChecking ? 'Consultando…' : (live ? 'Conferir de novo' : 'Conferir agora') }}
                </button>
            </div>
            <SrSkeleton v-if="store.liveChecking && !live" variant="rows" :rows="4"
                :label="`Consultando ${lote} títulos na API do Sienge, um a um…`" />
            <div v-if="live" class="sr-box">
                <div class="sr-kpis" :style="{ '--cols': live.errors ? 4 : 3 }">
                    <div class="sr-kpi" data-tip="Já corrigidos no Sienge, esperando só a próxima carga do backup"><span class="eyebrow">Já corrigidos</span><span class="v num" style="color: var(--sr-ok)">{{ live.resolved }}</span></div>
                    <div class="sr-kpi" data-tip="Continuam errados no Sienge neste momento"><span class="eyebrow">Ainda pendentes</span><span class="v num" style="color: var(--sr-warn-ink)">{{ live.pending }}</span></div>
                    <div v-if="live.errors" class="sr-kpi" data-tip="Títulos que a API do Sienge não respondeu"><span class="eyebrow">Sem resposta</span><span class="v num">{{ live.errors }}</span></div>
                    <div class="sr-kpi" :data-tip="`${live.checked.length} conferidos de ${live.total} títulos divergentes`"><span class="eyebrow">Conferidos</span><span class="v num">{{ live.checked.length }}<small class="muted">/{{ live.total }}</small></span></div>
                </div>
                <div v-if="live.remaining > 0" class="mais">
                    <span>Faltam {{ live.remaining }} títulos. A API do Sienge recusa mais de cerca de 100 consultas por minuto, então vai por partes.</span>
                    <button type="button" class="sr-btn ghost" :disabled="store.liveChecking" data-tip="Continua a conferência do ponto em que parou" @click="conferir(true)">
                        <i class="fas fa-plus"></i>Conferir mais {{ Math.min(lote, live.remaining) }}
                    </button>
                </div>
                <div v-if="corrigidos.length" class="sr-table-wrap">
                    <table class="sr-table">
                        <thead><tr><th>Stand</th><th>Documento</th><th>Conta</th><th>No espelho → no Sienge agora</th><th class="r">Valor</th></tr></thead>
                        <tbody>
                            <tr v-for="c in corrigidos" :key="c.chave">
                                <td>{{ c.standName || '-' }}</td>
                                <td class="num">{{ [c.docType, c.docNumber].filter(Boolean).join(' ') }} · {{ c.billId }}</td>
                                <td><span class="num">{{ c.contaCode }}</span><span class="sub">{{ c.contaName || 'sem nome' }}</span></td>
                                <td class="num">depto {{ (c.deptosEspelho || []).join(', ') || '-' }} → {{ (c.liveDepartments || []).join(', ') || '-' }}</td>
                                <td class="r num">{{ fmtBRL(c.valor) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else class="sr-empty">Nenhum dos títulos conferidos foi corrigido no Sienge ainda.</p>
            </div>
        </section>

        <section class="sr-sec">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">Título a título</p>
                    <h2 class="display">{{ filtro ? meta(filtro).label : 'Todas as situações' }}</h2>
                </div>
                <div class="sr-seg" role="group" aria-label="Situação">
                    <button type="button" :aria-pressed="!filtro" data-tip="Mostra todas as situações" @click="filtro = ''">Todas</button>
                    <button v-for="s in situacoes" :key="s.key" type="button" :aria-pressed="filtro === s.key" :data-tip="s.hint" @click="filtro = s.key">{{ s.curto }}</button>
                </div>
            </div>
            <SrSkeleton v-if="store.auditLoading" variant="rows" :rows="6" label="Atualizando a conferência…" />
            <div v-else-if="ordenadas.length" class="sr-table-wrap">
                <table class="sr-table">
                    <thead>
                        <tr>
                            <th>Situação</th>
                            <th><button type="button" data-tip="Ordenar por stand" @click="ordenar('standName')">Stand <i :class="iconeOrdem('standName')"></i></button></th>
                            <th>Conta do Sienge</th>
                            <th class="r"><button type="button" data-tip="Ordenar por quantidade de títulos" @click="ordenar('titulos')">Títulos <i :class="iconeOrdem('titulos')"></i></button></th>
                            <th class="r"><button type="button" data-tip="Ordenar por valor pago" @click="ordenar('valor')">Valor pago <i :class="iconeOrdem('valor')"></i></button></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="r in ordenadas.slice(0, limite)" :key="r.chave">
                            <td><span class="sit" :style="{ color: meta(r.situacao).cor }" :data-tip="meta(r.situacao).hint"><i class="sw" :style="{ background: meta(r.situacao).cor }"></i>{{ meta(r.situacao).curto }}</span></td>
                            <td>{{ r.standName || '-' }}<span class="sub">{{ r.costCenterName }}</span></td>
                            <td><span class="num">{{ r.contaCode }}</span><span class="sub">{{ r.contaName || 'sem nome' }}</span></td>
                            <td class="r num">{{ r.titulos }}</td>
                            <td class="r num">{{ fmtBRL(r.valor) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-if="ordenadas.length > limite" class="mais">
                <span>Mostrando {{ limite }} de {{ ordenadas.length }} linhas, das de maior valor.</span>
                <button type="button" class="sr-btn ghost" data-tip="Mostra mais 25 linhas" @click="limite += 25"><i class="fas fa-chevron-down"></i>Ver mais 25</button>
            </div>
            <p v-if="!store.auditLoading && !ordenadas.length" class="sr-empty">{{ filtro ? 'Nenhuma linha nesta situação.' : 'Nenhum lançamento de stand nos centros de custo que você enxerga.' }}</p>
        </section>
        <SrTip />
    </div>
</template>

<style scoped>
.muted { color: var(--sr-muted); font-size: 15px; }
.sr-kpi .eyebrow { display: inline-flex; align-items: center; gap: 6px; }
.prop { display: flex; height: 12px; gap: 2px; border-radius: 4px; overflow: hidden; }
.prop i { display: block; height: 100%; transform-origin: left; animation: sr-widen 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.mais { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; color: var(--sr-muted); }
.sit { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12.5px; white-space: nowrap; }
</style>

<script setup>
// Conferência do departamento. Depois que a apuração passou a sair do
// departamento do Sienge, a qualidade do número depende de quem lança marcar
// certo — e cobrar isso exige um lugar que mostre o tamanho do problema e que
// ele está encolhendo.
//
// Traz também até quando o espelho do Sienge está em dia: correção feita hoje
// no ERP só aparece depois da próxima carga do backup, e sem isso todo mundo
// acha que a tela não respondeu.
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import { fmtBRL } from '../standFormat';

import SrTip from '../report/SrTip.vue';
import SrSkeleton from '../report/SrSkeleton.vue';
import { loadReportFonts } from '../report/reportModel';
import '../report/standReport.css';

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



const SITUACOES = {
    certo: {
        key: 'certo', label: 'Certo', curto: 'Certo', icon: 'fas fa-circle-check',
        cor: 'var(--sr-ok)',
        hint: 'Está no departamento do stand E numa conta do plano de stand. Nada a fazer.',
    },
    sem_conta: {
        key: 'sem_conta', label: 'No depto, conta de fora', curto: 'Conta de fora', icon: 'fas fa-arrow-right-from-bracket',
        cor: 'var(--sr-e1)',
        hint: 'Marcado no departamento do stand, mas a conta não é de stand. Ou a conta está errada, ou o '
            + 'departamento foi indevido. Entra na tela como "sem classificação" até ganhar uma categoria.',
    },
    sem_departamento: {
        key: 'sem_departamento', label: 'Conta de stand sem o depto', curto: 'Sem depto', icon: 'fas fa-sitemap',
        cor: 'var(--sr-warn-ink)',
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

// Ordenação da tabela: valor pago, do maior para o menor, por padrão.
const ordem = ref({ campo: 'valor', dir: -1 });
const limite = ref(25);
watch(filtro, () => { limite.value = 25; });
function ordenar(campo) {
    ordem.value = ordem.value.campo === campo ? { campo, dir: -ordem.value.dir } : { campo, dir: campo === 'standName' ? 1 : -1 };
}
const iconeOrdem = (campo) => (ordem.value.campo !== campo ? 'fas fa-sort' : ordem.value.dir > 0 ? 'fas fa-sort-up' : 'fas fa-sort-down');
const ordenadas = computed(() => {
    const { campo, dir } = ordem.value;
    return [...linhas.value].sort((x, y) => {
        const a = x[campo]; const b = y[campo];
        if (typeof a === 'number' || typeof b === 'number') return ((Number(a) || 0) - (Number(b) || 0)) * dir;
        return String(a || '').localeCompare(String(b || '')) * dir;
    });
});
const fmtK = (v) => {
    const n = Number(v) || 0;
    return Math.abs(n) >= 1e6
        ? `R$ ${(n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
        : `R$ ${(n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
};

onMounted(() => {
    loadReportFonts();
    if (!store.audit) store.fetchAudit();
});
</script>
