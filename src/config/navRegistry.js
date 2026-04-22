/**
 * navRegistry.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA DE VERDADE para estrutura de navegação e gestão de alçadas.
 *
 * ✅ Como adicionar uma nova página ao sistema:
 *    1. Adicione a rota em office.routes.js (como de costume)
 *    2. Adicione a entrada correspondente AQUI, no departamento correto
 *    3. Pronto — ela aparece no Nav e, se gerenciada, na tela de Alçadas
 *
 * ─── Propriedades de categoria ────────────────────────────────────────────────
 *   key               — identificador único (snake_case)
 *   label             — rótulo de exibição
 *   icon              — classe FontAwesome
 *   permissionManaged — (padrão: true) false = não aparece na tela de Alçadas
 *   requiresMicrosoft — (padrão: false) só exibe quando MS está conectado
 *   subcategories     — (opcional) array de subcategorias
 *   pages             — (opcional) array de itens planos
 *
 * ─── Propriedades de subcategoria ─────────────────────────────────────────────
 *   key   — identificador único dentro da categoria
 *   name  — nome de exibição
 *   icon  — classe FontAwesome
 *   pages — array de itens
 *
 * ─── Propriedades de item (page) ──────────────────────────────────────────────
 *   route     — caminho da rota (deve bater com office.routes.js)
 *   name      — nome de exibição
 *   icon      — classe FontAwesome
 *   section   — (opcional) query param ?section= para navegação interna
 *   adminOnly — (opcional) true = visível apenas para admin
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const navRegistry = [

    // ── Marketing ──────────────────────────────────────────────────────────────
    {
        key: 'marketing',
        label: 'Marketing',
        icon: 'fa fa-bullhorn',
        subcategories: [
            {
                key: 'events',
                name: 'Eventos',
                icon: 'fas fa-newspaper',
                pages: [
                    { route: '/marketing/events', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                    { route: '/marketing/events', section: 'Próximos', name: 'Próximos', icon: 'fas fa-calendar-plus' },
                    { route: '/marketing/events', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-calendar-check' },
                ],
            },
        ],
        pages: [
            { route: '/marketing/leads', section: 'Leads', name: 'Leads', icon: 'fas fa-user-plus' },
            { route: '/marketing/viability', section: 'Viabilidade', name: 'Viabilidade', icon: 'fas fa-scale-balanced' },
        ],
    },

    // ── Comercial ──────────────────────────────────────────────────────────────
    {
        key: 'comercial',
        label: 'Comercial',
        icon: 'fas fa-briefcase',
        subcategories: [
            {
                key: 'sales',
                name: 'Vendas',
                icon: 'fas fa-credit-card',
                pages: [
                    { route: '/comercial/sales-projection',  section: 'Vendas x Projeção', name: 'Vendas X Projeção', icon: 'fas fa-arrow-trend-up' },
                    { route: '/comercial/faturamento',       section: 'Faturamento',      name: 'Faturamento',      icon: 'fas fa-file-invoice-dollar' },
                    { route: '/comercial/distratos',         section: 'Distratos',        name: 'Distratos',        icon: 'fas fa-file-circle-xmark' },
                    { route: '/comercial/projections',       section: 'Projeção',         name: 'Projeção',         icon: 'fas fa-chart-line' },
                ],
            },
            {
                key: 'buildings',
                name: 'Empreendimentos',
                icon: 'fas fa-building',
                pages: [
                    { route: '/comercial/buildings', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                    { route: '/comercial/buildings', section: 'Pré Lançamentos', name: 'Pré Lançamentos', icon: 'fas fa-rocket' },
                    { route: '/comercial/buildings', section: 'Lançamentos', name: 'Lançamentos', icon: 'fas fa-play' },
                    { route: '/comercial/buildings', section: 'Em Obras', name: 'Em Obras', icon: 'fas fa-hammer' },
                    { route: '/comercial/buildings', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-check-circle' },
                    { route: '/comercial/buildings', section: 'Portal do Cliente', name: 'Portal do Cliente', icon: 'fas fa-user-circle' },
                ],
            },
            {
                key: 'produto',
                name: 'Produto',
                icon: 'fas fa-file-contract',
                pages: [
                    { route: '/comercial/conditions', name: 'Fichas Comerciais', icon: 'fas fa-file-contract' },
                ],
            },
        ],
        pages: [
            { route: '/comercial/workflow/groups', section: 'Grupos Workflow', name: 'Grupos Workflow', icon: 'fas fa-chart-diagram' },
            { route: '/comercial/conditions',      section: 'Fichas Comerciais', name: 'Fichas Comerciais', icon: 'fas fa-file-contract' },
        ],
    },

    // ── Financeiro ─────────────────────────────────────────────────────────────
    {
        key: 'financeiro',
        label: 'Financeiro',
        icon: 'fas fa-money-bill-wave',
        pages: [
            { route: '/financeiro/titulos', section: 'Títulos', name: 'Títulos', icon: 'fas fa-money-bill-transfer' },
            { route: '/financeiro/custos', section: 'Custos', name: 'Custos', icon: 'fas fa-coins' },
            { route: '/financeiro/boleto-caixa', name: 'Boleto Caixa', icon: 'fas fa-barcode', adminOnly: true },
        ],
    },

    // ── Ferramentas ────────────────────────────────────────────────────────────
    {
        key: 'tools',
        label: 'Ferramentas',
        icon: 'fas fa-wrench',
        pages: [
            { route: '/tools/validator', section: 'Validador', name: 'Validador', icon: 'fas fa-check-double' },
            { route: '/tools/paymentflow', section: 'Fluxo de Pagamento', name: 'Fluxo de Pagamento', icon: 'fas fa-diagram-project' },
            { route: '/tools/bucket-upload', section: 'Envio ao Bucket', name: 'Envio ao Bucket', icon: 'fas fa-cloud-upload-alt' },
            { route: '/tools/signature', section: 'Assinatura Digital', name: 'Assinatura Digital', icon: 'fas fa-pen-nib' },
        ],
    },

    // ── Configurações ─────────────────────────────────────────────────────────
    // adminOnly:true          → sempre oculto para não-admin (ex: Usuários, Alçadas)
    // permissionManaged:false → sempre visível para todos, não aparece nas alçadas (ex: Minha Conta)
    // sem flag               → gerenciado por alçada (ex: Organograma — admin pode revogar)
    {
        key: 'settings',
        label: 'Configurações',
        icon: 'fas fa-gear',
        subcategories: [
            {
                key: 'userSettings',
                name: 'Gestão Usuários',
                icon: 'fas fa-users-gear',
                pages: [
                    { route: '/settings/Account', section: 'Minha Conta', name: 'Minha Conta', icon: 'fas fa-user-cog', permissionManaged: false },
                    { route: '/settings/users', section: 'Usuários', name: 'Usuários', icon: 'fas fa-users', adminOnly: true },
                    { route: '/settings/organograma', section: 'Organograma', name: 'Organograma', icon: 'fas fa-sitemap' },
                ],
            },
        ],
        pages: [
            { route: '/settings/cidades', section: 'Cidades', name: 'Cidades', icon: 'fas fa-city', adminOnly: true },
            { route: '/settings/permissions', section: 'Alçadas', name: 'Alçadas', icon: 'fas fa-shield-halved', adminOnly: true },
            { route: '/settings/management', section: 'Departamentos', name: 'Departamentos', icon: 'fas fa-gears', adminOnly: true },
        ],
    },

    // ── Microsoft (só exibido quando a integração está ativa) ──────────────────
    {
        key: 'microsoft',
        label: 'Microsoft',
        icon: 'fab fa-microsoft',
        requiresMicrosoft: true,
        pages: [
            { route: '/microsoft/sharepoint', section: 'SharePoint', name: 'SharePoint', icon: 'fas fa-folder-open' },
            { route: '/microsoft/teams', section: 'Teams', name: 'Teams', icon: 'fas fa-users' },
            { route: '/microsoft/transcripts', section: 'Transcrições & IA', name: 'Transcrições & IA', icon: 'fas fa-file-waveform' },
            // { route: '/microsoft/inperson',    name: 'Reuniões Presenciais',  icon: 'fas fa-people-group' },
        ],
    },

];

// ─── Exports auxiliares ───────────────────────────────────────────────────────

/**
 * Apenas as categorias gerenciadas por alçadas.
 * Usadas na tela de Gestão de Alçadas.
 */
