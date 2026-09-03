<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useCan } from '@/composables/useCan';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useIncrementalList } from '@/composables/useIncrementalList';
import Export from '@/components/config/Export.vue';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Spinner from '@/components/UI/Spinner.vue';
import DataTable from '@/components/UI/DataTable.vue';
import StatRow from '@/components/UI/StatRow.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import ContractAdjustmentModal from './ContractAdjustmentModal.vue';

import { leadOf, reservaCorretorOf, reservaImobiliariaOf } from '@/utils/Comercial/saleAttribution';

const props = defineProps({
  enterprise: { type: Object, required: true },
  sales: { type: Array, required: true },
  projectionRow: { type: Object, default: null },
  timeElapsedPct: { type: Number, default: 0 },
});

const emit = defineEmits(['close']);
const open = ref(false);

const contractsStore = useContractsStore();

// O alternador Listagem / Pizza / Colunas saiu em 2026-08-31 (DESIGN-LANGUAGE,
// "Padroes de VISUALIZACAO"): o modal existe para chegar no REGISTRO, nunca
// para mostrar agregado, e relatorio e uma leitura so, de cima para baixo.
// Com ele foram os graficos e todo o ECharts deste arquivo.
//
// A comparacao Realizado x Projetado NAO era um "modo": e uma secao propria,
// que agora aparece acima da lista quando existe projecao para o recorte.

const statusLabel = (s) =>
({
  iniciado: 'Iniciado',
  autorizacao: 'Em autorização',
  andamento: 'Em andamento',
  pago: 'Pago',
}[s] || '—');

const firstContractOf = (sale) => sale?.contracts?.[0] || {};
const repasseOf = (sale) => firstContractOf(sale)?.repasse?.[0] || null;
const reservaOf = (sale) => {
  const first = firstContractOf(sale);
  if (first?.reserva) return first.reserva;

  const r = first?.repasse?.[0];
  if (r?.reserva) return r.reserva;
  if (r?.reserva_obj) return r.reserva_obj;
  if (r?.reservaObj) return r.reservaObj;

  return null;
};

const normalizeCostCenterCode = (value) => {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length >= 5) return digits.slice(-5);
  return digits;
};

const extractCostCenterFromText = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d{5})/);
  return match ? match[1] : null;
};

const enterpriseCostCenterHint = computed(() =>
  normalizeCostCenterCode(
    props.enterprise?.cost_center_code ||
    extractCostCenterFromText(props.enterprise?.name)
  )
);

const toIsoDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = raw.match(/^([0-3]\d)\/([01]\d)\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
};

const saleDateIsoOf = (sale) =>
  toIsoDate(
    sale.financial_institution_date ||
    firstContractOf(sale)?.financial_institution_date ||
    reservaDateOf(sale)
  );

const costCenterOfSale = (sale) =>
  normalizeCostCenterCode(
    sale.cost_center ??
    sale.costCenter ??
    firstContractOf(sale)?.cost_center ??
    firstContractOf(sale)?.costCenter ??
    firstContractOf(sale)?.cost_center_id ??
    firstContractOf(sale)?.cost_centers?.[0]?.name ??
    sale.contracts?.[0]?.cost_center ??
    sale.contracts?.[0]?.costCenter ??
    sale.contracts?.[0]?.cost_center_id ??
    extractCostCenterFromText(firstContractOf(sale)?.enterprise_name) ??
    extractCostCenterFromText(sale.enterprise_name) ??
    enterpriseCostCenterHint.value ??
    firstContractOf(sale)?.enterprise_id ??
    null
  );

const customerNameOf = (sale) =>
  reservaOf(sale)?.titular?.nome ||
  sale?.customer_name ||
  reservaOf(sale)?.cliente?.nome ||
  reservaOf(sale)?.comprador ||
  '—';

const imobiliariaOf = (sale) => {
  const res = reservaOf(sale);
  const rep = repasseOf(sale);

  return (
    res?.corretor?.imobiliaria ||
    rep?.corretor?.imobiliaria ||
    sale?.contracts?.[0]?.corretor?.imobiliaria ||
    sale?.imobiliaria?.nomefantasia ||
    sale?.imobiliaria?.razaosocial ||
    rep?.imobiliaria?.nomefantasia ||
    rep?.imobiliaria?.razaosocial ||
    rep?.imobiliaria?.email ||
    rep?.imobiliaria?.cnpj ||
    '—'
  );
};

const brokerNameOf = (sale) => {
  const res = reservaOf(sale);
  const rep = repasseOf(sale);

  const c = [
    res?.corretor?.imobiliaria,
    rep?.corretor?.imobiliaria,
    sale?.contracts?.[0]?.corretor?.imobiliaria,
    sale?.imobiliaria?.nomefantasia,
    sale?.imobiliaria?.razaosocial,
    rep?.imobiliaria?.nomefantasia,
    rep?.imobiliaria?.razaosocial,
    rep?.imobiliaria?.email,
    rep?.imobiliaria?.cnpj,
  ].find((v) => typeof v === 'string' && v.trim());

  return c ? String(c).trim() : 'Sem imobiliária';
};

const repasseLinkOf = (sale) => {
  const idRep = repasseOf(sale)?.idrepasse;
  if (idRep) {
    return `https://menin.cvcrm.com.br/gestor/financeiro/repasses/${idRep}/administrar`;
  }
  const idRes = reservaOf(sale)?.idreserva || sale?.idreserva;
  if (idRes) {
    return `https://menin.cvcrm.com.br/gestor/comercial/reservas/${idRes}/administrar`;
  }
  return 'javascript:void(0)';
};

const repasseStatusOf = (sale) => {
  const r = repasseOf(sale);
  if (r) {
    const sr = (r.status_repasse ?? r.statusRepasse ?? '').toString().trim();
    if (sr) return sr;
    if (r.idsituacao_repasse != null) return `Situação #${r.idsituacao_repasse}`;
  }

  const res = reservaOf(sale);
  if (res) {
    const srr = (res.status_repasse ?? res.statusRepasse ?? '').toString().trim();
    if (srr) return srr;

    const srz = (res.status_reserva ?? res.statusReserva ?? '').toString().trim();
    if (srz) return srz;

    const sw = (res.status_workflow ?? '').toString().trim();
    if (sw) return sw;
  }

  const c = firstContractOf(sale);
  const pools = [
    c?.repasse_status_history,
    c?.repasse_history,
    c?.historico_repasse,
    c?.status_evolution,
    c?.repasse?.status_history,
    c?.reserva_status_history,
  ].filter(Array.isArray);

  for (const arr of pools) {
    const latest = [...arr].sort(
      (a, b) =>
        new Date(b.captured_at || b.data || 0) -
        new Date(a.captured_at || a.data || 0)
    )[0];

    const ls = (latest?.status_repasse ?? latest?.status ?? '').toString().trim();
    if (ls) return ls;
  }

  return null;
};

