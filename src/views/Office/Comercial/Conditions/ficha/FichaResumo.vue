<script setup>
/**
 * Resumo da ficha comercial, por módulo.
 *
 * Ordem de leitura: preço de venda e condição padrão no topo; depois
 * disponibilidade com o espelho clicável; regras; e os detalhes em painéis.
 * Quase tudo vem das FONTES do módulo (GET /conditions/:id/modules/:mid/fontes):
 * tabela, preço, fluxo, regra de reservas, estoque e avaliação são do CV. Da
 * ficha em si saem só as decisões do Office (quem paga a documentação,
 * comissão, campanhas, responsáveis).
 *
 * O formato muda com o tipo de produto: no MCMV o preço é o da faixa mais
 * comum (padrão, esquina) com avaliação e teto; no fluxo (30/70, lote) é a
 * faixa por tipologia e a condição mostra o recurso próprio até a entrega.
 */
import { ref, computed, watch } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Modal from '@/components/UI/Modal.vue';
import IconButton from '@/components/UI/IconButton.vue';
import EspelhoUnidades from './EspelhoUnidades.vue';
import UnidadeModal from './UnidadeModal.vue';
import { buildFichaPrintHtml } from './printFicha';
import { computeCostSummary, itbiPayer } from '../components/costSummary';
import {
  brl, brl2, num, pct, area, data, mesCurto, aVenda,
  COR_SERIE, linhaFluxo, regrasDoCv,
} from './fichaUtils';

const props = defineProps({
  detail: { type: Object, required: true },
  modules: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
  officeUsers: { type: Array, default: () => [] },
  correspondents: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false },
});
const emit = defineEmits(['update:activeIndex']);
const store = useConditionsStore();

const idx = computed({
  get: () => Math.min(props.activeIndex, Math.max(0, props.modules.length - 1)),
  set: (v) => emit('update:activeIndex', v),
});
const mod = computed(() => props.modules[idx.value] || null);

// ── fontes do módulo ───────────────────────────────────────
const fontes = ref(null);
const carregando = ref(false);
const erro = ref('');
const lendoRegra = ref(false);
async function carregar(force = false) {
  if (!mod.value?.id || !props.detail?.id) { fontes.value = null; return; }
  carregando.value = true; erro.value = '';
  try {
    fontes.value = await store.fetchFontes(props.detail.id, mod.value.id, { force });
  } catch (e) {
    erro.value = e.message || 'Não foi possível montar os dados do módulo.';
    fontes.value = null;
  } finally {
    carregando.value = false;
  }
}
watch(() => [props.detail?.id, mod.value?.id], () => carregar(), { immediate: true });

async function lerRegra() {
  lendoRegra.value = true;
  try {
    fontes.value = await store.refreshRegraCv(props.detail.id, mod.value.id);
    store.notify('Regra de reservas lida no CV.');
  } catch (e) {
    store.notify(e.message || 'Não foi possível ler a regra no CV.', 'error');
  } finally {
    lendoRegra.value = false;
  }
}

// ── derivados ──────────────────────────────────────────────
const tipo = computed(() => fontes.value?.tipo_produto || null);
const mcmv = computed(() => tipo.value?.pagamento === 'mcmv');
const horizontal = computed(() => fontes.value?.estoque?.modo === 'horizontal');
const unidadeNome = computed(() => (horizontal.value ? ['lote', 'lotes'] : ['unidade', 'unidades']));
const preco = computed(() => fontes.value?.preco || null);
const condicao = computed(() => fontes.value?.condicao || null);
const fluxo = computed(() => condicao.value?.fluxo || null);
const comissaoPct = computed(() => (mod.value?.commission_pct != null ? Number(mod.value.commission_pct) : null));
const custos = computed(() => (mod.value ? computeCostSummary(mod.value) : null));

const hoje = new Date().toISOString().slice(0, 10);
const campanhasVigentes = computed(() => (mod.value?.campaigns || [])
  .filter((c) => c.is_active !== false && (!c.end_date || String(c.end_date).slice(0, 10) >= hoje) && (!c.start_date || String(c.start_date).slice(0, 10) <= hoje)));

const faixasExtras = computed(() => (preco.value?.faixas || []).slice(1, 4));

// Barra do fluxo: cada série com sua cor fixa, proporcional ao total.
const barra = computed(() => (fluxo.value?.linhas || []).map((l) => ({ ...l, cor: COR_SERIE[l.tipo] })));

