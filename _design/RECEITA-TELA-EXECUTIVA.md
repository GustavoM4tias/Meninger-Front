# Receita de tela executiva

> **Status: aprovada e implementada em 2026-08-20.** Irmã da `RECEITA-DE-TELA.md`,
> que vale para listagem/relatório e **não serve aqui**. Piloto: Gestão de
> Alçadas (`/settings/permissions`).

Companheiro do `DESIGN-LANGUAGE.md`. Referência viva:
`src/views/Office/Settings/Permissions/` - `Index.vue` (a casca e a aba
Usuários), `RouteMatrix.vue` (as três camadas), `ScreensTab.vue` (a aba Telas).

Blocos são `Panel`, nunca `Surface` (ver a decisão no `DESIGN-LANGUAGE.md`).

---

## 1. Quando esta receita vale (e quando não)

A receita de listagem parte de uma pergunta: *"como estão os números?"*. Ela
monta filtro -> KPI -> tabela porque o objetivo é **medir**.

Tela executiva parte de outra: *"o que eu preciso mudar, e em quem?"*.

**O teste:** a tela administra **sujeitos** (pessoas, perfis, telas, integrações)
em vez de mostrar registros? O efeito de salvar recai sobre **outra pessoa**?
Então é executiva.

| | Listagem / relatório | **Executiva** |
|---|---|---|
| Pergunta | como estão os números | o que eu mudo, e em quem |
| Objeto | registros | **sujeitos** |
| Herói da tela | o número | **o sujeito e o efeito** |
| Sucesso | achei o dado | mudei com segurança e sei o que causei |
| Erro típico | dado escondido | mudei sem entender o alcance |

**A consequência que organiza tudo:** quem sofre a mudança não é quem está
mexendo. Daí saem as quatro obrigações da seção 3.

Não confundir com **Configuração** (`DESIGN-LANGUAGE.md`), que muda *valores do
sistema* num formulário por assunto. Executiva muda *quem pode o quê*, e tem
sempre uma lista de sujeitos no meio do caminho.

---

## 2. O esqueleto

```
PageHeader                          [ação global] [Como usar]
Barra de pendências                 filas de trabalho, clicáveis
Seletor de sujeito                  Usuários | Perfis | Telas
┌─────── Mestre ────────┬──────────── Detalhe ─────────────┐
│ busca                 │ identidade + estado efetivo      │
│ lista de sujeitos     │ blocos de decisão                │
│ selo de pendência     │ cada um dizendo o que causa      │
└───────────────────────┴──────────────────────────────────┘
ActionBar (fixa)   "3 alterações pendentes · Descartar · Salvar"
```

O que substitui o quê:

| Listagem | Executiva | Por quê |
|---|---|---|
| `FilterBar` | **busca no mestre** | o filtro é o próprio sujeito; painel de filtros para 30 pessoas é cerimônia |
| `StatRow` de KPI | **barra de pendências** | o número não é medida do negócio, é **fila de trabalho** |
| linha de estado | **linha de efeito** | "11 telas efetivas · 2 exceções · perfil Padrão - Comercial" |
| `DataTable` | **mestre-detalhe** | não se varre nem se ordena gente; escolhe-se uma e trabalha nela |
| modal de registro | **o painel de detalhe** | o registro já é a tela |

### A barra de pendências reusa `StatRow`, com três amarras

Sem componente novo. `StatRow` + `StatCard` já fazem grade, faixa rolável no
estreito e recorte por clique (`selectable` + `activeKey`). Mudam as regras:

- **`value`, nunca `raw` + `format`.** É o que desliga o count-up: número contando
  é comemoração de medida, e "15 usuários sem perfil" não é para comemorar.
- **Sem `series` e sem `delta`.** Fila não tem tendência.
- **Clicar recorta o MESTRE**, não a tela inteira - mesmo gesto do KPI da
  listagem: clicar de novo desliga, e o cartão de total volta ao conjunto todo.
- **Todo cartão é acionável.** Fila que não leva ao trabalho é enfeite: se não dá
  para clicar e resolver, não entra na barra.

Exemplos de fila (não de medida): sem perfil · sem liberação de dados · com
exceção individual · telas travadas · políticas órfãs.

### O mestre

- Busca no topo, sempre visível.
- Cada linha: identidade (`UserAvatar`), nome, e **um selo do estado** - nunca só
  o nome. Se o sujeito está pendente, o selo diz qual pendência.
