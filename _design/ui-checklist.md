# Checklist de padronização visual - Menin Office

Gerado por `_design/mapscreens.mjs` em 2026-08-20. Para atualizar os números depois de
mexer nas telas, rode de novo e o checklist se refaz.

- **65** telas pontuadas (+ 6 especiais fora do score)
- **Score médio: 76/100**
- Score = esqueleto (50) + tokens (25) + tipografia (15) + tabela mobile (10) + gráfico com tema (10)

## Como marcar

Cada tela tem uma linha. Marque `[x]` quando ela passar nos 12 itens do checklist de aceite
em `DESIGN-LANGUAGE.md`: esqueleto completo, zero cor fixa, texto >= 11px, **paridade entre
375px e 1440px** (nada de ação só no monitor, nada de coluna estreita no meio da tela grande),
tabela com prioridade por coluna e ordenação nas duas larguras, gráfico com `useChartTheme`,
carga com `Skeleton`, alvo de toque >= 40px e PageHelp escrito.

---

## Onda 1 - Reconstrução  `13 telas`

Score abaixo de 55. Fora do esqueleto ou com dívida grande de cor. Cada uma é uma tarefa própria.

### Detalhe · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Ficha Comercial Detalhe** `/conditions/:id` · `  8`
      <sub>views/Office/Comercial/Conditions/Detail.vue · 9257L (+10 comp.) · sem container, sem header, sem help, 421 cor fixa, 81 texto micro, 6 modal na mão</sub>
- [ ] **Visualizar Relatório** `/relatorios/:id/view` · ` 50`
      <sub>views/Office/Relatorios/View.vue · 434L · sem container, sem header, sem help, 2 texto micro</sub>

### Operação · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Checklist** `/checklists/:id` · ` 46`
      <sub>views/Office/Checklist/Detail.vue · 2547L (+14 comp.) · sem container, sem header, sem help, 3 cor fixa, 16 texto micro, 1 tabela</sub>
- [ ] **Cobrança do Checklist** `/checklists/cobranca` · ` 47`
      <sub>views/Office/Checklist/Cobranca.vue · 2549L (+14 comp.) · sem container, sem header, sem help, 3 cor fixa, 15 texto micro, 1 tabela</sub>

### Configuração · parte do DESKTOP <sub>(mais usada por administradores)</sub>

- [ ] **Fichas Comerciais Configurações** `/conditions/settings` · ` 29`
      <sub>views/Office/Comercial/Conditions/Settings.vue · 7837L (+10 comp.) · sem header, sem help, 329 cor fixa, 73 texto micro</sub>
- [ ] **Configurações DocuSign** `/docusign` · ` 48`
      <sub>views/Office/Settings/Docusign/Index.vue · 287L · sem container, sem header, sem help, 4 cor fixa</sub>
- [ ] **Minha Conta** `/account` · ` 49`
      <sub>views/Office/Settings/Account/Index.vue · 894L (+6 comp.) · sem container, sem header, sem help, 5 texto micro</sub>

### Ferramenta · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Fluxo de Pagamento** `/paymentflow` · ` 16`
      <sub>views/Office/Tools/PaymentoFlow/Index.vue · 3596L (+5 comp.) · sem container, sem header, sem help, 251 cor fixa, 24 texto micro, 2 modal na mão</sub>
- [ ] **Grupos de Workflow** `/workflow/groups` · ` 20`
      <sub>views/Office/Comercial/Workflow/Index.vue · 345L · sem container, sem header, sem help, 104 cor fixa, 1 modal na mão</sub>
- [ ] **Fichas Comerciais** `/conditions` · ` 43`
      <sub>views/Office/Comercial/Conditions/Index.vue · 8108L (+10 comp.) · sem help, 332 cor fixa, 78 texto micro</sub>
- [ ] **Builder de Relatório** `/relatorios/:id` · ` 49`
      <sub>views/Office/Relatorios/Builder.vue · 282L · sem container, sem header, sem help, 2 cor fixa</sub>
- [ ] **InPersonRecording** `/inperson/recording` · ` 50`
      <sub>views/Office/Microsoft/Transcripts/InPerson/Recording.vue · 374L · sem container, sem header, sem help, 2 texto micro</sub>
- [ ] **Planner** `/planner` · ` 52`
      <sub>views/Office/Microsoft/Planner/Index.vue · 883L (+1 comp.) · sem container, sem header, 42 cor fixa, 10 texto micro</sub>

