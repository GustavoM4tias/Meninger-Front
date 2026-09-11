# Eme - Galeria de componentes de resposta (plano)

Data: 11/09/2026. Pedido do Gustavo: "meus componentes hoje funcionam mas não da
melhor forma, despadronizados e alguns até feios; preciso de uma galeria à
disposição da Eme, que escolhe a melhor opção de cada tabela/lista/gráfico".

Este documento é o PLANO. Quem executar (Opus) segue as fases na ordem; cada
fase termina com um critério de pronto verificável. Nada aqui é código.

## 0. Onde estamos (medido em 11/09/2026)

- 28 renderers em `src/components/OfficeAI/renderers/` (5.173 linhas). Um
  switch em `ChatMessage.vue` decide pelo `action.type` (`table`, `chart`,
  `detail`, `imobiliaria_cards`, `condition_sheet`, `memory_proposal`...).
- Cada tool do back devolve o SEU formato (`type` + campos próprios) e cada
  formato tem um componente dedicado. Resultado: 12 variações de "cards"
  (imobiliária, pessoa, relatório, checklist, campanha, academy, reunião...),
  cada uma com espaçamento, tipografia e ação no próprio jeito.
- `ChatChart.vue` (echarts, `useChartTheme`) só faz bar/pie/line.
  `ChatTable.vue` não ordena, não pagina, não filtra; exporta Excel.
- O modelo NÃO escolhe visual: o `type` vem fixo da tool. "Me mostra em
  pizza" hoje depende da tool aceitar `group_by` e o componente ter o modo.
- Renderers que são formulário (`ChatAlertEditor.vue`, 1.205 linhas) misturam
  layout, validação e chamadas de API num arquivo só.
- Design system: primitivos em `components/UI/` (StatCard, StatRow, RankBars,
  FunnelStrip, Sparkline, DataTable, Badge, SegmentedControl, Switch...) e
  paleta de dado validada (`_design`, memória `reference_design_language_v2`).
  Os renderers do chat quase não usam esses primitivos - por isso parecem
  outro produto.

## 1. Princípios (o que não muda depois de decidido)

1. **Dado separado de forma.** A tool devolve DADO num contrato único; o
   visual é uma escolha por cima. A mesma resposta pode virar tabela, barras
   ou pizza sem voltar ao servidor.
2. **A Eme escolhe, com régua.** O modelo diz `visual` quando faz sentido
   ("em pizza", "compara", "linha do tempo"); sem pedido, uma função
   determinística escolhe pela forma do dado (1 série temporal → linha; até 6
   categorias com parte-de-um-todo → pizza; 2 séries lado a lado → colunas
   agrupadas; matriz categoria x período → mapa de calor; >12 linhas → tabela).
   A escolha automática é testável e vira caso de avaliação.
3. **Um jeito de cada coisa.** Um card, uma tabela, um gráfico, um KPI, um
   formulário. Variação é por props, nunca por componente novo.
4. **Design system primeiro.** Todo componente novo compõe os primitivos de
   `components/UI/` e a paleta de dado. Nenhuma cor crua, nenhum hex.
5. **Mobile-first.** Diretoria só no celular: tabela vira cards abaixo de
   `sm`, gráfico cabe em 320px, alvo de toque ≥ 40px.
6. **Compatibilidade por adaptador.** Os 28 renderers continuam funcionando
   até o último ser migrado; a troca é por tool, com o adaptador traduzindo o
   formato antigo para o contrato novo.

## 2. Contrato de dados (`EmeBlock`)

Toda tool passa a devolver `result.blocks: EmeBlock[]` (ou um só), além do
`message` para o modelo. Campos:

```
EmeBlock {
  kind:      'dataset' | 'kpis' | 'cards' | 'detail' | 'text' | 'form' | 'choice' | 'confirm' | 'timeline' | 'map' | 'nav'
  id:        string            // estável dentro da resposta
  title?, subtitle?, source?   // source = "Fichas Comerciais 09/2026 (Autorizada)"
  visual?:   VisualHint        // sugestão da tool; o modelo/pessoa podem trocar
  actions?:  Action[]          // { label, kind:'navigate'|'prompt'|'download'|'confirm', payload }
  // por kind:
  dataset?:  { columns: Column[], rows: Row[], total?, truncated?, series?: SeriesSpec[] }
  kpis?:     Kpi[]             // { label, value, unit?, delta?, tone?, hint?, sparkline? }
  cards?:    Card[]            // { title, subtitle?, badges?, fields?, avatar?, actions? }
  detail?:   { fields: Field[], sections?: Section[] }
  form?:     FormSpec          // schema declarativo (campos, tipos, validação, submit)
  choice?:   { options: Option[], multiple?, submitPrompt }   // seletores / check
  timeline?: { events: Event[] }
  map?:      { points: Point[], center?, zoom? }
}
Column { key, label, type: 'text'|'number'|'currency'|'percent'|'date'|'badge'|'link', align?, width?, sortable? }
VisualHint { type: 'table'|'bar'|'column'|'line'|'area'|'pie'|'donut'|'heatmap'|'combo'|'comparison'|'funnel'|'rank'|'cards'|'kpis', x?, y?: string[], stack?, options? }
```

Regras:
- `dataset` é a forma canônica de tudo que é lista ou série. Gráfico e tabela
  são dois visuais do MESMO dataset.
- `series` opcional descreve colunas numéricas por nome (rótulo, unidade,
  eixo). Sem `series`, o visual usa as colunas `number/currency/percent`.
- Valores monetários vão como número; formatação é do componente.
- `truncated: true` + `total` quando a tool cortou linhas: o componente mostra
  "N de M" e a ação "abrir tela completa".

## 3. Galeria (`src/components/OfficeAI/viz/`)

Um componente por visual, todos com a mesma casca (`VizFrame`: título, fonte,
ações, estado vazio, skeleton, botão "trocar visual", exportar):

| Componente | Cobre hoje | Primitivo do DS que usa |
|---|---|---|
| `VizTable` | ChatTable | DataTable (ordenar, paginar, buscar, cards no mobile, Excel) |
| `VizBar` / `VizColumn` | ChatChart bar | echarts + useChartTheme, top-N + "outros" |
| `VizLine` / `VizArea` | (não existe) | echarts; série temporal, marcação de hoje, meta tracejada |
| `VizPie` / `VizDonut` | ChatChart pie | echarts; máximo 6 fatias + "outros"; centro com total |
| `VizHeatmap` | (não existe) | echarts; categoria x período (pastas por CCA x mês) |
| `VizCombo` | (não existe) | colunas + linha (vendas x meta, leads x conversão) |
| `VizComparison` | (não existe) | duas ou mais séries lado a lado (mês x mês, empreendimento x empreendimento), com delta |
| `VizFunnel` | PrecadastrosSummary, ReservasSummary | FunnelStrip |
| `VizRank` | (rankings em tabela) | RankBars |
| `VizKpis` | cabeçalhos dos summaries | StatRow / StatCard / MetricInline |
| `VizCards` | Imobiliaria/Person/Report/Checklist/Campaign/Academy/Meeting cards | um card só, com `fields`, `badges`, `avatar`, `actions` |
| `VizDetail` | EnterpriseDetail, ConditionSheet | ficha em seções, campo-valor |
| `VizText` | ChatText | markdown (já existe) |
| `VizTimeline` | (não existe) | linha do tempo (histórico da reserva, do repasse, do alerta) |
| `VizMap` | mapa do EnterpriseDetail | mapa com pontos |
| `VizChoice` | sugestões/atalhos (LeadsActions, EventsActions...) | SegmentedControl / chips; opções viram prompt |
| `VizConfirm` | MemoryProposal, ações "confirmar" do Checklist | um padrão de confirmar com consequência |
| `VizForm` | AlertEditor, ChatAlertEditor inline | formulário declarativo (schema → campos do DS), submit por API |
| `VizNav` | NavAction | botão de abrir tela |

