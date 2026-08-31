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
        // Auto-cadastro da equipe de uma correspondente - link gerado na tela
        // Comercial > Correspondentes do Office (reutilizável, com prazo opcional).
        path: '/correspondente/:token',
        name: 'LpCorrespondente',
        component: () => import('@/views/Lp/Correspondente.vue'),
        meta: { requiresAuth: false },
    },
    {
        // Assinatura do aditivo contratual - link fixo por assinante, gerado
        // pelo script de envio. A URL do DocuSign nasce no clique.
        //
        // O token fica na RAIZ, para o link ficar curto no WhatsApp. Para não
        // roubar o /:slug das landing pages, casa só com 22 caracteres base62:
        // slug de LP é kebab-case (tem hífen) e nunca chegou perto disso.
        // Estas duas rotas precisam vir ANTES de /:slug.
        path: '/:token([A-Za-z0-9]{22})',
        name: 'LpAditivo',
        component: () => import('@/views/Lp/Aditivo.vue'),
        meta: { requiresAuth: false },
    },
    {
        // Para onde o DocuSign devolve o assinante depois de assinar.
        path: '/:token([A-Za-z0-9]{22})/pronto',
        name: 'LpAditivoPronto',
        component: () => import('@/views/Lp/Aditivo.vue'),
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
