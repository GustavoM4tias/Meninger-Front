// src/router/office.routes.js
import { academyAppRoutes } from './academy.routes.js';

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
        path: '/error',
        name: 'Error',
        component: () => import('@/views/Office/Config/ErrorPage.vue'),
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
                path: 'mural',
                name: 'Mural de Avisos',
                component: () => import('@/views/Office/Mural/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Mural de avisos e comunicados internos' },
            },
            {
                path: 'mural/admin',
                name: 'Gestão de Comunicados',
                component: () => import('@/views/Office/Mural/Admin.vue'),
                meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: false, content: 'Gestão do mural de avisos e comunicados' },
            },

            // Checklist (gestão de lançamentos e demandas) — substitui o Planner.
            {
                path: 'checklists',
                name: 'Checklists',
                component: () => import('@/views/Office/Checklist/Index.vue'),
                meta: { requiresAuth: true, searchable: true, content: 'Checklists de lançamento: visualização, gestão, criação e cobrança de entregas e demandas' },
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

            {
                path: 'marketing',
                name: 'marketing',
                meta: { requiresAuth: true },
                children: [
                    // Aprovações de Marketing (tickets p/ diretoria)
                    {
                        path: 'aprovacoes',
                        name: 'Aprovações de Marketing',
                        component: () => import('@/views/Office/Marketing/Approvals/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Solicitações de aprovação do Marketing para a diretoria: verbas, eventos, mídias e serviços' },
                    },
                    {
                        path: 'aprovacoes/nova',
                        name: 'Nova Aprovação de Marketing',
                        component: () => import('@/views/Office/Marketing/Approvals/New.vue'),
                        meta: { requiresAuth: true, searchable: false },
                    },
                    {
                        path: 'aprovacoes/config',
                        name: 'Config. Aprovações de Marketing',
                        component: () => import('@/views/Office/Marketing/Approvals/Settings.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, allowedRole: 'admin', searchable: false },
                    },
                    {
                        path: 'aprovacoes/:id(\\d+)',
                        name: 'Detalhe Aprovação de Marketing',
                        component: () => import('@/views/Office/Marketing/Approvals/Detail.vue'),
                        meta: { requiresAuth: true, searchable: false },
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
                    {
                        path: 'captacao',
                        name: 'Captação de Leads',
                        component: () => import('@/views/Office/Marketing/Captacao/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Inbox de captação de leads — formulários e Meta Lead Ads' },
                    },
                    {
                        path: 'formularios',
                        name: 'Formulários de Captação',
                        component: () => import('@/views/Office/Marketing/Formularios/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Gestão dos formulários de captação de leads' },
                    },
                    {
                        path: 'campanhas',
                        name: 'Campanhas Meta',
                        component: () => import('@/views/Office/Marketing/Campanhas/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Campanhas Meta Lead Ads — investimento, leads e CAC' },
                    },
                    {
                        path: 'vinculos',
                        name: 'Vínculos CV',
                        component: () => import('@/views/Office/Marketing/Vinculos/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Central de vínculos com o CV — garante que os leads chegam ao CRM' },
                    },
                    {
                        path: 'settings',
                        name: 'Configurações de Captação',
                        component: () => import('@/views/Office/Marketing/Settings/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Configurações da captação de marketing (Geral + Meta Lead Ads)' },
                    },
                    {
                        path: 'viability',
                        name: 'Viabilidade',
                        component: () => import('@/views/Office/Marketing/Viability/ViabilityDashboard.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de Viabilidade Marketing' },
                    },
                ],
            },
            {
                path: 'comercial',
                name: 'comercial',
                meta: { requiresAuth: true },
                children: [
                    {
                        path: 'precadastros',
                        name: 'Pré-Cadastros',
                        component: () => import('@/views/Office/Comercial/Precadastros/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Relatório de Pré-Cadastros — análise de crédito, tempo e aprovação por correspondente' },
                    },
                    {
                        path: 'reservas-report',
                        name: 'Reservas',
                        component: () => import('@/views/Office/Comercial/Reservas/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Relatório de Reservas — funil pós pré-cadastro até a venda concretizada' },
                    },
                    {
                        path: 'faturamento',
                        name: 'Faturamento',
                        component: () => import('@/views/Office/Comercial/Faturamento/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de faturamento e contratos' },
                    },
                    {
                        path: 'sales-projection',
                        name: 'Vendas X Projeção',
                        component: () => import('@/views/Office/Comercial/Sales-Projection/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de Vendas X Projeção de Vendas' },
                    },
                    {
                        path: 'distratos',
                        name: 'Distratos',
                        component: () => import('@/views/Office/Comercial/Distratos/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Gestão e análise de distratos (rescisões de contrato)' },
                    },
                    {
                        path: 'buildings',
                        name: 'Empreendimentos',
                        component: () => import('@/views/Office/Comercial/Buildings/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Listagem de empreendimentos' },
                    },
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
                    {
                        path: 'workflow/groups',
                        name: 'Grupos de Workflow',
                        component: () => import('@/views/Office/Comercial/Workflow/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Grupos de Workflow' },
                    },
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
                    {
                        path: 'imobiliarias',
                        name: 'Imobiliárias',
                        component: () => import('@/views/Office/Comercial/Imobiliarias/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Cadastro de imobiliárias no CV — direto na tela ou via link público enviado ao responsável' },
                    },
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
                    {
                        path: 'boleto-caixa',
                        name: 'Boleto Caixa',
                        component: () => import('@/views/Office/Financeiro/BoletoCaixa/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Configuração e histórico de emissão de boletos via Caixa Econômica Federal' },
                    },
                    {
                        path: 'paymentflow',
                        name: 'Fluxo de Pagamento',
                        component: () => import('@/views/Office/Tools/PaymentoFlow/Index.vue'),
                        meta: { searchable: true, content: 'Lançamentos de pagamento Sienge.' },
                    },
                    {
                        path: 'inadimplencia',
                        name: 'Inadimplência',
                        component: () => import('@/views/Office/Financeiro/Inadimplencia/Index.vue'),
                        meta: { requiresAuth: true, requiresAdmin: true, searchable: false, content: 'Acompanhamento da inadimplência de clientes (backup Sienge)' },
                    },
                ],
            },

            {
                path: 'microsoft',
                name: 'microsoft',
                meta: { requiresAuth: true },
                children: [
                    {
                        path: 'sharepoint',
                        name: 'SharePoint',
                        component: () => import('@/views/Office/Microsoft/Sharepoint/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Gestão de arquivos SharePoint' },
                    },
                    {
                        path: 'teams',
                        name: 'Teams',
                        component: () => import('@/views/Office/Microsoft/Teams/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Reuniões e calendário Microsoft Teams' },
                    },
                    {
                        path: 'transcripts',
                        name: 'Transcrições',
                        component: () => import('@/views/Office/Microsoft/Transcripts/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Transcrições de reuniões com relatório IA' },
                    },
                    {
                        path: 'planner',
                        name: 'Planner',
                        component: () => import('@/views/Office/Microsoft/Planner/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Quadro Kanban integrado com Microsoft Planner' },
                    },
                    {
                        path: 'todo',
                        name: 'To Do',
                        component: () => import('@/views/Office/Microsoft/Todo/Index.vue'),
                        meta: { requiresAuth: true, searchable: true, content: 'Microsoft To Do — gestão de tarefas pessoais com prazos, etapas, anexos e reuniões' },
                    },
                    // {
                    //     path: 'inperson',
                    //     name: 'InPersonMeetings',
                    //     component: () => import('@/views/Office/Microsoft/Transcripts/InPerson/Index.vue'),
                    //     meta: { requiresAuth: true, searchable: false, content: 'Reuniões presenciais transcritas com IA' },
                    // },
                    {
                        path: 'inperson/recording',
                        name: 'InPersonRecording',
                        component: () => import('@/views/Office/Microsoft/Transcripts/InPerson/Recording.vue'),
                        meta: { requiresAuth: true, searchable: false },
                    },
                ],
            },

            {
                path: 'tools',
                name: 'tools',
                meta: { requiresAuth: true },
                children: [
                    {
                        path: 'validator',
                        name: 'Validador',
                        component: () => import('@/views/Office/Tools/Validator/Index.vue'),
                        meta: { searchable: true, content: 'Validador de Contratos de Venda.' },
                    },
                    {
                        path: 'bucket-upload',
                        name: 'BucketUpload',
                        component: () => import('@/views/Office/Tools/BucketUpload/Index.vue'),
                        meta: { searchable: true, content: 'Envio de planilhas de Engenharia e Área Construída ao bucket GCS.' },
                    },
                    {
                        path: 'eme-brain',
                        name: 'Cérebro da Eme',
                        component: () => import('@/views/Office/Tools/EmeBrain/Index.vue'),
                        meta: { requiresAuth: true, adminOnly: true, searchable: true, content: 'Configure regras, comportamento, glossário e relatórios do assistente Eme sem código.' },
                    },
                    {
                        path: 'whatsapp-automations',
                        name: 'Automações WhatsApp',
                        component: () => import('@/views/Office/Tools/WhatsappAutomations/Index.vue'),
                        meta: { requiresAuth: true, adminOnly: true, searchable: true, content: 'Configure templates e automações de WhatsApp sem código.' },
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
                        path: 'cidades',
                        name: 'Cidades',
                        component: () => import('@/views/Office/Settings/EnterpriseCities/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Gerenciamento de Cidades x Empreendimentos' },
                    },
                    {
                        path: 'management',
                        name: 'Cargos',
                        component: () => import('@/views/Office/Settings/Management/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Departamentos, Categorias, Cargos e Cidades do sistema' },
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
                        component: () => import('@/views/Office/Settings/Notifications/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Preferências de notificação por canal e tipo' },
                    },
                    {
                        path: 'whatsapp',
                        name: 'WhatsApp',
                        component: () => import('@/views/Office/Settings/Whatsapp/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Integração WhatsApp Business: config, templates, mensagens' },
                    },
                    {
                        path: 'meta',
                        name: 'Configurações Meta',
                        component: () => import('@/views/Office/Settings/Meta/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Credenciais do App Meta compartilhadas (WhatsApp + Lead Ads): App ID, App Secret, versão da Graph API' },
                    },
                    {
                        path: 'docusign',
                        name: 'Configurações DocuSign',
                        component: () => import('@/views/Office/Settings/Docusign/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Integração DocuSign: credenciais JWT, consentimento e teste da assinatura digital das fichas comerciais' },
                    },
                    {
                        path: 'alerts',
                        name: 'Alertas',
                        component: () => import('@/views/Office/Settings/Alerts/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Gestão de alertas recorrentes criados via Eme' },
                    },
                    {
                        path: 'alerts/admin',
                        name: 'Painel de Alertas',
                        component: () => import('@/views/Office/Settings/Alerts/Admin/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Painel admin de alertas: visão geral e uso por usuário' },
                    },
                    {
                        path: 'backup-sienge',
                        name: 'Backup Sienge',
                        component: () => import('@/views/Office/Settings/BackupSienge/Index.vue'),
                        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Acompanhamento e controle manual do backup diário do banco Sienge' },
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
                meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Documentação do sistema' },
            },

            {
                path: 'teste',
                name: 'Teste',
                component: () => import('@/views/Office/Config/teste.vue'),
                meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin' },
            },
        ],
    },
];
