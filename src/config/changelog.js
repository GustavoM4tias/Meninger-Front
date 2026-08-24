// src/config/changelog.js
//
// CATÁLOGO DE ATUALIZAÇÕES DA PLATAFORMA — fonte única.
//
// Este arquivo alimenta DOIS lugares:
//   • /docs                        histórico completo, para consulta
//   • Mural de atualizações        modal que abre sozinho quando há novidade
//
// Ele morava dentro de Docs.vue, num arquivo de 1769 linhas. Ficar lá significava
// que a novidade só existia para quem entrasse na tela de documentação por conta
// própria — ou seja, quase ninguém. Escreve-se a release aqui uma vez e ela
// aparece nos dois lugares.
//
// ─── Como escrever uma release ────────────────────────────────────────────────
//
//   {
//     version: 'v3.14.0',              // ordem numérica, não alfabética
//     date: new Date('2026-09-01T00:00:00'),   // null = roadmap, NÃO vai ao mural
//     theme: 'Notificações',           // 2 a 4 palavras; o mural usa como rótulo
//     description: 'Uma frase que diz o que mudou na vida de quem usa.',
//     type: 'major' | 'minor' | 'patch',
//     categories: ['frontend', 'backend', ...],
//     features:     [{ id, title, description, link? }],   // o que passou a existir
//     improvements: [{ id, category, description }],       // o que ficou melhor
//     fixes:        [{ id, description }],                 // o que estava errado
//     breakingChanges: [{ id, description }],              // REGRA que mudou
//     knownIssues: [],
//   }
//
// `link` numa feature é o atalho de tutorial: o mural mostra um botão que leva
// direto à tela nova. Use caminho interno ('/notifications'), nunca URL externa.
//
// LINGUAGEM: a diretoria lê isto no celular. Escreva o efeito no trabalho da
// pessoa, não o meio técnico — "o aviso passa a chegar no aparelho", não
// "implementado Web Push com VAPID".

