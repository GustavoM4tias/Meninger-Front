// utils/Signature/signatureDocumentApi.js
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = '/signature-documents';

// ── Documentos ────────────────────────────────────────────────────────────────

/** Cria documento com N assinantes */
export async function createDocumentApi(payload) {
  return requestWithAuth(BASE, { method: 'POST', body: JSON.stringify(payload) });
}

/** Lista documentos criados por mim */
export async function listMyDocumentsApi({ page = 1, limit = 20, status } = {}) {
  const p = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) p.set('status', status);
  return requestWithAuth(`${BASE}?${p}`);
}

/** Lista meus itens de assinatura (como assinante) */
export async function listMySigningItemsApi({ page = 1, limit = 20, status } = {}) {
  const p = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) p.set('status', status);
  return requestWithAuth(`${BASE}/my-items?${p}`);
}

/** Badge count de itens aguardando minha assinatura */
export async function getPendingSignerCountApi() {
  return requestWithAuth(`${BASE}/pending-count`);
}

/** Detalhe de um documento */
export async function getDocumentApi(id) {
  return requestWithAuth(`${BASE}/${id}`);
}

/** Excluir documento PENDING (apenas criador) */
export async function deleteDocumentApi(id) {
  return requestWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
}

// ── Ações de assinante ────────────────────────────────────────────────────────

/** Inicia sessão de assinatura para um signer_id (REQUESTED → PENDING) */
export async function initiateSignerApi(signerId) {
  return requestWithAuth(`${BASE}/signers/${signerId}/initiate`, { method: 'POST' });
}

/** Verifica MFA e assina */
export async function signDocumentApi(payload) {
  return requestWithAuth(`${BASE}/signers/${payload.signer_id}/sign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Cancela assinatura SIGNED com MFA (strict — cancela todo o fluxo) */
export async function cancelSignerApi(signerId, { password, face_embedding, reason } = {}) {
  return requestWithAuth(`${BASE}/signers/${signerId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ password, face_embedding, reason }),
  });
}

/** Recusa solicitação REQUESTED (sem MFA — strict) */
export async function rejectSignerApi(signerId, reason = '') {
  return requestWithAuth(`${BASE}/signers/${signerId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ── Validação pública ─────────────────────────────────────────────────────────

export async function validateDocumentApi(code) {
  return requestWithAuth(`${BASE}/validate/${code}`);
}

// ── Upload (reutiliza o endpoint existente) ───────────────────────────────────
export async function uploadSignatureDocApi(file) {
  const form = new FormData();
  form.append('file', file);
  form.append('context', 'signature_doc');
  return requestWithAuth('/uploads', { method: 'POST', body: form });
}