Dispatcher: `ChatBlock.vue` recebe um `EmeBlock`, resolve o visual
(`block.visual?.type` → `escolherVisual(dataset)` como fallback) e monta o
componente. `ChatMessage.vue` passa a iterar `action.blocks`; o switch antigo
vira o adaptador da fase 5.

## 4. Como a Eme escolhe

- Toda tool de dado ganha o argumento `visual` (enum de `VisualHint.type`).
  O modelo passa quando a pessoa pediu ("em pizza", "compara com agosto",
  "linha do tempo", "só os números"). Sem pedido, omite.
- `escolherVisual(dataset)` no FRONT (determinística, testada):
  - 1 coluna categórica + 1 numérica, ≤ 6 linhas, soma faz sentido → donut
  - 1 categórica + 1 numérica, ≤ 15 linhas → barras horizontais (rank)
  - coluna de data/mês + 1 numérica → linha; + meta → combo
  - data x categoria (pivot) → heatmap
  - 2+ numéricas comparáveis por categoria → colunas agrupadas
  - > 15 linhas ou > 4 colunas → tabela
  - só KPIs → kpis
- Botão "trocar visual" no `VizFrame`: a pessoa alterna sem perguntar de novo.
  A escolha dela numa sessão vira sugestão (`lembrar_preferencia` -
  "prefiro tabela a gráfico") só se ela confirmar.
- Casos de avaliação novos: "mostra em pizza" → `visual:'pie'`; "compara
  agosto com setembro" → `visual:'comparison'`; pergunta simples → sem visual
  e a escolha automática dá o esperado.

## 5. Fases

**Fase 1 - Contrato e casca (sem tocar em tool).**
`types/emeBlock.js` (validador leve do contrato), `VizFrame.vue`,
`ChatBlock.vue`, `escolherVisual()` + testes. Adaptador
`legacyActionToBlocks(action)` que traduz os `type` atuais (`table`, `chart`,
`*_cards`, `detail`, `navigate`) para blocks - a partir daqui TODA resposta
passa pelo dispatcher novo, mesmo vinda de tool antiga.
Pronto quando: as 28 respostas atuais renderizam pelo `ChatBlock` sem
regressão visual pior que hoje (comparar screenshot a screenshot).

**Fase 2 - Galeria de dado.**
`VizTable`, `VizBar/Column`, `VizLine/Area`, `VizPie/Donut`, `VizKpis`,
`VizRank`, `VizFunnel`, `VizHeatmap`, `VizCombo`, `VizComparison`. Uma página
interna `Cérebro da Eme > Galeria` (admin) mostra cada componente com dados
de exemplo, claro e escuro, 375px e desktop - é a "storybook" do time.
Pronto quando: a galeria abre com os 12 componentes e nenhum usa cor crua
(rodar o verificador de tokens de `_design`).

**Fase 3 - Galeria de interação.**
`VizCards`, `VizDetail`, `VizChoice`, `VizConfirm`, `VizForm`, `VizTimeline`,
`VizMap`, `VizNav`. `VizForm` nasce do `ChatAlertEditor`: o editor de alerta
vira um schema, e o componente genérico o renderiza.
Pronto quando: criar alerta pela Eme funciona pelo `VizForm` e o
`ChatAlertEditor.vue` some.

**Fase 4 - Tools devolvem blocks.**
Ordem por uso (medir em `eme_audit_logs` os 30 dias anteriores):
pré-cadastros, leads, reservas, fichas, boletos, desempenho de vendas,
vendas x projeção, correspondentes, custos, empreendimentos, imobiliárias,
pessoas, checklists, relatórios, academy, agenda. Cada tool: `blocks` +
argumento `visual` + `source` preenchido. O `message` para o modelo fica
igual (ele continua respondendo curto; o visual já está na tela).
Pronto quando: `legacyActionToBlocks` não é chamado em produção por 7 dias
(medir por log).

**Fase 5 - Limpeza.**
Apagar os 28 renderers antigos e o switch; `ChatMessage.vue` só conhece
`ChatBlock`. Atualizar `project_eme_renderers_ui.md`.

