<script setup>
/**
 * Galeria dos componentes de resposta da Eme (Cérebro > Galeria).
 * ─────────────────────────────────────────────────────────────────────────────
 * Cada bloco da galeria com dado de exemplo, renderizado pelo MESMO ChatBlock
 * do chat. Serve para ver claro/escuro e 375px/1440px sem depender de uma
 * pergunta real, e para conferir que nenhum componente saiu do design system.
 * O seletor de largura simula a bolha do chat (compacta) e a home (larga).
 */
import { ref, computed } from 'vue';
import ChatBlock from '@/components/OfficeAI/viz/ChatBlock.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Surface from '@/components/UI/Surface.vue';
import { rotuloVisual } from '@/components/OfficeAI/viz/visuais.js';
import { VISUAIS_DE_DATASET } from '@/components/OfficeAI/viz/emeBlock.js';

const largura = ref('larga');
const larguraOpcoes = [
  { value: 'larga', label: 'Home (larga)', icon: 'fas fa-desktop' },
  { value: 'compacta', label: 'Bolha (375px)', icon: 'fas fa-mobile-screen' },
];

const EMPS = ['Residencial Ingá', 'Terras de São Paulo V', 'Jardim Mônaco', 'Parque dos Ipês', 'Residencial dos Anjos', 'MOND', 'Santa Stella', 'Viva Sul', 'Wish', 'Adhara'];
const rank = {
  columns: [{ key: 'emp', label: 'Empreendimento', type: 'text' }, { key: 'vendas', label: 'Vendas', type: 'number' }, { key: 'vgv', label: 'VGV', type: 'currency' }],
  rows: EMPS.map((e, i) => ({ emp: e, vendas: 24 - i * 2, vgv: (24 - i * 2) * 212000 })),
};
const funil = {
  columns: [{ key: 'etapa', label: 'Etapa', type: 'text' }, { key: 'n', label: 'Pastas', type: 'number' }],
  rows: [{ etapa: 'Em análise', n: 67 }, { etapa: 'Documentação', n: 63 }, { etapa: 'Aprovados', n: 59, tone: 'pos' }, { etapa: 'Em reserva', n: 25, tone: 'pos' }, { etapa: 'Reprovados', n: 49, tone: 'neg' }],
  parteDeUmTodo: true,
};
const serie = {
  columns: [{ key: 'mes', label: 'Mês', type: 'month' }, { key: 'vendas', label: 'Vendas', type: 'number' }, { key: 'meta', label: 'Meta', type: 'number' }],
  rows: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].map((m, i) => ({ mes: m, vendas: 80 + Math.round(Math.sin(i) * 25) + i * 4, meta: 100 + i * 3 })),
  series: [{ key: 'vendas', label: 'Vendas' }, { key: 'meta', label: 'Meta', role: 'meta' }],
};
const heat = {
  columns: [{ key: 'mes', label: 'Mês', type: 'month' }, { key: 'cca', label: 'CCA', type: 'text' }, { key: 'n', label: 'Pastas', type: 'number' }],
  rows: [],
};
for (const m of ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']) for (const [j, c] of ['Casa Prime', 'Nobre Crédito', 'Pro Negócios', 'Karol Caixa Aqui'].entries()) heat.rows.push({ mes: m, cca: c, n: Math.round(20 + Math.random() * 60 - j * 10) });
const comparativo = {
  columns: [{ key: 'emp', label: 'Empreendimento', type: 'text' }, { key: 'ago', label: 'Agosto', type: 'number' }, { key: 'set', label: 'Setembro', type: 'number' }],
  rows: EMPS.slice(0, 6).map((e, i) => ({ emp: e, ago: 12 + i * 3, set: 9 + i * 4 })),
};
const tabela = {
  columns: [{ key: 'cliente', label: 'Cliente', type: 'text' }, { key: 'emp', label: 'Empreendimento', type: 'text' }, { key: 'situacao', label: 'Situação', type: 'badge' }, { key: 'valor', label: 'Valor', type: 'currency' }, { key: 'data', label: 'Data', type: 'date' }, { key: 'cca', label: 'CCA', type: 'text' }],
  rows: Array.from({ length: 28 }, (_, i) => ({ cliente: `Cliente ${i + 1}`, emp: EMPS[i % EMPS.length], situacao: ['Aprovado', 'Em análise', 'Reprovado', 'Em reserva'][i % 4], valor: 180000 + i * 3500, data: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`, cca: ['Casa Prime', 'Nobre Crédito'][i % 2] })),
  total: 268, truncated: true,
};

const visualAtual = ref({});
const exemplos = computed(() => [
  ...VISUAIS_DE_DATASET.map((v) => {
    const ds = ({ table: tabela, funnel: funil, line: serie, area: serie, combo: serie, heatmap: heat, comparison: comparativo, pie: funil, donut: funil })[v] || rank;
    return { nome: rotuloVisual(v), block: { id: `g_${v}`, kind: 'dataset', title: `Exemplo · ${rotuloVisual(v)}`, subtitle: 'dado de demonstração', source: 'Galeria', visual: { type: v }, dataset: ds, actions: [{ kind: 'navigate', label: 'Abrir tela', payload: { route: '/comercial/relatorios/faturamento' } }] } };
  }),
  { nome: 'Números (em linha)', block: { id: 'g_kpis_i', kind: 'kpis', inline: true, kpis: [{ label: 'Vendas', value: 120 }, { label: 'VGV', value: 22599125, type: 'currency' }, { label: 'De lead', value: 6.7, type: 'percent', tone: 'pos' }, { label: 'Ticket', value: 188326, type: 'currency' }] } },
  { nome: 'Números (cards)', block: { id: 'g_kpis_c', kind: 'kpis', title: 'Setembro', kpis: [{ label: 'Vendas', value: 17, hint: 'de 126 projetadas', delta: { value: 12, dir: 'up', good: true, label: 'vs agosto' } }, { label: 'VGV', value: 3597425, type: 'currency', tone: 'accent' }, { label: 'Atingido', value: 13.5, type: 'percent', tone: 'warn' }] } },
  { nome: 'Cards', block: { id: 'g_cards', kind: 'cards', title: 'Correspondentes', cards: [
    { title: 'Casa Prime Organização de Documentos', subtitle: 'Marília · Dourados · Regente Feijó', badges: [{ label: 'importada', variant: 'neutral' }, { label: '1.640 pastas', variant: 'accent' }], fields: [{ label: 'Gerente', value: 'Erica Castilho' }, { label: 'Atende', value: 'Santa Stella, Terras V, Viva Sul' }, { label: 'Aprovação', value: 39, type: 'percent' }, { label: 'E-mail', value: 'erica@casadecreditos.com.br' }, { label: 'Telefone', value: '(18) 9977-4786' }], actions: [{ kind: 'navigate', label: 'Abrir', payload: { route: '/crm/correspondentes' } }] },
    { title: 'Nobre Crédito', subtitle: 'Dourados', badges: [{ label: '82 pastas', variant: 'accent' }], fields: [{ label: 'Gerente', value: 'Gilsomar Ferreira Nobre' }, { label: 'Atende', value: 'Residencial Ingá' }, { label: 'Aprovação', value: 35, type: 'percent' }], icon: 'fas fa-building-columns' },
  ] } },
  { nome: 'Detalhe', block: { id: 'g_detail', kind: 'detail', title: 'Residencial Ingá', subtitle: 'Ficha Comercial 09/2026', source: 'Fichas Comerciais', icon: 'fas fa-city', detail: { sections: [
    { title: 'Comercial', icon: 'fas fa-handshake', fields: [{ label: 'Comissão', value: 5, type: 'percent' }, { label: 'Entrada máx.', value: 15000, type: 'currency' }, { label: 'Parcelas', value: 60, type: 'number' }] },
    { title: 'Responsáveis', icon: 'fas fa-user-tie', fields: [{ label: 'Gestor', value: 'Antônio Marcio' }, { label: 'Correspondente', value: 'Nobre Crédito' }, { label: 'Prazo de entrega', value: '24 meses' }] },
  ] } } },
  { nome: 'Linha do tempo', block: { id: 'g_tl', kind: 'timeline', title: 'Reserva 8202', timeline: { events: [{ at: '2026-09-10T14:20', title: 'Boleto baixado por devolução', tone: 'warn' }, { at: '2026-09-08T09:00', title: 'Parcela 1/60 emitida', detail: 'R$ 744,78 · venc. 10/09', tone: 'accent' }, { at: '2026-08-30', title: 'Ato pago', tone: 'pos' }] } } },
  { nome: 'Mapa', block: { id: 'g_map', kind: 'map', title: 'Onde fica', map: { points: [{ lat: -23.5505, lng: -46.6333, label: 'Stand de vendas', address: 'Av. Paulista, 1000' }] } } },
  { nome: 'Escolha', block: { id: 'g_choice', kind: 'choice', choice: { label: 'Sugestões', options: [{ label: 'Por CCA', prompt: 'quebra por CCA', icon: 'fas fa-building-columns' }, { label: 'Só leads', prompt: 'só os que vieram de lead' }, { label: 'Abrir relatório', route: '/comercial/relatorios/precadastros', filters: {} }] } } },
  { nome: 'Confirmação', block: { id: 'g_confirm', kind: 'confirm', confirm: { title: 'Guardar esta preferência?', detail: 'formato_valor · VGV sem DC', consequence: 'A Eme passa a mostrar valores sem DC em toda resposta sua. Você desfaz em Configurações da Eme.', confirmLabel: 'Guardar', effect: { type: 'prompt', prompt: '(demo)' } } } },
  { nome: 'Navegação', block: { id: 'g_nav', kind: 'nav', nav: { route: '/financeiro/cobranca/ato', message: 'Abrir Ato e Parcelas com os boletos com erro' } } },
  { nome: 'Texto', block: { id: 'g_text', kind: 'text', text: 'Texto em **markdown**, com lista:\n\n- um\n- dois' } },
]);
</script>

<template>
  <div class="space-y-4">
    <Surface variant="raised" padding="md">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 class="text-base font-semibold text-ink">Galeria de componentes</h2>
          <p class="text-xs text-ink-muted">Os blocos que a Eme usa para responder, com dado de exemplo. Troque o tema do Office e a largura aqui para conferir os dois modos.</p>
        </div>
        <SegmentedControl :model-value="largura" :options="larguraOpcoes" size="sm" @change="(v) => largura = v" />
      </div>
    </Surface>

    <div :class="largura === 'compacta' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'">
      <section v-for="ex in exemplos" :key="ex.block.id" class="min-w-0">
        <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1">{{ ex.nome }}</p>
        <div :class="largura === 'compacta' ? 'max-w-[375px] text-sm' : ''">
          <ChatBlock :block="ex.block" :compact="largura === 'compacta'" />
        </div>
      </section>
    </div>
  </div>
</template>
