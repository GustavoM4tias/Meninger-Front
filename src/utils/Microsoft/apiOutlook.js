// utils/Microsoft/apiOutlook.js
//
// Nenhuma destas chamadas manda o endereço da caixa: quem resolve isso é o
// backend, a partir de quem está autenticado. Se um dia aparecer um parâmetro
// de caixa aqui, é bug de segurança, não conveniência.

import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const B = (body) => ({ method: 'POST',   body: JSON.stringify(body ?? {}) });
const P = (body) => ({ method: 'PATCH',  body: JSON.stringify(body ?? {}) });
const D = ()     => ({ method: 'DELETE' });

const R = '/microsoft/outlook';

// ── Leitura ───────────────────────────────────────────────────────────────────
export const getFolders    = ()   => requestWithAuth(`${R}/folders`);
export const getUnread     = ()   => requestWithAuth(`${R}/unread`);
export const getCategories = ()   => requestWithAuth(`${R}/categories`);
export const getMailbox    = ()   => requestWithAuth(`${R}/mailbox-settings`);

export const listMessages = (params = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== '' && v !== null && v !== undefined && v !== false) qs.set(k, v === true ? '1' : v);
    }
    return requestWithAuth(`${R}/messages?${qs}`);
};

export const getMessage = (id) => requestWithAuth(`${R}/messages/${id}`);

/** URL do anexo (o navegador busca direto; o backend faz o proxy autenticado). */
export const attachmentUrl = (id, attachmentId, download) =>
    `${R}/messages/${id}/attachments/${attachmentId}${download ? '?dl=1' : ''}`;

// ── Organização ───────────────────────────────────────────────────────────────
export const setRead       = (id, isRead)     => requestWithAuth(`${R}/messages/${id}/read`,       P({ isRead }));
export const setFlag       = (id, flagged)    => requestWithAuth(`${R}/messages/${id}/flag`,       P({ flagged }));
export const setCategories = (id, categories) => requestWithAuth(`${R}/messages/${id}/categories`, P({ categories }));
export const moveMessage   = (id, destinationId) => requestWithAuth(`${R}/messages/${id}/move`,    B({ destinationId }));
export const deleteMessage = (id)             => requestWithAuth(`${R}/messages/${id}`,            D());

// ── Rascunho e envio ──────────────────────────────────────────────────────────
export const createDraft  = (data)     => requestWithAuth(`${R}/drafts`,            B(data));
export const updateDraft  = (id, data) => requestWithAuth(`${R}/drafts/${id}`,      P(data));
export const sendDraft    = (id)       => requestWithAuth(`${R}/drafts/${id}/send`, B());
export const sendMail     = (data)     => requestWithAuth(`${R}/send`,              B(data));

/** kind: reply | replyAll | forward — o Outlook já monta a citação e o assunto. */
export const createReplyDraft = (id, kind) => requestWithAuth(`${R}/messages/${id}/${kind}`, B());

export const addAttachment = (id, file) => requestWithAuth(`${R}/drafts/${id}/attachments`, B(file));
export const removeAttachment = (id, attachmentId) =>
    requestWithAuth(`${R}/drafts/${id}/attachments/${attachmentId}`, D());