const repasseTooltipOf = (sale) => {
  const status = repasseStatusOf(sale) || '—';
  return `${status}`;
};

const empreendimentoOf = (sale) =>
  repasseOf(sale)?.empreendimento ??
  reservaOf(sale)?.empreendimento ??
  firstContractOf(sale)?.enterprise_name ??
  '—';

const etapaOf = (sale) =>
  repasseOf(sale)?.etapa ??
  reservaOf(sale)?.etapa ??
  reservaOf(sale)?.unidade_json?.etapa ??
  '—';

const blocoOf = (sale) =>
  repasseOf(sale)?.bloco ??
  reservaOf(sale)?.bloco ??
  reservaOf(sale)?.unidade_json?.quadra ??
  reservaOf(sale)?.unidade_json?.bloco ??
  '—';

const reservaUnitOf = (sale) =>
  reservaOf(sale)?.unidade ??
  reservaOf(sale)?.unidade_json?.nome ??
  firstContractOf(sale)?.unit_name ??
  sale?.unit_name ??
  '—';

const reservaDateOf = (sale) =>
  reservaOf(sale)?.data_reserva ??
  reservaOf(sale)?.data ??
  null;

/* ===================== utils ===================== */
const valueModeLabel = computed(() => contractsStore.valueModeLabel);

const toNumSafe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Regras de valor e comissão vêm inteiras do contractsStore — este modal não
// reimplementa nenhuma delas (antes tinha uma cópia que divergia da tabela).
const uplift = (base, pct) => contractsStore.upliftFor(base, pct);
const contractValueByMode = (contract) => (contract ? toNumSafe(contractsStore.contractValue(contract)) : 0);

const saleValueFromConditions = (sale) => {
  const contracts = Array.isArray(sale?.contracts) ? sale.contracts : [];
  if (!contracts.length) return 0;
  if (selectedSerie.value) {
    return contracts.reduce((sum, c) => sum + contractValueForSerie(c, selectedSerie.value), 0);
  }
  return contracts.reduce((sum, c) => sum + contractValueByMode(c), 0);
};

