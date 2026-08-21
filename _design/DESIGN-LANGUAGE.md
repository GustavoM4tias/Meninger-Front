# Painel & Bancada

**A linguagem visual do Menin Office.** Fonte da verdade. Se o código e este
documento discordarem, o documento está certo e o código está atrasado.

---

## O problema que ele resolve

O Office é duas coisas ao mesmo tempo, e é isso que dificultava padronizar:

| | **Painel** | **Bancada** |
|---|---|---|
| Serve para | ler um número e decidir | fazer o trabalho |
| Quem usa mais | diretoria e lideranças | analistas e administrativo |
| Projeta-se a partir do | **celular** | **desktop** |
| Sessão típica | 40 segundos, em pé | 40 minutos, sentado |
| O que pede da tela | responder rápido | não atrapalhar |
| Erra quando | o número está pequeno ou escondido | falta um campo, sobra um clique |

**Toda tela é uma das duas.** É a primeira decisão, antes de qualquer layout.

---

## Paridade: a regra que vem antes de todas

**Dispositivo define prioridade de projeto, nunca capacidade.**

Painel não é "tela de celular" e Bancada não é "tela de computador". As duas
funcionam por inteiro nos dois. O que muda é de qual largura você **parte** e
qual arranjo é o **padrão** - não o que dá para fazer.

Na prática, três obrigações:

1. **Nada é exclusivo de um dispositivo.** Se um campo, coluna, filtro, ação,
   exportação ou atalho existe no monitor, ele é alcançável no celular. Pode
   estar a um toque de distância (dentro de "Ver detalhes", de um menu, de um
   drawer), mas existe. Esconder não é adaptar.

2. **Mobile-first não pode desperdiçar o desktop.** Uma coluna de 375px
   centralizada num monitor de 1920px é tão errada quanto uma tabela que
   estoura o celular. Todo Painel tem arranjo largo: a faixa de KPI vira grade,
   o gráfico ganha altura, a tabela mostra mais colunas, o filtro fica aberto.

3. **A adaptação é reorganização, não amputação.** Tabela vira card, grade vira
   faixa rolável, coluna de menor prioridade entra numa gaveta, ação de linha
   vira menu. Em nenhum caso o dado ou a ação some.

Uma tela que tenta ser Painel e Bancada ao mesmo tempo vira as duas mal feitas.
Quando o caso pedir mesmo, o Painel fica em cima (a síntese) e a Bancada embaixo
(a execução), e no estreito a Bancada começa recolhida - recolhida, não ausente.

---

## Os cinco arquétipos

Cada tela do Office cai em um destes. O arquétipo define de onde você parte, o
esqueleto e o que é obrigatório. Todos funcionam por inteiro nas duas larguras.

### 1. Painel · parte do `MÓVEL`
Ler o estado do negócio. `StatRow` no topo, gráfico depois, tabela por último
(ou nenhuma). O número é o herói: `text-metric` ou maior.

- A primeira dobra em 375px mostra **os KPIs**, não filtro nem tabela.
- Filtro começa recolhido no estreito, aberto no largo.
- Gráfico com altura mínima e legenda embaixo. Nunca eixo duplo.
- Tabela, se houver, é resumo; o detalhe é outra tela.

**No largo:** a faixa de KPI vira grade (`StatRow :cols`), o gráfico ganha
altura e ocupa a coluna maior, a tabela de resumo mostra as colunas de
prioridade 3, o filtro fica aberto. Nada de coluna estreita centralizada.

### 2. Detalhe · parte do `MÓVEL`
Um registro por inteiro. Cabeçalho com identidade e estado, blocos de campo em
uma coluna no estreito e duas ou três no largo, ações fixas no rodapé no
celular.

**No largo:** duas colunas com os blocos secundários numa coluna lateral, e as
ações sobem para o `PageHeader` em vez de ficarem no rodapé.

### 3. Operação · parte do `DESKTOP`
Trabalhar em lote. `FilterBar` + `DataTable` + ações. Densidade `compact`,
cabeçalho fixo, ordenação, seleção múltipla.

- Toda coluna declara `priority`. Ela decide a **ordem de aparição** no
  estreito, nunca o que existe.
- Ação destrutiva pede confirmação e nunca fica ao lado da ação comum.

