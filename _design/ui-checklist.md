# Checklist de padronização visual - Menin Office

Gerado por `_design/mapscreens.mjs` em 2026-09-03. Para atualizar os números depois de
mexer nas telas, rode de novo e o checklist se refaz.

- **66** telas pontuadas (+ 6 especiais fora do score)
- **Score médio: 99/100**
- Score = esqueleto (50) + tokens (25) + tipografia (15) + tabela mobile (10) + gráfico com tema (10)

## Como marcar

Cada tela tem uma linha. Marque `[x]` quando ela passar nos 12 itens do checklist de aceite
em `DESIGN-LANGUAGE.md`: esqueleto completo, zero cor fixa, texto >= 11px, **paridade entre
375px e 1440px** (nada de ação só no monitor, nada de coluna estreita no meio da tela grande),
tabela com prioridade por coluna e ordenação nas duas larguras, gráfico com `useChartTheme`,
carga com `Skeleton`, alvo de toque >= 40px e PageHelp escrito.

---

## Onda 3 - Acabamento  `2 telas`

Score 75 a 94. Perto do padrão; falta gráfico com tema, help ou detalhe de tabela.

### Configuração · parte do DESKTOP <sub>(mais usada por administradores)</sub>

- [ ] **FrotaConfiguracoes** `/frota/configuracoes` · ` 75`
      <sub>views/Office/Frota/Configuracoes.vue · 1907L (+9 comp.) · 67 cor fixa</sub>

### Ferramenta · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Frota** `/frota` · ` 75`
      <sub>views/Office/Frota/Index.vue · 1744L (+9 comp.) · 64 cor fixa</sub>

## Onda 4 - Manutenção  `64 telas`

Score 95+. Já são referência. Só revalidar depois que os primitivos novos existirem.

### Painel · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Relatório de Investimento** `/viabilidade/:key` · `100`
      <sub>views/Office/Financeiro/DeptSpending/DeptSpendingReport.vue · 819L (+2 comp.) · 1 gráfico</sub>
- [ ] **Leads** `/leads` · `100`
      <sub>views/Office/Marketing/Leads/Index.vue · 3162L (+16 comp.) · 3 gráfico, 2 tabela</sub>
- [ ] **E-mail** `/outlook` · `100`
      <sub>views/Office/Microsoft/Outlook/Index.vue · 4673L (+12 comp.) · 1 gráfico</sub>

### Detalhe · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Visualizar Relatório** `/relatorios/:id/view` · `100`
      <sub>views/Office/Relatorios/View.vue · 468L · sem container, sem header</sub>
- [ ] **Plano de Eventos Detalhe** `/plano-eventos/:id` · `100`
      <sub>views/Office/Marketing/EventPlan/Detail.vue · 1448L (+6 comp.) · ok</sub>
- [ ] **Stand de Vendas Detalhe** `/stand-vendas/:id` · `100`
      <sub>views/Office/Marketing/StandVendas/Detail.vue · 2507L (+11 comp.) · ok</sub>
- [ ] **Ficha Comercial Detalhe** `/conditions/:id` · `100`
      <sub>views/Office/Comercial/Conditions/Detail.vue · 8522L (+9 comp.) · sem container, sem header</sub>
- [ ] **Reportar** `/report` · `100`
      <sub>views/Office/Support/Report.vue · 512L · ok</sub>
- [ ] **Detalhes Suporte** `/support/:id` · `100`
      <sub>views/Office/Support/SupportDetails.vue · 401L · ok</sub>

### Operação · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Checklists** `/checklists` · `100`
      <sub>views/Office/Checklist/Index.vue · 3027L (+13 comp.) · 1 tabela</sub>
- [ ] **Cobrança do Checklist** `/checklists/cobranca` · `100`
      <sub>views/Office/Checklist/Cobranca.vue · 2823L (+13 comp.) · 1 tabela</sub>
- [ ] **Checklist** `/checklists/:id` · `100`
      <sub>views/Office/Checklist/Detail.vue · 2607L (+13 comp.) · 1 tabela</sub>
- [ ] **Imobiliárias** `/imobiliarias` · `100`
      <sub>views/Office/Comercial/Imobiliarias/Index.vue · 1691L (+7 comp.) · 2 tabela</sub>
