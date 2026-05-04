// Calcula o resumo de custos por pagador (Menin / Cliente) para um módulo.
// Usado tanto no DocsSection (form) quanto no SummaryExport (resumo + PDF).
//
// Regras:
//  - CCA: vai para Menin SE cca_charges_company === true (a empresa cobra da Menin)
//  - Pacote CEF: segue cef_package_paid_by ('menin' | 'client')
//  - ITBI: sempre do CLIENTE (e só conta quando NÃO isento)
//  - Cartório (prenotação + registro): segue cartorio_paid_by ('menin' | 'client')
//  - Certificação Digital: sempre Menin SE digital_cert_has_cost === true

export function computeCostSummary(mod) {
    const menin = [];
    const client = [];
    const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);

    if (mod.cca_charges_company && num(mod.cca_cost) > 0) {
        menin.push({ label: 'CCA', value: num(mod.cca_cost) });
    }

    if (mod.digital_cert_has_cost && num(mod.digital_cert_cost) > 0) {
        menin.push({ label: 'Certificação Digital', value: num(mod.digital_cert_cost) });
    }

    const cef = num(mod.cef_package_avg_value);
    if (cef > 0) {
        if (mod.cef_package_paid_by === 'menin') menin.push({ label: 'Pacote CEF', value: cef });
        else if (mod.cef_package_paid_by === 'client') client.push({ label: 'Pacote CEF', value: cef });
    }

    if (!mod.itbi_exempt) {
        const itbi = num(mod.itbi_avg_value);
        if (itbi > 0) client.push({ label: 'ITBI', value: itbi });
    }

    const preno = num(mod.cartorio_prenotacao_value);
    const reg = num(mod.cartorio_registration_value);
    if (preno > 0 || reg > 0) {
        const target = mod.cartorio_paid_by === 'menin' ? menin : (mod.cartorio_paid_by === 'client' ? client : null);
        if (target) {
            if (preno > 0) target.push({ label: 'Cartório — Prenotação', value: preno });
            if (reg > 0) target.push({ label: 'Cartório — Registro',    value: reg });
        }
    }

    const totalMenin  = menin.reduce((sum, item) => sum + item.value, 0);
    const totalClient = client.reduce((sum, item) => sum + item.value, 0);

    return { menin, client, totalMenin, totalClient };
}
