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
        // Cadastro público de imobiliária — link gerado na tela Comercial >
        // Imobiliárias do Office (token de uso único).
        path: '/imobiliaria/:token',
        name: 'LpImobiliaria',
        component: () => import('@/views/Lp/Imobiliaria.vue'),
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