- [ ] **Viabilidade** `/viabilidade` · `100`
      <sub>views/Office/Financeiro/DeptSpending/DeptSpendingDashboard.vue · 1096L (+2 comp.) · 1 tabela</sub>
- [ ] **Projeção** `/projections` · `100`
      <sub>views/Office/Comercial/Projections/Index.vue · 963L (+3 comp.) · 1 tabela</sub>
- [ ] **Projeção Detalhes** `/projections/:id` · `100`
      <sub>views/Office/Comercial/Projections/ProjectionDetail.vue · 1373L (+3 comp.) · 1 tabela</sub>
- [ ] **Custos** `/custos` · `100`
      <sub>views/Office/Financeiro/Custos/Index.vue · 1262L · 1 tabela</sub>
- [ ] **Ato** `/cobranca/ato` · `100`
      <sub>views/Office/Financeiro/CobrancaAto/Index.vue · 3805L (+5 comp.) · 2 tabela</sub>
- [ ] **SharePoint** `/sharepoint` · `100`
      <sub>views/Office/Microsoft/Sharepoint/Index.vue · 1588L (+3 comp.) · 1 tabela</sub>
- [ ] **BucketUpload** `/bucket-upload` · `100`
      <sub>views/Office/Tools/BucketUpload/Index.vue · 481L · 1 tabela</sub>
- [ ] **Visão Executiva** `/sobre/relatorio` · `100`
      <sub>views/Office/Sobre/Relatorio.vue · 247L · 1 tabela</sub>

### Configuração · parte do DESKTOP <sub>(mais usada por administradores)</sub>

- [ ] **Plano de Eventos Configurações** `/plano-eventos/settings` · `100`
      <sub>views/Office/Marketing/EventPlan/Settings.vue · 1316L (+6 comp.) · ok</sub>
- [ ] **MCMV Configurações** `/mcmv/settings` · `100`
      <sub>views/Office/Comercial/Mcmv/Settings.vue · 229L · ok</sub>
- [ ] **Fichas Comerciais Configurações** `/conditions/settings` · `100`
      <sub>views/Office/Comercial/Conditions/Settings.vue · 7391L (+9 comp.) · ok</sub>
- [ ] **Usuários** `/users` · `100`
      <sub>views/Office/Settings/Users/Index.vue · 1384L (+2 comp.) · ok</sub>
- [ ] **Minha Conta** `/account` · `100`
      <sub>views/Office/Settings/Account/Index.vue · 934L (+6 comp.) · ok</sub>
- [ ] **Organograma** `/organograma` · `100`
      <sub>views/Office/Settings/Organogram/Index.vue · 1295L (+1 comp.) · ok</sub>
- [ ] **Sincronização de empresas** `/empresas` · `100`
      <sub>views/Office/Settings/OrgSync/Index.vue · 747L · 1 tabela</sub>
- [ ] **Cargos** `/management` · `100`
      <sub>views/Office/Settings/Management/Index.vue · 408L · ok</sub>
- [ ] **Integridade** `/integrity` · `100`
      <sub>views/Office/Settings/Integrity/Index.vue · 228L · ok</sub>
- [ ] **Alçadas** `/permissions` · `100`
      <sub>views/Office/Settings/Permissions/Index.vue · 2094L (+4 comp.) · ok</sub>
- [ ] **WhatsApp** `/whatsapp` · `100`
      <sub>views/Office/Settings/Whatsapp/Index.vue · 1859L (+8 comp.) · 1 tabela</sub>
- [ ] **Configurações DocuSign** `/docusign` · `100`
      <sub>views/Office/Settings/Docusign/Index.vue · 313L · ok</sub>
- [ ] **Sienge** `/sienge` · `100`
      <sub>views/Office/Settings/Sienge/Index.vue · 769L (+4 comp.) · ok</sub>

### Ferramenta · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Aditivos** `/aditivos` · ` 97`
      <sub>views/Office/Comercial/Aditivos/Index.vue · 248L · ok</sub>
- [ ] **Eme Atende** `/eme-atende` · ` 99`
      <sub>views/Office/Tools/EmeAtende/Index.vue · 1188L · 2 cor fixa</sub>
- [ ] **Mural de Avisos** `/mural` · `100`
      <sub>views/Office/Notifications/Index.vue · 434L (+1 comp.) · ok</sub>
