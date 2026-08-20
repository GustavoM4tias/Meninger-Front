// Etapas do CV agrupadas em "buckets" semânticos do funil de pré-cadastro.
// O `match` é uma função que recebe o nome cru da situação e devolve true.
// O primeiro bucket que casar vence — ordem importa.
//
// CORES: seguem os tokens de dado do design system (ver _design/DESIGN-LANGUAGE.md).
// Aprovados e Reprovados usam as cores RESERVADAS de estado (data-pos / data-neg),
// porque são estado mesmo. As etapas intermediárias usam slots da série
// categórica, cuja ordem é fixa e validada para daltonismo nos dois temas.

export const STAGE_GROUPS = [
    {
        key: 'em_analise',
        label: 'Em Análise',
        icon: 'fas fa-magnifying-glass-chart',
        color: 'series-4',
        bg: '!bg-series-4/15 !border-series-4/30',
        text: 'text-series-4',
        bar: 'bg-series-4-soft',
        match: (s) => /análise|analise|aguardando|montagem|pasta/i.test(s) && !/incompleta/i.test(s),
    },
    {
        key: 'documentacao',
        label: 'Documentação',
        icon: 'fas fa-folder-open',
        color: 'series-2',
        bg: '!bg-series-2/15 !border-series-2/30',
        text: 'text-series-2',
        bar: 'bg-series-2-soft',
        match: (s) => /documenta|pasta\s*incompleta/i.test(s),
    },
    {
        // Cobre: Aprovado, Aprovado 30/70, Aprovado Condicionado, Aprovado Condicionado Alto,
        // Aprovado Restrição, Pré-aprovado, etc. (qualquer coisa começando com "aprovad").
        key: 'aprovado',
        label: 'Aprovados',
        icon: 'fas fa-check-double',
        color: 'data-pos',
        bg: '!bg-data-pos/15 !border-data-pos/30',
        text: 'text-data-pos',
        bar: 'bg-data-pos/70',
        match: (s) => /aprovad/i.test(s),
    },
    {
        key: 'reserva',
        label: 'Em Reserva',
        icon: 'fas fa-bookmark',
        // Era amarelo. Virou turquesa: amarelo colidia com Documentação (âmbar)
        // e some no tema claro. Turquesa fica ao lado do verde de Aprovado, que
        // é onde a etapa está no funil, e passa nos testes de daltonismo.
        color: 'series-3',
        bg: '!bg-series-3/15 !border-series-3/30',
        text: 'text-series-3',
        bar: 'bg-series-3-soft',
        match: (s) => /reserva/i.test(s),
    },
    {
        // Cobre: Reprovado, Negado, Inviável, Inelegível, Cancelada, Distrato,
        // Restrição até 500, Restrição Acima R$500, Restrição Cadastral, etc.
        // (Aprovado Restrição já foi capturado pelo bucket aprovado anteriormente.)
        key: 'reprovado',
        label: 'Reprovados / Cancelados',
        icon: 'fas fa-circle-xmark',
        color: 'data-neg',
        bg: '!bg-data-neg/15 !border-data-neg/30',
        text: 'text-data-neg',
        bar: 'bg-data-neg/70',
        match: (s) => /reprovad|negad|cancelad|distrat|inviáv|inviav|inelegív|inelegiv|restriç|restric/i.test(s),
    },
    {
        key: 'outros',
        label: 'Outros',
        icon: 'fas fa-circle',
        color: 'data-neutral',
        bg: '!bg-data-neutral/15 !border-data-neutral/30',
        text: 'text-data-neutral',
        bar: 'bg-data-neutral/60',
        match: () => true, // catch-all
    },
];

export function bucketOf(situacaoNome) {
    const s = String(situacaoNome || '').trim();
    for (const g of STAGE_GROUPS) if (g.match(s)) return g;
    return STAGE_GROUPS[STAGE_GROUPS.length - 1];
}

