// src/router/lp.routes.js
//
// Rotas servidas quando a SPA roda no host lp.menin.com.br.
// Todas públicas — landing pages de captação de leads.

export default [
    {
        path: '/',
        name: 'LpHome',
        component: () => import('@/views/Lp/Default.vue'),
        meta: { requiresAuth: false },
    },
    {
        path: '/:slug',
        name: 'LpPage',
        component: () => import('@/views/Lp/Page.vue'),
        props: true,
        meta: { requiresAuth: false },
    },
];
