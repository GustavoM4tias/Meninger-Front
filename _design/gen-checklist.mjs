/** Gera o checklist markdown a partir do ui-map.json. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Ancorado no PROPRIO arquivo, nao no diretorio de onde se chama. Antes era
   `process.argv[2]`, entao rodar da raiz do front em vez de dentro de
   `_design/` apontava para a pasta errada, o script morria - e quem tinha
   silenciado a saida ficava lendo o mapa da semana passada achando que era
   o de agora. O argumento continua valendo, para poder apontar outro repo. */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(AQUI, '..');
const OUT = path.join(ROOT, '_design');
fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui-map.json'), 'utf8'));
const screens = map.screens;

fs.writeFileSync(path.join(OUT, 'ui-map.json'), JSON.stringify(map, null, 2));
try { fs.unlinkSync(path.join(ROOT, 'ui-map.json')); } catch { }

const ORDEM = ['Painel', 'Detalhe', 'Operação', 'Configuração', 'Ferramenta', 'Especial'];

/* De qual largura a tela é PROJETADA primeiro. Não é exclusividade: toda tela
   funciona por inteiro nas duas (ver "Paridade" no DESIGN-LANGUAGE.md).
   Análise (ler dado) parte do celular; execução (fazer) parte do monitor. */
const DEVICE = {
  'Painel':       { d: 'parte do MÓVEL',   who: 'mais usada por diretoria e lideranças' },
  'Detalhe':      { d: 'parte do MÓVEL',   who: 'mais usada por diretoria e lideranças' },
  'Operação':     { d: 'parte do DESKTOP', who: 'mais usada por analistas e administrativo' },
  'Configuração': { d: 'parte do DESKTOP', who: 'mais usada por administradores' },
  'Ferramenta':   { d: 'parte do DESKTOP', who: 'mais usada por analistas e administrativo' },
  'Especial':     { d: 'caso a caso',      who: 'todos' },
};
const scored = screens.filter((s) => s.score !== null);

/* onda: pelo score e pelo peso da tela */
function onda(s) {
  if (s.score === null) return 'E';
  if (s.score < 55) return '1';
  if (s.score < 75) return '2';
  if (s.score < 95) return '3';
  return '4';
}

function flags(s) {
  const f = [];
  if (!s.pageContainer) f.push('sem container');
  if (!s.pageHeader) f.push('sem header');
  if (!s.pageHelp) f.push('sem help');
  if (s.totalHardcoded) f.push(`${s.totalHardcoded} cor fixa`);
  if (s.totalTiny) f.push(`${s.totalTiny} texto micro`);
  if (s.totalCharts) f.push(`${s.totalCharts} gráfico`);
  if (s.totalTables && !s.tableMobile) f.push(`${s.totalTables} tabela sem mobile`);
  else if (s.totalTables) f.push(`${s.totalTables} tabela`);
  if (s.handModal) f.push(`${s.handModal} modal na mão`);
  return f.join(', ') || 'ok';
}

let md = `# Checklist de padronização visual - Menin Office

Gerado por \`_design/mapscreens.mjs\` em ${map.generated}. Para atualizar os números depois de
mexer nas telas, rode de novo e o checklist se refaz.

- **${scored.length}** telas pontuadas (+ ${screens.length - scored.length} especiais fora do score)
- **Score médio: ${Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length)}/100**
- Score = esqueleto (50) + tokens (25) + tipografia (15) + tabela mobile (10) + gráfico com tema (10)

## Como marcar

Cada tela tem uma linha. Marque \`[x]\` quando ela passar nos 12 itens do checklist de aceite
em \`DESIGN-LANGUAGE.md\`: esqueleto completo, zero cor fixa, texto >= 11px, **paridade entre
375px e 1440px** (nada de ação só no monitor, nada de coluna estreita no meio da tela grande),
tabela com prioridade por coluna e ordenação nas duas larguras, gráfico com \`useChartTheme\`,
carga com \`Skeleton\`, alvo de toque >= 40px e PageHelp escrito.

---

`;

/* ── Ondas ───────────────────────────────────────────────────────────────────── */
const ondas = {
  '1': { t: 'Onda 1 - Reconstrução', d: 'Score abaixo de 55. Fora do esqueleto ou com dívida grande de cor. Cada uma é uma tarefa própria.' },
  '2': { t: 'Onda 2 - Alinhamento', d: 'Score 55 a 74. Estrutura existe, falta token, help ou plano mobile.' },
  '3': { t: 'Onda 3 - Acabamento', d: 'Score 75 a 94. Perto do padrão; falta gráfico com tema, help ou detalhe de tabela.' },
  '4': { t: 'Onda 4 - Manutenção', d: 'Score 95+. Já são referência. Só revalidar depois que os primitivos novos existirem.' },
  'E': { t: 'Especiais', d: 'Não seguem o esqueleto de página por natureza (login, shell, home da Eme, instalação). Avaliadas à mão.' },
};