## Onda 2 - Alinhamento  `7 telas`

Score 55 a 74. Estrutura existe, falta token, help ou plano mobile.

### Painel · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Reservas** `/reservas-report` · ` 59`
      <sub>views/Office/Comercial/Reservas/Index.vue · 1848L (+5 comp.) · sem help, 7 cor fixa, 55 texto micro, 1 gráfico, 2 tabela</sub>

### Detalhe · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Detalhes Suporte** `/support/:id` · ` 65`
      <sub>views/Office/Support/SupportDetails.vue · 381L · sem header, sem help</sub>

### Operação · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Boleto Caixa** `/boleto-caixa` · ` 69`
      <sub>views/Office/Financeiro/BoletoCaixa/Index.vue · 2599L (+2 comp.) · sem help, 2 cor fixa, 38 texto micro, 2 tabela, 1 modal na mão</sub>

### Configuração · parte do DESKTOP <sub>(mais usada por administradores)</sub>

- [ ] **MCMV Configurações** `/mcmv/settings` · ` 64`
      <sub>views/Office/Comercial/Mcmv/Settings.vue · 215L · sem header, sem help, 5 texto micro</sub>
- [ ] **Painel de Alertas** `/alerts/admin` · ` 70`
      <sub>views/Office/Settings/Alerts/Admin/Index.vue · 127L · sem help, 1 tabela sem mobile</sub>

### Ferramenta · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **SharePoint** `/sharepoint` · ` 70`
      <sub>views/Office/Microsoft/Sharepoint/Index.vue · 1379L (+3 comp.) · 62 cor fixa, 4 texto micro, 1 modal na mão</sub>
- [ ] **Empreendimentos** `/buildings` · ` 73`
      <sub>views/Office/Comercial/Buildings/Index.vue · 985L (+4 comp.) · sem help, 10 cor fixa, 20 texto micro</sub>

## Onda 3 - Acabamento  `27 telas`

Score 75 a 94. Perto do padrão; falta gráfico com tema, help ou detalhe de tabela.

### Painel · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Leads** `/leads` · ` 79`
      <sub>views/Office/Marketing/Leads/Index.vue · 2980L (+16 comp.) · 7 cor fixa, 56 texto micro, 3 gráfico, 2 tabela</sub>
- [ ] **Relatório de Investimento** `/viabilidade/:key` · ` 88`
      <sub>views/Office/Financeiro/DeptSpending/DeptSpendingReport.vue · 831L (+2 comp.) · 2 cor fixa, 10 texto micro, 1 gráfico</sub>

### Detalhe · parte do MÓVEL <sub>(mais usada por diretoria e lideranças)</sub>

- [ ] **Reportar** `/report` · ` 79`
      <sub>views/Office/Support/Report.vue · 496L · sem help, 4 texto micro</sub>
- [ ] **Plano de Eventos Detalhe** `/plano-eventos/:id` · ` 80`
      <sub>views/Office/Marketing/EventPlan/Detail.vue · 1417L (+6 comp.) · sem help</sub>

### Operação · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Custos** `/custos` · ` 75`
      <sub>views/Office/Financeiro/Custos/Index.vue · 1206L (+1 comp.) · sem help, 2 cor fixa, 26 texto micro, 1 tabela</sub>
- [ ] **Projeção Detalhes** `/projections/:id` · ` 77`
      <sub>views/Office/Comercial/Projections/ProjectionDetail.vue · 1362L (+3 comp.) · sem header, 9 cor fixa, 29 texto micro, 1 tabela</sub>
- [ ] **BucketUpload** `/bucket-upload` · ` 77`
      <sub>views/Office/Tools/BucketUpload/Index.vue · 465L · sem help, 19 texto micro, 1 tabela</sub>
- [ ] **Títulos** `/titulos` · ` 79`
      <sub>views/Office/Financeiro/Titulos/Index.vue · 352L · sem help, 9 texto micro, 1 tabela</sub>
- [ ] **Projeção** `/projections` · ` 93`
      <sub>views/Office/Comercial/Projections/Index.vue · 964L (+3 comp.) · 9 cor fixa, 26 texto micro, 1 tabela</sub>
