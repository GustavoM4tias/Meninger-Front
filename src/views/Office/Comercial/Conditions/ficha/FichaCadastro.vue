<script setup>
/**
 * Cadastro do módulo da ficha comercial (ficha ligada ao CV).
 *
 * Regra do produto: o CV manda; o Office só complementa o que o CV não tem.
 * Por isso a tela tem dois lados:
 *   - "Vem do CV": tabela, preço, fluxo, regra de reservas, avaliação e
 *     entrega, só leitura. Para mudar, muda no CV.
 *   - o que o Office decide: quem paga a documentação, comissão, condições que
 *     o CV não guarda (correção, demanda mínima, prazo, programa estadual),
 *     campanhas e responsáveis. Sem texto livre onde a resposta é uma opção.
 *
 * Edita o módulo do jeito de sempre: emite `update:modules` com a lista nova e
 * o Detail salva. Os textos antigos (min_demand_note, installment_*,
 * delivery_deadline_note) são regravados a partir dos campos fixos, para quem
 * ainda lê o texto continuar lendo certo.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import CampaignManager from '../components/CampaignManager.vue';
import { brl, brl2, num, pct, data, linhaFluxo, regrasDoCv, COR_SERIE } from './fichaUtils';

const props = defineProps({
  detail: { type: Object, required: true },
  modules: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  officeUsers: { type: Array, default: () => [] },
  correspondents: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modules', 'update:activeIndex', 'save', 'template-propagated']);
const store = useConditionsStore();

const idx = computed({
  get: () => Math.min(props.activeIndex, Math.max(0, props.modules.length - 1)),
  set: (v) => emit('update:activeIndex', v),
});
const mod = computed(() => props.modules[idx.value] || null);

function patch(campos) {
  if (props.readonly || !mod.value) return;
  emit('update:modules', props.modules.map((m, i) => (i === idx.value ? { ...m, ...campos } : m)));
}
const numOuNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

// ── fontes (o que vem do CV) ───────────────────────────────
const fontes = ref(null);
const carregando = ref(false);
const lendoRegra = ref(false);
async function carregarFontes() {
  if (!mod.value?.id) { fontes.value = null; return; }
  carregando.value = true;
  try { fontes.value = await store.fetchFontes(props.detail.id, mod.value.id); }
  catch { fontes.value = null; }
  finally { carregando.value = false; }
}
watch(() => mod.value?.id, carregarFontes, { immediate: true });
async function lerRegra() {
  lendoRegra.value = true;
  try { fontes.value = await store.refreshRegraCv(props.detail.id, mod.value.id); store.notify('Regra de reservas lida no CV.'); }
  catch (e) { store.notify(e.message || 'Não foi possível ler a regra no CV.', 'error'); }
  finally { lendoRegra.value = false; }
}
const tipo = computed(() => fontes.value?.tipo_produto || null);
const mcmv = computed(() => tipo.value?.pagamento === 'mcmv');
const regrasCv = computed(() => regrasDoCv(fontes.value?.regra_cv));

const TIPOS = [
  { value: '', label: 'Automático pelo CV' },
  { value: 'loteamento_mcmv', label: 'Loteamento MCMV' },
  { value: 'vertical_mcmv', label: 'Vertical MCMV' },
  { value: 'vertical_alto_padrao', label: 'Vertical alto padrão (30/70)' },
  { value: 'lote_urbanizado', label: 'Lote urbanizado' },
];
async function trocarTipo(v) {
  patch({ product_type_override: v || null });
}

// ── cadastros únicos ───────────────────────────────────────
onMounted(() => { if (!store.cadastros.programas.length && !store.cadastros.cidades.length) store.fetchCadastros().catch(() => {}); });
const uf = computed(() => fontes.value?.empreendimento?.uf || null);
const cidade = computed(() => {
  const nome = String(fontes.value?.empreendimento?.cidade || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return store.cadastros.cidades.find((c) => c.uf === uf.value && String(c.cidade).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase() === nome) || null;
});
const programas = computed(() => store.cadastros.programas.filter((p) => p.ativo !== false && (!uf.value || p.uf === uf.value)));
const ccas = computed(() => store.cadastros.prestadores.filter((p) => p.tipo === 'cca' && (p.ativo !== false || Number(p.id) === Number(mod.value?.cca_provider_id))));
const certificadoras = computed(() => store.cadastros.prestadores.filter((p) => p.tipo === 'certificadora' && (p.ativo !== false || Number(p.id) === Number(mod.value?.cert_provider_id))));

// ── documentação: quem paga e quanto ───────────────────────
const PAGADOR = [{ value: 'menin', label: 'Menin' }, { value: 'client', label: 'Cliente' }];
const itensDoc = computed(() => {
  const m = mod.value || {};
  const c = cidade.value;
  return [
    { k: 'cef', rotulo: 'Pacote Caixa', pagador: 'cef_package_paid_by', valor: 'cef_package_avg_value', padrao: c?.pacote_caixa },
    { k: 'prenot', rotulo: 'Prenotação', pagador: 'cartorio_paid_by', valor: 'cartorio_prenotacao_value', padrao: c?.cartorio_prenotacao, nota: 'mesmo pagador do registro' },
    { k: 'registro', rotulo: 'Registro em cartório', pagador: 'cartorio_paid_by', valor: 'cartorio_registration_value', padrao: c?.cartorio_registro },
    { k: 'cca', rotulo: 'CCA', pagador: 'cca_paid_by', valor: 'cca_cost', padrao: ccas.value.find((p) => Number(p.id) === Number(m.cca_provider_id))?.custo },
    { k: 'cert', rotulo: 'Certificado digital', pagador: 'digital_cert_paid_by', valor: 'digital_cert_cost', padrao: certificadoras.value.find((p) => Number(p.id) === Number(m.cert_provider_id))?.custo },
  ];
});
function setValorDoc(item, v) {
  const valor = numOuNull(v);
  const extra = {};
  if (item.k === 'cca') extra.cca_charges_company = valor > 0;
  if (item.k === 'cert') { extra.digital_cert_has_cost = valor > 0; if (valor > 0) extra.has_digital_cert = true; }
  patch({ [item.valor]: valor, ...extra });
}
function usarValoresDaCidade() {
  const c = cidade.value; if (!c) return;
  patch({
    cef_package_avg_value: c.pacote_caixa != null ? Number(c.pacote_caixa) : mod.value.cef_package_avg_value,
    cartorio_prenotacao_value: c.cartorio_prenotacao != null ? Number(c.cartorio_prenotacao) : mod.value.cartorio_prenotacao_value,
    cartorio_registration_value: c.cartorio_registro != null ? Number(c.cartorio_registro) : mod.value.cartorio_registration_value,
    ...(c.itbi_isento != null ? { itbi_exempt: !!c.itbi_isento } : {}),
  });
}
const temDiferencaCidade = computed(() => {
  const c = cidade.value, m = mod.value; if (!c || !m) return false;
  const dif = (a, b) => b != null && Number(a ?? -1) !== Number(b);
  return dif(m.cef_package_avg_value, c.pacote_caixa) || dif(m.cartorio_prenotacao_value, c.cartorio_prenotacao) || dif(m.cartorio_registration_value, c.cartorio_registro) || (c.itbi_isento != null && !!m.itbi_exempt !== !!c.itbi_isento);
});

function escolherCca(id) {
  const p = ccas.value.find((x) => Number(x.id) === Number(id));
  patch({
    cca_provider_id: p ? p.id : null,
    cca_company_name: p ? p.nome : null,
    ...(p && p.custo != null && mod.value.cca_cost == null ? { cca_cost: Number(p.custo), cca_charges_company: Number(p.custo) > 0 } : {}),
  });
}
function escolherCertificadora(id) {
  const p = certificadoras.value.find((x) => Number(x.id) === Number(id));
  patch({
    cert_provider_id: p ? p.id : null,
    has_digital_cert: !!p,
    digital_cert_provider: p ? p.nome : null,
    digital_cert_contact: p ? (p.contato || null) : null,
    ...(p && p.custo != null && mod.value.digital_cert_cost == null ? { digital_cert_cost: Number(p.custo), digital_cert_has_cost: Number(p.custo) > 0 } : {}),
  });
}

// ── condições que o CV não guarda ──────────────────────────
const INDEXADORES = [{ value: 'INCC', label: 'INCC' }, { value: 'IPCA', label: 'IPCA' }, { value: 'IGPM', label: 'IGP-M' }, { value: 'FIXO', label: 'Sem correção' }];
const MARCOS = [
  { value: 'contrato_caixa', label: 'Assinatura do contrato Caixa' },
  { value: 'inicio_obra', label: 'Início da obra' },
  { value: 'data_fixa', label: 'Data de entrega do CV' },
  { value: 'entregue', label: 'Já entregue' },
];
const TEXTO_MARCO = { contrato_caixa: 'A partir da assinatura do contrato Caixa', inicio_obra: 'A partir do início das obras', data_fixa: 'Conforme a data de entrega do empreendimento', entregue: 'Já entregue' };
const ROTULO_IDX = { INCC: 'INCC', IPCA: 'IPCA', IGPM: 'IGP-M', FIXO: 'Sem correção' };

function setDemanda(modo) {
  patch({ demand_mode: modo || null, min_demand_note: modo === 'fracionada' ? 'Assinar em demanda mínima fracionada' : (modo === 'integral' ? 'Assinar em demanda mínima integral' : null) });
}
function setCorrecao(campos) {
  const m = { ...mod.value, ...campos };
  const depois = m.indexer_after ? `${ROTULO_IDX[m.indexer_after]}${m.interest_after_pct ? ` + ${num(m.interest_after_pct, Number(m.interest_after_pct) % 1 ? 2 : 0)}% a.m.` : ''}` : null;
  patch({ ...campos, installment_until_habite_se: m.indexer_until ? ROTULO_IDX[m.indexer_until] : null, installment_post_habite_se: depois });
}
function setMarco(v) { patch({ deadline_milestone: v || null, delivery_deadline_note: v ? TEXTO_MARCO[v] : null }); }
function escolherPrograma(id) {
  const p = programas.value.find((x) => Number(x.id) === Number(id));
  patch({
    state_program_id: p ? p.id : null,
    has_state_subsidy: !!p,
    state_subsidy_state: p ? String(p.uf).toLowerCase() : null,
    state_subsidy_program: p ? p.nome : null,
    state_subsidy_rules: p ? (p.regras || null) : null,
  });
}
const programaAtual = computed(() => store.cadastros.programas.find((p) => Number(p.id) === Number(mod.value?.state_program_id)) || null);

// ── comissão ───────────────────────────────────────────────
const comissaoExemplo = computed(() => {
  const pctN = numOuNull(mod.value?.commission_pct); const preco = fontes.value?.condicao?.preco_venda;
  return pctN != null && preco ? brl(preco * pctN / 100) : null;
});

// ── responsáveis ───────────────────────────────────────────
const usuarios = computed(() => [{ value: '', label: 'Ninguém' }, ...props.officeUsers.map((u) => ({ value: u.id, label: `${u.username}${u.status === 'inactive' || u.active === false ? ' (inativo)' : ''}` }))]);
const correspondentesOpts = computed(() => [{ value: '', label: 'Nenhum' }, ...props.correspondents.map((c) => ({ value: c.idusuario, label: c.nome }))]);
const REGISTRO = [{ value: 'cca', label: 'CCA' }, { value: 'menin', label: 'Menin' }, { value: 'cliente', label: 'Cliente' }];
const registroAtual = computed(() => (mod.value?.contract_registration_by === 'outros' ? 'cliente' : (mod.value?.contract_registration_by || '')));
function setRegistro(v) {
  if (v === 'cliente') patch({ contract_registration_by: 'outros', outros_contact_name: 'Cliente' });
  else patch({ contract_registration_by: v || null });
}

const campanhas = computed(() => mod.value?.campaigns || []);
</script>

<template>
  <div class="space-y-4">
    <div v-if="modules.length > 1" class="flex flex-wrap gap-2" role="tablist" aria-label="Módulos da ficha">
      <button v-for="(m, i) in modules" :key="m.id || i" type="button" role="tab" :aria-selected="i === idx"
        class="h-10 px-4 rounded-lg border text-sm font-medium focus-ring transition-colors"
        :class="i === idx ? 'bg-ink text-surface border-ink' : 'bg-surface border-line text-ink-muted hover:text-ink'"
        @click="idx = i">{{ m.module_name || `Módulo ${i + 1}` }}</button>
    </div>

    <template v-if="mod">
      <!-- Vem do CV -->
      <Panel id="modsec-cv" class="scroll-mt-40" title="Vem do CV" icon="fas fa-link"
        subtitle="Só leitura: para mudar, muda no CV. A ficha acompanha sozinha.">
        <template #actions>
          <Button v-if="!readonly" size="sm" variant="ghost" icon="fas fa-rotate" :loading="lendoRegra" @click="lerRegra">Ler regra no CV</Button>
        </template>
        <Skeleton v-if="carregando && !fontes" variant="card" :lines="4" />
        <div v-else-if="fontes" class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <dl class="divide-y divide-line-subtle">
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Tabela vigente</dt><dd class="font-semibold text-right">{{ fontes.tabela?.nome || '-' }}</dd></div>
            <div v-if="fontes.tabela" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Vale até</dt><dd class="font-semibold tabular-nums">{{ fontes.tabela.data_vigencia_ate ? data(fontes.tabela.data_vigencia_ate) : 'sem prazo' }}</dd></div>
            <div v-if="fontes.preco?.principal && mcmv" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Preço mais comum</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.preco.principal.valor) }} <span class="text-ink-subtle font-normal">({{ fontes.preco.principal.qtd }})</span></dd></div>
            <div v-else-if="fontes.preco" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Preço à venda</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.preco.min) }} a {{ brl(fontes.preco.max) }}</dd></div>
            <div v-if="fontes.avaliacao?.mediana" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Avaliação Caixa</dt><dd class="font-semibold tabular-nums">{{ brl(fontes.avaliacao.mediana) }}<template v-if="fontes.avaliacao.teto"> · teto {{ brl(fontes.avaliacao.teto) }}</template></dd></div>
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Entrega prevista</dt><dd class="font-semibold tabular-nums">{{ data(fontes.obra?.entrega) }}</dd></div>
            <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Unidades da etapa</dt><dd class="font-semibold tabular-nums">{{ fontes.estoque?.resumo?.unidades ?? '-' }}</dd></div>
          </dl>
          <div>
            <p class="metric-label mb-1">Condição padrão<template v-if="fontes.condicao"> · {{ fontes.condicao.unidade.nome }}</template></p>
            <dl class="divide-y divide-line-subtle">
              <div v-for="(l, i) in (fontes.condicao?.fluxo?.linhas || [])" :key="i" class="flex justify-between gap-3 py-1.5">
                <dt class="text-ink-muted inline-flex items-center gap-2"><i class="w-2.5 h-2.5 rounded-sm" :class="COR_SERIE[l.tipo]"></i>{{ l.rotulo }}</dt>
                <dd class="font-semibold tabular-nums">{{ linhaFluxo(l) }}</dd>
              </div>
            </dl>
            <p class="metric-label mt-3 mb-1">Regra de reservas</p>
            <dl class="divide-y divide-line-subtle">
              <div v-if="fontes.regra_cv?.pro_soluto_max_pct" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Parcelado com a Menin</dt><dd class="font-semibold">até {{ num(fontes.regra_cv.pro_soluto_max_pct) }}% do VGV</dd></div>
              <div v-for="r in regrasCv" :key="r.chave" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">{{ r.rotulo }}</dt><dd class="font-semibold text-right">{{ r.valor }}</dd></div>
            </dl>
            <p v-if="fontes.regra_cv?.lido_em" class="text-micro text-ink-subtle mt-1">Lida no CV em {{ data(String(fontes.regra_cv.lido_em).slice(0, 10)) }}.</p>
          </div>
          <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line-subtle">
            <Select :model-value="mod.product_type_override || ''" :options="TIPOS" label="Tipo de produto"
              :hint="tipo ? `Pelo CV: ${tipo.rotulo}` : ''" :disabled="readonly" @update:model-value="trocarTipo" />
          </div>
        </div>
      </Panel>

      <!-- Documentação -->
      <Panel id="modsec-docs" class="scroll-mt-40" title="Documentação por venda" icon="fas fa-file-signature"
        :subtitle="cidade ? `Valores de referência: cadastro de ${cidade.cidade}/${cidade.uf}` : 'Cidade sem cadastro de custos'">
        <template v-if="!readonly && temDiferencaCidade" #actions>
          <Button size="sm" variant="ghost" icon="fas fa-city" @click="usarValoresDaCidade">Usar valores da cidade</Button>
        </template>
        <div class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_160px] gap-x-4 gap-y-2 items-center">
            <template v-for="it in itensDoc" :key="it.k">
              <div class="text-sm">
                <span class="font-medium text-ink">{{ it.rotulo }}</span>
                <span v-if="it.padrao != null" class="block text-micro text-ink-subtle">referência {{ brl2(it.padrao) }}<template v-if="it.nota"> · {{ it.nota }}</template></span>
                <span v-else-if="it.nota" class="block text-micro text-ink-subtle">{{ it.nota }}</span>
              </div>
              <SegmentedControl v-if="it.k !== 'prenot'" :model-value="mod[it.pagador] || ''" :options="PAGADOR" size="sm"
                :class="readonly ? 'pointer-events-none opacity-60' : ''" @update:model-value="(v) => patch({ [it.pagador]: v })" />
              <span v-else></span>
              <Input :model-value="mod[it.valor] ?? ''" type="number" size="sm" :placeholder="it.padrao != null ? String(it.padrao) : 'R$'"
                :disabled="readonly" @update:model-value="(v) => setValorDoc(it, v)" />
            </template>
          </div>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-line-subtle">
            <Switch :model-value="!!mod.itbi_exempt" label="ITBI isento" :description="cidade?.itbi_isento != null ? `cadastro da cidade: ${cidade.itbi_isento ? 'isento' : 'não isento'}` : ''"
              :disabled="readonly" @update:model-value="(v) => patch({ itbi_exempt: v })" />
            <template v-if="!mod.itbi_exempt">
              <SegmentedControl :model-value="mod.itbi_paid_by || 'client'" :options="PAGADOR" size="sm" :class="readonly ? 'pointer-events-none opacity-60' : ''" @update:model-value="(v) => patch({ itbi_paid_by: v })" />
              <Input class="w-40" :model-value="mod.itbi_avg_value ?? ''" type="number" size="sm" placeholder="valor médio do ITBI" :disabled="readonly" @update:model-value="(v) => patch({ itbi_avg_value: numOuNull(v) })" />
            </template>
          </div>
        </div>
      </Panel>

      <!-- Comissão -->
      <Panel id="modsec-commission" class="scroll-mt-40" title="Comissão" icon="fas fa-handshake">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input :model-value="mod.commission_pct ?? ''" type="number" label="Percentual (%)" :hint="comissaoExemplo ? `${comissaoExemplo} na condição padrão` : ''"
            :disabled="readonly" @update:model-value="(v) => patch({ commission_pct: numOuNull(v), commission_source: 'manual' })" />
          <div>
            <span class="block text-xs font-medium text-ink-muted mb-1.5">Calculada sobre</span>
            <SegmentedControl :model-value="mod.commission_base || 'venda'" :options="[{ value: 'venda', label: 'Preço de venda' }, { value: 'tabela', label: 'Tabela' }]" size="sm"
              :class="readonly ? 'pointer-events-none opacity-60' : ''" @update:model-value="(v) => patch({ commission_base: v })" />
          </div>
          <Input :model-value="mod.commission_payment_days ?? ''" type="number" label="Paga em (dias)" hint="após o contrato Caixa"
            :disabled="readonly" @update:model-value="(v) => patch({ commission_payment_days: numOuNull(v) })" />
          <div class="flex items-end gap-2">
            <Input class="flex-1" :model-value="mod.commission_nf_from ?? ''" type="number" label="NF do dia" :disabled="readonly" @update:model-value="(v) => patch({ commission_nf_from: numOuNull(v) })" />
            <Input class="flex-1" :model-value="mod.commission_nf_to ?? ''" type="number" label="ao dia" :disabled="readonly" @update:model-value="(v) => patch({ commission_nf_to: numOuNull(v) })" />
          </div>
          <div class="col-span-2 lg:col-span-4">
            <Switch :model-value="!!mod.commission_apartada" label="Comissão apartada" description="paga pelo cliente direto à imobiliária, dentro do ato"
              :disabled="readonly" @update:model-value="(v) => patch({ commission_apartada: v })" />
          </div>
          <label class="col-span-2 lg:col-span-4 block">
            <span class="block text-xs font-medium text-ink-muted mb-1.5">Observação da comissão</span>
            <textarea :value="mod.commission_note || ''" rows="2" :disabled="readonly"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-ring disabled:opacity-60"
              @input="patch({ commission_note: $event.target.value || null })"></textarea>
          </label>
        </div>
      </Panel>

      <!-- Condições que o CV não guarda -->
      <Panel id="modsec-office" class="scroll-mt-40" title="Condições" icon="fas fa-sliders" subtitle="O que o CV não guarda">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
          <div v-if="mcmv" class="space-y-2">
            <p class="metric-label">Demanda mínima</p>
            <div class="flex items-end gap-3 flex-wrap">
              <Input class="w-32" :model-value="mod.min_demand ?? ''" type="number" label="Unidades" :disabled="readonly" @update:model-value="(v) => patch({ min_demand: numOuNull(v) })" />
              <SegmentedControl :model-value="mod.demand_mode || ''" :options="[{ value: 'fracionada', label: 'Fracionada' }, { value: 'integral', label: 'Integral' }]" size="sm"
                :class="readonly ? 'pointer-events-none opacity-60' : ''" @update:model-value="setDemanda" />
            </div>
          </div>
          <div class="space-y-2">
            <p class="metric-label">Correção do parcelado</p>
            <div class="grid grid-cols-3 gap-2">
              <Select :model-value="mod.indexer_until || ''" :options="INDEXADORES" label="Até o habite-se" placeholder="-" :disabled="readonly" @update:model-value="(v) => setCorrecao({ indexer_until: v || null })" />
              <Select :model-value="mod.indexer_after || ''" :options="INDEXADORES" label="Depois" placeholder="-" :disabled="readonly" @update:model-value="(v) => setCorrecao({ indexer_after: v || null })" />
              <Input :model-value="mod.interest_after_pct ?? ''" type="number" label="+ juros % a.m." :disabled="readonly" @update:model-value="(v) => setCorrecao({ interest_after_pct: numOuNull(v) })" />
            </div>
          </div>
          <div class="space-y-2">
            <p class="metric-label">Prazo de obra</p>
            <div class="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
              <Input :model-value="mod.delivery_deadline_months ?? ''" type="number" label="Meses" :disabled="readonly" @update:model-value="(v) => patch({ delivery_deadline_months: numOuNull(v) })" />
              <Select :model-value="mod.deadline_milestone || ''" :options="MARCOS" label="Conta a partir de" placeholder="-" :disabled="readonly" @update:model-value="setMarco" />
            </div>
          </div>
          <div v-if="mcmv" class="space-y-2">
            <p class="metric-label">Programa estadual</p>
            <Select :model-value="mod.state_program_id || ''" :options="[{ value: '', label: 'Sem programa estadual' }, ...programas.map((p) => ({ value: p.id, label: `${p.nome} (${p.uf})` }))]"
              :disabled="readonly" @update:model-value="escolherPrograma" />
            <p v-if="programaAtual" class="text-micro text-ink-subtle">
              <template v-if="programaAtual.valor">até {{ brl(programaAtual.valor) }}</template><template v-if="programaAtual.publico_especial"> · {{ programaAtual.publico_especial }}</template>
            </p>
          </div>
          <label class="lg:col-span-2 block">
            <span class="block text-xs font-medium text-ink-muted mb-1.5">Observação do mês</span>
            <textarea :value="mod.notes || ''" rows="2" :disabled="readonly"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-ring disabled:opacity-60"
              @input="patch({ notes: $event.target.value || null })"></textarea>
          </label>
        </div>
      </Panel>

      <!-- Campanhas -->
      <Panel id="modsec-campaigns" class="scroll-mt-40" title="Campanhas" icon="fas fa-bullhorn"
        subtitle="Campanha vencida sai sozinha da ficha do mês seguinte">
        <CampaignManager :campaigns="campanhas" :saving="saving" :readonly="readonly" :condition-status="detail.status"
          @update:campaigns="(c) => patch({ campaigns: c })" @save="emit('save')" @template-propagated="(e) => emit('template-propagated', e)" />
      </Panel>

      <!-- Responsáveis -->
      <Panel id="modsec-people" class="scroll-mt-40" title="Responsáveis" icon="fas fa-id-card">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Select :model-value="mod.manager_user_id || ''" :options="usuarios" label="Gestor" :disabled="readonly"
            @update:model-value="(v) => patch({ manager_user_id: v || null, manager_mode: 'sistema' })" />
          <Select :model-value="mod.adm_user_id || ''" :options="usuarios" label="Administrativo" :disabled="readonly"
            @update:model-value="(v) => patch({ adm_user_id: v || null })" />
          <Select :model-value="mod.correspondent_id || ''" :options="correspondentesOpts" label="Correspondente (CV)" :disabled="readonly"
            @update:model-value="(v) => patch({ correspondent_id: v || null })" />
          <Select :model-value="mod.cca_provider_id || ''" :options="[{ value: '', label: 'Sem CCA' }, ...ccas.map((p) => ({ value: p.id, label: p.nome }))]" label="CCA"
            :disabled="readonly" @update:model-value="escolherCca" />
          <Select :model-value="mod.cert_provider_id || ''" :options="[{ value: '', label: 'Sem certificado digital' }, ...certificadoras.map((p) => ({ value: p.id, label: p.nome }))]" label="Certificado digital"
            :disabled="readonly" @update:model-value="escolherCertificadora" />
          <div>
            <span class="block text-xs font-medium text-ink-muted mb-1.5">Quem registra o contrato</span>
            <SegmentedControl :model-value="registroAtual" :options="REGISTRO" size="sm" :class="readonly ? 'pointer-events-none opacity-60' : ''" @update:model-value="setRegistro" />
          </div>
        </div>
      </Panel>
    </template>
  </div>
</template>
