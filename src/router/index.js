// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Home from '@/views/Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true, searchable: true, content: 'Página inicial do sistema' },
  },

  {
    path: '/marketing',
    name: 'marketing',
    children: [
      {
        path: 'Events',
        name: 'Eventos',
        component: () => import('@/views/Marketing/Events/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Listagem de eventos' },
      },
      {
        path: 'leads',
        name: 'Leads',
        component: () => import('@/views/Marketing/Leads/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de leads' },
      },
      {
        path: 'viability',
        name: 'Viability',
        component: () => import('@/views/Marketing/Viability/ViabilityDashboard.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de Viabilidade Marketing' },
      },
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },

  {
    path: '/comercial',
    name: 'comercial',
    children: [
      {
        path: 'faturamento',
        name: 'Faturamento',
        component: () => import('@/views/Comercial/Faturamento/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de faturamento e contratos' },
      },
      {
        path: 'buildings',
        name: 'Empreendimentos',
        component: () => import('@/views/Comercial/Buildings/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Listagem de empreendimentos' },
      },
      {
        path: 'awards',
        name: 'Premiação',
        component: () => import('@/views/Comercial/Awards/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Premiações de Vendas' },
      },
      {
        path: 'projections',
        name: 'Projeção',
        component: () => import('@/views/Comercial/Projections/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Projeção' },
      },
      {
        path: 'projections/:id',
        name: 'Projeção Detalhes',
        component: () => import('@/views/Comercial/Projections/ProjectionDetail.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Projeção Detalhes' },
      },
      {
        path: 'workflow/groups',
        name: 'Grupos de Workflow',
        component: () => import('@/views/Comercial/Workflow/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Grupos de Workflow' },
      }
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },

  {
    path: '/financeiro',
    name: 'financeiro',
    children: [
      {
        path: 'titulos',
        name: 'Títulos',
        component: () => import('@/views/Financeiro/Titulos/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Adição de custos Financeiros' },
      },
      {
        path: 'custos',
        name: 'Custos',
        component: () => import('@/views/Financeiro/Custos/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Custos do Financeiro' },
      },
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },

  {
    path: '/tools',
    name: 'tools',
    children: [
      { path: 'validator', name: 'Validador', component: () => import('@/views/Tools/Index.vue'), meta: { searchable: true, content: 'Validador de Contratos de Venda.' } },
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },

  {
    path: '/settings',
    name: 'settings',
    children: [
      { path: 'users', name: 'Usuários', component: () => import('@/views/Settings/Users/Index.vue'), meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Listagem de usuários do sistema' } },
      { path: 'account', name: 'Minha Conta', component: () => import('@/views/Settings/Account/Index.vue'), meta: { searchable: true, content: 'Sua conta pessoal' } },
      { path: 'organograma', name: 'Organograma', component: () => import('@/views/Settings/Organogram/Index.vue'), meta: { searchable: true, content: 'Organograma estrutural' } },
      { path: 'cidades', name: 'Cidades', component: () => import('@/views/Settings/EnterpriseCities/Index.vue'), meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Gerenciamento de Cidades x Empreendimentos' } },
      { path: 'management', name: 'Cargos', component: () => import('@/views/Settings/Management/Index.vue'), meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Departamentos, Categorias, Cargos e Cidades do sistema' } },
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },

  {
    path: '/report',
    name: 'Reportar',
    component: () => import('@/views/Support/Report.vue'),
    meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Reportar Problema | Suporte' },
  },
  {
    path: '/support',
    name: 'Suporte',
    component: () => import('@/views/Support/Support.vue'),
    meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Andamento do Suporte' },
  },
  {
    path: '/support/:id',
    name: 'Detalhes Suporte',
    component: () => import('@/views/Support/SupportDetails.vue'),
    props: true,
    meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Detalhes do andamento do suporte' },
  },

  {
    path: '/docs',
    name: 'Documentação',
    component: () => import('@/views/Docs/Docs.vue'),
    meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Documentação do sistema' },
  },

  {
    path: '/error',
    name: 'Error',
    component: () => import('@/views/Config/ErrorPage.vue'),
    meta: { requiresAuth: false },
  },

  {
    path: '/teste',
    name: 'Teste',
    component: () => import('@/views/Config/teste.vue'),
    meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin' },
  },

  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Auth/Index.vue'),
    meta: { requiresAuth: false },
  },

  {
    path: '/academy',
    component: () => import('@/views/Academy/layouts/AcademyShell.vue'),
    meta: { requiresAuth: true, allowedPosition: '', searchable: false },
    children: [
      { path: '', redirect: { name: 'AcademyPanel' } },

      {
        path: 'panel',
        name: 'AcademyPanel',
        component: () => import('@/views/Academy/Panel.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | Painel' },
      },

      // KB (ordem correta: rotas fixas ANTES das dinâmicas)
      {
        path: 'kb',
        name: 'AcademyKB',
        component: () => import('@/views/Academy/KB/Index.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | Base de Conhecimento' },
      },
      {
        path: 'kb/editor',
        name: 'AcademyKBEditor',
        component: () => import('@/views/Academy/KB/Editor.vue'),
        meta: { requiresAuth: true, searchable: false, content: 'Academy | KB | Editor' },
      },
      {
        path: 'kb/editor/:id',
        name: 'AcademyKBEditorEdit',
        component: () => import('@/views/Academy/KB/Editor.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | KB | Editor' },
      },
      {
        path: 'kb/my-articles',
        name: 'AcademyKBArticles',
        component: () => import('@/views/Academy/KB/Articles.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | KB | Meus artigos' },
      },

      // Categoria usa o mesmo Index.vue
      {
        path: 'kb/:categorySlug',
        name: 'AcademyKBCategory',
        component: () => import('@/views/Academy/KB/Index.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | KB | Categoria' },
      },

      {
        path: 'kb/:categorySlug/:articleSlug',
        name: 'AcademyKBArticle',
        component: () => import('@/views/Academy/KB/Article.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | KB | Artigo' },
      },

      {
        path: 'me',
        name: 'AcademyMe',
        component: () => import('@/views/Academy/Me.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | Meu perfil' },
      },

      {
        path: 'community',
        name: 'AcademyCommunity',
        component: () => import('@/views/Academy/Community/Index.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | Comunidade' },
      },
      {
        path: 'community/:type',
        name: 'AcademyCommunityType',
        component: () => import('@/views/Academy/Community/Type.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | Comunidade | Tipo' },
      },
      {
        path: 'community/topic/:id',
        name: 'AcademyCommunityTopic',
        component: () => import('@/views/Academy/Community/Topic.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | Tópico' },
      },
      {
        path: 'tracks',
        name: 'AcademyTracks',
        component: () => import('@/views/Academy/Tracks/Index.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | Trilhas' },
      },
      {
        path: 'tracks/:trackSlug',
        name: 'AcademyTrackDetail',
        component: () => import('@/views/Academy/Tracks/Detail.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | Trilha' },
      },
      {
        path: 'admin',
        name: 'AcademyAdmin',
        component: () => import('@/views/Academy/Admin/Index.vue'),
        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Academy | Admin ' },
      },
      {
        path: 'admin/tracks',
        name: 'AcademyTracksAdmin',
        component: () => import('@/views/Academy/Admin/Tracks/Index.vue'),
        meta: { requiresAuth: true, allowedRole: 'admin', searchable: true, content: 'Academy | Admin | Trilhas' },
      },
      {
        path: 'admin/tracks/:slug',
        name: 'AcademyTracksAdminDetail',
        component: () => import('@/views/Academy/Admin/Tracks/Detail.vue'),
        props: true,
        meta: { requiresAuth: true, allowedRole: 'admin', searchable: false, content: 'Academy | Admin | Trilhas | Detalhe' },
      },
      {
        path: '/academy/admin/tracks/new',
        name: 'AcademyTracksAdminCreate',
        component: () => import('@/views/Academy/Admin/Tracks/Create.vue'),
      },
      {
        path: 'users',
        name: 'AcademyUsers',
        component: () => import('@/views/Academy/Users/Index.vue'),
        meta: { requiresAuth: true, searchable: true, content: 'Academy | Ranking de usuários' },
      },
      {
        path: 'users/:id',
        name: 'AcademyUserProfile',
        component: () => import('@/views/Academy/Users/Profile.vue'),
        props: true,
        meta: { requiresAuth: true, searchable: false, content: 'Academy | Perfil do usuário' },
      },
      {
        path: 'admin',
        name: 'AcademyAdmin',
        component: () => import('@/views/Academy/Admin/Index.vue'),
        meta: { requiresAuth: true, allowedRole: 'admin', searchable: false, content: 'Academy | Admin' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth;
  const allowedPosition = to.meta.allowedPosition;
  const allowedRole = to.meta.allowedRole;

  if (requiresAuth && !authStore.isAuthenticated()) return next('/login');

  if (allowedPosition && !authStore.hasPosition(allowedPosition)) {
    return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página!' } });
  }

  if (allowedRole && !authStore.hasRole(allowedRole)) {
    return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página!' } });
  }

  next();
});

export default router;
