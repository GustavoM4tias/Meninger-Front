# Receita de tela - o padrão do Pré-Cadastros, pronto para copiar

Companheiro do `DESIGN-LANGUAGE.md`. Aquele diz **por que**; este diz **como**,
com o código da tela que serviu de piloto.

Referência viva: `src/views/Office/Comercial/Precadastros/Index.vue`
(464 linhas, score 39 -> 98). Quando este documento e aquela tela discordarem,
a tela está certa - ela é a que roda.

---

## 0. Antes de escrever qualquer linha

Três decisões, nesta ordem. Errar aqui custa a tela inteira depois.

1. **Qual arquétipo?** Painel, Detalhe, Operação, Configuração ou Ferramenta
   (`DESIGN-LANGUAGE.md`). Define de qual largura você parte.
2. **Qual é O assunto da tela?** Um só. Se você precisa de dois desenhos do
   mesmo dado (uma página com resumo + um modal com a lista), um dos dois está
   sobrando - e no Pré-Cadastros o que sobrava era a página.
3. **O que dá para apagar?** A migração do Pré-Cadastros foi 2.142 -> 992
   linhas e 6 -> 2 componentes. O ganho maior não veio de trocar classe por
   token; veio de deletar telas paralelas.

> **Regra do piloto:** ranking, funil e gráfico de composição que a tabela já
> mostra ordenando a coluna são redundância. Saíram 10 gráficos e 3 rankings da
> tela e ninguém sentiu falta.

---

## 1. O esqueleto obrigatório

Toda tela, sem exceção:

```vue
<PageContainer size="full">
  <PageHeader title="..." subtitle="..." icon="fas fa-...">
    <template #title>
      <span>...</span>
      <Favorite :router="'/rota/da/tela'" :section="'Nome na navegação'" />
    </template>
    <template #actions>
      <Button size="sm" variant="secondary" icon="fas fa-download" @click="...">
        <span class="hidden sm:inline">Exportar</span>
      </Button>
      <PageHelp storage-key="..." title="Como usar ..." intro="..."
                :steps="[...]" :tips="[...]" />
    </template>
  </PageHeader>
  ...
</PageContainer>
```

Detalhes que sempre esquecem:

- **`subtitle` responde "o que é isso"** em uma frase de usuário, não o nome da
  tabela do banco.
- **Rótulo de botão some no celular** (`hidden sm:inline`), o ícone fica. É o
  que mantém a barra de ações usável em 375px sem perder a ação.
- **`PageHelp` é obrigatório** e é o item que mais falta no Office (26 de 69
  telas tinham). Escreva `steps` orientados a tarefa ("Clique num cartão para
  recortar"), e `tips` para o que não é óbvio (cor da etapa, scroll de 50 em 50,
  filtro gravado na URL).
- **`Favorite`** vai dentro do slot `#title`, com a rota real.

---

## 2. Os quatro blocos, nesta ordem

```
FiltersBar      fechada, selo de "N ativos"
StatRow         os KPIs; clicar recorta a lista
linha de estado "412 de 1.076 pastas · período · [só aprovadas x]"
DataTable       ordenável, 50 em 50 no scroll
```

Essa ordem não é estética: o filtro é meio, não assunto, então ele fica fechado
para o número nascer acima da dobra no celular.

### 2.1 Filtros

Use `components/UI/FilterBar.vue` em tela nova. Ele já traz altura fixa (a
página não pula quando o selo aparece), começa fechado e emite `apply`/`clear`:

```vue
<FilterBar :active-count="n" :loading="loading" @apply="buscar" @clear="limpar">
  <Input label="Nome" v-model="f.nome" />
  <Select label="Empreendimento" v-model="f.emp" :options="opts" />
</FilterBar>
```

> O Pré-Cadastros ainda tem um `FiltersBar.vue` próprio (predata o primitivo).
> Ele usa as mesmas classes `.filters-toolbar` e o mesmo comportamento, mas
> **não copie o arquivo**: em tela nova use o primitivo.

Duas regras que vieram do piloto:

- **`activeCount` conta dimensões preenchidas, não valores.** Três
  empreendimentos selecionados são 1 filtro ativo, não 3.