**No estreito:** cada linha vira card, prioridade 1 no título, prioridade 2 no
corpo, prioridade 3 dentro de "Ver detalhes". Ordenar continua disponível pelo
seletor que o `DataTable` mostra no lugar do cabeçalho. Ação de linha continua
no card. Seleção múltipla vira barra de ação fixa no rodapé.

### 4. Configuração · parte do `DESKTOP`
Mudar como o sistema se comporta. Um `Panel` por assunto, campo à esquerda e
explicação à direita, salvar por bloco.

- **Toda regra de negócio nasce aqui, não no código.** Constante só como
  fallback, e o painel sempre ganha do código.
- Todo campo diz o que acontece quando muda, em português de usuário.

**No estreito:** campo e explicação empilham (explicação abaixo do rótulo, não
escondida atrás de um ícone), e o salvar do bloco vira barra fixa quando há
alteração pendente. Nenhuma configuração fica inacessível pelo celular.

### 5. Ferramenta · parte do `DESKTOP`
Um fluxo com começo, meio e fim (importar, gerar, conciliar). Passo visível,
estado do passo, resultado ao final.

**No estreito:** os passos viram um stepper horizontal compacto no topo com um
passo por vez na tela; nunca um passo é pulado ou bloqueado por largura.

---

## Onde gastar atenção

O sistema precisa chamar atenção **para o dado**, não para a decoração. A regra
é gastar a força em um lugar só e manter tudo em volta quieto.

**O número é o elemento mais forte de qualquer tela.** Escala própria
(`text-metric` 28px, `-lg` 36px, `-xl` 48px), tabular, tracking negativo. Tudo
em volta dele é discreto de propósito: rótulo em `text-micro` mono maiúsculo,
contexto em `text-xs` apagado.

**A escada de elevação dá presença, não a sombra.** Quatro degraus, nesta
ordem, e nunca um quinto:

```
chão       bg-surface           fundo da página
painel     .panel               bloco de conteúdo (o degrau padrão)
foco       .panel-focus         bloco clicável ou em destaque
flutuante  shadow-overlay       modal, dropdown, flyout
```

O que dá profundidade é a **diferença** entre eles. Sombra forte em tudo achata.

---

## Movimento

**Movimento é confirmação de que o dado chegou**, não enfeite. Se você conseguir
tirar a animação e ninguém entender menos, ela não deveria estar lá.

### Uma curva, três durações

Tudo usa `ease-out-expo` (`cubic-bezier(.16,1,.3,1)`). A única exceção é o
"pouso" com overshoot curto dos selos (`animate-pop-in`).

```
duration-120   resposta de controle   hover, foco, toque
duration-200   mudança de estado      abrir, fechar, selecionar
duration-420   entrada de conteúdo    card, linha, gráfico
```

### A sequência de chegada de um Painel

A tela não aparece de uma vez. Ela **monta**, e cada etapa confirma a anterior:

```
0 ms     esqueleto na forma exata do conteúdo (Skeleton)
0-420    KPIs entram escalonados, 32 ms entre cada um (.card-enter / .stagger-in)
0-850    o número CONTA até o valor (useCountUp), em cor de acento
420      o selo de variação pousa com overshoot curto (animate-pop-in)
620      a sparkline termina de se desenhar e a ponta aparece
480-1500 as barras do gráfico sobem da base, 26 ms entre cada ponto
850      o número assenta na cor final
```

O efeito é de dado chegando, não de tela carregando. E é honesto: cada peça
aparece quando o dado dela existe.

### O catálogo

| Onde | O quê |
|---|---|
| Lista, KPI, linha de tabela | `.stagger-in` com `--i`; satura em 12 itens |
| Número | `useCountUp` + `.metric-counting` enquanto conta |
| Selo, badge, ponta de série | `animate-pop-in` |
| Sparkline em linha | `animate-draw` (`pathLength="1"`) |
| Sparkline em barras | `animate-grow` da base, escalonado |
| Bloco de gráfico | `.chart-enter` |
| Séries do ECharts | vem de graça nas fábricas `t.bar/line/area/donut` |
| Dado que atualiza sozinho | `.live-dot` (o único laço infinito permitido) |

Em lista longa, escalone só o início (a tabela para na linha 24, o card no
celular para na 16). Ninguém vê a linha 300 chegar, e animar 500 nós custa caro.

### Limites

- **Nada em laço infinito**, exceto `.live-dot` e onde o dado realmente atualiza
  sozinho. Movimento perpétuo cansa e some do radar.
