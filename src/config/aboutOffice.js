/**
 * aboutOffice.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA do conteúdo das telas "Sobre o Office" (/sobre e /sobre/relatorio).
 *
 * O conteúdo vem do documento "Menin Office - Visão Executiva v11" (agosto/2026).
 * As duas telas leem daqui: o Mapa do Sistema monta a árvore a partir de
 * `officeMap`, e a Visão Executiva renderiza os blocos de `officeReport`.
 * Ao atualizar o documento, atualize AQUI - não duplique texto nas views.
 *
 * Números são os oficiais do relatório (medidos até 04/08/2026). Não recalcular.
 *
 * ─── Formato de `officeMap` ───────────────────────────────────────────────────
 *   t    título do nó
 *   s    (opcional) descrição de uma linha
 *   k    (opcional) selo curto: número, economia ou marca ("só no Office")
 *   acc  (opcional) cor de acento do ramo; herda do pai quando ausente
 *   c    (opcional) filhos
 *
 * ─── Formato de `officeReport` ────────────────────────────────────────────────
 *   Cada seção tem { id, title, icon, blocks[] }. Tipos de bloco:
 *   { type: 'p',      text }                     parágrafo
 *   { type: 'quote',  text }                     destaque com filete
 *   { type: 'kpis',   items: [{ v, l, s }] }     grade de números
 *   { type: 'table',  head: [], rows: [[]] }     tabela (vira cartão no celular)
 *   { type: 'list',   items: [] }                lista de tópicos
 *   { type: 'module', name, what, result, why, extra }   bloco de módulo
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Acentos por ramo. Cores fixas de identidade do mapa (não são tokens de tema):
// funcionam nos dois modos porque só aparecem em filete, ícone e selo.
export const MAP_ACCENTS = {
    modulos: '#2E75B6',
    integracoes: '#0F766E',
    ganhos: '#15803D',
    roadmap: '#6D28D9',
    tamanho: '#64748B',
};

export const officeMap = {
    t: 'Menin Office',
    s: 'A camada que une os sistemas da companhia: Microsoft 365, Sienge, CV CRM, Meta e WhatsApp sob as regras da Menin',
    c: [
        {
            t: 'Módulos e telas',
            s: '9 áreas e 54 itens de menu em produção, na mesma ordem em que aparecem no sistema. Comercial e Marketing produzem as informações que só existem no Office',
            acc: MAP_ACCENTS.modulos,
            c: [
                {
                    t: 'Comercial', s: 'O carro-chefe: 12 telas', c: [
                        { t: 'Faturamento', k: 'só no Office', s: 'Venda consolidada por empreendimento e empresa, VGV pela regra de cada um, mês fechado e auditável com histórico de versões' },
                        { t: 'Projeção', k: 'só no Office', s: 'Metas por empreendimento, com ticket médio, VGV projetado e estoque atual e futuro' },
                        { t: 'Vendas × Projeção', k: 'só no Office', s: 'Realizado contra projetado na mesma régua, porque meta e venda vivem no mesmo motor' },
                        { t: 'Pré-Cadastros', s: 'Da análise de crédito até a venda concretizada' },
                        { t: 'Reservas', s: 'Etapa da reserva, do repasse e situação de cada negociação' },
                        { t: 'Fichas Comerciais', s: 'Condições mensais por empreendimento, com assinatura eletrônica e biblioteca reaproveitável' },
                        { t: 'Minha Casa Minha Vida', s: 'Limites por município e faixa de renda, com importação da tabela oficial' },
                        { t: 'Grupos Workflow', s: 'Agrupamento das situações do CRM' },
                        { t: 'Empreendimentos', s: 'Cadastro em abas, etapas, unidades e tabelas de preço sincronizadas do ERP' },
                        { t: 'Imobiliárias', s: 'Cadastro por link público, sem digitação interna, com atalho para abrir no CV' },
                        { t: 'Correspondentes', s: 'Equipes e cadastros, importação em lote por colagem do WhatsApp com validação de CPF' },
                        { t: 'Cancelamentos', s: 'Exclui o contrato no ERP e devolve a unidade ao estoque, com o caso registrado' },
                    ],
                },
                {
                    t: 'Marketing', s: 'Segue o Comercial na produção do dado exclusivo', c: [
                        { t: 'Leads', k: 'só no Office', s: 'Cada lead ligado à campanha, mídia e investimento, com custo por lead real, funil e mapa de calor' },
                        { t: 'Eventos', s: 'Agenda por empreendimento, com relatório para o destinatário definido no cadastro' },
                        { t: 'Plano de Eventos', k: 'só no Office', s: 'Proposta mensal com itens e custo, autorização item a item podendo cortar valor, e mês consolidado' },
                        { t: 'Stand de Vendas', s: 'Modelos por faixa de valor e stands reais com custo de construção e manutenção ao vivo do Sienge' },
                        { t: 'Viabilidade', s: 'Teto de investimento por empreendimento (VGV × percentual), realizado, projetado e excedente da loja' },
                    ],
                },
                {
                    t: 'Financeiro', c: [
                        { t: 'Títulos', s: 'Contas a pagar lidas ao vivo da cópia do ERP' },
                        { t: 'Custos', s: 'Apuração em regime de caixa pelo valor líquido, com categoria e observação próprias' },
                        { t: 'Consulta de nº CEF', s: 'Número do contrato na instituição financeira, por empreendimento ou busca geral' },
                        { t: 'Boleto Caixa', s: 'Emissão, reemissão, baixa, anexo no CRM e envio ao cliente sem operador' },
                        { t: 'Fluxo de Pagamento', s: 'Esteira de lançamento automatizado no Sienge, com cadastro de fornecedor' },
                    ],
                },
                {
                    t: 'Ferramentas', s: 'Transversais: servem qualquer área', c: [
                        { t: 'Checklists', s: 'Substituiu o Planner: modelos, painel, minhas tarefas e régua de cobrança automática' },
                        { t: 'Relatórios', k: 'só no Office', s: 'Montados conversando com a Eme, com filtro interativo, dado ao vivo, link público ou privado e exportação' },
                        { t: 'Validador', s: 'Contratos e repasses analisados por IA, com liberação ou bloqueio automático no CRM' },
                        { t: 'Aprovações', s: 'Pedido vira protocolo, decisão pelo WhatsApp e PDF de autorização' },
                    ],
                },
                {
                    t: 'Academy', s: 'Conhecimento e treinamento da casa', c: [
                        { t: 'Base de Conhecimento', s: 'Procedimentos do Comercial e do Sienge, tutoriais do CV em vídeo, tudo pesquisável' },
                        { t: 'Trilhas', s: 'Ensino para gestores, administrativos e parceiros externos' },
                        { t: 'Painel', s: 'Destaques, nível e conquistas de quem estuda' },
                        { t: 'Certificado com QR', s: 'Verificação pública de autenticidade, sem precisar de login' },
                    ],
                },
                {
                    t: 'Central Microsoft', c: [
                        { t: 'Agenda e reuniões', s: 'Compromissos do Teams em um painel, com aviso 15 minutos antes e visão pensada para o celular' },
                        { t: 'Transcrição e ata por IA', s: 'Resumo automático; a reunião presencial também pode ser gravada pelo sistema' },
                        { t: 'SharePoint e Planner', s: 'Arquivos e quadros acessíveis direto do sistema' },
                    ],
                },
                {
                    t: 'Meta e WhatsApp', c: [
                        { t: 'Central Meta', k: 'só no Office', s: 'Captação, campanhas, vínculos com o CV, formulários e credenciais em um hub único' },
                        { t: 'WhatsApp corporativo', s: 'Configuração, modelos, automações, gastos e mensagens, com a resposta voltando para dentro do sistema' },
                    ],
                },
                {
                    t: 'Eme, a IA da casa', s: 'Assistente em qualquer tela', c: [
                        { t: 'Responde com dado real', s: 'Todo número vem de consulta validada; se a resposta inventar, o sistema corrige antes de mostrar' },
                        { t: 'Respeita alçadas', s: 'A IA só enxerga o que o usuário poderia abrir na tela' },
                        { t: 'Mostra o que está fazendo', s: 'Linha do tempo da execução, streaming e botão de cancelar' },
                        { t: 'Cérebro da Eme', s: 'Regras, comportamento, glossário e relatórios configurados por tela, sem código' },
                        { t: 'Eme Atende', s: 'Atendimento de leads pelo WhatsApp, com tela de administração já no ar' },
                        { t: 'Independente de LLM', s: 'Roda sobre Gemini, OpenAI ou Anthropic sem reescrever o sistema' },
                    ],
                },
                {
                    t: 'Administração e acessos', c: [
                        {
                            t: 'Usuários e acessos', c: [
                                { t: 'Usuários e Organograma', s: 'Entrada padronizada e fila de aprovação de primeiro acesso' },
                                { t: 'Alçadas', s: 'Permissão por tela, empreendimento, cargo e departamento, com perfil vivo' },
                                { t: 'Departamentos e Empresas', s: 'Hierarquia da companhia e pareamento CRM × ERP' },
                                { t: 'Integridade', s: 'Varredura que confere rota, alçada e ferramenta da IA a cada subida' },
                            ],
                        },
                        {
                            t: 'Integrações e dados', c: [
                                { t: 'Backup Sienge', s: 'Cópia diária restaurada automaticamente, com acompanhamento' },
                                { t: 'DocuSign e Looqbox', s: 'Assinatura eletrônica e alimentação do BI configuradas por tela' },
                            ],
                        },
                        {
                            t: 'Comunicação', c: [
                                { t: 'Mural de Avisos', s: 'Comunicado interno com ciência registrada' },
                                { t: 'Notificações e Alertas', s: 'Preferência por canal e tipo, alerta por regra e compartilhamento' },
                                { t: 'Reportar Problema', s: 'Chamado interno com acompanhamento' },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            t: 'Integrações',
            s: '13 sistemas externos em uso, todos com o Office agindo dentro deles e não apenas consultando',
            acc: MAP_ACCENTS.integracoes,
            c: [
                { t: 'Microsoft 365', s: 'Login corporativo, agenda e reuniões do Teams, transcrições, SharePoint, foto e organograma da empresa' },
                { t: 'Sienge (API)', s: 'Contratos, títulos, custos, fornecedores e centros de custo; cria e exclui contrato quando a regra manda' },
                { t: 'Sienge (backup diário)', s: 'Dump do banco conferido por MD5 e restaurado em base própria: relatório pesado sem sobrecarregar o ERP' },
                { t: 'CV CRM', s: 'Espelha leads, reservas, pré-cadastros, repasses e unidades, devolve cadastros e reconfere toda gravação por leitura' },
                { t: 'Meta', s: 'Três frentes no mesmo App: WhatsApp corporativo, captação por Lead Ads e campanhas com custo por lead' },
                { t: 'Google Gemini', s: 'Motor da Eme: chat, relatórios, resumo de reunião, leitura de cartão CNPJ por imagem e busca semântica' },
                { t: 'Ecobrança Caixa', s: 'Robô que emite, reemite e dá baixa no boleto do ato direto no portal, sem operador' },
                { t: 'DocuSign', s: 'Assinatura eletrônica das fichas, com rastreio por assinante' },
                { t: 'Supabase e bucket próprio', s: 'Boletos, anexos e documentos assinados, com faxina automática; o custo de obra é publicado no bucket que alimenta o BI' },
                { t: 'E-mail corporativo', s: 'Aprovações, convites, senha provisória e relatórios saem do mesmo serviço de notificação' },
                { t: 'IBGE e Open-Meteo', s: 'Catálogo oficial de municípios (cidades, MCMV e alçadas) e clima no contexto comercial' },
            ],
        },
        {
            t: 'Ganhos verificados',
            s: 'Medidos nas telas do sistema, não são estimativas',
            acc: MAP_ACCENTS.ganhos,
            c: [
                { t: 'RD Station cortado', k: '+R$ 33 mil/ano', s: 'Captação virou da casa, lead vai direto ao CV classificado' },
                { t: 'Boleto do ato', k: 'R$ 70.971,59 pagos', s: '175 boletos, R$ 139.406,03 emitidos, evasão visível boleto a boleto' },
                { t: 'Validação do titular', k: '190 barradas', s: 'Boleto com dado errado não chega ao cliente' },
                { t: 'Cancelamento de reservas', k: '86% de sucesso', s: '36 casos em 13 dias, 31 unidades liberadas' },
                { t: 'Validação de contratos', k: '1.454 analisados', s: '232 erros impedidos de subir para assinatura' },
                { t: 'Imobiliárias', k: '29 em 18 dias', s: 'Todas por link, sobre base de 525 no CV' },
                { t: 'Tempo devolvido', k: '+300 horas', s: '1,5 mês de jornada; cerca de R$ 6.000, e contando' },
                { t: 'Banco de terceiro eliminado', k: 'R$ 300/mês', s: 'Leitura passou para a API oficial do Sienge' },
            ],
        },
        {
            t: 'O que vem a seguir',
            s: 'Base já construída: evoluir é incremental, não recomeço',
            acc: MAP_ACCENTS.roadmap,
            c: [
                {
                    t: 'Cobrança e relacionamento', k: '~R$ 246 mil/ano', c: [
                        { t: 'CUB substituída pela VAN', k: '~R$ 150 mil/ano', s: 'Maio custou R$ 13.293,36 só de envio; pela VAN, pouco mais de R$ 800' },
                        { t: 'Blip substituído', k: '~R$ 96 mil/ano', s: 'Cobrança e relacionamento no WhatsApp corporativo próprio' },
                        { t: 'Régua de cobrança completa', s: 'Automação do boleto do ato estendida às parcelas anteriores à Caixa' },
                    ],
                },
                {
                    t: 'Atendimento de leads por IA', k: '~R$ 86 mil/ano', c: [
                        { t: '2.000 leads por mês', s: 'Mercado cobra R$ 4,00 por lead; o Office fica abaixo de R$ 0,40' },
                        { t: 'Já em construção', s: 'Recebe o lead, informa pela ficha autorizada, qualifica e devolve ao CRM' },
                        { t: 'Venda assistida', s: 'Etapas iniciais da venda dentro das condições da ficha do mês' },
                    ],
                },
                {
                    t: 'Inadimplência e distratos', c: [
                        { t: 'Inadimplência', s: 'Motor de cálculo pronto e validado; falta a tela e a régua de tratativa' },
                        { t: 'Distratos', s: 'Fluxo completo com alçada, motivo e histórico; deixa de ser evento espalhado' },
                    ],
                },
                {
                    t: 'Planejamento financeiro', c: [
                        { t: 'Fluxo de caixa', s: 'Previsão de entrada por período, empreendimento e empresa' },
                        { t: 'Previsibilidade de gastos', s: 'Lógica da Viabilidade aplicada à empresa inteira' },
                        { t: 'Compras e insumos', s: 'Pedido e aprovação sobre a esteira de fornecedor já pronta' },
                    ],
                },
                {
                    t: 'Obra e pós-venda', c: [
                        { t: 'Evolução de obra', s: 'Integração com a engenharia, avanço publicado no site' },
                        { t: 'Assistência técnica', s: 'Chamado, manual do imóvel e chaves pelo Office' },
                    ],
                },
                {
                    t: 'Outras frentes', c: [
                        { t: 'Google Ads', s: 'No mesmo modelo da Meta, fechando o funil de mídia' },
                        { t: 'Academy aberto à rede', s: 'Corretores e imobiliárias com certificação' },
                        { t: 'Manutenção do stand', s: 'Percentual controlado na viabilidade com alertas' },
                    ],
                },
                { t: 'Potencial mapeado', k: '+R$ 330 mil/ano', s: 'Além dos R$ 33 mil já cortados; nada exige começar do zero' },
            ],
        },
        {
            t: 'Tamanho e princípios',
            s: 'A ordem de grandeza do sistema, contada no próprio código, e as regras da casa',
            acc: MAP_ACCENTS.tamanho,
            c: [
                {
                    t: 'Ordem de grandeza', c: [
                        { t: '105 telas navegáveis', k: '54 no menu', s: '77 no Office e 28 no Academy, em 9 áreas e 3 seções' },
                        { t: '34 rotinas automáticas', k: '33 no ar', s: 'Sincronizam CV e Sienge, emitem boleto, liberam unidade, geram ficha e fecham o mês' },
                        { t: '46 ferramentas da IA', s: 'Cada uma respeitando a alçada de quem perguntou' },
                        { t: '47 tipos de aviso', s: 'Em 3 canais: dentro do sistema, e-mail corporativo e WhatsApp' },
                        { t: '196 tabelas próprias', s: 'Além do espelho do CV e da cópia do Sienge' },
                        { t: '11 integrações externas', s: 'Sobre Node.js, Vue 3, Railway, Supabase e GitHub' },
                    ],
                },
                {
                    t: 'Ritmo de construção', c: [
                        { t: '1.037 entregas publicadas', s: 'Somando os dois repositórios desde outubro de 2024' },
                        { t: '22 meses de evolução', s: 'Sem nunca ter sido projeto priorizado' },
                        { t: 'Julho de 2026: 350 entregas', s: 'Um terço de tudo em um único mês' },
                    ],
                },
                {
                    t: 'Princípios', c: [
                        { t: 'Nada de script manual', s: '33 correções de estrutura se aplicam sozinhas a cada publicação' },
                        { t: 'Regra no banco, não no código', s: 'VGV, comissão, tetos e o comportamento da IA são editáveis por tela' },
                        { t: 'Toda tela ensina', s: 'Botão "Como usar" na linguagem do usuário final' },
                        { t: 'Feito para o celular', s: 'A diretoria acessa exclusivamente pelo celular; responsividade é requisito de aceite' },
                    ],
                },
                {
                    t: 'Segurança', c: [
                        { t: 'Acesso pela conta Microsoft', s: 'Desligou, o acesso morre junto; primeiro acesso nasce em fila de aprovação' },
                        { t: 'Reconhecimento facial', s: 'Segundo caminho de entrada, cadastrado pelo próprio usuário' },
                        { t: 'Três camadas de permissão', s: 'Tela, empreendimento e decisão; a mesma regra fecha menu, API e ferramentas da IA' },
                        { t: 'Credenciais criptografadas', s: 'Senha nunca reversível, webhook validado por assinatura, servidor recusa subir sem chave' },
                        { t: 'Links públicos controlados', s: 'Token, prazo, limite de uso, revogação e armadilha antirrobô' },
                        { t: 'Registro contínuo', s: 'Decisão com dono e data, trilha de quem exportou o quê, varredura de rotas a cada subida' },
                    ],
                },
            ],
        },
    ],
};

// Ferramentas e rotinas que o Office já substituiu SEM assinatura para cortar
// (o ganho aqui é a hora de trabalho, não a mensalidade). As que tinham custo
// mensal ficam no backend, em ASSUMPTIONS.recurringSavings, porque rendem
// economia por dia corrido. Alimentam o tooltip do cartão de economia.
export const replacedSystems = [
    { name: 'Microsoft Planner', by: 'Checklists' },
    { name: 'Portal externo de emissão de boleto', by: 'Boleto Caixa' },
    { name: 'Planilha de condições comerciais', by: 'Fichas Comerciais' },
    { name: 'Planilha de projeção de vendas', by: 'Projeção e Vendas × Metas' },
    { name: 'Ata de reunião escrita à mão', by: 'Central Microsoft' },
];

// Números de topo, usados na abertura das duas telas.
export const officeHighlights = [
    { v: '+R$ 33 mil', l: 'por ano já economizados', s: 'RD Station substituído por completo' },
    { v: '+R$ 330 mil', l: 'por ano mapeados', s: 'Blip, CUB e atendimento de leads por IA' },
    { v: '+300 h', l: 'de trabalho manual devolvidas', s: '1,5 mês de jornada, e contando' },
    { v: '105', l: 'telas em produção', s: '9 módulos, 34 rotinas automáticas e 46 ferramentas de IA' },
];

export const officeReport = [
    {
        id: 'resumo',
        title: 'O Office em uma página',
        icon: 'fas fa-location-crosshairs',
        blocks: [
            { type: 'p', text: 'O Menin Office é o sistema próprio da Menin. Ele une, em uma camada única, as plataformas que a empresa já usa - Microsoft 365, Sienge, CV CRM, Meta e WhatsApp -, aplica as regras da casa sobre elas e transforma dado disperso em decisão, automação e relatório.' },
            { type: 'p', text: 'Começou há mais de um ano como ferramenta de apoio ao meu próprio trabalho, sem nunca ter sido projeto priorizado: cresceu nas brechas, resolvendo uma dor de cada vez. Mesmo assim, virou a camada operacional da companhia.' },
            { type: 'quote', text: 'Este documento descreve o que um projeto secundário já entrega. A pergunta que ele coloca é outra: o quanto passa a entregar quando for foco.' },
            {
                type: 'table',
                caption: 'O que só o Office cria. O carro-chefe é o Comercial, seguido do Marketing: as informações abaixo não existem prontas em nenhum sistema da empresa.',
                head: ['Informação que só existe no Office', 'O que ela entrega'],
                rows: [
                    ['Relatório de vendas', 'A venda consolidada por empreendimento e empresa, com VGV calculado pela regra de cada empreendimento (terreno, desconto construtora, comissão apartada, divisão de empresas), mês fechado auditável. O Sienge guarda o contrato e o CV guarda a reserva e o repasse: o número de venda da empresa só existe aqui'],
                    ['Relatório gerencial de metas', 'A projeção de vendas por empreendimento, com ticket médio e VGV projetado, viabilidade de marketing, estoque atual e futuro. Meta não existe nem no CRM nem no ERP'],
                    ['Vendas × Metas', 'Realizado contra projetado na mesma régua, por empresa e por empreendimento. Só é possível porque meta e venda vivem no mesmo motor'],
                    ['Atendimento e situação', 'Leads, etapa da reserva, etapa do repasse, pré-cadastro e situação de cada negociação em um painel descomplicado'],
                    ['Leads e leads por origem', 'Cada lead ligado à campanha, mídia e investimento que o gerou, com custo por lead real. O CV mostra o lead e a Meta mostra o anúncio: o cruzamento é do Office'],
                    ['Eventos de marketing', 'Agenda, itens, custo estimado e aprovação, cronograma de eventos e mês consolidado em um único lugar'],
                ],
            },
            {
                type: 'kpis',
                items: [
                    { v: '+R$ 33 mil/ano', l: 'Economia já realizada', s: 'Substituição completa do RD Station (migrado há 3 meses)' },
                    { v: '+R$ 330 mil/ano', l: 'Economia mapeada', s: 'Blip, CUB e atendimento de leads por IA' },
                    { v: 'R$ 70.971,59', l: 'Arrecadado pelo boleto do ato', s: 'Emissão, baixa e controle 100% internos' },
                    { v: '1.454', l: 'Contratos validados por IA', s: '232 erros impedidos de subir para assinatura' },
                    { v: '31', l: 'Unidades liberadas', s: 'Com segurança e agilidade, em 13 dias' },
                    { v: '+300 horas', l: 'De trabalho manual', s: 'Economizadas com automações, e contando' },
                ],
            },
            {
                type: 'table',
                caption: 'Do que o sistema é capaz, em uma linha cada.',
                head: ['Capacidade', 'O que já está no ar'],
                rows: [
                    ['Inteligência artificial própria', 'Responde com dado real e validado, respeita a permissão de quem pergunta, monta relatório por conversa e resume reunião'],
                    ['Segurança e alçadas', 'Permissão em camadas por tela, empreendimento, cargo e departamento, com gestão de usuários pela tela'],
                    ['Backup do ERP', 'Cópia diária do Sienge conferida por MD5 e restaurada automaticamente, sustentando os dados internos e o BI'],
                    ['Custo de obra', 'Planilha de controle publicada automaticamente no bucket que alimenta o BI, sem exportação manual'],
                    ['Microsoft 365', 'Teams, SharePoint, Planner, agenda, reuniões, gravação, transcrição e ata gerada automaticamente, inclusive de reunião presencial'],
                    ['Meta', 'Contas, campanhas, investimento, custo por lead e a captação que substituiu o RD Station'],
                    ['WhatsApp', 'Alertas, cobrança, boleto com PDF e aprovação com botão, com a resposta voltando para dentro do sistema'],
                    ['Relatórios gerenciais', 'Montados conversando com a assistente, com filtro interativo e dado ao vivo; todo dado vindo de consulta vira relatório, comparativo e link público ou privado'],
                    ['Validador', 'Análise de contratos e repasses por IA, com aprovação e liberação ou bloqueio automático no CRM'],
                    ['Academy', 'Base de conhecimento, procedimentos, treinamentos e trilhas para gestores, administrativos e parceiros externos, com certificado verificável por QR code'],
                    ['Assinatura eletrônica', 'DocuSign integrado para fichas e aprovações'],
                    ['Entrada no sistema', 'Conta Microsoft da empresa, com reconhecimento facial como segundo caminho e fila de aprovação no primeiro acesso'],
                    ['Automação', '34 rotinas automáticas, 33 delas no ar, que emitem boleto, liberam unidade, geram ficha comercial, fecham o mês e sincronizam CV e Sienge sozinhas'],
                ],
            },
        ],
    },
    {
        id: 'ganhos',
        title: 'Ganhos verificados',
        icon: 'fas fa-circle-check',
        blocks: [
            { type: 'p', text: 'Medidos nas telas do próprio sistema, no acumulado até 4 de agosto de 2026. Não são estimativas.' },
            {
                type: 'table',
                caption: 'O que a automação já produziu.',
                head: ['Frente', 'Volume', 'O que significa'],
                rows: [
                    ['Boleto do ato', '175 boletos, R$ 139.406,03 emitidos', 'R$ 70.971,59 já pagos. Pela primeira vez a empresa enxerga R$ 47.296,00 em aberto e 15,4% de evasão, boleto a boleto'],
                    ['Validação do titular', '190 emissões barradas antes de sair', 'Boleto com dado errado não chega ao cliente: o motivo volta à reserva, campo a campo'],
                    ['Cancelamento de reservas', '36 casos em 13 dias, 86% de sucesso', 'A unidade é liberada corretamente e volta ao estoque na hora; 5 contratos excluídos no Sienge, 4 casos para conferência humana'],
                    ['Cadastro de imobiliárias', '29 parceiras em 18 dias, todas por link', 'Nenhuma digitação interna, sobre uma base de 525 imobiliárias no CV'],
                    ['Validação de contratos', '1.454 contratos analisados', '1.222 aprovados e 232 reprovados antes de seguir, com a etapa liberada automaticamente no CRM'],
                ],
            },
            {
                type: 'table',
                caption: 'Tempo devolvido, em dinheiro.',
                head: ['Frente', 'Casos', 'Premissa', 'Tempo'],
                rows: [
                    ['Validação de contratos', '1.454', '10 min', '243 h'],
                    ['Emissão e envio do boleto do ato', '175', '15 min', '42 h'],
                    ['Tratativa de dado inválido do titular', '190', '5 min', '15 h'],
                    ['Cadastro de imobiliária no CV', '29', '15 min', '8 h'],
                    ['Cancelamento de reserva no CRM e no ERP', '36', '10 min', '6 h'],
                    ['Total', '1.884', '', '+300 h'],
                ],
            },
            { type: 'p', text: 'As 300 horas equivalem a 1,5 mês de jornada integral de um colaborador. A hora de um analista em custo médio de R$ 19,32 faz essas horas valerem cerca de R$ 6.000,00 em automações, e contando.' },
            { type: 'p', text: 'Automação não corta uma despesa uma vez: ela deixa de gerar custo e passa a gerar economia. As mesmas horas voltariam a ser pagas a cada novo ciclo de contratos, boletos e cadastros. Aqui elas não voltam, e o valor cresce sozinho a cada período.' },
            {
                type: 'table',
                caption: 'Economia direta.',
                head: ['Frente', 'Economia'],
                rows: [
                    ['RD Station', 'Mais de R$ 33 mil por ano eliminados. Era intermediário puro, sem ninguém operando; a captação virou da casa, com o lead indo direto ao CV já classificado'],
                    ['Banco de dados de terceiro', 'Dependência eliminada de R$ 300,00 mensais. A leitura passou para a API oficial do Sienge'],
                ],
            },
        ],
    },
    {
        id: 'modulos',
        title: 'Os módulos',
        icon: 'fas fa-layer-group',
        blocks: [
            { type: 'p', text: 'Todos em produção e em uso real: o que é, o que entrega e por que existe.' },
            {
                type: 'module', name: 'Comercial',
                what: 'Faturamento, Projeção, Fichas Comerciais, Empreendimentos, Imobiliárias, Correspondentes e Cancelamento de Reservas.',
                result: 'Meta e realizado saem do mesmo motor, com regras de VGV e comissão configuráveis em tela. O mês fechado é auditável. A unidade cancelada volta ao estoque com segurança e o cadastro de parceiro deixou de ser redigitação.',
                why: 'As condições viviam em planilha, existiam dois números de realizado divergentes, e o cancelamento no CRM não removia o contrato no ERP, prendendo a unidade.',
            },
            {
                type: 'module', name: 'Marketing',
                what: 'Central Meta com captação, campanhas, vínculos e formulários, mais Viabilidade, Stand de Vendas, Eventos e o novo Plano de Eventos.',
                result: 'A captação virou da casa e o RD Station foi cortado. Campanha, investimento e custo por lead no mesmo lugar; o investimento passou a ter teto, realizado e projeção por empreendimento, no formato que a diretoria lê.',
                extra: 'O Plano de Eventos leva o planejamento do mês para dentro do sistema: o gestor propõe os eventos com itens e custo estimado, a aprovação decide item a item (pode cortar um item ou reduzir o valor), o evento aprovado nasce na agenda e o mês fecha com lista de compras consolidada.',
                why: 'Era um intermediário pago sem ninguém operando, e não havia como responder quanto se pode gastar de marketing em um empreendimento específico. E nenhuma ferramenta existente permitia aprovar um evento cortando itens ou valor.',
            },
            {
                type: 'module', name: 'Financeiro',
                what: 'Títulos e Custos em contas a pagar, Consulta de número CEF e Boleto Caixa em contas a receber, e o Fluxo de Pagamento no Sienge.',
                result: 'Leitura ao vivo da cópia do ERP, sem sincronização própria para quebrar. Custo apurado em regime de caixa pelo valor líquido. Emissão, anexo no CRM e envio do boleto ao cliente sem operador.',
                why: 'A consulta crua do ERP dobrava o custo de medição, o boleto do ato era emitido à mão em portal externo e o número da instituição financeira não era exposto em tela nenhuma.',
            },
            {
                type: 'module', name: 'Ferramentas',
                what: 'Checklists, Aprovações, Relatórios, Validador, Mural de Avisos e Alertas: transversais, servem qualquer área.',
                result: 'O checklist substituiu o Planner, com biblioteca de modelos, painel e régua de cobrança configurável. O pedido virou protocolo com decisão pelo WhatsApp e PDF de autorização. O comunicado obrigatório tem ciência registrada. O relatório da Eme ganhou filtro interativo, dado ao vivo e exportação.',
                why: 'O Planner era inviável com dezenas de checklists simultâneos, e o pedido de verba circulava por mensagem solta, sem protocolo nem registro.',
            },
            {
                type: 'module', name: 'Central Microsoft',
                what: 'Agenda, reuniões, gravações, transcrições e atas, SharePoint e Planner reunidos dentro do Office.',
                result: 'A ata deixou de depender de alguém escrever: transcrição disponível e resumo automático, com aviso 15 minutos antes de cada reunião.',
                why: 'A empresa já vive no Microsoft 365, mas agenda, gravação e arquivo ficavam em lugares diferentes e o registro dependia de disciplina individual.',
            },
            {
                type: 'module', name: 'Academy',
                what: 'Base de conhecimento e trilhas de aprendizagem dentro do Office.',
                result: 'Procedimentos do Comercial e do Sienge, tutoriais do CV em vídeo, ITBI, confissão de dívida, período contábil, reembolso e cadastro de fornecedor publicados e pesquisáveis, com visibilidade por departamento, usados no treinamento e na introdução de novos colaboradores, sejam gestores, administrativos ou parceiros externos.',
                why: 'O conhecimento estava em PDF antigo, espalhado em pasta e na cabeça de poucas pessoas. Agora a resposta é encontrável, e a assistente aponta o procedimento certo no chat.',
            },
            {
                type: 'module', name: 'Eme, a inteligência artificial da casa',
                what: 'A assistente do Office, na tela inicial e em um player flutuante em qualquer tela. Mais que um agente: um padrão de comportamento e governança próprio, que não depende de uma LLM específica (pode rodar sobre Gemini, OpenAI ou Anthropic) e conhece cada dia mais sobre a empresa.',
                result: 'Leads, empreendimentos, fichas, campanhas, custos, boletos, projeções, checklists e vendas consolidadas respondidos sem abrir tela nenhuma. Se a resposta citar número que não veio da consulta, o sistema corrige e evita informação incoerente ou não validada.',
                why: 'Para tirar a informação da fila de pedidos. E porque assistente que responde de memória é risco: aqui todo número vem de consulta, e a consulta respeita a permissão de quem perguntou.',
            },
            {
                type: 'module', name: 'Administração e acessos',
                what: 'Usuários, Organograma, Departamentos, Empresas, Alçadas, Integridade, Backup do Sienge e as configurações das integrações.',
                result: 'Concessão e revogação de acesso, entrada de pessoas padronizada e segurança das rotas verificada por rotina, não por memória.',
                why: 'O acesso era amplo demais e dependia de burocracia; hoje existe a árvore de todo o departamento com sua hierarquia e a gestão completa de todos.',
            },
            {
                type: 'list',
                caption: 'Também no ar, e pouco divulgado',
                items: [
                    'Reconhecimento facial como segundo caminho de entrada, cadastrado pelo próprio usuário e administrado pelo admin.',
                    'Minha Casa Minha Vida: limites por município e faixa de renda, com importação da tabela oficial e catálogo de cidades do IBGE.',
                    'Correspondentes: equipes e cadastros com importação em lote por colagem do WhatsApp, validação de CPF e link público de auto-cadastro.',
                    'Certificado do Academy com verificação pública por QR code, sem exigir login de quem confere.',
                    'Gravação e ata de reunião presencial dentro do sistema, além das reuniões do Teams.',
                    'Busca global com atalho de teclado, favoritos de tela na barra lateral e tema claro ou escuro.',
                    'Suporte interno: "Reportar Problema" com acompanhamento do chamado e tela de gestão.',
                    'Trilha de exportações: registro de quem exportou o quê, com preferências lembradas por relatório.',
                    'Páginas públicas em lp.menin.com.br para cadastro de imobiliária e de correspondente, com token, prazo e limite de uso.',
                    'Recarga automática do navegador quando o usuário está com uma versão antiga do sistema aberta.',
                ],
            },
        ],
    },
    {
        id: 'roadmap',
        title: 'O que vem a seguir',
        icon: 'fas fa-arrow-trend-up',
        blocks: [
            { type: 'p', text: 'As frentes abaixo já têm base construída: integração ativa com CV CRM, Sienge, Meta, WhatsApp e Microsoft 365, notificação em três canais, alçadas por empreendimento e inteligência artificial com acesso controlado. Construir sobre isso é incremental, não recomeço. A variável não é a tecnologia: é o tempo dedicado.' },
            {
                type: 'list', caption: 'Cobrança e relacionamento com o cliente', items: [
                    'Régua de cobrança completa: a mesma automação do boleto do ato estendida a todas as parcelas anteriores à assinatura com a Caixa, o período em que a cobrança hoje depende de esforço manual ou custo percentual sobre valores pagos.',
                    'VAN de pagamento pelo Sienge: registro e baixa de boleto direto pela VAN, dentro do ERP, da mesma forma que a ferramenta CUB, mas sem o custo sobre valor pago e sim somente do disparo da mensagem.',
                    'WhatsApp corporativo na cobrança: o canal que já envia boleto com PDF e aprovação com botão poderia ser estendido para cobrança e relacionamento no Contas a Receber, substituindo o BlipDesk.',
                ],
            },
            {
                type: 'table',
                head: ['Ferramenta atual', 'Custo hoje', 'O que o Office faria'],
                rows: [
                    ['Blip, no Contas a Receber e Assistência técnica', 'Cerca de R$ 8 mil por mês, R$ 96 mil por ano', 'Cobrança e relacionamento pelo WhatsApp corporativo que o sistema já opera, com histórico dentro do Office'],
                    ['CUB, gestão de pagamento', 'Percentual sobre cada boleto. Só em maio de 2026 foram R$ 13.293,36 apenas pelo envio', 'O mesmo volume via VAN direto pelo Sienge sairia por pouco mais de R$ 800'],
                ],
            },
            { type: 'p', text: 'A CUB sozinha custou R$ 13.293,36 em maio apenas para enviar boletos: pelo Office, pouco mais de R$ 800, cerca de R$ 150 mil por ano de diferença. Somando o Blip, são aproximadamente R$ 246 mil por ano em tarifas mapeadas, além dos R$ 33 mil do RD Station já cortados.' },
            {
                type: 'list', caption: 'Inadimplência, carteira e distratos', items: [
                    'Gestão de inadimplência pela área comercial: o motor de cálculo já existe, validado e corrigido. Falta a tela e a régua de tratativa, conduzidas pela gestão comercial em vez de relatório passivo.',
                    'Gestão de distratos: o cancelamento automático já devolve a unidade ao estoque; a evolução é o fluxo completo do distrato dentro do Office (solicitação, aprovação por alçada, registro do motivo e das condições de devolução), alimentando o indicador que o Faturamento já exibe. O distrato deixa de ser um evento espalhado entre CRM, ERP e conversas, e vira um processo com dono, prazo e histórico.',
                ],
            },
            {
                type: 'list', caption: 'Planejamento financeiro', items: [
                    'Fluxo de caixa no Contas a Receber: previsão de entrada por período, empreendimento e empresa, a partir dos títulos que o sistema já lê.',
                    'Previsibilidade de gastos no Contas a Pagar: a lógica de teto, realizado e projetado da Viabilidade aplicada à empresa inteira, não só ao marketing.',
                    'Insumos e solicitações de compra: pedido, aprovação e acompanhamento dentro do Office, sobre o módulo de Aprovações e a esteira de fornecedor já prontos.',
                ],
            },
            { type: 'p', text: 'Atendimento de leads por IA é a frente de maior alavancagem do roadmap. A empresa recebe em média 2.000 leads por mês, e o mercado cobra caro para atendê-los com IA: ferramentas como a Lais.AI custam cerca de R$ 4,00 por lead atendido, R$ 8 mil por mês nesse volume.' },
            {
                type: 'list', items: [
                    'Atendimento automático de leads, já em construção: recebe o lead, informa a partir da ficha comercial autorizada, qualifica e devolve ao CRM. Falta ativar em modo de teste.',
                    'Custo por atendimento no Office: a conversa roda no WhatsApp corporativo que o sistema já opera. A mensagem de abertura pela Meta custa centavos, as respostas dentro da janela de 24 horas são gratuitas e o processamento de IA custa frações de centavo por mensagem. A estimativa conservadora fica abaixo de R$ 0,40 por lead atendido, dez vezes menos que o mercado.',
                    'Venda assistida: validado o atendimento, conduzir as etapas iniciais da venda de forma automatizada, sempre dentro das condições autorizadas na ficha do mês.',
                ],
            },
            {
                type: 'table',
                head: ['Cenário', 'Custo por lead', 'Custo em 2.000 leads/mês'],
                rows: [
                    ['Ferramenta de mercado (Lais.AI e similares)', 'R$ 4,00', 'R$ 8 mil por mês, R$ 96 mil por ano'],
                    ['Office (WhatsApp Meta e IA própria)', 'Menos de R$ 0,40', 'Cerca de R$ 800 por mês, R$ 9,6 mil por ano'],
                ],
            },
            { type: 'p', text: 'Economia estimada de R$ 86 mil por ano em relação a contratar o mercado, com atendimento imediato, 24 horas por dia, sem fila. E resposta em minutos é o que mais segura lead vivo: o retorno rápido atende o cliente no momento de interesse e melhora a conversão em visita.' },
            {
                type: 'list', caption: 'Obra, pós-venda e outras frentes', items: [
                    'Evolução de obra: integração com o sistema da engenharia, com o avanço publicado automaticamente no site.',
                    'Assistência técnica: chamado, manual do imóvel, chaves, assinaturas e acompanhamento filtrados pelo Office, com automação nos pontos repetitivos.',
                    'Google Ads na captação, no mesmo modelo da Meta, fechando o funil de mídia.',
                    'Academy aberto a corretores, imobiliárias e correspondentes, com certificação da rede de vendas.',
                    'Percentual de manutenção do stand controlado automaticamente dentro da viabilidade, com alertas de gasto.',
                ],
            },
            {
                type: 'kpis',
                caption: 'Onde o Office pode chegar: somando as três frentes com custo já conhecido.',
                items: [
                    { v: '~R$ 150 mil/ano', l: 'CUB substituída pela VAN', s: 'Custo de maio anualizado, trocado por tarifa fixa de disparo' },
                    { v: '~R$ 96 mil/ano', l: 'Blip substituído', s: 'Cobrança e relacionamento no WhatsApp corporativo próprio' },
                    { v: '~R$ 86 mil/ano', l: 'Atendimento de leads por IA', s: 'Contra os R$ 4,00 por lead das ferramentas de mercado' },
                ],
            },
            { type: 'p', text: 'Mais de R$ 330 mil por ano de potencial mapeado, além dos R$ 33 mil já cortados e das horas que a automação devolve todo mês. E cada frente dessas se apoia em infraestrutura que o Office já opera hoje: nenhuma exige começar do zero.' },
        ],
    },
    {
        id: 'tecnico',
        title: 'Anexo técnico: como o sistema opera e se protege',
        icon: 'fas fa-shield-halved',
        blocks: [
            { type: 'p', text: 'Detalhamento para consulta. O que diferencia o Office de um relatório é que ele age dentro dos sistemas oficiais, e não apenas os consulta.' },
            {
                type: 'list', caption: 'Microsoft 365, o padrão corporativo', items: [
                    'Identidade única: o acesso é a própria conta Microsoft da empresa, com o mesmo controle de entrada e saída de pessoal que o setor já administra.',
                    'Agenda, reuniões e ata: compromissos e reuniões do Teams em um só painel; gravação e transcrição acessíveis, com resumo gerado por IA. Reunião presencial também pode ser registrada.',
                    'SharePoint e Planner: arquivos e quadros acessíveis direto do sistema, inclusive como anexo de tarefa ou de ficha.',
                ],
            },
            {
                type: 'list', caption: 'Sienge, o ERP principal', items: [
                    'Lê: contratos de venda, títulos, contas a pagar, baixas, centros de custo, departamentos e fornecedores.',
                    'Escreve: exclui contrato de reserva cancelada, cria contrato de fornecimento e conduz a esteira de lançamento de pagamento automatizado.',
                    'Distribui: envia automaticamente o custo de obra ao Looqbox, sem exportação manual.',
                    'Protege: a leitura pesada acontece sobre cópia diária do banco, somente leitura. O ERP de produção nunca é sobrecarregado por consulta de painel.',
                ],
            },
            {
                type: 'list', caption: 'CV CRM, o motor de vendas', items: [
                    'Lê: leads, reservas, unidades, empreendimentos, etapas, imobiliárias, correspondentes, pré-cadastros e repasses.',
                    'Escreve: cria o lead captado, cadastra parceiro, anexa boleto na reserva, altera situação, libera unidade, altera etapa de repasse e evolui aprovações de contrato para assinatura.',
                    'Protege: toda gravação é reconferida por leitura. O CV responde erro com código de sucesso em vários pontos, então o Office relê e corrige o próprio registro.',
                ],
            },
            {
                type: 'list', caption: 'Meta, WhatsApp e inteligência artificial', items: [
                    'Captação: o lead do anúncio, formulário ou página pública é validado contra robô e vai ao CV já classificado por empreendimento, mídia e origem. Sem vínculo definido, fica retido, nunca é enviado no chute.',
                    'Canal direto: notificação, e-mail e WhatsApp saem de um único serviço. O aprovador decide pelo botão na mensagem; boleto vai com PDF anexo; modelos e automações são criados por tela; mensagem na janela de 24 horas é gratuita.',
                    'Google Gemini: sustenta a Eme, o resumo de reunião, a leitura de documento digitalizado e a narrativa dos relatórios, com rodízio de chaves e troca automática de modelo.',
                    'Eme: um padrão de comportamento e governança próprio, independente da LLM (conecta com Gemini, OpenAI, Anthropic e outras), uma casca que melhora a cada uso e conhece cada dia mais sobre a empresa.',
                    'Supabase, DocuSign e Looqbox: armazenamento de arquivos com limpeza automática, assinatura eletrônica integrada e alimentação automática do BI.',
                ],
            },
            {
                type: 'table',
                caption: 'De onde vem cada dado.',
                head: ['Fonte', 'O que o Office consome', 'Como'],
                rows: [
                    ['CV CRM', 'Leads, reservas, unidades, empreendimentos, etapas, imobiliárias, correspondentes, pré-cadastros e repasses', 'API oficial mais espelho local sincronizado por rotina'],
                    ['Sienge (API)', 'Contratos de venda, títulos a receber, fornecedores e contratos de fornecimento', 'API com limite de 200 requisições por minuto'],
                    ['Sienge (backup diário)', 'Contas a pagar, baixas, centros de custo, departamentos e inadimplência', 'Cópia do banco restaurada todo dia, somente leitura'],
                    ['Meta', 'Campanhas, conjuntos, anúncios, formulários, leads e mensagens de WhatsApp', 'Graph API e webhooks'],
                    ['Microsoft 365', 'Agenda, reuniões, transcrições, SharePoint e Planner', 'Microsoft Graph'],
                    ['Google Gemini', 'Assistente Eme, resumos, leitura de documentos e narrativa de relatório', 'API com rodízio de chaves e alternativa automática de modelo'],
                    ['Ecobrança Caixa', 'Emissão, reemissão e baixa do boleto do ato', 'Robô que opera o portal da Caixa, sem operador humano'],
                    ['Supabase e bucket', 'Boletos, anexos, documentos assinados e a planilha de custo de obra', 'Armazenamento com limpeza automática; o bucket alimenta o BI'],
                    ['IBGE e Open-Meteo', 'Municípios oficiais (cidades, MCMV e alçadas) e clima', 'API pública consultada sob demanda'],
                ],
            },
            {
                type: 'table',
                caption: 'Ordem de grandeza, contada no código em 5 de agosto de 2026.',
                head: ['Indicador', 'Situação atual'],
                rows: [
                    ['Telas', '105 telas navegáveis: 77 no Office e 28 no Academy. No menu aparecem 54 itens, em 9 áreas e 3 seções'],
                    ['Módulos de negócio', 'Comercial, Marketing, Financeiro, Ferramentas, Academy, Central Microsoft, Meta e WhatsApp, Eme e Administração'],
                    ['Rotinas automáticas', '34 rotinas agendadas, 33 ligadas hoje, mais o motor de alertas que cria a rotina a partir da regra que o usuário salva na tela'],
                    ['Ferramentas da IA', '46 ferramentas à disposição da Eme, cada uma aplicando a alçada de quem perguntou'],
                    ['Base de dados', '196 tabelas próprias, além do espelho do CV CRM e da cópia diária do Sienge'],
                    ['Integrações externas', 'Microsoft 365, Sienge (API e backup), CV CRM, Meta (WhatsApp, Lead Ads e campanhas), Google Gemini, Ecobrança Caixa, DocuSign, Supabase, bucket do BI, e-mail corporativo, IBGE e Open-Meteo'],
                    ['Canais de notificação', '47 tipos de aviso, em 3 canais: dentro do sistema, e-mail corporativo e WhatsApp corporativo'],
                    ['Ritmo de construção', '1.037 entregas publicadas desde outubro de 2024, somando os dois repositórios. Só em julho de 2026 foram 350, um terço de tudo'],
                ],
            },
            {
                type: 'list', caption: 'Princípios', items: [
                    'Nada de script manual: toda mudança se aplica sozinha na publicação; configuração se faz por tela.',
                    'Regra no banco, não no código: VGV, comissão, teto de marketing, régua de cobrança, perfis de aprovação e o comportamento da IA são editáveis por tela.',
                    'Toda tela ensina: botão "Como usar" com passo a passo na linguagem do usuário final.',
                    'Feito para o celular: a diretoria acessa exclusivamente pelo celular; responsividade é requisito de aceite.',
                ],
            },
            { type: 'p', text: 'O Office lida com contrato, valor de venda, custo, dado de cliente e credencial de sistema externo. A segurança não é um módulo: é a estrutura que sustenta todos os outros.' },
            {
                type: 'list', caption: 'Segurança de dados e respaldo da empresa', items: [
                    'Quem entra: acesso pela conta Microsoft da empresa, com reconhecimento facial como segundo caminho. Desligou, o acesso morre junto. Todo primeiro acesso nasce pendente em fila de aprovação, com permissões padrão do departamento aplicadas na ativação. Sessão de 8 horas com token rotacionado; reutilização de token antigo derruba todas as sessões da pessoa. Login e recuperação de senha com limite de tentativas, e o servidor recusa subir sem a chave de assinatura configurada.',
                    'Quem vê o quê: três camadas que se somam (tela, empreendimento e decisão), sem caminho alternativo. A mesma regra fecha menu, rota, API e as ferramentas da IA ao mesmo tempo: se a pessoa não tem acesso ao dado, a assistente também não tem.',
                    'Como os dados ficam guardados: credenciais de Sienge, WhatsApp e Meta criptografadas com algoritmo que detecta adulteração; senha de usuário nunca reversível; webhook validado por assinatura; BI externo restrito à cópia do Sienge, sem alcançar o banco do Office nem o ERP de produção.',
                    'Exposição externa controlada: links públicos com token criptográfico, prazo, limite de uso e armadilha antirrobô. Relatório público tem vencimento obrigatório, revogação, contador de acessos e verificação de dado pessoal. Em cadastro por link, empreendimento e empresa vêm do convite, nunca do que a pessoa digita. WhatsApp só com consentimento registrado.',
                    'Registro e verificação contínua: decisão tem dono, data e observação; o mês consolidado não muda sozinho (uma rotina diária explica divergências em vez de reescrever o histórico); e uma varredura automática confere autenticação e permissão de cada rota a cada subida do sistema.',
                ],
            },
        ],
    },
    {
        id: 'fechamento',
        title: 'Por que isso importa',
        icon: 'fas fa-flag-checkered',
        blocks: [
            { type: 'p', text: 'Venda, VGV, comissão, custo e investimento saem de um motor único, com regras editáveis por tela: quando o número do Office diverge da consulta crua, existe razão documentada, e ela aponta para o lado correto. Emissão de boleto, cadastro de parceiro, liberação de unidade, ficha comercial, ata de reunião e cobrança de tarefa acontecem sozinhos, em mais de 34 rotinas automáticas. O time passou a decidir em cima do resultado, em vez de produzi-lo.' },
            { type: 'p', text: 'Mais de R$ 33 mil por ano já saíram da conta, e há mais de R$ 330 mil por ano mapeados entre Blip, CUB e atendimento de leads: só a CUB cobrou R$ 13.293,36 em maio por um envio que sairia por pouco mais de R$ 800.' },
            { type: 'p', text: 'Tudo isso foi construído como apoio ao trabalho de uma pessoa, nas brechas, sem nunca ter sido prioridade formal. Já opera dentro de cinco plataformas corporativas, sustenta a rotina dos departamentos e economiza dinheiro real todo mês.' },
            { type: 'quote', text: 'O Office é a camada que faz Microsoft 365, Sienge, CV CRM, Meta e WhatsApp trabalharem como um sistema só, sob as regras da Menin, com registro de quem fez o quê. Sem foco, chegou até aqui. Com foco, o próximo patamar já está mapeado.' },
        ],
    },
];
