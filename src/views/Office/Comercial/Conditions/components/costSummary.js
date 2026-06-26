// Calcula o resumo de custos por pagador (Menin / Cliente) para um módulo.
// Mantido em sincronia com o backend services/comercial/conditionCostSummary.js
// (mesma regra, mesmos rótulos). Usado no DocsSection (form) e no SummaryExport (resumo + PDF).
//
// Modelo de pagador UNIFORME por item, com fallback ao legado:
//  - CCA: cca_paid_by, ou (legado) 'menin' quando cca_charges_company.
//  - Certificação Digital: digital_cert_paid_by, ou (legado) 'menin' quando tem custo.
//  - Pacote CEF: cef_package_paid_by ('menin' | 'client').
//  - ITBI: itbi_paid_by (default 'client'), e só conta quando NÃO isento.
//  - Cartório (prenotação + registro): cartorio_paid_by ('menin' | 'client').

const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);

// Pagador de cada item: campo novo (uniforme) com fallback ao legado.
export function ccaPayer(mod)  { return mod.cca_paid_by || (mod.cca_charges_company ? 'menin' : null); }
export function certPayer(mod) { return mod.digital_cert_paid_by || (mod.digital_cert_has_cost ? 'menin' : null); }
export function itbiPayer(mod) { return mod.itbi_paid_by || 'client'; }

export function computeCostSummary(mod = {}) {
    const menin = [];
    const client = [];
    const add = (payer, label, value) => {
        if (value <= 0) return;
        if (payer === 'menin') menin.push({ label, value });
        else if (payer === 'client') client.push({ label, value });
    };

    add(ccaPayer(mod),  'CCA', num(mod.cca_cost));
    add(certPayer(mod), 'Certificação Digital', num(mod.digital_cert_cost));
    add(mod.cef_package_paid_by, 'Pacote CEF', num(mod.cef_package_avg_value));
    if (!mod.itbi_exempt) add(itbiPayer(mod), 'ITBI', num(mod.itbi_avg_value));
    if (mod.cartorio_paid_by) {
        add(mod.cartorio_paid_by, 'Cartório - Prenotação', num(mod.cartorio_prenotacao_value));
        add(mod.cartorio_paid_by, 'Cartório - Registro',   num(mod.cartorio_registration_value));
    }

    const totalMenin  = menin.reduce((sum, item) => sum + item.value, 0);
    const totalClient = client.reduce((sum, item) => sum + item.value, 0);

    return { menin, client, totalMenin, totalClient };
}
