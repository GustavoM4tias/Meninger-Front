// Rotas do host academy.* enquanto o Academy migra para dentro do Office.
// Tudo que chegar por academy.menin.com.br cai na tela de manutenção.
// (O academy.routes.js segue intacto para reconectar no futuro.)
export default [
    {
        path: '/:pathMatch(.*)*',
        name: 'Maintenance',
        component: () => import('@/views/Maintenance.vue'),
        meta: { requiresAuth: false },
    },
];
