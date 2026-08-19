// Catálogo dos relatórios comerciais.
//
// Fonte única do que existe: as rotas do router, as guias da casca e as
// entradas do menu (navRegistry) saem daqui, então não tem como uma delas
// ficar para trás quando um relatório novo entrar.
//
// Cada relatório é uma ROTA PRÓPRIA porque a alçada é concedida por rota, com
// igualdade exata no backend — é assim que dá para liberar Leads para o
// Comercial sem abrir o Faturamento junto.
//
// `embedded: true` marca os relatórios que são as telas originais rodando
// dentro da casca (elas trazem o próprio PageContainer e escondem o cabeçalho).

// O `load` de cada relatório é o import dinâmico do componente. Fica aqui (e não
// no router) para que a casca possa PRÉ-CARREGAR os vizinhos em tempo ocioso -
// sem isso, cada troca de guia baixa o chunk na hora e a tela fica parada.
export const RELATORIOS = [
  {
    key: 'faturamento',
    route: '/comercial/relatorios/faturamento',
    label: 'Faturamento',
    pageTitle: 'Relatório de Faturamento',
    icon: 'fas fa-file-invoice-dollar',
    load: () => import('@/views/Office/Comercial/Faturamento/Index.vue'),
    subtitle: 'Quanto foi vendido no período, empreendimento a empreendimento.',
    embedded: true,
    content: 'Relatório de faturamento e contratos — vendas, VGV e ticket médio por empreendimento',
  },
  {
    key: 'projecao',
    route: '/comercial/relatorios/projecao',
    label: 'Vendas × Projeção',
    pageTitle: 'Vendas × Projeção',
    icon: 'fas fa-bullseye',
    load: () => import('@/views/Office/Comercial/Sales-Projection/Index.vue'),
    subtitle: 'Meta projetada contra a venda realizada.',
    embedded: true,
    content: 'Relatório de Vendas x Projeção de Vendas — meta contra realizado por empreendimento',
  },
  {
    key: 'leads',
    route: '/comercial/relatorios/leads',
    label: 'Leads',
    pageTitle: 'Desempenho por Lead',
    icon: 'fas fa-bullhorn',
    load: () => import('@/views/Office/Comercial/Relatorios/panels/LeadsPanel.vue'),
    subtitle: 'Quanto do faturamento começou num lead captado por nós.',
    content: 'Relatório de desempenho por lead — quanto do faturamento veio de captação própria, por mídia, origem e campanha',
  },
  {
    key: 'imobiliarias',
    route: '/comercial/relatorios/imobiliarias',
    label: 'Imobiliárias',
    pageTitle: 'Desempenho por Imobiliária',
    icon: 'fas fa-building',
    load: () => import('@/views/Office/Comercial/Relatorios/panels/ImobiliariasPanel.vue'),
    subtitle: 'Ranking das imobiliárias que fecharam as vendas.',
    content: 'Relatório de desempenho por imobiliária — vendas, VGV, ticket e participação',
  },
  {
    key: 'corretores',
    route: '/comercial/relatorios/corretores',
    label: 'Corretores',
    pageTitle: 'Desempenho por Corretor',
    icon: 'fas fa-user-tie',
    load: () => import('@/views/Office/Comercial/Relatorios/panels/CorretoresPanel.vue'),
    subtitle: 'Ranking dos corretores que fecharam as vendas.',
    content: 'Relatório de desempenho por corretor — vendas, VGV, ticket e participação',
  },
];

export const ROTAS_RELATORIOS = RELATORIOS.map((r) => r.route);

export default RELATORIOS;
