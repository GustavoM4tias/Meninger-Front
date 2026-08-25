/**
 * Acha import que aponta para arquivo que NÃO está no repositório.
 *
 * Este é o defeito que derruba a produção sem avisar ninguém: o arquivo existe
 * no disco de quem escreveu, então o build passa localmente e o commit sai
 * limpo. Quem clona o repo - ou o servidor que faz o deploy - recebe um
 * `ERR_MODULE_NOT_FOUND` numa rota que ninguém tocou.
 *
 * Aconteceu em 2026-08-06 e DUAS VEZES em 2026-08-23, sempre do mesmo jeito:
 * um commit levou junto arquivos editados por outra sessão, e o arquivo novo
 * que eles importavam ficou para trás.
 *
 * Por isso ele lê a ÁRVORE COMMITADA (`git ls-files`), nunca a pasta local.
 * Olhar o disco é justamente o que esconde o problema.
 *
 * Rodar:  node _design/imports-pendurados.mjs
 * Sai com 1 se achar algum, para caber em hook de pre-push ou CI.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(AQUI, '..');

/* Duas formas de apontar para outro arquivo, e as DUAS enganam do mesmo jeito:
     · `@/...`  alias de `src/` (ver vite.config)
     · `./...`  vizinho de pasta

   O relativo ficou de fora deste detector até 25/08/2026, com o argumento de
   que "o bundler quebra local antes de virar commit". Não quebra: se o vizinho
   existe no disco de quem escreveu, o build passa e o commit sai limpo - que é
   exatamente o defeito. Naquele dia, 11 das 15 bombas encontradas eram
   relativas, todas invisíveis para cá. */
const ALIAS = /(?:from|import)\s*\(?\s*['"]@\/([^'"]+)['"]/g;
const RELATIVO = /(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g;
const SUFIXOS = ['', '.js', '.vue', '.mjs', '.ts', '/index.js', '/index.vue'];

function versionados() {
    const saida = execFileSync('git', ['-C', RAIZ, 'ls-files', 'src'], { encoding: 'utf8' });
    return saida.split('\n').filter(Boolean);
}

/* O conteúdo também vem do git, não do disco: um arquivo pode estar
   versionado E ter mudanças locais que ninguém commitou ainda. */
function conteudoNoGit(rel) {
    try {
        return execFileSync('git', ['-C', RAIZ, 'show', `HEAD:${rel}`], { encoding: 'utf8' });
    } catch {
        return null;   // versionado mas ainda não em HEAD (staged)
    }
}

const arquivos = versionados();
const existe = new Set(arquivos);
const resolve = (alvo) => SUFIXOS.some((s) => existe.has(`${alvo}${s}`));

/* Só interessa import de ARQUIVO NOSSO. Pacote do npm não passa por aqui
   (não casa nem com `@/` nem com `./`), e extensão que o bundler trata como
   asset (css, svg, png) também mora no repo, então continua valendo. */
function alvoRelativo(deOndeRel, spec) {
    const base = path.posix.dirname(deOndeRel.split(path.sep).join('/'));
    return path.posix.normalize(path.posix.join(base, spec));
}

let achados = 0;
for (const rel of arquivos) {
    if (!/\.(vue|js|mjs|ts)$/.test(rel)) continue;
    const fonte = conteudoNoGit(rel);
    if (fonte == null) continue;

    for (const m of fonte.matchAll(ALIAS)) {
        if (resolve(`src/${m[1]}`)) continue;
        achados++;
        console.log(`${rel}`);
        console.log(`   importa @/${m[1]}, que não está no repositório`);
    }

    for (const m of fonte.matchAll(RELATIVO)) {
        const alvo = alvoRelativo(rel, m[1]);
        if (resolve(alvo)) continue;
        const noDisco = SUFIXOS.some((s) => fs.existsSync(path.join(RAIZ, alvo + s)));
        achados++;
        console.log(`${rel}`);
        console.log(noDisco
            ? `   importa ${m[1]}, que existe na SUA máquina mas não está no repositório`
            : `   importa ${m[1]}, que não existe em lugar nenhum`);
    }
}

console.log(achados
    ? `\n${achados} import(s) pendurado(s). O build passa em quem tem o arquivo no disco e quebra em todo mundo mais.`
    : 'Nenhum import pendurado: tudo que o repositório importa, o repositório tem.');
process.exit(achados ? 1 : 0);