- [ ] **Relatórios** `/relatorios [Office/Relatorios]` · `100`
      <sub>views/Office/Relatorios/Index.vue · 338L · ok</sub>
- [ ] **Builder de Relatório** `/relatorios/:id` · `100`
      <sub>views/Office/Relatorios/Builder.vue · 332L · sem container, sem header</sub>
- [ ] **Central Meta** `/meta` · `100`
      <sub>views/Office/Meta/Central/Index.vue · 612L (+1 comp.) · ok</sub>
- [ ] **CV CRM** `/configuracoes` · `100`
      <sub>views/Office/Cv/Central/Index.vue · 134L · ok</sub>
- [ ] **CV CRM - Integracoes** `/integracoes` · `100`
      <sub>views/Office/Cv/Integracoes/Index.vue · 588L · ok</sub>
- [ ] **Correspondentes** `/correspondentes` · `100`
      <sub>views/Office/Comercial/Correspondentes/Index.vue · 1612L (+6 comp.) · ok</sub>
- [ ] **Empreendimentos** `/buildings` · `100`
      <sub>views/Office/Comercial/Buildings/Index.vue · 996L (+4 comp.) · ok</sub>
- [ ] **Grupos de Workflow** `/workflow/groups` · `100`
      <sub>views/Office/Comercial/Workflow/Index.vue · 407L · ok</sub>
- [ ] **Plano de Eventos** `/plano-eventos` · `100`
      <sub>views/Office/Marketing/EventPlan/Index.vue · 1330L (+6 comp.) · ok</sub>
- [ ] **Stand de Vendas** `/stand-vendas` · `100`
      <sub>views/Office/Marketing/StandVendas/Index.vue · 2459L (+11 comp.) · ok</sub>
- [ ] **Eventos** `/events` · `100`
      <sub>views/Office/Marketing/Events/Index.vue · 2336L (+9 comp.) · ok</sub>
- [ ] **Relatorios** `/relatorios [Comercial/Relatorios]` · `100`
      <sub>views/Office/Comercial/Relatorios/Shell.vue · 406L (+3 comp.) · ok</sub>
- [ ] **Cancelamentos CV × Sienge** `/cancelamento-reservas` · `100`
      <sub>views/Office/Comercial/CancelamentoReservas/Index.vue · 1251L (+1 comp.) · ok</sub>
- [ ] **Fichas Comerciais** `/conditions` · `100`
      <sub>views/Office/Comercial/Conditions/Index.vue · 7648L (+9 comp.) · ok</sub>
- [ ] **MCMV — Limites por Cidade** `/mcmv` · `100`
      <sub>views/Office/Comercial/Mcmv/Index.vue · 222L · ok</sub>
- [ ] **Títulos** `/titulos` · `100`
      <sub>views/Office/Financeiro/Titulos/Index.vue · 340L · ok</sub>
- [ ] **Consulta de nº CEF** `/consulta-cef` · `100`
      <sub>views/Office/Financeiro/ConsultaCef/Index.vue · 330L · ok</sub>
- [ ] **Fluxo de Pagamento** `/paymentflow` · `100`
      <sub>views/Office/Tools/PaymentoFlow/Index.vue · 3474L (+5 comp.) · ok</sub>
- [ ] **Meu dia** `/assistente` · `100`
      <sub>views/Office/Assistente/Index.vue · 1089L (+2 comp.) · ok</sub>
- [ ] **Teams** `/teams` · `100`
      <sub>views/Office/Microsoft/Teams/Index.vue · 3680L (+11 comp.) · ok</sub>
- [ ] **Planner** `/planner` · `100`
      <sub>views/Office/Microsoft/Planner/Index.vue · 988L (+1 comp.) · sem container, sem header</sub>
- [ ] **InPersonRecording** `/inperson/recording` · `100`
      <sub>views/Office/Microsoft/Transcripts/InPerson/Recording.vue · 423L · sem container, sem header</sub>
- [ ] **Validador** `/validator` · `100`
      <sub>views/Office/Tools/Validator/Index.vue · 484L (+3 comp.) · ok</sub>
- [ ] **Cérebro da Eme** `/eme-brain` · `100`
      <sub>views/Office/Tools/EmeBrain/Index.vue · 810L · ok</sub>