export const managedRegistry = navRegistry.filter(cat => cat.permissionManaged !== false);

/**
 * Retorna a lista de páginas únicas gerenciáveis de uma categoria para a tela de alçadas.
 * Exclui:
 *   - adminOnly:true          → sempre admin, não pode ser delegado
 *   - permissionManaged:false → sempre visível para todos, não precisa de alçada
 * Remove duplicatas de rota (ex: /comercial/buildings com 6 sections vira 1 entrada).
 */
export function getDeptManagedPages(cat) {
    const seen = new Set();
    const result = [];
    const add = (page) => {
        if (page.adminOnly || page.permissionManaged === false) return;
        if (!seen.has(page.route)) {
            seen.add(page.route);
            result.push(page);
        }
    };
    (cat.pages || []).forEach(add);
    (cat.subcategories || []).forEach(sub => (sub.pages || []).forEach(add));
    return result;
}

/**
 * Lista plana de todas as rotas gerenciáveis por alçadas (sem duplicatas).
 * Mesmas regras de exclusão do getDeptManagedPages.
 * Usada no router guard, no permissionStore e no canSeeItem do Nav.
 */
const _isManageablePage = (p) => !p.adminOnly && p.permissionManaged !== false;

export const allManagedRoutes = [
    ...new Set(
        managedRegistry.flatMap(cat => [
            ...(cat.pages || []).filter(_isManageablePage).map(p => p.route),
            ...(cat.subcategories || []).flatMap(sub =>
                (sub.pages || []).filter(_isManageablePage).map(p => p.route)
            ),
        ])
    ),
];