const getSaleValue = (sale) => {
  if (!selectedSerie.value) {
    const direct = contractsStore.isGross ? sale?.total_value_gross : sale?.total_value_net;
    const d = Number(direct);
    if (Number.isFinite(d) && d > 0) return d;
  }
  return saleValueFromConditions(sale);
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0);
const formatDate = (d) => {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const isDiscount = (c) =>
  contractsStore.discountCodes.has(String(c?.condition_type_id || '').toUpperCase());

/* ===================== série filter ===================== */
const selectedSerie = ref('');

const seriesOptions = computed(() => {
  const map = new Map();
  let hasCommission = false;
  for (const sale of props.sales) {
    for (const contract of sale.contracts || []) {
      for (const pc of contract.payment_conditions || []) {
        const id = String(pc.condition_type_id || '').trim().toUpperCase();
        const name = String(pc.condition_type_name || pc.condition_type_id || '').trim();
        if (id && !map.has(id)) map.set(id, name);
      }
      if (!hasCommission && resolveCommissionPct(contract) > 0) {
        hasCommission = true;
      }
    }
  }
  const options = [...map.entries()]
    .map(([id, name]) => ({ id, label: name ? `${name} (${id})` : id }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (hasCommission) {
    options.push({ id: 'COMISSAO_FORA', label: 'Comissão Fora do Contrato (COMISSAO_FORA)' });
  }
  return options;
});

const serieSelectOptions = computed(() => [
  { value: '', label: 'Todas as séries' },
  ...seriesOptions.value.map(s => ({ value: s.id, label: s.label })),
]);

const contractValueForSerie = (contract, serieId) => {
  if (!serieId) return contractValueByMode(contract);

  if (serieId === 'COMISSAO_FORA') {
    const pct = resolveCommissionPct(contract);
    if (pct <= 0) return 0;
    const base = contractsStore.isGross ? baseGross(contract) : baseNet(contract);
    return uplift(base, pct);
  }

  const rule = contractsStore.enterpriseRuleFor(contract) || {};
  const pcs = Array.isArray(contract?.payment_conditions) ? contract.payment_conditions : [];
  const matching = pcs.filter(
    (pc) => String(pc.condition_type_id || '').trim().toUpperCase() === serieId
  );
  if (!matching.length) return 0;

  const serieTotal = matching.reduce((s, pc) => s + (Number(pc.total_value) || 0), 0);

  if (serieId === 'TR') {
    if (contractsStore.isGross && rule.gross === 'LAND_VALUE_ONLY') return Number(contract.land_value) || 0;
    if (contractsStore.isNet && rule.net === 'LAND_VALUE_ONLY') return Number(contract.land_value) || 0;
  }

  return serieTotal;
};

/* ===================== busca / lista ===================== */
const searchTerm = ref('');

const normalizedSearch = computed(() => (searchTerm.value || '').toLowerCase());
const filteredSales = computed(() => {
  let list = props.sales;

  if (selectedSerie.value) {
    if (selectedSerie.value === 'COMISSAO_FORA') {
      list = list.filter((sale) =>
        (sale.contracts || []).some((contract) => resolveCommissionPct(contract) > 0)
      );
    } else {
      list = list.filter((sale) =>
        (sale.contracts || []).some((contract) =>
          (contract.payment_conditions || []).some(
            (pc) => String(pc.condition_type_id || '').trim().toUpperCase() === selectedSerie.value
          )
        )
      );
    }
  }

  if (!normalizedSearch.value) return list;
  const t = normalizedSearch.value;
  const has = (s = '') => String(s ?? '').toLowerCase().includes(t);

  return list.filter((sale) => {
    return (
      has(customerNameOf(sale)) ||
      has(sale.unit_name) ||
      has(reservaUnitOf(sale)) ||
      has(sale.contracts?.[0]?.associates?.[0]?.name) ||
      has(blocoOf(sale)) ||
      has(etapaOf(sale)) ||
      has(empreendimentoOf(sale)) ||
      has(repasseStatusOf(sale)) ||
      has(imobiliariaOf(sale)) ||
      has(formatDate(sale.financial_institution_date || reservaDateOf(sale))) ||
      has(formatCurrency(getSaleValue(sale)))
    );
  });
});

const showLandOnlyNote = computed(() =>
  (filteredSales.value ?? []).some((s) =>
    (s.contracts ?? []).some((c) => {
      const r = contractsStore.enterpriseRuleFor(c);
      return (
        (contractsStore.isGross && r?.gross === 'LAND_VALUE_ONLY') ||
        (contractsStore.isNet && r?.net === 'LAND_VALUE_ONLY')
      );
    })
  )
);

const totalSales = computed(() => filteredSales.value.length);

const totalValue = computed(() =>
  filteredSales.value.reduce((s, sale) => s + Number(getSaleValue(sale) || 0), 0)
);

const avgTicket = computed(() =>
  totalSales.value ? totalValue.value / totalSales.value : 0
);

const uniqueCustomers = computed(
  () =>
    new Set(
      filteredSales.value.map((s) => s.customer_id || customerNameOf(s))
    ).size
);

/* ===================== ordenação + scroll incremental =====================
 * `manual-sort` na DataTable é OBRIGATÓRIO aqui: a lista chega fatiada pelo
 * scroll incremental, e a ordenação interna da tabela ordenaria só o pedaço
 * montado - pior que não ordenar. A ordem correta é filtrar → ordenar →
 * fatiar, e é o que acontece abaixo.
 *
 * A paginação (primeira/anterior/próxima/última + "itens por página") saiu:
 * o padrão da casa é rolar, sem decidir tamanho de página nem caçar registro
 * entre páginas.
 */
const sortBy = ref('valor');
const sortDir = ref('desc');

const sortValueOfSale = (sale) => {
  switch (sortBy.value) {
    case 'cliente': return (customerNameOf(sale) || '').toLowerCase();
    case 'unidade': return (sale.unit_name || reservaUnitOf(sale) || '').toString();
    case 'data': return sale.financial_institution_date || reservaDateOf(sale) || '';
    default: return Number(getSaleValue(sale)) || 0;
  }
};

const sortedSales = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...filteredSales.value].sort((a, b) => {
    const av = sortValueOfSale(a);
    const bv = sortValueOfSale(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' }) * dir;
  });
});

/* A linha precisa de uma chave estável: cliente + unidade é o que já
 * identificava a venda na versão anterior; o índice desempata os raros casos
 * de duas vendas do mesmo cliente na mesma unidade. */
const saleRows = computed(() => sortedSales.value.map((sale, i) => ({
  ...sale,
  _key: `${sale.customer_id ?? 'x'}-${sale.unit_name ?? ''}-${i}`,
})));

/* O container que rola é o corpo do modal, não a janela. */
const scrollRoot = ref(null);
const inc = useIncrementalList(saleRows, { step: 50, root: scrollRoot });

const hasRepasse = computed(() =>
  inc.visiveis.value.some(
    (s) => s.contracts?.[0]?.repasse?.[0] || s.contracts?.[0]?.reserva
  )
);

// Trocar de recorte volta a lista ao primeiro passo - quem cuida disso e o
// proprio useIncrementalList, que reinicia quando a lista deixa de ser a mesma.
watch(() => props.sales, () => { selectedSerie.value = ''; });

// Abrir/fechar a linha agora e da DataTable (`expandable` + slot #expanded),
// que mantem a colecao de abertas e serve as duas larguras.

const saleIsProjection = (sale) =>
  (sale.contracts || []).every((c) => c._projection);

// Venda distratada (contrato cancelado no Sienge depois da venda). Continua
// contabilizada — o selo é só informativo; regra mora no contractsStore.
// Compra e distrato no mesmo mês nem chegam aqui (excluídos no SQL).
const saleIsDistrato = (sale) => contractsStore.saleIsDistrato(sale);

const distratoTooltipOf = (sale) => {
  const cancelDate = (sale?.contracts || [])
    .map((c) => c?.cancellation_date)
    .find(Boolean);
  const when = cancelDate ? ` em ${formatDate(cancelDate)}` : ' depois da venda';
  return `Contrato cancelado no Sienge${when} — contabilizada no período, pois na época foi venda`;
};

/* ===================== lead de captação ===================== */
// leadOf / reservaCorretorOf / reservaImobiliariaOf vêm de utils/Comercial/
// saleAttribution.js — os mesmos acessores que o Relatório Comercial usa, para
// o selo daqui e o ranking de lá nunca discordarem.
const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"]/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]
  ));

// O cartão do hover segue o LeadDetailModal da tela de Leads: mesmo banner
// colorido por situação, mesmo cartão de contato sobreposto e as mesmas seções
// com rótulo em versalete. Vai como HTML porque o tippy renderiza string — as
// classes são literais, então o Tailwind as mantém no bundle.
const LEAD_BANNER_GRADIENT = {
  'Vendido': 'from-data-pos via-emerald-600 to-teal-600',
  'Venda Realizada': 'from-data-pos via-emerald-600 to-teal-600',
  'Cancelado': 'from-slate-700 via-slate-600 to-slate-700',
  'Descartado': 'from-slate-700 via-slate-600 to-slate-700',
  'Em Negociação': 'from-data-warn via-orange-600 to-data-warn',
  'Reservado': 'from-data-warn via-orange-600 to-data-warn',
  'Com Reserva': 'from-data-warn via-orange-600 to-data-warn',
  'Em Análise de Crédito': 'from-accent via-violet-600 to-accent',
};

// Bloco "rótulo em cima, valor embaixo" — o mesmo par usado nas seções do modal.
const leadField = (label, value, icon = '') => `
  <div class="min-w-0">
    <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-0.5">
      ${icon}${escapeHtml(label)}
    </p>
    <p class="text-sm text-ink truncate">${escapeHtml(value || '—')}</p>
  </div>`;

const leadSection = (icon, titulo, inner) => `
  <section>
    <div class="flex items-center gap-1.5 mb-2">
      <i class="${icon} text-xs text-accent"></i>
      <h4 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">${escapeHtml(titulo)}</h4>
    </div>
    ${inner}
  </section>`;