- **Movimento é preso ao elemento.** Nada atrás do conteúdo, nada cobrindo a
  tela.
- **Tudo desliga sob `prefers-reduced-motion`.** A regra global do `main.css`
  cobre CSS; o ECharts é canvas e não escuta CSS, então `useChartTheme` faz a
  checagem em JS e devolve `animation: false`.

### Proibido

**Camada de cor translúcida sobre área larga.** Aurora, blob borrado, gradiente
girando atrás do conteúdo, input semitransparente com `backdrop-blur`. Levanta o
preto no tema escuro e achata o contraste. Já falhou três vezes aqui. Se precisar
de vida, prenda ao elemento: glow na borda, pulse no selo, hover, contagem.

---

## Cor

### Interface
Só token semântico. **Nenhum** `bg-white`, `bg-slate-*`, `text-gray-*` como cor
de layout: é a causa nº 1 de tela quebrada no escuro.

```
superfície  bg-surface · surface-raised · surface-sunken · surface-overlay
texto       text-ink · ink-muted · ink-subtle · ink-inverted
borda       border-line · line-strong · line-subtle
ação        accent · accent-hover · accent-soft · accent-ring
```

O azul de acento é **da interface**: botão, link, foco, rota ativa. Não é
identidade de dado.

### Dado
Paleta separada, e é ela que faz a tela ser legível de relance.

**Série categórica, 8 slots, ordem fixa.** A cor segue a **entidade**, nunca a
posição no filtro: filtrar não pode repintar quem sobrou.

| slot | entidade | claro | escuro |
|---|---|---|---|
| 1 | azul | `#2563EB` | `#4A8DF7` |
| 2 | âmbar | `#D97706` | `#BF8420` |
| 3 | turquesa | `#0D9488` | `#12A895` |
| 4 | violeta | `#7C3AED` | `#8B5CF6` |
| 5 | rosa | `#DB2777` | `#E14D97` |
| 6 | terracota | `#9A3412` | `#CE5A2A` |
| 7 | ciano | `#0891B2` | `#0DA3C9` |
| 8 | oliva | `#4D7C0F` | `#71A62B` |

Validada nos dois temas: banda de luminância, piso de croma, contraste >= 3:1
contra a superfície e separação para daltonismo (pior par adjacente ΔE 12.5,
alvo 8). O escuro **não é inversão do claro**: são passos próprios da mesma
matiz.

**Nunca cicle.** A 9ª série vira "Outros", vira gráficos separados ou o corte
está errado.

**Marca e área usam tons diferentes.** A cor que é certa num traço de 2px fica
pesada cobrindo 30% da largura da tela - é o que deixa um tema claro "forte
demais". Então:

| | token | onde |
|---|---|---|
| marca | `series-N` | traço, ponto, ícone, texto: forte, para ser visto pequeno |
| área | `series-N-soft` | barra, faixa do funil, fatia larga: um tom mais leve |

No claro o tom de área é mais claro que a marca; no escuro é mais fundo (cor
cheia sobre quase-preto brilha e cansa). O contraste menor do tom de área é
proposital: a régua de 3:1 vale para marca pequena, e o que importa numa barra
empilhada é a separação **entre** as faixas, que continua validada.

**Estado do dado, reservado.** `data-pos`, `data-neg`, `data-warn`,
`data-neutral`. Nunca viram "série 4". Sempre com ícone ou rótulo junto, nunca
cor sozinha.

Na variação, **a seta diz a direção e a cor diz se é bom** - não são a mesma
coisa: inadimplência subindo é seta para cima com cor de negativo.

---

## Tipografia

**Piso de 11px (`text-micro`).** A diretoria lê no celular; abaixo disso não se
lê sem zoom, e zoom em tabela é onde o usuário desiste. `text-[10px]`,
`text-[9px]` e menores estão proibidos.

```
text-micro    11px   rótulo, selo, legenda            (o piso)
text-xs       12px   texto de apoio, célula densa
text-sm       14px   corpo, campo, célula normal
text-base     16px   texto corrido
text-metric*  20-48  número                            (.metric, tabular)
```

Título de tela vem do `PageHeader`. Título de bloco é `text-sm font-semibold`.
Rótulo de métrica e cabeçalho de coluna usam `.metric-label` (mono, maiúscula,
`text-micro`).

Hífen, nunca travessão.

---

## Toque e foco