// ── disponibilidade ────────────────────────────────────────
const resumo = computed(() => fontes.value?.estoque?.resumo || null);
const ritmo = computed(() => {
  const meses = (fontes.value?.reservas_mes || []).slice(0, -1).slice(-3);   // 3 meses fechados
  const soma = meses.reduce((s, m) => s + Math.max(0, m.ficaram), 0);
  return meses.length ? soma / meses.length : 0;
});
const kpis = computed(() => {
  const r = resumo.value; if (!r) return [];
  const aVendaTot = r.a_venda ?? r.disponiveis;
  const vendidoPct = r.unidades ? Math.round(((r.vendidas + r.reservadas) / r.unidades) * 100) : null;
  return [
    { k: 'd', rotulo: 'À venda', valor: aVendaTot, nota: r.estoque_comercial ? `${r.disponiveis} livres + ${r.estoque_comercial} seguradas` : `de ${r.unidades}`, destaque: true, cor: 'bg-data-pos' },
    { k: 'r', rotulo: 'Reservados', valor: r.reservadas, nota: 'em análise ou assinatura', cor: 'bg-data-warn' },
    { k: 'v', rotulo: 'Vendidos', valor: r.vendidas, nota: vendidoPct != null ? `${vendidoPct}% vendido ou reservado` : '', cor: 'bg-data-neg' },
    { k: 'b', rotulo: 'Bloqueados', valor: (r.bloqueadas || 0) - (r.estoque_comercial || 0), nota: 'fora da venda', cor: 'bg-surface-sunken border border-line' },
    { k: 't', rotulo: 'Estoque dura', valor: ritmo.value > 0 ? `${num(aVendaTot / ritmo.value, 1)} meses` : '-', nota: ritmo.value > 0 ? `${num(ritmo.value, 0)} reservas por mês` : 'sem reservas nos últimos meses' },
  ];
});
const barraEstoque = computed(() => {
  const r = resumo.value; if (!r || !r.unidades) return [];
  const bloq = (r.bloqueadas || 0) - (r.estoque_comercial || 0);
  return [
    { k: 'v', n: r.vendidas, rotulo: `${r.vendidas} vendidos`, cls: 'bg-data-neg text-ink-inverted' },
    { k: 'r', n: r.reservadas, rotulo: `${r.reservadas} reservados`, cls: 'bg-data-warn text-ink-inverted' },
    { k: 'd', n: r.a_venda ?? r.disponiveis, rotulo: `${r.a_venda ?? r.disponiveis} à venda`, cls: 'bg-data-pos text-ink-inverted' },
    { k: 'b', n: bloq, rotulo: bloq > r.unidades * 0.08 ? `${bloq} bloqueados` : '', cls: 'bg-surface-sunken text-ink-muted' },
  ].filter((s) => s.n > 0);
});
const demanda = computed(() => {
  if (!mcmv.value || !mod.value?.min_demand || !resumo.value?.unidades) return null;
  const vendidas = (resumo.value.vendidas || 0) + (resumo.value.reservadas || 0);
  return { n: Number(mod.value.min_demand), left: Math.min(100, (Number(mod.value.min_demand) / resumo.value.unidades) * 100), atingida: vendidas >= Number(mod.value.min_demand) };
});

const unidadeAberta = ref(null);

// ── regras ─────────────────────────────────────────────────
const regrasCv = computed(() => regrasDoCv(fontes.value?.regra_cv));
const proSoluto = computed(() => {
  const r = fontes.value?.regra_cv; if (!r) return null;
  const partes = [];
  if (r.pro_soluto_max_pct) partes.push(`até ${num(r.pro_soluto_max_pct)}% do VGV`);
  if (r.pro_soluto_limite_valor) partes.push(`até ${brl(r.pro_soluto_limite_valor)}`);
  return partes.length ? partes.join(' · ') : null;
});
const regrasOffice = computed(() => {
  const m = mod.value; if (!m) return [];
  const out = [];
  if (m.installment_until_habite_se || m.installment_post_habite_se) {
    out.push({ rotulo: 'Correção', valor: [m.installment_until_habite_se && `${m.installment_until_habite_se.trim()} até o habite-se`, m.installment_post_habite_se && `${m.installment_post_habite_se.trim()} depois`].filter(Boolean).join(' · ') });
  }
  if (mcmv.value && m.min_demand) out.push({ rotulo: 'Demanda mínima', valor: `${num(m.min_demand)} ${unidadeNome.value[1]}`, nota: /fracion/i.test(m.min_demand_note || '') ? 'assinatura fracionada' : '' });
  if (m.delivery_deadline_months) out.push({ rotulo: 'Prazo de obra', valor: `${m.delivery_deadline_months} meses`, nota: (m.delivery_deadline_note || '').trim() });
  return out;
});