const leadTooltipOf = (sale) => {
  const lead = leadOf(sale);
  if (!lead) return '';

  const gradiente = LEAD_BANNER_GRADIENT[lead.situacao_nome] || 'from-accent via-blue-600 to-accent';
  const campanha = lead.campanha || lead.utm_campaign;

  const banner = `
    <div class="relative bg-gradient-to-br ${gradiente} text-white px-4 pt-4 pb-10 overflow-hidden">
      <div class="pointer-events-none absolute inset-0 opacity-30"
        style="background-image: radial-gradient(circle, rgba(255,255,255,.2) 1px, transparent 1px); background-size: 18px 18px;"></div>
      <div class="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-surface-raised/10 rounded-full blur-3xl"></div>
      <div class="relative">
        <div class="flex items-center gap-2 flex-wrap mb-1.5">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-medium bg-surface-raised/20 backdrop-blur border border-white/20 text-white">
            <span class="h-1.5 w-1.5 rounded-full bg-surface-raised"></span>${escapeHtml(lead.situacao_nome || 'Lead')}
          </span>
          <span class="text-micro text-white/70 font-mono">#${escapeHtml(lead.idlead)}</span>
        </div>
        <h2 class="text-lg font-semibold leading-tight tracking-tight break-words">${escapeHtml(lead.nome || 'Lead')}</h2>
        <p class="text-xs text-white/70 mt-1 font-mono">
          Captado em ${escapeHtml(lead.data_cad ? formatDate(lead.data_cad) : '—')}
        </p>
      </div>
    </div>`;

  const contato = `
    <div class="px-4 -mt-7 mb-3 relative z-10">
      <div class="rounded-xl bg-surface-raised border border-line shadow-elevated p-3 surface-gradient">
        <div class="grid grid-cols-2 gap-3">
          ${leadField('E-mail', lead.email, '<i class="far fa-envelope text-accent text-[9px] mr-1"></i>')}
          ${leadField('Telefone', lead.telefone, '<i class="fab fa-whatsapp text-data-pos text-[9px] mr-1"></i>')}
        </div>
      </div>
    </div>`;

  const captacao = leadSection('fas fa-bullhorn', 'Captação', `
    <div class="grid grid-cols-2 gap-3">
      ${leadField('Mídia', lead.midia_principal)}
      ${leadField('Origem', lead.origem)}
    </div>`);

  // Só existe para o lead que a Central Meta captou. Sem esse bloco o cartão
  // não finge que sabe a campanha de uma venda antiga.
  const campanhaBloco = campanha
    ? leadSection('fas fa-rectangle-ad', 'Anúncio', `
      <div class="space-y-2">
        ${leadField('Campanha', campanha)}
        ${lead.anuncio ? leadField('Criativo', lead.anuncio) : ''}
      </div>`)
    : '';

  // Quem atendeu o lead nem sempre é quem fechou a venda: o lead pode ter sido
  // captado por uma imobiliária e a reserva sair por outro corretor. As duas
  // colunas ficam lado a lado justamente para essa comparação.
  const bloco = (rotulo, corretor, imob) => `
    <div class="rounded-lg bg-surface-sunken border border-line p-2 min-w-0">
      <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1.5">${escapeHtml(rotulo)}</p>
      <div class="flex items-center gap-1.5 min-w-0">
        <i class="fas fa-user-tie text-ink-subtle text-[10px] shrink-0"></i>
        <p class="text-xs font-medium text-ink truncate">${escapeHtml(corretor || '—')}</p>
      </div>
      <div class="flex items-center gap-1.5 min-w-0 mt-1">
        <i class="fas fa-building text-ink-subtle text-[10px] shrink-0"></i>
        <p class="text-xs text-ink-muted truncate">${escapeHtml(imob || '—')}</p>
      </div>
    </div>`;

  const corretorVenda = reservaCorretorOf(sale);
  const imobVenda = reservaImobiliariaOf(sale);
  const temAlgum = lead.corretor?.nome || lead.imobiliaria?.nome || corretorVenda || imobVenda;

  const responsaveis = temAlgum
    ? leadSection('fas fa-users', 'Responsáveis', `
      <div class="grid grid-cols-2 gap-2">
        ${bloco('No lead', lead.corretor?.nome, lead.imobiliaria?.nome)}
        ${bloco('Na venda', corretorVenda, imobVenda)}
      </div>`)
    : '';

  // O cartão inteiro é o link: com o tippy interativo o mouse entra nele, então
  // clicar em qualquer parte tem que levar ao lead (não só o selo).
  return `
    <a href="${escapeHtml(leadLinkOf(sale))}" target="_blank" rel="noopener"
       class="block text-left no-underline cursor-pointer">
      ${banner}
      ${contato}
      <div class="px-4 pb-3 space-y-4">
        ${captacao}
        ${campanhaBloco}
        ${responsaveis}
      </div>
      <div class="px-4 py-2 border-t border-line bg-surface text-micro text-ink-subtle flex items-center gap-1.5">
        <i class="fas fa-arrow-up-right-from-square text-[9px]"></i>Clique para abrir na tela de Leads
      </div>
    </a>`;
};

// O cartão precisa de mais largura que o balão de texto e de um tema sem
// padding, senão o banner não encosta na borda. `interactive` mantém o cartão
// vivo quando o mouse entra nele (dá para ler com calma e clicar); a borda
// generosa e o atraso no fechamento cobrem o vão entre o selo e o cartão.
const leadTippyOf = (sale) => ({
  content: leadTooltipOf(sale),
  theme: 'menin-card',
  maxWidth: 360,
  interactive: true,
  interactiveBorder: 12,
  delay: [120, 180],
  // Com `interactive` o tippy passa a pendurar o balão no elemento PAI, e a
  // linha da venda tem overflow-hidden — o cartão sairia cortado. Voltar para
  // o body é o que o próprio tippy recomenda quando há clipping.
  appendTo: () => document.body,
});

// Deep link para /marketing/leads com o lead já aberto. O filtro por idlead
// ignora a janela de datas no servidor, então lead antigo abre igual.
const leadLinkOf = (sale) => {
  const lead = leadOf(sale);
  return lead ? `/marketing/leads?idlead=${encodeURIComponent(lead.idlead)}` : '#';
};

/* ===================== ajuste contábil ===================== */
// Máscara sobre o dado do contrato, aplicada no servidor. Aqui o selo funciona
// como o de distrato: informa que o número exibido passou por correção. Criar e
// remover ajuste é só para admin.
// Ações desta tela (lib/screenCapabilities.js no back): view segue a alçada,
// configure é admin. Lia `localStorage.getItem('role')` — qualquer um se dava
// admin no navegador. Ver composables/useCan.js.
const can = useCan('/comercial/relatorios/faturamento');

const saleIsAdjusted = (sale) => contractsStore.saleIsAdjusted(sale);

const ADJ_LABEL = {
  FI_DATE: 'data da inst. financeira',
  SERIE_ADD: 'série adicionada',
  SERIE_EDIT: 'série editada',
};

