// src/router/pwa.routes.js
//
// Rota da tela /instalar, anexada ao shell do Office em tempo de execução.
//
// Por que não fica direto no office.routes.js: aquele arquivo é o mais disputado
// do repo e concentra o trabalho em andamento de várias frentes. Injetar daqui
// mantém a tela de instalação independente do que estiver aberto por lá.
//
// A rota fica FORA do navRegistry de propósito: /instalar não é gerenciada por
// alçada, todo usuário autenticado precisa conseguir instalar o app.

export const installRoute = {
    path: 'instalar',
    name: 'Instalar o app',
    component: () => import('@/views/Office/Instalar/Index.vue'),
    meta: {
        requiresAuth: true,
        searchable: true,
        content: 'Instalar o Office como aplicativo no celular e no computador e ativar as notificações',
    },
};

/** Anexa as rotas de PWA ao shell do Office. Idempotente. */
export function attachPwaRoutes(routes) {
    const shell = routes.find(r => r.path === '/' && Array.isArray(r.children));
    if (!shell) return routes;   // estrutura mudou: melhor não ter a tela do que quebrar o router
    if (!shell.children.some(c => c.path === installRoute.path)) {
        shell.children.push(installRoute);
    }
    return routes;
}

export default attachPwaRoutes;