- Alvo clicável com no mínimo **40px** de altura (`h-10`). `h-7` e `h-8` só para
  selo e ícone decorativo, nunca para o que se clica no celular.
- `<div @click>` não existe: é `<button>`, ou leva `role`, `tabindex` e
  `.focus-ring`.
- Todo elemento interativo tem foco visível.

---

## Modal

**Tamanho por propósito, nunca por gosto.**

| | Para quê |
|---|---|
| `sm` `md` | confirmar, formulário curto |
| `lg` `xl` | formulário longo, detalhe de um registro |
| `full` | detalhe largo (até 1400px) |
| `screen` | **listagem de registros**: toma a tela inteira |

`screen` é o padrão de toda listagem. Quando o modal existe para ler muitas
linhas, cartão flutuando no meio da tela é desperdício de área: ele sobrepõe
tudo, sem borda e sem canto, e a lista fica com o espaço inteiro.

**No celular, qualquer tamanho vira tela cheia.** Cartão de 90% de largura com
canto arredondado em 375px só rouba altura.

**`screen` respeita a nav, e acompanha o movimento dela.** Não cobre a barra de
cima nem a sidebar: a pessoa continua vendo onde está e consegue sair
navegando, em vez de ficar presa numa camada que engoliu a tela. Como a sidebar
recolhe e expande, o modal desliza junto.

A nav publica as próprias medidas em CSS vars no `<html>`:

```
--nav-topbar-h    4rem no celular, 3rem no desktop
--nav-sidebar-w   0 no celular (lá é overlay), 3.5rem no rail, 18rem expandida
```

Qualquer camada teleportada para o `<body>` posiciona com
`left: var(--nav-sidebar-w, 0px)` e ganha o acompanhamento de graça, sem
precisar conhecer o estado interno da nav. **Use as vars; não leia o estado da
sidebar.**

### Camadas

Ordem fixa. Quem inventar um número fora dela quebra alguma das outras.

```
conteúdo da página   auto
ActionBar            10     barra da seleção, flutua sobre o conteúdo
modal `screen`       20     cobre a página, NÃO a nav
nav                  30-60  backdrop, sidebar, topbar, flyout
diálogo              9999   bloqueia tudo, inclusive a nav
```

`screen` fica **abaixo** da nav porque ele já não a cobre: se ficasse na frente,
a sidebar abriria por trás dele e o menu responderia ao clique sem aparecer.
Diálogo fica acima de tudo de propósito - uma confirmação precisa barrar a
navegação, senão a pessoa sai no meio da decisão.

### Anatomia de um modal de listagem

Só a lista rola. Todo controle fica fixo:

```
cabeçalho ──────────────── fixo
toolbar + filtros ──────── fixo
busca + itens por página ─ fixo
lista ─────────────────── ROLA
paginação ─────────────── fixo
```

Busca que rola junto com 100 linhas some quando mais se precisa dela, e
paginação no fim do scroll é o mesmo que não ter paginação. Para a coluna
ocupar a altura toda, o modal vai com `:padded="false"` e o conteúdo controla o
próprio respiro - margem negativa para cancelar padding estraga o `h-full`.

**O modal é para chegar no REGISTRO.** A visão agregada mora na página, sempre
visível. Modal que troca a lista por um gráfico esconde em vez de mostrar.

### Filtro dentro do modal: UM caminho, não dois

**Um só painel de filtros**, atrás do botão "Filtros", com selo de "N ativos" -
o mesmo padrão do `FilterBar` da página.

Nada de busca livre ao lado dele. Dois campos de filtro lado a lado fazem
hesitar ("digito aqui ou abro ali?") e cobrem a mesma necessidade por caminhos
diferentes. O painel ganha porque é explícito sobre **por qual dimensão** se
está filtrando.

### A listagem é sempre `DataTable`

Mesmo dentro de modal. Lista de cartões não ordena, e sem ordenar não se acha
nada numa listagem longa. `DataTable` já traz ordenação por coluna, prioridade
por coluna (no celular vira card sem perder campo) e expansão da linha.

Duas props existem para o caso da listagem grande:

- **`expandable` + slot `#expanded`**: a linha abre ali mesmo com o registro
  inteiro. Continua sendo a tabela, com as colunas e a ordenação valendo - não
  é outra tela.
