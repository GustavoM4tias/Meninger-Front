// Etapas do CV agrupadas em "buckets" semânticos do funil de pré-cadastro.
// O `match` é uma função que recebe o nome cru da situação e devolve true.
// O primeiro bucket que casar vence — ordem importa.

export const STAGE_GROUPS = [
    {
        key: 'em_analise',
        label: 'Em Análise',
        icon: 'fas fa-magnifying-glass-chart',
        color: 'purple',
        bg: '!bg-purple-300/30 !border-purple-400/30',
        text: 'text-purple-600 dark:text-purple-300',
        bar: 'bg-purple-500',
        match: (s) => /análise|analise|aguardando|montagem|pasta/i.test(s) && !/incompleta/i.test(s),
    },
    {
        key: 'documentacao',
        label: 'Documentação',
        icon: 'fas fa-folder-open',
        color: 'amber',
        bg: '!bg-amber-300/30 !border-amber-400/30',
        text: 'text-amber-600 dark:text-amber-300',
        bar: 'bg-amber-500',
        match: (s) => /documenta|pasta\s*incompleta/i.test(s),
    },
    {
        // Cobre: Aprovado, Aprovado 30/70, Aprovado Condicionado, Aprovado Condicionado Alto,
        // Aprovado Restrição, Pré-aprovado, etc. (qualquer coisa começando com "aprovad").
        key: 'aprovado',
        label: 'Aprovados',
        icon: 'fas fa-check-double',
        color: 'emerald',
        bg: '!bg-emerald-300/30 !border-emerald-400/30',
        text: 'text-emerald-600 dark:text-emerald-300',
        bar: 'bg-emerald-500',
        match: (s) => /aprovad/i.test(s),
    },
    {
        key: 'reserva',
        label: 'Em Reserva',
        icon: 'fas fa-bookmark',
        color: 'yellow',
        bg: '!bg-yellow-300/30 !border-yellow-400/30',
        text: 'text-yellow-600 dark:text-yellow-300',
        bar: 'bg-yellow-500',
        match: (s) => /reserva/i.test(s),
    },
    {
        // Cobre: Reprovado, Negado, Inviável, Inelegível, Cancelada, Distrato,
        // Restrição até 500, Restrição Acima R$500, Restrição Cadastral, etc.
        // (Aprovado Restrição já foi capturado pelo bucket aprovado anteriormente.)
        key: 'reprovado',
        label: 'Reprovados / Cancelados',
        icon: 'fas fa-circle-xmark',
        color: 'red',
        bg: '!bg-red-300/30 !border-red-400/30',
        text: 'text-red-600 dark:text-red-300',
        bar: 'bg-red-500',
        match: (s) => /reprovad|negad|cancelad|distrat|inviáv|inviav|inelegív|inelegiv|restriç|restric/i.test(s),
    },
    {
        key: 'outros',
        label: 'Outros',
        icon: 'fas fa-circle',
        color: 'slate',
        bg: '!bg-slate-300/30 !border-slate-400/30',
        text: 'text-slate-600 dark:text-slate-300',
        bar: 'bg-slate-500',
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

// Classe (bg/border) por etapa específica. Faz pattern-match em vez de map estático.
export function clsForStage(s) {
    const k = String(s || '').trim();
    if (/^aprovad/i.test(k)) {
        if (/restri/i.test(k))      return '!bg-emerald-200/30 !border-emerald-300/30';
        if (/condicionad/i.test(k)) return '!bg-emerald-200/30 !border-emerald-300/30';
        return '!bg-emerald-400/30 !border-emerald-500/30';
    }
    if (/reprovad|negad|inelegív|inviáv/i.test(k))   return '!bg-red-400/30 !border-red-500/30';
    if (/restri.*(acima|alto)/i.test(k))             return '!bg-orange-400/30 !border-orange-500/30';
    if (/restri/i.test(k))                            return '!bg-orange-300/30 !border-orange-400/30';
    if (/cancelad|distrat/i.test(k))                  return '!bg-gray-300/30 !border-gray-400/30';
    if (/reserva/i.test(k))                           return '!bg-yellow-300/30 !border-yellow-400/30';
    if (/aguardando/i.test(k))                        return '!bg-violet-300/30 !border-violet-400/30';
    if (/análise|analise/i.test(k))                   return '!bg-purple-300/30 !border-purple-400/30';
    if (/montagem/i.test(k))                          return '!bg-purple-200/30 !border-purple-300/30';
    if (/pasta\s*incompleta/i.test(k))                return '!bg-amber-200/30 !border-amber-300/30';
    if (/pasta\s*completa/i.test(k))                  return '!bg-emerald-200/30 !border-emerald-300/30';
    if (/documenta/i.test(k))                         return '!bg-amber-300/30 !border-amber-400/30';
    return bucketOf(k).bg;
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
