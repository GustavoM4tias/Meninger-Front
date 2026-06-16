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
 * ─── Seções (group) ───────────────────────────────────────────────────────────
 *   A navbar agrupa as categorias em SEÇÕES de topo para escalar conforme o
 *   sistema cresce. A ordem das seções segue a 1ª aparição no array abaixo.
 *     OPERAÇÃO  — o dia a dia do negócio (Marketing, Comercial, Financeiro)
 *     RECURSOS  — canais e integrações externas (Microsoft, Meta)
 *     SISTEMA   — administração, suporte e a conta do próprio usuário
 *
 * ─── Propriedades de categoria ────────────────────────────────────────────────
 *   key               — identificador único (snake_case)
 *   label             — rótulo de exibição
 *   icon              — classe FontAwesome
 *   group             — (opcional) seção de topo na navbar (ver acima)
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

    // ═══ OPERAÇÃO ═══════════════════════════════════════════════════════════════

    // ── Marketing ──────────────────────────────────────────────────────────────
    {
        key: 'marketing',
        label: 'Marketing',
        icon: 'fas fa-bullhorn',
        group: 'OPERAÇÃO',
        subcategories: [
            {
                key: 'events',
                name: 'Eventos',
                icon: 'fas fa-calendar-days',
                pages: [
                    { route: '/marketing/events', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                    { route: '/marketing/events', section: 'Próximos', name: 'Próximos', icon: 'fas fa-calendar-plus' },
                    { route: '/marketing/events', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-calendar-check' },
                ],
            },
            {
                key: 'capture',
                name: 'Captação',
                icon: 'fas fa-magnet',
                pages: [
                    { route: '/marketing/captacao', name: 'Captação de Leads', icon: 'fas fa-inbox', adminOnly: true },
                    { route: '/marketing/formularios', name: 'Formulários', icon: 'fas fa-square-poll-vertical', adminOnly: true },
                    { route: '/marketing/settings', name: 'Config. Captação', icon: 'fas fa-sliders', adminOnly: true },
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
        group: 'OPERAÇÃO',
        subcategories: [
            {
                key: 'sales',
                name: 'Vendas',
                icon: 'fas fa-handshake',
                pages: [
                    { route: '/comercial/precadastros',    section: 'Pré-Cadastros', name: 'Pré-Cadastros', icon: 'fas fa-id-card-clip', permissionManaged: false },
                    { route: '/comercial/reservas-report', section: 'Reservas',      name: 'Reservas',      icon: 'fas fa-bookmark',     permissionManaged: false },
                    { route: '/comercial/faturamento',     section: 'Faturamento',   name: 'Faturamento',   icon: 'fas fa-file-invoice-dollar' },
                    { route: '/comercial/distratos',       section: 'Distratos',     name: 'Distratos',     icon: 'fas fa-file-circle-xmark' },
                ],
            },
            {
                key: 'projection',
                name: 'Projeção & Metas',
                icon: 'fas fa-bullseye',
                pages: [
                    { route: '/comercial/sales-projection', section: 'Vendas x Projeção', name: 'Vendas X Projeção', icon: 'fas fa-arrow-trend-up' },
                    { route: '/comercial/projections',      section: 'Projeção',          name: 'Projeção',          icon: 'fas fa-chart-line' },
                ],
            },
            {
                key: 'buildings',
                name: 'Empreendimentos',
                icon: 'fas fa-building',
                pages: [
                    { route: '/comercial/buildings', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                    { route: '/comercial/buildings', section: 'Pré Lançamentos', name: 'Pré Lançamentos', icon: 'fas fa-hourglass-start' },
                    { route: '/comercial/buildings', section: 'Lançamentos', name: 'Lançamentos', icon: 'fas fa-rocket' },
                    { route: '/comercial/buildings', section: 'Em Obras', name: 'Em Obras', icon: 'fas fa-helmet-safety' },
                    { route: '/comercial/buildings', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-building-circle-check' },
                    { route: '/comercial/buildings', section: 'Portal do Cliente', name: 'Portal do Cliente', icon: 'fas fa-house-user' },
                ],
            },
            {
                key: 'conditions',
                name: 'Condições & Regras',
                icon: 'fas fa-clipboard-list',
                pages: [
                    { route: '/comercial/conditions',      section: 'Fichas Comerciais', name: 'Fichas Comerciais', icon: 'fas fa-file-contract' },
                    { route: '/comercial/mcmv',            section: 'MCMV',              name: 'MCMV - Limites',    icon: 'fas fa-house-circle-check' },
                    { route: '/comercial/workflow/groups', section: 'Grupos Workflow',   name: 'Grupos Workflow',   icon: 'fas fa-chart-diagram' },
                ],
            },
        ],
    },

    // ── Financeiro ─────────────────────────────────────────────────────────────
    {
        key: 'financeiro',
        label: 'Financeiro',
        icon: 'fas fa-money-bill-wave',
        group: 'OPERAÇÃO',
        subcategories: [
            {
                key: 'analise',
                name: 'Análise',
                icon: 'fas fa-magnifying-glass-chart',
                pages: [
                    { route: '/financeiro/titulos', section: 'Títulos', name: 'Títulos', icon: 'fas fa-money-bill-transfer' },
                    { route: '/financeiro/custos', section: 'Custos', name: 'Custos', icon: 'fas fa-coins' },
                    { route: '/financeiro/inadimplencia', name: 'Inadimplência', icon: 'fas fa-triangle-exclamation', adminOnly: true },
                ],
            },
            {
                key: 'operacoes',
                name: 'Operações',
                icon: 'fas fa-money-check-dollar',
                pages: [
                    { route: '/financeiro/paymentflow', section: 'Fluxo de Pagamento', name: 'Fluxo de Pagamento', icon: 'fas fa-diagram-project' },
                    { route: '/financeiro/boleto-caixa', name: 'Boleto Caixa', icon: 'fas fa-barcode', adminOnly: true },
                    { route: '/financeiro/auto-sync', name: 'Auto-Sync Títulos', icon: 'fas fa-arrows-rotate', adminOnly: true },
                ],
            },
        ],
    },

    // ═══ RECURSOS ═══════════════════════════════════════════════════════════════

    // ── Microsoft (só exibido quando a integração está ativa) ──────────────────
    {
        key: 'microsoft',
        label: 'Microsoft',
        icon: 'fab fa-microsoft',
        group: 'RECURSOS',
        requiresMicrosoft: true,
        pages: [
            { route: '/microsoft/sharepoint',  section: 'SharePoint',        name: 'SharePoint',        icon: 'fas fa-folder-open' },
            { route: '/microsoft/teams',       section: 'Teams',             name: 'Teams',             icon: 'fas fa-people-group' },
            { route: '/microsoft/planner',     section: 'Planner',           name: 'Planner',           icon: 'fas fa-table-columns' },
            { route: '/microsoft/transcripts', section: 'Transcrições & IA', name: 'Transcrições & IA', icon: 'fas fa-file-waveform' },
            // { route: '/microsoft/inperson',    name: 'Reuniões Presenciais',  icon: 'fas fa-people-group' },
        ],
    },

    // ── Meta — canais Facebook/Instagram + WhatsApp ────────────────────────────
    {
        key: 'meta',
        label: 'Meta',
        icon: 'fab fa-meta',
        iconColor: '#0866FF',
        group: 'RECURSOS',
        pages: [
            { route: '/marketing/campanhas', name: 'Campanhas Meta', icon: 'fas fa-rectangle-ad', adminOnly: true },
            { route: '/settings/whatsapp', section: 'WhatsApp', name: 'WhatsApp', icon: 'fab fa-whatsapp', adminOnly: true },
            { route: '/tools/whatsapp-automations', section: 'Automações WhatsApp', name: 'Automações WhatsApp', icon: 'fas fa-robot', adminOnly: true },
        ],
    },

    // ═══ SISTEMA ════════════════════════════════════════════════════════════════

    // ── Administração ───────────────────────────────────────────────────────────
    // adminOnly:true → sempre oculto para não-admin (ex: Usuários, Alçadas, Backup Sienge)
    // sem flag       → gerenciado por alçada (ex: Organograma — admin pode delegar/revogar)
    {
        key: 'admin',
        label: 'Administração',
        icon: 'fas fa-user-shield',
        group: 'SISTEMA',
        subcategories: [
            {
                key: 'access',
                name: 'Usuários & Acessos',
                icon: 'fas fa-users-gear',
                pages: [
                    { route: '/settings/users', section: 'Usuários', name: 'Usuários', icon: 'fas fa-users', adminOnly: true },
                    { route: '/settings/organograma', section: 'Organograma', name: 'Organograma', icon: 'fas fa-sitemap' },
                    { route: '/settings/permissions', section: 'Alçadas', name: 'Alçadas', icon: 'fas fa-shield-halved', adminOnly: true },
                    { route: '/settings/management', section: 'Departamentos', name: 'Departamentos', icon: 'fas fa-building-user', adminOnly: true },
                    { route: '/settings/cidades', section: 'Cidades', name: 'Cidades', icon: 'fas fa-city', adminOnly: true },
                ],
            },
            {
                key: 'integrations',
                name: 'Integrações & Dados',
                icon: 'fas fa-plug',
                pages: [
                    { route: '/tools/validator', section: 'Validador', name: 'Validador', icon: 'fas fa-check-double' },
                    { route: '/tools/bucket-upload', section: 'Envio ao Bucket', name: 'Envio ao Bucket', icon: 'fas fa-cloud-arrow-up' },
                    { route: '/settings/backup-sienge', section: 'Backup Sienge', name: 'Backup Sienge', icon: 'fas fa-database', adminOnly: true },
                ],
            },
            {
                key: 'intelligence',
                name: 'Inteligência (Eme)',
                icon: 'fas fa-microchip',
                pages: [
                    { route: '/tools/eme-brain', section: 'Cérebro da Eme', name: 'Cérebro da Eme', icon: 'fas fa-brain', adminOnly: true },
                ],
            },
        ],
    },

    // ── Conta & Preferências ─────────────────────────────────────────────────────
    // permissionManaged:false → sempre visível para todos, não aparece nas alçadas.
    {
        key: 'account',
        label: 'Conta & Preferências',
        icon: 'fas fa-circle-user',
        group: 'SISTEMA',
        permissionManaged: false,
        pages: [
            { route: '/settings/Account', section: 'Minha Conta', name: 'Minha Conta', icon: 'fas fa-user-gear', permissionManaged: false },
            { route: '/settings/notifications', section: 'Notificações', name: 'Notificações', icon: 'fas fa-bell', permissionManaged: false },
            { route: '/settings/alerts', section: 'Alertas', name: 'Alertas', icon: 'fas fa-tower-broadcast', permissionManaged: false },
            { route: '/report', name: 'Reportar Problema', icon: 'fas fa-bug', permissionManaged: false },
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
