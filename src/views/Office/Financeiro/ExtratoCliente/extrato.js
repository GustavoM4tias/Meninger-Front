// Utilitários do Extrato do Cliente (lista e modal).

/** CPF (11) ou CNPJ (14) digitado, com ou sem pontuação. */
export function ehDocumento(texto) {
    const t = String(texto || '').trim();
    const d = t.replace(/\D/g, '');
    return (d.length === 11 || d.length === 14) && /^[\d.\-/\s]+$/.test(t);
}

/** `000.000.000-00` / `00.000.000/0000-00`; o resto volta como veio. */
export function fmtDocumento(doc) {
    const d = String(doc || '').replace(/\D/g, '');
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc || '';
}

/** Minúsculo e sem acento, para busca. */
export function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
