<template>
    <SrSkeleton v-if="store.auditLoading && !store.audit" variant="audit" :rows="8"
        label="Conferindo departamento e conta dos títulos no espelho do Sienge…" />
    <div v-else class="sr sr-wrap">
        <header class="sr-head">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">Conferência do departamento</p>
                    <h1 class="display">{{ fmtK(total('certo').valor) }} certos, {{ fmtK(aAcertar) }} a acertar no Sienge</h1>
                </div>
                <span class="sr-chip" :class="{ warn: dadosVelhos }"
                    :data-tip="dadosVelhos
                        ? 'A carga do Sienge não rodou hoje: correção feita depois desta data ainda não aparece aqui. Use Conferir no Sienge agora.'
                        : 'O espelho do Sienge é recarregado uma vez por dia. Para ver uma correção na hora, use Conferir no Sienge agora.'">
                    <i class="fas fa-database"></i>Dados do Sienge até <b class="num">{{ dataDados }}</b>
                </span>
            </div>
            <p class="lede">Cada linha é um título pago do contas a pagar, com a empresa, o centro de custo, a conta e os departamentos em que está hoje. Clique num título para ver por que está fora do padrão e como corrigir no Sienge.</p>
            <p v-if="dadosVelhos" class="sr-note warn">
                <i class="fas fa-triangle-exclamation"></i>
                <span>O espelho está {{ diasAtraso }} dia{{ diasAtraso === 1 ? '' : 's' }} atrás. Título corrigido depois dessa data só aparece aqui depois da próxima carga, ou na hora pelo Conferir no Sienge agora.</span>
            </p>
        </header>

        <section class="sr-sec">
            <div class="sr-kpis" style="--cols: 4">
                <button v-for="s in situacoes" :key="s.key" type="button" class="sr-kpi" :aria-pressed="filtro === s.key"
                    :data-tip="`<b>${s.label}</b><span class='t'>${s.hint}</span>`" @click="filtro = filtro === s.key ? '' : s.key">
                    <span class="eyebrow"><i class="sw" :style="{ background: s.cor }"></i> {{ s.label }}</span>
                    <span class="v num" :style="{ color: s.key === 'certo' ? 'var(--sr-ink)' : s.cor }">{{ fmtK(total(s.key).valor) }}</span>
                    <span class="d">{{ total(s.key).titulos }} título{{ total(s.key).titulos === 1 ? '' : 's' }}<template v-if="participacao(s.key)"> · {{ participacao(s.key) }}</template></span>
                    <span class="efeito" :class="s.efeitoCls">{{ s.efeito }}</span>
                </button>
            </div>
            <div v-if="somaGeral" class="prop">
                <i v-for="s in situacoes" :key="s.key" :style="{ width: (Number(total(s.key).valor || 0) / somaGeral * 100) + '%', background: s.cor }"
                    :data-tip="`<b>${s.label}</b><span class='t'>${fmtBRL(total(s.key).valor)} · ${participacao(s.key)}</span>`"></i>
            </div>
        </section>

        <section v-if="canManage" class="sr-sec">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">Ao vivo no Sienge</p>
                    <h2 class="display">Já corrigiram no Sienge?</h2>
                    <p>O espelho só atualiza amanhã. Esta consulta pergunta direto na API do Sienge, título a título, em que departamento cada título fora do padrão está agora. O que já foi corrigido entra nos relatórios na hora. Só leitura: nada é alterado no ERP.</p>
                </div>
                <button type="button" class="sr-btn" :disabled="store.liveChecking"
                    :data-tip="`Consulta os ${lote} títulos fora do padrão de maior valor direto na API do Sienge`" @click="conferir(false)">
                    <i class="fas fa-satellite-dish"></i>{{ store.liveChecking ? 'Consultando…' : (live ? 'Conferir de novo' : 'Conferir agora') }}
                </button>
            </div>
            <SrSkeleton v-if="store.liveChecking && !live" variant="rows" :rows="4"
                :label="`Consultando ${lote} títulos na API do Sienge, um a um…`" />
            <div v-if="live" class="sr-box">
                <div class="sr-kpis" :style="{ '--cols': live.errors ? 4 : 3 }">
                    <div class="sr-kpi" data-tip="Já corrigidos no Sienge: entraram nos relatórios"><span class="eyebrow">Já corrigidos</span><span class="v num" style="color: var(--sr-ok)">{{ live.resolved }}</span></div>
                    <div class="sr-kpi" data-tip="Continuam fora do padrão no Sienge neste momento"><span class="eyebrow">Ainda pendentes</span><span class="v num" style="color: var(--sr-warn-ink)">{{ live.pending }}</span></div>
                    <div v-if="live.errors" class="sr-kpi" data-tip="Títulos que a API do Sienge não respondeu"><span class="eyebrow">Sem resposta</span><span class="v num">{{ live.errors }}</span></div>
                    <div class="sr-kpi" :data-tip="`${live.checked.length} conferidos de ${live.total} títulos fora do padrão`"><span class="eyebrow">Conferidos</span><span class="v num">{{ live.checked.length }}<small class="muted">/{{ live.total }}</small></span></div>
                </div>
                <div v-if="live.remaining > 0" class="mais">
                    <span>Faltam {{ live.remaining }} títulos. A API do Sienge recusa mais de cerca de 100 consultas por minuto, então vai por partes.</span>
                    <button type="button" class="sr-btn ghost" :disabled="store.liveChecking" data-tip="Continua a conferência do ponto em que parou" @click="conferir(true)">
                        <i class="fas fa-plus"></i>Conferir mais {{ Math.min(lote, live.remaining) }}
                    </button>
                </div>
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
            <div class="filtros">
                <label class="sr-field" data-tip="Só os títulos dos centros de custo deste stand"><span>Stand</span>
                    <select v-model="fStand" class="sr-input"><option value="">Todos os stands</option><option v-for="s in opStands" :key="s" :value="s">{{ s }}</option></select>
                </label>
                <label class="sr-field" data-tip="A empresa (SPE) dona do título no Sienge"><span>Empresa</span>
                    <select v-model="fEmpresa" class="sr-input"><option value="">Todas as empresas</option><option v-for="e in opEmpresas" :key="e" :value="e">{{ e }}</option></select>
                </label>
                <label class="sr-field" data-tip="Em qual departamento o título está hoje no Sienge"><span>Departamento atual</span>
                    <select v-model="fDepto" class="sr-input"><option value="">Qualquer departamento</option><option value="__nenhum">Sem departamento</option><option v-for="d in opDeptos" :key="d" :value="d">{{ d }}</option></select>
                </label>
                <label class="sr-field busca" data-tip="Procura no número do título, fornecedor, conta, documento e observação"><span>Buscar</span>
                    <input v-model="fBusca" type="search" class="sr-input" placeholder="Título, fornecedor, conta ou documento" />
                </label>
            </div>
            <p class="fsum">{{ ordenadas.length }} título{{ ordenadas.length === 1 ? '' : 's' }} · <b class="num">{{ fmtBRL(ordenadas.reduce((s, r) => s + r.valor, 0)) }}</b>
                <button v-if="filtrosAtivos" type="button" class="limpar" data-tip="Tira todos os filtros" @click="limpar"><i class="fas fa-xmark"></i>Limpar filtros</button>
            </p>
            <SrSkeleton v-if="store.auditLoading" variant="rows" :rows="6" label="Atualizando a conferência…" />
            <div v-else-if="ordenadas.length" class="sr-table-wrap tab">
                <table class="sr-table">
                    <thead>
                        <tr>
                            <th>Situação</th>
                            <th><button type="button" data-tip="Ordenar pelo número do título" @click="ordenar('billId')">Título <i :class="iconeOrdem('billId')"></i></button></th>
                            <th><button type="button" data-tip="Ordenar por empresa" @click="ordenar('company')">Empresa e centro de custo <i :class="iconeOrdem('company')"></i></button></th>
                            <th>Conta</th>
                            <th>Departamento hoje</th>
                            <th class="r"><button type="button" data-tip="Ordenar por valor pago" @click="ordenar('valor')">Valor pago <i :class="iconeOrdem('valor')"></i></button></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="r in ordenadas.slice(0, limite)" :key="r.key" class="row" tabindex="0"
                            @click="abrir(r)" @keydown.enter="abrir(r)">
                            <td><span class="sit" :style="{ color: meta(r.situacao).cor }" :data-tip="meta(r.situacao).hint"><i class="sw" :style="{ background: meta(r.situacao).cor }"></i>{{ meta(r.situacao).curto }}</span>
                                <span v-if="vivo[r.billId]" class="sr-chip ok mini" data-tip="Conferido agora na API do Sienge">{{ vivo[r.billId].resolved ? 'corrigido' : 'conferido' }}</span></td>
                            <td><b class="num">{{ r.billId }}</b> <span class="muted">{{ r.docType }} {{ r.docNumber }}</span><span class="sub">{{ niceName(r.supplier) }}</span></td>
                            <td>{{ r.company || '-' }}<span class="sub">CC {{ r.costCenterId }} · {{ r.costCenterName }}</span></td>
                            <td><span class="num">{{ r.contaCode }}</span><span class="sub">{{ r.contaName || 'sem nome' }}</span></td>
                            <td>
                                <span v-for="d in r.departments" :key="d.id" class="sr-chip dep" :class="{ stand: d.id === deptoStand }">{{ d.pct !== 100 ? `${d.name} ${String(d.pct).replace('.', ',')}%` : d.name }}</span>
                                <span v-if="!r.departments.length" class="sr-chip warn">sem departamento</span>
                            </td>
                            <td class="r num">{{ fmtBRL(r.valor) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-if="ordenadas.length > limite" class="mais">
                <span>Mostrando {{ limite }} de {{ ordenadas.length }} títulos, dos de maior valor.</span>
                <button type="button" class="sr-btn ghost" data-tip="Mostra mais 25 títulos" @click="limite += 25"><i class="fas fa-chevron-down"></i>Ver mais 25</button>
            </div>
            <p v-if="!store.auditLoading && !ordenadas.length" class="sr-empty">{{ filtrosAtivos ? 'Nenhum título com esses filtros.' : 'Nenhum lançamento de stand nos centros de custo que você enxerga.' }}</p>
        </section>

        <section class="sr-sec">
            <div class="sr-head">
                <p class="eyebrow">Como ler</p>
                <h2 class="display">O que conta como gasto do stand, e o que não conta</h2>
            </div>
            <div class="como">
                <p><b>Só título pago.</b> Cada valor aqui é de um título do contas a pagar com baixa de <b>pagamento</b> ou de <b>adiantamento</b>, sem estorno, saindo de uma conta bancária da empresa (a conta aparece no detalhe). Juros e multa somam, desconto subtrai.</p>
                <p><b>"Faturamento da medição N" é título.</b> É a observação que o Sienge escreve no título criado pela medição de um contrato (origem: medição de contrato). Ele é pago como qualquer outro título e só conta quando tem baixa de pagamento.</p>
                <p><b>O que não conta.</b> O título provisório do contrato (PCT) e do pedido de compra (PPC) é só previsão: ele é baixado por substituição quando chega a nota, e quem conta é o título da nota. Abatimento de adiantamento também não conta, porque o dinheiro já saiu no adiantamento. Contar essas baixas duplicaria o valor.</p>
                <p><b>Substituto sem departamento.</b> Quando o provisório era do Stand de Vendas e a nota que o substituiu foi criada em outro departamento, o dinheiro saiu mas o título não aparece no relatório. É o erro mais comum nos stands mais antigos.</p>
            </div>
        </section>

        <!-- Detalhe do título -->
        <Teleport to="body">
            <div v-if="aberto" class="sr ad-scrim" @mousedown.self="aberto = null">
                <div class="ad-dlg" role="dialog" aria-modal="true" :aria-label="`Título ${aberto.billId}`">
                    <header class="ad-head">
                        <div class="ad-t">
                            <p class="eyebrow"><i class="sw" :style="{ background: meta(aberto.situacao).cor }"></i> {{ meta(aberto.situacao).label }}</p>
                            <h2 class="display">Título {{ aberto.billId }} · {{ niceName(aberto.supplier) }}</h2>
                            <p class="ad-sub num">{{ aberto.docType }} {{ aberto.docNumber }} · {{ fmtBRL(aberto.valor) }} pagos</p>
                        </div>
                        <button type="button" class="sr-icon-btn" aria-label="Fechar" data-tip="Fechar (Esc)" @click="aberto = null"><i class="fas fa-xmark"></i></button>
                    </header>
                    <div class="ad-body">
                        <div class="por-que" :class="{ ok: aberto.situacao === 'certo' }">
                            <p class="eyebrow">{{ aberto.situacao === 'certo' ? 'Por que está certo' : 'Por que está fora do padrão' }}</p>
                            <p>{{ aberto.motivo }}</p>
                        </div>
                        <div v-if="aberto.corrigir.length">
                            <p class="eyebrow gap">Como corrigir no Sienge</p>
                            <ol class="passos"><li v-for="(p, i) in aberto.corrigir" :key="i">{{ p }}</li></ol>
                        </div>
                        <div v-if="canManage && aberto.situacao !== 'certo'" class="vivo">
                            <button type="button" class="sr-btn" :disabled="conferindo" data-tip="Pergunta agora na API do Sienge em que departamento este título está. Só leitura" @click="conferirTitulo(aberto)">
                                <i class="fas" :class="conferindo ? 'fa-spinner fa-spin' : 'fa-satellite-dish'"></i>{{ conferindo ? 'Consultando o Sienge…' : 'Conferir no Sienge agora' }}
                            </button>
                            <p v-if="vivo[aberto.billId]" class="sr-note" :class="{ warn: !vivo[aberto.billId].resolved }">
                                <i class="fas" :class="vivo[aberto.billId].resolved ? 'fa-circle-check' : 'fa-circle-info'"></i>
                                <span>No Sienge agora: {{ vivo[aberto.billId].live?.length ? vivo[aberto.billId].live.map((d) => `${d.departmentName || d.departmentId} (${d.percentage}%)`).join(', ') : 'sem departamento' }}.
                                    {{ vivo[aberto.billId].resolved ? 'Corrigido: já entra nos relatórios.' : 'Ainda não corrigido.' }}</span>
                            </p>
                        </div>
                        <dl class="kv">
                            <template v-for="d in detalhe(aberto)" :key="d[0]"><dt>{{ d[0] }}</dt><dd>{{ d[1] }}</dd></template>
                        </dl>
                        <div v-if="aberto.notes">
                            <p class="eyebrow gap">Observação do título</p>
                            <p class="obs">{{ aberto.notes }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
        <SrTip />
    </div>
</template>

<script setup>
// Conferência do departamento, TÍTULO A TÍTULO. A apuração do stand sai do
// departamento que quem lançou marcou no título; aqui está o que já está
// certo, o que falta acertar no Sienge, o motivo de cada um e o passo da
// correção. Traz também até quando o espelho do Sienge está em dia e a
// conferência ao vivo (que faz o corrigido entrar na hora).
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useToast } from 'vue-toastification';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import api from '@/utils/Marketing/salesStandApi.js';
import { fmtBRL, fmtDate } from '../standFormat';
import SrTip from '../report/SrTip.vue';
import SrSkeleton from '../report/SrSkeleton.vue';
import { loadReportFonts, niceName } from '../report/reportModel';
import '../report/standReport.css';

defineProps({
    canManage: { type: Boolean, default: false },
});

const store = useSalesStandStore();
const toast = useToast();
const filtro = ref('');
const fStand = ref('');
const fEmpresa = ref('');
const fDepto = ref('');
const fBusca = ref('');
const limite = ref(25);
const lote = 40;
const aberto = ref(null);
const conferindo = ref(false);
const vivo = ref({});

const live = computed(() => store.liveCheck);
const deptoStand = computed(() => Number(store.audit?.settings?.department_id) || 25);

async function conferir(continuar) {
    try {
        const offset = continuar ? (live.value?.offset || 0) + (live.value?.checked?.length || 0) : 0;
        const r = await store.revalidarConferencia({ limit: lote, offset, acumular: continuar });
        for (const c of r.checked || []) vivo.value[c.billId] = c;
        toast.info(r.resolved
            ? `${r.resolved} de ${r.checked.length} títulos já estão corrigidos no Sienge e entraram nos relatórios dos stands.`
            : `Nenhum dos ${r.checked.length} títulos conferidos foi corrigido no Sienge ainda.`);
        if (r.resolved) store.fetchStands();
    } catch (e) {
        toast.error(e.message || 'Não foi possível consultar o Sienge agora.');
    }
}

async function conferirTitulo(r) {
    conferindo.value = true;
    try {
        const c = await api.conferirTitulo({ billId: r.billId, contaCode: r.contaCode, costCenterId: r.costCenterId, situacao: r.situacao });
        if (c) vivo.value = { ...vivo.value, [r.billId]: c };
        if (c?.error) toast.error(`O Sienge não respondeu (${c.error}).`);
        else if (c?.resolved) { toast.success('Corrigido no Sienge: o título já entra no relatório do stand.'); store.fetchStands(); }
        else toast.info('Ainda não corrigido no Sienge.');
    } catch (e) {
        toast.error(e.message || 'Não foi possível consultar o Sienge agora.');
    } finally {
        conferindo.value = false;
    }
}

const SITUACOES = {
    certo: {
        key: 'certo', label: 'Certo', curto: 'Certo', cor: 'var(--sr-ok)',
        efeito: 'entra no relatório', efeitoCls: 'ok',
        hint: 'No departamento Stand de Vendas e numa conta do plano de stand. Nada a fazer.',
    },
    sem_conta: {
        key: 'sem_conta', label: 'No departamento, conta de fora', curto: 'Conta de fora', cor: 'var(--sr-e1)',
        efeito: 'entra no relatório', efeitoCls: 'ok',
        hint: 'Está no departamento Stand de Vendas, mas numa conta que não é do plano de stand. Entra no relatório pelo departamento; o certo é trocar para a conta de stand equivalente.',
    },
    sem_departamento: {
        key: 'sem_departamento', label: 'Conta de stand sem o departamento', curto: 'Sem departamento', cor: 'var(--sr-warn-ink)',
        efeito: 'FORA do relatório', efeitoCls: 'warn',
        hint: 'É conta do plano de stand, mas o título está em outro departamento. Este valor NÃO entra no relatório até ganhar o departamento Stand de Vendas.',
    },
    substituto: {
        key: 'substituto', label: 'Substituto sem o departamento', curto: 'Substituto', cor: 'var(--sr-c1)',
        efeito: 'FORA do relatório', efeitoCls: 'warn',
        hint: 'Substituiu um título provisório (PCT ou PPC) que era do Stand de Vendas, mas foi criado em outro departamento. O dinheiro saiu e NÃO entra no relatório.',
    },
};
const meta = (k) => SITUACOES[k] || SITUACOES.certo;
const situacoes = computed(() => Object.values(SITUACOES));

const total = (k) => store.audit?.totals?.[k] || { titulos: 0, valor: 0 };
const somaGeral = computed(() => Object.keys(SITUACOES).reduce((s, k) => s + Number(total(k).valor || 0), 0));
const aAcertar = computed(() => ['sem_conta', 'sem_departamento', 'substituto'].reduce((s, k) => s + Number(total(k).valor || 0), 0));
const participacao = (k) => (somaGeral.value
    ? `${Math.round((Number(total(k).valor || 0) / somaGeral.value) * 100)}% do total`
    : '');

const rows = computed(() => store.audit?.rows || []);
const opStands = computed(() => [...new Set(rows.value.map((r) => r.standName).filter(Boolean))].sort());
const opEmpresas = computed(() => [...new Set(rows.value.map((r) => r.company).filter(Boolean))].sort());
const opDeptos = computed(() => [...new Set(rows.value.flatMap((r) => r.departments.map((d) => d.name)))].sort());
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtrosAtivos = computed(() => [filtro.value, fStand.value, fEmpresa.value, fDepto.value, fBusca.value].filter(Boolean).length);
function limpar() { filtro.value = ''; fStand.value = ''; fEmpresa.value = ''; fDepto.value = ''; fBusca.value = ''; }

const linhas = computed(() => {
    const q = norm(fBusca.value);
    return rows.value.filter((r) => (!filtro.value || r.situacao === filtro.value)
        && (!fStand.value || r.standName === fStand.value)
        && (!fEmpresa.value || r.company === fEmpresa.value)
        && (!fDepto.value || (fDepto.value === '__nenhum' ? !r.departments.length : r.departments.some((d) => d.name === fDepto.value)))
        && (!q || norm([r.billId, r.supplier, niceName(r.supplier), r.contaCode, r.contaName, r.docType, r.docNumber, r.notes, r.company].join(' ')).includes(q)));
});

// Ordenação: valor pago, do maior para o menor, por padrão.
const ordem = ref({ campo: 'valor', dir: -1 });
function ordenar(campo) {
    ordem.value = ordem.value.campo === campo ? { campo, dir: -ordem.value.dir } : { campo, dir: campo === 'valor' ? -1 : 1 };
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
watch([filtro, fStand, fEmpresa, fDepto, fBusca], () => { limite.value = 25; });

function detalhe(r) {
    const deps = r.departments.length ? r.departments.map((d) => `${d.name} (${d.pct}%)`).join(', ') : 'Nenhum departamento';
    const out = [
        ['Stand', r.standName || '-'],
        ['Empresa', r.company ? `${r.company} (cód. ${r.companyId})` : '-'],
        ['Centro de custo', `${r.costCenterId} · ${r.costCenterName}${r.costCenterPct !== 100 ? ` (${r.costCenterPct}% do título)` : ''}`],
        ['Conta', `${r.contaCode} · ${r.contaName || 'sem nome'}${r.contaSugerida ? ` → conta de stand sugerida: ${r.contaSugerida}` : ''}`],
        ['Departamentos hoje', deps],
        ['Fornecedor', r.supplier],
        ['Documento', `${r.docType || ''} ${r.docNumber || ''} · título ${r.billId}`],
        ['Origem do título', r.originLabel],
        ['Emissão', fmtDate(r.issuedAt)],
        ['Pago', r.paidFrom === r.paidTo ? fmtDate(r.paidFrom) : `de ${fmtDate(r.paidFrom)} a ${fmtDate(r.paidTo)}`],
        ['Como foi pago', `${r.paymentTypes.join(' e ') || '-'}${r.bankAccount ? ` pela conta ${r.bankAccount}` : ''}`],
        ['Valor pago (parte deste centro de custo)', fmtBRL(r.valor)],
    ];
    if (r.substituiu) out.push(['Substituiu', `Título provisório ${r.substituiu}${r.substituiuDoc ? ` (${r.substituiuDoc})` : ''}, que era do Stand de Vendas`]);
    return out;
}
const abrir = (r) => { aberto.value = r; };
function onKey(e) { if (e.key === 'Escape' && aberto.value) aberto.value = null; }

const dataDados = computed(() => {
    const iso = store.audit?.freshness?.lastChange;
    if (!iso) return 'não informado';
    const [d, h] = iso.split('T');
    const [, m, dia] = d.split('-');
    return `${dia}/${m} ${String(h || '').slice(0, 5)}`;
});
const diasAtraso = computed(() => {
    const iso = store.audit?.freshness?.lastChange;
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
});
// Um dia de atraso é o normal (a carga é diária); dois já é carga que não rodou.
const dadosVelhos = computed(() => diasAtraso.value >= 2);
const fmtK = (v) => {
    const n = Number(v) || 0;
    return Math.abs(n) >= 1e6
        ? `R$ ${(n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
        : `R$ ${(n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
};

onMounted(() => {
    loadReportFonts();
    window.addEventListener('keydown', onKey);
    if (!store.audit) store.fetchAudit();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<style scoped>
.muted { color: var(--sr-muted); }
.sr-kpi .eyebrow { display: inline-flex; align-items: center; gap: 6px; }
.efeito { font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.efeito.ok { color: var(--sr-ok); }
.efeito.warn { color: var(--sr-warn-ink); }
.prop { display: flex; height: 12px; gap: 2px; border-radius: 4px; overflow: hidden; }
.prop i { display: block; height: 100%; transform-origin: left; animation: sr-widen 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.mais { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; color: var(--sr-muted); }
.filtros { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.5fr); gap: 10px; }
.fsum { font-size: 13px; color: var(--sr-muted); display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.fsum b { color: var(--sr-ink); font-weight: 500; }
.limpar { border: 0; background: none; color: var(--sr-accent); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.tab { max-height: 620px; overflow: auto; }
.tab thead th { position: sticky; top: 0; z-index: 1; background: var(--sr-paper); box-shadow: inset 0 -1px 0 var(--sr-line); }
.tab th button i { font-size: 10px; opacity: 0.7; margin-left: 4px; }
.row { cursor: pointer; }
.row:focus-visible { outline: 2px solid var(--sr-accent); outline-offset: -2px; }
.sit { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12.5px; white-space: nowrap; }
.sr-chip.dep { margin: 0 4px 4px 0; }
.sr-chip.dep.stand { color: var(--sr-ok); border-color: var(--sr-ok); }
.sr-chip.mini { font-size: 11px; padding: 0 7px; margin-top: 4px; }
.como { display: grid; gap: 10px; max-width: 82ch; font-size: 14px; color: var(--sr-muted); }
.como b { color: var(--sr-ink); }
@media (max-width: 860px) { .filtros { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .filtros { grid-template-columns: 1fr; } }
</style>

<style>
.ad-scrim { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 12px; background: var(--sr-scrim); backdrop-filter: blur(2px); animation: sr-fade 0.25s ease; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: var(--sr-ink); }
.ad-dlg { width: min(780px, 100%); max-height: min(88vh, 920px); display: grid; grid-template-rows: auto 1fr; background: var(--sr-paper); border-radius: 12px; box-shadow: var(--sr-shadow); overflow: hidden; animation: sr-pop 0.32s cubic-bezier(0.2, 0.9, 0.25, 1.05); }
.ad-head { display: flex; gap: 12px; align-items: flex-start; padding: 18px 20px 14px; border-bottom: 1px solid var(--sr-line); }
.ad-t { flex: 1; min-width: 0; display: grid; gap: 3px; }
.ad-t .eyebrow { display: inline-flex; align-items: center; gap: 6px; }
.ad-t h2 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.2; }
.ad-sub { margin: 0; font-size: 12.5px; color: var(--sr-muted); }
.ad-body { overflow-y: auto; padding: 16px 20px 22px; display: grid; gap: 16px; align-content: start; }
.ad-body p { margin: 0; }
.ad-body .por-que { border-radius: 10px; padding: 12px 14px; display: grid; gap: 6px; background: var(--sr-warn-bg); border: 1px solid var(--sr-warn-line); }
.ad-body .por-que.ok { background: var(--sr-sunken); border-color: var(--sr-line); }
.ad-body .gap { margin-bottom: 6px; }
.ad-body .passos { margin: 0; padding-left: 22px; display: grid; gap: 6px; font-size: 14px; list-style: decimal; }
.ad-body .passos li { padding-left: 4px; }
.ad-body .vivo { display: grid; gap: 10px; justify-items: start; }
.ad-body .kv { display: grid; grid-template-columns: 210px 1fr; margin: 0; border-top: 1px solid var(--sr-line); }
.ad-body .kv dt, .ad-body .kv dd { margin: 0; padding: 9px 0; border-bottom: 1px solid var(--sr-line); font-size: 14px; }
.ad-body .kv dt { color: var(--sr-muted); font-size: 13px; }
.ad-body .kv dd { min-width: 0; overflow-wrap: anywhere; }
.ad-body .obs { background: var(--sr-sunken); border-radius: 8px; padding: 12px 14px; font-size: 13.5px; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 560px) {
    .ad-scrim { place-items: end center; padding: 0; }
    .ad-dlg { border-radius: 14px 14px 0 0; max-height: 94vh; }
    .ad-body .kv { grid-template-columns: 1fr; }
    .ad-body .kv dt { border-bottom: 0; padding-bottom: 0; }
}
</style>