export const releases = [
  {
    version: 'v3.16.0',
    date: new Date('2026-08-24T00:00:00'),
    theme: 'Notificações',
    description: 'As notificações passam a chegar até você, em vez de esperarem ser procuradas.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Mural de atualizações', description: 'Este quadro. Sempre que o sistema for atualizado, ele abre uma vez para contar o que mudou. Depois disso, tudo continua guardado em Documentação.', link: '/docs' },
      { id: 2, title: 'O aviso vem até você', description: 'Ao entrar no Office, o que você ainda não leu aparece no canto da tela e some sozinho. Clicar leva à tela do assunto, e deixar o mouse em cima segura o tempo para ler com calma.', link: '/notifications' },
      { id: 3, title: 'Dá para saber de onde veio o aviso', description: 'No sino e na caixa de notificações, cada aviso mostra o assunto com ícone e cor próprios: checklist, lead, comunicado, reunião. Antes era tudo cinza e igual.' },
    ],
    improvements: [
      { id: 1, category: 'Caixa de notificações', description: 'Os avisos ficam agrupados por dia, com Hoje e Ontem no topo.' },
      { id: 2, category: 'Sino', description: 'O painel cabe na tela do celular, fecha sozinho quando você abre um aviso e se atualiza enquanto o sistema está aberto.' },
      { id: 3, category: 'Mensagens do canto', description: 'Deixaram de cobrir a barra de cima, onde ficam o menu e o seu perfil.' },
    ],
    fixes: [
      { id: 1, description: 'A caixa de notificações abria em avisos antigos e nunca chegava nos recentes. Quem tinha muita coisa acumulada ficava vendo maio.' },
      { id: 2, description: 'O aviso de reunião começando não aparecia na tela de preferências, então não dava para escolher por onde recebê-lo.' },
      { id: 3, description: 'Aviso que não levava a tela nenhuma parecia clicável e não fazia nada.' },
    ],
    breakingChanges: [
      { id: 1, description: 'Na caixa de notificações e no sino, a lista agora começa sempre pelo aviso mais recente. Antes, o que você não tinha lido era jogado para o topo, mesmo sendo de meses atrás. Para ver só o que está pendente, use a aba Não lidas.' },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.15.0',
    date: new Date('2026-08-24T00:00:00'),
    theme: 'Microsoft 365',
    description: 'E-mail, conversas e arquivos da Microsoft passam a ser lidos e respondidos de dentro do Office.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Sua caixa de e-mail no Office', description: 'Em Microsoft, o Outlook completo: ler, responder, anexar e organizar em pastas sem trocar de sistema.', link: '/microsoft/outlook' },
      { id: 2, title: 'Teams sem sair da tela', description: 'As conversas do Teams, quem está disponível neste momento e o link da sala de cada reunião.', link: '/microsoft/teams' },
      { id: 3, title: 'A ata fica pronta sozinha', description: 'Terminada uma reunião gravada, o sistema transforma a transcrição em ata, com o minuto de cada fala, quem falou e o que ficou pendente. Quem participou recebe o aviso.' },
      { id: 4, title: 'Arquivos da nuvem', description: 'Busca em todas as bibliotecas do SharePoint e no seu OneDrive de uma vez, e a planilha abre para leitura sem precisar baixar.' },
      { id: 5, title: 'A Eme enxerga a sua tela', description: 'Ela sabe em qual tela você está. Segure Ctrl e clique em algo dela para perguntar sobre aquele item específico.' },
    ],
    improvements: [
      { id: 1, category: 'Agenda', description: 'Ao marcar uma reunião, o sistema mostra quem está livre no horário.' },
      { id: 2, category: 'Acesso à Microsoft', description: 'As autorizações ficaram num lugar só, então falha de permissão deixou de aparecer no meio do trabalho.' },
    ],
    fixes: [
      { id: 1, description: 'Editar uma reunião apagava o link da sala e a descrição.' },
      { id: 2, description: 'Um aviso de permissão da Microsoft aparecia para qualquer pessoa, sem nada que ela pudesse fazer: quem libera esse acesso é o administrador.' },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.14.0',
    date: new Date('2026-08-23T00:00:00'),
    theme: 'Cobrança do ato e visual do sistema',
    description: 'A cobrança do ato passa a aceitar cartão, e o Office inteiro passa a falar a mesma língua visual.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Boleto e cartão na mesma tela', description: 'Em Financeiro, na Cobrança do Ato, a forma vem do parcelamento da série: à vista sai boleto, parcelado sai link de cartão. O envio ao cliente e o que aconteceu depois ficam no mesmo histórico.', link: '/financeiro/cobranca/ato' },
      { id: 2, title: 'Como usar em cada tela', description: 'O botão Como usar explica, na própria tela, para que ela serve e o passo a passo do que fazer ali. Já está em 22 telas.' },
    ],
    improvements: [
      { id: 1, category: 'Confirmações', description: 'A caixinha cinza do navegador saiu do sistema. Agora a pergunta diz o que vai acontecer antes de você confirmar.' },
      { id: 2, category: 'Relatórios', description: 'As cores dos gráficos foram corrigidas para quem tem daltonismo, e nenhum texto ficou pequeno demais para ler no celular.' },
      { id: 3, category: 'Carregamento', description: 'Enquanto a tela carrega, ela mostra o formato do que está por vir, em vez de uma bolinha girando.' },
    ],
    fixes: [
      { id: 1, description: 'Cartões clicáveis não podiam ser acionados pelo teclado.' },
      { id: 2, description: 'O gráfico de desempenho diário das campanhas tinha duas escalas e dava a impressão errada.' },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.13.0',
    date: new Date('2026-08-21T00:00:00'),
    theme: 'Permissões e comercial',
    description: 'A permissão passa a valer por ação dentro da tela, e não só pelo acesso a ela.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Permissão por ação, não só por tela', description: 'Dar uma tela a alguém deixou de dar tudo o que existe dentro dela: aprovar, excluir e publicar são liberados em separado, um a um.', link: '/settings/permissions' },
      { id: 2, title: 'Situação do repasse na reserva', description: 'A reserva mostra em que etapa o repasse está e leva ao registro correspondente no CV.', link: '/comercial/reservas' },
    ],
    improvements: [
      { id: 1, category: 'Alçadas', description: 'A lista mostra cargo, departamento e a empresa de quem é de fora.' },
      { id: 2, category: 'Pré-cadastros', description: 'A origem do lead passa a seguir a regra de captação do próprio Office.' },
    ],
    fixes: [
      { id: 1, description: 'Pessoas de fora e perfis desativados sumiam da lista de alçadas.' },
      { id: 2, description: 'Na cobrança do ato, reserva cancelada aparecia como erro, o indicador contava tentativa em vez de reserva e alguns pagamentos não eram reconhecidos.' },
      { id: 3, description: 'Cancelar uma reserva baixava o boleto na hora, antes de a baixa ser confirmada.' },
    ],
    breakingChanges: [
      { id: 1, description: 'O módulo de Aprovações saiu do Office. A tela e os avisos dele não existem mais.' },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.12.0',
    date: new Date('2026-08-19T00:00:00'),
    description: 'O Office vira aplicativo instalável no celular e no computador, com notificação que chega no aparelho, e cada link do sistema passa a ser compartilhado com identidade própria.',
    type: 'minor',
    categories: ['frontend', 'backend', 'mobile'],
    features: [
      { id: 1, title: 'Office como aplicativo', description: 'O sistema pode ser instalado no iPhone, no Android, no Windows e no Mac, com ícone e nome próprios, abrindo em janela limpa sem a barra do navegador. Não passa por loja, não ocupa espaço e não precisa ser atualizado: o aplicativo é o próprio sistema, então toda melhoria publicada já chega instalada. Custo zero, sem Apple Store e sem Google Play.' },
      { id: 2, title: 'Notificação no aparelho', description: 'As notificações que hoje acendem o sino passam a chegar também como aviso do celular ou do computador, na tela bloqueada e na central de avisos, mesmo com o Office fechado. Clicar abre direto a tela do assunto. Valem as mesmas preferências do sino: desligar um tipo em Notificações desliga nos dois lugares. O Bolão é a exceção proposital, fica só no sino para não interromper a empresa a cada gol.' },
      { id: 3, title: 'Tela Instalar o app', description: 'Em Sobre o Office, uma tela que reconhece o aparelho e mostra o caminho certo de instalação, com um botão único que instala e já pede a autorização de notificação. Lista os aparelhos que recebem avisos, identifica qual é o atual e permite tirar da lista aquele que não usa mais. Ao abrir o sistema, quem ainda não instalou recebe um convite, que volta a cada sessão até instalar ou pedir para não ver mais.' },
      { id: 4, title: 'Compartilhamento com identidade', description: 'Link do Office colado no WhatsApp, no Teams ou no LinkedIn passa a exibir logo, nome da tela e da área, em vez do cartão em branco de antes. O texto sai do próprio mapa de navegação do sistema, então tela nova ganha identidade sozinha, sem manutenção. Por segurança o cartão mostra apenas nome de tela, nunca dado de negócio, já que a prévia é lida sem login.' },
    ],
    improvements: [
      { id: 1, category: 'Abertura do sistema', description: 'O tema claro ou escuro passa a ser aplicado antes da tela desenhar, eliminando o piscar de tela branca em quem usa o modo escuro, e a abertura mostra a marca enquanto carrega em vez de tela vazia.' },
      { id: 2, category: 'Ícone do sistema', description: 'O ícone da aba do navegador era o logo branco sobre fundo transparente e ficava invisível em aba clara. Agora tem fundo próprio e aparece em qualquer tema.' },
      { id: 3, category: 'Aviso de erro nas notificações', description: 'Falha ao ativar as notificações passa a dizer o motivo real (sessão expirada, permissão bloqueada, indisponibilidade do servidor) em vez de uma mensagem única que não indicava o que fazer.' },
    ],
    fixes: [
      { id: 1, description: 'Aparelho onde o aplicativo foi desinstalado continuava listado como apto a receber avisos sem forma de removê-lo.' },
      { id: 2, description: 'Reinstalar o aplicativo criava uma segunda inscrição e as duas apareciam idênticas na lista, sem como saber qual valia.' },
    ],
    breakingChanges: [],
    knownIssues: [
      { id: 1, description: 'No iPhone, a notificação só funciona depois que o Office é adicionado à Tela de Início e aberto pelo ícone. Aberto no Safari comum, o recurso não existe.', workaround: 'É regra da Apple, não limitação do sistema: a Apple não permite que um site instale a si mesmo nem envie aviso fora do aplicativo adicionado. Por isso a tela Instalar o app pede primeiro a instalação e só depois, ao ser aberta pelo ícone, oferece as notificações.' },
    ],
  },
  {
    version: 'v3.11.0',
    date: new Date('2026-08-06T00:00:00'),
    description: 'Sobre o Office, ajustes contábeis no Faturamento e o número de leads da Central Meta passando a contar a nossa base.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Sobre o Office', description: 'Três telas para conhecer o sistema por dentro sem percorrer tela por tela: Mapa do Sistema (mapa mental navegável), Visão Executiva (o documento de apresentação, com exportação em PDF) e Atualizações (esta linha do tempo). Os números de topo são lidos ao vivo do uso real.' },
      { id: 2, title: 'Ajustes contábeis do Faturamento', description: 'Máscara sobre o contrato para corrigir data da instituição financeira e série, sem tocar no dado original do Sienge. Vale no dashboard, no fechamento e nas respostas da Eme, com selo na listagem e registro da divergência quando o mês já está consolidado.' },
      { id: 3, title: 'Leads da Central Meta pela nossa base', description: 'O card de Leads e o CAC passam a contar os leads captados pelo Office, com nome, telefone e e-mail conferíveis no CV, em vez da contagem da Meta.' },
    ],
    improvements: [
      { id: 1, category: 'Data do lead', description: 'O lead passa a ser contado no dia em que nasceu na Meta, não no dia em que entrou no Office. Sem isso, a importação histórica jogava tudo na data do import e distorcia o custo por lead do mês.' },
    ],
    fixes: [],
    breakingChanges: [
      {
        id: 1,
        component: 'Custo por lead (CAC) da Central Meta',
        description: 'O CAC subiu porque o denominador mudou. A Meta contava também a conversão de pixel, que ela entrega apenas como número total, sem nome, telefone ou e-mail e sem como conferir no CV. Em julho a Meta contava 3.134 leads (1.618 de formulário e 1.516 de pixel) contra 1.602 na nossa base, e o CAC saiu de R$ 3,60 para R$ 7,04.',
        migrationGuide: 'Não é piora de resultado: é o indicador passando a contar só quem existe. A contagem da Meta continua gravada e o comparativo Meta contra Office contra CV segue no detalhe dos formulários.',
      },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.10.0',
    date: new Date('2026-08-04T00:00:00'),
    description: 'Eme com validação anti-alucinação e relatórios que viram ferramenta de leitura, com filtro e drill-down.',
    type: 'minor',
    categories: ['backend', 'frontend', 'api'],
    features: [
      { id: 1, title: 'Validação anti-alucinação da Eme', description: 'Toda resposta passa por um laço de autocorreção. O que não bate com os dados reais é bloqueado e substituído por um resumo montado dos números consultados, com aviso honesto de que houve correção. Os incidentes ficam registrados e têm aba própria no Cérebro da Eme.' },
      { id: 2, title: 'Relatórios interativos', description: 'O relatório deixa de ser figura: filtros logo abaixo da logo, clique na linha para abrir o detalhe, foco com botão de voltar e exportação em Excel. As alçadas de quem lê valem na consulta, não só na tela.' },
      { id: 3, title: 'Geração que sobrevive ao F5', description: 'A montagem do relatório virou execução persistente: recarregar a página reconecta ao andamento em vez de recomeçar.' },
      { id: 4, title: 'Etapas de autorização no Plano de Eventos', description: 'As etapas de aprovação passam a ser definidas no próprio painel.' },
    ],
    improvements: [
      { id: 1, category: 'Imobiliárias', description: 'Período do link multi-uso agora é editável pelo detalhe do convite.' },
      { id: 2, category: 'Correspondentes', description: 'Celular no cadastro de pessoa, enviado junto ao CV.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.9.0',
    date: new Date('2026-08-03T00:00:00'),
    description: 'Plano de Eventos, correspondentes com cadastro em lote e os relatórios da Eme ganhando identidade visual e exportação.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Plano de Eventos', description: 'O gestor propõe os eventos do mês com itens e custo, o Comercial valida, o Marketing aceita e o mês fecha congelado. A decisão é por linha e permite corte de valor, que é o que as Aprovações não fazem. Inclui agenda automática e consolidado de compras.' },
      { id: 2, title: 'Cadastro de correspondentes por formulário', description: 'Além da importação por colagem, o cadastro de pessoas uma a uma.' },
      { id: 3, title: 'Relatórios com identidade e exportação', description: 'Quatro temas de cor, cor com intenção nos gráficos, logo padronizada e exportação em HTML, PNG e PDF, com a tela publicada completa.' },
      { id: 4, title: 'Teto de valor do boleto', description: 'Limite configurável por boleto, com padrão de R$ 300 mil.' },
    ],
    improvements: [
      { id: 1, category: 'Vendas × Projeção', description: 'O modo de meta virou regra global definida pelo admin, em vez de ajuste por usuário.' },
      { id: 2, category: 'Relatórios ao vivo', description: 'Botão de atualizar dados e período correto no modo ao vivo.' },
    ],
    fixes: [
      { id: 1, description: 'Relatórios voltaram a enxergar as ferramentas do registro da Eme; antes o refinamento sem nova consulta podia inventar número.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.8.0',
    date: new Date('2026-08-01T00:00:00'),
    description: 'Módulo de correspondentes do CV, com importação em lote e link público de cadastro.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Correspondentes', description: 'Equipes e cadastros em uma tela só, com importação por colagem direta de mensagem de WhatsApp e validação de CPF. O código da empresa vem sugerido e o status é sempre reconferido por leitura no CV.' },
    ],
    improvements: [
      { id: 1, category: 'Validador da Eme', description: 'Regras do prompt ampliadas e data de referência injetada na verificação.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.7.0',
    date: new Date('2026-07-30T00:00:00'),
    description: 'Fechamento mensal de vendas, distrato que deixa de subtrair do faturamento e terreno lido direto do Sienge.',
    type: 'minor',
    categories: ['backend', 'frontend'],
    features: [
      { id: 1, title: 'Fechamento de vendas', description: 'Consolidação mensal que congela o mês pelo mesmo motor do dashboard, com confirmação mostrando os valores, histórico de versões e vigilância diária que explica qualquer mudança depois do fechamento. A Eme responde pelo consolidado e avisa quando o mês está parcial.' },
      { id: 2, title: 'Terreno ao vivo do Sienge', description: 'O valor do terreno passa a ser lido da observação do título pela API do Sienge, encerrando a dependência de um banco de terceiro.' },
      { id: 3, title: 'Ocultos em lote no Faturamento', description: 'Ocultar e restaurar empreendimentos em lote, com seleção por empresa e a regra valendo para todos na consulta.' },
    ],
    improvements: [
      { id: 1, category: 'Sincronização de contratos', description: 'Além do delta de hora em hora, uma sincronização completa diária para pegar alterações retroativas.' },
      { id: 2, category: 'Cancelamento de reserva', description: 'Baixa automática do boleto do ato quando a reserva é cancelada.' },
    ],
    fixes: [],
    breakingChanges: [
      {
        id: 1,
        component: 'Distrato no Faturamento',
        description: 'O distrato deixou de subtrair dos totais. A venda com data da instituição financeira conta mesmo se depois foi cancelada, e o cancelamento vira selo visual com a data no tooltip. Compra e distrato no mesmo mês se anulam.',
        migrationGuide: 'O VGV do período muda em relação ao que era exibido antes. A regra passou a ser a data da instituição financeira, não o status atual da reserva no CRM.',
      },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.6.0',
    date: new Date('2026-07-29T00:00:00'),
    description: 'Novo modelo de acessos: liberação por empreendimento, perfil vivo por departamento e validador de integridade.',
    type: 'minor',
    categories: ['security', 'backend', 'frontend'],
    features: [
      { id: 1, title: 'Acesso por empreendimento', description: 'A liberação passa a ser por empreendimento, com atalhos por empresa e por cidade, sobre um registro unificado que concilia CV e Sienge. O escopo é aplicado no servidor, não só na tela.' },
      { id: 2, title: 'Perfil vivo por departamento', description: 'Cada departamento tem um perfil padrão: editar o perfil propaga para quem o usa. A primeira edição do admin congela o perfil, e há um botão para restaurar o padrão.' },
      { id: 3, title: 'Tela de Integridade', description: 'Validador que confere se toda rota tem autenticação, se tela de admin está travada nos três níveis e se as alçadas batem. Roda sozinho pouco depois do boot.' },
    ],
    improvements: [
      { id: 1, category: 'Cadastro de Categorias', description: 'Aba de Categorias e a categorização manual de custos foram removidas: o departamento passa a vir sempre do Sienge.' },
    ],
    fixes: [],
    breakingChanges: [
      {
        id: 1,
        component: 'Acesso por cidade',
        description: 'O modo de acesso por cidade foi removido de vez, junto com a tabela que o sustentava. Quem enxergava dado por ser de uma cidade deixa de enxergar até receber a liberação por empreendimento.',
        migrationGuide: 'Revisar as liberações em Configurações › Alçadas. O comportamento é fail-closed de propósito: sem liberação, o resultado vem vazio em vez de vir demais.',
      },
    ],
    knownIssues: [],
  },
  {
    version: 'v3.5.0',
    date: new Date('2026-07-28T00:00:00'),
    description: 'Contas a Receber com consulta do número CEF, Aprovações como ferramenta de toda a empresa e aprovação de cadastro no primeiro acesso.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Contas a Receber', description: 'Consulta sob demanda do número da instituição financeira dos contratos, com alçada por cidade e filtro recolhível.' },
      { id: 2, title: 'Aprovações para toda a empresa', description: 'O módulo deixa de ser exclusivo do Marketing e vira ferramenta geral, com modelos de mensagem neutros no WhatsApp.' },
      { id: 3, title: 'Aprovação de cadastro no primeiro acesso', description: 'Quem entra pela Microsoft nasce pendente e escolhe departamento, cargo e cidade. O admin recebe a notificação com link direto e, ao aprovar, as alçadas padrão do departamento são aplicadas junto com o e-mail de senha provisória.' },
      { id: 4, title: 'Viabilidade no Marketing', description: 'A tela voltou a se chamar Viabilidade e mudou de lugar, com as alçadas migradas automaticamente.' },
    ],
    improvements: [
      { id: 1, category: 'Boleto Caixa', description: 'Coluna com a etapa do CV (reserva e repasse), com link e filtros.' },
      { id: 2, category: 'Cancelamento de reservas', description: 'Lista agrupada por reserva, unindo as ocorrências e mostrando a etapa do CV.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.4.0',
    date: new Date('2026-07-27T00:00:00'),
    description: 'Faturamento com fonte única de realizado, Stand de Vendas e a Central Microsoft reunindo agenda, tarefas e reuniões.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Stand de Vendas', description: 'Modelos com valor médio, metragem em faixa e estrutura física, mais os stands reais com custo lido ao vivo do Sienge. Definir o stand congela a construção e o que vem depois entra como manutenção.' },
      { id: 2, title: 'Central Microsoft', description: 'Agenda, tarefas e reuniões em um hub único, com regras finas de recorrência (ocorrência ou série), erros legíveis e visão de dia no celular.' },
      { id: 3, title: 'Vínculo CV × Sienge na Projeção', description: 'Central de vínculo por fase, com raio-X mostrando o centro de custo de cada origem. Acaba o palpite por nome.' },
    ],
    improvements: [
      { id: 1, category: 'Faturamento', description: 'Realizado com fonte única e regras de VGV e comissão guardadas no banco e editáveis em tela.' },
      { id: 2, category: 'Início', description: 'Sugestões da Eme ampliadas e rotativas na tela inicial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.3.0',
    date: new Date('2026-07-23T00:00:00'),
    description: 'Central Meta reunindo captação, campanhas e vínculos, e cancelamento de reserva conversando com o Sienge.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Central Meta', description: 'Um hub com seis abas no lugar de telas espalhadas: captação, campanhas, vínculos com o CV, formulários, credenciais e configurações. Os links antigos continuam funcionando e abrem a aba certa.' },
      { id: 2, title: 'Cancelamento de reservas CV × Sienge', description: 'O cancelamento no CV valida tudo, exclui o contrato autorizado sem emissão no Sienge e libera a unidade. Bloqueio ou erro move a reserva para pendência em vez de deixar o cancelamento pela metade.' },
    ],
    improvements: [
      { id: 1, category: 'Eme', description: 'Histórico corrigido, limite de contexto e navegação global entre telas.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.2.0',
    date: new Date('2026-07-22T00:00:00'),
    description: 'Relatórios da Eme: descrever em conversa, ver o resultado montando e compartilhar por link.',
    type: 'minor',
    categories: ['backend', 'frontend', 'api'],
    features: [
      { id: 1, title: 'Construtor de relatório por conversa', description: 'O relatório é descrito em linguagem comum e montado em blocos, com prévia enquanto é gerado. Pode ficar congelado no número do dia ou ao vivo, atualizando a cada abertura.' },
      { id: 2, title: 'Compartilhamento por link', description: 'Link público para o relatório congelado, sem exigir acesso ao sistema.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.1.0',
    date: new Date('2026-07-20T00:00:00'),
    description: 'Cadastro de imobiliárias com link público e o Editor de Projeção reescrito.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Cadastro de imobiliárias', description: 'Tela no Comercial e link público para a imobiliária se cadastrar sozinha, com preenchimento automático pelo cartão CNPJ e reenvio automático quando o CV falha.' },
      { id: 2, title: 'Editor de Projeção reescrito', description: 'Salvamento unificado em uma única transação, exclusão de verdade, ticket por empreendimento e rascunho explícito. O monólito virou três telas menores.' },
    ],
    improvements: [
      { id: 1, category: 'Exportação', description: 'Opção de PDF na exportação universal e memória das preferências por relatório.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.0.1',
    date: new Date('2026-07-10T00:00:00'),
    description: 'Navegação redesenhada, instruções em toda tela e Boleto Caixa com reemissão e baixa manual.',
    type: 'patch',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Nova navegação', description: 'Barra lateral com seções, categorias e subcategorias, menu flutuante quando recolhida, rota ativa destacada e abertura automática do ramo onde você está.' },
      { id: 2, title: 'Como usar em toda tela', description: 'Botão de ajuda no cabeçalho de cada tela, com passos e dicas escritos para quem não acompanhou a construção.' },
      { id: 3, title: 'Boleto Caixa: reemissão e baixa manual', description: 'Reemissão pelo modal, marcação de boleto pendente como baixado, histórico consolidado por reserva com contagem de tentativas e confirmação antes de reenviar ao cliente.' },
    ],
    improvements: [
      { id: 1, category: 'Academy', description: 'Exportação do artigo em PDF com texto nativo.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v3.0.0',
    date: new Date('2026-06-26T00:00:00'),
    description: 'Captação de leads própria: o Office assume o lugar do RD Station e passa a ser a origem do lead.',
    type: 'major',
    categories: ['backend', 'frontend', 'api'],
    features: [
      { id: 1, title: 'Captação própria de leads', description: 'O lead do anúncio chega por webhook da Meta, é validado, filtrado contra spam, vinculado ao empreendimento pela campanha e entregue ao CV. Inbox com o estado de cada lead até a entrega, e envio do histórico com prévia antes de disparar.' },
      { id: 2, title: 'Central de credenciais da Meta', description: 'App, tokens e webhook em um lugar só, compartilhados com o WhatsApp. Nasceu de um problema real: o segredo do App dessincronizado derrubou a entrada de leads por dez dias sem ninguém perceber.' },
      { id: 3, title: 'Alerta anti-silêncio', description: 'O sistema passa a avisar quando para de receber lead, em vez de esperar alguém notar a falta.' },
    ],
    improvements: [], fixes: [],
    breakingChanges: [
      {
        id: 1,
        component: 'RD Station',
        description: 'O RD Station deixou de ser a origem dos leads e a assinatura foi cortada, cerca de R$ 33 mil por ano. O modo sombra foi desligado e o Office virou o caminho principal até o CV.',
        migrationGuide: 'Leads anteriores ao corte seguem no histórico do CV. Campanha sem vínculo represa o lead em vez de mandá-lo no chute: a aba Vínculos CV mostra quais precisam de atenção.',
      },
    ],
    knownIssues: [],
  },
  {
    version: 'v2.9.4',
    date: new Date('2026-06-23T00:00:00'),
    description: 'Custos e títulos lidos ao vivo do Sienge, base do Checklist, alertas compartilháveis e Academy com os procedimentos da casa.',
    type: 'minor',
    categories: ['backend', 'frontend'],
    features: [
      { id: 1, title: 'Títulos e custos ao vivo', description: 'Custos, Viabilidade e visibilidade de departamentos passam a ler direto da cópia do Sienge, encerrando a sincronização automática que mantinha uma segunda verdade. A personalização feita aqui é preservada; o departamento vem sempre do ERP.' },
      { id: 2, title: 'Alertas compartilhados', description: 'Compartilhar um alerta com outra pessoa, que aceita ou recusa; ao aceitar recebe a própria cópia. Painel de administração e aviso por WhatsApp.' },
      { id: 3, title: 'Academy: procedimentos', description: 'Os POPs antigos em PDF viraram artigos na base de conhecimento, incluindo os vídeo-tutoriais do CV e os procedimentos do Sienge.' },
      { id: 4, title: 'Mural de avisos', description: 'Comunicados internos em módulo próprio, com notificação nos três canais.' },
    ],
    improvements: [
      { id: 1, category: 'Visibilidade de departamentos', description: 'Passou das configurações de Custos para as Alçadas, em cascata do global para o cargo e para o usuário, valendo o mais específico.' },
      { id: 2, category: 'BI', description: 'O acesso somente leitura do BI ganhou permissão de criar visões na cópia do Sienge, preservadas automaticamente entre restaurações.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.9.3',
    date: new Date('2026-06-15T00:00:00'),
    description: 'Cérebro da Eme: painel admin para configurar o comportamento da IA sem código.',
    type: 'minor',
    categories: ['backend', 'frontend', 'api'],
    features: [
      { id: 1, title: 'Cérebro da Eme — Painel de Configuração', description: 'Novo painel administrativo (Ferramentas › Cérebro da Eme) para editar identidade, políticas, glossário, comportamento e relatórios da assistente Eme sem mexer em código. A configuração passa a viver no banco com cache e fallback para o comportamento atual — zero regressão no deploy.' },
      { id: 2, title: 'Governança de Configuração', description: 'Fluxo de Rascunho → Publicar com versionamento e rollback. O Sandbox simula usuário, cidade e cargo e mostra o prompt montado e a resposta antes de publicar.' },
      { id: 3, title: 'Comportamento & Modelos editáveis', description: 'Seleção de modelos rápido/inteligente (fast/smart), palavras de escalonamento e limites de uso configuráveis diretamente pela interface.' },
      { id: 4, title: 'Relatórios da Eme', description: 'Liga/desliga e ajusta descrição e regras das ferramentas de consulta existentes da Eme pelo painel, sem precisar de programação.' },
    ],
    improvements: [
      { id: 1, category: 'Eme — Arquitetura de Prompt', description: 'Prompt do sistema refatorado em blocos (identidade, políticas, glossário, contexto dinâmico) montados em tempo de execução, preservando a saída idêntica quando não há versão publicada.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.9.2',
    date: new Date('2026-06-13T00:00:00'),
    description: 'Bolão da Copa 2026: painel ao vivo do bolão dos gestores no Office.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Bolão da Copa — Painel ao Vivo', description: 'Novo módulo de engajamento com ranking ao vivo, placar dos jogos e leaderboard com medalhas e acertos por jogo (cravada / vencedor / erro). Acesso direto pela barra lateral.' },
      { id: 2, title: 'Placar Automático', description: 'Resultados sincronizados automaticamente da fonte de dados esportiva (ESPN), contando apenas jogos encerrados, com modo manual de emergência para administradores.' },
      { id: 3, title: 'Badge Flutuante de Jogo', description: 'Indicador arrastável fixado na tela com bandeiras, placar e minuto da partida, que aparece só quando há jogo em andamento.' },
      { id: 4, title: 'Resenha do Eme', description: 'Resumo do bolão gerado de forma factual a partir dos dados reais (ranking, cravadas, líder), com opção de narração por IA.' },
    ],
    improvements: [
      { id: 1, category: 'Notificações do Bolão', description: 'Avisos in-app de abertura, travamento de palpites e resultados via Central de Notificações.' },
      { id: 2, category: 'Gestão de Palpites (admin)', description: 'Cadastro de participantes a partir dos usuários reais do sistema e lançamento de palpites individualmente.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.9.1',
    date: new Date('2026-06-13T00:00:00'),
    description: 'Financeiro: nova tela de Inadimplência a partir do backup do Sienge.',
    type: 'patch',
    categories: ['backend', 'frontend'],
    features: [
      { id: 1, title: 'Painel de Inadimplência (admin)', description: 'Tela no Financeiro que acompanha a inadimplência de clientes lendo ao vivo do backup diário do Sienge. KPIs, aging (faixas de atraso), ranking por empreendimento, tabela paginada e exportação CSV. Filtro padrão no trimestre corrente.' },
    ],
    improvements: [
      { id: 1, category: 'Precisão dos Indicadores', description: 'Cálculo do saldo devedor deduplicado por parcela, corrigindo a inflação de valores causada por baixas parciais — saldo real fiel ao BI.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.9.0',
    date: new Date('2026-06-12T00:00:00'),
    description: 'Blindagem de autenticação: reforço de segurança em login, tokens e sessões.',
    type: 'minor',
    categories: ['security', 'backend', 'api'],
    features: [
      { id: 1, title: 'Sessão com Refresh Token', description: 'Token de acesso de curta duração (8h) com renovação automática e transparente via refresh token de 30 dias, rotacionado a cada uso e com detecção de reuso. Logout gracioso quando a sessão expira — acabou a tela presa em "Token inválido".' },
    ],
    improvements: [
      { id: 1, category: 'Proteção contra Força Bruta', description: 'Limite de tentativas (rate limit) por IP no login, na identificação facial e na recuperação de senha.' },
      { id: 2, category: 'Criptografia AES-GCM', description: 'Credenciais sensíveis (Sienge, WhatsApp, Marketing) passam a ser cifradas com AES-GCM, com leitura compatível do formato anterior (sem migração).' },
      { id: 3, category: 'Cabeçalhos de Segurança', description: 'Adicionado Helmet e políticas de segurança (CSP) no servidor e no front; boot do servidor passa a exigir JWT_SECRET configurado.' },
      { id: 4, category: 'Login Microsoft', description: 'Callback SSO passa a usar código de uso único trocado por sessão, em vez de expor o token na URL.' },
    ],
    fixes: [
      { id: 1, description: 'Respostas de erro deixaram de vazar detalhes internos; status HTTP padronizados (401/403) nas rotas de autenticação.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.9',
    date: new Date('2026-06-09T00:00:00'),
    description: 'Academy: base de conhecimento com procedimentos e redesenho completo da experiência.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Base de Conhecimento Operacional', description: 'Procedimentos operacionais (POPs) importados como artigos na KB do Academy, organizados por categoria e subcategoria (Comercial e Construtor de Vendas), com visibilidade por classe (Interno / Externo / Ambos / Admin).' },
      { id: 2, title: 'Hierarquia de Categorias e Cross-links', description: 'A KB ganhou nível de subcategoria (Categoria › Subcategoria › Artigo) e vinculação automática entre artigos relacionados, com "Mencionado em" (backlinks).' },
      { id: 3, title: 'Espelho da Central de Ajuda do CV', description: '15 artigos de módulos do CV CRM (Painel do Corretor, Gestor, Correspondente, Portal do Cliente e Integrações) com conteúdo original.' },
    ],
    improvements: [
      { id: 1, category: 'Leitor de Artigos Editorial', description: 'Leitura redesenhada: tipografia display, acento de cor por categoria, barra de progresso, índice lateral fixo, callouts e tabelas estilizadas.' },
      { id: 2, category: 'Redesign Completo do Academy', description: 'Todas as telas modernizadas no novo design system (home, trilhas, KB, comunidade, ranking, admin), com navegação agrupada e perfil reformulado.' },
    ],
    fixes: [
      { id: 1, description: 'Corrigidos cross-links e backlinks que não recarregavam ao navegar entre artigos.' },
      { id: 2, description: 'Corrigidas rotas da KB e da Comunidade que eram "engolidas" por rotas genéricas (404 em comentários e em "Meus tópicos").' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.8',
    date: new Date('2026-06-03T00:00:00'),
    description: 'Boleto Caixa (Ato): emissão automática a partir do CV, com anexo e notificação ao cliente.',
    type: 'minor',
    categories: ['backend', 'api', 'frontend'],
    features: [
      { id: 1, title: 'Emissão Automática de Boleto (Ato)', description: 'O webhook do CV dispara a emissão do boleto Caixa via Ecobrança (Playwright), anexa o PDF na reserva do CV e atualiza a situação automaticamente.' },
      { id: 2, title: 'Validação do Titular', description: 'Conferência de nome, CPF/CNPJ (com dígito verificador), endereço, CEP, cidade e UF antes da emissão, com mensagem detalhada no CV em caso de dado inválido.' },
      { id: 3, title: 'Regra de Comissão por Empreendimento', description: 'Percentual configurável aplicado sobre o valor da série por empreendimento (ex.: série de R$ 10.000 + 20% → boleto de R$ 2.000).' },
      { id: 4, title: 'Envio ao Cliente (E-mail + WhatsApp)', description: 'O boleto é enviado ao titular nos dois canais com o PDF em anexo; reenvio manual disponível pelo histórico.' },
      { id: 5, title: 'Histórico & KPIs', description: 'Tela de histórico com filtros, indicadores (emitidos, pagos, cancelados, erros), timeline por boleto e modal de detalhes; reprocessamento de erros e verificação de pagamento sob demanda.' },
    ],
    improvements: [
      { id: 1, category: 'Verificação Diária de Pagamento', description: 'Scheduler consulta a situação dos boletos (liquidado / baixado) e atualiza a situação no CV automaticamente, respeitando o calendário de dias úteis.' },
      { id: 2, category: 'Limpeza Automática de PDFs', description: 'Boletos vencidos têm o PDF descartado do storage após 7 dias — o registro do histórico é preservado.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.6',
    date: new Date('2026-05-28T00:00:00'),
    description: 'Eme ganha entrada por voz, visualização de raciocínio e atua como tutor no Academy.',
    type: 'patch',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Eme por Voz', description: 'Entrada de mensagens por voz na assistente Eme.' },
      { id: 2, title: 'Visualização de Raciocínio', description: 'A Eme passa a exibir a estrutura do seu "pensamento" durante respostas mais complexas.' },
    ],
    improvements: [
      { id: 1, category: 'Eme no Academy (tutor)', description: 'Assistente disponível também no Academy como tutor de estudos, com segurança por contexto e auditoria de uso das ferramentas.' },
      { id: 2, category: 'Exportação de respostas', description: 'Tabelas e gráficos gerados pela Eme ganharam botões de copiar, exportar CSV e baixar imagem.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.5',
    date: new Date('2026-05-22T00:00:00'),
    description: 'Captação de leads e marketing dentro do Office, substituindo o RD Station.',
    type: 'minor',
    categories: ['backend', 'api', 'frontend'],
    features: [
      { id: 1, title: 'Captação de Leads (Inbox)', description: 'Novo módulo que recebe leads de formulários e do Meta (Facebook/Instagram) Lead Ads, valida e despacha para o CV CRM com fila, repetição e trilha de auditoria por lead.' },
      { id: 2, title: 'Landing Pages Públicas', description: 'Criação de LPs dinâmicas configuráveis (campos, cores, logo, mensagem de sucesso) publicadas em lp.menin.com.br, com proteção anti-spam e captura de UTMs.' },
      { id: 3, title: 'Webhook Meta Lead Ads', description: 'Integração direta com o Meta para captura de leads de campanhas, com verificação de assinatura (HMAC) e idempotência.' },
    ],
    improvements: [
      { id: 1, category: 'Formulários configuráveis', description: 'Tela de Marketing › Formulários com configuração de página e campos, URL da LP e snippet HTML pronto para copiar.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.3',
    date: new Date('2026-05-21T00:00:00'),
    description: 'Menin Academy evolui para uma plataforma de ensino corporativo completa (LMS).',
    type: 'major',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Trilhas, Módulos e Quiz', description: 'Trilhas de aprendizado com módulos, itens de vários tipos (texto, vídeo, quiz, artigo, tarefa), banco de questões reutilizável, nota mínima, tentativas múltiplas e pré-requisitos entre trilhas.' },
      { id: 2, title: 'Certificados com Verificação Pública', description: 'Emissão automática de certificado ao concluir a trilha, com PDF, QR code, página pública de verificação e recertificação periódica.' },
      { id: 3, title: 'Comunidade & Social', description: 'Fórum com tópicos e respostas, upvotes, comentários em artigos, avaliações 5★, menções @usuário, seguir (follow) e feed personalizado.' },
      { id: 4, title: 'Gamificação', description: 'XP, níveis, streak diário e conquistas (badges) integrados às ações de estudo.' },
      { id: 5, title: 'Player de Vídeo com Tracking', description: 'Acompanhamento real do progresso de vídeo com auto-conclusão em 85%.' },
      { id: 6, title: 'Compliance & Onboarding', description: 'Trilhas obrigatórias com prazo, dashboard de aderência (com exportação), onboarding auto-atribuído por cargo/departamento/cidade e lembretes automáticos (D-3 / D-1 / D0 / atraso).' },
    ],
    improvements: [
      { id: 1, category: 'Segurança de Audiência', description: 'Visibilidade de todo conteúdo (KB, trilhas, comunidade) imposta no servidor, com classes Interno / Externo / Ambos / Admin.' },
      { id: 2, category: 'Acesso Externo', description: 'Corretores e correspondentes sem conta Office entram via código de acesso (passwordless).' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.1',
    date: new Date('2026-05-10T00:00:00'),
    description: 'Financeiro: sincronização automática diária dos títulos do Sienge, sem busca manual.',
    type: 'minor',
    categories: ['backend', 'api', 'frontend'],
    features: [
      { id: 1, title: 'Auto-Sync Diário de Títulos', description: 'Títulos e custos do Sienge passam a ser sincronizados automaticamente todos os dias, sem precisar filtrar por empreendimento e período manualmente.' },
      { id: 2, title: 'Inscrição no Sync Diário', description: 'Empreendimentos podem ser marcados como recorrentes (estrela), agrupados por empresa, com disparo manual por centro de custo, empresa inteira ou todos.' },
      { id: 3, title: 'Status de Pagamento e Cancelamento', description: 'O sistema detecta automaticamente títulos pagos, parciais e cancelados e propaga o status para as despesas.' },
      { id: 4, title: 'Painel de Monitoramento (admin)', description: 'Tela de Auto-Sync com status por empreendimento, histórico de execuções e ação de limpar/repopular dados de um empreendimento.' },
    ],
    improvements: [
      { id: 1, category: 'Custos', description: 'Aplicação de departamento e categoria em uma única ação, separação dos cancelados no total, edição inline do nome do empreendimento e filtros padronizados.' },
      { id: 2, category: 'Despesas', description: 'Edição manual restrita a departamento, categoria e observação — o valor vem do Sienge como fonte da verdade.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.8.0',
    date: new Date('2026-05-08T00:00:00'),
    description: 'Central de notificações multicanal (in-app, e-mail e WhatsApp Business).',
    type: 'major',
    categories: ['backend', 'api', 'frontend'],
    features: [
      { id: 1, title: 'Central de Notificações', description: 'Ponto único de disparo de avisos com persistência, sino com contador, caixa de entrada completa e preferências por tipo e canal.' },
      { id: 2, title: 'WhatsApp Business (Cloud API)', description: 'Terceiro canal de notificação via WhatsApp, com número único do sistema, envio para o telefone do perfil (sem opt-in), templates aprovados na Meta e webhook de status e recebimento.' },
      { id: 3, title: 'Preferências por Usuário', description: 'Tela de preferências com switches in-app / e-mail / WhatsApp por tipo de notificação.' },
    ],
    improvements: [
      { id: 1, category: 'E-mails', description: 'Disparos de e-mail migrados para o serviço central de notificações, substituindo os envios diretos espalhados pelos controllers.' },
      { id: 2, category: 'Admin do WhatsApp', description: 'Painel administrativo do WhatsApp com configuração, templates, métricas e log de mensagens.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.7.2',
    date: new Date('2026-05-05T00:00:00'),
    description: 'Padronização visual de todo o sistema sobre um design system unificado.',
    type: 'minor',
    categories: ['frontend', 'mobile'],
    features: [],
    improvements: [
      { id: 1, category: 'Design System', description: 'Rollout de um design system unificado (componentes Surface, Badge, Input, Select, Modal, etc.) com tokens de cor e tipografia e suporte completo a modo claro/escuro.' },
      { id: 2, category: 'Refatoração de Layout', description: 'Padronização de layout e telas em Microsoft, Suporte, Documentação, Financeiro e Comercial.' },
      { id: 3, category: 'Responsividade', description: 'Telas e componentes revisados para melhor uso em dispositivos móveis.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.7.0',
    date: new Date('2026-04-27T00:00:00'),
    description: 'Lançamento da Eme, assistente de IA corporativa integrada ao Office.',
    type: 'major',
    categories: ['backend', 'api', 'frontend'],
    features: [
      { id: 1, title: 'Eme — Assistente de IA', description: 'Assistente conversacional integrada ao Office (Google Gemini com resposta em streaming e function calling), capaz de navegar pelo sistema, consultar dados e manter histórico de conversas.' },
      { id: 2, title: 'Player Flutuante', description: 'A Eme fica acessível em qualquer tela por um player flutuante, além da home dedicada.' },
      { id: 3, title: 'Respostas Ricas', description: 'Respostas em texto (markdown), tabelas e gráficos, além de ações de navegação assistida.' },
      { id: 4, title: 'Módulos Marketing & Comercial', description: 'Primeira fase com consulta de leads e eventos (Marketing) e de empreendimentos, unidades e MCMV com clima (Comercial).' },
      { id: 5, title: 'Feedback & Insights (admin)', description: 'Avaliação de respostas (joinha/deslike) e painel admin "Eme Insights" com estatísticas e o contexto completo das interações.' },
    ],
    improvements: [
      { id: 1, category: 'Seleção de Modelo (rápido/inteligente)', description: 'Escalonamento automático para um modelo mais capaz em perguntas complexas.' },
      { id: 2, category: 'Resiliência', description: 'Retentativa automática entre modelos e chaves em caso de falha, com limite de uso por usuário (rate limit) e cota de armazenamento por conversa.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.6.0',
    date: new Date('2026-04-23T00:00:00'),
    description: 'Primeira automação completa de pagamento via eCobrança com headless browser.',
    type: 'major',
    categories: ['backend', 'api'],
    features: [
      { id: 1, title: 'Automação eCobrança', description: 'Integração completa com o portal eCobrança via Playwright headless (Chromium). O sistema navega automaticamente no portal, cria o ticket, gera o boleto e captura os dados de retorno sem intervenção manual.' },
      { id: 2, title: 'Geração e Aceite de Boleto', description: 'Fluxo automatizado de geração de boleto com confirmação de aceite e envio de mensagem associada. O boleto concluído é vinculado ao lançamento de pagamento correspondente.' },
    ],
    improvements: [
      { id: 1, category: 'PaymentFlow', description: 'Pipeline de pagamento estendido com etapa de boleto eCobrança como passo final após emissão do título.' },
      { id: 2, category: 'Infraestrutura', description: 'Adicionado suporte a proxy e dependências Chromium no servidor para execução do headless browser em produção.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.7',
    date: new Date('2026-04-16T00:00:00'),
    description: 'Dashboard Vendas × Projeção com filtros por empresa e modo de meta configurável.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Filtro por Empresa no Dashboard de Vendas', description: 'Filtro do relatório Vendas × Projeção migrado de empreendimento para empresa, com toggle para agrupar por empreendimento ou empresa, alinhando com o painel de Faturamento.' },
      { id: 2, title: 'Modo de Meta por Empreendimento', description: 'Configuração de meta global (unidades ou VGV) com override individual por empreendimento. Administradores acessam via modal de configurações direto do dashboard. Persiste em localStorage.' },
      { id: 3, title: 'Modal de Comparação Realizado × Projetado', description: 'Ao clicar no empreendimento na tabela de projeção, abre modal com aba "Comparação" mostrando realizado vs projetado em unidades e VGV.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.6',
    date: new Date('2026-04-14T00:00:00'),
    description: 'Assinatura digital finalizada, módulo de Eventos e ajustes no PaymentFlow.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Assinatura Digital — Versão Final', description: 'Módulo de assinatura eletrônica de documentos concluído. Suporta fluxo completo com dois aprovadores, rastreamento de status (PENDING → SIGNED/CANCELLED/REJECTED/EXPIRED) e polling automático a cada 10 minutos.' },
      { id: 2, title: 'Fichas Comerciais — Aprovação por Assinatura', description: 'Fichas Comerciais integradas ao módulo de assinatura digital: submit gera SignatureDocument para os aprovadores configurados; ao assinar, ficha passa para status "approved" automaticamente.' },
      { id: 3, title: 'Módulo de Eventos', description: 'Gestão de eventos de marketing com upload de imagens direto ao Supabase, criação, edição e visualização de eventos por empreendimento.' },
    ],
    improvements: [
      { id: 1, category: 'PaymentFlow', description: 'Ajustes no fluxo e integração do PaymentFlow com melhorias na consulta e regras de validação.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.5',
    date: new Date('2026-04-10T00:00:00'),
    description: 'Assinatura digital v1 e Fichas Comerciais com condições mensais por empreendimento.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Assinatura Digital v1', description: 'Primeira versão funcional do módulo de assinatura eletrônica: upload de documentos PDF ao Supabase, criação de SignatureDocument com aprovadores, rastreamento de status e integração com schedulers.' },
      { id: 2, title: 'Fichas Comerciais', description: 'Novo módulo de condições comerciais mensais por empreendimento, substituindo planilhas Excel. Inclui módulos por etapa (idetapa CV), campanhas, distribuição de preços, regras de negociação e seção operacional (CEF/ITBI/cartório). RBAC: admin CRUD completo, usuário vê apenas fichas aprovadas.' },
      { id: 3, title: 'Fichas Comerciais — Auto-geração Mensal', description: 'Scheduler que gera automaticamente a ficha do mês seguinte no dia 1 às 1h para empreendimentos com ao menos 1 ficha aprovada no histórico.' },
    ],
    improvements: [
      { id: 1, category: 'Vendas × Projeção', description: 'Cruzamento de dados de vendas realizadas com projeção de metas, integrado ao novo dashboard comercial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.4',
    date: new Date('2026-04-08T00:00:00'),
    description: 'Novas funções de gerenciamento de senha para usuários.',
    type: 'patch',
    categories: ['frontend', 'backend', 'security'],
    features: [
      { id: 1, title: 'Novas Funções de Senha', description: 'Expansão das funcionalidades de gerenciamento de senha: alteração de senha para usuários autenticados e recuperação via e-mail com token seguro.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.3',
    date: new Date('2026-04-02T00:00:00'),
    description: 'PaymentFlow com Playwright, RID integrado, filtros e ajustes no Sienge.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Playwright no PaymentFlow', description: 'Automação de etapas do Sienge via Playwright headless, utilizado nas etapas de criação de contrato e navegação no portal quando a API não é suficiente.' },
      { id: 2, title: 'RID integrado ao PaymentFlow', description: 'Fluxo de Solicitação de Cadastro de Fornecedor (RID) integrado diretamente no pipeline de pagamento: quando fornecedor não é encontrado no Sienge, notificação aparece no card do lançamento para abertura do modal de RID.' },
    ],
    improvements: [
      { id: 1, category: 'Sienge — Filtros e Queries', description: 'Ajustes nos filtros do PaymentFlow, queries otimizadas e regras de negócio revisadas para maior precisão nos resultados.' },
      { id: 2, category: 'Sienge — ParseObstit', description: 'Ajuste no parsing de obstáculos com validação de valores mínimos e máximos (min/max) para evitar lançamentos incorretos.' },
      { id: 3, category: 'SiengeCredentialsModal', description: 'Atualização do modal de credenciais Sienge com melhorias de UX no fluxo de configuração.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.2',
    date: new Date('2026-03-30T00:00:00'),
    description: 'PaymentFlow base e sistema de alçadas de aprovação.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'PaymentFlow — Fluxo Base', description: 'Lançamento do módulo de Fluxo de Pagamento com pipeline visual de 5 etapas: fornecedor → contrato → aditivo → medição → título. Integração com API Sienge para validação automática de cada etapa.' },
      { id: 2, title: 'Alçadas de Aprovação', description: 'Sistema de alçadas (limites de valor por nível hierárquico) integrado ao PaymentFlow. Define quais usuários/cargos podem aprovar lançamentos acima de determinados valores, garantindo controle financeiro por camadas.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.1',
    date: new Date('2026-03-24T00:00:00'),
    description: 'Módulo de Distratos e melhorias na Projeção de Vendas.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Módulo de Distratos', description: 'Nova página para gestão de distratos (cancelamentos de venda). Permite registrar, acompanhar e controlar cancelamentos de contratos de venda de imóveis diretamente no sistema, substituindo controle manual em planilhas.' },
      { id: 2, title: 'Projeção de Vendas — Atualização', description: 'Melhorias no módulo de projeção com dados mais precisos e novos filtros para acompanhamento de metas de venda por empreendimento.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.0',
    date: new Date('2026-03-23T00:00:00'),
    description: 'Ecossistema Microsoft 365 completo com IA embarcada.',
    type: 'major',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Microsoft Teams — Calendário Integrado', description: 'Calendário completo com visões Mês e Semana integrado ao Microsoft Teams. Mês responsivo com hover visual, chips compactos para reuniões sobrepostas, popup de overflow sem criar novo evento e cursor crosshair na semana. Semana com ghost de hover mostrando onde o evento será criado e snap automático a 30 minutos.' },
      { id: 2, title: 'Microsoft SharePoint — Gestão de Arquivos', description: 'Navegação completa por sites e drives do SharePoint com visualização em grid/lista. Preview inline de imagens, PDFs e documentos Office, download via proxy autenticado, upload com progresso, links de compartilhamento, renomeação, exclusão, movimentação e busca global.' },
      { id: 3, title: 'Transcrições em Tempo Real com IA', description: 'Gravação e transcrição em tempo real de reuniões presenciais usando Web Speech API. A transcrição persiste enquanto navega pelo sistema, com timer, visualização de ondas de áudio, pausar/retomar e relatório gerado por IA ao finalizar.' },
      { id: 4, title: 'Relatórios de Reuniões com IA', description: 'Geração automática de relatório estruturado (resumo, pontos-chave, decisões e próximos passos) para reuniões do Teams e reuniões presenciais, com envio direto por e-mail.' },
      { id: 5, title: 'Abrir Arquivos no Office Nativo', description: 'Suporte a protocol handlers do Microsoft Office (ms-word, ms-excel, ms-powerpoint) para abrir documentos diretamente no aplicativo desktop a partir do SharePoint.' },
    ],
    improvements: [
      { id: 1, category: 'SharePoint — Preview', description: 'Visualização de imagens com zoom via scroll/pinch, PDFs e documentos Office via Office Online Viewer embutido, com download nativo corrigido para cross-origin.' },
      { id: 2, category: 'Teams — Reuniões Presenciais', description: 'Modal de nova reunião presencial integrado na aba de transcrições, eliminando a necessidade de rota separada. Título, local e participantes configuráveis antes de iniciar.' },
      { id: 3, category: 'Calendário — Modo Claro/Escuro', description: 'Todos os componentes do ecossistema Microsoft com suporte completo a dark mode usando a paleta padrão do sistema.' },
    ],
    fixes: [
      { id: 1, description: 'Corrigido envio de e-mail no painel de relatórios (emit @email não propagado para Index.vue).' },
      { id: 2, description: 'Corrigido "Abrir no aplicativo" — Chrome bloqueava protocol handlers em iframe; substituído por <a>.click().' },
      { id: 3, description: 'Corrigido download de arquivos SharePoint que retornava apenas abertura em nova aba por falha de CORS; agora roteado via proxy autenticado do backend.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.3',
    date: new Date('2026-03-20T00:00:00'),
    description: 'Melhorias no módulo financeiro de despesas e contas.',
    type: 'patch',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Despesas e Contas — Novas Funcionalidades', description: 'Expansão do módulo Bills & Expenses com novas regras de lançamento, categorização e relatórios de despesas por período.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.2',
    date: new Date('2026-03-18T00:00:00'),
    description: 'Fluxo de pagamento Sienge e filtros de vendas.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Pipeline de Pagamento — Fluxo Sienge (RID)', description: 'Implementado fluxo completo de cadastro de fornecedor via RID no Sienge, com pipeline visual das etapas: validação → cadastro → aprovação → pagamento. Integração com a API do Sienge para acompanhar status em tempo real.' },
    ],
    improvements: [
      { id: 1, category: 'Relatório de Vendas', description: 'Adicionado filtro por URL de vendas para segmentação avançada de resultados no relatório comercial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.1',
    date: new Date('2026-03-09T00:00:00'),
    description: 'Recuperação e alteração de senha via email.',
    type: 'minor',
    categories: ['security'],
    features: [
      { id: 1, title: 'Alteração de senha', description: 'Alteração de senha para usuários logados e deslogados, usando notificações via email.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.0',
    date: new Date('2026-01-29T00:00:00'),
    description: 'Menin Academy, ajustes no reconhecimento facial e expansão financeira.',
    type: 'minor',
    categories: ['frontend', 'api', 'backend'],
    features: [
      { id: 1, title: 'Menin Academy', description: 'Lançamento da estrutura inicial do módulo educacional "Academy", incluindo login externo para alunos e layout dedicado para cursos e treinamentos.' },
      { id: 2, title: 'Reconhecimento Facial (Ajustes)', description: 'Refatoração do layout de cadastro facial para melhor usabilidade em dispositivos móveis e validação de imagem.' },
    ],
    improvements: [
      { id: 1, category: 'Infraestrutura', description: 'Padronização global de URLs e domínios da aplicação para melhorar SEO e segurança.' },
      { id: 2, category: 'Financeiro', description: 'Implementação inicial do módulo de Despesas e Contas (Bills & Expenses).' },
    ],
    fixes: [
      { id: 1, description: 'Correção no envio de e-mails transacionais (Email Sent Ajust).' },
      { id: 2, description: 'Ajuste de rotas internas para evitar conflitos na navegação.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.3.5',
    date: new Date('2026-01-09T00:00:00'),
    description: 'UX — Menu retrátil e melhorias na projeção.',
    type: 'patch',
    categories: ['frontend'],
    features: [
      { id: 1, title: 'UX - Menu Retrátil', description: 'Implementada funcionalidade de "Minimizar Menu" (Navbar Minimalize), aumentando a área útil de trabalho em telas menores.' },
    ],
    improvements: [
      { id: 1, category: 'Projeção de Vendas', description: 'Adicionado filtro de busca por Cidades na tabela de projeção.' },
      { id: 2, category: 'Layout', description: 'Melhoria no detalhamento das tabelas de projeção (Table Details).' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.3.0',
    date: new Date('2025-12-19T00:00:00'),
    description: 'Premiações, contratos digitais e viabilidade de marketing.',
    type: 'minor',
    categories: ['backend', 'frontend', 'mobile'],
    features: [
      { id: 1, title: 'Módulo de Premiações (Awards)', description: 'Início da implementação do sistema de gamificação e premiações para a equipe comercial.' },
      { id: 2, title: 'Gestão de Contratos (Store Contracts)', description: 'Novo fluxo para armazenamento e recuperação de contratos digitais.' },
      { id: 3, title: 'Viabilidade de Marketing', description: 'Ferramenta para análise de viabilidade de novos empreendimentos baseada em dados de marketing (Land Settings & Viability).' },
    ],
    improvements: [
      { id: 1, category: 'Financeiro', description: 'Gestão de Títulos e Custos operacionais adicionada ao painel administrativo.' },
      { id: 2, category: 'Repasse', description: 'Ajustes na lógica de repasse financeiro integrados à API.' },
    ],
    fixes: [
      { id: 1, description: 'Correção na seleção de departamentos e categorias financeiras.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.5',
    date: new Date('2025-11-27T00:00:00'),
    description: 'Posições, cidades e despesas de marketing.',
    type: 'patch',
    categories: ['frontend', 'api'],
    features: [
      { id: 1, title: 'Gestão de Posições e Cidades', description: 'Atualização robusta no gerenciamento de cargos (positions) e vinculação de usuários a cidades específicas.' },
      { id: 2, title: 'Despesas de Marketing', description: 'Nova tela para lançamento e acompanhamento de despesas exclusivas do setor de Marketing.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Correção crítica: Tela preta ao acessar a área de Favoritos (Login Black Screen Error).' },
      { id: 2, description: 'Ajuste no cálculo de comissão específico para o empreendimento "Parque das Flores".' },
      { id: 3, description: 'Correção de erro de agrupamento no relatório de faturamento.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.4',
    date: new Date('2025-11-11T00:00:00'),
    description: 'Organograma interativo e multiselector para projeções.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Organograma Interativo', description: 'Novo visualizador de hierarquia corporativa (Organogram) integrado aos perfis de usuário.' },
      { id: 2, title: 'Multiselector para Projeções', description: 'Capacidade de selecionar múltiplos empreendimentos simultaneamente para criação de projeções de vendas.' },
    ],
    improvements: [
      { id: 1, category: 'Regras de Venda', description: 'Refinamento das regras de validação para novas vendas (Sales Ajust Rules).' },
      { id: 2, category: 'Workflow', description: 'Melhorias no fluxo de trabalho de grupos de venda.' },
    ],
    fixes: [
      { id: 1, description: 'Ajustes nas rotas de autenticação do validador.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.3',
    date: new Date('2025-10-30T00:00:00'),
    description: 'Sistema gerencial de Projeção de Vendas.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Sistema gerencial de Projeção de Vendas', description: 'Criado um sistema de gerenciamento de metas por empreendimento, com criação, adição, exclusão e revisões de projeção.' },
    ],
    improvements: [
      { id: 1, category: 'Comercial - Projeção de Vendas', description: 'Criada tela para novo relatório gerencial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.2',
    date: new Date('2025-10-29T00:00:00'),
    description: 'Gerenciamento global de cidades CRM × ERP.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Gerenciamento Global de Cidades CRM × ERP', description: 'Adicionado um gerenciamento global de cidades e empreendimentos do CV CRM e Sienge, vinculando + 2000 centros de custos e + 20 empreendimentos do CRM, agora podendo gerenciar e vincular a cidades, que são vinculadas a usuários limitando a visualização permitida.' },
    ],
    improvements: [
      { id: 1, category: 'Relatórios de Leads', description: 'Adaptado relatório de Leads para novo gerenciamento de cidades.' },
      { id: 2, category: 'Relatórios de Faturamento', description: 'Adaptado relatório de Faturamento para novo gerenciamento de cidades.' },
      { id: 3, category: 'Relatórios de Eventos', description: 'Adaptado Eventos para visualização com novo gerenciamento de cidades.' },
      { id: 4, category: 'Relatórios de Empreendimentos', description: 'Adaptado Empreendimentos para visualização com novo gerenciamento de cidades.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.1',
    date: new Date('2025-10-28T00:00:00'),
    description: 'Reconhecimento facial e melhorias no organograma.',
    type: 'minor',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Reconhecimento Facial', description: 'Reconhecimento facial vinculado na aba de perfil, podendo ativar, reativar e recadastrar.' },
    ],
    improvements: [
      { id: 1, category: 'Perfil de usuários', description: 'Ajuste no layout no perfil de usuário.' },
      { id: 2, category: 'Perfil de usuários', description: 'Ajuste no layout da aba de usuários.' },
      { id: 3, category: 'Organograma', description: 'Ajuste na regra de "manager" para vincular superior e hierarquia de usuários.' },
      { id: 4, category: 'Organograma', description: 'Ajustado componente de hierarquia para visualização de usuários do sistema.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.0',
    date: new Date('2025-10-23T00:00:00'),
    description: 'Refaturação completa do dashboard de vendas.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [
      { id: 1, title: 'Refaturação do Dashboard', description: 'Reformulado todo o dashboard de vendas para novas funcionalidades e visualizações.' },
      { id: 2, title: 'Contagem de Mês', description: 'Adicionado contador de tempo para fechamento do mês na tela inicial.' },
      { id: 3, title: 'Card de Leads', description: 'Criado card com gráfico e detalhes sobre leads para pré-visualização no dashboard.' },
      { id: 4, title: 'Card de Validações', description: 'Criado card com gráfico e detalhes sobre as validações para pré-visualização no dashboard.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.9',
    date: new Date('2025-10-03T00:00:00'),
    description: 'Sistema de tickets e configuração de "Reports".',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Configuração de envio de "Reports" para erros no sistema e suporte', description: 'Formulário de suporte/reporte de problemas vinculado a nova funcionalidade de disparos, ajustada lógica para resposta e atualização contínua do suporte.' },
      { id: 2, title: 'Painel de Tickets', description: 'Desenvolvido painel de tickets para acompanhamento dos tickets abertos pelos usuários.' },
    ],
    improvements: [
      { id: 1, category: 'Eventos', description: 'Ajuste no disparo de eventos para seleção de usuários por nome, cargo (Ex: Marketing — todos usuários mkt) e e-mails externos.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.8',
    date: new Date('2025-09-30T00:00:00'),
    description: 'Ajuste de e-mail para notificações via sistema@menin.com.br.',
    type: 'patch',
    categories: ['api', 'backend'],
    features: [
      { id: 1, title: 'Ajuste de E-mail para notificações do sistema', description: 'Não é possível o envio de e-mails a partir de "comercial@menin.com.br". Solicitado um e-mail para notificações internas, utilizado o novo "sistema@menin.com.br" nas notificações.' },
    ],
    improvements: [
      { id: 1, category: 'Controladores', description: 'Feita toda estrutura de mensagens para notificação via e-mail para Eventos e disponível para expansão em outros módulos.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.7',
    date: new Date('2025-09-22T00:00:00'),
    description: 'Relatório Leads × Vendas com banco de dados Menin.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Relatório Leads × Vendas via Banco de Dados Menin', description: 'Ajustadas todas funcionalidades definidas para o relatório, agora contando com busca e filtros detalhados, vínculo entre CV e Sienge corretor, valores ajustados para VGV do comercial, sendo "VGV" e "VGV+DC" o valor somado o DC (Desconto Construtora).' },
    ],
    improvements: [
      { id: 1, category: 'Relatórios', description: 'Agora contando com 3 tipos de relatórios podendo ser Listagem, Pizza ou Barra, relatórios reativos e que acompanham a busca do usuário, com dados detalhados e precisos automaticamente.' },
    ],
    fixes: [
      { id: 1, description: 'Ajuste na sincronia e dados da API, pego junto das vendas do Sienge: REPASSE, RESERVA e demais itens do cliente no CV.' },
      { id: 2, description: 'Corrigido problema de CM (Comissão) que não entrava no contrato Sienge do residencial Verona; criada regra de adição de 4% no VGV das vendas até determinado período.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.6',
    date: new Date('2025-09-04T00:00:00'),
    description: 'Vínculo de corretores CV × Sienge.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Envio de Corretores para Sienge ou Junção de dados', description: 'Definido vínculo entre corretores no CV e dados do Sienge; impossibilitada conexão de dados internamente, feito vínculo somente no relatório de vendas com base na unidade vendida.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Ajuste na sincronia e dados da API, pego junto das vendas do Sienge: REPASSE, RESERVA e demais itens do cliente no CV.' },
      { id: 2, description: 'Corrigido problema de TR (Terreno) que não era retornado na API; feito vínculo de backup com o Banco de dados externo BI.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.5',
    date: new Date('2025-08-22T00:00:00'),
    description: 'Tela de relatório com dados Sienge em tempo real.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Tela de relatório e filtros personalizados', description: 'Tela de listagem para relatório de vendas com dados de faturamento em tempo real do Sienge.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Getters de API e correlação entre contratos Sienge × CV.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.4',
    date: new Date('2025-08-08T00:00:00'),
    description: 'Parametrização de abas e limpeza de desempenho.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [
      { id: 1, title: 'Parametrização de abas do sistema, limpeza de desempenho', description: 'Ajustado layout padrão e menu de navegação, ajustadas repetições desnecessárias para desempenho.' },
    ],
    improvements: [
      { id: 2, category: 'UX', description: 'Telas Responsivas, Gráficos Detalhados e Visual Design.' },
    ],
    fixes: [
      { id: 1, description: 'Responsividade geral do sistema em dispositivos móveis.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.3',
    date: new Date('2025-07-29T00:00:00'),
    description: 'Reportar problema adicionado.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [
      { id: 1, title: 'Reportar Problema adicionado', description: 'Interface de reporte criada e configuração de requisitos definida.' },
    ],
    improvements: [
      { id: 2, category: 'UX', description: 'Layout moderno e responsivo para nova página.' },
    ],
    fixes: [
      { id: 1, description: 'Ajuste de TimeZone no sistema por erros em UTF.' },
    ],
    breakingChanges: [],
    knownIssues: [
      { id: 1, description: 'Relatório ainda não funcional.', workaround: 'Formulário de suporte ainda em período de testes, pendente da atualização 2.1.5 para funcionamento completo.' },
    ],
  },
  {
    version: 'v2.1.2',
    date: new Date('2025-07-28T00:00:00'),
    description: 'Refaturação da barra de navegação.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [],
    improvements: [
      { id: 1, category: 'Barra de navegação', description: 'Refaturada toda barra de navegação, garantindo melhor funcionalidade nas abas de "Dropdown" e responsividade em dispositivos móveis.' },
    ],
    fixes: [
      { id: 1, description: 'Ajustado erro ao abrir e fechar item da barra de navegação.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.0',
    date: new Date('2025-06-27T00:00:00'),
    description: 'Validador de documentos com IA.',
    type: 'minor',
    categories: ['backend', 'frontend', 'api'],
    features: [
      { id: 1, title: 'Validador de documentos', description: 'Agente de IA validador de contratos CEF + Confissão de Dívida Menin.' },
      { id: 2, title: 'Automação de Contratos', description: 'Automação de varredura do CV CRM que pega os clientes pendentes de validação, envia para o agente de IA e retorna o status automaticamente.' },
      { id: 3, title: 'Ferramentas - Validador', description: 'Novo campo criado para visualizar e gerenciar contratos em validação, com validador integrado e histórico de uso da automação.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Ajuste de responsividade nas telas do validador e correção no prompt do agente, para garantir mais assertividade nas conferências.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.0.0',
    date: new Date('2025-06-03T00:00:00'),
    description: 'Migração para servidor dedicado Railway.',
    type: 'major',
    categories: ['frontend', 'backend', 'api', 'security'],
    features: [],
    improvements: [
      { id: 1, category: 'Hospedagem', description: 'Alteração dos serviços de host para plataforma "railway" com servidor dedicado.' },
      { id: 2, category: 'Banco de dados', description: 'Banco de dados integrado no serviço "railway", limpeza dos dados anteriores para início do uso em produção.' },
    ],
    fixes: [],
    breakingChanges: [
      { id: 1, component: 'Servidor em testes', description: 'Novo servidor ainda em teste de performance e sofrendo oscilações.', migrationGuide: 'Em caso de problema, reportar erro no botão lateral do menu à esquerda.' },
    ],
    knownIssues: [],
  },
];
