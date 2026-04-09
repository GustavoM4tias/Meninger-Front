// stores/Signature/signatureStore.js
import { defineStore } from 'pinia';
import {
  initiateSignatureApi,
  signDocumentApi,
  listSignaturesApi,
  getSignatureByIdApi,
  validateSignatureApi,
} from '@/utils/Signature/signatureApi';

function getErrMsg(err, fallback = 'Erro inesperado.') {
  if (typeof err?.message === 'string') return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

export const useSignatureStore = defineStore('signature', {
  state: () => ({
    // ── Fluxo de assinatura ────────────────────────────────────────────────
    // Sessão ativa (após initiate)
    session: null,       // { signature_id, signature_token, expires_at, document_name }
    loading: false,
    error: null,

    // Resultado final (após sign)
    result: null,        // { signature_id, signed_at, verification_code, document_name }

    // ── Listagem ───────────────────────────────────────────────────────────
    signatures: [],
    signaturesTotal: 0,
    signaturesPage: 1,

    // ── Detalhe / validação ────────────────────────────────────────────────
    detail: null,
    validationResult: null,
  }),

  getters: {
    hasActiveSession: (state) => !!state.session && !state.result,
    isSigned: (state) => !!state.result,
  },

  actions: {
    reset() {
      this.session = null;
      this.result = null;
      this.error = null;
      this.loading = false;
    },

    /**
     * Fase 1 — inicia sessão de assinatura.
     * @param {{ document_type?, document_ref?, document_url?, document_hash?, document_name, metadata? }} payload
     */
    async initiate(payload) {
      this.reset();
      this.loading = true;
      try {
        const res = await initiateSignatureApi(payload);
        this.session = res.data;
        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        if (err?.payload?.code === 'FACE_NOT_ENROLLED') {
          this.error = 'Reconhecimento facial não cadastrado. Cadastre seu rosto nas configurações antes de assinar.';
        }
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fase 2 — verifica password + face e assina.
     * @param {{ password: string, face_embedding: number[] }} credentials
     */
    async sign(credentials) {
      if (!this.session?.signature_token) {
        throw new Error('Nenhuma sessão de assinatura ativa. Chame initiate() primeiro.');
      }
      this.loading = true;
      this.error = null;
      try {
        const res = await signDocumentApi({
          signature_token: this.session.signature_token,
          password: credentials.password,
          face_embedding: credentials.face_embedding,
        });
        this.result = res.data;
        this.session = null;
        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Atalho para o fluxo completo quando já temos embedding e password.
     * Útil para componentes que coletam tudo de uma vez.
     */
    async initiateAndSign(documentPayload, credentials) {
      await this.initiate(documentPayload);
      return await this.sign(credentials);
    },

    // ── Listagem ─────────────────────────────────────────────────────────────
    async fetchList({ page = 1, limit = 20, status, document_type } = {}) {
      this.loading = true;
      try {
        const res = await listSignaturesApi({ page, limit, status, document_type });
        this.signatures = res.data.items;
        this.signaturesTotal = res.data.total;
        this.signaturesPage = res.data.page;
      } catch (err) {
        this.error = getErrMsg(err);
      } finally {
        this.loading = false;
      }
    },

    async fetchById(id) {
      this.loading = true;
      try {
        const res = await getSignatureByIdApi(id);
        this.detail = res.data;
      } catch (err) {
        this.error = getErrMsg(err);
      } finally {
        this.loading = false;
      }
    },

    async validate(code) {
      this.loading = true;
      this.validationResult = null;
      try {
        const res = await validateSignatureApi(code);
        this.validationResult = res.data;
        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