- [ ] **Suporte** `/support` · `100`
      <sub>views/Office/Support/Support.vue · 201L · ok</sub>
- [ ] **Documentação** `/docs` · `100`
      <sub>views/Office/Docs/Docs.vue · 763L · ok</sub>
- [ ] **Mapa do Sistema** `/sobre` · `100`
      <sub>views/Office/Sobre/Mapa.vue · 159L · ok</sub>

## Especiais  `6 telas`

Não seguem o esqueleto de página por natureza (login, shell, home da Eme, instalação). Avaliadas à mão.

### Especial · caso a caso <sub>(todos)</sub>

- [ ] **login** `/login` · `--`
      <sub>views/Office/Auth/Index.vue · 37L · sem container, sem header, sem help</sub>
- [ ] **MicrosoftCallback** `/microsoft/callback` · `--`
      <sub>views/Office/Auth/MicrosoftCallback.vue · 322L · sem container, sem header, sem help</sub>
- [ ] **Relatório Público** `/r/:token` · `--`
      <sub>views/Public/ReportPublic.vue · 397L · sem container, sem header, sem help</sub>
- [ ] **Config** `/` · `--`
      <sub>views/Office/Config/OfficeShell.vue · 130L · sem container, sem header, sem help</sub>
- [ ] **Home**  · `--`
      <sub>views/Office/Home.vue · 324L · sem container, sem header, sem help</sub>
- [ ] **layouts** `/academy` · `--`
      <sub>views/Academy/layouts/AcademyOfficeArea.vue · 380L (+2 comp.) · sem container, sem header, sem help, 90 cor fixa</sub>

---

## Onda 0 - Fundação (antes das telas)

Sem isso, migrar tela é retrabalho. Nenhum item muda aparência sozinho.

- [x] `tailwind.config.js`: `text-micro` (piso de 11px) e `text-metric` em 4 tamanhos; cores `series-1..8` e `data-*`
- [x] `main.css`: tokens de dado nos 2 temas, escada de elevação (`.panel`, `.panel-focus`), `.metric`, `prefers-reduced-motion` global e correção do dark (A13)
- [x] `composables/useChartTheme.js`: eixo, grade, tooltip, legenda e paleta de série reativos ao tema
- [x] `components/UI/StatCard.vue` + `StatRow.vue`: KPI único (faixa rolável no estreito, grade no largo, delta, sparkline, stagger)
- [x] `components/UI/Skeleton.vue`: variantes text, title, stat, card, row, table, chart, circle
- [x] `components/UI/DataTable.vue`: prioridade por coluna, card no estreito, ordenação nas duas larguras, carga e vazio embutidos
- [x] `components/UI/FilterBar.vue`: consolida `.filters-toolbar` com altura fixa e selo de ativos
- [x] `components/UI/Panel.vue`: bloco de conteúdo com cabeçalho, ação no canto, carga e vazio
- [x] `components/UI/Sparkline.vue`: mini série em SVG (barras ou linha), ponta destacada
- [x] Remover `chart.js`, `vue-chart-3`, `preline`, `@panzoom` do package.json (+ lock sincronizado)
- [x] Apagar `components/UI/Card.vue` (0 importações)
- [ ] `components/UI/ActionBar.vue`: barra de ação em massa para seleção em tabela (fica fixa no rodapé no estreito)
- [ ] Avaliar tirar PrimeVue/Aura e Flowbite do carregamento global do `main.js` (1 arquivo usa cada um)

## Onda 5 - Varreduras mecânicas (no fim)

Depois que os substitutos existirem, a troca é buscar e trocar.

- [ ] `text-[9px]` e menores -> `text-micro` (35 ocorrências em views/Office)
- [ ] `text-[10px]` -> `text-micro` (997 em views/Office, 157 em components)
- [ ] `shadow-sm` -> `shadow-soft`; `shadow-2xl` -> `shadow-overlay` (293 no total)
- [ ] Combinação de card escrita à mão -> `.surface-card` (114 arquivos, 167 ocorrências)
- [ ] `<div @click>` -> `<button>` ou `role`+`tabindex`+`.focus-ring` (37 ocorrências)
- [ ] 26 modais artesanais -> `<Modal>`
- [ ] Academy (3.888 cores fixas): decidir se entra no padrão ou mantém identidade própria
