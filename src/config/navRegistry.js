import { RELATORIOS } from '@/views/Office/Comercial/Relatorios/relatorios';
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
 *   adminOnly — (opcional) true = visível apenas para admin (trava de CÓDIGO)
 *   hiddenInNav — (opcional) true = NÃO aparece no menu, mas continua existindo
 *                 para alçadas, busca e links. Use quando a tela virou ABA de
 *                 outra: a rota precisa sobreviver (é ela que a permissão
 *                 nomeia), mas dois itens de menu para a mesma tela confundem.
 *
 * ─── Como uma tela vira exclusiva de admin ────────────────────────────────────
 *   a) PELA TELA DE ALÇADAS (padrão, sem deploy): o admin liga "somente admin"
 *      no item em /settings/permissions. O backend grava em route_policies e a
 *      rota sai das alçadas efetivas de todo não-admin na hora — menu, guard,
 *      API (requireRoutePermission) e tools da Eme fecham juntos. Reversível
 *      pela mesma tela.
 *   b) NO CÓDIGO (quando a tela NÃO pode ser delegável nunca): adminOnly:true
 *      aqui + requiresAdmin no meta da rota (office.routes.js) + requireAdmin
 *      nas rotas de API. O validador (/settings/integrity) cobra os três níveis.
 *   Regra prática: use (a). Só use (b) para telas de administração do próprio
 *   sistema (Usuários, Alçadas, Backup, credenciais).
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
        // A subcategoria "Captação" (Captação de Leads, Vínculos CV, Formulários,
        // Config. Captação) foi consolidada na Central Meta (/meta) em 2026-07-23.
        subcategories: [
            {
                key: 'events',
                name: 'Eventos',
                icon: 'fas fa-calendar-days',
                pages: [
                    // A agenda e o planejamento que a alimenta ficam juntos: o
                    // plano aprovado vira evento na agenda automaticamente.
                    // Tela única com abas internas (Geral/Próximos/Finalizados).
                    { route: '/marketing/events', name: 'Eventos', icon: 'fas fa-calendar-days' },
                    // Uma tela só para os papéis (o gestor propõe, as etapas de
                    // autorização decidem) — o papel vem do backend.
                    { route: '/marketing/plano-eventos', section: 'Plano de Eventos', name: 'Plano de Eventos', icon: 'fas fa-calendar-check' },
                ],
            },
        ],
        pages: [
            { route: '/marketing/leads', section: 'Leads', name: 'Leads', icon: 'fas fa-user-plus' },
            { route: '/marketing/stand-vendas', name: 'Stand de Vendas', icon: 'fas fa-store' },
            // Viabilidade (ex "Gastos por Departamento" do Financeiro, 2026-07-28).
            { route: '/marketing/viabilidade', section: 'Viabilidade', name: 'Viabilidade', icon: 'fas fa-chart-pie' },
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
                    // Pré-Cadastros e Reservas saíram daqui em 2026-08-31: nas duas
                    // "a tela É a listagem", ou seja, são relatórios como os outros.
                    // Agora entram pelo catálogo (relatorios.js), na subcategoria
                    // Relatórios. Sobrou aqui o que de fato não é leitura.
                    // Veio da subcategoria "Projeção & Metas" (2026-08-25), que
                    // tinha este único item - uma pasta para guardar um arquivo,
                    // custando um clique sem organizar nada. Aqui os três contam
                    // a mesma história: o que se vende, o que se reservou e o que
                    // se projeta. Vendas × Projeção continua sendo guia do
                    // Relatório Comercial; o que mora aqui é o EDITOR, que é
                    // cadastro, não leitura. A rota não mudou.
                    { route: '/comercial/projections', section: 'Projeção', name: 'Projeção', icon: 'fas fa-chart-line' },
                ],
            },
            {
                key: 'reports',
                name: 'Relatórios',
                icon: 'fas fa-chart-column',
                // Um item POR relatório, gerado do catálogo (relatorios.js).
                // Faturamento e Vendas × Projeção viraram dois deles em
                // 2026-08-17; as rotas antigas seguem vivas como redirect.
                // Item separado = alçada separada na tela de Alçadas, que é o
                // ponto: dá para liberar Leads ao Comercial sem abrir o
                // Faturamento junto.
                pages: RELATORIOS.map((r) => ({
                    route: r.route,
                    section: r.pageTitle,
                    name: r.label,
                    icon: r.icon,
                })),
            },
            {
                key: 'conditions',
                name: 'Condições & Regras',
                icon: 'fas fa-clipboard-list',
                pages: [
                    { route: '/comercial/conditions', section: 'Fichas Comerciais', name: 'Fichas Comerciais', icon: 'fas fa-file-contract' },
                    { route: '/comercial/mcmv', section: 'MCMV', name: 'Minha Casa Minha Vida', icon: 'fas fa-house-circle-check' },
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
                name: 'Contas a Pagar',
                icon: 'fas fa-file-invoice',
                pages: [
                    { route: '/financeiro/titulos', section: 'Títulos', name: 'Títulos', icon: 'fas fa-money-bill-transfer' },
                    { route: '/financeiro/custos', section: 'Custos', name: 'Custos', icon: 'fas fa-coins' },
                ],
            },
            {
                key: 'receber',
                name: 'Contas a Receber',
                icon: 'fas fa-file-invoice-dollar',
                pages: [
                    { route: '/financeiro/consulta-cef', name: 'Consulta de nº CEF', icon: 'fas fa-hashtag' },
                    // Veio da subcategoria "Cobrança" (2026-08-25), que existia só
                    // para guardar este item. Cobrar a entrada É contas a receber.
                    // O Ato reúne as duas formas (boleto Caixa e link de cartão
                    // Userede) numa tela só; as rotas antigas
                    // /financeiro/boleto-caixa e /financeiro/link-cartao seguem
                    // redirecionando para ela, e as alçadas já migraram pelo
                    // lib/ensurePermissionRouteRenames.js. A ROTA não mudou aqui.
                    // A conciliação (recebimento AVC do Sienge x ato cobrado)
                    // é a aba Conciliação DESTA tela, não um item próprio:
                    // cobrar a entrada e conferir se ela entrou é a mesma
                    // conversa. /financeiro/recebimentos-ato virou redirect.
                    { route: '/financeiro/cobranca/ato', name: 'Ato', icon: 'fas fa-file-invoice-dollar' },
                ],
            },
        ],
    },

    // ── Ferramentas (transversais ao negócio) ──────────────────────────────────
    // Reúne num só lugar as ferramentas que antes ocupavam uma categoria de topo
    // cada (Checklists, Relatórios) + Aprovações (ex "Aprovações de Marketing",
    // generalizada em 2026-07-28) — navbar mais limpa e acessível.
    {
        key: 'ferramentas',
        label: 'Ferramentas',
        icon: 'fas fa-toolbox',
        group: 'OPERAÇÃO',
        pages: [
            // Tela única com abas internas (Painel/Checklists/Minhas Tarefas) → um só item.
            { route: '/checklists', name: 'Checklists', icon: 'fas fa-clipboard-check' },
            // "Meus relatórios" (admin cria via Eme) + "Compartilhados comigo"
            // (qualquer usuário) → NÃO é adminOnly; o gate de criação fica no builder.
            //
            // Chamava-se só "Relatórios" e colidia com a subcategoria Relatórios
            // do Comercial, que é outra coisa: lá são relatórios FIXOS de
            // negócio (Faturamento, Leads, Corretores...), aqui é o construtor
            // de relatório sob medida. Dois itens com o mesmo nome no mesmo menu
            // obrigam a abrir para descobrir qual é qual.
            { route: '/relatorios', name: 'Relatórios da Eme', icon: 'fas fa-wand-magic-sparkles', permissionManaged: false },

            { route: '/validator', section: 'Validador', name: 'Validador', icon: 'fas fa-check-double' },
            // Acompanhamento das assinaturas de aditivo (2026-09-01). É trabalho
            // de cobrança: ver quem não assinou e reenviar o link. A tela do
            // cliente é pública e mora na LP, fora do Office.
            { route: '/comercial/aditivos', section: 'Aditivos', name: 'Aditivos', icon: 'fas fa-file-signature' },
            // Veio de Comercial (2026-08-25). É ferramenta de operação: dispara
            // o cancelamento no CV e no Sienge e mostra o histórico. A ROTA não
            // mudou, só o lugar no menu, então nenhuma alçada precisa migrar.
            // Delegável desde 2026-08-19: histórico e reprocessamento vão por
            // alçada; a aba Configurações (e o processamento manual avulso, que
            // mora nela) continua só para admin.
            // Veio de Financeiro > "Operações" (2026-08-25), subcategoria que
            // existia só para guardar este item. É ferramenta de processo:
            // monta o lançamento e o empurra pelo pipeline do Sienge. A rota
            // não mudou, então nenhuma alçada migra.
            { route: '/financeiro/paymentflow', section: 'Fluxo de Pagamento', name: 'Fluxo de Pagamento', icon: 'fas fa-diagram-project' },
            // Por último de propósito: é a ferramenta que menos se abre, e a
            // única cujo efeito é destrutivo (cancela no CV e exclui contrato no
            // Sienge). Item raro e perigoso não disputa o topo da lista.
            { route: '/comercial/cancelamento-reservas', section: 'Cancelamentos', name: 'Cancelamentos', icon: 'fas fa-eraser' },
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

    // ── Assistente pessoal ─────────────────────────────────────────────────────
    // Fica em RECURSOS e sem alçada: a lista é da própria pessoa, e exigir a
    // rota na alçada criaria o absurdo de alguém não poder anotar um lembrete
    // para si mesmo.
    {
        key: 'assistente',
        label: 'Meu dia',
        icon: 'fas fa-compass',
        group: 'RECURSOS',
        // Fora da tela de Alçadas de propósito: a lista é da própria pessoa, e
        // amarrá-la a uma alçada criaria o absurdo de alguém não poder anotar
        // um lembrete para si mesmo. Mesmo desenho das preferências de
        // notificação. Sem isto a categoria só apareceria para quem tivesse a
        // rota concedida - ou seja, para ninguém.
        permissionManaged: false,
        pages: [
            { route: '/assistente', section: 'Meu dia', name: 'Meu dia', icon: 'fas fa-compass' },
        ],
    },

    // ── Microsoft (só exibido quando a integração está ativa) ──────────────────
    {
        key: 'microsoft',
        label: 'Microsoft',
        icon: 'fab fa-microsoft',
        group: 'RECURSOS',
        requiresMicrosoft: true,
        pages: [
            // Central Microsoft (2026-07-27): Agenda · Tarefas (To Do) · Reuniões
            // (Transcrições & IA). Rotas antigas viram redirect p/ ?tab=.
            { route: '/microsoft/outlook', section: 'Outlook', name: 'Outlook', icon: 'fas fa-envelope', iconImg: '/icons/ms-outlook.svg' },
            { route: '/microsoft/teams', section: 'Teams', name: 'Teams', icon: 'fas fa-people-group', iconImg: '/icons/ms-teams.svg' },
            { route: '/microsoft/sharepoint', section: 'SharePoint', name: 'SharePoint', icon: 'fas fa-folder-open', iconImg: '/icons/ms-sharepoint.svg' },
            { route: '/microsoft/planner', section: 'Planner', name: 'Planner', icon: 'fas fa-table-columns', iconImg: '/icons/ms-planner.svg' },
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

    // ── CV CRM — os cadastros que vivem no CV + a configuração da integração ──
    // Os três cadastros abaixo estavam em Comercial > Cadastros. Foram
    // reagrupados aqui porque todos são o MESMO assunto (o que existe no CV) e
    // porque agora existe uma configuração de integração que vale para os três.
    // As ROTAS não mudaram, só o lugar no menu — então nenhuma alçada muda e
    // não há renome para registrar em ensurePermissionRouteRenames.js.
    {
        key: 'cvcrm',
        label: 'CV CRM',
        // Logo do CV, a mesma já usada nas telas que apontam para lá. O `icon`
        // fica como reserva, para o caso de a imagem não carregar.
        iconImg: '/CVLogo.png',
        icon: 'fas fa-plug',
        group: 'RECURSOS',
        pages: [
            { route: '/crm/imobiliarias', section: 'Imobiliárias', name: 'Imobiliárias', icon: 'fas fa-house-flag' },
            { route: '/crm/correspondentes', section: 'Correspondentes', name: 'Correspondentes', icon: 'fas fa-people-group' },
            // Tela única com abas internas (Geral/Lançamentos/Em Obras/…) → um só item.
            { route: '/crm/buildings', name: 'Empreendimentos', icon: 'fas fa-building' },
            { route: '/crm/workflow/groups', section: 'Grupos Workflow', name: 'Grupos de Workflow', icon: 'fas fa-chart-diagram' },
            { route: '/crm/configuracoes', section: 'Configurações', name: 'Configurações', icon: 'fas fa-sliders', adminOnly: true },
            { route: '/crm/integracoes', section: 'Integrações', name: 'Integrações', icon: 'fas fa-bolt', adminOnly: true },
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
    // ── Minha conta ────────────────────────────────────────────────────────────
    // Tudo que pertence à PESSOA, e por isso aparece para todo mundo e fica
    // fora das Alçadas.
    //
    // Isto morava dentro de "Administração", e era o defeito: a categoria
    // aparecia para qualquer usuário justamente por causa destes itens, então
    // um vendedor abria "Administração" e encontrava a própria conta, os
    // próprios avisos e o botão de reportar problema. Ele não administra nada -
    // o rótulo prometia uma coisa e entregava outra.
    //
    // O critério aqui é DONO, não assunto: o que é da pessoa fica junto.
    {
        key: 'conta',
        label: 'Minha conta',
        icon: 'fas fa-circle-user',
        group: 'SISTEMA',
        permissionManaged: false,
        pages: [
            { route: '/settings/Account', section: 'Minha Conta', name: 'Minha Conta', icon: 'fas fa-user-gear', permissionManaged: false },
            { route: '/notifications', name: 'Avisos e notificações', icon: 'fas fa-bell', permissionManaged: false },
            // hiddenInNav: /mural é a caixa recortada na origem, e preferências
            // e alertas viraram seções da tela de avisos. As rotas seguem vivas
            // porque o sino, a caixa e os links levam para elas.
            { route: '/mural', name: 'Mural de Avisos', icon: 'fas fa-thumbtack', permissionManaged: false, hiddenInNav: true },
            { route: '/settings/notifications', section: 'Notificações', name: 'Notificações', icon: 'fas fa-bell', permissionManaged: false, hiddenInNav: true },
            { route: '/settings/alerts', section: 'Alertas', name: 'Alertas', icon: 'fas fa-tower-broadcast', permissionManaged: false, hiddenInNav: true },
            { route: '/report', name: 'Reportar Problema', icon: 'fas fa-bug', permissionManaged: false },
            // Instalar o app é ação pessoal, não documentação do sistema - veio
            // de "Sobre o Office" em 2026-08-25.
            { route: '/instalar', name: 'Instalar o app', icon: 'fas fa-mobile-screen-button', permissionManaged: false },
        ],
    },

    // ── Administração ──────────────────────────────────────────────────────────
    // Só o que administra o SISTEMA e os OUTROS. Sem subcategorias de propósito:
    // eram três divisões (Usuários & Acessos, Integrações & Dados, Inteligência)
    // que só faziam sentido para quem já conhecia o sistema, num lugar que se
    // abre raramente e onde se procura pelo nome do item.
    //
    // adminOnly:true            → trava de CÓDIGO, nunca delegável
    // sem flag                  → delegável pela tela de Alçadas
    {
        key: 'admin',
        label: 'Administração',
        icon: 'fas fa-user-shield',
        group: 'SISTEMA',
        pages: [
            { route: '/settings/users', section: 'Usuários', name: 'Usuários', icon: 'fas fa-users', adminOnly: true },
            // Sem adminOnly: já é delegável hoje pela tela de Alçadas, e a
            // intenção é liberá-lo. Fica aqui só enquanto isso não acontece.
            { route: '/settings/organograma', section: 'Organograma', name: 'Organograma', icon: 'fas fa-sitemap' },
            { route: '/settings/permissions', section: 'Alçadas', name: 'Alçadas', icon: 'fas fa-shield-halved', adminOnly: true },
            { route: '/settings/management', section: 'Departamentos', name: 'Departamentos', icon: 'fas fa-building-user', adminOnly: true },
            { route: '/settings/empresas', section: 'Empresas', name: 'Empresas', icon: 'fas fa-building-circle-arrow-right', adminOnly: true },
            { route: '/settings/integrity', section: 'Integridade', name: 'Integridade', icon: 'fas fa-shield-heart', adminOnly: true },
            // hiddenInNav: virou seção da tela do Mural. Continua aqui porque é
            // por este item que a delegação da gestão do mural é configurada -
            // tirá-lo tornaria a delegação impossível de encontrar.
            { route: '/mural/admin', section: 'Mural de Avisos', name: 'Gestão do Mural', icon: 'fas fa-thumbtack', hiddenInNav: true },
            { route: '/tools/bucket-upload', section: 'Looqbox', name: 'Looqbox', icon: 'fas fa-cloud-arrow-up', iconImg: '/icons/looqbox.png' },
            // Uma tela só (2026-08-31): eram "Backup Sienge" e "Envio ao ERP",
            // dois itens de menu olhando a MESMA integração por lados
            // diferentes. Viraram abas de /settings/sienge.
            { route: '/settings/sienge', section: 'Sienge', name: 'Sienge', icon: 'fas fa-database', iconImg: '/icons/sienge.png', adminOnly: true },
            { route: '/settings/docusign', section: 'DocuSign', name: 'DocuSign', icon: 'fas fa-file-signature', iconImg: '/icons/docusign.png', adminOnly: true },
            { route: '/tools/eme-brain', section: 'Cérebro da Eme', name: 'Cérebro da Eme', icon: 'fas fa-brain', adminOnly: true },
            { route: '/tools/eme-atende', section: 'Eme Atende', name: 'Eme Atende', icon: 'fas fa-headset', adminOnly: true },
        ],
    },

    {
        key: 'sobre',
        label: 'Sobre o Office',
        icon: 'fas fa-circle-info',
        group: 'SISTEMA',
        permissionManaged: false,
        pages: [
            // "Instalar o app" saiu daqui em 2026-08-25: é ação pessoal, e esta
            // categoria é documentação sobre o sistema. Foi para Minha conta.
            { route: '/sobre', name: 'Mapa do Sistema', icon: 'fas fa-diagram-project', adminOnly: true },
            { route: '/sobre/relatorio', name: 'Visão Executiva', icon: 'fas fa-file-lines', adminOnly: true },
            // Changelog do sistema (/docs). A tela já existia sem entrada no menu;
            // é o complemento natural: o mapa mostra o que existe, a visão
            // executiva explica o porquê e as atualizações mostram a evolução.
            // Changelog: não há o que limitar, então é livre para todos (a
            // categoria já é permissionManaged:false).
            { route: '/docs', name: 'Atualizações', icon: 'fas fa-code-branch' },
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
 * Remove duplicatas de rota (ex: /crm/buildings com 6 sections vira 1 entrada).
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

// ─── Visibilidade TOTAL na tela de Alçadas ────────────────────────────────────
// Todas as telas do sistema aparecem no perfil — as gerenciáveis com switch e
// estas duas listas como blocos informativos (nada fica "invisível"):

/** Telas exclusivas de admin POR CÓDIGO (adminOnly) — nunca delegáveis pela tela. */
export function getAdminOnlyPages() {
    const seen = new Set();
    const out = [];
    for (const cat of navRegistry) {
        for (const p of categoryItems(cat)) {
            if (!p.adminOnly || seen.has(p.route)) continue;
            seen.add(p.route);
            out.push({ ...p, catLabel: cat.label });
        }
    }
    return out;
}

/** Telas sempre liberadas (permissionManaged:false) — pessoais/broadcast, fora de alçada. */
export function getAlwaysFreePages() {
    const seen = new Set();
    const out = [];
    for (const cat of navRegistry) {
        const catFree = cat.permissionManaged === false;
        for (const p of categoryItems(cat)) {
            if (p.adminOnly) continue;
            if (!(catFree || p.permissionManaged === false)) continue;
            if (seen.has(p.route)) continue;
            seen.add(p.route);
            out.push({ ...p, catLabel: cat.label });
        }
    }
    return out;
}
