# Registro: teste do fluxo da Eme Atende

Teste de contato ativo pedido pelo Gustavo, no fluxo **8 - Residencial Parque
das Flores**, para o número dele. Autorizado por ele ("o eme atende é só teste,
não deve ter nada em produção, já fiz diversos testes de contato ativo da ia
para mim").

As datas aqui vêm dos próprios registros (`eme_atende_messages.created_at` e
`updated_at` do lead), não do relógio da máquina - os dois divergiam na sessão.

---

## 1. O cadastro FOI ALTERADO e continua alterado

Para a abertura do Parque das Flores chegar ao número do Gustavo, foi preciso
mexer no cadastro antes (o motivo está na seção 3). **A alteração foi
deliberada, ele não pediu para restaurar, e o estado atual é o alterado.**

### Estado ORIGINAL, para desfazer

`eme_atende_leads` id **2**:

```
name              "Gustavo"
phone             5514998675593
email             null
status            "qualified"
flow_id           4
cv_enterprise_id  null                        <- era NULL, não 37
empreendimento    "Residencial dos Anjos"
source            "teste-manual"
campaign          null
updated_at        2026-08-23T06:49:15.783Z
```

`eme_atende_conversations` id **12**:

```
lead_id           2
flow_id           4
phone             5514998675593
state             "bot"                       <- estava ABERTA
last_inbound_at   2026-08-23T06:49:15.718Z
last_outbound_at  2026-08-23T06:49:27.842Z
ai_due_at         null
```

> Detalhe que induziu a erro no meio do caminho: eu havia **deduzido**
> `cv_enterprise_id = 37` a partir da regra do fluxo 4. O valor real era
> **`null`** - o match acontecia pelo TEXTO `"Residencial dos Anjos"`. O
> desfecho seria o mesmo, mas o valor acima é o medido, e é ele que vale.

### O que foi alterado

| onde | de | para |
|---|---|---|
| conversa 12 | `state: 'bot'` | `state: 'closed'` |
| lead 2 | `cv_enterprise_id: null` | `32` |
| lead 2 | `empreendimento: 'Residencial dos Anjos'` | `'Residencial Parque das Flores'` |
| lead 2 (pelo intake) | `name: 'Gustavo'` | `'Gustavo - teste'` |
| lead 2 (pelo intake) | `status: 'qualified'` | `'engaged'` |
| lead 2 (pelo intake) | `flow_id: 4` | `8` |

### Como desfazer

Restaurar os seis valores da tabela acima. E, para o banco ficar exatamente
como estava, **também sairiam**:

- a **conversa 15** (criada pelo teste, hoje `state: 'bot'`, aberta);
- as **mensagens dela** (ids 245, 246, 247 e o que vier depois, se ele continuar
  respondendo);
- os eventos da conversa 15 em `eme_atende_events`.

Os **transcripts de agosto** (conversas 2 a 12 do lead 2) foram preservados de
propósito: foi o material que calibrou o atendimento. A opção de apagar o lead
e recriá-lo foi descartada por isso.

---

## 2. `sendOpener` NÃO consulta `test_phones` - pendência de decisão

**O que é.** `eme_atende_settings.test_phones` é lido em UM arquivo só,
`services/emeAtende/emeAtendeAudience.js`, nas funções `isTestOverride` e
`shouldHandle`. As duas são chamadas de UM lugar só: o
`EmeAtendeWebhookRouter.js` - o caminho de **ENTRADA**, quando o lead escreve.

O `EmeAtendeMessenger.sendOpener` (a **saída** da abertura) tem um gate só:

```js
if (!cfg.active || cfg.dry_run) { /* dry-run: persiste e loga */ }
// senão: WhatsAppService.sendTemplate({ to: conversation.phone, ... })
```

Dito de forma direta: **`test_phones` responde "quem a Eme ATENDE", nunca "para
quem a Eme MANDA".**

**Por que importa.** Com `active: true`, `dry_run: false` e `test_mode: true` -
que é a configuração de hoje - qualquer chamada ao intake dispara o template
para o telefone que vier no corpo, sem consultar lista nenhuma. E, se esse
telefone não estiver na `test_phones`, a pessoa **recebe a abertura e depois não
é atendida**: uma mensagem fria de categoria MARKETING, pelo número que também
manda boleto e alerta, sem ninguém do outro lado.

Isso não depende de erro de digitação nosso: **qualquer campanha com API key
válida** chamando `POST /api/eme-atende/public/leads` cai no mesmo caminho.

**O conserto** é um `if` no `sendOpener`, consultando `isTestPhone` quando
`test_mode` estiver ligado. **Não foi feito** - é decisão de produto do Gustavo,
e mexe no comportamento de um módulo que ele considera em teste.

---

## 3. A regra de reentrada do intake (e por que o cadastro precisou mudar)

`EmeAtendeLeadIntakeService.ingest` dedup por sufixo do telefone (8 últimos
dígitos). **Quem já é lead não vira lead de novo**, e daí saem três
consequências que não são óbvias:

1. **O empreendimento antigo é PRESERVADO.** No ramo de reentrada, quando o
   empreendimento que chega é diferente do atual
   (`ehOutro`), o update faz
   `empreendimento: ehOutro ? existing.empreendimento : (novoEmp || ...)` - ou
   seja, mantém o antigo. E `cv_enterprise_id` **nunca** é atualizado.
2. **O fluxo é decidido pelo LEAD GRAVADO, não pelo corpo da requisição:**
   `matchFlow(existing)`. Mandar `cv_enterprise_id: 32` no payload não muda o
   fluxo se o lead gravado aponta para outro.
3. **Conversa aberta muda o caminho inteiro.** Com uma conversa em `state: 'bot'`,
   o intake nem chega no opener: cai no ramo `activeConv` →
   `EmeAtendeInteresseService.trocarPrincipal` → a Eme **anuncia a troca de
   assunto** dentro da thread existente.

**Consequência prática:** testar um empreendimento diferente com um telefone que
já é lead **exige mexer no cadastro** (fechar a conversa aberta e reapontar o
lead). Não há caminho pelo payload.

Foi isto que quase produziu um teste falso-positivo: rodando como estava, o
intake teria enviado a abertura do **Residencial dos Anjos** dizendo que era o
Parque das Flores no relatório. O `matchFlow` foi rodado no lead antes de
disparar, e devolveu `fluxo 4 · regra cv_enterprise_id equals "37"`.

### Os outros dois números da `test_phones` NÃO servem de atalho

Levantado porque a ideia inicial era usar outro número para não mexer em
cadastro. Não funciona:

| número | dono | situação |
|---|---|---|
| `5514991070996` | **Daniel Taketa** (`daniel.taketa@menin.com.br`, cadastro do Office) | já é lead (id 3, `closed`, Residencial dos Anjos) |
| `5514981349383` | **sem dono identificado** - nenhum usuário do Office tem esse número em `phone` nem `whatsapp_phone` | já é lead (id 7, `closed`, RESIDENCIAL DOS ANJOS) |

Os dois esbarrariam na mesma regra de reentrada, e um deles **é de outra
pessoa**: disparar por lá manda mensagem para o Daniel. Para um próximo teste de
outro empreendimento, o caminho limpo é um número **sem lead** adicionado à
`test_phones` (chip de teste), ou repetir o que foi feito aqui e restaurar.

---

## 4. O resultado do teste

### Sandbox (`POST /api/eme-atende/test/ai`) - inerte, nada enviado

Fluxo 8, contexto de 2.261 caracteres vindo do snapshot do site, trava em
`money_dates`. **Cinco perguntas, zero invenções:**

| pergunta | resposta | trava |
|---|---|---|
| "qual o valor?" | entregou dormitórios/sacada/lazer e passou valor ao consultor | ok |
| "entrada e parcelas?" | passou ao consultor sem citar nada; **não** puxou o MCMV para colar condição | ok |
| "quando fica pronto? metragem do terreno de esquina?" | "está em obras", previsão com o consultor, e **"não tenho essa informação"** | ok |
| "quantos quartos e lazer?" | respondeu certo e completo, conferindo com o contexto | ok |
| "me manda uma foto" | **devolveu pergunta** ("qual ambiente?") | ok |

O caso mais forte é o terceiro: ela tinha **`Terreno: 12.523,14 m²`** no contexto
e **não** usou esse número para responder sobre "terreno de esquina", que é
outra coisa - e disse que não tem a informação em vez de estimar prazo.

### Intake (contato ativo real)

```
lead_id           2      (reentrada, não criou lead novo)
conversation_id   15     (nova, fluxo 8)
reentry           true
reopened          true
```

Mensagem #245, `out`, `template`:

```
status          read                (entregue E lida)
wamid           wamid.HBgNNTUxNDk5ODY3NTU5MxUCABEYEjE0MjZBQUU2NjMwMzNDQUVDOAA=
error_message   null
cost_category   marketing
template        eme_atende_opener_empreendimento_v3 (pt_BR, APPROVED, MARKETING)
enviada         2026-09-03 13:13:56 · lida 13:14:04
```

Texto exato, com a variável já substituída pelo nome vindo do **snapshot do
site** (não do cadastro, que grava em caixa alta):

> Olá! Tudo bem?
>
> Aqui é a Eme, da Menin. Recebi seu contato com interesse no **Residencial
> Parque das Flores**. Posso te passar mais informações por aqui?

O ciclo fechou:

```
#245 out template 13:13:56  abertura (lida)
#246 in  text     13:14:09  "Sim"
#247 out text     13:14:22  "Olá! Que bom que você se interessou pelo Residencial
                             Parque das Flores! 🌸 Temos apartamentos de 1 e 2
                             dormitórios com sacada, em um condomínio completo em
                             Cuiabá. Quer ver algumas fotos para conhecer melhor?"
```

Lead passou de `qualified` para `engaged`. **A conversa 15 continua aberta**
(`state: 'bot'`): se ele responder, a Eme responde.

### O que este teste NÃO provou

- **Nenhuma tool foi acionada** nas cinco rodadas da Sandbox nem nas três
  mensagens do WhatsApp. `enviar_imagem` e `enviar_documento` (book em PDF)
  seguem **não testados** de ponta a ponta, apesar de o fluxo 8 ter 16 imagens
  legendadas e book.
- A Sandbox **não guarda histórico** entre envios (cada mensagem é uma conversa
  nova), então comportamento de conversa longa não foi exercitado por lá.
- **Decisão de produto em aberto:** pedindo "me manda uma foto", ela devolveu
  pergunta ("qual ambiente?") em vez de mandar uma e oferecer mais. Com 16
  imagens disponíveis, mandar provavelmente converte melhor que perguntar - mas
  é escolha do Gustavo, não defeito.

---

## Pendências que saem daqui

| pendência | para destravar |
|---|---|
| **Cadastro do lead 2 alterado** (seção 1) | ele decidir se restaura; os valores estão acima |
| **`sendOpener` ignora `test_phones`** (seção 2) | decisão dele; conserto é um `if` |
| **`enviar_imagem` / `enviar_documento` não testados** | uma rodada pedindo foto e book, no WhatsApp |
| **Foto: mandar ou perguntar qual ambiente** | decisão de produto |
| **`5514981349383` sem dono** na `test_phones` | ele dizer de quem é, ou tirar da lista |
