// Gera o Relatório de Leads como HTML autocontido e interativo.
// Um único arquivo: CSS e JS inline, gráficos em SVG desenhados aqui mesmo.
// Sem CDN — abre offline, dá para encaminhar por e-mail e imprimir em PDF limpo.
import dayjs from 'dayjs';
import { dailySeries, seriesValues, KW, matchSituacao } from './series';

const intFmt = new Intl.NumberFormat('pt-BR');

// Escapa tudo que vem de dado do usuário (nome, e-mail, empreendimento...).
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function periodLabel(from, to) {
  if (!from || !to) return 'Período não informado';
  return `${dayjs(from).format('DD/MM/YYYY')} a ${dayjs(to).format('DD/MM/YYYY')}`;
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ─── Modelo do relatório (mesmas regras da tela) ────────────────────────────
const STAGES = [
  { key: 'novo',        label: 'Novo / Aguardando', color: '#3b82f6', match: ['novo', 'aguardando'] },
  { key: 'contato',     label: 'Em contato',        color: '#06b6d4', match: ['tentativa', 'contato'] },
  { key: 'atendimento', label: 'Em atendimento',    color: '#8b5cf6', match: ['atendimento', 'externo'] },
  { key: 'qualificado', label: 'Qualificado',       color: '#f59e0b', match: ['qualificad'] },
  { key: 'reserva',     label: 'Reserva / Proposta', color: '#10b981', match: ['reserva', 'proposta', 'venda', 'contrato'] },
];
const LOST = ['descartad', 'perdid', 'sem interesse'];

function stageFor(situacao) {
  const n = norm(situacao);
  if (LOST.some(m => n.includes(m))) return 'descartado';
  for (const st of STAGES) if (st.match.some(m => n.includes(m))) return st.key;
  return 'outros';
}

function groupCount(leads, keyFn) {
  const map = new Map();
  for (const l of leads) {
    const k = keyFn(l);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function buildReportModel({ leads = [], from, to, geradoPor = null }) {
  const total = leads.length;

  const porSituacao = groupCount(leads, l => String(l?.situacao_nome || 'Sem situação').trim());
  const porOrigem = groupCount(leads, l => String(l?.origem || 'Sem origem').trim());
  const porEmpreendimento = groupCount(leads, l => l?.empreendimento?.[0]?.nome?.trim() || 'Sem empreendimento');
  const porMidia = groupCount(leads, l => String(l?.midia_principal || 'Sem mídia').trim());
  const porImobiliaria = groupCount(leads, l => l?.imobiliaria?.nome?.trim() || 'Sem imobiliária');

  const funil = {};
  for (const l of leads) {
    const st = stageFor(l?.situacao_nome);
    funil[st] = (funil[st] || 0) + 1;
  }
  const etapas = STAGES.map(s => ({ ...s, count: funil[s.key] || 0 }));
  const maxEtapa = Math.max(1, ...etapas.map(e => e.count));
  const descartados = funil.descartado || 0;
  const outros = funil.outros || 0;

  const qualificados = leads.filter(l => matchSituacao(l, KW.qualificado)).length;
  const reservas = leads.filter(l => matchSituacao(l, KW.reserva)).length;
  const atendimento = leads.filter(l => matchSituacao(l, KW.atendimento)).length;
  const conversao = total ? +(((qualificados + reservas) / total) * 100).toFixed(1) : 0;

  const serie = dailySeries(leads, from, to);
  const mediaDia = serie.length ? Math.round(total / serie.length) : 0;

  // Mapa dia da semana × hora
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const l of leads) {
    if (!l?.data_cad) continue;
    const d = dayjs(l.data_cad);
    if (d.isValid()) heat[d.day()][d.hour()] += 1;
  }

  return {
    from, to, total, serie, mediaDia,
    // Carimbo de autoria: gerado uma vez aqui para HTML e PDF baterem.
    geradoPor,
    geradoEm: dayjs().format('DD/MM/YYYY [às] HH:mm'),
    etapas, maxEtapa, descartados, outros,
    kpis: { total, atendimento, qualificados, reservas, descartados, conversao },
    // Sparklines dos KPIs — mesma leitura dos cards da tela.
    sparks: {
      total: seriesValues(leads, from, to),
      atendimento: seriesValues(leads, from, to, l => matchSituacao(l, KW.atendimento)),
      qualificados: seriesValues(leads, from, to, l => matchSituacao(l, KW.qualificado)),
      reservas: seriesValues(leads, from, to, l => matchSituacao(l, KW.reserva)),
      conversao: seriesValues(leads, from, to,
        l => matchSituacao(l, KW.qualificado) || matchSituacao(l, KW.reserva)),
      descartados: seriesValues(leads, from, to, l => matchSituacao(l, KW.descartado)),
    },
    porSituacao, porOrigem, porEmpreendimento, porMidia, porImobiliaria,
    heat,
    leads: leads.map(l => ({
      nome: l?.nome || '',
      email: l?.email || '',
      telefone: l?.telefone || '',
      situacao: l?.situacao_nome || '',
      empreendimento: l?.empreendimento?.[0]?.nome || '',
      imobiliaria: l?.imobiliaria?.nome || '',
      corretor: l?.corretor?.nome || '',
      midia: l?.midia_principal || '',
      origem: l?.origem || '',
      data: l?.data_cad ? dayjs(l.data_cad).format('DD/MM/YYYY HH:mm') : '',
      ts: l?.data_cad ? dayjs(l.data_cad).valueOf() : 0,
    })).sort((a, b) => b.ts - a.ts),
  };
}

// ─── Gráfico de área em SVG ─────────────────────────────────────────────────
function areaChartSvg(serie) {
  if (!serie.length) return '<p class="empty">Sem dados no período</p>';
  const W = 900, H = 220, P = { t: 12, r: 12, b: 26, l: 40 };
  const max = Math.max(1, ...serie.map(p => p.count));
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const x = i => P.l + (serie.length === 1 ? iw / 2 : (i / (serie.length - 1)) * iw);
  const y = v => P.t + ih - (v / max) * ih;

  const line = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join('');
  const area = `${line}L${x(serie.length - 1).toFixed(1)},${(P.t + ih).toFixed(1)}L${x(0).toFixed(1)},${(P.t + ih).toFixed(1)}Z`;

  // Grade horizontal + rótulos do eixo Y
  const ticks = [0, 0.5, 1].map(f => {
    const v = Math.round(max * f), yy = y(v);
    return `<line class="grid" x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}"/>
            <text class="ax" x="${P.l - 6}" y="${yy + 3}" text-anchor="end">${v}</text>`;
  }).join('');

  // Alguns rótulos de data, sem poluir
  const step = Math.max(1, Math.ceil(serie.length / 8));
  const xlabels = serie.map((p, i) =>
    i % step === 0 || i === serie.length - 1
      ? `<text class="ax" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>` : ''
  ).join('');

  const dots = serie.map((p, i) =>
    `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.count).toFixed(1)}" r="9"><title>${esc(p.label)}: ${p.count} lead(s)</title></circle>`
  ).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none" role="img" aria-label="Entradas de leads por dia">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity=".35"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity=".02"/>
    </linearGradient></defs>
    ${ticks}
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
    ${xlabels}${dots}
  </svg>`;
}

// Rosca com total no centro. Fatias com hover (destaque + tooltip nativo).
function donutSvg(items, total, palette, limit = 6) {
  if (!items.length || !total) return '<p class="empty">Sem dados</p>';
  const top = items.slice(0, limit);
  const resto = items.slice(limit).reduce((a, i) => a + i.count, 0);
  const fatias = top.map((it, i) => ({ ...it, color: palette[i % palette.length] }));
  if (resto > 0) fatias.push({ name: 'Outros', count: resto, color: palette[palette.length - 1] });

  const R = 60, r = 42, C = 80;   // raio externo, interno, centro
  const circ = 2 * Math.PI * ((R + r) / 2);
  const w = R - r;
  let acc = 0;

  const arcs = fatias.map(f => {
    const frac = f.count / total;
    const dash = `${(frac * circ).toFixed(2)} ${(circ - frac * circ).toFixed(2)}`;
    const offset = (-acc * circ).toFixed(2);
    acc += frac;
    return `<circle class="slice" cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none"
      stroke="${f.color}" stroke-width="${w}" stroke-dasharray="${dash}"
      stroke-dashoffset="${offset}" transform="rotate(-90 ${C} ${C})"
      ><title>${esc(f.name)}: ${intFmt.format(f.count)} (${Math.round(frac * 100)}%)</title></circle>`;
  }).join('');

  const legenda = fatias.map(f => `<li>
      <span class="dot" style="background:${f.color}"></span>
      <span class="ln">${esc(f.name)}</span>
      <span class="lv">${Math.round((f.count / total) * 100)}%</span>
    </li>`).join('');

  return `<div class="donut-wrap">
    <svg viewBox="0 0 160 160" class="donut" role="img" aria-label="Distribuição por empreendimento">
      ${arcs}
      <text x="${C}" y="${C - 2}" text-anchor="middle" class="dt-v">${intFmt.format(total)}</text>
      <text x="${C}" y="${C + 14}" text-anchor="middle" class="dt-l">leads</text>
    </svg>
    <ul class="legend">${legenda}</ul>
  </div>`;
}

// Mini barras para o rodapé de cada KPI.
function sparkSvg(values, color) {
  const v = (values || []).map(n => Number(n) || 0);
  if (!v.some(n => n > 0)) return '';
  const N = 20;
  let b = v;
  if (v.length > N) {
    const size = Math.ceil(v.length / N);
    b = [];
    for (let i = 0; i < v.length; i += size) b.push(v.slice(i, i + size).reduce((a, c) => a + c, 0));
  }
  const max = Math.max(1, ...b);
  const W = 100, H = 24, gap = 1.5;
  const bw = (W - gap * (b.length - 1)) / b.length;
  const bars = b.map((n, i) => {
    const h = Math.max(2, (n / max) * H);
    return `<rect x="${(i * (bw + gap)).toFixed(2)}" y="${(H - h).toFixed(2)}"
      width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="1"
      fill="${color}" opacity="${i === b.length - 1 ? 1 : 0.35}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none">${bars}</svg>`;
}

function recentesHtml(leads, limit = 8) {
  const list = leads.slice(0, limit);
  if (!list.length) return '<p class="empty">Sem leads no período</p>';
  return `<ul class="recent">${list.map(l => `<li>
      <span class="rn">
        <b>${esc(l.nome || 'Sem nome')}</b>
        <span class="rs">${esc(l.empreendimento || 'Sem empreendimento')} · ${esc(l.origem || '—')}</span>
      </span>
      <span class="rt">
        <span class="rsit">${esc(l.situacao || '—')}</span>
        <span class="rd">${esc(l.data)}</span>
      </span>
    </li>`).join('')}</ul>`;
}

function barList(items, total, palette) {
  if (!items.length) return '<p class="empty">Sem dados</p>';
  const max = Math.max(1, ...items.map(i => i.count));
  return items.map((it, i) => {
    const pct = total ? Math.round((it.count / total) * 100) : 0;
    const color = palette[i % palette.length];
    return `<div class="bar-row">
      <div class="bar-top"><span class="bar-name">${esc(it.name)}</span>
        <span class="bar-val"><b>${intFmt.format(it.count)}</b> · ${pct}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (it.count / max) * 100)}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

function heatmapHtml(heat) {
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const max = Math.max(1, ...heat.flat());
  if (!heat.flat().some(v => v > 0)) return '<p class="empty">Sem dados</p>';
  const rows = heat.map((row, d) => {
    const cells = row.map((v, h) => {
      const a = v ? (0.18 + (v / max) * 0.82).toFixed(2) : '0.07';
      return `<span class="hc" style="background:rgba(59,130,246,${a})" title="${DIAS[d]} ${String(h).padStart(2, '0')}h — ${v} lead(s)"></span>`;
    }).join('');
    return `<div class="hrow"><span class="hlab">${DIAS[d]}</span><div class="hcells">${cells}</div></div>`;
  }).join('');
  return `<div class="heat">${rows}
    <div class="hrow"><span class="hlab"></span><div class="hcells haxis">
      ${[0, 6, 12, 18, 23].map(h => `<span style="grid-column:${h + 1}">${String(h).padStart(2, '0')}h</span>`).join('')}
    </div></div></div>`;
}

// ─── HTML final ─────────────────────────────────────────────────────────────
export function buildReportHtml(model) {
  const { from, to, total, serie, mediaDia, kpis, etapas, maxEtapa,
          descartados, outros, porOrigem, porEmpreendimento, porSituacao,
          porMidia, porImobiliaria, heat, leads, geradoPor, geradoEm } = model;

  // Autoria: nome (e e-mail, quando houver) de quem exportou.
  const autorNome = geradoPor?.nome ? esc(geradoPor.nome) : null;
  const autorEmail = geradoPor?.email ? esc(geradoPor.email) : null;
  const autorLinha = autorNome
    ? `Gerado por <b>${autorNome}</b>${autorEmail ? ` (${autorEmail})` : ''} em ${esc(geradoEm)}`
    : `Gerado em ${esc(geradoEm)}`;

  const P1 = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f97316', '#64748b'];
  const P2 = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#94a3b8'];

  const sparks = model.sparks || {};
  const kpiCards = [
    { k: 'total',        l: 'Total de leads', v: intFmt.format(kpis.total), c: '#3b82f6' },
    { k: 'atendimento',  l: 'Em atendimento', v: intFmt.format(kpis.atendimento), c: '#8b5cf6' },
    { k: 'qualificados', l: 'Qualificados', v: intFmt.format(kpis.qualificados), c: '#f59e0b' },
    { k: 'reservas',     l: 'Reservas', v: intFmt.format(kpis.reservas), c: '#10b981' },
    { k: 'conversao',    l: 'Conversão', v: `${kpis.conversao}%`, c: '#14b8a6' },
    { k: 'descartados',  l: 'Descartados', v: intFmt.format(kpis.descartados), c: '#f43f5e' },
  ].map(k => `<div class="kpi"><span class="kpi-dot" style="background:${k.c}"></span>
      <span class="kpi-v">${k.v}</span>
      <span class="kpi-foot"><span class="kpi-l">${k.l}</span>${sparkSvg(sparks[k.k], k.c)}</span>
    </div>`).join('');

  const funilHtml = etapas.map(e => `<div class="bar-row">
      <div class="bar-top"><span class="bar-name">${esc(e.label)}</span>
        <span class="bar-val"><b>${intFmt.format(e.count)}</b> · ${total ? Math.round((e.count / total) * 100) : 0}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (e.count / maxEtapa) * 100)}%;background:${e.color}"></div></div>
    </div>`).join('') +
    `<p class="foot">${intFmt.format(descartados)} descartado(s) · ${intFmt.format(outros)} em outras situações</p>`;

  const rows = leads.map(l => `<tr>
    <td>${esc(l.nome)}</td><td>${esc(l.situacao)}</td><td>${esc(l.empreendimento)}</td>
    <td>${esc(l.origem)}</td><td>${esc(l.midia)}</td><td>${esc(l.imobiliaria)}</td>
    <td>${esc(l.corretor)}</td><td class="nowrap">${esc(l.data)}</td>
    <td>${esc(l.email)}</td><td class="nowrap">${esc(l.telefone)}</td></tr>`).join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Relatório de Leads — ${esc(periodLabel(from, to))}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f8fafc;color:#0f172a;font:14px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1240px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0;font-weight:650}
h2{font-size:12px;margin:0 0 12px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
header{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.meta{font-size:13px;color:#64748b}
.author{margin:2px 0 0;font-size:12px}
.author b{color:#334155;font-weight:600}
.card{background:#fff;border-radius:14px;padding:18px;box-shadow:0 1px 3px rgba(15,23,42,.07)}
.grid{display:grid;gap:14px}
.g6{grid-template-columns:repeat(6,1fr)}.g3{grid-template-columns:2fr 1fr}.g2{grid-template-columns:1fr 1fr}
.kpi{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(15,23,42,.07);display:flex;flex-direction:column;gap:2px;position:relative;transition:transform .15s,box-shadow .15s}
.kpi:hover{transform:translateY(-2px);box-shadow:0 8px 20px -6px rgba(59,130,246,.35)}
.kpi-dot{width:26px;height:3px;border-radius:2px;margin-bottom:6px}
.kpi-v{font-size:22px;font-weight:680;letter-spacing:-.02em}
.kpi-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
.kpi-l{font-size:12px;color:#64748b}
.spark{width:56px;height:22px;flex:none}
.col{display:flex;flex-direction:column;gap:14px}
.donut-wrap{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.donut{width:130px;height:130px;flex:none}
.slice{transition:opacity .15s,stroke-width .15s;cursor:default}
.donut:hover .slice{opacity:.45}
.donut .slice:hover{opacity:1;stroke-width:22}
.dt-v{font-size:20px;font-weight:680;fill:#0f172a}
.dt-l{font-size:10px;fill:#94a3b8}
.legend{list-style:none;margin:0;padding:0;flex:1;min-width:150px;display:flex;flex-direction:column;gap:6px}
.legend li{display:flex;align-items:center;gap:8px;font-size:12.5px}
.legend .dot{width:10px;height:10px;border-radius:3px;flex:none}
.legend .ln{flex:1;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.legend .lv{font-weight:600;font-variant-numeric:tabular-nums}
.recent{list-style:none;margin:0;padding:0}
.recent li{display:flex;justify-content:space-between;gap:12px;padding:9px 6px;border-top:1px solid #f1f5f9;border-radius:7px;transition:background .12s}
.recent li:first-child{border-top:0}
.recent li:hover{background:#eff6ff}
.rn{min-width:0;display:flex;flex-direction:column}
.rn b{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rs{font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rt{text-align:right;flex:none}
.rsit{display:block;font-size:12px;font-weight:600;color:#3b82f6}
.rd{display:block;font-size:11px;color:#94a3b8}
.big{font-size:26px;font-weight:680}
.sub{font-size:12px;color:#64748b;margin:2px 0 14px}
.chart{width:100%;height:220px;overflow:visible}
line.grid{stroke:#e2e8f0;stroke-width:1}
text.ax{font-size:10px;fill:#94a3b8}
.dot{fill:transparent}.dot:hover{fill:rgba(59,130,246,.25)}
.bar-row{margin-bottom:11px;padding:2px 4px;border-radius:7px;transition:background .12s}
.bar-row:hover{background:#f8fafc}
.bar-row:hover .bar-fill{filter:brightness(1.08)}
.bar-top{display:flex;justify-content:space-between;gap:10px;margin-bottom:4px;font-size:13px}
.bar-name{color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-val{color:#64748b;white-space:nowrap;font-variant-numeric:tabular-nums}
.bar-track{height:8px;border-radius:99px;background:#f1f5f9;overflow:hidden}
.bar-fill{height:100%;border-radius:99px}
.foot{margin:14px 0 0;padding-top:12px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b}
.empty{color:#94a3b8;font-size:13px;text-align:center;padding:24px 0;margin:0}
.heat{display:flex;flex-direction:column;gap:3px}
.hrow{display:flex;align-items:center;gap:8px}
.hlab{width:30px;font-size:10px;color:#94a3b8;text-align:right;flex:none}
.hcells{flex:1;display:grid;grid-template-columns:repeat(24,1fr);gap:3px}
.hc{aspect-ratio:1;border-radius:3px}
.haxis span{font-size:10px;color:#94a3b8}
.tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
input[type=search]{flex:1;min-width:220px;height:36px;padding:0 12px;border:1px solid #e2e8f0;border-radius:9px;font:inherit;background:#f8fafc}
input[type=search]:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
select{height:36px;padding:0 10px;border:1px solid #e2e8f0;border-radius:9px;font:inherit;background:#f8fafc}
.count{font-size:12px;color:#64748b;margin-left:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:9px 10px;text-align:left}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;cursor:pointer;user-select:none;white-space:nowrap;position:sticky;top:0;background:#fff}
th:hover{color:#3b82f6}
tbody tr:nth-child(even){background:#fafbfc}
tbody tr:hover{background:#eff6ff}
td{border-top:1px solid #f1f5f9;vertical-align:top}
.nowrap{white-space:nowrap}
.tablebox{max-height:620px;overflow:auto;border-radius:10px}
footer{margin-top:26px;text-align:center;font-size:12px;color:#94a3b8}
@media(max-width:1000px){.g6{grid-template-columns:repeat(3,1fr)}.g3,.g2{grid-template-columns:1fr}}
@media(max-width:560px){.g6{grid-template-columns:repeat(2,1fr)}}
@media print{
  body{background:#fff}
  .wrap{max-width:none;padding:0}
  .card,.kpi{box-shadow:none;border:0;break-inside:avoid;page-break-inside:avoid}
  .kpi:hover{transform:none;box-shadow:none}
  /* Fora do PDF: listagens item a item (leads detalhados e recentes).
     São elas que faziam o arquivo virar dezenas de páginas. */
  .no-print,.tools,.dot{display:none !important}
  .tablebox{max-height:none;overflow:visible}
  th{position:static}
  section{break-inside:avoid}
  .grid{gap:10px}
  @page{margin:12mm}
}
</style></head>
<body><div class="wrap">
<header>
  <div><h1>Relatório de Leads</h1>
  <p class="meta">${esc(periodLabel(from, to))}</p>
  <p class="meta author">${autorLinha}</p></div>
  <div class="meta"><b>${intFmt.format(total)}</b> leads no período</div>
</header>

<section class="grid g6" style="margin-bottom:14px">${kpiCards}</section>

<section class="grid g3" style="margin-bottom:14px">
  <div class="card">
    <h2>Entradas de leads</h2>
    <div class="big">${intFmt.format(total)}</div>
    <p class="sub">no período · média ${intFmt.format(mediaDia)}/dia · ${serie.length} dia(s)</p>
    ${areaChartSvg(serie)}
  </div>
  <div class="card"><h2>Funil comercial</h2>${funilHtml}</div>
</section>

<section class="grid g3" style="margin-bottom:14px">
  <div class="card"><h2>Leads por empreendimento</h2>${barList(porEmpreendimento.slice(0, 12), total, P2)}</div>
  <div class="col">
    <div class="card"><h2>Distribuição por empreendimento</h2>${donutSvg(porEmpreendimento, total, P2)}</div>
    <div class="card"><h2>Origem dos leads</h2>${barList(porOrigem.slice(0, 8), total, P1)}</div>
  </div>
</section>

<section class="grid g2" style="margin-bottom:14px">
  <div class="card">
    <h2>Melhores horários de captação</h2>
    <p class="sub">Dia da semana × hora - onde o lead realmente chega</p>
    ${heatmapHtml(heat)}
  </div>
  <div class="card no-print">
    <h2>Leads recentes</h2>
    ${recentesHtml(leads)}
  </div>
</section>

<section class="grid g2" style="margin-bottom:14px">
  <div class="card"><h2>Por situação</h2>${barList(porSituacao.slice(0, 10), total, P1)}</div>
  <div class="col">
    <div class="card"><h2>Por mídia</h2>${barList(porMidia.slice(0, 6), total, P2)}</div>
    <div class="card"><h2>Por imobiliária</h2>${barList(porImobiliaria.slice(0, 6), total, P1)}</div>
  </div>
</section>

<section class="card no-print">
  <h2>Leads detalhados</h2>
  <div class="tools">
    <input type="search" id="q" placeholder="Buscar por nome, e-mail, empreendimento, origem..." />
    <select id="fsit"><option value="">Todas as situações</option>
      ${porSituacao.map(s => `<option>${esc(s.name)}</option>`).join('')}</select>
    <select id="femp"><option value="">Todos os empreendimentos</option>
      ${porEmpreendimento.map(s => `<option>${esc(s.name)}</option>`).join('')}</select>
    <span class="count" id="cnt"></span>
  </div>
  <div class="tablebox"><table id="tb">
    <thead><tr>
      <th data-i="0">Nome</th><th data-i="1">Situação</th><th data-i="2">Empreendimento</th>
      <th data-i="3">Origem</th><th data-i="4">Mídia</th><th data-i="5">Imobiliária</th>
      <th data-i="6">Corretor</th><th data-i="7">Cadastro</th><th data-i="8">E-mail</th><th data-i="9">Telefone</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>

<footer>${autorLinha} · Menin Office</footer>
</div>
<script>
(function(){
  var tb=document.getElementById('tb'), body=tb.tBodies[0];
  var all=[].slice.call(body.rows);
  var q=document.getElementById('q'), fs=document.getElementById('fsit'), fe=document.getElementById('femp'), cnt=document.getElementById('cnt');
  function txt(r,i){return (r.cells[i].textContent||'').toLowerCase();}
  function apply(){
    var s=q.value.trim().toLowerCase(), sit=fs.value.toLowerCase(), emp=fe.value.toLowerCase(), n=0;
    all.forEach(function(r){
      var ok=(!s||r.textContent.toLowerCase().indexOf(s)>-1)
          && (!sit||txt(r,1)===sit) && (!emp||txt(r,2)===emp);
      r.style.display=ok?'':'none'; if(ok)n++;
    });
    cnt.textContent=n+' de '+all.length+' lead(s)';
  }
  q.addEventListener('input',apply); fs.addEventListener('change',apply); fe.addEventListener('change',apply);
  var dir={};
  [].forEach.call(tb.tHead.rows[0].cells,function(th){
    th.addEventListener('click',function(){
      var i=+th.dataset.i; dir[i]=!dir[i]; var m=dir[i]?1:-1;
      var rows=all.slice().sort(function(a,b){
        var x=txt(a,i), y=txt(b,i);
        return x<y?-m:x>y?m:0;
      });
      rows.forEach(function(r){body.appendChild(r);});
    });
  });
  apply();
})();
</script>
</body></html>`;
}
