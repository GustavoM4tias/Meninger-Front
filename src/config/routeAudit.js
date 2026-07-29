// config/routeAudit.js
//
// Auditoria de PONTAS SOLTAS do front: cruza TODAS as rotas reais do
// office.routes.js com o navRegistry e classifica cada uma. Exibida na tela
// /settings/integrity (seção "Rotas do front"), para o mapa estar disponível
// a qualquer momento — rota nova fora do padrão acende sozinha.
//
// Classes:
//   publica     — sem requiresAuth (login, callbacks, /r/<token>)
//   admin       — meta requiresAdmin/adminOnly/allowedRole:'admin' OU
//                 adminOnly no navRegistry (guard bloqueia não-admin)
//   gerenciada  — coberta pelas Alçadas (allManagedRoutes, com herança de prefixo)
//   livre       — sempre liberada por decisão (permissionManaged:false,
//                 pessoais/broadcast) ou allowlist intencional abaixo
//   PONTA SOLTA — autenticada mas sem classificação nenhuma → corrigir!

import officeRoutes from '@/router/office.routes.js';
import { navRegistry, allManagedRoutes, categoryItems } from '@/config/navRegistry.js';

// Rotas intencionalmente livres FORA da navbar — cada uma com o motivo.
// Adicionar aqui exige justificativa; sem entrada, a rota acende PONTA SOLTA.
const INTENTIONAL_FREE = {
    '/': 'Home do sistema',
    '/settings/account': 'Conta do próprio usuário',
    '/report': 'Reportar problema (suporte do próprio usuário)',
    '/docs': 'Documentação interna do sistema (link direto)',
    '/notifications': 'Histórico de notificações do próprio usuário (aberto pelo sino)',
    '/microsoft/inperson/recording': 'Fluxo interno de gravação da Central Microsoft',
};

const norm = (p) => String(p || '').toLowerCase();

function joinPath(base, path) {
    if (!path) return base || '/';
    if (path.startsWith('/')) return path;
    return (base === '/' ? '' : base) + '/' + path;
}

function walkRoutes(routes, base = '', inherited = {}) {
    const out = [];
    for (const r of routes) {
        const meta = { ...inherited, ...(r.meta || {}) };
        const path = joinPath(base, r.path);
        if (r.redirect) continue;
        if (r.component) out.push({ path, meta });
        if (r.children) out.push(...walkRoutes(r.children, path, meta));
    }
    return out;
}

export function runRouteAudit() {
    const routes = walkRoutes(officeRoutes);

    const regPages = [];
    for (const cat of navRegistry) {
        const catFree = cat.permissionManaged === false;
        for (const p of categoryItems(cat)) {
            regPages.push({ ...p, catFree });
        }
    }
    const adminRoutes = regPages.filter(p => p.adminOnly).map(p => norm(p.route));
    const freeRoutes = regPages
        .filter(p => !p.adminOnly && (p.catFree || p.permissionManaged === false))
        .map(p => norm(p.route));
    const managed = allManagedRoutes.map(norm);
    const intentional = Object.keys(INTENTIONAL_FREE).map(norm);

    const matchesPrefix = (p, list) => list.some(m => p === m || p.startsWith(m + '/'));

    const rows = [];
    for (const r of routes) {
        const p = norm(r.path);
        let cls;
        if (!r.meta.requiresAuth) cls = 'publica';
        else if (r.meta.requiresAdmin || r.meta.adminOnly || r.meta.allowedRole === 'admin'
            || matchesPrefix(p, adminRoutes)) cls = 'admin';
        else if (matchesPrefix(p, freeRoutes) || matchesPrefix(p, intentional)) cls = 'livre';
        else if (matchesPrefix(p, managed)) cls = 'gerenciada';
        else cls = 'ponta_solta';
        rows.push({
            path: r.path,
            cls,
            reason: cls === 'livre' ? (INTENTIONAL_FREE[p] || 'permissionManaged:false no navRegistry') : null,
        });
    }

    // Reverso: entrada do navRegistry sem rota correspondente = link morto no menu.
    const routePaths = routes.map(r => norm(r.path));
    const deadLinks = [];
    for (const p of regPages) {
        const t = norm(p.route);
        if (!routePaths.some(rp => rp === t || rp.startsWith(t + '/'))) deadLinks.push(p.route);
    }

    const loose = rows.filter(r => r.cls === 'ponta_solta');
    return {
        rows: rows.sort((a, b) => a.path.localeCompare(b.path)),
        counts: rows.reduce((acc, r) => { acc[r.cls] = (acc[r.cls] || 0) + 1; return acc; }, {}),
        loose,
        deadLinks,
        healthy: loose.length === 0 && deadLinks.length === 0,
    };
}

export default { runRouteAudit };
