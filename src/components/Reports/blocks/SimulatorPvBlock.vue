<script setup>
// Simulador de proposta de venda - o "PV PADRÃO" que vivia em planilha.
//
// A pessoa escolhe a unidade, o fluxo da TABELA vem pronto (é o que o CV
// autorizou para o mês), ela mexe na PROPOSTA e o bloco responde a única
// pergunta que interessa: **fecha ou não fecha?**
//
// TUDO É CONTA DE CLIENTE, DE PROPÓSITO
//
// Nada aqui consulta o servidor. As unidades e o fluxo padrão chegam prontos
// nas props, e o simulador só faz aritmética em cima disso. É o que faz o
// relatório funcionar depois de publicado no link público, onde não existe
// sessão nem alçada para consultar nada - e é o que faz a conta ser a mesma
// para quem abre hoje e para quem abrir amanhã.
//
// A conta mora em `simuladorPv.js`, fora do componente, porque veredito de
// fluxo é coisa que precisa ser testada sem abrir tela.
import { computed, ref, watch } from 'vue'
import { formatValue } from '../format.js'
import { avaliar, composicao } from './simuladorPv.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  // Pacote de services/comercial/simuladorPvService.js (montarSimulador).
  data: { type: Object, default: () => ({}) },
  title: { type: String, default: 'Simulador de proposta' },
})

const pacote = computed(() => props.data || {})
const unidades = computed(() => pacote.value.unidades || [])
const regras = computed(() => pacote.value.regras || {})
const mesBase = computed(() => pacote.value.mesBase || null)

// ── Seleção de unidade ──────────────────────────────────────────────────────

const filtroBloco = ref('')
const filtroSituacao = ref('Disponível')

const blocos = computed(() => [...new Set(unidades.value.map(u => u.bloco).filter(Boolean))])
const situacoes = computed(() => [...new Set(unidades.value.map(u => u.situacao).filter(Boolean))])

const listaFiltrada = computed(() => unidades.value.filter(u =>
  (!filtroBloco.value || u.bloco === filtroBloco.value)
  && (!filtroSituacao.value || u.situacao === filtroSituacao.value)))

const unidadeId = ref(null)
const unidade = computed(() =>
  unidades.value.find(u => String(u.id ?? u.nome) === String(unidadeId.value)) || null)

// Filtro que esvazia a seleção escolhe sozinho a primeira da lista nova: um
// simulador sem unidade selecionada não mostra nada e parece quebrado.
watch(listaFiltrada, (lista) => {
  const aindaVale = lista.some(u => String(u.id ?? u.nome) === String(unidadeId.value))
  if (!aindaVale) unidadeId.value = lista.length ? String(lista[0].id ?? lista[0].nome) : null
}, { immediate: true })

// ── Proposta editável ───────────────────────────────────────────────────────

const proposta = ref([])

// Trocar de unidade recomeça a proposta a partir da tabela daquela unidade.
// Manter a proposta anterior seria pior: os valores são da OUTRA unidade e
// ninguém percebe isso pelo número na tela.
watch(unidade, (u) => {
  proposta.value = (u?.series || []).map(s => ({ ...s }))
}, { immediate: true })

const assinatura = (lista) =>
  JSON.stringify((lista || []).map(s => [s.nome, s.valor, s.qtd, s.periodicidade, s.vencimento]))

const editada = computed(() => assinatura(unidade.value?.series) !== assinatura(proposta.value))

function restaurar() {
  proposta.value = (unidade.value?.series || []).map(s => ({ ...s }))
}

function adicionarLinha() {
  proposta.value.push({
    nome: 'PARCELA', papel: 'obra', valor: 0, qtd: 1, periodicidade: 1,
    vencimento: proposta.value[0]?.vencimento || mesBase.value,
  })
}

function removerLinha(i) {
  proposta.value.splice(i, 1)
}

// ── Veredito ────────────────────────────────────────────────────────────────

const r = computed(() => avaliar({
  tabela: unidade.value?.series || [],
  proposta: proposta.value,
  mesBase: mesBase.value,
  regras: regras.value,
}))