// ── pessoas ────────────────────────────────────────────────
const nomeUsuario = (id) => {
  const u = props.officeUsers.find((x) => Number(x.id) === Number(id));
  return u ? String(u.username || u.name || '').replace(/\s*-\s*Menin$/i, '') : null;
};
const pessoas = computed(() => {
  const m = mod.value; if (!m) return [];
  const corr = props.correspondents.find((c) => Number(c.idusuario) === Number(m.correspondent_id));
  return [
    ['Gestor', m.manager_user_id ? nomeUsuario(m.manager_user_id) : (m.manager_name || null)],
    ['Administrativo', m.adm_user_id ? nomeUsuario(m.adm_user_id) : null],
    ['Correspondente', corr?.nome || null],
    ['CCA', m.cca_company_name ? String(m.cca_company_name).trim() : null],
    ['Certificado digital', m.has_digital_cert ? (m.digital_cert_provider || null) : null],
    ['Registro do contrato', { cca: 'CCA', menin: 'Menin', outros: m.outros_contact_name || 'outros' }[m.contract_registration_by] || null],
  ].filter(([, v]) => v);
});

// Reservas por mês (barra empilhada: ficaram + caíram)
const meses = computed(() => {
  const ms = fontes.value?.reservas_mes || [];
  const max = Math.max(1, ...ms.map((m) => m.feitas));
  return ms.map((m) => ({ ...m, hOk: (Math.max(0, m.ficaram) / max) * 100, hCaiu: (m.caidas / max) * 100 }));
});

// ── impressão / DocuSign ───────────────────────────────────
// Monta o HTML de TODOS os módulos (cada um com as suas fontes), igual ao
// contrato antigo do SummaryExport: o SignaturePanel manda isso ao DocuSign.
async function buildPrintHtml() {
  const itens = [];
  for (const m of props.modules) {
    let f = null;
    try { f = await store.fetchFontes(props.detail.id, m.id); } catch { f = null; }
    itens.push({ modulo: m, fontes: f });
  }
  return buildFichaPrintHtml({ ficha: props.detail, itens, pessoas: { officeUsers: props.officeUsers, correspondents: props.correspondents } });
}
// Impressão: de um iframe oculto na própria página (popup some com bloqueador);
// o popup fica como plano B.
const imprimindo = ref(false);
async function printModule() {
  if (imprimindo.value) return;
  imprimindo.value = true;
  try {
    const html = await buildPrintHtml();
    const quadro = document.createElement('iframe');
    quadro.setAttribute('aria-hidden', 'true');
    quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(quadro);
    const doc = quadro.contentDocument;
    if (!doc) { document.body.removeChild(quadro); return imprimirEmPopup(html); }
    doc.open(); doc.write(html); doc.close();
    await new Promise((resolve) => {
      if (quadro.contentWindow?.document.readyState === 'complete') return resolve();
      quadro.onload = resolve;
      setTimeout(resolve, 3000);
    });
    quadro.contentWindow.focus();
    quadro.contentWindow.print();
    const limpar = () => { if (quadro.parentNode) document.body.removeChild(quadro); };
    quadro.contentWindow.addEventListener('afterprint', limpar, { once: true });
    setTimeout(limpar, 60_000);
  } catch (e) {
    store.notify(e.message || 'Não foi possível montar o documento.', 'error');
  } finally {
    imprimindo.value = false;
  }
}
function imprimirEmPopup(html) {
  const janela = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!janela) { store.notify('Popup bloqueado pelo navegador. Permita popups para este site e tente de novo.', 'error'); return; }
  janela.document.open(); janela.document.write(html); janela.document.close();
  janela.onload = () => setTimeout(() => { janela.focus(); janela.print(); janela.addEventListener('afterprint', () => janela.close()); }, 400);
}

// Prévia do documento: o MESMO HTML do PDF e da assinatura.
const docAberto = ref(false);
const docHtml = ref('');
async function openDoc() {
  docAberto.value = true;
  docHtml.value = '';
  try { docHtml.value = await buildPrintHtml(); }
  catch (e) { store.notify(e.message || 'Não foi possível montar o documento.', 'error'); docAberto.value = false; }
}