- [ ] **Viabilidade** `/viabilidade` · ` 94`
      <sub>views/Office/Financeiro/DeptSpending/DeptSpendingDashboard.vue · 984L (+2 comp.) · 2 cor fixa, 32 texto micro, 1 tabela</sub>

### Configuração · parte do DESKTOP <sub>(mais usada por administradores)</sub>

- [ ] **Usuários** `/users` · ` 79`
      <sub>views/Office/Settings/Users/Index.vue · 1338L (+2 comp.) · sem help, 8 texto micro</sub>
- [ ] **Organograma** `/organograma` · ` 79`
      <sub>views/Office/Settings/Organogram/Index.vue · 1224L (+1 comp.) · sem help, 9 texto micro</sub>
- [ ] **Cargos** `/management` · ` 79`
      <sub>views/Office/Settings/Management/Index.vue · 353L · sem help, 5 texto micro</sub>
- [ ] **WhatsApp** `/whatsapp` · ` 79`
      <sub>views/Office/Settings/Whatsapp/Index.vue · 1803L (+8 comp.) · sem help, 5 texto micro, 1 tabela</sub>
- [ ] **Gestão de Comunicados** `/mural/admin` · ` 80`
      <sub>views/Office/Mural/Admin.vue · 551L (+3 comp.) · sem help</sub>
- [ ] **Plano de Eventos Configurações** `/plano-eventos/settings` · ` 80`
      <sub>views/Office/Marketing/EventPlan/Settings.vue · 1291L (+6 comp.) · sem help</sub>
- [ ] **Notificações** `/notifications` · ` 80`
      <sub>views/Office/Settings/Notifications/Index.vue · 141L · sem help</sub>
- [ ] **Alertas** `/alerts` · ` 80`
      <sub>views/Office/Settings/Alerts/Index.vue · 1095L (+3 comp.) · sem help, 1 texto micro</sub>

### Ferramenta · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Cérebro da Eme** `/eme-brain` · ` 76`
      <sub>views/Office/Tools/EmeBrain/Index.vue · 784L · sem help, 28 texto micro</sub>
- [ ] **MCMV — Limites por Cidade** `/mcmv` · ` 79`
      <sub>views/Office/Comercial/Mcmv/Index.vue · 207L · sem help, 6 texto micro</sub>
- [ ] **Teams** `/teams` · ` 79`
      <sub>views/Office/Microsoft/Teams/Index.vue · 2347L (+7 comp.) · 39 cor fixa, 35 texto micro</sub>
- [ ] **Validador** `/validator` · ` 79`
      <sub>views/Office/Tools/Validator/Index.vue · 470L (+3 comp.) · sem help, 9 texto micro</sub>
- [ ] **Mural de Avisos** `/mural` · ` 80`
      <sub>views/Office/Mural/Index.vue · 495L (+3 comp.) · sem help</sub>
- [ ] **Eme Atende** `/eme-atende` · ` 80`
      <sub>views/Office/Tools/EmeAtende/Index.vue · 1066L · sem help, 1 texto micro</sub>
- [ ] **Caixa de Notificações** `/notifications` · ` 80`
      <sub>views/Office/Notifications/Index.vue · 149L · sem help, 1 texto micro</sub>
- [ ] **Suporte** `/support` · ` 80`
      <sub>views/Office/Support/Support.vue · 187L · sem help</sub>
- [ ] **Eventos** `/events` · ` 94`
      <sub>views/Office/Marketing/Events/Index.vue · 2329L (+9 comp.) · 4 cor fixa, 27 texto micro</sub>

## Onda 4 - Manutenção  `18 telas`

Score 95+. Já são referência. Só revalidar depois que os primitivos novos existirem.

### Operação · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Checklists** `/checklists` · ` 96`
      <sub>views/Office/Checklist/Index.vue · 3017L (+14 comp.) · 3 cor fixa, 18 texto micro, 1 tabela</sub>
- [ ] **Cancelamentos CV × Sienge** `/cancelamento-reservas` · ` 96`
      <sub>views/Office/Comercial/CancelamentoReservas/Index.vue · 1175L (+1 comp.) · 27 texto micro, 1 tabela</sub>
- [ ] **Pré-Cadastros** `/precadastros` · ` 98`
      <sub>views/Office/Comercial/Precadastros/Index.vue · 992L (+2 comp.) · 5 cor fixa, 1 tabela</sub>
- [ ] **Relatorios** `/relatorios` · ` 98`
      <sub>views/Office/Comercial/Relatorios/Shell.vue · 698L (+9 comp.) · 11 texto micro, 1 tabela</sub>
