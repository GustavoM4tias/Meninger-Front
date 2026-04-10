// stores/Signature/signatureDocumentStore.js
import { defineStore } from 'pinia';
import {
  createDocumentApi,
  listMyDocumentsApi,
  listMySigningItemsApi,
  getPendingSignerCountApi,
  getDocumentApi,
  deleteDocumentApi,
  initiateSignerApi,
  signDocumentApi,
  cancelSignerApi,
  rejectSignerApi,
  validateDocumentApi,
} from '@/utils/Signature/signatureDocumentApi';

function getErrMsg(err, fallback = 'Erro inesperado.') {
  if (typeof err?.message === 'string') return err.message;
  if (typeof err?.response?.data?.error === 'string') return err.response.data.error;
  return fallback;
}

export const useSignatureDocumentStore = defineStore('signatureDocument', {
  state: () => ({
    loading:      false,
    error:        null,

    // Documentos que criei
    myDocuments:  [],
    myDocsMeta:   { total: 0, page: 1, limit: 20, totalPages: 1 },

    // Itens de assinatura para mim (como assinante)
    mySigningItems: [],
    mySigningMeta:  { total: 0, page: 1, limit: 20, totalPages: 1 },

    // Badge
    pendingCount: 0,

    // Detalhe
    detail:  null,

    // Sessão de assinatura ativa (signer_token, signer_id, etc.)
    session: null,
    signResult: null,

    validationResult: null,
  }),

  getters: {
    pendingItems: (state) => state.mySigningItems.filter(s => s.status === 'REQUESTED'),
  },

  actions: {
    // ── Documentos ──────────────────────────────────────────────────────────

    async createDocument(payload) {
      this.loading = true; this.error = null;
      try {
        const res = await createDocumentApi(payload);
        await this.fetchMyDocuments();
        return res.data;
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    async fetchMyDocuments({ page = 1, limit = 20, status } = {}) {
      this.loading = true; this.error = null;
      try {
        const res = await listMyDocumentsApi({ page, limit, status });
        this.myDocuments = res.data?.items ?? [];
        this.myDocsMeta  = { total: res.data?.total ?? 0, page, limit, totalPages: Math.max(1, Math.ceil((res.data?.total ?? 0) / limit)) };
      } catch (err) { this.error = getErrMsg(err); }
      finally { this.loading = false; }
    },

    async fetchMySigningItems({ page = 1, limit = 20, status } = {}) {
      this.loading = true; this.error = null;
      try {
        const res = await listMySigningItemsApi({ page, limit, status });
        this.mySigningItems = res.data?.items ?? [];
        this.mySigningMeta  = { total: res.data?.total ?? 0, page, limit, totalPages: Math.max(1, Math.ceil((res.data?.total ?? 0) / limit)) };
      } catch (err) { this.error = getErrMsg(err); }
      finally { this.loading = false; }
    },

    async fetchPendingCount() {
      try {
        const res = await getPendingSignerCountApi();
        this.pendingCount = res.data?.count ?? 0;
      } catch { /* silencioso */ }
    },

    async fetchDocument(id) {
      this.loading = true; this.error = null;
      try {
        const res  = await getDocumentApi(id);
        this.detail = res.data;
        return res.data;
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    async deleteDocument(id) {
      this.loading = true; this.error = null;
      try {
        await deleteDocumentApi(id);
        this.myDocuments = this.myDocuments.filter(d => d.id !== id);
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    // ── Fluxo de assinatura ──────────────────────────────────────────────────

    /** Fase 1: inicia sessão de assinatura para um signer item */
    async initiateSigner(signerId) {
      this.loading = true; this.error = null; this.session = null;
      try {
        const res   = await initiateSignerApi(signerId);
        this.session = res.data;
        return res.data;
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    /** Fase 2: verifica MFA e assina */
    async sign(credentials) {
      if (!this.session?.signer_token) throw new Error('Nenhuma sessão ativa.');
      this.loading = true; this.error = null;
      try {
        const res = await signDocumentApi({
          signer_id:      this.session.signer_id,
          signer_token:   this.session.signer_token,
          password:       credentials.password,
          face_embedding: credentials.face_embedding,
        });
        this.signResult = res.data;
        this.session    = null;
        if (this.pendingCount > 0) this.pendingCount--;
        return res.data;
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    async cancelSigner(signerId, { password, face_embedding, reason } = {}) {
      this.loading = true; this.error = null;
      try {
        await cancelSignerApi(signerId, { password, face_embedding, reason });
        await this.fetchMySigningItems();
        await this.fetchMyDocuments();
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    async rejectSigner(signerId, reason = '') {
      this.loading = true; this.error = null;
      try {
        await rejectSignerApi(signerId, reason);
        this.mySigningItems = this.mySigningItems.filter(s => s.id !== signerId);
        if (this.pendingCount > 0) this.pendingCount--;
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },

    // ── Validação ────────────────────────────────────────────────────────────
    async validateDocument(code) {
      this.loading = true; this.error = null;
      try {
        const res = await validateDocumentApi(code);
        this.validationResult = res.data;
        return res.data;
      } catch (err) { this.error = getErrMsg(err); throw err; }
      finally { this.loading = false; }
    },
  },
});