defineExpose({ buildPrintHtml, printModule, openDoc, recarregar: () => carregar(true) });
</script>

<template>
  <div class="space-y-4">
    <!-- módulos -->
    <div v-if="modules.length > 1" class="flex flex-wrap gap-2" role="tablist" aria-label="Módulos da ficha">
      <button v-for="(m, i) in modules" :key="m.id || i" type="button" role="tab" :aria-selected="i === idx"
        class="h-10 px-4 rounded-lg border text-sm font-medium focus-ring transition-colors"
        :class="i === idx ? 'bg-ink text-surface border-ink' : 'bg-surface border-line text-ink-muted hover:text-ink'"
        @click="idx = i">{{ m.module_name || `Módulo ${i + 1}` }}</button>
    </div>

    <Skeleton v-if="carregando && !fontes" variant="card" :lines="6" />
    <EmptyState v-else-if="erro" icon="fas fa-triangle-exclamation" title="Não deu para montar o resumo" :description="erro">
      <template #actions><Button size="sm" @click="carregar(true)">Tentar de novo</Button></template>
    </EmptyState>

    <template v-else-if="fontes && mod">
      <!-- 1. Preço e condição padrão -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section class="lg:col-span-5 rounded-2xl bg-surface-sunken p-5 flex flex-col gap-1" aria-labelledby="ficha-preco">
          <h2 id="ficha-preco" class="metric-label">Preço de venda</h2>
          <template v-if="mcmv && preco?.principal">
            <p class="text-metric-xl font-bold tabular-nums text-ink mt-2">{{ brl(preco.principal.valor) }}</p>
            <p class="text-sm text-ink-muted">{{ preco.principal.qtd }} {{ unidadeNome[preco.principal.qtd > 1 ? 1 : 0] }} à venda neste preço</p>
            <ul v-if="faixasExtras.length" class="mt-3 space-y-1">
              <li v-for="f in faixasExtras" :key="f.valor" class="text-sm text-ink-muted">
                <b class="text-metric-sm text-ink tabular-nums mr-1.5">{{ brl(f.valor) }}</b>{{ f.qtd }} {{ unidadeNome[f.qtd > 1 ? 1 : 0] }}
              </li>
            </ul>
          </template>
          <template v-else-if="preco">
            <p class="text-metric-xl font-bold tabular-nums text-ink mt-2">{{ brl(preco.min) }}</p>
            <p class="text-sm text-ink-muted">menor {{ unidadeNome[0] }} à venda</p>
            <p class="mt-3 text-sm text-ink-muted"><b class="text-metric-sm text-ink tabular-nums mr-1.5">{{ brl(preco.max) }}</b>maior à venda</p>
          </template>
          <p v-else class="text-sm text-ink-muted mt-2">Nenhuma {{ unidadeNome[0] }} com preço na tabela vigente.</p>

          <dl class="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <template v-if="mcmv">
              <div v-if="preco?.principal?.valor_tabela"><dt class="text-micro text-ink-muted">Tabela no CV</dt><dd class="font-semibold tabular-nums">{{ brl(preco.principal.valor_tabela) }}</dd></div>
              <div v-if="fontes.avaliacao?.mediana"><dt class="text-micro text-ink-muted">Avaliação Caixa</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.avaliacao.mediana) }}</dd></div>
              <div v-if="fontes.avaliacao?.teto"><dt class="text-micro text-ink-muted">Teto Faixa {{ fontes.avaliacao.faixa }}</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.avaliacao.teto) }}</dd></div>
            </template>
            <template v-else>
              <div v-for="t in (preco?.tipologias || []).slice(0, 3)" :key="t.area || 0">
                <dt class="text-micro text-ink-muted">{{ area(t.area) }}<template v-if="t.andar_min != null"> · {{ t.andar_min === t.andar_max ? (t.andar_min === 0 ? 'térreo' : `${t.andar_min}º`) : `${t.andar_min || 'térreo'}${t.andar_min ? 'º' : ''} ao ${t.andar_max}º` }}</template></dt>
                <dd class="font-semibold tabular-nums">{{ t.min === t.max ? brl(t.min) : `${brl(t.min)} a ${brl(t.max)}` }}</dd>
              </div>
              <div v-if="preco?.m2_medio"><dt class="text-micro text-ink-muted">Preço médio do m²</dt><dd class="font-semibold tabular-nums">{{ brl(preco.m2_medio) }}</dd></div>
            </template>
            <div v-if="fontes.tabela"><dt class="text-micro text-ink-muted">Tabela vale até</dt><dd class="font-semibold tabular-nums">{{ fontes.tabela.data_vigencia_ate ? data(fontes.tabela.data_vigencia_ate) : 'sem prazo' }}</dd></div>
          </dl>
        </section>

        <section class="lg:col-span-7 rounded-2xl border border-line p-5 flex flex-col gap-3" aria-labelledby="ficha-condicao">
          <h2 id="ficha-condicao" class="metric-label">Condição padrão<template v-if="condicao"> · {{ condicao.unidade.nome }}</template></h2>
          <template v-if="fluxo?.linhas.length">
            <div class="flex h-8 rounded-lg overflow-hidden" role="img" :aria-label="barra.map((l) => `${l.rotulo} ${pct(l.pct)}`).join(', ')">
              <div v-for="(l, i) in barra" :key="i" :class="l.cor" class="h-full flex items-center justify-center text-micro font-semibold text-ink-inverted min-w-[6px] overflow-hidden whitespace-nowrap"
                :style="{ flex: `${l.total} 0 0` }">{{ l.pct >= 9 ? pct(l.pct) : '' }}</div>
            </div>
            <dl class="text-sm">
              <div v-for="(l, i) in fluxo.linhas" :key="i" class="grid grid-cols-[12px_minmax(0,1fr)_auto] sm:grid-cols-[12px_minmax(0,1fr)_auto_auto] gap-x-3 items-baseline py-1.5 border-b border-line-subtle">
                <i class="w-2.5 h-2.5 rounded-sm self-center" :class="COR_SERIE[l.tipo]"></i>
                <dt class="text-ink">{{ l.rotulo }}</dt>
                <dd class="hidden sm:block text-micro text-ink-subtle text-right">{{ linhaFluxo(l) }}<template v-if="l.primeiro_vencimento"> · {{ l.tipo === 'financiamento' || l.tipo === 'subsidio' ? 'na entrega' : `a partir de ${data(l.primeiro_vencimento)}` }}</template></dd>
                <dd class="font-semibold tabular-nums text-right">{{ brl(l.total, l.total % 1 ? 2 : 0) }}</dd>
                <dd class="sm:hidden col-start-2 col-span-2 text-micro text-ink-subtle">{{ linhaFluxo(l) }}</dd>
              </div>
              <template v-if="mcmv">
                <div class="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-x-3 py-1.5"><span></span><dt class="text-ink-muted">Valor de tabela</dt><dd class="font-semibold tabular-nums text-right">{{ brl(condicao.valor_tabela) }}</dd></div>
                <div v-if="condicao.desconto" class="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-x-3 py-1.5"><span></span><dt class="text-ink-muted">Desconto construtora</dt><dd class="font-semibold tabular-nums text-right">- {{ brl(condicao.desconto) }}</dd></div>
              </template>
              <div v-else class="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-x-3 py-1.5"><span></span><dt class="text-ink-muted">Recurso próprio até a entrega</dt><dd class="font-semibold tabular-nums text-right">{{ pct(fluxo.recurso_proprio_pct) }}</dd></div>
              <div class="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-x-3 pt-2 mt-1 border-t-2 border-ink"><span></span><dt class="font-bold">Preço de venda</dt><dd class="font-bold tabular-nums text-right">{{ brl2(condicao.preco_venda) }}</dd></div>
            </dl>
          </template>
          <p v-else class="text-sm text-ink-muted">A tabela vigente não traz o fluxo de pagamento.</p>
        </section>
      </div>

      <ul class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <li class="rounded-xl border border-line px-3 py-2.5">
          <b class="block text-sm text-ink">{{ custos && custos.totalMenin > 0 && !custos.totalClient ? 'Documentação grátis' : 'Documentação' }}</b>
          <span class="text-micro text-ink-muted">{{ custos?.totalMenin ? `Menin paga ${brl(custos.totalMenin)} por venda` : 'por conta do cliente' }}</span>
        </li>
        <li class="rounded-xl border border-line px-3 py-2.5">
          <b class="block text-sm text-ink">{{ mod.itbi_exempt ? 'ITBI isento' : 'ITBI' }}</b>
          <span class="text-micro text-ink-muted">{{ mod.itbi_exempt ? (fontes.empreendimento.cidade ? `em ${fontes.empreendimento.cidade}` : '') : (itbiPayer(mod) === 'menin' ? 'pago pela Menin' : 'pago pelo cliente') }}</span>
        </li>
        <li class="rounded-xl border border-line px-3 py-2.5">
          <b class="block text-sm text-ink">{{ comissaoPct != null ? `Comissão ${pct(comissaoPct, comissaoPct % 1 ? 1 : 0)}` : 'Comissão' }}</b>
          <span class="text-micro text-ink-muted">{{ comissaoPct != null && condicao?.preco_venda ? `${brl(condicao.preco_venda * comissaoPct / 100)} por ${unidadeNome[0]}` : '-' }}</span>
        </li>
        <li class="rounded-xl border border-line px-3 py-2.5">
          <b class="block text-sm text-ink">{{ campanhasVigentes.length ? `${campanhasVigentes.length} ${campanhasVigentes.length > 1 ? 'campanhas' : 'campanha'}` : 'Sem campanha' }}</b>
          <span class="text-micro text-ink-muted">{{ campanhasVigentes.length ? campanhasVigentes.map((c) => c.title).join(', ') : `em ${mesCurto(String(detail.reference_month).slice(0, 7))}` }}</span>
        </li>
      </ul>

      <!-- 2. Disponibilidade e espelho -->
      <Panel :title="`Disponibilidade · ${fontes.etapa?.nome || mod.module_name}`" icon="fas fa-table-cells" v-if="resumo">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div v-for="k in kpis" :key="k.k" class="rounded-xl px-3 py-2.5" :class="k.destaque ? 'bg-data-pos/10' : 'bg-surface-sunken'">
            <div class="text-micro text-ink-muted flex items-center gap-1.5"><i v-if="k.cor" class="w-2.5 h-2.5 rounded-sm" :class="k.cor"></i>{{ k.rotulo }}</div>
            <div class="text-metric font-bold tabular-nums" :class="k.destaque ? 'text-data-pos' : 'text-ink'">{{ k.valor }}</div>
            <div class="text-micro text-ink-subtle">{{ k.nota }}</div>
          </div>
        </div>
        <div class="relative pt-6 mt-3">
          <div v-if="demanda" class="absolute top-0 bottom-[-6px] border-l-2 border-dashed border-ink" :style="{ left: `${demanda.left}%` }">
            <span class="absolute top-0 left-1.5 text-micro text-ink-muted whitespace-nowrap">demanda mínima {{ demanda.n }}{{ demanda.atingida ? ' · atingida' : '' }}</span>
          </div>
          <div class="flex h-8 rounded-lg overflow-hidden" role="img" :aria-label="barraEstoque.map((s) => s.rotulo).join(', ')">
            <div v-for="s in barraEstoque" :key="s.k" :class="s.cls" class="h-full flex items-center justify-center text-micro font-semibold overflow-hidden whitespace-nowrap" :style="{ flex: `${s.n} 0 0` }">{{ s.rotulo }}</div>
          </div>
        </div>
        <div class="mt-5">
          <EspelhoUnidades :torres="fontes.estoque.torres" :modo="fontes.estoque.modo" @select="unidadeAberta = $event" />
        </div>
      </Panel>

      <!-- 3. Regras -->
      <Panel title="Regras de negociação" icon="fas fa-scale-balanced" :padded="false">
        <template v-if="canEdit" #actions>
          <Button size="sm" variant="ghost" icon="fas fa-rotate" :loading="lendoRegra" @click="lerRegra">Ler regra no CV</Button>
        </template>
        <dl class="divide-y divide-line-subtle">
          <div v-if="proSoluto" class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
            <dt class="text-ink-muted">Parcelado com a Menin</dt><dd class="font-semibold">{{ proSoluto }}</dd><dd class="text-micro text-ink-subtle self-center">limite do pró-soluto</dd>
          </div>
          <div v-for="r in regrasCv" :key="r.chave" class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
            <dt class="text-ink-muted">{{ r.rotulo }}</dt><dd class="font-semibold">{{ r.valor }}</dd><dd class="text-micro text-ink-subtle self-center">{{ r.nota }}</dd>
          </div>
          <div v-for="r in regrasOffice" :key="r.rotulo" class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
            <dt class="text-ink-muted">{{ r.rotulo }}</dt><dd class="font-semibold">{{ r.valor }}</dd><dd class="text-micro text-ink-subtle self-center">{{ r.nota }}</dd>
          </div>
        </dl>
        <template v-if="fontes.regra_cv?.lido_em" #footer>Regra de reservas lida no CV em {{ data(String(fontes.regra_cv.lido_em).slice(0, 10)) }}.</template>
      </Panel>

      <!-- 4. Detalhes -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Panel title="Documentação por venda" icon="fas fa-file-signature">
          <dl class="text-sm divide-y divide-line-subtle">
            <div v-for="i in (custos?.menin || [])" :key="`m${i.label}`" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">{{ i.label }}</dt><dd class="tabular-nums">{{ brl2(i.value) }}</dd></div>
            <div class="flex justify-between gap-3 py-1.5 font-semibold"><dt>Menin paga</dt><dd class="tabular-nums">{{ brl2(custos?.totalMenin || 0) }}</dd></div>
            <div v-for="i in (custos?.client || [])" :key="`c${i.label}`" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">{{ i.label }}</dt><dd class="tabular-nums">{{ brl2(i.value) }}</dd></div>
            <div class="flex justify-between gap-3 py-1.5 font-semibold"><dt>Cliente paga</dt><dd class="tabular-nums">{{ brl2(custos?.totalClient || 0) }}</dd></div>
          </dl>
        </Panel>

        <Panel title="Comissão" icon="fas fa-handshake">
          <dl class="text-sm divide-y divide-line-subtle">
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Percentual</dt><dd class="font-semibold tabular-nums">{{ comissaoPct != null ? pct(comissaoPct, comissaoPct % 1 ? 1 : 0) : '-' }}</dd></div>
            <div v-if="comissaoPct != null && preco?.principal && mcmv" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">No preço mais comum</dt><dd class="font-semibold tabular-nums">{{ brl(preco.principal.valor * comissaoPct / 100) }}</dd></div>
            <div v-else-if="comissaoPct != null && preco" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">No menor à venda</dt><dd class="font-semibold tabular-nums">{{ brl(preco.min * comissaoPct / 100) }}</dd></div>
          </dl>
          <p v-if="mod.commission_note" class="text-micro text-ink-muted mt-2 whitespace-pre-line line-clamp-4">{{ mod.commission_note.trim() }}</p>
        </Panel>

        <Panel v-if="mcmv && fontes.compradores?.n" title="Quem está comprando" icon="fas fa-users">
          <dl class="text-sm divide-y divide-line-subtle">
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Pré-cadastros em {{ fontes.compradores.dias }} dias</dt><dd class="font-semibold tabular-nums">{{ num(fontes.compradores.n) }}</dd></div>
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Reprovados</dt><dd class="font-semibold tabular-nums">{{ pct(fontes.compradores.reprovados_pct) }}</dd></div>
            <div v-if="fontes.compradores.financiamento" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Financiamento aprovado</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.compradores.financiamento) }}</dd></div>
            <div v-if="fontes.compradores.subsidio" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Subsídio federal</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.compradores.subsidio) }}</dd></div>
            <div v-if="fontes.compradores.fgts" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">FGTS usado</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.compradores.fgts) }}</dd></div>
            <div v-if="fontes.compradores.prestacao" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Prestação Caixa</dt><dd class="font-semibold tabular-nums">{{ brl2(fontes.compradores.prestacao) }}</dd></div>
          </dl>
          <template #footer>Valores em mediana.</template>
        </Panel>

        <Panel title="Reservas por mês" icon="fas fa-chart-column">
          <div class="grid gap-2 items-end h-36" :style="{ gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))` }" role="img"
            :aria-label="meses.map((m) => `${mesCurto(m.mes)}: ${m.ficaram} de ${m.feitas}`).join(', ')">
            <div v-for="m in meses" :key="m.mes" class="h-full grid grid-rows-[auto_minmax(0,1fr)_auto] gap-1 text-center min-w-0">
              <span class="text-xs font-semibold tabular-nums">{{ m.ficaram }}<span class="text-micro font-normal text-ink-subtle">/{{ m.feitas }}</span></span>
              <div class="flex flex-col justify-end min-h-0">
                <div v-if="m.caidas" class="bg-data-neutral/40" :style="{ height: `${m.hCaiu}%` }"></div>
                <div v-if="m.ficaram > 0" class="bg-series-1 rounded-t" :style="{ height: `${m.hOk}%` }"></div>
              </div>
              <span class="text-micro text-ink-muted">{{ mesCurto(m.mes) }}</span>
            </div>
          </div>
          <template #footer>Que ficaram / feitas. Cinza: canceladas ou vencidas.</template>
        </Panel>

        <Panel title="Obra" icon="fas fa-helmet-safety">
          <dl class="text-sm divide-y divide-line-subtle">
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Entrega prevista</dt><dd class="font-semibold tabular-nums">{{ data(fontes.obra.entrega) }}</dd></div>
            <div v-if="fontes.obra.andamento != null" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Andamento</dt><dd class="font-semibold tabular-nums">{{ pct(fontes.obra.andamento, 1) }}</dd></div>
            <div v-if="fontes.obra.situacao_obra" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Situação</dt><dd class="font-semibold">{{ fontes.obra.situacao_obra }}</dd></div>
            <div v-if="fontes.obra.situacao_comercial" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Comercial</dt><dd class="font-semibold">{{ fontes.obra.situacao_comercial }}</dd></div>
          </dl>
        </Panel>

        <Panel title="Quem é quem" icon="fas fa-id-card">
          <dl class="text-sm divide-y divide-line-subtle">
            <div v-for="[k, v] in pessoas" :key="k" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">{{ k }}</dt><dd class="font-semibold text-right">{{ v }}</dd></div>
          </dl>
        </Panel>

        <Panel v-if="campanhasVigentes.length" title="Campanhas do mês" icon="fas fa-bullhorn" class="md:col-span-2 xl:col-span-3">
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <li v-for="c in campanhasVigentes" :key="c.id || c.title" class="rounded-xl border border-line p-3">
              <div class="flex items-baseline justify-between gap-3">
                <b class="text-sm text-ink">{{ c.title }}</b>
                <span class="text-micro text-ink-subtle whitespace-nowrap">{{ c.end_date ? `até ${data(String(c.end_date).slice(0, 10))}` : '' }}</span>
              </div>
              <p v-if="c.description" class="text-xs text-ink-muted mt-1 whitespace-pre-line">{{ c.description.trim() }}</p>
              <p v-if="c.value" class="text-xs mt-1"><b class="tabular-nums">{{ brl(c.value) }}</b><template v-if="c.paid_by"> · pago {{ c.paid_by === 'menin' ? 'pela Menin' : 'pelo cliente' }}</template></p>
            </li>
          </ul>
        </Panel>

        <Panel v-if="mod.notes" title="Observação do mês" icon="fas fa-note-sticky" class="md:col-span-2 xl:col-span-3">
          <p class="text-sm whitespace-pre-line">{{ mod.notes.trim() }}</p>
        </Panel>
      </div>

      <p class="text-micro text-ink-subtle">
        <template v-if="fontes.foto">Retrato de {{ data(String(fontes.foto.em).slice(0, 10)) }}.</template>
        <template v-else>Dados do CV de {{ data(String(fontes.gerado_em).slice(0, 10)) }} às {{ String(new Date(fontes.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) }}.</template>
        <template v-if="fontes.tabela"> Tabela {{ fontes.tabela.nome }}.</template>
      </p>
    </template>

    <UnidadeModal :unidade="unidadeAberta" :horizontal="horizontal" :comissao-pct="comissaoPct" @close="unidadeAberta = null" />

    <Modal :open="docAberto" size="screen" :padded="false" :scrollable="false" hide-close @close="docAberto = false">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full min-w-0">
          <span class="text-sm font-bold text-ink truncate">Ficha comercial · {{ detail?.enterprise?.nome || detail?.display_name || '' }}</span>
          <div class="flex items-center gap-2 shrink-0">
            <Button size="sm" icon="fas fa-file-pdf" :loading="imprimindo" @click="printModule"><span class="hidden sm:inline">Exportar PDF</span></Button>
            <IconButton icon="fas fa-times" size="sm" title="Fechar" @click="docAberto = false" />
          </div>
        </div>
      </template>
      <div class="h-full p-3 sm:p-4 bg-surface-sunken">
        <iframe v-if="docHtml" :srcdoc="docHtml" class="folha w-full h-full rounded-xl border border-line" title="Documento da ficha"></iframe>
        <div v-else class="h-full flex items-center justify-center text-sm text-ink-muted">Montando o documento...</div>
      </div>
    </Modal>
  </div>
</template>
