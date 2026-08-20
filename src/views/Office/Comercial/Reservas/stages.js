// Buckets do funil de Reservas. Combina a etapa do CRM (via `etapaDe`),
// o status_repasse e a flag `vendida`. A ordem importa - o primeiro match vence.
//
// O `match(p)` recebe o objeto reserva inteiro (não apenas string) porque
// reservas precisam combinar múltiplos campos (vendida=S, status_repasse, etc).
//
// CORES: seguem os tokens de dado do design system (ver _design/DESIGN-LANGUAGE.md).
// Vendida e Cancelada usam as cores RESERVADAS de estado (data-pos / data-neg),
// porque são desfecho mesmo. As etapas do meio do funil usam slots da série
// categórica, cuja ordem é fixa e validada para daltonismo nos dois temas.

/**
 * A ETAPA da reserva, de um lugar só.
 *
 * O bloco `situacao` que vem do CV é `{ grupo, idgrupo, situacao, idsituacao }`
 * - **não existe a chave `nome`**. Medido em 2026-08-20: das 7.925 reservas,
 * 7.925 têm `situacao.situacao` e ZERO têm `situacao.nome`. `status_reserva`
 * guarda o mesmo texto denormalizado e também cobre 100% das linhas, então
 * entra como rede.
 *
 * Ler `situacao.nome` não dava "sem etapa": dava `undefined`, o que apagava a
 * coluna inteira e fazia todo regex de etapa (vendida, cancelada) falhar
 * calado. Qualquer código que precise da etapa passa por aqui.
 */
export function etapaDe(reserva) {
    if (typeof reserva === 'string') return reserva
    return reserva?.situacao?.situacao || reserva?.status_reserva || ''
}

const norm = (v) => String(v || '').toLowerCase()
const sit = (p) => norm(etapaDe(p))
const rep = (p) => norm(p?.status_repasse)

export const STAGE_GROUPS = [
    {
        // Cancelada / Distrato - sai antes de tudo (terminou negativamente)
        key: 'cancelada',
        label: 'Cancelada / Distrato',
        icon: 'fas fa-ban',
        color: 'data-neg',
        bg: '!bg-data-neg/15 !border-data-neg/30',
        text: 'text-data-neg',
        bar: 'bg-data-neg/70',
        match: (p) => /cancelad|distrato|reprovad|negad/.test(sit(p)) || /cancelad|distrato/.test(rep(p)),
    },
    {
        // "Vendida" é apenas a ETAPA do CRM - não significa venda concretizada.
        // A venda real é validada no relatório de Faturamento/Vendas.
        key: 'vendida',
        label: 'Vendida (etapa CRM)',
        icon: 'fas fa-flag-checkered',
        color: 'data-pos',
        bg: '!bg-data-pos/15 !border-data-pos/30',
        text: 'text-data-pos',
        bar: 'bg-data-pos/70',
        match: (p) => p?.vendida === 'S' || /vendid|contrato\s*assinado/.test(sit(p)),
    },
    {
        // Em Repasse - tem repasse rolando (algo no status_repasse, mas não terminou).
        // Era azul-céu; virou ciano (slot 7) para não brigar com o azul de
        // interface, que é do botão e do link, nunca de dado.
        key: 'em_repasse',
        label: 'Em Repasse',
        icon: 'fas fa-money-bill-transfer',
        color: 'series-7',
        bg: '!bg-series-7/15 !border-series-7/30',
        text: 'text-series-7',
        bar: 'bg-series-7-soft',
        match: (p) => !!p?.status_repasse && !/cancelad|distrato/.test(rep(p)),
    },
    {
        // Aguardando contrato - passou de reserva e está em fase contratual
        key: 'contrato',
        label: 'Em Contrato',
        icon: 'fas fa-file-contract',
        color: 'series-4',
        bg: '!bg-series-4/15 !border-series-4/30',
        text: 'text-series-4',
        bar: 'bg-series-4-soft',
        match: (p) => /contrato|assin/.test(sit(p)) && p?.vendida !== 'S',
    },
    {
        // Reservada / Em Análise - reservada mas ainda não tem repasse ou venda
        key: 'reservada',
        label: 'Reservada / Em Análise',
        icon: 'fas fa-bookmark',
        color: 'series-2',
        bg: '!bg-series-2/15 !border-series-2/30',
        text: 'text-series-2',
        bar: 'bg-series-2-soft',
        match: (p) => /reserv|análise|analise|aprovad|pendent/.test(sit(p)) || (!p?.status_repasse && p?.vendida !== 'S'),
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
]

export function bucketOf(reservaOuEtapa) {
    // Aceita o objeto reserva inteiro (preferido) ou apenas o texto da etapa
    const p = (typeof reservaOuEtapa === 'string')
        ? { status_reserva: reservaOuEtapa }
        : (reservaOuEtapa || {})
    for (const g of STAGE_GROUPS) if (g.match(p)) return g
    return STAGE_GROUPS[STAGE_GROUPS.length - 1]
}

// Ícones específicos por situação real do CV (para o chip da etapa na tabela)
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
