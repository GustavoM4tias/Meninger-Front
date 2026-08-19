// scripts/gen-og-routes.mjs
//
// Gera, a partir do navRegistry.js (fonte única de verdade da navegação):
//   • src/config/ogRoutes.generated.js — mapa rota → tela/categoria, usado pelo
//     middleware.js para montar o preview de compartilhamento certo
//   • scripts/categorias.txt — lista de categorias, lida pelo gen-assets.ps1
//     que desenha um card de compartilhamento por categoria
//
// Por que passar pelo esbuild em vez de dar import direto: o navRegistry importa
// de @/views/..., e esse import pode apontar pra pasta ainda não versionada.
// Aqui qualquer import que não resolva (ou que seja .vue) vira stub vazio, então
// a geração nunca quebra por arquivo faltando.
//
// Roda sozinho no `npm run build` (via prebuild) e NUNCA derruba o build: se
// algo falhar, mantém os arquivos já commitados e sai com código 0.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const NL = String.fromCharCode(10);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROUTES = path.join(root, 'src', 'config', 'ogRoutes.generated.js');
const OUT_CATS = path.join(root, 'scripts', 'categorias.txt');

const slug = (v) => String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const stubMissing = {
    name: 'stub-missing',
    setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => {
            // Componente de tela não interessa: só queremos os metadados do
            // registry. Stubar evita depender do plugin do Vue.
            if (args.path.endsWith('.vue')) return { path: args.path, namespace: 'stub' };
            const base = path.join(root, 'src', args.path.slice(2));
            for (const ext of ['', '.js', '.mjs', '.ts', '/index.js']) {
                if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
                    return { path: base + ext };
                }
            }
            return { path: args.path, namespace: 'stub' };
        });
        build.onResolve({ filter: /\.vue$/ }, (args) => ({ path: args.path, namespace: 'stub' }));
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: 'export const RELATORIOS = []; export default {};',
            loader: 'js',
        }));
    },
};

async function main() {
    const bundle = await esbuild.build({
        entryPoints: [path.join(root, 'src', 'config', 'navRegistry.js')],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'neutral',
        plugins: [stubMissing],
        logLevel: 'silent',
    });

    const code = bundle.outputFiles[0].text;
    const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    const registry = mod.navRegistry;
    if (!Array.isArray(registry)) throw new Error('navRegistry não veio como array');

    const routes = {};
    const add = (route, name, category, group, subcategory) => {
        if (!route || !name) return;
        const key = String(route).toLowerCase().replace(/\/+$/, '') || '/';
        // Primeira ocorrência vence: a mesma rota pode aparecer em mais de um
        // ponto do menu e a primeira é a canônica.
        if (routes[key]) return;
        routes[key] = { name, category, group: group || null, subcategory: subcategory || null };
    };

    for (const cat of registry) {
        const category = cat.label || cat.key;
        for (const p of cat.pages || []) add(p.route, p.name, category, cat.group);
        for (const sub of cat.subcategories || []) {
            for (const p of sub.pages || []) add(p.route, p.name, category, cat.group, sub.name);
        }
    }

    const count = Object.keys(routes).length;
    if (!count) throw new Error('nenhuma rota extraída');

    const header = [
        '// GERADO AUTOMATICAMENTE — não edite à mão.',
        '// Origem: src/config/navRegistry.js  |  Gerador: scripts/gen-og-routes.mjs',
        '// Regenerar: npm run og:routes (também roda sozinho no prebuild).',
        '//',
        '// Usado só pelo middleware.js, para montar o preview de compartilhamento por',
        '// rota. Contém apenas NOMES DE TELA — nunca dado de negócio.',
        '',
        '',
    ].join(NL);

    fs.writeFileSync(
        OUT_ROUTES,
        header + 'export const OG_ROUTES = ' + JSON.stringify(routes, null, 2) + ';' + NL,
        'utf8'
    );

    const cats = new Map();
    for (const r of Object.values(routes)) if (r.category) cats.set(slug(r.category), r.category);
    fs.writeFileSync(
        OUT_CATS,
        Array.from(cats).map(([s, c]) => s + '|' + c).join(NL) + NL,
        'utf8'
    );

    console.log('[og-routes] ' + count + ' rotas e ' + cats.size + ' categorias gravadas');
}

main().catch((err) => {
    console.warn('[og-routes] geração falhou, mantendo os arquivos existentes:', err?.message || err);
    process.exit(0); // nunca derruba o build
});