- **Filtro vive na URL.** `syncFiltersFromUrl` no `onMounted` e
  `syncUrlFromFilters` no buscar. Serializa array como CSV, booleano só quando
  `true`, string só quando não vazia. É o que permite mandar o link já filtrado
  - e é um recurso, não um detalhe: entra no `PageHelp`.

### 2.2 KPIs que filtram

```vue
<StatRow :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 5 }"
         selectable :active-key="recorte" @select="aoClicarKpi" />
```

Cada item é um objeto de `StatCard`:

```js
{ key: 'aprov', label: 'Aprovação',
  raw: pct * 100, format: (v) => `${v.toFixed(1)}%`, decimals: 1,
  hint: `${aprov} de ${total}`,
  icon: 'fas fa-check-double', tone: 'pos',
  series: serieAprov, sparkMode: 'line',
  delta: variacao(serieAprov),
  tooltip: 'Clique para ver só as aprovadas' }
```

As quatro regras do cartão:

1. **`raw` + `format`, nunca `value` pronto.** É o que liga a contagem
   (`useCountUp`). Com uma casa decimal, passe `decimals: 1`, senão o último
   quadro dá um pulinho.
2. **Clicar recorta a TABELA, não os cartões.** Se o número do cartão também
   mudasse, clicar em "Aprovação" levaria a 100% e a leitura perderia o sentido.
   Os cartões descrevem o período; a tabela mostra o recorte.
3. **O mesmo gesto liga e desliga**, e o cartão "Total" sempre volta ao conjunto
   inteiro:
   ```js
   recorte.value = (item.key === 'total' || recorte.value === item.key) ? '' : item.key;
   ```
4. **`tone` é semântica, não decoração:** `pos`/`neg`/`warn` para estado do
   dado, `accent` para o total, `1..8` para entidade. Nunca escolha por gosto.

**Série e variação sem inventar contexto.** O filtro define um recorte de datas,
então não existe "período anterior". O piloto usa 12 baldes ao longo do próprio
período e compara a **segunda metade contra a primeira**, com o rótulo dizendo
isso em português. `variacao()` devolve `null` com menos de 4 pontos ou variação
abaixo de 0,05% - selo de variação sobre ruído é pior que selo nenhum. E o
`good` é separado de `dir`: inadimplência subindo é seta para cima com cor de
negativo.

### 2.3 Linha de estado

Uma linha de `text-xs text-ink-muted` entre os cartões e a tabela, dizendo o que
está na tabela agora: `N de M registros`, o período em mono tabular, e o chip do
recorte ativo com o "x" que desliga. É o que impede a pessoa de olhar uma lista
recortada achando que é o total.

### 2.4 Tabela

```vue
<DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="id"
           manual-sort clickable density="compact"
           v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
           more-label="Ver mais campos"
           empty-title="Nenhum pré-cadastro encontrado"
           empty-text="Ajuste os filtros ou o recorte para ver resultados."
           @row-click="abrirDetalhe">
  <template #cell-valor="{ row }">...</template>
  <template #actions="{ row }">...</template>
</DataTable>
```

- **Toda coluna declara `priority`.** 1 vira título do card no celular, 2 vira
  corpo, 3 vai para "Ver mais campos". Prioridade decide **ordem de aparição**,
  nunca o que existe.
- **`manual-sort` é obrigatório com scroll incremental.** A tabela recebe a
  lista já fatiada; sem isso ela ordenaria só as 50 que recebeu. A ordem certa é
  sempre **filtrar -> ordenar -> fatiar**.
- **Ordenação com `localeCompare(..., 'pt-BR', { numeric: true, sensitivity: 'base' })`**
  e nulo/`'-'` sempre no fim, nas duas direções.
- **`#actions` com `@click.stop`**, senão a ação da linha também abre o detalhe.
- Coluna de dinheiro usa `.metric`; contagem usa `tabular-nums`.

### 2.5 Scroll incremental, nunca paginação

```js
const inc = useIncrementalList(ordenada, { step: 50 });
```

```vue
<div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
     class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
  <Spinner size="sm" />
  carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
</div>
```

O gatilho dispara 400px antes do fim e o composable ainda confere se a sentinela
continua visível depois de crescer. **Diga quantos faltam** no texto do gatilho:
é o que substitui a informação que a paginação dava de graça.

