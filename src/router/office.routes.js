// src/router/office.routes.js
export default [
    // públicas
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/Office/Auth/Index.vue'),
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

            {
                path: 'marketing',
                name: 'marketing',
                meta: { requiresAuth: true },
                children: [
                    {
                        path: 'Events',
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
                        path: 'sales-projection',
                        name: 'Vendas X Projeção',
                        component: () => import('@/views/Office/Comercial/Sales-Projection/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de Vendas X Projeção de Vendas' },
                    },
                    {
                        path: 'faturamento',
                        name: 'Faturamento',
                        component: () => import('@/views/Office/Comercial/Faturamento/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de faturamento e contratos' },
                    },
                    {
                        path: 'buildings',
                        name: 'Empreendimentos',
                        component: () => import('@/views/Office/Comercial/Buildings/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Listagem de empreendimentos' },
                    },
                    {
                        path: 'awards',
                        name: 'Premiação',
                        component: () => import('@/views/Office/Comercial/Awards/Index.vue'),
                        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Premiações de Vendas' },
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
                        component: () => import('@/views/Office/Tools/Index.vue'),
                        meta: { searchable: true, content: 'Validador de Contratos de Venda.' },
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
                ],
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
