import { defineStore } from 'pinia';
import {
  initiateSignatureApi,
  initiateFromRequestApi,
  signDocumentApi,
  requestSignatureApi,
  cancelSignatureApi,
  rejectRequestApi,
  deleteSignatureRecordApi,
  listSignaturesApi,
  listSentRequestsApi,
  listPendingApi,
  getPendingCountApi,
  getSignatureByIdApi,
  validateSignatureApi,
} from '@/utils/Signature/signatureApi';

function getErrMsg(err, fallback = 'Erro inesperado.') {
  if (typeof err?.message === 'string') return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

function normalizeMeta(payload = {}, fallbackLimit = 10) {
  const total = Number(payload.total || 0);
  const page = Number(payload.page || 1);
  const limit = Number(payload.limit || fallbackLimit);
  const totalPages = Number(payload.totalPages || Math.max(1, Math.ceil(total / limit)));

  return {
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

export const useSignatureStore = defineStore('signature', {
  state: () => ({
    session: null,
    result: null,
    loading: false,
    error: null,

    mySignatures: [],
    mySignaturesMeta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    },

    sentRequests: [],
    sentMeta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    },

    pendingItems: [],
    pendingMeta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    },

    pendingCount: 0,

    detail: null,
    validationResult: null,
  }),

  getters: {
    hasActiveSession: (state) => !!state.session,
    isSigned: (state) => !!state.result,
  },

  actions: {
    reset() {
      this.session = null;
      this.result = null;
      this.error = null;
      this.loading = false;
    },

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

    async initiateFromRequest(signatureId) {
      this.reset();
      this.loading = true;

      try {
        const res = await initiateFromRequestApi(signatureId);
        this.session = res.data;
        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async sign(credentials) {
      if (!this.session?.signature_token) {
        throw new Error('Nenhuma sessão ativa. Chame initiate() primeiro.');
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

        if (this.pendingCount > 0) this.pendingCount--;

        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async requestSignature(payload) {
      this.loading = true;
      this.error = null;

      try {
        const res = await requestSignatureApi(payload);
        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async cancelSignature(id, { password, face_embedding, reason } = {}) {
      this.loading = true;
      this.error = null;

      try {
        const res = await cancelSignatureApi(id, { password, face_embedding, reason });

        this.mySignatures = this.mySignatures.map((item) =>
          item.id === id
            ? {
              ...item,
              status: 'CANCELLED',
              reason: reason || 'Cancelado pelo assinante.',
            }
            : item
        );

        this.sentRequests = this.sentRequests.map((item) =>
          item.id === id
            ? {
              ...item,
              status: 'CANCELLED',
              reason: reason || 'Cancelado pelo assinante.',
            }
            : item
        );

        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteSignatureRecord(id) {
      this.loading = true;
      this.error = null;

      try {
        const res = await deleteSignatureRecordApi(id);

        this.sentRequests = this.sentRequests.filter((s) => s.id !== id);
        this.mySignatures = this.mySignatures.filter((s) => s.id !== id);
        this.pendingItems = this.pendingItems.filter((s) => s.id !== id);

        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async rejectRequest(id, reason = '') {
      this.loading = true;
      this.error = null;

      try {
        const res = await rejectRequestApi(id, reason);

        this.pendingItems = this.pendingItems.filter((s) => s.id !== id);
        this.mySignatures = this.mySignatures.map((item) =>
          item.id === id
            ? { ...item, status: 'REJECTED', reason: reason || 'Recusado pelo destinatário.' }
            : item
        );

        if (this.pendingCount > 0) this.pendingCount--;

        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchMySignatures({ page = 1, limit = 10, status, document_type, q } = {}) {
      this.loading = true;
      this.error = null;

      try {
        const res = await listSignaturesApi({ page, limit, status, document_type, q });
        this.mySignatures = res.data.items || [];
        this.mySignaturesMeta = normalizeMeta(res.data, limit);
      } catch (err) {
        this.error = getErrMsg(err);
      } finally {
        this.loading = false;
      }
    },

    async fetchSentRequests({ page = 1, limit = 10, status, q } = {}) {
      this.loading = true;
      this.error = null;

      try {
        const res = await listSentRequestsApi({ page, limit, status, q });
        this.sentRequests = res.data.items || [];
        this.sentMeta = normalizeMeta(res.data, limit);
      } catch (err) {
        this.error = getErrMsg(err);
      } finally {
        this.loading = false;
      }
    },

    async fetchPending({ page = 1, limit = 10, q } = {}) {
      this.loading = true;
      this.error = null;

      try {
        const res = await listPendingApi({ page, limit, q });
        this.pendingItems = res.data.items || [];
        this.pendingMeta = normalizeMeta(res.data, limit);
      } catch (err) {
        this.error = getErrMsg(err);
      } finally {
        this.loading = false;
      }
    },

    async fetchPendingCount() {
      try {
        const res = await getPendingCountApi();
        this.pendingCount = res.data.count ?? 0;
      } catch {
        // badge não deve quebrar a tela
      }
    },

    async fetchById(id) {
      this.loading = true;
      this.error = null;

      try {
        const res = await getSignatureByIdApi(id);
        this.detail = res.data;
        return res.data;
      } catch (err) {
        this.error = getErrMsg(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async validate(code) {
      this.loading = true;
      this.error = null;
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