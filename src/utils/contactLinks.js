// utils/contactLinks.js
//
// Atalhos de contato: telefone abre conversa no WhatsApp, e-mail abre o
// cliente de e-mail. Números brasileiros sem DDI ganham o 55.

const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export function whatsappUrl(phone) {
    let d = onlyDigits(phone);
    if (!d) return null;
    if (d.length <= 11) d = `55${d}`;
    return `https://wa.me/${d}`;
}

export function mailtoUrl(email) {
    const e = String(email || '').trim();
    return e ? `mailto:${e}` : null;
}
