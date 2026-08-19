/* eslint-env serviceworker */
/**
 * Service worker do Menin Office.
 *
 * Escrito à mão de propósito: o precache automático do Workbox guardaria o
 * bundle inteiro (há chunk de ~2,9 MB) e abre a porta pro problema clássico de
 * servir um index.html velho apontando pra chunk que já não existe mais.
 * Aqui a navegação é SEMPRE network-first, então o usuário nunca fica preso
 * numa versão antiga; o cache só entra quando ele está offline.
 *
 * Responsabilidades:
 *   1. tornar o app instalável (o Chrome exige um handler de fetch)
 *   2. acelerar recarga guardando os assets versionados do build
 *   3. receber push e abrir a tela certa no clique
 *
 * Como desligar tudo em caso de emergência: troque o conteúdo deste arquivo por
 *   self.addEventListener('install', () => self.skipWaiting());
 *   self.addEventListener('activate', () => self.registration.unregister());
 * e faça deploy. O navegador revalida /sw.js a cada navegação (ver o header
 * Cache-Control no vercel.json), então os clientes se desregistram sozinhos.
 */

const VERSION = 'v1';
const ASSET_CACHE = `office-assets-${VERSION}`;
const DOC_CACHE = `office-doc-${VERSION}`;
const DOC_FALLBACK = '/index.html';

// ─── ciclo de vida ────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
    // Versão nova assume na hora. Como a navegação é network-first, não há risco
    // de mistura de versões: o próximo carregamento já vem inteiro do servidor.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys.filter(k => k !== ASSET_CACHE && k !== DOC_CACHE).map(k => caches.delete(k))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ─── fetch ────────────────────────────────────────────────────────────────────

async function cacheFirst(request) {
    const cache = await caches.open(ASSET_CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
}

async function networkFirstDoc(request) {
    const cache = await caches.open(DOC_CACHE);
    try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(DOC_FALLBACK, res.clone());
        return res;
    } catch (err) {
        const hit = await cache.match(DOC_FALLBACK);
        if (hit) return hit;
        return new Response(
            '<meta charset="utf-8"><body style="font-family:system-ui;padding:2rem;text-align:center">' +
            '<h1>Sem conexão</h1><p>Reconecte para usar o Office.</p></body>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); } catch { return; }

    // Outra origem (API no Railway, CDNs de fonte/ícone) passa direto.
    if (url.origin !== self.location.origin) return;
    // Nunca cachear API — o Office é multi-alçada, cache aqui vaza dado entre telas.
    if (url.pathname.startsWith('/api')) return;

    // Assets do build têm hash no nome: imutáveis, cache-first é seguro.
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(cacheFirst(req));
        return;
    }

    if (req.mode === 'navigate') {
        event.respondWith(networkFirstDoc(req));
    }
});

// ─── push ─────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }

    const title = payload.title || 'Menin Office';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: payload.tag || undefined,
        renotify: !!payload.tag,
        timestamp: payload.timestamp || Date.now(),
        requireInteraction: !!payload.requireInteraction,
        data: {
            link: payload.link || '/',
            notificationId: payload.notificationId || null,
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/';
    const target = new URL(link, self.location.origin).href;

    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        // Se o Office já está aberto, reaproveita a janela em vez de abrir outra.
        for (const client of clientList) {
            if (new URL(client.url).origin === self.location.origin) {
                await client.focus();
                if ('navigate' in client) { try { await client.navigate(target); } catch {} }
                return;
            }
        }
        await self.clients.openWindow(target);
    })());
});
