// views/Office/Marketing/ProjecaoInvestimentos/projFormat.js
// Formatação da tela Projeção de Investimentos. O número curto ("R$ 1,35 mi",
// "R$ 30,5 mil") é o que cabe em KPI e em célula; o cheio vai no title.
import { fmtMoney } from '@/utils/format';

export function brl(v) {
    const n = Number(v) || 0;
    const abs = Math.abs(n);
    if (abs >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
    if (abs >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
    return `R$ ${Math.round(n).toLocaleString('pt-BR')}`;
}

export function brlCheio(v) {
    return fmtMoney(Number(v) || 0, { casas: 0 });
}

export function pct(v, casas = 1) {
    return `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}
