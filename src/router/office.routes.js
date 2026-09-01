// src/router/office.routes.js
import { academyAppRoutes } from './academy.routes.js';
import { RELATORIOS } from '@/views/Office/Comercial/Relatorios/relatorios';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';

// Uma rota por relatório comercial, geradas do catálogo — assim relatório novo
// entra no router, no menu e na barra de guias de uma vez só. O componente vem
// do próprio catálogo (`load`), que é o mesmo usado no pré-carregamento.
// Faturamento e Vendas × Projeção são as telas originais em modo `embedded`.
const relatorioRoutes = RELATORIOS.map((r) => ({
    path: r.key,
    name: r.pageTitle,
    component: r.load,
    ...(r.embedded ? { props: { embedded: true } } : {}),
    meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: r.content },
}));

// /comercial/relatorios sem relatório na URL cai no primeiro que a alçada
// permite — quem só tem Leads não bate num Faturamento bloqueado.
function primeiroRelatorioPermitido() {
    try {
        // Só roda na navegação, quando o Pinia já está ativo.
        const perm = usePermissionStore();
        const achou = RELATORIOS.find((r) => perm.hasAccess(r.route));
        if (achou) return achou.route;
    } catch { /* store indisponível: cai no padrão e o guard decide */ }
    return RELATORIOS[0].route;
}