## 6. Critérios transversais

- Claro e escuro: tokens; nunca definir cor só no bloco `dark`.
- Mobile: cada componente testado a 375px; tabela vira cards; gráfico
  ocupa a largura e ganha altura mínima de 220px.
- Acessibilidade: gráfico sempre com tabela equivalente acessível (botão
  "ver como tabela"), contraste da paleta de dado validado.
- Exportar: todo `dataset` exporta Excel pelo mesmo botão (motor já existe).
- Performance: echarts carregado uma vez (`defineAsyncComponent`), máximo
  200 linhas renderizadas por tabela sem virtualização; acima disso pagina.
- Nada de véu translúcido de fundo; glow preso ao elemento
  (`feedback_visual_effects`).

## 7. O que NÃO entra

- Nova biblioteca de gráfico (echarts fica).
- Editor visual de dashboard dentro do chat (isso é o Relatórios da Eme).
- Mudar o contrato das tools de AÇÃO (agenda, e-mail, tarefas): elas já
  devolvem cards específicos e são poucas; entram só no `VizCards`/`VizConfirm`.

## 8. Ordem de execução sugerida para o Opus

1. Ler este plano, `reference_design_language_v2`, `reference_design_system`,
   `project_eme_renderers_ui` e `feedback_visual_effects`.
2. Fase 1 inteira num PR só (contrato + casca + adaptador + testes).
3. Fase 2 em dois PRs (dado simples; depois heatmap/combo/comparison + galeria).
4. Fase 3 em dois PRs (cards/detail/choice/confirm; depois form/timeline/map).
5. Fase 4 tool a tool, uma por PR, com caso de avaliação para cada `visual`.
6. Fase 5.

## 9. Execução (registro)

**11/09/2026 - fases 1, 2 e 3 (parcial) entregues; fase 4 iniciada.**

- Fase 1: `viz/emeBlock.js`, `viz/escolherVisual.js`, `viz/legacyAdapter.js`,
  `viz/ChatBlock.vue`, `viz/VizFrame.vue`; `ChatMessage.vue` só conhece
  `ChatBlock`. Testes: `tests/emeViz.test.mjs` (`npm test`, node --test -
  o front não tinha teste nenhum).
- Fase 2: `VizTable`, `VizChart` (bar, column, line, area, pie, donut,
  heatmap, combo, comparison), `VizRank`, `VizFunnel`, `VizKpis`.
  **Decisão**: a família de gráficos é UM componente (`VizChart` + prop
  `visual`) em vez de nove arquivos - o ECharts é carregado uma vez e as
  regras da paleta ficam num lugar. A tabela da seção 3 vale como lista de
  visuais, não de arquivos. Galeria em Cérebro da Eme > Galeria.
- Fase 3: `VizCards`, `VizDetail`, `VizChoice`, `VizConfirm`, `VizNav`,
  `VizTimeline`, `VizMap`. **Falta `VizForm`** (o `ChatAlertEditor` de 1.205
  linhas continua atrás do bloco `legacy`).
- Fase 4: back ganhou `services/OfficeAI/blocks.js` (construtores) e o arg
  `visual`. Já devolvem `blocks`: `query_desempenho_vendas`,
  `query_vendas_vs_projecao`, `correspondentes_search`,
  `query_condition_sheets`. Regra de transição: `blocks` vai JUNTO do formato
  antigo (`type: 'table'`), porque alertas (`AlertReportService.buildReport`)
  e relatórios (`ReportDataService`) ainda leem `rows/labels`. O chat prefere
  `blocks`. `summarizeForGemini` tem ramo para tool que só fale `blocks`.
- Pendente da fase 4, por ordem de uso: pré-cadastros, leads, reservas,
  boletos, custos, empreendimentos, imobiliárias, pessoas, checklists,
  relatórios, academy, agenda. Depois: migrar alertas/relatórios para ler
  `blocks` e apagar o formato antigo (fase 5).
