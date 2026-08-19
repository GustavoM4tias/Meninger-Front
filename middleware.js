// middleware.js — Vercel Edge Middleware
//
// Preview de compartilhamento por rota. O Office é uma SPA: o robô do WhatsApp,
// do Teams e do LinkedIn não executa JavaScript, então sem isso todo link do
// sistema compartilha com o mesmo título genérico.
//
// ─── Por que só os robôs passam por aqui ──────────────────────────────────────
// Navegador de gente NUNCA é tocado: se o User-Agent não estiver na lista de
// crawlers, o middleware devolve next() e a requisição segue exatamente como
// hoje. Assim um erro aqui não tem como quebrar o app para o usuário. Qualquer
// exceção também cai em next().
//
// ─── O que pode aparecer no preview ───────────────────────────────────────────
// SÓ NOME DE TELA. O preview é público: quem tem o link lê o texto sem estar
// logado. Nada de valor, cliente, número ou qualquer dado de negócio.
//
// O mapa vem do navRegistry via scripts/gen-og-routes.mjs, então tela nova no
// registry ganha preview sozinha.

import { next } from '@vercel/edge';
import { OG_ROUTES } from './src/config/ogRoutes.generated.js';

export const config = {
    // Fora: assets do build, arquivos com extensão (imagens, manifest, sw.js).
    matcher: ['/((?!assets/|.*\.[a-zA-Z0-9]+$).*)'],
};

const ORIGIN = 'https://office.menin.com.br';
const SITE = 'Menin Office';
const TAGLINE = 'Sistema de gestão da Menin Engenharia';

// Lista fechada de propósito. Nada de /bot|crawler/ genérico: um falso positivo
// entregaria a página-resumo para uma pessoa de verdade.
const CRAWLERS = [
    'facebookexternalhit',
    'whatsapp',
    'twitterbot',
    'slackbot',
    'slack-imgproxy',
    'linkedinbot',
    'telegrambot',
    'discordbot',
    'skypeuripreview',
    'microsoftpreview',
    'msteams',
    'googlebot',
    'bingbot',
    'applebot',
    'redditbot',
    'embedly',
    'iframely',
    'vkshare',
    'pinterest',
];

function isCrawler(ua) {
    const s = (ua || '').toLowerCase();
    return CRAWLERS.some(c => s.includes(c));
}

// Rotas públicas ou fora do navRegistry. Texto sempre neutro: um relatório
// compartilhado não pode revelar de que se trata antes do login.
const EXTRA = {
    '/login': { name: 'Entrar', category: null },
    '/instalar': { name: 'Instalar o app', category: null },
    '/mural': { name: 'Mural de Avisos', category: 'Comunicação' },
    '/r': { name: 'Relatório compartilhado', category: null },
};

function lookup(pathname) {
    const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (clean === '/') return null;

    if (OG_ROUTES[clean]) return OG_ROUTES[clean];
    if (EXTRA[clean]) return EXTRA[clean];

    // Rota com parâmetro (/comercial/reservas/123, /r/<token>): sobe até achar
    // o pai conhecido, sem nunca usar o parâmetro no texto.
    const parts = clean.split('/').filter(Boolean);
    for (let i = parts.length - 1; i > 0; i--) {
        const parent = '/' + parts.slice(0, i).join('/');
        if (OG_ROUTES[parent]) return OG_ROUTES[parent];
        if (EXTRA[parent]) return EXTRA[parent];
    }
    return null;
}

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slug(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildMeta(pathname) {
    const hit = lookup(pathname);

    if (!hit) {
        return { title: SITE, description: TAGLINE, image: `${ORIGIN}/og-image.png` };
    }

    const trail = [hit.category, hit.subcategory].filter(Boolean).join(' › ');
    const title = trail ? `${hit.name} · ${trail} | ${SITE}` : `${hit.name} | ${SITE}`;
    const description = hit.category
        ? `Tela de ${hit.name}, em ${hit.category}, no ${SITE}.`
        : `${hit.name} no ${SITE}.`;

    // Imagem por categoria, gerada no build (public/og-<categoria>.png). Quando
    // a categoria não tem imagem própria, cai na genérica.
    const image = hit.category
        ? `${ORIGIN}/og-${slug(hit.category)}.png`
        : `${ORIGIN}/og-image.png`;

    return { title, description, image };
}

function page(url, meta) {
    const target = esc(url);
    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${target}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${target}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:image:secure_url" content="${esc(meta.image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(meta.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(meta.image)}">
</head>
<body>
<h1>${esc(meta.title)}</h1>
<p>${esc(meta.description)}</p>
<p><a href="${target}">Abrir no Menin Office</a></p>
<script>location.replace(${JSON.stringify(url)});</script>
</body>
</html>`;
}

export default function middleware(request) {
    try {
        if (!isCrawler(request.headers.get('user-agent'))) return next();

        const url = new URL(request.url);

        // Cinto e suspensório: o matcher já exclui caminho com extensão, mas se
        // ele mudar e /og-image.png cair aqui, o crawler receberia HTML no lugar
        // do PNG e o preview ficaria sem imagem. Deixa passar.
        if (/\.[a-zA-Z0-9]+$/.test(url.pathname)) return next();

        const meta = buildMeta(url.pathname);

        return new Response(page(url.href, meta), {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                // Cache curto: o preview atualiza junto com o deploy sem virar
                // o problema de cache eterno que o WhatsApp já cria sozinho.
                'Cache-Control': 'public, max-age=300, s-maxage=300',
                'X-Robots-Tag': 'noindex',
            },
        });
    } catch {
        // Middleware nunca pode derrubar o site.
        return next();
    }
}
