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
 *     SISTEMA   — administração, suporte, conta e preferências do próprio usuário
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
 *   iconImg   — (opcional) URL de PNG/SVG (em /public) p/ logos de marca; vence o icon
 *   iconColor — (opcional) cor fixa do ícone (ex.: '#25D366'); usa o glifo da marca
 *   section   — (opcional) query param ?section= para navegação interna
 *   adminOnly — (opcional) true = visível apenas para admin
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const navRegistry = [

    // ═══ OPERAÇÃO ═══════════════════════════════════════════════════════════════

    // ── Checklists (lançamentos e demandas) ────────────────────────────────────
    {
        // Tela única com abas internas (Painel/Checklists/Minhas Tarefas) → um só
        // item de menu (link direto). As abas ficam dentro da própria tela.
        key: 'checklist',
        label: 'Checklists',
        icon: 'fas fa-clipboard-check',
        group: 'OPERAÇÃO',
        pages: [
            { route: '/checklists', name: 'Checklists', icon: 'fas fa-clipboard-check' },
        ],
    },

    // ── Relatórios da Eme (relatórios customizados gerados por IA) ─────────────
    {
        // Item único: a lista mostra "Meus relatórios" (admin cria via Eme) e
        // "Compartilhados comigo" (qualquer usuário). Por isso o item NÃO é
        // adminOnly — o gate de criação fica na tela/rota do builder.
        key: 'relatorios',
        label: 'Relatórios',
        icon: 'fas fa-chart-column',
        group: 'OPERAÇÃO',
        pages: [
            { route: '/relatorios', name: 'Relatórios', icon: 'fas fa-wand-magic-sparkles', permissionManaged: false },
        ],
    },

    // ── Marketing ──────────────────────────────────────────────────────────────
    {
        key: 'marketing',
        label: 'Marketing',
        icon: 'fas fa-bullhorn',
        group: 'OPERAÇÃO',
        // A subcategoria "Captação" (Captação de Leads, Vínculos CV, Formulários,
        // Config. Captação) foi consolidada na Central Meta (/meta) em 2026-07-23.
        pages: [
            // Tela única com abas internas (Geral/Próximos/Finalizados) → um só item.
            { route: '/marketing/events', name: 'Eventos', icon: 'fas fa-calendar-days' },
            { route: '/marketing/leads', section: 'Leads', name: 'Leads', icon: 'fas fa-user-plus' },
            // Config das Aprovações fica só dentro da tela (botão "Configurações"), não no menu.
            { route: '/marketing/aprovacoes', name: 'Aprovações', icon: 'fas fa-stamp' },
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
                ],
            },
            {
                key: 'registers',
                name: 'Cadastros',
                icon: 'fas fa-address-book',
                pages: [
                    // Tela única com abas internas (Geral/Lançamentos/Em Obras/…) → um só item.
                    { route: '/comercial/buildings',       name: 'Empreendimentos', icon: 'fas fa-building' },
                    { route: '/comercial/imobiliarias',    section: 'Imobiliárias',  name: 'Imobiliárias',  icon: 'fas fa-house-flag' },
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
                key: 'conditions',
                name: 'Condições & Regras',
                icon: 'fas fa-clipboard-list',
                pages: [
                    { route: '/comercial/conditions',      section: 'Fichas Comerciais', name: 'Fichas Comerciais', icon: 'fas fa-file-contract' },
                    { route: '/comercial/mcmv',            section: 'MCMV',              name: 'Minha Casa Minha Vida',    icon: 'fas fa-house-circle-check' },
                    { route: '/comercial/workflow/groups', section: 'Grupos Workflow',   name: 'Grupos Workflow',   icon: 'fas fa-chart-diagram' },
                ],
            },
            {
                key: 'terminations',
                name: 'Distratos & Cancelamentos',
                icon: 'fas fa-handshake-slash',
                pages: [
                    { route: '/comercial/distratos',             section: 'Distratos',     name: 'Distratos',     icon: 'fas fa-file-circle-xmark' },
                    { route: '/comercial/cancelamento-reservas', section: 'Cancelamentos', name: 'Cancelamentos', icon: 'fas fa-eraser', adminOnly: true },
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
                    { route: '/financeiro/gastos-departamento', section: 'Gastos por Departamento', name: 'Gastos por Departamento', icon: 'fas fa-chart-pie' },
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
                ],
            },
        ],
    },

    // ── Academy (Conhecimento & Trilhas) ───────────────────────────────────────
    // Academy migrado para dentro do Office — área /academy renderizada DENTRO do
    // OfficeShell (nav do Office). permissionManaged:false → visível a todos os
    // usuários Office, fora das Alçadas. O "Painel" é o hub do Academy (destaques,
    // dúvidas, comunidade, nível/conquistas) — entra aqui para acesso direto, sem
    // precisar passar pela KB/Trilhas e voltar.
    {
        key: 'academy',
        label: 'Academy',
        icon: 'fas fa-graduation-cap',
        group: 'OPERAÇÃO',
        permissionManaged: false,
        pages: [
            { route: '/academy/panel', name: 'Painel', icon: 'fas fa-gauge-high', permissionManaged: false },
            { route: '/academy/kb', name: 'Base de Conhecimento', icon: 'fas fa-book-open', permissionManaged: false },
            { route: '/academy/tracks', name: 'Trilhas', icon: 'fas fa-route', permissionManaged: false },
            { route: '/academy/admin', name: 'Gestão do Academy', icon: 'fas fa-chalkboard-user', adminOnly: true },
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
            { route: '/microsoft/sharepoint',  section: 'SharePoint',        name: 'SharePoint',        icon: 'fas fa-folder-open',   iconImg: '/icons/ms-sharepoint.svg' },
            { route: '/microsoft/teams',       section: 'Teams',             name: 'Teams',             icon: 'fas fa-people-group',  iconImg: '/icons/ms-teams.svg' },
            { route: '/microsoft/planner',     section: 'Planner',           name: 'Planner',           icon: 'fas fa-table-columns', iconImg: '/icons/ms-planner.svg' },
            { route: '/microsoft/todo',        section: 'To Do',             name: 'To Do',             icon: 'fas fa-list-check',    iconImg: '/icons/ms-todo.svg' },
            { route: '/microsoft/transcripts', section: 'Transcrições & IA', name: 'Transcrições & IA', icon: 'fas fa-wand-magic-sparkles' },
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
            // Central Meta unificada (2026-07-23): Captação · Campanhas · Vínculos CV
            // · Formulários · Credenciais · Configurações — tudo em abas de /meta.
            { route: '/meta', name: 'Central Meta', icon: 'fab fa-meta', iconColor: '#0866FF', adminOnly: true },
            // WhatsApp segue em tela própria (Configuração · Templates · Automações · Gastos · Mensagens).
            { route: '/settings/whatsapp', section: 'WhatsApp', name: 'WhatsApp', icon: 'fab fa-whatsapp', iconColor: '#25D366', adminOnly: true },
        ],
    },

    // ═══ SISTEMA ════════════════════════════════════════════════════════════════

    // ── Administração ───────────────────────────────────────────────────────────
    // adminOnly:true            → sempre oculto para não-admin (ex: Usuários, Alçadas, Backup Sienge)
    // sem flag                  → gerenciado por alçada (ex: Organograma — admin pode delegar/revogar)
    // permissionManaged:false   → sempre visível para todos e fora das Alçadas. É o caso da conta e
    //                             das preferências do próprio usuário (Minha Conta, Notificações,
    //                             Alertas, Reportar Problema), que vivem aqui em vez de uma categoria
    //                             própria. Por causa deles, a categoria aparece para qualquer usuário
    //                             — o não-admin só enxerga esses itens.
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
                    // Conta do próprio usuário — permissionManaged:false → visível a todos.
                    { route: '/settings/Account', section: 'Minha Conta', name: 'Minha Conta', icon: 'fas fa-user-gear', permissionManaged: false },
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
                    { route: '/tools/bucket-upload', section: 'Looqbox', name: 'Looqbox', icon: 'fas fa-cloud-arrow-up', iconImg: '/icons/looqbox.png' },
                    { route: '/settings/backup-sienge', section: 'Backup Sienge', name: 'Backup Sienge', icon: 'fas fa-database', iconImg: '/icons/sienge.png', adminOnly: true },
                    { route: '/settings/docusign', section: 'DocuSign', name: 'DocuSign', icon: 'fas fa-file-signature', iconImg: '/icons/docusign.png', adminOnly: true },
                ],
            },
            {
                key: 'intelligence',
                name: 'Inteligência (Eme)',
                icon: 'fas fa-microchip',
                pages: [
                    { route: '/tools/eme-brain', section: 'Cérebro da Eme', name: 'Cérebro da Eme', icon: 'fas fa-brain', adminOnly: true },
                    { route: '/tools/eme-atende', section: 'Eme Atende', name: 'Eme Atende', icon: 'fas fa-headset', adminOnly: true },
                ],
            },
            {
                key: 'communication',
                name: 'Comunicação',
                icon: 'fas fa-comments',
                pages: [
                    { route: '/mural/admin', section: 'Mural de Avisos', name: 'Mural de Avisos', icon: 'fas fa-thumbtack', adminOnly: true },
                    // Preferências do próprio usuário — permissionManaged:false → visíveis a todos.
                    { route: '/settings/notifications', section: 'Notificações', name: 'Notificações', icon: 'fas fa-bell', permissionManaged: false },
                    { route: '/settings/alerts', section: 'Alertas', name: 'Alertas', icon: 'fas fa-tower-broadcast', permissionManaged: false },
                    { route: '/report', name: 'Reportar Problema', icon: 'fas fa-bug', permissionManaged: false },
                ],
            },
        ],
    },

];

// ─── Rota ativa ───────────────────────────────────────────────────────────────

/**
 * Um item está ativo quando a rota atual bate no caminho e, havendo `section`,
 * quando o ?section= também bate. Itens sem section ativam só pelo caminho.
 * Usado no Nav (auto-abrir + destacar) e no SidebarItem.
 */
export function isItemActive(currentPath, currentSection, item) {
    if (!item || currentPath !== item.route) return false;
    if (item.section == null) return true;
    return (currentSection ?? '') === item.section;
}

/** Retorna todos os itens (planos + de subcategorias) de uma categoria. */
export function categoryItems(cat) {
    if (!cat) return [];
    return [
        ...(cat.pages || []),
        ...(cat.subcategories || []).flatMap(sub => sub.pages || []),
    ];
}

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
