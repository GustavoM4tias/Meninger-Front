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
        path: 'bills',
        name: 'Bills',
        component: () => import('@/views/Marketing/Bills/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Adição custas de Marketing' },
      },
      {
        path: 'expenses',
        name: 'Expenses',
        component: () => import('@/views/Marketing/Expenses/Index.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Custas de Marketing' },
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
      { path: 'management', name: 'Cargos', component: () => import('@/views/Settings/Management/Index.vue'), meta: { requiresAuth: true, allowedPosition: '', allowedRole: 'admin', searchable: true, content: 'Cargos e Alçadas do sistema' } },
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
    component: () => import('@/views/Academy/Academy.vue'),
    children: [
      {
        path: '',
        name: 'AcademyDefault',
        redirect: { name: 'AcademyHome' }
      },
      {
        path: 'home',
        name: 'AcademyHome',
        component: () => import('@/views/Academy/Home.vue')
      },
      {
        path: 'corretor',
        name: 'Corretor',
        component: () => import('@/views/Academy/Courses/Corretor.vue')
      },
      {
        path: 'imobiliaria',
        name: 'Imobiliaria',
        component: () => import('@/views/Academy/Courses/Imobiliaria.vue')
      },
    ],
    meta: { requiresAuth: false, allowedPosition: '' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guard global para validação de autenticação e autorização
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth;
  const allowedPosition = to.meta.allowedPosition;
  const allowedRole = to.meta.allowedRole;

  // Se a rota exigir autenticação e não estiver autenticado, redireciona para "/login"
  if (requiresAuth && !authStore.isAuthenticated()) {
    return next('/login');
  }

  // Se a rota tiver restrição de posição e o usuário não possuir, redireciona para a página de erro
  if (allowedPosition && !authStore.hasPosition(allowedPosition)) {
    const errorMessage = 'Você não tem permissão para acessar esta página!';
    return next({
      path: '/error',
      query: { message: errorMessage }
    });
  }
  // Se a rota tiver restrição de posição e o usuário não possuir, redireciona para a página de erro
  if (allowedRole && !authStore.hasRole(allowedRole)) {
    const errorMessage = 'Você não tem permissão para acessar esta página!';
    return next({
      path: '/error',
      query: { message: errorMessage }
    });
  }
  if (to.meta?.requiresAdmin && auth?.user?.role !== 'admin') {
    return next({ path: '/' }); // ou uma página 403
  }
  next();
});

export default router;
