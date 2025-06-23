// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/Auth/authStore';
import Home from '../views/Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true, searchable: false, content: 'Página inicial do sistema' },
  },
  {
    path: '/events',
    name: 'Eventos',
    component: () => import('../views/Events/Events.vue'),
    meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Listagem de eventos' },
  },
  {
    path: '/buildings',
    name: 'Empreendimentos',
    component: () => import('../views/Buildings/Buildings.vue'),
    meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Listagem de empreendimentos' },
  },
  {
    path: '/comercial',
    name: 'comercial',
    children: [
      {
        path: 'leads',
        name: 'Leads',
        component: () => import('../views/Reports/Leads.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de leads'  },
      },  
      {
        path: 'reservas',
        name: 'Reservas',
        component: () => import('../views/Reports/Reservas.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: false, content: 'Dashboard de reservas' },
      },
      {
        path: 'repasses',
        name: 'Repasses',
        component: () => import('../views/Reports/Repasses.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Kanban de repasses' },
      },
      {
        path: 'faturamento',
        name: 'Faturamento',
        component: () => import('../views/Reports/Faturamento.vue'),
        meta: { requiresAuth: true, allowedPosition: '', searchable: true, content: 'Dashboard de faturamento e contratos' },
      },
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },
  {
    path: '/settings',
    name: 'settings',
    children: [
      { path: 'Users', name: 'Usuários', component: () => import('../views/Settings/Users.vue'), meta: { searchable: true, content: 'Listagem de usuários do sistema' } },
      { path: 'Account', name: 'Minha Conta', component: () => import('../views/Settings/Account.vue'), meta: { searchable: true, content: 'Sua conta pessoal' } },
      { path: 'Organograma', name: 'Organograma', component: () => import('../views/Settings/Organograma.vue'), meta: { searchable: true, content: 'Organograma estrutural' } },
    ],
    meta: { requiresAuth: true, allowedPosition: '' },
  },
  {
    path: '/error',
    name: 'Error',
    component: () => import('../views/Config/ErrorPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/teste',
    name: 'Teste',
    component: () => import('../views/Config/teste.vue'),
    meta: { requiresAuth: true, allowedPosition: 'admin' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Auth/Auth.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/academy', 
    component: () => import('../views/Academy/Academy.vue'),
    children: [
      {
        path: '',
        name: 'AcademyDefault',  
        redirect: { name: 'AcademyHome' }
      },
      {
        path: 'home',
        name: 'AcademyHome',  
        component: () => import('../views/Academy/Home.vue')
      },
      {
        path: 'corretor',
        name: 'Corretor',
        component: () => import('../views/Academy/Courses/Corretor.vue')
      },
      {
        path: 'imobiliaria',
        name: 'Imobiliaria',
        component: () => import('../views/Academy/Courses/Imobiliaria.vue')
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
  next();
});

export default router;