---

## 3. Carga, erro e vazio - os três estados que ninguém escreve

O piloto trata os três em `v-if / v-else-if / v-else`, e é isso que separa 79 de
98 no score:

```vue
<div v-if="error" class="... border-data-neg/25 bg-data-neg/10 text-data-neg ...">
  <i class="fas fa-circle-exclamation"></i><span>{{ error }}</span>
  <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="buscar()">
    Tentar novamente
  </Button>
</div>

<div v-else-if="loading" class="space-y-4">
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
    <Skeleton v-for="i in 5" :key="i" variant="stat" />
  </div>
  <Skeleton variant="table" :lines="8" />
</div>

<div v-else class="space-y-4"> ... </div>
```

- **Esqueleto na forma exata do conteúdo** (`variant="stat"` na quantidade certa
  de cartões, `variant="table"`), nunca Spinner no meio da tela: o layout não
  pode pular quando o dado chega.
- **Erro diz o que houve e oferece a saída** ("Tentar novamente"), em token
  `data-neg`, nunca `text-red-500`.
- **Vazio** vem embutido no `DataTable` via `empty-title`/`empty-text`, e o
  texto sugere a ação ("Ajuste os filtros").

---

## 4. Detalhe do registro

Modal, e o modal é para chegar no **registro** - a visão agregada mora na
página, sempre visível. Tamanho por propósito: `xl` para o registro, `screen`
quando o modal é ele próprio uma listagem. No celular qualquer tamanho vira tela
cheia (o `Modal` já faz isso sozinho).

---

## 5. Cor, texto e toque - o que reprova na revisão

- **Zero cor fixa.** Nada de `bg-white`, `text-gray-*`, `border-slate-*`, hex.
  Só `surface-*`, `ink-*`, `line-*`, `accent*`, `series-1..8`, `data-pos/neg/warn`.
- **Classe montada em runtime não existe.** O Tailwind varre o texto do arquivo,
  então `bg-series-${n}` não gera CSS. Escreva o mapa por extenso, como o
  `StatCard` faz.
- **Piso de 11px** (`text-micro`). `text-[10px]` e menores estão proibidos.
- **Alvo clicável >= 40px** (`h-10`). `h-7`/`h-8` só para selo e ícone.
- **`<div @click>` não existe:** é `<button>`, ou leva `role`, `tabindex` e
  `.focus-ring`.
- **Cor de entidade segue a entidade**, não a posição no filtro. Se a tela tem
  um `stages.js` (ou equivalente), o bucket define a cor e a etapa herda em duas
  intensidades - forte quando o resultado saiu, suave quando está em andamento.

---

## 6. A ordem de execução que funcionou

1. Ler a tela inteira e listar **o que sai**. Comece pelo corte, não pela
   pintura.
2. Montar o esqueleto (`PageContainer` + `PageHeader` + `PageHelp`) com o
   conteúdo antigo dentro, ainda feio. Build passando.
3. Trocar filtro por `FilterBar` + sincronizar com a URL.
4. Trocar os cartões por `StatRow`/`StatCard` com `raw`+`format`, série e delta.
5. Trocar a tabela por `DataTable` com `priority`, `manual-sort` e
   `useIncrementalList`.
6. Ligar o recorte pelo KPI e escrever a linha de estado.
7. Apagar os componentes órfãos. **Apagar de verdade**, não deixar comentado.
8. Escrever o `PageHelp` por último, quando a tela já se comporta.
9. `npx vite build`, 375px e 1440px, claro e escuro.
10. Marcar a linha em `ui-checklist.md` e rodar
    `node _design/mapscreens.mjs .. && node _design/gen-checklist.mjs ..`.

---

## 7. Aceite

Os 12 itens do `DESIGN-LANGUAGE.md`, mais os cinco que o piloto acrescentou:

13. Os três estados (carga, erro, vazio) existem e o erro tem saída.
14. Filtro gravado na URL, e isso está dito no `PageHelp`.
15. Listagem longa com `useIncrementalList`, com o texto de "faltam N".
16. Se há KPI clicável: recorta a lista, não os cartões; clicar de novo desliga;
    e a linha de estado mostra o recorte em vigor.
17. Nenhum componente órfão sobrou no diretório da tela.