const adjustmentTooltipOf = (sale) => {
  const list = contractsStore.saleAdjustments(sale);
  if (!list.length) return '';
  const linhas = list.map((a) => {
    const alvo = ADJ_LABEL[a.type] || a.type;
    if (a.type === 'FI_DATE') {
      const de = a.original?.financial_institution_date;
      const para = a.payload?.financial_institution_date;
      return `${alvo}: ${de ? formatDate(de) : '—'} → ${para ? formatDate(para) : '—'}`;
    }
    const cod = a.payload?.condition_type_id || a.target_code || '—';
    return `${alvo} ${cod}`;
  });
  return `Ajuste contábil — ${linhas.join(' · ')}`;
};

const adjustmentModalOpen = ref(false);
const adjustmentTarget = ref({ contractId: null, initialType: '', initialTargetIndex: null });

const openAdjustment = (contract, { type = '', conditionIndex = null } = {}) => {
  adjustmentTarget.value = {
    contractId: contract?.contract_id ?? null,
    initialType: type,
    initialTargetIndex: conditionIndex,
  };
  adjustmentModalOpen.value = true;
};

// displayedConditions devolve payment_conditions NA MESMA ORDEM e só acrescenta
// itens no fim (comissão fora de contrato) ou substitui a lista inteira por um
// TR sintético. Ou seja: para condição real, o índice da tela é o índice do
// contrato — e é ele que o ajuste grava. Casar por código+valor, como uma versão
// anterior fazia, escolheria a linha errada quando o contrato tem duas séries
// iguais.
const canAdjustCondition = (contract, condition) =>
  can('configure')
  && !contract?._projection
  && !condition?.synthetic
  && !condition?._isCommission
  // Série já adicionada por ajuste: editar aqui empilharia um ajuste sobre o
  // outro. O lugar de corrigi-la é a engrenagem → Ajustes contábeis.
  && condition?._adjusted !== 'added';

const onAdjustmentSaved = async () => {
  // O ajuste pode ter movido a venda de mês: recarrega do servidor em vez de
  // remendar o objeto em memória.
  await contractsStore.refreshAfterAdjustment({
    view: 'detail',
    enterpriseId: props.enterprise?.enterprise_id ?? props.enterprise?.id ?? null,
  });
};

/* ===================== detalhe/condições ===================== */
const displayedConditions = (contract) => {
  const landOnly = contractsStore.isLandOnlyForContract(contract);
  const lv = Number(contract?.land_value) || 0;

  let list;
  if (landOnly && lv > 0) {
    list = [
      {
        condition_type_id: 'TR',
        condition_type_name: 'Terreno (TR) Campo de Observação',
        total_value: lv,
        installments_number: 1,
        synthetic: true,
      },
    ];
  } else {
    list = Array.isArray(contract?.payment_conditions)
      ? contract.payment_conditions
      : [];
  }

  const commission = commissionConditionFor(contract);
  if (commission && !list.some((pc) => pc.condition_type_id === 'COMISSAO_FORA')) {
    list = [...list, commission];
  }

  if (selectedSerie.value) {
    list = list.map((pc) => ({
      ...pc,
      _dimmed: String(pc.condition_type_id || '').trim().toUpperCase() !== selectedSerie.value,
    }));
  }

  return list;
};

const ruleFor = computed(() => contractsStore.enterpriseRuleFor);

/* ===================== comparison view (projection context) ===================== */
const achievementPctUnits = computed(() => {
  if (!props.projectionRow?.projectedUnits) return null;
  return parseFloat((totalSales.value / props.projectionRow.projectedUnits * 100).toFixed(1));
});

const achievementPctVgv = computed(() => {
  if (!props.projectionRow?.projectedVgv) return null;
  return parseFloat((totalValue.value / props.projectionRow.projectedVgv * 100).toFixed(1));
});

function achievementBarColor(pct) {
  if (pct == null) return 'bg-surface-sunken';
  const elapsed = props.timeElapsedPct || 0;
  const ratio = elapsed > 0 ? pct / elapsed : (pct >= 100 ? 1.2 : 0.5);
  if (ratio >= 1.1) return 'bg-data-pos';
  if (ratio >= 0.8) return 'bg-accent';
  if (ratio >= 0.4) return 'bg-data-warn';
  return 'bg-data-neg';
}

function achievementTextColor(pct) {
  if (pct == null) return 'text-ink-subtle';
  const elapsed = props.timeElapsedPct || 0;
  const ratio = elapsed > 0 ? pct / elapsed : (pct >= 100 ? 1.2 : 0.5);
  if (ratio >= 1.1) return 'text-data-pos';
  if (ratio >= 0.8) return 'text-accent';
  if (ratio >= 0.4) return 'text-data-warn';
  return 'text-data-neg';
}

const baseGross = (c) => contractsStore.contractBaseGross(c);
const baseNet = (c) => contractsStore.contractBaseNet(c);
const resolveCommissionPct = (contract) => contractsStore.commissionPctFor(contract);

const commissionConditionFor = (contract) => {
  const pct = resolveCommissionPct(contract);
  if (pct <= 0) return null;

  const base = contractsStore.isGross ? baseGross(contract) : baseNet(contract);
  const add = uplift(base, pct);
  if (add <= 0) return null;

  const pctLabel = Math.round(pct * 100);
  return {
    condition_type_id: 'COMISSAO_FORA',
    condition_type_name: `Comissão ${pctLabel}% (Fora de contrato)`,
    total_value: add,
    installments_number: 1,
    synthetic: false,
    _isCommission: true,
  };
};