- [ ] **Consulta de nº CEF** `/consulta-cef` · ` 98`
      <sub>views/Office/Financeiro/ConsultaCef/Index.vue · 352L · 13 texto micro, 1 tabela</sub>
- [ ] **Stand de Vendas** `/stand-vendas` · ` 99`
      <sub>views/Office/Marketing/StandVendas/Index.vue · 730L (+3 comp.) · 7 texto micro, 1 tabela</sub>
- [ ] **Imobiliárias** `/imobiliarias` · ` 99`
      <sub>views/Office/Comercial/Imobiliarias/Index.vue · 1457L (+7 comp.) · 1 cor fixa, 7 texto micro, 2 tabela</sub>
- [ ] **Visão Executiva** `/sobre/relatorio` · ` 99`
      <sub>views/Office/Sobre/Relatorio.vue · 247L · 5 texto micro, 1 tabela</sub>

### Configuração · parte do DESKTOP <sub>(mais usada por administradores)</sub>

- [ ] **Sincronização de empresas** `/empresas` · ` 96`
      <sub>views/Office/Settings/OrgSync/Index.vue · 724L · 6 cor fixa, 12 texto micro, 1 tabela</sub>
- [ ] **Alçadas** `/permissions` · ` 98`
      <sub>views/Office/Settings/Permissions/Index.vue · 1411L (+2 comp.) · 11 texto micro</sub>
- [ ] **Backup Sienge** `/backup-sienge` · ` 99`
      <sub>views/Office/Settings/BackupSienge/Index.vue · 1010L (+2 comp.) · 6 texto micro, 1 tabela</sub>
- [ ] **Integridade** `/integrity` · `100`
      <sub>views/Office/Settings/Integrity/Index.vue · 228L · ok</sub>

### Ferramenta · parte do DESKTOP <sub>(mais usada por analistas e administrativo)</sub>

- [ ] **Documentação** `/docs` · ` 98`
      <sub>views/Office/Docs/Docs.vue · 1770L · 13 texto micro</sub>
- [ ] **Relatórios** `/relatorios` · `100`
      <sub>views/Office/Relatorios/Index.vue · 310L · ok</sub>
- [ ] **Central Meta** `/meta` · `100`
      <sub>views/Office/Meta/Central/Index.vue · 569L (+1 comp.) · 2 texto micro</sub>
- [ ] **Plano de Eventos** `/plano-eventos` · `100`
      <sub>views/Office/Marketing/EventPlan/Index.vue · 1328L (+6 comp.) · 1 texto micro</sub>
- [ ] **Correspondentes** `/correspondentes` · `100`
      <sub>views/Office/Comercial/Correspondentes/Index.vue · 1534L (+6 comp.) · 3 texto micro</sub>
- [ ] **Mapa do Sistema** `/sobre` · `100`
      <sub>views/Office/Sobre/Mapa.vue · 159L · ok</sub>

## Especiais  `6 telas`

Não seguem o esqueleto de página por natureza (login, shell, home da Eme, instalação). Avaliadas à mão.

### Especial · caso a caso <sub>(todos)</sub>

- [ ] **login** `/login` · `--`
      <sub>views/Office/Auth/Index.vue · 37L · sem container, sem header, sem help</sub>
- [ ] **MicrosoftCallback** `/microsoft/callback` · `--`
      <sub>views/Office/Auth/MicrosoftCallback.vue · 272L · sem container, sem header, sem help</sub>
- [ ] **Relatório Público** `/r/:token` · `--`
      <sub>views/Public/ReportPublic.vue · 397L · sem container, sem header, sem help, 2 texto micro</sub>
- [ ] **Config** `/` · `--`
      <sub>views/Office/Config/OfficeShell.vue · 158L (+2 comp.) · sem container, sem header, sem help, 1 gráfico</sub>
- [ ] **Home**  · `--`
      <sub>views/Office/Home.vue · 57514L (+201 comp.) · sem container, sem header, sem help, 764 cor fixa, 915 texto micro, 8 gráfico, 24 tabela sem mobile</sub>
- [ ] **layouts** `/academy` · `--`
      <sub>views/Academy/layouts/AcademyOfficeArea.vue · 483L (+3 comp.) · sem container, sem header, sem help, 129 cor fixa</sub>

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