- **`manual-sort`**: a tabela mostra os controles de ordenação e avisa quando
  mudam, mas quem ordena é a tela. **Obrigatório quando a lista chega fatiada**
  (scroll incremental) ou já ordenada pelo servidor: sem isso a tabela ordenaria
  só o pedaço que recebeu, e ordenar 50 de 1.000 é pior que não ordenar.

A ordem correta é sempre: **filtrar → ordenar → fatiar**.

### Listagem longa: scroll incremental, não paginação

`useIncrementalList(lista, { step: 50, root })`. A lista cresce de 50 em 50
conforme se rola. **Sem paginação e sem seletor de itens por página.**

Paginar obriga a decidir "quantos por página" e depois caçar o registro entre
páginas; rolar é o gesto natural e não pede decisão nenhuma. O passo de 50 é
deliberado: mil linhas de uma vez travam o aparelho, passos pequenos demais
fazem a rolagem engasgar.

Duas garantias de que a lista carrega inteira:

- o gatilho dispara **400px antes** do fim, então o bloco seguinte já está
  montado quando a pessoa chega no rodapé;
- depois de cada passo, se o gatilho **ainda estiver visível** (o bloco não
  encheu a tela), o próximo carrega na hora - sem isso a lista para no meio e
  parece que acabou.

Trocar o filtro volta ao primeiro passo: seguir renderizando 500 itens de um
resultado que mudou é trabalho jogado fora.

---

## Os primitivos

Não recrie nenhum destes. Se faltar uma variante, adicione ao primitivo.

| Componente | Para quê |
|---|---|
| `PageContainer` / `PageHeader` / `PageHelp` | esqueleto obrigatório de toda tela |
| `StatRow` / `StatCard` | linha de KPI (faixa rolável no celular, delta, sparkline) |
| `Panel` | bloco de conteúdo, com carga e vazio embutidos |
| `DataTable` | tabela com prioridade por coluna e card no estreito |
| `FilterBar` | barra de filtros com selo de ativos e altura fixa |
| `Skeleton` | carga que não joga o layout fora |
| `Modal` | `screen` para listagem; tela cheia no celular em qualquer tamanho |
| `usePagination` | 100/200/300/500, escolha gravada |
| `EmptyState` | vazio com uma ação sugerida |
| `Button` / `IconButton` / `Input` / `Select` / `Switch` / `Badge` | controles |
| `useChartTheme()` | eixo, grade, tooltip e paleta de série |

Card escrito à mão (`bg-surface-raised border border-line rounded-xl shadow-soft`)
vira `.panel`. Clicável vira `.panel-focus`.

### `Panel` × `Surface` (decidido em 2026-08-20)

Os dois existem e fazem coisas parecidas. A regra:

- **`Panel` é o bloco de conteúdo do sistema.** Tem cabeçalho, ação no canto,
  carga e vazio embutidos. É o que se usa quando o bloco TEM UM ASSUNTO.
- **`Surface` é só uma superfície** com padding e variante. Serve para agrupar
  visualmente algo que não tem título nem estado.

Tela nova nasce em `Panel`. Tela migrada troca `Surface` por `Panel` no mesmo
passo em que é migrada - **nunca numa varredura à parte**.

> **Dívida registrada:** 54 arquivos usam `Surface` e 3 usam `Panel`. A troca em
> massa NÃO está autorizada e não deve entrar de carona em outra tarefa: mexe em
> tela que ninguém revisou. Cada tela troca quando for a vez dela.

---

## Gráficos

Uma biblioteca só: **ECharts**. Não introduza a segunda.

```js
const t = useChartTheme();
const option = computed(() => ({
  ...t.base.value,                       // tipografia + animação
  grid: t.grid.value,
  tooltip: t.tooltip.value,
  legend: t.legend.value,                // sempre, com 2+ séries
  xAxis: { type: 'category', data: labels.value, ...t.axisCategory.value },
  yAxis: { type: 'value', ...t.axisValue.value },
  series: [
    t.bar(1, { name: 'Vendas', data: vendas.value }),
    t.line(3, { name: 'Meta', data: meta.value }),
  ],
}));
```

**As fábricas de marca são o que padroniza o gráfico.** `t.bar`, `t.line`,
`t.area` e `t.donut` já trazem espaçamento, arredondamento, realce e movimento
prontos. Nenhuma tela escreve `itemStyle`, `barMaxWidth` ou `animationDelay` de
novo. Qualquer chave extra passa direto para o ECharts, então dá para ajustar um
caso sem sair do padrão.