for (const k of ['1', '2', '3', '4', 'E']) {
  const list = screens.filter((s) => onda(s) === k);
  if (!list.length) continue;
  md += `## ${ondas[k].t}  \`${list.length} telas\`\n\n${ondas[k].d}\n\n`;
  for (const a of ORDEM) {
    const sub = list.filter((s) => s.archetype === a).sort((x, y) => (x.score ?? 0) - (y.score ?? 0));
    if (!sub.length) continue;
    md += `### ${a} · ${DEVICE[a].d} <sub>(${DEVICE[a].who})</sub>\n\n`;
    for (const s of sub) {
      const rota = s.routes[0] ? `\`/${s.routes[0].replace(/^\//, '')}\`` : '';
      const sc = s.score === null ? '--' : String(s.score).padStart(3);
      md += `- [ ] **${s.name || path.basename(path.dirname(s.file))}** ${rota} · \`${sc}\`\n`;
      md += `      <sub>${s.file} · ${s.totalLines}L${s.kids.length ? ` (+${s.kids.length} comp.)` : ''} · ${flags(s)}</sub>\n`;
    }
    md += '\n';
  }
}

/* ── Fundação ────────────────────────────────────────────────────────────────── */
md += `---

## Onda 0 - Fundação (antes das telas)

Sem isso, migrar tela é retrabalho. Nenhum item muda aparência sozinho.

- [x] \`tailwind.config.js\`: \`text-micro\` (piso de 11px) e \`text-metric\` em 4 tamanhos; cores \`series-1..8\` e \`data-*\`
- [x] \`main.css\`: tokens de dado nos 2 temas, escada de elevação (\`.panel\`, \`.panel-focus\`), \`.metric\`, \`prefers-reduced-motion\` global e correção do dark (A13)
- [x] \`composables/useChartTheme.js\`: eixo, grade, tooltip, legenda e paleta de série reativos ao tema
- [x] \`components/UI/StatCard.vue\` + \`StatRow.vue\`: KPI único (faixa rolável no estreito, grade no largo, delta, sparkline, stagger)
- [x] \`components/UI/Skeleton.vue\`: variantes text, title, stat, card, row, table, chart, circle
- [x] \`components/UI/DataTable.vue\`: prioridade por coluna, card no estreito, ordenação nas duas larguras, carga e vazio embutidos
- [x] \`components/UI/FilterBar.vue\`: consolida \`.filters-toolbar\` com altura fixa e selo de ativos
- [x] \`components/UI/Panel.vue\`: bloco de conteúdo com cabeçalho, ação no canto, carga e vazio
- [x] \`components/UI/Sparkline.vue\`: mini série em SVG (barras ou linha), ponta destacada
- [x] Remover \`chart.js\`, \`vue-chart-3\`, \`preline\`, \`@panzoom\` do package.json (+ lock sincronizado)
- [x] Apagar \`components/UI/Card.vue\` (0 importações)
- [ ] \`components/UI/ActionBar.vue\`: barra de ação em massa para seleção em tabela (fica fixa no rodapé no estreito)
- [ ] Avaliar tirar PrimeVue/Aura e Flowbite do carregamento global do \`main.js\` (1 arquivo usa cada um)

## Onda 5 - Varreduras mecânicas (no fim)

Depois que os substitutos existirem, a troca é buscar e trocar.

- [ ] \`text-[9px]\` e menores -> \`text-micro\` (35 ocorrências em views/Office)
- [ ] \`text-[10px]\` -> \`text-micro\` (997 em views/Office, 157 em components)
- [ ] \`shadow-sm\` -> \`shadow-soft\`; \`shadow-2xl\` -> \`shadow-overlay\` (293 no total)
- [ ] Combinação de card escrita à mão -> \`.surface-card\` (114 arquivos, 167 ocorrências)
- [ ] \`<div @click>\` -> \`<button>\` ou \`role\`+\`tabindex\`+\`.focus-ring\` (37 ocorrências)
- [ ] 26 modais artesanais -> \`<Modal>\`
- [ ] Academy (3.888 cores fixas): decidir se entra no padrão ou mantém identidade própria
`;

fs.writeFileSync(path.join(OUT, 'ui-checklist.md'), md);
console.log('OK ->', path.join(OUT, 'ui-checklist.md'));
console.log('telas por onda:', JSON.stringify(['1', '2', '3', '4', 'E'].reduce((a, k) => (a[k] = screens.filter((s) => onda(s) === k).length, a), {})));
