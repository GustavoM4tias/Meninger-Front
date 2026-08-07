// useAboutMetrics — números ao vivo das telas "Sobre o Office".
// ─────────────────────────────────────────────────────────────────────────────
// Busca GET /api/about/metrics (admin) e transforma o retorno nos cartões de
// topo. Os números crescem sozinhos: o volume vem do uso real do sistema e a
// economia de assinatura acumula por dia corrido desde o corte.
//
// Se a chamada falhar, a tela continua de pé com os números congelados do
// relatório de agosto/2026 (officeHighlights) — a página nunca fica vazia.

import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { officeHighlights, replacedSystems, officeReport } from '@/config/aboutOffice';

function brl(value, { compact = false } = {}) {
    const n = Number(value) || 0;
    if (compact && n >= 1000) {
        return `R$ ${Math.round(n / 1000).toLocaleString('pt-BR')} mil`;
    }
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/** Valor cheio, com centavos: para dinheiro arrecadado, arredondar engana. */
function brlFull(value) {
    return (Number(value) || 0).toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
}

function int(value) {
    return (Number(value) || 0).toLocaleString('pt-BR');
}

/** Percentual com vírgula, como se lê em português: 41,4%. */
function pct(value) {
    return `${(Number(value) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function fmtDate(value) {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export function useAboutMetrics() {
    const metrics = ref(null);
    const loading = ref(false);
    const error = ref(null);

    async function load({ refresh = false } = {}) {
        loading.value = true;
        error.value = null;
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${API_URL}/about/metrics${refresh ? '?refresh=1' : ''}`, {
                headers: { Authorization: token ? `Bearer ${token}` : '' },
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data?.error || `Erro na requisição (${resp.status}).`);
            metrics.value = data;
        } catch (err) {
            error.value = err.message;
            metrics.value = null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Texto do tooltip de economia. Explica por que o número é MENOR que os
     * "R$ 33 mil por ano" do relatório: aqui é o acumulado desde o corte, e não
     * a taxa anual. E lista tudo que o Office já substituiu.
     */
    function buildSavingsInfo(m) {
        const subs = m.subscriptions?.items || [];
        const linhas = subs.map(s =>
            `<li>${s.label}: <b>${brl(s.accumulated)}</b> acumulados desde ${fmtDate(s.since)} (${int(s.days)} dias, ${brl(s.annual)}/ano)</li>`
        ).join('');
        const substituidos = replacedSystems.map(r => `<li>${r.name} → ${r.by}</li>`).join('');

        return `
            <div style="text-align:left;max-width:330px">
              <b>Assinaturas cortadas</b>
              <ul style="margin:4px 0 0;padding-left:16px">${linhas}</ul>
              <p style="margin:6px 0 0;opacity:.85">
                Conta o que já foi economizado desde a data do corte, não o valor de um ano cheio:
                somadas, as assinaturas valem ${brl(m.subscriptions?.annual)} por ano.
              </p>
              <b style="display:block;margin-top:8px">Trabalho devolvido</b>
              <p style="margin:2px 0 0;opacity:.85">
                ${brl(m.work?.hoursValue)} em ${int(Math.round(m.work?.totalHours || 0))} horas,
                a ${brlFull(m.assumptions?.hourlyCost)} a hora.
              </p>
              <b style="display:block;margin-top:8px">Também substituídos, sem mensalidade</b>
              <ul style="margin:4px 0 0;padding-left:16px">${substituidos}</ul>
            </div>`;
    }

    /** Cartões de topo: ao vivo quando o backend responde, congelados quando não. */
    const highlights = computed(() => {
        const m = metrics.value;
        if (!m) return officeHighlights;

        const horas = Math.round(m.work?.totalHours || 0);
        const casos = m.work?.totalCases || 0;
        const anualAssinaturas = m.subscriptions?.annual || 0;

        return [
            {
                v: brl(m.totalSaved),
                l: 'economizados até agora',
                s: `Acumulado desde cada corte. Só de assinatura são ${brl(anualAssinaturas)} por ano`,
                info: buildSavingsInfo(m),
            },
            {
                v: `${int(horas)} h`,
                l: 'de trabalho manual devolvidas',
                s: `${int(casos)} casos resolvidos sozinhos, a ${brlFull(m.assumptions?.hourlyCost)} a hora`,
            },
            {
                v: int(m.counts?.contratosValidados),
                l: 'contratos validados por IA',
                s: `${int(m.counts?.contratosReprovados)} erros impedidos de subir para assinatura`,
            },
            {
                v: brlFull(m.counts?.valorPago),
                l: 'arrecadados pelo boleto do ato',
                s: `${int(m.counts?.boletosEmitidos)} boletos emitidos, ${int(m.counts?.titularBarrados)} barrados pela validação`,
            },
        ];
    });

    /** Linha de rodapé explicando a origem e o horário do número. */
    const updatedLabel = computed(() => {
        const m = metrics.value;
        if (!m) return 'Números do relatório executivo de agosto de 2026.';
        const when = new Date(m.generatedAt).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        return `Números lidos do próprio sistema em ${when} e atualizados a cada uso.`;
    });

    const isLive = computed(() => !!metrics.value);

    /**
     * Blocos da seção "Ganhos verificados" reescritos com o número do banco.
     * Sem isso, o texto congela: o relatório nasceu com os volumes de 4 de
     * agosto de 2026 e envelhece a cada boleto novo.
     */
    function buildGanhosBlocks(m) {
        const c = m.counts || {};
        const w = m.work || {};
        const horas = Math.round(w.totalHours || 0);
        // Jornada mensal de 200 h: dá a leitura de "quantos meses de gente".
        const meses = (horas / 200).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        const hoje = new Date(m.generatedAt).toLocaleDateString('pt-BR', {
            day: 'numeric', month: 'long', year: 'numeric',
        });

        const linhas = (w.breakdown || []).filter(i => i.cases > 0);
        const tempoRows = linhas.map(i => [
            i.label, int(i.cases), `${i.minutes} min`, `${Math.round(i.hours)} h`,
        ]);
        tempoRows.push(['Total', int(w.totalCases), '', `${int(horas)} h`]);

        const economiaRows = (m.subscriptions?.items || []).map(s => [
            s.label,
            `${brl(s.annual)} por ano eliminados. Já são ${brl(s.accumulated)} economizados desde ${fmtDate(s.since)}, e o valor cresce todo dia`,
        ]);

        return [
            { type: 'p', text: `Medidos nas telas do próprio sistema, no acumulado até ${hoje}. Não são estimativas: cada número abaixo é lido do banco no momento em que esta página abre.` },
            {
                type: 'table',
                caption: 'O que a automação já produziu.',
                head: ['Frente', 'Volume', 'O que significa'],
                rows: [
                    ['Boleto do ato',
                        `${int(c.boletosEmitidos)} boletos, ${brlFull(c.valorEmitido)} emitidos`,
                        `${brlFull(c.valorPago)} já pagos, ${pct(c.taxaPagamentoBoleto)} do emitido. Pela primeira vez a empresa enxerga ${brlFull(c.valorEmAberto)} em aberto e ${pct(c.taxaEvasaoBoleto)} de evasão, boleto a boleto`],
                    ['Validação do titular',
                        `${int(c.titularBarrados)} emissões barradas antes de sair`,
                        'Boleto com dado errado não chega ao cliente: o motivo volta à reserva, campo a campo'],
                    ['Cancelamento de reservas',
                        `${int(c.cancelamentosCasos)} casos, ${pct(c.taxaSucessoCancelamento)} de sucesso`,
                        `A unidade é liberada corretamente e volta ao estoque na hora: ${int(c.unidadesLiberadas)} unidades liberadas e ${int(c.contratosExcluidosSienge)} contratos excluídos no Sienge, com ${int(c.cancelamentosConferencia)} casos separados para conferência humana`],
                    ['Cadastro de imobiliárias',
                        `${int(c.imobiliariasPorLink)} parceiras, todas por link`,
                        `Nenhuma digitação interna, sobre uma base de ${int(c.imobiliariasBase)} imobiliárias no CV`],
                    ['Validação de contratos',
                        `${int(c.contratosValidados)} contratos analisados`,
                        `${int(c.contratosAprovados)} aprovados e ${int(c.contratosReprovados)} reprovados antes de seguir, com a etapa liberada automaticamente no CRM`],
                ],
            },
            {
                type: 'table',
                caption: 'Tempo devolvido, em dinheiro.',
                head: ['Frente', 'Casos', 'Premissa', 'Tempo'],
                rows: tempoRows,
            },
            { type: 'p', text: `As ${int(horas)} horas equivalem a ${meses} mês de jornada integral de um colaborador. A hora de um analista em custo médio de ${brlFull(m.assumptions?.hourlyCost)} faz essas horas valerem cerca de ${brl(w.hoursValue)} em automações, e contando.` },
            { type: 'p', text: 'Automação não corta uma despesa uma vez: ela deixa de gerar custo e passa a gerar economia. As mesmas horas voltariam a ser pagas a cada novo ciclo de contratos, boletos e cadastros. Aqui elas não voltam, e o valor cresce sozinho a cada período.' },
            {
                type: 'table',
                caption: 'Economia direta.',
                head: ['Frente', 'Economia'],
                rows: economiaRows.length ? economiaRows : [['Assinaturas cortadas', 'Sem dado disponível no momento.']],
            },
        ];
    }

    /** O relatório inteiro, com a seção de ganhos atualizada quando há dados. */
    const reportSections = computed(() => {
        const m = metrics.value;
        if (!m) return officeReport;
        return officeReport.map(section =>
            section.id === 'ganhos' ? { ...section, blocks: buildGanhosBlocks(m) } : section
        );
    });

    return { metrics, loading, error, load, highlights, updatedLabel, isLive, reportSections };
}
