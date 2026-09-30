// Tabela de preço recortada para UM módulo da ficha.
//
// O CV lista na tabela TODAS as unidades do empreendimento (módulos vendidos
// vêm com valor zerado), e a ficha é por módulo. O back marca cada unidade com
// `idetapa` e `adimplencia` (Desconto Construtora em R$); aqui a tabela vira a
// do módulo: contagem, faixa de preço e adimplência.
//
// `unit_count` conta só unidade COM preço: tabela que não precifica o módulo
// fica com 0 e as telas já tratam isso como "sem dados".
//
// `descontar` (chave "Descontar adimplência premiada", igual à aba Tabelas de
// preço dos Empreendimentos): faixa e média saem do preço líquido; o cheio
// continua em `price_cheio_*`.

const media = (vals) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);

export function recortarTabela(t, idetapa, { descontar = false } = {}) {
    const todas = t?.unidades ?? [];
    const temEtapa = idetapa != null && todas.some(u => u.idetapa != null);
    const doModulo = temEtapa ? todas.filter(u => String(u.idetapa) === String(idetapa)) : todas;
    const comPreco = doModulo.filter(u => Number(u.valor_total) > 0);

    // Adimplência: das disponíveis, que é o que se vende; se o módulo já
    // vendeu tudo, de todas as precificadas.
    const disponiveis = comPreco.filter(u => /dispon/i.test(u.situacao ?? ''));
    const base = disponiveis.length ? disponiveis : comPreco;

    const valorDe = (u) => Number(u.valor_total) - (descontar ? (Number(u.adimplencia) || 0) : 0);
    const cheios = comPreco.map(u => Number(u.valor_total));
    const precos = comPreco.map(valorDe);
    const adimpl = base.map(u => Number(u.adimplencia)).filter(v => v > 0);
    const liquidos = base.map(u => Number(u.valor_total) - (Number(u.adimplencia) || 0));

    return {
        ...t,
        unidades: doModulo,
        unit_count: comPreco.length,
        disponiveis: disponiveis.length,
        price_min: precos.length ? Math.min(...precos) : null,
        price_max: precos.length ? Math.max(...precos) : null,
        price_avg: media(precos),
        price_total: precos.length ? precos.reduce((a, b) => a + b, 0) : null,
        price_cheio_min: cheios.length ? Math.min(...cheios) : null,
        price_cheio_max: cheios.length ? Math.max(...cheios) : null,
        price_cheio_avg: media(cheios),
        descontada: Boolean(descontar) && adimpl.length > 0,
        adimplencia_n: adimpl.length,
        adimplencia_min: adimpl.length ? Math.min(...adimpl) : null,
        adimplencia_max: adimpl.length ? Math.max(...adimpl) : null,
        adimplencia_avg: media(adimpl),
        liquido_avg: adimpl.length ? media(liquidos) : null,
    };
}

/**
 * idunidade -> desconto de adimplência (R$), das tabelas na ordem dada
 * (a vigente primeiro); a primeira que tem valor para a unidade decide.
 */
export function mapaAdimplencia(tabelas) {
    const out = new Map();
    for (const t of (tabelas ?? [])) {
        for (const u of (t?.unidades ?? [])) {
            const v = Number(u.adimplencia);
            if (u.idunidade != null && v > 0 && !out.has(String(u.idunidade))) out.set(String(u.idunidade), v);
        }
    }
    return out;
}