const keyOf = (n) =>
  (n || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();


// ── Bridges para SegmentedControl ──────────────────────────
const valueModeOptions = [
  { value: 'net',   label: 'VGV' },
  { value: 'gross', label: 'VGV+DC' },
];

const valueModeProxy = computed({
  get: () => contractsStore.valueMode,
  set: (v) => contractsStore.setValueMode(v),
});


/* KPIs no primitivo do sistema. `raw` + `format` (em vez de valor pronto)
 * ligam o count-up: o número conta até o valor, que é o movimento de maior
 * efeito e menor risco da linguagem visual. */
const kpiItems = computed(() => [
  {
    key: 'total', label: 'Total de vendas', tone: 'accent', icon: 'fas fa-chart-line',
    raw: totalSales.value, format: (n) => Math.round(n).toLocaleString('pt-BR'),
    hint: 'no período',
  },
  {
    key: 'value', label: `Valor total ${valueModeLabel.value}`, tone: 'pos',
    icon: contractsStore.isNet ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar',
    raw: totalValue.value, format: formatCurrency,
    hint: showLandOnlyNote.value
      ? 'Cálculo pelo "Observação"'
      : (contractsStore.isNet ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)'),
  },
  {
    key: 'ticket', label: `Ticket médio ${valueModeLabel.value}`, tone: 'accent',
    icon: 'fas fa-receipt', raw: avgTicket.value, format: formatCurrency,
    hint: 'valor médio por venda',
  },
  {
    key: 'clients', label: 'Clientes únicos', tone: 'warn', icon: 'fas fa-users',
    raw: uniqueCustomers.value, format: (n) => Math.round(n).toLocaleString('pt-BR'),
    hint: 'pessoas distintas',
  },
]);

/* ===================== COLUNAS DA LISTAGEM =====================
 * Listagem é SEMPRE DataTable, inclusive dentro de modal: lista de cartões não
 * ordena, e ordenar é o que se quer numa lista de vendas.
 *
 * A prioridade decide a ORDEM no celular, nunca o que existe - empreendimento,
 * etapa e bloco ficam a um toque, em "Ver detalhes", e não sumiram.
 */
const columns = computed(() => {
  const cols = [
    { key: 'cliente', label: 'Cliente', priority: 1, sortable: true, truncate: false },
    { key: 'unidade', label: 'Unidade', priority: 1, sortable: true, width: '9rem' },
    { key: 'valor', label: `Valor (${valueModeLabel.value})`, priority: 1, numeric: true, sortable: true, width: '11rem' },
    { key: 'data', label: 'Data', priority: 2, sortable: true, width: '8rem' },
  ];
  if (hasRepasse.value) {
    cols.push(
      /* `truncate: false` nas colunas de NOME. O padrão da DataTable é cortar,
          e razão de sobra: numa tabela larga uma célula solta estica tudo. Só
          que nome de imobiliária e de empreendimento diverge no FIM
          ("...EMPREENDIMENTOS I" x "...EMPREENDIMENTOS III"), então cortar
          apaga exatamente o que identifica. Elas quebram em duas linhas. */
      { key: 'imobiliaria', label: 'Imobiliária', priority: 2, width: '15rem', truncate: false },
      { key: 'repasse', label: 'Repasse', priority: 2, width: '11rem' },
      { key: 'empreendimento', label: 'Empreendimento', priority: 3, truncate: false },
      { key: 'etapa', label: 'Etapa', priority: 3 },
      { key: 'bloco', label: 'Bloco', priority: 3 },
    );
  }
  return cols;
});

const onSortBy = (key) => { sortBy.value = key || 'valor'; };
const onSortDir = (dir) => { sortDir.value = dir; };

/* Um caminho de filtro só: busca e série moram no mesmo painel, atrás do botão
 * Filtros, com o selo de quantos estão ativos. */
const filtrosAtivos = computed(() =>
  (searchTerm.value ? 1 : 0) + (selectedSerie.value ? 1 : 0));

const limparFiltros = () => { searchTerm.value = ''; selectedSerie.value = ''; };

const closeModal = () => emit('close');
</script>

<template>
  <!-- `screen`: listagem de registros toma a tela inteira. Um cartao flutuando
       no meio da tela desperdica area justamente onde ha muita linha para ler;
       e o padrao de todo modal de listagem do Office. -->
  <!-- Sem `hide-close`: o Fechar mora no CANTO DE CIMA, como em todo modal do
       Office. Ele estava só no rodapé, no canto de baixo à direita - exatamente
       onde a bolinha da Eme flutua, então clicar em Fechar acertava a Eme. -->
  <Modal :open="true" size="screen" :padded="false" @close="closeModal">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-chart-line text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate" :title="enterprise.name">{{ enterprise.name }}</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="tabular-nums text-ink">{{ totalSales }}</span> venda(s) &middot;
            <span class="tabular-nums text-ink">{{ formatCurrency(totalValue) }}</span> &middot;
            <span class="tabular-nums text-ink">{{ uniqueCustomers }}</span> cliente(s)
          </p>
        </div>
        <div class="ml-auto shrink-0 flex items-center gap-2">
          <SegmentedControl v-model="valueModeProxy" :options="valueModeOptions" size="sm" />
          <IconButton icon="fas fa-download" size="sm" label="Exportar dados" @click="open = true" />
        </div>
      </div>
    </template>

    <!-- Este e o container que rola, e e ele que o scroll incremental observa. -->
    <div ref="scrollRoot" class="h-full overflow-y-auto">

      <div class="px-4 sm:px-5 pt-4">
        <StatRow :items="kpiItems" :cols="{ sm: 2, md: 2, lg: 4 }" />
      </div>

      <!-- Realizado x Projetado: era um "modo" no alternador; virou secao, na
           mesma pagina, acima da lista que ela resume. -->
      <div v-if="projectionRow" class="mt-4 border-t border-line px-4 sm:px-5 pt-4 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="text-sm font-semibold text-ink">Realizado × Projetado</h4>
            <span class="text-xs text-ink-subtle font-mono">
              {{ timeElapsedPct > 0 ? `${timeElapsedPct.toFixed(0)}% do mês decorrido` : 'Início do período' }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Unidades -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-key text-accent"></i>
                <span class="text-sm font-semibold text-ink">Vendas (unidades)</span>
              </div>
              <div class="flex items-end gap-1 mb-1">
                <span class="text-3xl font-bold text-ink tabular-nums">{{ totalSales }}</span>
                <span class="text-base text-ink-subtle mb-0.5 font-mono">/ {{ projectionRow.projectedUnits || '—' }}</span>
              </div>
              <p class="text-xs text-ink-subtle mb-3">realizadas / projetadas</p>
              <div class="w-full h-2.5 bg-surface-sunken rounded-full overflow-hidden mb-1">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="achievementBarColor(achievementPctUnits)"
                  :style="{ width: Math.min(achievementPctUnits ?? 0, 100) + '%' }"></div>
              </div>
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="font-semibold tabular-nums" :class="achievementTextColor(achievementPctUnits)">
                  {{ achievementPctUnits != null ? achievementPctUnits.toFixed(1) + '%' : '—' }}
                </span>
                <span v-if="timeElapsedPct > 0" class="text-ink-subtle font-mono">
                  meta parcial: {{ projectionRow.projectedUnits ? Math.ceil(projectionRow.projectedUnits * timeElapsedPct / 100) : '—' }} un.
                </span>
              </div>
            </Surface>

            <!-- VGV -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-bullseye text-accent"></i>
                <span class="text-sm font-semibold text-ink">{{ valueModeLabel }}</span>
              </div>
              <div class="flex items-end gap-1 mb-1">
                <span class="text-xl font-bold text-ink tabular-nums">{{ formatCurrency(totalValue) }}</span>
              </div>
              <p class="text-xs text-ink-subtle mb-1 font-mono">de {{ formatCurrency(projectionRow.projectedVgv || 0) }} projetado</p>
              <div class="w-full h-2.5 bg-surface-sunken rounded-full overflow-hidden mb-1">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="achievementBarColor(achievementPctVgv)"
                  :style="{ width: Math.min(achievementPctVgv ?? 0, 100) + '%' }"></div>
              </div>
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="font-semibold tabular-nums" :class="achievementTextColor(achievementPctVgv)">
                  {{ achievementPctVgv != null ? achievementPctVgv.toFixed(1) + '%' : '—' }}
                </span>
                <span v-if="timeElapsedPct > 0 && projectionRow.projectedVgv" class="text-ink-subtle font-mono">
                  meta parcial: {{ formatCurrency(projectionRow.projectedVgv * timeElapsedPct / 100) }}
                </span>
              </div>
            </Surface>
          </div>

          <!-- Time-elapsed reference -->
          <div v-if="timeElapsedPct > 0" class="flex items-center gap-3 text-xs text-ink-subtle font-mono">
            <span class="flex-none">0%</span>
            <div class="relative flex-1 h-1 bg-surface-sunken rounded-full">
              <div class="absolute top-0 left-0 h-full bg-accent/60 rounded-full"
                :style="{ width: timeElapsedPct + '%' }"></div>
              <div class="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-accent rounded-full border border-surface-raised"
                :style="{ left: 'calc(' + timeElapsedPct + '% - 4px)' }"></div>
            </div>
            <span class="flex-none">100%</span>
            <span class="flex-none text-accent font-semibold">{{ timeElapsedPct.toFixed(0) }}% do mês</span>
          </div>
      </div>

      <!-- UM caminho de filtro: busca e serie no mesmo painel, fechado por
           padrao e com o selo de quantos estao ativos. -->
      <div class="px-4 sm:px-5 pt-4">
        <FilterBar :active-count="filtrosAtivos" :cols="2" auto-apply @clear="limparFiltros">
          <Input v-model="searchTerm" label="Busca livre"
            placeholder="Cliente &middot; imobiliaria &middot; repasse &middot; empreendimento &middot; etapa &middot; bloco &middot; unidade &middot; data &middot; valor"
            iconLeft="fas fa-magnifying-glass" />
          <Select v-model="selectedSerie" :options="serieSelectOptions" label="Serie" />
        </FilterBar>
      </div>

      <Export v-model="open" :source="filteredSales" title="Vendas"
        :subtitle="enterprise?.name || ''"
        initial-delimiter=";" initial-array-mode="join"
        :filters="{
          'Empreendimento': enterprise?.name || '',
          'Modo de valor': valueModeLabel,
          'Serie': selectedSerie || 'Todas',
          'Busca': searchTerm || '-',
        }"
        :preselect="[
          'customer_id', 'customer_name', 'unit_name', 'enterprise_name',
          'financial_institution_date', 'total_value_gross', 'total_value_net',
          'contracts.contract_id'
        ]" />

      <div class="px-4 sm:px-5 py-4">
        <DataTable :columns="columns" :rows="inc.visiveis.value" row-key="_key" expandable manual-sort
          :sort-by="sortBy" :sort-dir="sortDir"
          empty-icon="fas fa-file-invoice" empty-title="Nenhuma venda encontrada"
          empty-text="Ajuste a busca ou a serie para ver resultados."
          @update:sortBy="onSortBy" @update:sortDir="onSortDir">

          <template #cell-cliente="{ row }">
            <span class="flex items-center gap-2 min-w-0 flex-wrap">
              <span class="font-semibold text-ink">{{ customerNameOf(row) }}</span>
              <span v-if="row.customer_id" class="text-micro text-ink-subtle tabular-nums">#{{ row.customer_id }}</span>
              <a v-if="leadOf(row)" :href="leadLinkOf(row)" target="_blank" rel="noopener"
                @click.stop v-tippy="leadTippyOf(row)"
                class="shrink-0 inline-flex items-center gap-1 rounded-full border border-accent/25
                       bg-accent-soft px-2 py-0.5 text-micro font-semibold uppercase tracking-wide
                       text-accent transition-all duration-120 ease-out-expo
                       hover:border-accent/60 hover:ring-2 hover:ring-accent-ring/25">
                <i class="fas fa-bullhorn"></i>Lead
              </a>
              <Badge v-if="saleIsDistrato(row)" variant="warning" size="sm" v-tippy="distratoTooltipOf(row)">
                <i class="fas fa-file-circle-xmark text-micro"></i>Distratada
              </Badge>
              <Badge v-if="saleIsAdjusted(row)" variant="info" size="sm" v-tippy="adjustmentTooltipOf(row)">
                <i class="fas fa-wand-magic-sparkles text-micro"></i>Ajustada
              </Badge>
              <Badge v-if="saleIsProjection(row)" variant="success" size="sm">
                <i class="fas fa-chart-line text-micro"></i>Projecao
              </Badge>
              <span v-if="row.contracts?.[0]?.associates?.[0]"
                class="block w-full text-micro text-ink-subtle break-words">
                {{ row.contracts[0].associates[0].name }} #{{ row.contracts[0].associates[0].customer_id }}
              </span>
            </span>
          </template>

          <template #cell-unidade="{ row }">
            <span class="tabular-nums">{{ row.unit_name || reservaUnitOf(row) }}</span>
          </template>

          <template #cell-valor="{ row }">
            <span class="font-semibold text-data-pos">{{ formatCurrency(getSaleValue(row)) }}</span>
          </template>

          <template #cell-data="{ row }">
            <span class="tabular-nums">{{ formatDate(row.financial_institution_date || reservaDateOf(row)) }}</span>
          </template>

          <template #cell-imobiliaria="{ row }">
            <span class="inline-flex items-start gap-1.5 min-w-0">
              <i class="fas fa-store text-micro text-accent shrink-0 mt-1"></i>
              <span class="break-words">{{ imobiliariaOf(row) }}</span>
            </span>
          </template>

          <template #cell-repasse="{ row }">
            <a :href="repasseLinkOf(row)" target="_blank" rel="noopener" @click.stop
              v-tippy="repasseTooltipOf(row)"
              class="inline-flex items-center gap-1.5 min-w-0 hover:text-accent transition-colors duration-120">
              <img src="/CVLogo.png" alt="CV CRM" class="h-3.5 grayscale hover:grayscale-0 shrink-0" />
              <span class="truncate">{{ repasseStatusOf(row) || '-' }}</span>
            </a>
          </template>

          <template #cell-empreendimento="{ row }">{{ empreendimentoOf(row) }}</template>
          <template #cell-etapa="{ row }">{{ etapaOf(row) }}</template>
          <template #cell-bloco="{ row }">{{ blocoOf(row) }}</template>

          <!-- O registro inteiro abre NA PROPRIA LINHA: a ordenacao e as
               colunas continuam valendo, e ninguem troca de tela para ver as
               condicoes de pagamento. -->
          <template #expanded="{ row }">
            <div class="space-y-3 pt-3">
        <div v-for="contract in row.contracts" :key="contract.contract_id" class="space-y-2">
          <div class="rounded-lg border bg-surface-raised p-3"
            :class="contract._projection ? 'border-l-4 border-l-data-pos border-y border-r border-line' : 'border-line'">
            <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span class="text-xs font-mono text-ink-muted">
                {{ contract._projection ? 'Reserva' : 'Contrato' }}
                <span class="text-ink font-semibold">#{{ contract.contract_id }}</span>
              </span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-ink-subtle font-mono">
                  Participação: <span class="text-ink">{{ contract.participation_percentage || 100 }}%</span>
                </span>
                <!-- Ajuste contábil: admin corrige o dado sem tocar no Sienge -->
                <template v-if="can('configure') && !contract._projection">
                  <button type="button" v-tippy="'Corrigir a data da instituição financeira deste contrato'"
                    class="text-micro text-ink-subtle hover:text-accent transition-colors"
                    @click.stop="openAdjustment(contract, { type: 'FI_DATE' })">
                    <i class="far fa-calendar-check text-[10px]"></i> Ajustar data
                  </button>
                  <button type="button" v-tippy="'Adicionar uma série que não veio do Sienge'"
                    class="text-micro text-ink-subtle hover:text-accent transition-colors"
                    @click.stop="openAdjustment(contract, { type: 'SERIE_ADD' })">
                    <i class="fas fa-circle-plus text-[10px]"></i> Add série
                  </button>
                </template>
              </div>
            </div>

            <!-- Data ajustada: mostra de onde veio, senão o número muda sem explicação -->
            <div v-if="contract.original_financial_institution_date
              && contract.original_financial_institution_date !== contract.financial_institution_date"
              class="mb-3 text-micro text-accent font-mono">
              <i class="fas fa-wand-magic-sparkles text-[9px]"></i>
              Data ajustada: {{ formatDate(contract.original_financial_institution_date) }}
              → {{ formatDate(contract.financial_institution_date) }}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5"
              :key="`${contractsStore.valueMode}-${contract.contract_id}`">
              <div v-for="(condition, idx) in displayedConditions(contract)"
                :key="`${contract.contract_id}-${condition.synthetic ? 'SYNTH' : 'REAL'}-${condition.condition_type_id || 'NA'}-${idx}-${contractsStore.valueMode}`"
                class="rounded-lg p-2.5 border bg-surface-sunken transition-opacity"
                :class="[
                  isDiscount(condition)
                    ? 'border-l-4 border-l-data-neg border-y border-r border-line'
                    : 'border-l-4 border-l-data-pos border-y border-r border-line',
                  condition._isCommission ? '!border-l-data-warn' : '',
                  condition._adjusted ? '!border-l-accent' : '',
                  condition._dimmed ? 'opacity-30' : '',
                ]">
                <div class="text-xs font-medium text-ink mb-0.5 flex items-center gap-1.5 flex-wrap">
                  <span class="truncate">{{ condition.condition_type_name || 'Não informado' }}</span>
                  <Badge v-if="condition.synthetic" variant="warning" size="sm">Observação</Badge>
                  <Badge v-if="condition._adjusted === 'added'" variant="info" size="sm"
                    v-tippy="`Série adicionada manualmente — ${condition._adjustment_reason || 'sem motivo registrado'}`">
                    Adicionada
                  </Badge>
                  <Badge v-else-if="condition._adjusted === 'edited'" variant="info" size="sm"
                    v-tippy="`Série editada — ${condition._adjustment_reason || 'sem motivo registrado'}`">
                    Editada
                  </Badge>
                  <button v-if="condition.synthetic" class="text-ink-subtle hover:text-ink transition-colors"
                    v-tippy="'Atualização D-1 às 07h'">
                    <i class="fas fa-circle-info text-[10px]"></i>
                  </button>
                  <button v-if="canAdjustCondition(contract, condition)"
                    class="ml-auto text-ink-subtle hover:text-accent transition-colors"
                    v-tippy="'Ajustar esta série (contábil)'"
                    @click.stop="openAdjustment(contract, { type: 'SERIE_EDIT', conditionIndex: idx })">
                    <i class="fas fa-pen text-[10px]"></i>
                  </button>
                </div>
                <div class="text-base font-semibold tabular-nums"
                  :class="isDiscount(condition) ? 'text-data-neg' : 'text-data-pos'">
                  {{ formatCurrency(condition.total_value) }}
                  <span v-if="isDiscount(condition)" class="text-micro ml-1 text-ink-subtle font-normal">(desconto)</span>
                </div>
                <div v-if="condition._adjustment_before
                  && Number(condition._adjustment_before.total_value) !== Number(condition.total_value)"
                  class="text-micro text-ink-subtle tabular-nums line-through">
                  {{ formatCurrency(condition._adjustment_before.total_value) }}
                </div>
                <div class="flex items-center gap-2 mt-0.5 text-micro font-mono text-ink-subtle">
                  <span>Cód: {{ condition.condition_type_id || '—' }}</span>
                  <span v-if="condition.installments_number">· {{ condition.installments_number }}x parcelas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
            </div>
          </template>
        </DataTable>

        <!-- Gatilho do scroll incremental: nada de paginação. A sentinela é
             registrada por `observar`, não por um ref nomeado - é assim que o
             composable enxerga o elemento. -->
        <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
          class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
          <Spinner size="sm" />
          carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
        </div>
      </div>
    </div>

  </Modal>

  <!-- Ajuste contabil (admin) - sobreposto ao detalhe -->
  <ContractAdjustmentModal
    :open="adjustmentModalOpen"
    :contract-id="adjustmentTarget.contractId"
    :initial-type="adjustmentTarget.initialType"
    :initial-target-index="adjustmentTarget.initialTargetIndex"
    @close="adjustmentModalOpen = false"
    @saved="onAdjustmentSaved" />
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
