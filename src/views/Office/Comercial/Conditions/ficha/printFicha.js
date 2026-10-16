// HTML de impressão da ficha comercial (PDF e DocuSign).
//
// Função pura: recebe a ficha e, por módulo, as fontes já carregadas, e
// devolve um documento HTML completo. As cores aqui são PAPEL (impressora não
// tem tema), então são literais de propósito.

import { computeCostSummary, itbiPayer } from '../components/costSummary';
import { brl, brl2, num, pct, area, data, mesLongo, mesCurto, regrasDoCv, linhaFluxo, COR_SERIE_HEX, situacaoDe } from './fichaUtils';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COR_CEL = { 'Disponível': '#1f9d55', 'Reservado': '#e0a100', 'Vendido': '#c0392b', 'Bloqueado': '#d5dbd9', 'Segurado (à venda)': '#bfe6cf', 'Sem situação': '#d5dbd9' };

function kv(linhas) {
    return `<table class="kv">${linhas.filter(Boolean).map(([k, v, cls]) => `<tr class="${cls || ''}"><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
}

function espelhoHtml(estoque) {
    if (!estoque?.torres?.length) return '';
    const horizontal = estoque.modo === 'horizontal';
    const cel = (c) => {
        const s = situacaoDe(c);
        const txt = horizontal ? (c.final || c.numero || '') : (c.numero || '');
        return `<span class="u" style="background:${COR_CEL[s.rotulo] || '#d5dbd9'};color:${s.rotulo === 'Bloqueado' || s.rotulo === 'Segurado (à venda)' ? '#334' : '#fff'}">${esc(txt)}</span>`;
    };
    if (horizontal) {
        return `<div class="esp">${estoque.torres.map((t) => `<div class="qd"><b>${esc(t.nome)}</b><div class="lots">${t.andares.flatMap((a) => a.unidades).map(cel).join('')}</div></div>`).join('')}</div>`;
    }
    return `<div class="esp torres">${estoque.torres.map((t) => `<div class="torre"><b>${esc(t.nome)}</b><table>${t.andares.map((a) => `<tr><th>${esc(a.nome)}</th>${t.colunas.map((col) => `<td>${a.unidades.filter((u) => u.final === col.final).map(cel).join('')}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}</div>`;
}

function moduloHtml({ modulo: m, fontes: f }, ficha, pessoas) {
    if (!f || f.sem_cv) {
        return `<section class="mod"><h2>${esc(m.module_name)}</h2><p class="muted">Módulo sem empreendimento no CV.</p></section>`;
    }
    const mcmv = f.tipo_produto?.pagamento === 'mcmv';
    const unidade = f.estoque?.modo === 'horizontal' ? ['lote', 'lotes'] : ['unidade', 'unidades'];
    const p = f.preco;
    const c = f.condicao;
    const comissao = m.commission_pct != null ? Number(m.commission_pct) : null;
    const custos = computeCostSummary(m);
    const r = f.estoque?.resumo;
    const hoje = new Date().toISOString().slice(0, 10);
    const campanhas = (m.campaigns || []).filter((x) => x.is_active !== false && (!x.end_date || String(x.end_date).slice(0, 10) >= hoje));

    // Preço
    let precoHtml = '';
    if (mcmv && p?.principal) {
        precoHtml = `<div class="big">${brl(p.principal.valor)}</div><div class="muted">${p.principal.qtd} ${unidade[p.principal.qtd > 1 ? 1 : 0]} à venda neste preço</div>`
            + (p.faixas.slice(1, 4).map((x) => `<div class="alt"><b>${brl(x.valor)}</b> ${x.qtd} ${unidade[x.qtd > 1 ? 1 : 0]}</div>`).join(''))
            + kv([
                p.principal.valor_tabela ? ['Tabela no CV', brl(p.principal.valor_tabela)] : null,
                f.avaliacao?.mediana ? ['Avaliação Caixa', brl(f.avaliacao.mediana)] : null,
                f.avaliacao?.teto ? [`Teto Faixa ${f.avaliacao.faixa}`, brl(f.avaliacao.teto)] : null,
                f.tabela ? ['Tabela vale até', f.tabela.data_vigencia_ate ? data(f.tabela.data_vigencia_ate) : 'sem prazo'] : null,
            ]);
    } else if (p) {
        precoHtml = `<div class="big">${brl(p.min)}</div><div class="muted">menor ${unidade[0]} à venda · maior ${brl(p.max)}</div>`
            + kv([
                ...(p.tipologias || []).slice(0, 3).map((t) => [area(t.area), t.min === t.max ? brl(t.min) : `${brl(t.min)} a ${brl(t.max)}`]),
                p.m2_medio ? ['Preço médio do m²', brl(p.m2_medio)] : null,
                f.tabela ? ['Tabela vale até', f.tabela.data_vigencia_ate ? data(f.tabela.data_vigencia_ate) : 'sem prazo'] : null,
            ]);
    }

    // Condição
    let condHtml = '';
    if (c?.fluxo?.linhas?.length) {
        const fl = c.fluxo;
        condHtml = `<div class="bar">${fl.linhas.map((l) => `<span style="flex:${l.total} 0 0;background:${COR_SERIE_HEX[l.tipo]}">${l.pct >= 9 ? pct(l.pct) : ''}</span>`).join('')}</div>`
            + `<table class="kv">${fl.linhas.map((l) => `<tr><td><i style="background:${COR_SERIE_HEX[l.tipo]}"></i>${esc(l.rotulo)}${l.qtd > 1 ? ` <small>${esc(linhaFluxo(l))}</small>` : ''}</td><td>${brl(l.total, l.total % 1 ? 2 : 0)}</td></tr>`).join('')}`
            + (mcmv
                ? `<tr><td>Valor de tabela</td><td>${brl(c.valor_tabela)}</td></tr>${c.desconto ? `<tr><td>Desconto construtora</td><td>- ${brl(c.desconto)}</td></tr>` : ''}`
                : `<tr><td>Recurso próprio até a entrega</td><td>${pct(fl.recurso_proprio_pct)}</td></tr>`)
            + `<tr class="tot"><td>Preço de venda</td><td>${brl2(c.preco_venda)}</td></tr></table>`;
    }

    // Regras
    const regras = [];
    const rc = f.regra_cv;
    if (rc?.pro_soluto_max_pct || rc?.pro_soluto_limite_valor) {
        regras.push(['Parcelado com a Menin', [rc.pro_soluto_max_pct ? `até ${num(rc.pro_soluto_max_pct)}% do VGV` : null, rc.pro_soluto_limite_valor ? `até ${brl(rc.pro_soluto_limite_valor)}` : null].filter(Boolean).join(' · ')]);
    }
    for (const x of regrasDoCv(rc)) regras.push([x.rotulo, [x.valor, x.nota].filter(Boolean).join(' · ')]);
    if (m.installment_until_habite_se || m.installment_post_habite_se) regras.push(['Correção', [m.installment_until_habite_se && `${m.installment_until_habite_se.trim()} até o habite-se`, m.installment_post_habite_se && `${m.installment_post_habite_se.trim()} depois`].filter(Boolean).join(' · ')]);
    if (mcmv && m.min_demand) regras.push(['Demanda mínima', `${m.min_demand} ${unidade[1]}${/fracion/i.test(m.min_demand_note || '') ? ' · assinatura fracionada' : ''}`]);
    if (m.delivery_deadline_months) regras.push(['Prazo de obra', `${m.delivery_deadline_months} meses${m.delivery_deadline_note ? ` · ${m.delivery_deadline_note.trim()}` : ''}`]);

    const nome = (id) => String(pessoas.officeUsers.find((u) => Number(u.id) === Number(id))?.username || '').replace(/\s*-\s*Menin$/i, '');
    const corr = pessoas.correspondents.find((x) => Number(x.idusuario) === Number(m.correspondent_id));
    const quem = [
        m.manager_user_id ? ['Gestor', nome(m.manager_user_id)] : null,
        m.adm_user_id ? ['Administrativo', nome(m.adm_user_id)] : null,
        corr ? ['Correspondente', corr.nome] : null,
        m.cca_company_name ? ['CCA', m.cca_company_name.trim()] : null,
        m.has_digital_cert && m.digital_cert_provider ? ['Certificado digital', m.digital_cert_provider] : null,
    ];

    return `<section class="mod">
  <h2>${esc(f.etapa?.nome || m.module_name)} <small>${esc(f.tipo_produto?.rotulo || '')}</small></h2>
  <div class="grid2">
    <div class="box hl"><h3>Preço de venda</h3>${precoHtml}</div>
    <div class="box"><h3>Condição padrão${c ? ` · ${esc(c.unidade.nome)}` : ''}</h3>${condHtml}</div>
  </div>
  <div class="chips">
    <span><b>${custos.totalMenin && !custos.totalClient ? 'Documentação grátis' : 'Documentação'}</b> ${custos.totalMenin ? `Menin paga ${brl(custos.totalMenin)}` : 'por conta do cliente'}</span>
    <span><b>${m.itbi_exempt ? 'ITBI isento' : 'ITBI'}</b> ${m.itbi_exempt ? '' : (itbiPayer(m) === 'menin' ? 'Menin' : 'cliente')}</span>
    <span><b>${comissao != null ? `Comissão ${pct(comissao, comissao % 1 ? 1 : 0)}` : 'Comissão'}</b> ${comissao != null && c ? `${brl(c.preco_venda * comissao / 100)} por ${unidade[0]}` : ''}</span>
    <span><b>${campanhas.length ? `${campanhas.length} campanha(s)` : 'Sem campanha'}</b> ${campanhas.map((x) => esc(x.title)).join(', ')}</span>
  </div>
  ${r ? `<h3>Disponibilidade</h3>
  <div class="kpis">
    <span class="pos"><b>${r.a_venda ?? r.disponiveis}</b> à venda</span><span><b>${r.reservadas}</b> reservados</span><span><b>${r.vendidas}</b> vendidos</span><span><b>${(r.bloqueadas || 0) - (r.estoque_comercial || 0)}</b> bloqueados</span><span><b>${r.unidades}</b> no total</span>
  </div>
  ${espelhoHtml(f.estoque)}` : ''}
  <div class="grid2">
    <div class="box"><h3>Regras de negociação</h3>${kv(regras)}${rc?.lido_em ? `<p class="muted">Regra lida no CV em ${data(String(rc.lido_em).slice(0, 10))}.</p>` : ''}</div>
    <div class="box"><h3>Documentação por venda</h3>${kv([
        ...custos.menin.map((i) => [i.label, brl2(i.value)]),
        ['Menin paga', brl2(custos.totalMenin), 'tot'],
        ...custos.client.map((i) => [i.label, brl2(i.value)]),
        ['Cliente paga', brl2(custos.totalClient), 'tot'],
    ])}</div>
  </div>
  <div class="grid3">
    <div class="box"><h3>Comissão</h3>${kv([comissao != null ? ['Percentual', pct(comissao, comissao % 1 ? 1 : 0)] : null])}${m.commission_note ? `<p class="note">${esc(m.commission_note.trim())}</p>` : ''}</div>
    ${mcmv && f.compradores?.n ? `<div class="box"><h3>Quem está comprando</h3>${kv([
        [`Pré-cadastros em ${f.compradores.dias} dias`, num(f.compradores.n)],
        ['Reprovados', pct(f.compradores.reprovados_pct)],
        f.compradores.financiamento ? ['Financiamento aprovado', brl(f.compradores.financiamento)] : null,
        f.compradores.subsidio ? ['Subsídio federal', brl(f.compradores.subsidio)] : null,
        f.compradores.prestacao ? ['Prestação Caixa', brl2(f.compradores.prestacao)] : null,
    ])}<p class="muted">Valores em mediana.</p></div>` : ''}
    <div class="box"><h3>Obra e responsáveis</h3>${kv([
        ['Entrega prevista', data(f.obra?.entrega)],
        f.obra?.andamento != null ? ['Andamento', pct(f.obra.andamento, 1)] : null,
        ...quem,
    ])}</div>
  </div>
  ${(f.reservas_mes || []).length ? `<p class="muted">Reservas que ficaram por mês: ${f.reservas_mes.map((x) => `${mesCurto(x.mes)} ${x.ficaram}/${x.feitas}`).join(' · ')}.</p>` : ''}
  ${campanhas.length ? `<div class="box"><h3>Campanhas do mês</h3>${campanhas.map((x) => `<p><b>${esc(x.title)}</b>${x.end_date ? ` · até ${data(String(x.end_date).slice(0, 10))}` : ''}${x.value ? ` · ${brl(x.value)}` : ''}<br><span class="muted">${esc((x.description || '').trim())}</span></p>`).join('')}</div>` : ''}
  ${m.notes ? `<div class="box"><h3>Observação do mês</h3><p class="note">${esc(m.notes.trim())}</p></div>` : ''}
  <p class="muted">${f.foto ? `Retrato de ${data(String(f.foto.em).slice(0, 10))}.` : `Dados do CV de ${data(String(f.gerado_em).slice(0, 10))}.`}${f.tabela ? ` Tabela ${esc(f.tabela.nome)}.` : ''}</p>
</section>`;
}

const STATUS = { draft: 'Rascunho', pending_approval: 'Em autorização', approved: 'Autorizada', closed: 'Encerrada' };

export function buildFichaPrintHtml({ ficha, itens = [], pessoas = { officeUsers: [], correspondents: [] } }) {
    const nome = ficha?.enterprise?.nome || ficha?.display_name || 'Ficha comercial';
    const local = [ficha?.enterprise?.cidade, ficha?.enterprise?.estado].filter(Boolean).join(' / ');
    const corpo = itens.map((it) => moduloHtml(it, ficha, pessoas)).join('<div class="pb"></div>');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(nome)} - ficha comercial</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.45 "Segoe UI", Arial, sans-serif; color: #142b26; background: #fff; margin: 0; padding: 8px; }
header.doc { border-bottom: 2px solid #142b26; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
header.doc h1 { margin: 0; font-size: 20pt; }
header.doc .meta { color: #4b605a; font-size: 9.5pt; }
h2 { font-size: 14pt; margin: 4px 0 10px; } h2 small { font-size: 9pt; color: #7a8d87; font-weight: normal; }
h3 { font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; color: #4b605a; margin: 0 0 6px; }
.grid2 { display: grid; grid-template-columns: 5fr 7fr; gap: 10px; margin-bottom: 10px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
.box { border: 1px solid #d8e1de; border-radius: 8px; padding: 10px; break-inside: avoid; }
.box.hl { background: #eef4f2; border-color: #eef4f2; }
.big { font-size: 24pt; font-weight: 800; }
.alt { margin-top: 2px; } .alt b { font-size: 12pt; }
.muted { color: #7a8d87; font-size: 8.5pt; margin: 4px 0 0; }
.note { white-space: pre-line; font-size: 8.5pt; color: #4b605a; margin: 6px 0 0; }
table.kv { width: 100%; border-collapse: collapse; margin-top: 6px; }
table.kv td { padding: 3px 0; border-bottom: 1px solid #e8eeec; vertical-align: top; }
table.kv td:first-child { white-space: nowrap; padding-right: 10px; }
table.kv td:last-child { text-align: right; font-weight: 600; padding-left: 8px; }
table.kv td small { color: #7a8d87; }
table.kv td i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
table.kv tr.tot td { border-top: 1.5px solid #142b26; font-weight: 700; }
.bar { display: flex; height: 18px; border-radius: 4px; overflow: hidden; margin: 4px 0 6px; }
.bar span { color: #fff; font-size: 7.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center; min-width: 3px; }
.chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0 0 10px; }
.chips span { border: 1px solid #d8e1de; border-radius: 6px; padding: 6px 8px; font-size: 8.5pt; color: #4b605a; } .chips b { display: block; color: #142b26; font-size: 9.5pt; }
.kpis { display: flex; gap: 14px; margin: 0 0 6px; font-size: 9pt; color: #4b605a; } .kpis b { font-size: 13pt; color: #142b26; margin-right: 3px; } .kpis .pos b { color: #1f9d55; }
.esp { margin: 6px 0 10px; } .qd { display: grid; grid-template-columns: 70px 1fr; gap: 6px; margin-bottom: 3px; font-size: 8pt; break-inside: avoid; }
.lots { display: flex; flex-wrap: wrap; gap: 2px; }
.u { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 15px; border-radius: 2px; font-size: 6pt; font-weight: 700; }
.esp.torres { display: flex; flex-wrap: wrap; gap: 12px; } .torre { font-size: 8pt; break-inside: avoid; } .torre table { border-spacing: 2px; } .torre th { font-weight: normal; color: #7a8d87; font-size: 7pt; text-align: right; padding-right: 3px; }
.torre .u { width: 26px; }
.mod { break-inside: auto; }
.pb { break-after: page; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>
<header class="doc"><div><div class="meta">Ficha comercial · ${esc(mesLongo(String(ficha?.reference_month || '').slice(0, 7)))}</div><h1>${esc(nome)}</h1><div class="meta">${esc(local)}</div></div>
<div class="meta">${esc(STATUS[ficha?.status] || '')}${ficha?.approved_at ? ` em ${data(String(ficha.approved_at).slice(0, 10))}` : ''}</div></header>
${corpo}
</body></html>`;
}

export default buildFichaPrintHtml;