| | Padrão |
|---|---|
| Barra | ponta de 5px ancorada na base, largura máxima 34px, folga de 28% entre categorias |
| Barra empilhada | raio 2px e respiro de 2px na cor da superfície entre segmentos |
| Linha | traço de 2px com ponta redonda, sem bolinha em repouso, bolinha de 8px no hover |
| Área | a cor da série esmaecendo de 22% a 2%; só para uma série principal |
| Rosca | furo de 62%, respiro de 1,5° entre fatias, canto de 6px, número no centro |
| Grade | `containLabel` ligado, para o rótulo nunca ser cortado no celular |
| Eixo | linha de base sim, moldura não, grade tracejada quase invisível |
| Ponteiro | faixa cobrindo a categoria (`axisPointerBand`), porque no toque 1px não se acerta |

**As regras que não se negociam:**

- **Zero hex escrito na tela.** Cor de série vem de `t.color(n)` ou da fábrica.
- **Um eixo só.** Duas medidas de escala diferente = dois gráficos, ou índice
  numa base comum. Eixo duplo é o erro nº 1 de gráfico.
- Sequencial (magnitude) = uma matiz, claro para escuro. Divergente (polaridade)
  = duas matizes com cinza no meio. Nunca arco-íris.
- Com 2 ou mais séries, **legenda sempre presente**; até 4, rotule direto no
  gráfico. Identidade nunca depende só de cor.
- Rótulo e valor em cor de **texto**, nunca na cor da série.
- Tooltip por padrão. É gráfico em tela, não figura impressa.
- Altura mínima garantida: gráfico não pode colapsar no estreito. Legenda embaixo
  para poder quebrar em linhas sem comer a altura do desenho.

---

## Sessão e acesso

**Negar acesso e encerrar a sessão são coisas diferentes.** Vale para o sistema
inteiro, não para uma tela.

O guard do router e as stores de autenticação precisam separar dois "não":

```
não tem direito      o servidor avaliou e negou (401/403, ou alçada confirmada)
                     → nega e, quando for o caso, desloga

não deu para avaliar o servidor não respondeu (rede, restart, timeout)
                     → nega o acesso, MAS mantém a sessão
```

Tratar os dois igual apaga a credencial de quem estava perfeitamente logado. Foi
o que acontecia até 2026-08-20: qualquer F5 durante um restart da API mandava a
pessoa para o `/login`, e para ADMIN em qualquer tela - o cache de permissão
guarda lista de rotas vazia e `isAdmin` nunca volta do cache, de propósito.

Três obrigações:

1. **O erro precisa dizer se houve resposta.** `fetch` que falha por rede e
   resposta 401 não podem chegar iguais em quem trata: por isso `getUserInfo`
   anexa `err.status`, e quem não tem `status` é falha de rede.
2. **Dado de cache não sustenta negativa.** O `permissionStore` marca a `origem`
   (`servidor` / `cache` / `nenhuma`); só `servidor` autoriza negar de verdade.
3. **Fail-closed continua valendo.** Não avaliar nunca vira "deixa passar": a
   porta fica fechada, a pessoa vai para a home, e a sessão se recupera sozinha
   quando a API responde. O portão de verdade é o backend, não o guard.

---

## Checklist de aceite

Uma tela só está pronta quando passa nos doze:

1. `PageContainer` + `PageHeader` + `PageHelp` escrito em português de usuário
2. Zero cor fixa; só token semântico
3. Nenhum texto abaixo de 11px
4. Testada em **375px e em 1440px**, tema claro **e** escuro
5. **Paridade**: toda ação, campo, coluna e exportação do largo é alcançável no
   estreito, e o largo não fica com uma coluna estreita no meio da tela
6. Alvo de toque >= 40px; nada clicável sem foco visível
7. Tabela com `priority` por coluna, e ordenação disponível nas duas larguras
8. Gráfico com `useChartTheme`, legenda e um eixo só
9. Carga com `Skeleton` na forma do conteúdo; vazio com `EmptyState`
10. Erro diz o que deu errado e o que fazer
11. Nada de camada translúcida sobre área larga
12. `vite build` passa

Depois de passar, marque a linha da tela em `ui-checklist.md` e rode
`node _design/mapscreens.mjs .. && node _design/gen-checklist.mjs ..` para o
score se atualizar.