- Seleção marcada com `.panel-focus`; a linha selecionada continua visível ao
  rolar (o mestre é `lg:sticky`).
- Lista longa: `useIncrementalList`, mesmo passo de 50.

### O detalhe

Blocos de decisão empilhados, cada um com título e **uma frase do que ele
causa** em português de usuário. O primeiro bloco é sempre a identidade e o
estado efetivo - a pessoa precisa saber onde está antes de mexer.

---

## 3. As quatro obrigações da tela executiva

São a razão de a receita existir. Valem para qualquer tela deste tipo.

### 3.1 O efeito aparece antes de salvar

Toda alteração que atinge outra pessoa mostra o resultado **antes** do salvar:
"11 telas efetivas -> 14". Sem isso a pessoa salva no escuro e descobre o efeito
pelo chamado de suporte.

### 3.2 Estado em três camadas, nunca binário

Um switch ligado/desligado esconde de onde vem o acesso. O estado é sempre
legível em três camadas:

```
herdado    veio do perfil (ou da regra global)
exceção    foi mexido só para este sujeito
efetivo    o que vale de fato agora
```

O que a pessoa lê é o **efetivo**; o que ela precisa entender é **por quê**.
Exceção sempre marcada - é o que se revisa depois.

### 3.3 Confirmação proporcional ao alcance

| alcance | tratamento |
|---|---|
| um sujeito, reversível | salva direto, feedback no lugar da ação |
| um sujeito, irreversível | diálogo com o nome dele na frase |
| **todos os sujeitos** | diálogo com o **número** na frase e motivo opcional registrado |

"Travar uma tela" tira o acesso de todo mundo de uma vez: é o segundo caso mais
grave da tela e merece a frase completa, não um `confirm()` do navegador.

### 3.4 Fonte única: não recalcular no cliente o que o servidor decide

Se a API já devolve o estado efetivo, a tela **mostra** esse estado. Recalcular
no front cria duas verdades que divergem em silêncio - e a que vale é sempre a
do servidor, porque é ela que abre ou fecha a porta.

---

## 4. Modal: qual primitivo e quando

**`Modal` é o único.** Modal na mão está proibido pelo `DESIGN-LANGUAGE.md`, e
`confirm()`/`alert()` do navegador também: não seguem o tema, não são
traduzíveis, não têm foco visível e ninguém consegue estilizar a frase que
importa.

Modal existe para **três** casos, e só:

| caso | tamanho | exemplo |
|---|---|---|
| confirmar o irreversível | `sm` / `md` | excluir perfil, travar tela |
| escopo auxiliar de um sujeito | `lg` / `xl` | liberação de empreendimentos |
| criação rápida | `lg` | novo perfil |

**A edição principal nunca vai em modal.** Ela mora no painel de detalhe. Modal
para editar o assunto central da tela é o mesmo erro que a listagem tinha: dois
desenhos do mesmo dado, e o de dentro do modal sempre ganha.

### O único componente novo que esta receita pede

`ConfirmDialog.vue` - **casca fina sobre `Modal`**, não um primitivo visual novo:
título, consequência em uma frase, campo de motivo opcional, botão destrutivo à
direita e o cancelar sempre à esquerda. Justificativa: só a tela de Alçadas tem
quatro confirmações (excluir perfil, restaurar padrão, travar tela, revogar
tudo), hoje escritas de três jeitos diferentes - uma à mão, duas nativas.

Fora ele, **nada de componente novo**: `Modal`, `Panel`, `Switch`, `Badge`,
`SegmentedControl`, `Collapsible`, `SettingsCard`, `EmptyState`, `Skeleton`,
`UserAvatar`, `ActionBar`, `StatRow` e `Dropdown` cobrem o resto.

---

## 5. Alterações pendentes: `ActionBar`

O primitivo já existe e está com zero uso. Ele foi escrito para seleção múltipla,
mas a forma é exatamente a que falta aqui: barra fixa no rodapé, que aparece
quando há algo a resolver, respeita a nav pelas CSS vars e vive na camada 10.

Na tela executiva ela carrega o **estado sujo**: quantas alterações estão
pendentes, o que elas significam em uma linha, `Descartar` e `Salvar`.

Regras:

- **Nunca salvar sozinho ao mexer no switch.** Alçada em lote precisa de revisão
  antes de virar realidade.
- Sair do sujeito com alteração pendente **avisa** - não descarta calado.
- Salvando: a barra mostra o progresso; **a tela não congela**.
- Erro ao salvar: a mensagem aparece na barra, com o que fazer. Nunca `alert()`.

