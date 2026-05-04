// Buckets do funil de Reservas. Combina situacao_nome + status_repasse + flags
// (vendida, distrato, cancelado). A ordem importa — o primeiro match vence.
//
// O `match(p)` recebe o objeto reserva inteiro (não apenas string) porque
// reservas precisam combinar múltiplos campos (vendida=S, status_repasse, etc).

const norm = (v) => String(v || '').toLowerCase()
const sit = (p) => norm(p?.situacao?.nome || p?.status_reserva)
const rep = (p) => norm(p?.status_repasse)

export const STAGE_GROUPS = [
    {
        // Cancelada / Distrato — sai antes de tudo (terminou negativamente)
        key: 'cancelada',
        label: 'Cancelada / Distrato',
        icon: 'fas fa-ban',
        color: 'red',
        bg: '!bg-red-300/30 !border-red-400/30',
        text: 'text-red-600 dark:text-red-300',
        bar: 'bg-red-500',
        match: (p) => /cancelad|distrato|reprovad|negad/.test(sit(p)) || /cancelad|distrato/.test(rep(p)),
    },
    {
        // "Vendida" é apenas a ETAPA do CRM — não significa venda concretizada.
        // A venda real é validada no relatório de Faturamento/Vendas.
        key: 'vendida',
        label: 'Vendida (etapa CRM)',
        icon: 'fas fa-flag-checkered',
        color: 'emerald',
        bg: '!bg-emerald-300/30 !border-emerald-400/30',
        text: 'text-emerald-600 dark:text-emerald-300',
        bar: 'bg-emerald-500',
        match: (p) => p?.vendida === 'S' || /vendid|contrato\s*assinado/.test(sit(p)),
    },
    {
        // Em Repasse — tem repasse rolando (algo no status_repasse, mas não terminou)
        key: 'em_repasse',
        label: 'Em Repasse',
        icon: 'fas fa-money-bill-transfer',
        color: 'sky',
        bg: '!bg-sky-300/30 !border-sky-400/30',
        text: 'text-sky-600 dark:text-sky-300',
        bar: 'bg-sky-500',
        match: (p) => !!p?.status_repasse && !/cancelad|distrato/.test(rep(p)),
    },
    {
        // Aguardando contrato — passou de reserva e está em fase contratual
        key: 'contrato',
        label: 'Em Contrato',
        icon: 'fas fa-file-contract',
        color: 'violet',
        bg: '!bg-violet-300/30 !border-violet-400/30',
        text: 'text-violet-600 dark:text-violet-300',
        bar: 'bg-violet-500',
        match: (p) => /contrato|assin/.test(sit(p)) && p?.vendida !== 'S',
    },
    {
        // Reservada / Em Análise — reservada mas ainda não tem repasse ou venda
        key: 'reservada',
        label: 'Reservada / Em Análise',
        icon: 'fas fa-bookmark',
        color: 'yellow',
        bg: '!bg-yellow-300/30 !border-yellow-400/30',
        text: 'text-yellow-600 dark:text-yellow-300',
        bar: 'bg-yellow-500',
        match: (p) => /reserv|análise|analise|aprovad|pendent/.test(sit(p)) || (!p?.status_repasse && p?.vendida !== 'S'),
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
]

export function bucketOf(precOrSituacao) {
    // Aceita o objeto reserva inteiro (preferido) ou apenas a string da situacao
    const p = (typeof precOrSituacao === 'string')
        ? { situacao: { nome: precOrSituacao } }
        : (precOrSituacao || {})
    for (const g of STAGE_GROUPS) if (g.match(p)) return g
    return STAGE_GROUPS[STAGE_GROUPS.length - 1]
}

// Ícones específicos por situação real do CV (para o detalhamento)
export function iconForStage(s) {
    const k = String(s || '').trim()
    if (/vendid/i.test(k))                               return 'fas fa-coins'
    if (/cancelad/i.test(k))                             return 'fas fa-ban'
    if (/distrato/i.test(k))                             return 'fas fa-file-circle-xmark'
    if (/contrato|assin/i.test(k))                       return 'fas fa-file-contract'
    if (/aprovad/i.test(k))                              return 'fas fa-check'
    if (/reprovad|negad/i.test(k))                       return 'fas fa-times'
    if (/análise|analise|aguardando|pendent/i.test(k))   return 'fas fa-magnifying-glass-chart'
    if (/reserv/i.test(k))                               return 'fas fa-bookmark'
    return 'fas fa-circle-dot'
}

export function clsForStage(s) {
    const k = String(s || '').trim()
    if (/vendid/i.test(k))                               return '!bg-emerald-400/30 !border-emerald-500/30'
    if (/cancelad/i.test(k))                             return '!bg-gray-300/30 !border-gray-400/30'
    if (/distrato/i.test(k))                             return '!bg-red-400/30 !border-red-500/30'
    if (/contrato|assin/i.test(k))                       return '!bg-violet-300/30 !border-violet-400/30'
    if (/aprovad/i.test(k))                              return '!bg-emerald-300/30 !border-emerald-400/30'
    if (/reprovad|negad/i.test(k))                       return '!bg-red-300/30 !border-red-400/30'
    if (/análise|analise|aguardando|pendent/i.test(k))   return '!bg-purple-300/30 !border-purple-400/30'
    if (/reserv/i.test(k))                               return '!bg-yellow-300/30 !border-yellow-400/30'
    return '!bg-slate-300/30 !border-slate-400/30'
}

// Ordem sugerida (do funil)
export const STAGE_ORDER = [
    'Reservada', 'Em Análise', 'Aprovada', 'Pendente',
    'Em Contrato', 'Contrato Assinado',
    'Em Repasse', 'Repasse Aprovado',
    'Vendida',
    'Distrato', 'Cancelada',
]
