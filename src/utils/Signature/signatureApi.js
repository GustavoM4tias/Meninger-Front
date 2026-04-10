import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

/** Fase 1 — inicia sessão de auto-assinatura */
export async function initiateSignatureApi(payload) {
  return requestWithAuth('/signatures/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Fase 1 — destinatário inicia sessão de uma solicitação recebida */
export async function initiateFromRequestApi(signatureId) {
  return requestWithAuth(`/signatures/initiate-request/${signatureId}`, {
    method: 'POST',
  });
}

/** Fase 2 — verifica MFA e assina */
export async function signDocumentApi(payload) {
  return requestWithAuth('/signatures/sign', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Solicitar assinatura de outro usuário */
export async function requestSignatureApi(payload) {
  return requestWithAuth('/signatures/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Histórico de assinaturas do usuário autenticado */
export async function listSignaturesApi({
  page = 1,
  limit = 10,
  status,
  document_type,
  q,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) params.set('status', status);
  if (document_type) params.set('document_type', document_type);
  if (q) params.set('q', q);

  return requestWithAuth(`/signatures?${params.toString()}`);
}

/** Solicitações enviadas pelo usuário */
export async function listSentRequestsApi({
  page = 1,
  limit = 10,
  status,
  q,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) params.set('status', status);
  if (q) params.set('q', q);

  return requestWithAuth(`/signatures/sent?${params.toString()}`);
}

/** Documentos aguardando assinatura do usuário */
export async function listPendingApi({
  page = 1,
  limit = 10,
  q,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (q) params.set('q', q);

  return requestWithAuth(`/signatures/pending?${params.toString()}`);
}

/** Badge count — documentos pendentes */
export async function getPendingCountApi() {
  return requestWithAuth('/signatures/pending-count');
}

/** Detalhe de uma assinatura */
export async function getSignatureByIdApi(id) {
  return requestWithAuth(`/signatures/${id}`);
}

/** Cancelar assinatura SIGNED com MFA (senha + face) */
export async function cancelSignatureApi(id, { password, face_embedding, reason } = {}) {
  return requestWithAuth(`/signatures/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ password, face_embedding, reason }),
  });
}

/** Recusar uma solicitação REQUESTED (sem MFA) */
export async function rejectRequestApi(id, reason = '') {
  return requestWithAuth(`/signatures/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** Validação pública por código */
export async function validateSignatureApi(code) {
  return requestWithAuth(`/signatures/validate/${code}`);
}

/** Excluir registro de assinatura/solicitação */
export async function deleteSignatureRecordApi(id) {
  return requestWithAuth(`/signatures/${id}`, {
    method: 'DELETE',
  });
}

/** Upload de PDF para assinatura via contexto SIGNATURE_DOC */
export async function uploadSignatureDocApi(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('context', 'signature_doc');

  return requestWithAuth('/uploads', {
    method: 'POST',
    body: formData,
  });
}