const porM2 = computed(() => (unidade.value?.area ? r.value.proposta.total / unidade.value.area : 0))

// Marcos do acumulado, que é como a diretoria lê um fluxo.
// A comissão sai de uma vez no ato, então o bruto de qualquer marco é o
// líquido mais ela - não precisa de um segundo fluxo só para exibir.
const marcos = computed(() => {
  const p = r.value.proposta
  const t = r.value.tabela
  const c = p.comissao
  const linha = (rotulo, prop, tab) => ({ rotulo, prop, tab, bruto: prop + c })
  return [
    linha('No ato', p.ato, t.ato),
    linha('Até 6 meses', p.entrada6m, t.entrada6m),
    linha('Até 1 ano', p.ano1, t.ano1),
    linha('Até 2 anos', p.ano2, t.ano2),
    linha('Até as chaves', p.ateChaves, t.ateChaves),
    { rotulo: 'Total da venda', prop: p.liquidoTotal, tab: t.liquidoTotal, bruto: p.total },
  ]
})

const comp = computed(() => composicao(proposta.value, r.value.proposta.total))

// ── Gráficos ────────────────────────────────────────────────────────────────
//
// Desenhados à mão em SVG, sem biblioteca: o bloco viaja dentro do relatório
// publicado, e um gráfico que depende de import externo não desenha no link
// público. São dois porque respondem coisas diferentes - a barra mostra o
// esforço de cada mês, a linha mostra se a proposta está atrás da tabela.
const GL = 600
const GA = 140

const grafico = computed(() => {
  const p = r.value.proposta.fluxo || []
  const t = r.value.tabela.fluxo || []
  const n = Math.max(p.length, t.length, 1)
  const meses = Array.from({ length: n }, (_, i) => i)
  const vp = meses.map(i => p[i] || 0)
  const vt = meses.map(i => t[i] || 0)
  const acumular = (a) => { let soma = 0; return a.map(v => (soma += v)) }
  const ap = acumular(vp)
  const at = acumular(vt)
  // A ESCALA DAS BARRAS IGNORA O MÊS DAS CHAVES.
  //
  // O repasse é R$ 464 mil contra mensais de R$ 3,6 mil: numa escala única, as
  // 24 barras da obra viram fiapos de meio pixel e o gráfico não mostra
  // exatamente aquilo para que serve, que é o esforço mês a mês. A barra da
  // chave sai do teto de propósito, recortada, com o valor escrito ao lado.
  const chaves = r.value.chaves
  const semChaves = (a) => a.filter((_, i) => i !== chaves)
  return {
    n, meses, vp, vt, ap, at, chaves,
    maxMes: Math.max(...semChaves(vp), ...semChaves(vt), 1),
    valorChaves: Math.max(vp[chaves] || 0, vt[chaves] || 0),
    maxAcum: Math.max(ap[n - 1] || 0, at[n - 1] || 0, 1),
    largura: (GL / n) * 0.38,
  }
})

const xMes = (i) => (grafico.value.n > 1 ? (i / (grafico.value.n - 1)) * GL : GL / 2)
const xBarra = (i) => (i / grafico.value.n) * GL
const alturaDe = (v, max) => Math.min(GA, Math.max(0, (v / max) * GA))
const linhaDe = (serie, max) => serie
  .map((v, i) => `${xMes(i).toFixed(1)},${(GA - alturaDe(v, max)).toFixed(1)}`)
  .join(' ')

const marcasDeMes = computed(() => grafico.value.meses.filter(m => m % 6 === 0))

