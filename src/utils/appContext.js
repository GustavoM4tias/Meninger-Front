// src/utils/appContext.js
//
// Detecção de contexto (Academy vs Office) e navegação entre os dois apps.
// Academy e Office são o MESMO build; o que muda é o host (produção) ou a
// env VITE_APP_CONTEXT (dev). Este helper centraliza isso para funcionar
// igual em PRODUÇÃO e em LOCAL — sem URLs de produção hard-coded espalhadas.

const PROD_ACADEMY = 'https://academy.menin.com.br';
const PROD_OFFICE = 'https://office.menin.com.br';

function envContext() {
    return String(import.meta.env.VITE_APP_CONTEXT || '').toLowerCase();
}

/** Está rodando em ambiente local de desenvolvimento? */
export function isLocalEnv() {
    const h = String(window.location.hostname || '').toLowerCase();
    return h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1';
}

/** A app está rodando no contexto Academy? (host academy.* ou env). */
export function isAcademyContext() {
    const ctx = envContext();
    if (ctx === 'academy') return true;
    if (ctx === 'office') return false;
    const host = String(window.location.host || '').toLowerCase();
    return host === 'academy.menin.com.br' || host.startsWith('academy.');
}

/**
 * URL para abrir o app ACADEMY num path.
 * - Produção  → https://academy.menin.com.br{path}
 * - Local c/ env academy → mesma origem (o app já é Academy)
 * - Local sem env → academy.localhost mantendo a porta atual
 */
export function academyUrl(path = '/panel') {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (!isLocalEnv()) return `${PROD_ACADEMY}${p}`;
    if (envContext() === 'academy') return `${window.location.origin}${p}`;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${window.location.protocol}//academy.localhost${port}${p}`;
}

/**
 * URL para abrir o app OFFICE num path.
 * - Produção  → https://office.menin.com.br{path}
 * - Local     → mesmo host sem o prefixo "academy.", mantendo a porta
 */
export function officeUrl(path = '/') {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (!isLocalEnv()) return `${PROD_OFFICE}${p}`;
    if (envContext() === 'office') return `${window.location.origin}${p}`;
    const host = String(window.location.host || '').replace(/^academy\./, '');
    return `${window.location.protocol}//${host}${p}`;
}
