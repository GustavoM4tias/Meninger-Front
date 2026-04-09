// utils/Signature/signatureApi.js
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = '/api/signatures';

/**
 * Fase 1: Inicia sessão de assinatura.
 * O backend valida que o usuário tem facial cadastrado.
 *
 * @param {{ document_type?, document_ref?, document_url?, document_hash?, document_name, metadata? }} payload
 * @returns {{ data: { signature_id, signature_token, expires_at, document_name } }}
 */
export async function initiateSignatureApi(payload) {
  return requestWithAuth(`${BASE}/initiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fase 2: Envia senha + embedding facial para assinar.
 *
 * @param {{ signature_token, password, face_embedding: number[] }} payload
 * @returns {{ data: { signature_id, signed_at, verification_code, document_name } }}
 */
export async function signDocumentApi(payload) {
  return requestWithAuth(`${BASE}/sign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Lista assinaturas do usuário autenticado.
 */
export async function listSignaturesApi({ page = 1, limit = 20, status, document_type } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (document_type) params.set('document_type', document_type);
  return requestWithAuth(`${BASE}?${params}`);
}

/**
 * Busca uma assinatura específica por ID.
 */
export async function getSignatureByIdApi(id) {
  return requestWithAuth(`${BASE}/${id}`);
}

/**
 * Validação pública de autenticidade pelo código de verificação.
 * Não requer autenticação.
 */
export async function validateSignatureApi(verification_code) {
  return requestWithAuth(`${BASE}/validate/${verification_code}`);
}