export default [
    // públicas
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/Office/Auth/Index.vue'),
        meta: { requiresAuth: false },
    },
    {
        // Callback do OAuth Microsoft — backend redireciona aqui com ?token=JWT
        path: '/microsoft/callback',
        name: 'MicrosoftCallback',
        component: () => import('@/views/Office/Auth/MicrosoftCallback.vue'),
        meta: { requiresAuth: false },
    },
    {
        // Link PÚBLICO de relatório da Eme (sem login) — token CSPRNG com
        // vencimento validado no backend; 404 genérico para token inválido.
        path: '/r/:token',
        name: 'Relatório Público',
        component: () => import('@/views/Public/ReportPublic.vue'),
        meta: { requiresAuth: false },
    },

    // shell do office (privadas e também as "normais" do app)
    {
        path: '/',
        component: () => import('@/views/Office/Config/OfficeShell.vue'),
        meta: { requiresAuth: false }, // o shell em si não precisa exigir
        children: [
            {
                path: '',
                name: 'Home',
                component: () => import('@/views/Office/Home.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Página inicial do sistema' },
            },

            // Mural de Avisos / Comunicados — módulo próprio do Office (interno).
            {
                // O mural É a caixa de entrada, recortada na origem "mural": as duas
                // telas desenhavam o mesmo dado. A rota fica porque é o nome que a
                // empresa conhece, é o item do menu e é o alvo dos links do card
                // flutuante e das notificações.
                path: 'mural',
                name: 'Mural de Avisos',
                component: () => import('@/views/Office/Notifications/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Mural de avisos e comunicados internos' },
            },
            {
                // A gestão virou ABA de /mural (?tab=gestao). A rota continua
                // existindo por três motivos: é ela que a alçada e as
                // capacidades nomeiam (lib/screenCapabilities.js), é o alvo dos
                // links já espalhados por notificação e favorito, e é o que a
                // busca do sistema indexa. Aponta para a mesma tela, que troca
                // a URL para /mural?tab=gestao ao montar.
                path: 'mural/admin',
                name: 'Gestão de Comunicados',
                component: () => import('@/views/Office/Notifications/Index.vue'),
                // Sem requiresAdmin: a tela é delegável por alçada e as ações
                // de dentro seguem lib/screenCapabilities.js (excluir = admin).
                meta: { requiresAuth: true, searchable: true, content: 'Gestão do mural de avisos e comunicados: redigir, definir público-alvo, publicar e acompanhar a leitura' },
            },

            // Relatórios da Eme — relatórios customizados gerados por IA.
            {
                path: 'relatorios',
                name: 'Relatórios',
                component: () => import('@/views/Office/Relatorios/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Relatórios customizados gerados pela Eme: leads, pré-cadastros, reservas, funil comercial' },
            },
            {
                path: 'relatorios/:id',
                name: 'Builder de Relatório',
                component: () => import('@/views/Office/Relatorios/Builder.vue'),
                meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: false, content: 'Construção de relatório com a Eme' },
            },
            {
                path: 'relatorios/:id/view',
                name: 'Visualizar Relatório',
                component: () => import('@/views/Office/Relatorios/View.vue'),
                meta: { requiresAuth: true, searchable: false, content: 'Visualização de relatório' },
            },

            // Checklist (gestão de lançamentos e demandas) — substitui o Planner.
            {
                path: 'checklists',
                name: 'Checklists',
                component: () => import('@/views/Office/Checklist/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Checklists de lançamento: visualização, gestão, criação e cobrança de entregas e demandas' },
            },
            {
                // 2026-08-31 - virou a aba "Travadas no ERP" da tela Sienge. A
                // rota fica viva como redirect: é o alvo dos links de
                // notificação e dos favoritos gravados antes da fusão.
                path: 'settings/envio-sienge',
                redirect: (to) => ({ path: '/settings/sienge', query: { ...to.query, tab: 'envio' } }),
            },
            {
                path: 'checklists/cobranca',
                name: 'Cobrança do Checklist',
                component: () => import('@/views/Office/Checklist/Cobranca.vue'),
                meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: false, content: 'Configuração da régua de cobrança dos checklists' },
            },
            {
                path: 'checklists/:id',
                name: 'Checklist',
                component: () => import('@/views/Office/Checklist/Detail.vue'),
                meta: { requiresAuth: true, searchable: false, content: 'Detalhe do checklist' },
            },

            // Academy dentro do Office (KB + Trilhas + Gestão), renderizado DENTRO
            // do OfficeShell → usa a NAV DO OFFICE. O AcademyShell (nav própria do
            // Academy) fica reservado ao host academy.* . As páginas são
            // self-contained; AcademyOfficeArea só dá o respiro do container.
            // Login = login do Office. Comunidade/Pessoas/Perfil seguem montadas,
            // porém ocultas (standby do MVP).
            {
                path: 'academy',
                component: () => import('@/views/Academy/layouts/AcademyOfficeArea.vue'),
                meta: { requiresAuth: true },
                children: academyAppRoutes,
            },

            // Central Meta — hub único: Captação, Campanhas, Vínculos CV,
            // Formulários, Credenciais e Configurações num só lugar (abas ?tab=).
            {
                path: 'meta',
                name: 'Central Meta',
                component: () => import('@/views/Office/Meta/Central/Index.vue'),
                meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: true, content: 'Central Meta: captação de leads, campanhas Meta, vínculos com o CV CRM, formulários de captação, credenciais do App e configurações' },
            },
            // CV CRM: os cadastros que vivem no CV, agora sob /crm em vez de
            // espalhados em /comercial. As rotas antigas seguem vivas como
            // REDIRECT preservando a query, porque notificacao, favorito, card
            // da Eme e link colado em conversa apontam para elas. As alcadas ja
            // gravadas migram no boot, em lib/ensurePermissionRouteRenames.js —
            // sem isso todo mundo perderia o acesso a estas telas.
            {
                // Sem `name` de propósito: é só o agrupador das rotas /crm, e
                // dar nome a um pai que tem filho de path vazio faz o Vue Router
                // avisar que navegar por esse nome não renderizaria o filho.
                // Ninguém navega por nome aqui - a navegação é toda por path.
                path: 'crm',
                meta: { requiresAuth: true },
                children: [
                    { path: '', name: 'crm', redirect: '/crm/configuracoes' },
                    {
                        path: 'configuracoes',
                        name: 'CV CRM',
                        component: () => import('@/views/Office/Cv/Central/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: true, content: 'Painel do CV CRM: credencial da integração, quem é avisado quando ela cai e estado do espelho de imobiliárias e vínculos' },
                    },
                    {
                        // Integracoes: webhooks do CV + endpoints do Office + historico.
                        // admin-only por CODIGO (nao por cadeado da tela de Alcadas):
                        // quem abre aqui enxerga os tokens que autenticam os endpoints
                        // publicos. Os tres niveis exigidos pelo CLAUDE.md sao
                        // adminOnly no navRegistry, requiresAdmin aqui e requireAdmin
                        // em routes/cvIntegrationRoutes.js.
                        path: 'integracoes',
                        name: 'CV CRM - Integracoes',
                        component: () => import('@/views/Office/Cv/Integracoes/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: true, content: 'Webhooks do CV CRM: o que o CV avisa em tempo real, os endpoints que recebem no Office, tokens e historico da integracao' },
                    },
                    {
                        path: 'imobiliarias',
                        name: 'Imobiliárias',
                        component: () => import('@/views/Office/Comercial/Imobiliarias/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Cadastro de imobiliárias no CV — direto na tela ou via link público enviado ao responsável' },
                    },
                    {
                        path: 'correspondentes',
                        name: 'Correspondentes',
                        component: () => import('@/views/Office/Comercial/Correspondentes/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Empresas correspondentes e suas equipes no CV — cadastro em lote por colagem e conferência do resultado' },
                    },
                    {
                        path: 'buildings',
                        name: 'Empreendimentos',
                        component: () => import('@/views/Office/Comercial/Buildings/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Listagem de empreendimentos' },
                    },
                    {
                        path: 'workflow/groups',
                        name: 'Grupos de Workflow',
                        component: () => import('@/views/Office/Comercial/Workflow/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Grupos de Workflow: quais situações do CV formam cada etapa de reserva e repasse' },
                    },
                ],
            },
            // Rota da primeira versao deste painel, viva por algumas horas.
            // Redirect para nao deixar link morto de quem ja tinha aberto.
            { path: 'cv', redirect: '/crm/configuracoes' },
            {
                path: 'marketing',
                name: 'marketing',
                meta: { requiresAuth: true },
                children: [
                    // Plano de Eventos — proposta mensal do gestor comercial que,
                    // aprovada, vira evento na agenda logo acima.
                    {
                        path: 'plano-eventos',
                        name: 'Plano de Eventos',
                        component: () => import('@/views/Office/Marketing/EventPlan/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Plano de Eventos — proposta mensal de eventos por empreendimento, com itens, custo e autorização' },
                    },
                    {
                        path: 'plano-eventos/settings',
                        name: 'Plano de Eventos Configurações',
                        component: () => import('@/views/Office/Marketing/EventPlan/Settings.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Configurações do Plano de Eventos' },
                    },
                    {
                        path: 'plano-eventos/:id',
                        name: 'Plano de Eventos Detalhe',
                        component: () => import('@/views/Office/Marketing/EventPlan/Detail.vue'),
                        meta: { requiresAuth: true, searchable: false, content: 'Detalhe do plano de eventos do mês' },
                    },
                    // Stand de Vendas (modelos/categorias + stands reais com custo do Sienge)
                    {
                        path: 'stand-vendas',
                        name: 'Stand de Vendas',
                        component: () => import('@/views/Office/Marketing/StandVendas/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Stands de vendas: modelos com valor médio e itens, cadastro dos stands reais, custo de construção e manutenção apurado do Sienge (Despesas com Stand)' },
                    },
                    {
                        // Detalhe do stand em tela cheia (era um modal): custo
                        // lancamento a lancamento, itens e fotos. Herda a alcada
                        // da tela pai pelo prefixo da rota.
                        path: 'stand-vendas/:id',
                        name: 'Stand de Vendas Detalhe',
                        component: () => import('@/views/Office/Marketing/StandVendas/Detail.vue'),
                        meta: { requiresAuth: true, permissionRoute: '/marketing/stand-vendas', searchable: false, content: 'Detalhe do stand de vendas: custo de construcao e recorrencia, itens e fotos' },
                    },
                    // Viabilidade (ex "Gastos por Departamento" do Financeiro):
                    // orçamento por empreendimento (VGV × %), gasto real e saldo.
                    {
                        path: 'viabilidade',
                        name: 'Viabilidade',
                        component: () => import('@/views/Office/Financeiro/DeptSpending/DeptSpendingDashboard.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Viabilidade - orçamento de marketing por empreendimento (VGV × %), gasto real e saldo' },
                    },
                    {
                        // :key = enterprise_key do empreendimento (CC). Um id de
                        // empresa Sienge ainda funciona (links antigos) e abre a SPE somada.
                        path: 'viabilidade/:key',
                        name: 'Relatório de Investimento',
                        component: () => import('@/views/Office/Financeiro/DeptSpending/DeptSpendingReport.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Relatório gerencial de investimento por empreendimento' },
                    },
                    {
                        path: 'events',
                        name: 'Eventos',
                        component: () => import('@/views/Office/Marketing/Events/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Listagem de eventos' },
                    },
                    {
                        path: 'leads',
                        name: 'Leads',
                        component: () => import('@/views/Office/Marketing/Leads/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de leads' },
                    },
                    // Consolidadas na Central Meta (/meta) em 2026-07-23. As rotas
                    // antigas seguem vivas como redirect (preservam a query — links
                    // de notificação, favoritos e atalhos não quebram).
                    { path: 'captacao',    redirect: to => ({ path: '/meta', query: { ...to.query, tab: 'captacao' } }) },
                    { path: 'formularios', redirect: to => ({ path: '/meta', query: { ...to.query, tab: 'formularios' } }) },
                    { path: 'campanhas',   redirect: to => ({ path: '/meta', query: { ...to.query, tab: 'campanhas' } }) },
                    { path: 'vinculos',    redirect: to => ({ path: '/meta', query: { ...to.query, tab: 'vinculos' } }) },
                    { path: 'settings',    redirect: to => ({ path: '/meta', query: { ...to.query, tab: 'config' } }) },
                ],
            },
            {
                path: 'comercial',
                name: 'comercial',
                meta: { requiresAuth: true },
                children: [
                    // Relatórios comerciais: uma ROTA POR RELATÓRIO, sob a casca
                    // comum (cabeçalho + guias). Rota própria é o que permite
                    // conceder cada relatório separadamente na tela de Alçadas —
                    // o backend casa alçada por igualdade exata de rota.
                    {
                        path: 'relatorios',
                        component: () => import('@/views/Office/Comercial/Relatorios/Shell.vue'),
                        meta: { requiresAuth: true },
                        children: [
                            // Sem relatório na URL: manda para o primeiro que a
                            // alçada do usuário permite.
                            { path: '', redirect: () => ({ path: primeiroRelatorioPermitido() }) },
                            ...relatorioRoutes,
                        ],
                    },
                    // Consolidadas nos Relatórios Comerciais em 2026-08-17. As
                    // rotas antigas seguem vivas como redirect: favoritos salvos
                    // (6) e os links das notificações de ajuste contábil e de
                    // fechamento apontam para elas.
                    { path: 'faturamento', redirect: to => ({ path: '/comercial/relatorios/faturamento', query: to.query }) },
                    { path: 'sales-projection', redirect: to => ({ path: '/comercial/relatorios/projecao', query: to.query }) },
                    // Pré-Cadastros e Reservas entraram na mesma casca em
                    // 2026-08-31. As duas guardam o filtro na URL e a Eme navega
                    // para elas com query (`navigate_to_page`), então o redirect
                    // precisa preservar a query, igual aos de cima.
                    { path: 'precadastros', redirect: to => ({ path: '/comercial/relatorios/precadastros', query: to.query }) },
                    { path: 'reservas-report', redirect: to => ({ path: '/comercial/relatorios/reservas', query: to.query }) },
                    {
                        path: 'cancelamento-reservas',
                        name: 'Cancelamentos CV × Sienge',
                        component: () => import('@/views/Office/Comercial/CancelamentoReservas/Index.vue'),
                        meta: { requiresAuth: true, searchable: false, content: 'Automação de exclusão no Sienge de contratos de reservas canceladas no CV' },
                    },
                    // Foi para /crm/buildings (2026-08-24). O redirect preserva a
                    // query: o deep-link ?open=<id> e usado pela tela de
                    // Imobiliarias e pelos cards da Eme.
                    { path: 'buildings', redirect: to => ({ path: '/crm/buildings', query: to.query }) },
                    {
                        path: 'projections',
                        name: 'Projeção',
                        component: () => import('@/views/Office/Comercial/Projections/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Projeção' },
                    },
                    {
                        path: 'projections/:id',
                        name: 'Projeção Detalhes',
                        component: () => import('@/views/Office/Comercial/Projections/ProjectionDetail.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Projeção Detalhes' },
                    },
                    // Foi para /crm/workflow/groups (2026-08-25): grupo de workflow
                    // é situação do CV, mora com o resto do CV.
                    { path: 'workflow/groups', redirect: to => ({ path: '/crm/workflow/groups', query: to.query }) },
                    {
                        path: 'conditions',
                        name: 'Fichas Comerciais',
                        component: () => import('@/views/Office/Comercial/Conditions/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Fichas Comerciais — condições mensais de produto por empreendimento' },
                    },
                    {
                        path: 'conditions/:id',
                        name: 'Ficha Comercial Detalhe',
                        component: () => import('@/views/Office/Comercial/Conditions/Detail.vue'),
                        meta: { requiresAuth: true, searchable: false, content: 'Detalhe da Ficha Comercial' },
                    },
                    // Foi para /crm/imobiliarias (2026-08-24). O redirect preserva a
                    // query: ?tab=cadastros e ?q= vem dos cards da Eme.
                    { path: 'imobiliarias', redirect: to => ({ path: '/crm/imobiliarias', query: to.query }) },
                    // Tela unificada: o antigo relatorio virou aba da tela de Imobiliarias.
                    { path: 'imobiliarias-report', redirect: '/crm/imobiliarias' },
                    // Foi para /crm/correspondentes (2026-08-24).
                    { path: 'correspondentes', redirect: to => ({ path: '/crm/correspondentes', query: to.query }) },
                    {
                        path: 'mcmv',
                        name: 'MCMV — Limites por Cidade',
                        component: () => import('@/views/Office/Comercial/Mcmv/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Consulta de limites MCMV por município e faixa de renda' },
                    },
                    {
                        path: 'mcmv/settings',
                        name: 'MCMV Configurações',
                        component: () => import('@/views/Office/Comercial/Mcmv/Settings.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Configurações e importação da tabela MCMV' },
                    },
                    {
                        path: 'conditions/settings',
                        name: 'Fichas Comerciais Configurações',
                        component: () => import('@/views/Office/Comercial/Conditions/Settings.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Configurações das Fichas Comerciais' },
                    },
                ],
            },

            {
                path: 'financeiro',
                name: 'financeiro',
                meta: { requiresAuth: true },
                children: [
                    {
                        path: 'titulos',
                        name: 'Títulos',
                        component: () => import('@/views/Office/Financeiro/Titulos/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Adição de custos Financeiros' },
                    },
                    {
                        path: 'custos',
                        name: 'Custos',
                        component: () => import('@/views/Office/Financeiro/Custos/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Custos do Financeiro' },
                    },
                    // Viabilidade mudou para o Marketing (2026-07-28). Redirects
                    // preservam links antigos (notificações, favoritos, atalhos).
                    { path: 'gastos-departamento', redirect: to => ({ path: '/marketing/viabilidade', query: to.query }) },
                    { path: 'gastos-departamento/:key', redirect: to => ({ path: `/marketing/viabilidade/${to.params.key}`, query: to.query }) },
                    // "Recebimentos do Ato" virou a aba Conciliação da tela Ato
                    // (2026-08-26). O redirect mantém de pé quem já tinha o link
                    // salvo enquanto a tela existiu separada.
                    {
                        path: 'recebimentos-ato',
                        redirect: to => ({ path: '/financeiro/cobranca/ato', query: { ...to.query, tab: 'conciliacao' } }),
                    },
                    {
                        path: 'consulta-cef',
                        name: 'Consulta de nº CEF',
                        component: () => import('@/views/Office/Financeiro/ConsultaCef/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Consulta do nº do contrato na instituição financeira (CEF) por empreendimento ou busca geral' },
                    },
                    {
                        // Cobrança do Ato: as duas formas de cobrar a entrada
                        // (boleto Caixa e link de cartão Userede) numa tela só.
                        // "Cobrança" é apenas agrupamento na nav, sem tela própria.
                        path: 'cobranca/ato',
                        name: 'Ato',
                        component: () => import('@/views/Office/Financeiro/CobrancaAto/Index.vue'),
                        // Sem requiresAdmin: a tela é delegável por alçada e a
                        // aba Configurações se esconde sozinha para não-admin.
                        meta: { requiresAuth: true, searchable: true, content: 'Cobrança do ato: emissão de boleto Caixa e link de pagamento no cartão, com histórico, reprocessamento, reenvio ao cliente e conferência de pagamento' },
                    },
                    // Rotas antigas: os links das notificações apontam para elas.
                    // As alçadas já migram sozinhas pelo ensurePermissionRouteRenames.
                    { path: 'boleto-caixa', redirect: { name: 'Ato' } },
                    { path: 'link-cartao', redirect: { name: 'Ato' } },
                    {
                        path: 'paymentflow',
                        name: 'Fluxo de Pagamento',
                        component: () => import('@/views/Office/Tools/PaymentoFlow/Index.vue'),
                        meta: { searchable: true, content: 'Lançamentos de pagamento Sienge.' },
                    },
                ],
            },

            {
                // Assistente pessoal: a lista unica do que precisa da pessoa.
                // Sem alcada de tela - e a propria lista dela, como as
                // preferencias de notificacao.
                path: 'assistente',
                name: 'Meu dia',
                component: () => import('@/views/Office/Assistente/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Assistente pessoal: meu dia, tarefas, prazos, pendencias de e-mail e agenda num lugar so' },
            },
            {
                path: 'microsoft',
                name: 'microsoft',
                meta: { requiresAuth: true },
                children: [
                    {
                        // Caixa de e-mail da própria pessoa. A alçada das AÇÕES
                        // dentro da tela (ver/organizar/enviar) vem das
                        // capacidades em lib/screenCapabilities.js.
                        path: 'outlook',
                        name: 'E-mail',
                        component: () => import('@/views/Office/Microsoft/Outlook/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Caixa de e-mail do Outlook dentro do Office: ler, buscar, anexos, responder, encaminhar e enviar' },
                    },
                    {
                        path: 'sharepoint',
                        name: 'SharePoint',
                        component: () => import('@/views/Office/Microsoft/Sharepoint/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Gestão de arquivos SharePoint' },
                    },
                    {
                        // Central Microsoft: hub com abas ?tab=agenda|tarefas|reunioes
                        path: 'teams',
                        name: 'Teams',
                        component: () => import('@/views/Office/Microsoft/Teams/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Central Microsoft - agenda e calendário Teams, tarefas To Do e transcrições de reuniões com relatório IA' },
                    },
                    // Consolidadas na Central Microsoft (/microsoft/teams) em 2026-07-27.
                    // Redirects PERMANENTES: links de notificação/favoritos antigos dependem deles.
                    // O módulo To Do foi removido (2026-07-27) — a rota antiga cai na Agenda.
                    { path: 'todo', redirect: { path: '/microsoft/teams' } },
                    {
                        path: 'transcripts',
                        redirect: to => ({ path: '/microsoft/teams', query: { ...to.query, tab: 'reunioes' } }),
                    },
                    {
                        path: 'planner',
                        name: 'Planner',
                        component: () => import('@/views/Office/Microsoft/Planner/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Quadro Kanban integrado com Microsoft Planner' },
                    },
                    {
                        path: 'inperson/recording',
                        name: 'InPersonRecording',
                        component: () => import('@/views/Office/Microsoft/Transcripts/InPerson/Recording.vue'),
                        // Sub-tela do fluxo de reuniões: não tem item de menu
                        // próprio, então herda a alçada da Central Microsoft
                        // (permissionRoute é lido pelo guard e pela auditoria).
                        meta: { requiresAuth: true, permissionRoute: '/microsoft/teams', searchable: false },
                    },
                ],
            },

            // Validador — movido de /tools/validator para /validator (2026-07-28).
            {
                path: 'validator',
                name: 'Validador',
                component: () => import('@/views/Office/Tools/Validator/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Validador de Contratos de Venda.' },
            },

            {
                path: 'tools',
                name: 'tools',
                meta: { requiresAuth: true },
                children: [
                    // Rota antiga do Validador — redirect preserva links/favoritos/notificações.
                    { path: 'validator', redirect: to => ({ path: '/validator', query: to.query }) },
                    {
                        path: 'bucket-upload',
                        name: 'BucketUpload',
                        component: () => import('@/views/Office/Tools/BucketUpload/Index.vue'),
                        meta: { searchable: true, content: 'Looqbox - envio de planilhas de Engenharia e Área Construída ao bucket GCS.' },
                    },
                    {
                        path: 'eme-brain',
                        name: 'Cérebro da Eme',
                        component: () => import('@/views/Office/Tools/EmeBrain/Index.vue'),
                        meta: { requiresAuth: true, adminOnly: true, searchable: true, content: 'Configure regras, comportamento, glossário e relatórios do assistente Eme sem código.' },
                    },
                    {
                        // Consolidado em /settings/whatsapp (aba Automações). Mantém a
                        // rota antiga viva como redirect — links/atalhos não quebram.
                        path: 'whatsapp-automations',
                        redirect: { path: '/settings/whatsapp', query: { tab: 'automations' } },
                    },
                    {
                        path: 'eme-atende',
                        name: 'Eme Atende',
                        component: () => import('@/views/Office/Tools/EmeAtende/Index.vue'),
                        meta: { requiresAuth: true, adminOnly: true, searchable: true, content: 'A Eme atendendo leads no WhatsApp: fluxos, conversas, segmentação e configuração da IA.' },
                    },
                ],
            },

            {
                path: 'settings',
                name: 'settings',
                meta: { requiresAuth: true },
                children: [
                    {
                        path: 'users',
                        name: 'Usuários',
                        component: () => import('@/views/Office/Settings/Users/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Listagem de usuários do sistema' },
                    },
                    { path: 'account', name: 'Minha Conta', component: () => import('@/views/Office/Settings/Account/Index.vue'), meta: { searchable: true, content: 'Sua conta pessoal' } },
                    { path: 'organograma', name: 'Organograma', component: () => import('@/views/Office/Settings/Organogram/Index.vue'), meta: { searchable: true, content: 'Organograma estrutural' } },
                    {
                        path: 'empresas',
                        name: 'Sincronização de empresas',
                        component: () => import('@/views/Office/Settings/OrgSync/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Sincronização de empresas e empreendimentos do CV e do Sienge, pareamento CRM x ERP' },
                    },
                    // Vínculos de cidades foi substituído pela Sincronização de
                    // empresas (2026-07-28). Redirect preserva favoritos/links.
                    { path: 'cidades', redirect: to => ({ path: '/settings/empresas', query: to.query }) },
                    {
                        path: 'management',
                        name: 'Cargos',
                        component: () => import('@/views/Office/Settings/Management/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Departamentos e Cargos do sistema (cidades entram sozinhas pelos empreendimentos sincronizados)' },
                    },
                    {
                        path: 'integrity',
                        name: 'Integridade',
                        component: () => import('@/views/Office/Settings/Integrity/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: true, content: 'Validador de integridade de segurança: rotas, alçadas, tools da Eme e modelo de acesso' },
                    },
                    {
                        path: 'permissions',
                        name: 'Alçadas',
                        component: () => import('@/views/Office/Settings/Permissions/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Gestão de alçadas: controle de acesso por usuário e departamento' },
                    },
                    {
                        path: 'notifications',
                        name: 'Notificações',
                        component: () => import('@/views/Office/Notifications/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Preferências de notificação por canal e tipo' },
                    },
                    {
                        path: 'whatsapp',
                        name: 'WhatsApp',
                        component: () => import('@/views/Office/Settings/Whatsapp/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Integração WhatsApp Business: config, templates, mensagens' },
                    },
                    {
                        // Consolidada na Central Meta (aba Credenciais). Redirect
                        // mantém links antigos (notificações, WhatsApp) vivos.
                        path: 'meta',
                        redirect: to => ({ path: '/meta', query: { ...to.query, tab: 'credenciais' } }),
                    },
                    {
                        path: 'docusign',
                        name: 'Configurações DocuSign',
                        component: () => import('@/views/Office/Settings/Docusign/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Integração DocuSign: credenciais JWT, consentimento e teste da assinatura digital das fichas comerciais' },
                    },
                    {
                        // Virou a aba "Meus alertas" de /settings/notifications. A
                        // rota fica: é o que a busca indexa e o alvo dos links
                        // antigos. Aponta para a casca, que troca a URL ao montar.
                        path: 'alerts',
                        name: 'Alertas',
                        component: () => import('@/views/Office/Notifications/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Gestão de alertas recorrentes criados via Eme' },
                    },
                    {
                        // Idem: virou a aba "Painel", visível só para admin. O
                        // allowedRole abaixo continua guardando esta URL.
                        path: 'alerts/admin',
                        name: 'Painel de Alertas',
                        component: () => import('@/views/Office/Notifications/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Painel admin de alertas: visão geral e uso por usuário' },
                    },
                    {
                        // A tela do Sienge: backup do espelho, vendas travadas
                        // para o ERP e a configuração das duas. Administração do
                        // próprio sistema, então admin nos três níveis (aqui, no
                        // navRegistry e no requireAdmin das rotas de API).
                        path: 'sienge',
                        name: 'Sienge',
                        component: () => import('@/views/Office/Settings/Sienge/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: true, content: 'Integração com o Sienge: backup diário do espelho do banco, vendas travadas para o ERP e configuração da conexão, da carga e do vigia' },
                    },
                    {
                        // 2026-08-31 - virou a aba "Backup" da tela Sienge.
                        path: 'backup-sienge',
                        redirect: (to) => ({ path: '/settings/sienge', query: { ...to.query, tab: 'backup' } }),
                    },
                ],
            },

            {
                path: 'notifications',
                name: 'Caixa de Notificações',
                component: () => import('@/views/Office/Notifications/Index.vue'),
                meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Histórico completo de notificações' },
            },

            {
                path: 'report',
                name: 'Reportar',
                component: () => import('@/views/Office/Support/Report.vue'),
                meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Reportar Problema | Suporte' },
            },
            {
                path: 'support',
                name: 'Suporte',
                component: () => import('@/views/Office/Support/Support.vue'),
                meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Andamento do Suporte' },
            },
            {
                path: 'support/:id',
                name: 'Detalhes Suporte',
                component: () => import('@/views/Office/Support/SupportDetails.vue'),
                props: true,
                meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Detalhes do andamento do suporte' },
            },

            {
                path: 'docs',
                name: 'Documentação',
                component: () => import('@/views/Office/Docs/Docs.vue'),
                // Changelog do sistema: livre para todos os logados, por
                // decisão (2026-08-20). A categoria "Sobre o Office" é
                // permissionManaged:false, então não passa por alçada — e agora
                // o registry e a rota concordam nisso.
                meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Documentação do sistema' },
            },

            // Sobre o Office — apresentação do sistema para a diretoria.
            // Conteúdo em config/aboutOffice.js. SOMENTE ADMIN (expõe economia,
            // custo de ferramenta e potencial financeiro da companhia), e fora da
            // busca para não exibir o título a quem não pode abrir.
            {
                path: 'sobre',
                name: 'Mapa do Sistema',
                component: () => import('@/views/Office/Sobre/Mapa.vue'),
                meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: false, content: 'Mapa do sistema: módulos, integrações, ganhos e roadmap do Menin Office' },
            },
            {
                path: 'sobre/relatorio',
                name: 'Visão Executiva',
                component: () => import('@/views/Office/Sobre/Relatorio.vue'),
                meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: false, content: 'Visão executiva do Menin Office: o que o sistema entrega, ganhos verificados e o que vem a seguir' },
            },

        ],
    },

    // URL que não existe (link velho, /error de antes, erro de digitação) volta
    // pra Home em vez de deixar tela em branco. Sem sessão, o guard leva pro login.
    { path: '/:pathMatch(.*)*', redirect: '/' },
];