---

## 6. Hierarquia visual

O `DESIGN-LANGUAGE.md` manda gastar a força em um lugar só. Na listagem esse
lugar é o número. **Aqui é o sujeito e o seu estado.**

```
sujeito       nome em text-base font-semibold + avatar        ← o herói
estado        Badge (efetivo) + linha de contexto em text-xs
fila          text-sm tabular-nums                            ← nunca text-metric
explicação    text-micro mono maiúsculo
```

- **`text-metric` e `StatCard` com série estão proibidos aqui.** Número grande com
  sparkline promete tendência que não existe.
- Cor de dado (`data-pos` / `data-neg` / `data-warn`) fica **reservada ao estado de
  acesso**: concedido, negado, travado. Nunca decoração.
- `accent` continua sendo só ação, foco e link.
- A cor nunca é o único sinal: estado sempre com ícone ou palavra junto.

---

## 7. Estados

Iguais aos da listagem, mais dois que só existem aqui:

| estado | tratamento |
|---|---|
| carga | `Skeleton` - `row` no mestre, `text` no detalhe |
| erro | bloco com o que houve e "Tentar novamente", **sempre via `utils/mensagemDeErro.js`** |
| vazio | `EmptyState` com a ação sugerida |
| **sem seleção** | `EmptyState` no detalhe: "escolha um usuário à esquerda" |
| **sujeito sem alçada nenhuma** | não é vazio, é **aviso**: a tela dele abre em branco, e isso precisa estar escrito |

**A frase do erro é do usuário, não do `fetch`.** `Failed to fetch` é o que o
navegador diz quando não houve resposta - em inglês, sem dizer o que fazer e
parecendo defeito do sistema. Todo bloco de erro passa por
`mensagemDeErro(erro, padrao)`: falha de rede vira "Não foi possível falar com o
servidor. Verifique a conexão e tente de novo.", o detalhe técnico vai para o
console, e a mensagem que o NOSSO backend escreveu é preservada - ela já vem em
português e já é específica.

---

## 8. Paridade no estreito

A tela é de administrador, mas paridade continua sendo regra:

- mestre e detalhe viram **duas telas**: a lista empurra o detalhe, com voltar;
- a `ActionBar` já é fixa no rodapé, onde o polegar alcança;
- nenhum bloco de decisão fica escondido - o que existe no monitor existe aqui,
  a um toque de distância.

---

## 9. Aceite

Os 12 do `DESIGN-LANGUAGE.md`, os 5 da `RECEITA-DE-TELA.md` que continuam
valendo (três estados, nada de componente órfão), mais estes:

18. Nenhum `confirm()`/`alert()` nativo; toda confirmação em `ConfirmDialog`.
19. Toda mudança que atinge outra pessoa mostra o efeito antes de salvar.
20. Estado legível nas três camadas (herdado / exceção / efetivo).
21. Confirmação proporcional ao alcance, com o número na frase quando é geral.
22. Alteração pendente vive na `ActionBar`; sair com pendência avisa.
23. Nada de recálculo no cliente do que o servidor já decide.
24. Nenhum `text-metric` nem cartão com série.

---

## 10. O que é regra e o que é escolha do piloto

**Regra (vale para toda tela executiva):** seções 1 a 9.

**Escolha da Alçadas, que outra tela pode fazer diferente:**

- três sujeitos (Usuários / Perfis / **Telas**) - a aba Telas é nova; hoje o
  assunto "telas travadas" é um bloco solto no fim da aba Usuários;
- mestre em 1/3 e detalhe em 2/3;
- liberação de empreendimentos continua em modal (escopo auxiliar);
- agrupamento das telas por categoria do `navRegistry`, em `Collapsible`.

---

## 11. A API que o padrão exigiu (feita em 2026-08-20)

| endpoint | para quê |
|---|---|
| `GET /permissions/capabilities` | catálogo de ações por tela - é o que sustenta a aba Telas |
| `GET /permissions/grants` | todos os grants de uma vez - a fila "sem liberação de dados" |
| `GET /permissions/retired-routes` | rotas que o boot aposenta, com o motivo |

E `GET /permissions` passou a calcular as rotas efetivas **em lote**
(`getEffectiveRoutesBulk`): eram 3 consultas por usuário dentro de um laço,
7.185ms com 28 pessoas; agora são 4 consultas, ~350ms com cache quente. O
resultado é idêntico ao cálculo um a um - foi conferido usuário por usuário.