// Ícones específicos por etapa do CV. Cobre variantes de Aprovado/Restrição.
export function iconForStage(s) {
    const k = String(s || '').trim();
    // Match por padrão (mais permissivo)
    if (/^aprovad/i.test(k)) {
        if (/condicionad/i.test(k)) return 'fas fa-circle-check';
        if (/restri/i.test(k))      return 'fas fa-shield-halved';
        if (/30\/70|30 \/ 70/i.test(k)) return 'fas fa-percent';
        return 'fas fa-check';
    }
    if (/reprovad|negad|inelegív|inviáv/i.test(k)) return 'fas fa-times';
    if (/restri/i.test(k))                          return 'fas fa-triangle-exclamation';
    if (/cancelad|distrat/i.test(k))                return 'fas fa-ban';
    if (/reserva/i.test(k))                         return 'fas fa-bookmark';
    if (/análise|analise/i.test(k)) {
        if (/banc/i.test(k))     return 'fas fa-building-columns';
        if (/associat/i.test(k)) return 'fas fa-handshake';
        return 'fas fa-magnifying-glass-chart';
    }
    if (/aguardando.*agência|aguardando.*agencia/i.test(k)) return 'fas fa-clock-rotate-left';
    if (/aguardando/i.test(k))                              return 'fas fa-hourglass-half';
    if (/montagem/i.test(k))                                return 'fas fa-folder';
    if (/pasta\s*incompleta/i.test(k))                      return 'fas fa-folder-minus';
    if (/pasta\s*completa/i.test(k))                        return 'fas fa-folder-plus';
    if (/documenta/i.test(k))                               return 'fas fa-file-circle-exclamation';
    return 'fas fa-circle-dot';
}

// Classe (bg/border) por etapa específica.
//
// Antes eram 12 tons soltos (laranja, violeta, cinza, roxo...) sem relação com o
// bucket da etapa: "Restrição Acima" era laranja enquanto "Reprovado" era
// vermelho, mesmo os dois sendo reprovação. Agora a etapa herda a cor do
// próprio bucket, em DUAS intensidades:
//
//   forte  = estado terminal (o resultado saiu: aprovado, reprovado, reserva)
//   suave  = etapa em andamento (ainda vai mudar)
//
// Assim a cor passa a significar uma coisa só, e o gráfico, a tabela e o chip da
// etapa contam a mesma história.
const STRONG = {
    em_analise: '!bg-series-4/25 !border-series-4/40',
    documentacao: '!bg-series-2/25 !border-series-2/40',
    aprovado: '!bg-data-pos/25 !border-data-pos/40',
    reserva: '!bg-series-3/25 !border-series-3/40',
    reprovado: '!bg-data-neg/25 !border-data-neg/40',
    outros: '!bg-data-neutral/25 !border-data-neutral/40',
};
const SOFT = {
    em_analise: '!bg-series-4/12 !border-series-4/25',
    documentacao: '!bg-series-2/12 !border-series-2/25',
    aprovado: '!bg-data-pos/12 !border-data-pos/25',
    reserva: '!bg-series-3/12 !border-series-3/25',
    reprovado: '!bg-data-neg/12 !border-data-neg/25',
    outros: '!bg-data-neutral/12 !border-data-neutral/25',
};

/** Uma etapa é terminal quando o resultado da análise já saiu. */
function isTerminal(k) {
    return /^aprovad|reprovad|negad|inelegív|inviáv|cancelad|distrat|reserva|restri/i.test(k)
        && !/aguardando|análise|analise/i.test(k);
}

export function clsForStage(s) {
    const k = String(s || '').trim();
    const bucket = bucketOf(k).key;
    return (isTerminal(k) ? STRONG : SOFT)[bucket] || SOFT.outros;
}

// Ordem sugerida de etapas no funil (caso queira ordenar visualmente).
export const STAGE_ORDER = [
    'Análise de Crédito Associativo',
    'Análise de Crédito Bancário',
    'Aguardando Retorno da Agência',
    'Aguardando Resultado Análise',
    'Documentação Pendente',
    'Montagem de Pasta Iniciada',
    'Pasta Incompleta',
    'Pasta Completa',
    'Aprovado Restrição',
    'Aprovado Condicionado',
    'Aprovado',
    'Em Reserva',
    'Restrição Acima R$500',
    'Reprovado',
    'Cancelada',
];