const pct = (parte, todo) => (todo > 0 ? parte / todo : 0)
const perc = (v) => `${((v || 0) * 100).toFixed(1).replace('.', ',')}%`
const dataBr = (iso) => (iso ? String(iso).split('-').reverse().join('/') : '-')
const mesBr = (iso) => (iso ? String(iso).slice(0, 7).split('-').reverse().join('/') : '-')
const sinal = (v) => (v >= 0 ? '+' : '')
const corDif = (v) => (v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
</script>

<template>
  <BlockEmpty
    v-if="!unidades.length"
    label="Simulador de proposta"
    hint="Nenhuma unidade veio da tabela autorizada."
    icon="fas fa-calculator"
  />

  <div v-else class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <!-- Cabeçalho: de qual tabela esta conta está saindo -->
    <div class="px-4 py-3 border-b border-line bg-surface-sunken/40">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 class="text-sm font-semibold text-ink">{{ title }}</h4>
        <p class="text-micro text-ink-subtle">
          Mês base {{ mesBr(mesBase) }} · VPL {{ perc(regras.vplAnual || 0.06) }} a.a.
        </p>
      </div>
      <p class="mt-0.5 text-xs text-ink-muted">
        <span class="font-medium text-ink">{{ pacote.empreendimento?.nome }}</span>
        <span v-if="pacote.empreendimento?.cidade"> · {{ pacote.empreendimento.cidade }}</span>
      </p>
      <p class="text-xs text-ink-subtle">
        {{ pacote.tabela?.nome }}
        <span v-if="pacote.tabela?.de"> · vigência {{ dataBr(pacote.tabela.de) }} a {{ dataBr(pacote.tabela.ate) }}</span>
        <span v-if="pacote.ficha"> · ficha de {{ mesBr(pacote.ficha.mes + '-01') }}</span>
      </p>

      <ul v-if="(pacote.avisos || []).length" class="mt-2 space-y-1">
        <li
          v-for="(a, i) in pacote.avisos" :key="i"
          class="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400"
        >
          <i class="fas fa-triangle-exclamation mt-0.5 flex-shrink-0" />
          <span>{{ a }}</span>
        </li>
      </ul>
    </div>

    <!-- Escolha da unidade -->
    <div class="px-4 py-3 border-b border-line grid gap-3 sm:grid-cols-3">
      <label class="block">
        <span class="text-micro uppercase tracking-wider text-ink-subtle">Bloco</span>
        <select v-model="filtroBloco" class="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink">
          <option value="">Todos</option>
          <option v-for="b in blocos" :key="b" :value="b">{{ b }}</option>
        </select>
      </label>

      <label class="block">
        <span class="text-micro uppercase tracking-wider text-ink-subtle">Situação</span>
        <select v-model="filtroSituacao" class="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink">
          <option value="">Todas</option>
          <option v-for="s in situacoes" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>

      <label class="block">
        <span class="text-micro uppercase tracking-wider text-ink-subtle">Unidade ({{ listaFiltrada.length }})</span>
        <select v-model="unidadeId" class="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink">
          <option v-for="u in listaFiltrada" :key="u.id ?? u.nome" :value="String(u.id ?? u.nome)">
            {{ u.nome }} — {{ formatValue(u.total, 'currency') }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="unidade" class="px-4 py-3 space-y-4">
      <!-- Veredito primeiro: é a resposta que a pessoa veio buscar -->
      <div
        class="rounded-lg border px-3.5 py-3"
        :class="r.fecha ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p
            class="flex items-center gap-2 text-sm font-semibold"
            :class="r.fecha ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            <i :class="r.fecha ? 'fas fa-circle-check' : 'fas fa-circle-xmark'" />
            {{ r.fecha ? 'O fluxo fecha' : 'O fluxo não fecha' }}
            <span v-if="!editada" class="font-normal text-ink-muted">· proposta ainda igual à tabela</span>
          </p>
          <p class="text-xs text-ink-muted tabular-nums">
            VP {{ formatValue(r.proposta.vpl, 'currency') }} ·
            <span :class="corDif(r.difVp)">{{ sinal(r.difVp) }}{{ formatValue(r.difVp, 'currency') }} vs tabela</span>
          </p>
        </div>

        <div class="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          <div v-for="c in r.cortes" :key="c.chave" class="flex items-center justify-between gap-2 text-xs">
            <span class="flex items-center gap-1.5 text-ink-muted">
              <i class="fa-solid text-[10px]" :class="c.ok ? 'fa-check text-emerald-500' : 'fa-xmark text-rose-500'" />
              {{ c.rotulo }}
            </span>
            <span class="tabular-nums text-right" :class="c.ok ? 'text-ink' : 'text-rose-600 dark:text-rose-400 font-medium'">
              {{ perc(c.valor) }}
              <span class="text-ink-subtle">/ mín {{ perc(c.minimo) }}</span>
              <!-- Quando a própria tabela não passa, o problema não é a
                   proposta - e isso precisa estar escrito, não deduzido. -->
              <span v-if="!c.tabelaOk" class="ml-1 text-amber-600 dark:text-amber-400">
                (tabela: {{ perc(c.valorTabela) }})
              </span>
            </span>
          </div>

          <div v-if="!r.chavesOk || r.chavesAviso" class="flex items-center justify-between gap-2 text-xs">
            <span class="flex items-center gap-1.5 text-ink-muted">
              <i
                class="fa-solid text-[10px]"
                :class="r.chavesOk ? 'fa-triangle-exclamation text-amber-500' : 'fa-xmark text-rose-500'"
              />
              Sobrando para depois da entrega
            </span>
            <span
              class="tabular-nums text-right"
              :class="r.chavesOk ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400 font-medium'"
            >
              {{ formatValue(r.proposta.aposChaves, 'currency') }}
              <span :class="r.chavesDataOk ? 'text-ink-subtle' : 'text-rose-600 dark:text-rose-400'">
                · {{ r.proposta.mesesAposChaves }} {{ r.proposta.mesesAposChaves === 1 ? 'mês' : 'meses' }} depois
              </span>
              <span class="text-ink-subtle">/ teto {{ formatValue(r.tetoAposChaves, 'currency') }} em {{ r.folgaMeses }}</span>
            </span>
          </div>
        </div>

        <p v-if="r.chavesAviso" class="mt-2 text-micro text-amber-600 dark:text-amber-400">
          Nada pode ficar para depois da entrega. O que aparece aqui é o que a PRÓPRIA tabela
          já deixa - a última mensal dela cai um mês depois da chave - e a proposta não pode
          passar disso, nem em valor nem em prazo.
        </p>

        <p v-if="r.cortes.some(c => !c.tabelaOk)" class="mt-2 text-micro text-amber-600 dark:text-amber-400">
          Os cortes marcados com "(tabela: …)" já não passam na própria tabela autorizada -
          nesses, a proposta não é a causa.
        </p>
      </div>

      <!-- Dado da unidade -->
      <div class="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <div
          v-for="s in [
            { l: 'Valor de tabela', v: formatValue(unidade.total, 'currency') },
            { l: 'Proposta', v: formatValue(r.proposta.total, 'currency') },
            { l: 'Área privativa', v: unidade.area ? `${unidade.area} m²` : '-' },
            { l: 'Proposta por m²', v: formatValue(porM2, 'currency') },
          ]" :key="s.l"
          class="rounded-lg border border-line px-3 py-2"
        >
          <p class="text-micro uppercase tracking-wider text-ink-subtle">{{ s.l }}</p>
          <p class="text-sm font-semibold text-ink tabular-nums">{{ s.v }}</p>
        </div>
      </div>

      <!-- Tabela padrão x proposta -->
      <div class="space-y-4">
        <div>
          <p class="mb-1.5 text-micro uppercase tracking-wider text-ink-subtle">
            Tabela padrão · {{ unidade.nome }} · {{ unidade.situacao }} · não editável
          </p>
          <div class="overflow-x-auto rounded-lg border border-line">
            <table class="w-full text-xs">
              <thead class="bg-surface-sunken/60 text-ink-subtle">
                <tr>
                  <th class="px-2 py-1.5 text-left font-medium">Parcela</th>
                  <th class="px-2 py-1.5 text-right font-medium">Qtde</th>
                  <th class="px-2 py-1.5 text-right font-medium">Valor</th>
                  <th class="px-2 py-1.5 text-right font-medium">1º em</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in unidade.series" :key="i" class="border-t border-line">
                  <td class="px-2 py-1.5 text-ink">{{ s.nome }}</td>
                  <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ s.qtd }}</td>
                  <td class="px-2 py-1.5 text-right text-ink tabular-nums">{{ formatValue(s.valor, 'currency') }}</td>
                  <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ dataBr(s.vencimento) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <p class="text-micro uppercase tracking-wider text-ink-subtle">Proposta</p>
            <div class="flex items-center gap-3">
              <button type="button" class="text-micro text-accent hover:underline" @click="adicionarLinha">
                <i class="fas fa-plus" /> parcela
              </button>
              <button v-if="editada" type="button" class="text-micro text-ink-subtle hover:underline" @click="restaurar">
                <i class="fas fa-rotate-left" /> voltar à tabela
              </button>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border border-line">
            <table class="w-full text-xs">
              <thead class="bg-surface-sunken/60 text-ink-subtle">
                <tr>
                  <th class="px-2 py-1.5 text-left font-medium">Parcela</th>
                  <th class="px-2 py-1.5 text-right font-medium">Qtde</th>
                  <th class="px-2 py-1.5 text-right font-medium">Valor</th>
                  <th class="px-2 py-1.5 text-right font-medium">A cada</th>
                  <th class="px-2 py-1.5 text-right font-medium">1º em</th>
                  <th class="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in proposta" :key="i" class="border-t border-line">
                  <td class="px-1.5 py-1">
                    <input
                      v-model="s.nome" aria-label="Nome da parcela"
                      class="w-full min-w-[7rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-ink hover:border-line focus:border-accent focus:outline-none"
                    >
                  </td>
                  <td class="px-1.5 py-1">
                    <input
                      v-model.number="s.qtd" type="number" min="0" step="1" aria-label="Quantidade de parcelas"
                      class="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-ink tabular-nums hover:border-line focus:border-accent focus:outline-none"
                    >
                  </td>
                  <td class="px-1.5 py-1">
                    <input
                      v-model.number="s.valor" type="number" min="0" step="0.01" aria-label="Valor da parcela"
                      class="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-ink tabular-nums hover:border-line focus:border-accent focus:outline-none"
                    >
                  </td>
                  <td class="px-1.5 py-1">
                    <select
                      v-model.number="s.periodicidade" aria-label="Intervalo entre parcelas"
                      class="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-ink hover:border-line focus:border-accent focus:outline-none"
                    >
                      <option :value="1">mês</option>
                      <option :value="2">2 meses</option>
                      <option :value="3">3 meses</option>
                      <option :value="4">4 meses</option>
                      <option :value="6">6 meses</option>
                      <option :value="12">12 meses</option>
                    </select>
                  </td>
                  <td class="px-1.5 py-1">
                    <input
                      v-model="s.vencimento" type="date" aria-label="Primeiro vencimento"
                      class="w-full min-w-[7.5rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-ink tabular-nums hover:border-line focus:border-accent focus:outline-none"
                    >
                  </td>
                  <td class="px-1 py-1 text-right">
                    <button type="button" class="text-ink-subtle hover:text-rose-500" title="Remover parcela" @click="removerLinha(i)">
                      <i class="fas fa-xmark" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 1) A venda repartida: soma 100%, é a leitura do 30/70 -->
      <div>
        <p class="mb-1.5 text-micro uppercase tracking-wider text-ink-subtle">
          Como a venda se divide · soma 100%
        </p>
        <div class="overflow-x-auto rounded-lg border border-line">
          <table class="w-full text-xs">
            <thead class="bg-surface-sunken/60 text-ink-subtle">
              <tr>
                <th class="px-2 py-1.5 text-left font-medium">Parcela</th>
                <th class="px-2 py-1.5 text-right font-medium">Valor</th>
                <th class="px-2 py-1.5 text-right font-medium">% da venda</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in comp.linhas.filter(x => !x.financia)" :key="'p' + i" class="border-t border-line">
                <td class="px-2 py-1.5 text-ink-muted pl-4">
                  {{ l.nome }}<span v-if="l.qtd > 1" class="text-ink-subtle"> ({{ l.qtd }}x)</span>
                </td>
                <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ formatValue(l.valor, 'currency') }}</td>
                <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ perc(l.pct) }}</td>
              </tr>
              <tr class="border-t border-line bg-surface-sunken/40">
                <td class="px-2 py-1.5 font-medium text-ink">Recurso próprio</td>
                <td class="px-2 py-1.5 text-right font-medium text-ink tabular-nums">{{ formatValue(comp.proprio, 'currency') }}</td>
                <td class="px-2 py-1.5 text-right font-medium tabular-nums text-ink">{{ perc(comp.pctProprio) }}</td>
              </tr>
              <tr v-for="(l, i) in comp.linhas.filter(x => x.financia)" :key="'f' + i" class="border-t border-line">
                <td class="px-2 py-1.5 font-medium text-ink">{{ l.nome }}</td>
                <td class="px-2 py-1.5 text-right font-medium text-ink tabular-nums">{{ formatValue(l.valor, 'currency') }}</td>
                <td class="px-2 py-1.5 text-right font-medium tabular-nums text-ink">{{ perc(l.pct) }}</td>
              </tr>
              <tr class="border-t-2 border-line">
                <td class="px-2 py-1.5 font-semibold text-ink">Preço da unidade</td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink tabular-nums">{{ formatValue(r.proposta.total, 'currency') }}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink tabular-nums">100,0%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-1 text-micro text-ink-subtle">
          O 30/70: o de cima é o que o cliente paga do próprio bolso, o de baixo é o financiamento na entrega.
          Aqui não há comissão - ela não muda a natureza do dinheiro, só sai depois.
        </p>
      </div>

      <!-- 2) Os dois gráficos: esforço de cada mês e corrida do acumulado -->
      <div>
        <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p class="text-micro uppercase tracking-wider text-ink-subtle">Entrada de valor · proposta x tabela</p>
          <p class="flex items-center gap-3 text-micro text-ink-subtle">
            <span class="flex items-center gap-1">
              <span class="inline-block h-2 w-3 rounded-sm bg-accent"></span> proposta
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block h-2 w-3 rounded-sm bg-ink-subtle/40"></span> tabela
            </span>
            <span v-if="r.chaves != null">· linha tracejada = chaves</span>
          </p>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <!-- Por mês -->
          <div class="rounded-lg border border-line px-3 pt-2 pb-1">
            <p class="text-xs text-ink-muted">Quanto entra em cada mês</p>
            <svg :viewBox="`0 0 ${GL} ${GA + 16}`" class="mt-1 w-full h-auto" role="img"
                 aria-label="Barras comparando a entrada mensal da proposta com a da tabela">
              <g class="text-ink-subtle">
                <line :x1="0" :y1="GA" :x2="GL" :y2="GA" stroke="currentColor" stroke-width="1" opacity="0.35" />
                <line
                  v-if="r.chaves != null" :x1="xMes(r.chaves)" :y1="0" :x2="xMes(r.chaves)" :y2="GA"
                  stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"
                />
                <text
                  v-for="m in marcasDeMes" :key="'m' + m" :x="xMes(m)" :y="GA + 13"
                  fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7"
                >{{ m }}</text>
              </g>
              <g class="text-ink-subtle">
                <rect
                  v-for="(v, i) in grafico.vt" :key="'t' + i"
                  :x="xBarra(i)" :y="GA - alturaDe(v, grafico.maxMes)"
                  :width="grafico.largura" :height="alturaDe(v, grafico.maxMes)"
                  fill="currentColor" opacity="0.35"
                />
              </g>
              <g class="text-accent">
                <rect
                  v-for="(v, i) in grafico.vp" :key="'p' + i"
                  :x="xBarra(i) + grafico.largura" :y="GA - alturaDe(v, grafico.maxMes)"
                  :width="grafico.largura" :height="alturaDe(v, grafico.maxMes)"
                  fill="currentColor"
                />
              </g>
            </svg>
            <p class="pb-1 text-micro text-ink-subtle">
              Eixo em meses desde o ato. A barra da entrega sai do teto:
              ela sozinha é {{ formatValue(grafico.valorChaves, 'currency') }}, contra
              {{ formatValue(grafico.maxMes, 'currency') }} do maior mês de obra.
            </p>
          </div>

          <!-- Acumulado -->
          <div class="rounded-lg border border-line px-3 pt-2 pb-1">
            <p class="text-xs text-ink-muted">Quanto já entrou, acumulado</p>
            <svg :viewBox="`0 0 ${GL} ${GA + 16}`" class="mt-1 w-full h-auto" role="img"
                 aria-label="Linhas comparando o acumulado da proposta com o da tabela">
              <g class="text-ink-subtle">
                <line :x1="0" :y1="GA" :x2="GL" :y2="GA" stroke="currentColor" stroke-width="1" opacity="0.35" />
                <line
                  v-if="r.chaves != null" :x1="xMes(r.chaves)" :y1="0" :x2="xMes(r.chaves)" :y2="GA"
                  stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"
                />
                <text
                  v-for="m in marcasDeMes" :key="'a' + m" :x="xMes(m)" :y="GA + 13"
                  fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7"
                >{{ m }}</text>
              </g>
              <g class="text-ink-subtle">
                <polyline
                  :points="linhaDe(grafico.at, grafico.maxAcum)"
                  fill="none" stroke="currentColor" stroke-width="4" opacity="0.35"
                  stroke-linejoin="round" stroke-linecap="round"
                />
              </g>
              <g class="text-accent">
                <polyline
                  :points="linhaDe(grafico.ap, grafico.maxAcum)"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linejoin="round" stroke-linecap="round"
                />
              </g>
            </svg>
            <p class="pb-1 text-micro text-ink-subtle">
              Linha da proposta abaixo da tabela quer dizer dinheiro entrando mais tarde.
            </p>
          </div>
        </div>
      </div>

      <!-- 3) Acumulado no tempo: quanto já ENTROU em cada marco -->
      <div class="overflow-x-auto rounded-lg border border-line">
        <table class="w-full text-xs">
          <thead class="bg-surface-sunken/60 text-ink-subtle">
            <tr>
              <th class="px-2 py-1.5 text-left font-medium">Quanto entrou até</th>
              <th class="px-2 py-1.5 text-right font-medium">Proposta</th>
              <th class="px-2 py-1.5 text-right font-medium">% da venda</th>
              <th class="px-2 py-1.5 text-right font-medium">Tabela</th>
              <th class="px-2 py-1.5 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in marcos" :key="m.rotulo" class="border-t border-line">
              <td class="px-2 py-1.5 text-ink">{{ m.rotulo }}</td>
              <td class="px-2 py-1.5 text-right text-ink tabular-nums">{{ formatValue(m.prop, 'currency') }}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ perc(pct(m.prop, r.proposta.total)) }}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ formatValue(m.tab, 'currency') }}</td>
              <td class="px-2 py-1.5 text-right tabular-nums" :class="corDif(m.prop - m.tab)">
                {{ sinal(m.prop - m.tab) }}{{ formatValue(m.prop - m.tab, 'currency') }}
              </td>
            </tr>
            <tr class="border-t border-line bg-surface-sunken/40">
              <td class="px-2 py-1.5 font-medium text-ink">Valor presente</td>
              <td class="px-2 py-1.5 text-right font-medium text-ink tabular-nums">{{ formatValue(r.proposta.vpl, 'currency') }}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ perc(pct(r.proposta.vpl, r.proposta.total)) }}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tabular-nums">{{ formatValue(r.tabela.vpl, 'currency') }}</td>
              <td class="px-2 py-1.5 text-right font-medium tabular-nums" :class="corDif(r.difVp)">
                {{ sinal(r.difVp) }}{{ formatValue(r.difVp, 'currency') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-micro text-ink-subtle">
        Diferença nominal {{ sinal(r.difNominal) }}{{ formatValue(r.difNominal, 'currency') }} ·
        chaves no mês {{ r.chaves ?? '-' }} e última parcela no mês {{ r.proposta.ultimoMes }} do fluxo.
      </p>
    </div>
  </div>
</template>
