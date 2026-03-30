// src/stores/Tools/PaymentFlow/paymentFlowStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes exportadas
// ─────────────────────────────────────────────────────────────────────────────

// Mantidos por compatibilidade — agora carregados dinamicamente da API via fetchLaunchTypes()
export const LAUNCH_TYPE_DEFAULTS = {};
export const LAUNCH_TYPES = [];
 
export const PIPELINE_STAGE_LABELS = {
    idle: { label: 'Aguardando', icon: 'fa-clock', color: 'gray' },
    searching_creditor: { label: 'Buscando credor...', icon: 'fa-spinner fa-spin', color: 'blue' },
    creditor_found: { label: 'Credor encontrado', icon: 'fa-user-check', color: 'green' },
    creditor_not_found: { label: 'Credor não cadastrado', icon: 'fa-user-xmark', color: 'red' },
    searching_contract: { label: 'Buscando contrato...', icon: 'fa-spinner fa-spin', color: 'blue' },
    contract_found: { label: 'Contrato localizado', icon: 'fa-file-contract', color: 'green' },
    contract_not_found: { label: 'Sem contrato', icon: 'fa-file-circle-xmark', color: 'orange' },
    creating_contract: { label: 'Criando contrato...', icon: 'fa-spinner fa-spin', color: 'blue' },
    contract_created: { label: 'Contrato criado', icon: 'fa-file-circle-check', color: 'green' },
    contract_error: { label: 'Erro no contrato', icon: 'fa-triangle-exclamation', color: 'red' },
    creating_additive: { label: 'Criando aditivo...', icon: 'fa-spinner fa-spin', color: 'blue' },
    additive_created: { label: 'Aditivo criado', icon: 'fa-file-circle-plus', color: 'green' },
    additive_error: { label: 'Erro no aditivo', icon: 'fa-triangle-exclamation', color: 'red' },
    awaiting_authorization: { label: 'Aguardando autorização', icon: 'fa-lock', color: 'orange' },
    creating_measurement: { label: 'Criando medição...', icon: 'fa-spinner fa-spin', color: 'blue' },
    measurement_created: { label: 'Medição criada', icon: 'fa-ruler-combined', color: 'green' },
    measurement_error: { label: 'Erro na medição', icon: 'fa-triangle-exclamation', color: 'red' },
    awaiting_measurement_authorization: { label: 'Aguardando autorização da medição', icon: 'fa-lock', color: 'orange' },
    // legado
    validating_items: { label: 'Validando itens...', icon: 'fa-spinner fa-spin', color: 'blue' },
    items_ok: { label: 'Saldo disponível', icon: 'fa-circle-check', color: 'green' },
    items_insufficient: { label: 'Saldo insuficiente', icon: 'fa-circle-exclamation', color: 'orange' },
    ready: { label: 'Pronto para aprovação', icon: 'fa-circle-check', color: 'emerald' },
};

// Estágios de pipeline que indicam processamento ativo (disparam live-refresh)
const LIVE_REFRESH_STAGES = new Set([
    'searching_creditor', 'searching_contract',
    'creating_contract', 'creating_additive',
    'creating_measurement',
    'validating_items',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

async function uploadToStorage(file, context, referenceId = null) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    form.append('context', context);
    if (referenceId) form.append('referenceId', String(referenceId));
    const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Erro no upload');
    return data; // { url, path, fileName, mimeType, size }
}

async function extractPdf(file, mode = 'auto', today = null) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('document', file);
    form.append('today', today || new Date().toISOString().slice(0, 10));
    const res = await fetch(`${API_URL}/ai/payment-flow/extract/${mode}`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Erro na extração');
    return data; // { prefill, detectedMode, meta }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const usePaymentFlowStore = defineStore('paymentFlow', () => {
    const carregamento = useCarregamentoStore();

    // ── Lista ─────────────────────────────────────────────────────────────────
    const launches = ref([]);
    const currentLaunch = ref(null);
    const summary = ref({});
    const pagination = ref({ total: 0, page: 1, limit: 20, pages: 1 });
    const filters = ref({ status: '', launchType: '', search: '' });

    // ── Modal / upload ────────────────────────────────────────────────────────
    const showCreateModal = ref(false);

    const nfFile = ref(null);
    const nfUploading = ref(false);
    const nfExtracting = ref(false);
    const nfUploadResult = ref(null);
    const nfPrefill = ref(null);
    const nfMeta = ref(null);
    const nfError = ref(null);

    const boletoFile = ref(null);
    const boletoUploading = ref(false);
    const boletoExtracting = ref(false);
    const boletoUploadResult = ref(null);
    const boletoPrefill = ref(null);
    const boletoMeta = ref(null);
    const boletoError = ref(null);

    const extraFiles = ref([]); // Array<{ id, file, uploading, result, error }>

    // ── Pipeline ──────────────────────────────────────────────────────────────
    const pipelineRunning = ref(false);
    const pipelineRunningIds = ref(new Set()); // IDs sendo processados (evita duplo clique)
    const pipelinePolling = ref({});    // { [launchId]: intervalId }

    // ── RID (Solicitação de cadastro de fornecedor) ───────────────────────────
    const showRidModal = ref(false);
    const ridModalLaunchId = ref(null);
    const ridFile = ref(null);
    const ridSending = ref(false);
    const ridError = ref(null);
    const ridSuccess = ref(null);

    // ── Tipos de lançamento (carregados da API) ────────────────────────────────
    const launchTypes = ref([]);
    const siengeCredentialsOk = ref(null); // null = não verificado, true/false

    // ── Filtros de visibilidade ────────────────────────────────────────────────
    const showCancelled = ref(false);   // por padrão, cancelados ficam ocultos
    const showErrors = ref(true);       // erros visíveis por padrão

    // ── Conflito de duplicidade ────────────────────────────────────────────────
    const conflictLaunch = ref(null);   // { id, status, launchType, ..., pendingPayload }

    // ── Live refresh (atualização reativa da lista) ───────────────────────────
    const liveRefreshId = ref(null);

    // ── Global ────────────────────────────────────────────────────────────────
    const error = ref(null);
    const success = ref(null);

    // ── Computed ──────────────────────────────────────────────────────────────
    const hasLaunches = computed(() => launches.value.length > 0);
    const hasActivePipelines = computed(() =>
        launches.value.some(l => LIVE_REFRESH_STAGES.has(l.pipelineStage))
    );
    const isProcessing = computed(() =>
        nfUploading.value || nfExtracting.value ||
        boletoUploading.value || boletoExtracting.value ||
        extraFiles.value.some(e => e.uploading)
    );

    // ── Helpers ───────────────────────────────────────────────────────────────
    function clearMessages() { error.value = null; success.value = null; }

    function buildQuery() {
        const p = new URLSearchParams();
        const f = filters.value;
        if (f.status) {
            p.set('status', f.status);
        } else {
            // Oculta cancelados e/ou erros por padrão conforme toggles
            const excluded = [];
            if (!showCancelled.value) excluded.push('cancelado');
            if (!showErrors.value) excluded.push('erro');
            if (excluded.length) p.set('excludeStatus', excluded.join(','));
        }
        if (f.launchType) p.set('launchType', f.launchType);
        if (f.search) p.set('search', f.search);
        p.set('page', String(pagination.value.page));
        p.set('limit', String(pagination.value.limit));
        return p.toString();
    }

    // ── Live refresh ──────────────────────────────────────────────────────────
    // 2s quando há pipelines rodando ativamente; 8s em monitoramento passivo
    const LIVE_REFRESH_FAST_MS = 2_000;
    const LIVE_REFRESH_SLOW_MS = 8_000;

    function startLiveRefresh(fast = false) {
        // Reinicia se o intervalo precisar ser mais rápido
        if (liveRefreshId.value && fast) stopLiveRefresh();
        if (liveRefreshId.value) return;
        const interval = fast ? LIVE_REFRESH_FAST_MS : LIVE_REFRESH_SLOW_MS;
        liveRefreshId.value = setInterval(async () => {
            await fetchLaunches(true);
            if (!hasActivePipelines.value && pipelineRunningIds.value.size === 0) {
                stopLiveRefresh();
            }
        }, interval);
    }

    function stopLiveRefresh() {
        if (liveRefreshId.value) {
            clearInterval(liveRefreshId.value);
            liveRefreshId.value = null;
        }
    }

    function toggleShowCancelled() {
        showCancelled.value = !showCancelled.value;
        if (!showCancelled.value && filters.value.status === 'cancelado') {
            filters.value.status = '';
        }
        pagination.value.page = 1;
        fetchLaunches();
    }

    function toggleShowErrors() {
        showErrors.value = !showErrors.value;
        if (!showErrors.value && filters.value.status === 'erro') {
            filters.value.status = '';
        }
        pagination.value.page = 1;
        fetchLaunches();
    }

    // ── NF: só extração na seleção — upload adiado para o save ──────────────
    async function handleNfFile(file) {
        nfFile.value = file;
        nfError.value = null;
        nfPrefill.value = nfMeta.value = null;
        nfUploadResult.value = null;
        nfExtracting.value = true;
        try {
            const res = await extractPdf(file, 'nf');
            nfPrefill.value = res.prefill;
            nfMeta.value = res.meta;
        } catch (err) {
            nfError.value = err.message || 'Falha na extração NF';
        } finally {
            nfExtracting.value = false;
        }
    }

    // ── Boleto: só extração na seleção — upload adiado para o save ──────────
    async function handleBoletoFile(file) {
        boletoFile.value = file;
        boletoError.value = null;
        boletoPrefill.value = boletoMeta.value = null;
        boletoUploadResult.value = null;
        boletoExtracting.value = true;
        try {
            const res = await extractPdf(file, 'boleto');
            boletoPrefill.value = res.prefill;
            boletoMeta.value = res.meta;
        } catch (err) {
            boletoError.value = err.message || 'Falha na extração Boleto';
        } finally {
            boletoExtracting.value = false;
        }
    }

    // ── Extras: só registra localmente — upload adiado para o save ───────────
    function handleExtraFile(file) {
        extraFiles.value.push({ file, uploading: false, result: null, error: null, id: Date.now() + Math.random() });
    }

    function removeExtraFile(id) {
        extraFiles.value = extraFiles.value.filter(e => e.id !== id);
    }

    // ── Upload on-demand (chamado no save) ────────────────────────────────────
    async function uploadNfFile() {
        if (!nfFile.value || nfUploadResult.value) return;
        nfUploading.value = true;
        try {
            nfUploadResult.value = await uploadToStorage(nfFile.value, 'payment_flow_nf');
        } catch (err) {
            nfError.value = `Upload NF: ${err.message}`;
            throw err;
        } finally {
            nfUploading.value = false;
        }
    }

    async function uploadBoletoFile() {
        if (!boletoFile.value || boletoUploadResult.value) return;
        boletoUploading.value = true;
        try {
            boletoUploadResult.value = await uploadToStorage(boletoFile.value, 'payment_flow_boleto');
        } catch (err) {
            boletoError.value = `Upload Boleto: ${err.message}`;
            throw err;
        } finally {
            boletoUploading.value = false;
        }
    }

    async function uploadExtraFile(id) {
        const idx = extraFiles.value.findIndex(e => e.id === id);
        if (idx < 0 || extraFiles.value[idx].result) return;
        extraFiles.value[idx] = { ...extraFiles.value[idx], uploading: true };
        try {
            const res = await uploadToStorage(extraFiles.value[idx].file, 'payment_flow_extra');
            extraFiles.value[idx] = { ...extraFiles.value[idx], uploading: false, result: res };
        } catch (err) {
            extraFiles.value[idx] = { ...extraFiles.value[idx], uploading: false, error: err.message };
            throw err;
        }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────
    async function fetchLaunches(silent = false) {
        clearMessages();
        try {
            if (!silent) carregamento.iniciarCarregamento();
            const data = await requestWithAuth(`${API_URL}/sienge/payment-flow?${buildQuery()}`);
            launches.value = data.data || [];
            // Se qualquer lançamento tem credenciais inválidas → abre modal de atualização
            if (launches.value.some(l => l.siengeCredentialsInvalid)) {
                siengeCredentialsOk.value = false;
            }
            pagination.value = {
                total: data.total,
                page: data.page,
                limit: data.limit,
                pages: data.pages,
            };
            // Auto live-refresh: modo rápido se há pipelines processando ativamente
            if (hasActivePipelines.value) startLiveRefresh(true);
            else if (pipelineRunningIds.value.size === 0) stopLiveRefresh();
        } catch (err) {
            error.value = err.message;
        } finally {
            if (!silent) carregamento.finalizarCarregamento();
        }
    }

    async function fetchSummary() {
        try {
            summary.value = await requestWithAuth(`${API_URL}/sienge/payment-flow/summary`);
        } catch (_) { /* silencioso */ }
    }

    async function fetchLaunch(id) {
        clearMessages();
        try {
            carregamento.iniciarCarregamento();
            currentLaunch.value = await requestWithAuth(`${API_URL}/sienge/payment-flow/${id}`);
        } catch (err) {
            error.value = err.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function createLaunch(payload) {
        clearMessages();
        conflictLaunch.value = null;
        try {
            carregamento.iniciarCarregamento();
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/sienge/payment-flow`, {
                method: 'POST',
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            // Conflito de duplicidade: NF + CNPJ já existe em lançamento ativo
            if (res.status === 409 && data.duplicate) {
                conflictLaunch.value = { ...data.existing, pendingPayload: payload };
                closeCreateModal(); // fecha o modal de criação para mostrar o modal de conflito
                return null;
            }

            if (!res.ok) throw new Error(data?.error || 'Erro ao criar lançamento');

            success.value = 'Lançamento criado com sucesso!';
            closeCreateModal();
            await Promise.all([fetchLaunches(true), fetchSummary()]);
            // Dispara pipeline automaticamente após criação (não bloqueia o modal)
            if (data?.id) runPipeline(data.id).catch(console.error);
            return data;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    /** Cancela o lançamento em conflito e cria o novo com os mesmos dados. */
    async function cancelConflictAndCreate() {
        if (!conflictLaunch.value) return;
        const { pendingPayload, id: cancelExisting } = conflictLaunch.value;
        conflictLaunch.value = null;
        return createLaunch({ ...pendingPayload, cancelExisting });
    }

    async function updateLaunch(id, payload) {
        clearMessages();
        try {
            carregamento.iniciarCarregamento();
            const data = await requestWithAuth(`${API_URL}/sienge/payment-flow/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            success.value = 'Lançamento atualizado!';
            await fetchLaunches(true);
            return data;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function transition(id, action, body = {}) {
        clearMessages();
        try {
            carregamento.iniciarCarregamento();
            const data = await requestWithAuth(`${API_URL}/sienge/payment-flow/${id}/${action}`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            await Promise.all([fetchLaunches(true), fetchSummary()]);
            return data;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    const cancelLaunch = (id) => transition(id, 'cancel');
    const markPaid = (id) => transition(id, 'mark-paid');
    const advanceStage = (id) => transition(id, 'advance-stage');

    // ── Pipeline ──────────────────────────────────────────────────────────────
    async function runPipeline(id) {
        const numId = Number(id);
        // Proteção contra duplo clique: ignora se este lançamento já está em processamento
        if (pipelineRunningIds.value.has(numId)) return;
        pipelineRunningIds.value = new Set([...pipelineRunningIds.value, numId]);
        pipelineRunning.value = true;
        // Inicia live-refresh rápido imediatamente para mostrar estágios intermediários
        startLiveRefresh(true);
        try {
            const result = await requestWithAuth(
                `${API_URL}/sienge/payment-flow/${id}/pipeline/run`,
                { method: 'POST' }
            );
            await _refreshLaunchInList(id);
            // Inicia polling se pipeline terminou aguardando autorização do contrato/aditivo
            const awaitingStages = ['contract_found', 'contract_created', 'additive_created', 'awaiting_authorization', 'items_ok', 'ready'];
            if (awaitingStages.includes(result?.stage)) {
                const launch = launches.value.find(l => l.id === numId);
                if (launch && !launch.siengeContractAuthorized) startPolling(id);
            }
            return result;
        } catch (err) {
            error.value = `Pipeline: ${err.message}`;
        } finally {
            pipelineRunningIds.value = new Set([...pipelineRunningIds.value].filter(i => i !== numId));
            pipelineRunning.value = pipelineRunningIds.value.size > 0;
            // Se não há mais pipelines rodando, volta para refresh lento (ou para)
            if (pipelineRunningIds.value.size === 0) {
                stopLiveRefresh();
                startLiveRefresh(false); // retoma em modo lento se ainda há estágios ativos
            }
        }
    }

    async function startPolling(id) {
        const numId = Number(id);
        if (pipelinePolling.value[numId]) return; // já rodando

        // Executa imediatamente ao clicar em ⟳ (não espera 30s)
        try {
            await requestWithAuth(`${API_URL}/sienge/payment-flow/${numId}/pipeline/poll-contract`);
            await _refreshLaunchInList(numId);
            const launch = launches.value.find(l => l.id === numId);
            if (launch?.siengeContractAuthorized) return; // já autorizado, não precisa de intervalo
        } catch (_) { /* silencioso */ }

        const intervalId = setInterval(async () => {
            try {
                await requestWithAuth(`${API_URL}/sienge/payment-flow/${numId}/pipeline/poll-contract`);
                await _refreshLaunchInList(numId);
                // Para automaticamente quando autorizado
                const launch = launches.value.find(l => l.id === numId);
                if (launch?.siengeContractAuthorized) stopPolling(numId);
            } catch (_) { /* silencioso */ }
        }, 30_000);
        pipelinePolling.value = { ...pipelinePolling.value, [numId]: intervalId };
    }

    function stopPolling(id) {
        const numId = Number(id);
        if (pipelinePolling.value[numId]) {
            clearInterval(pipelinePolling.value[numId]);
            const next = { ...pipelinePolling.value };
            delete next[numId];
            pipelinePolling.value = next;
        }
    }

    function stopAllPolling() {
        Object.keys(pipelinePolling.value).forEach(id => stopPolling(Number(id)));
        stopLiveRefresh();
    }

    async function _refreshLaunchInList(id) {
        const numId = Number(id);
        try {
            const fresh = await requestWithAuth(`${API_URL}/sienge/payment-flow/${numId}`);
            const idx = launches.value.findIndex(l => l.id === numId);
            if (idx >= 0) {
                // Splice para manter reatividade
                launches.value.splice(idx, 1, fresh);
            }
            if (currentLaunch.value?.id === numId) currentLaunch.value = fresh;
        } catch (_) { /* silencioso */ }
    }

    // ── Filtros / Paginação ───────────────────────────────────────────────────
    function setPage(page) {
        pagination.value.page = page;
        fetchLaunches();
    }
    function applyFilters(newF) {
        filters.value = { ...filters.value, ...newF };
        pagination.value.page = 1;
        fetchLaunches();
    }
    function resetFilters() {
        filters.value = { status: '', launchType: '', search: '' };
        pagination.value.page = 1;
        fetchLaunches();
    }

    function getTypeDefaults(name) {
        const t = launchTypes.value.find(lt => lt.name === name);
        return t ? {
            documento: t.documento,
            budgetItem: t.budgetItem,
            budgetItemCode: String(t.budgetItemCode || ''),
            financialAccountNumber: t.financialAccountNumber,
        } : {};
    }

    async function fetchLaunchTypes() {
        if (launchTypes.value.length) return; // já carregados
        try {
            const data = await requestWithAuth(`${API_URL}/sienge/launch-types`);
            launchTypes.value = Array.isArray(data) ? data : [];
        } catch (_) { /* silencioso */ }
    }

    async function checkSiengeCredentials() {
        try {
            const data = await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`);
            siengeCredentialsOk.value = data?.hasCredentials === true;
        } catch (_) {
            siengeCredentialsOk.value = false;
        }
    }

    // ── RID Actions ──────────────────────────────────────────────────────────
    function openRidModal(launchId) {
        ridModalLaunchId.value = launchId;
        ridFile.value = null;
        ridError.value = null;
        ridSuccess.value = null;
        showRidModal.value = true;
    }

    function closeRidModal() {
        showRidModal.value = false;
        ridModalLaunchId.value = null;
        ridFile.value = null;
        ridError.value = null;
        ridSuccess.value = null;
    }

    async function downloadRidTemplate() {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/sienge/payment-flow/rid-template`, {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        if (!res.ok) throw new Error('Falha ao baixar o modelo RID');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'RID_Modelo.docx';
        a.click();
        URL.revokeObjectURL(url);
    }

    async function sendRidEmail(launchId, file) {
        ridSending.value = true;
        ridError.value = null;
        ridSuccess.value = null;
        try {
            const token = localStorage.getItem('token');
            const form = new FormData();
            form.append('rid', file);
            const res = await fetch(`${API_URL}/sienge/payment-flow/${launchId}/rid/send-email`, {
                method: 'POST',
                headers: { Authorization: token ? `Bearer ${token}` : '' },
                body: form,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Erro ao enviar email');
            ridSuccess.value = 'Email enviado com sucesso! O fornecedor será cadastrado em breve.';
            await _refreshLaunchInList(launchId);
            return data;
        } catch (err) {
            ridError.value = err.message || 'Erro ao enviar email';
            throw err;
        } finally {
            ridSending.value = false;
        }
    }

    /**
     * Envia os dados do formulário RID via multipart.
     * O backend gera o DOCX preenchido, anexa arquivos extras e envia o email.
     * @param {number} launchId
     * @param {object} formData    Dados do formulário (todos os campos da RID)
     * @param {File[]} attachments Arquivos adicionais opcionais ("Outros Anexos")
     */
    async function sendRidForm(launchId, formData, attachments = []) {
        ridSending.value = true;
        ridError.value = null;
        ridSuccess.value = null;
        try {
            const token = localStorage.getItem('token');
            const fd = new FormData();
            fd.append('formData', JSON.stringify(formData));
            for (const file of attachments) {
                fd.append('anexos', file);
            }
            const res = await fetch(`${API_URL}/sienge/payment-flow/${launchId}/rid/send-form`, {
                method: 'POST',
                headers: { Authorization: token ? `Bearer ${token}` : '' },
                // Sem Content-Type — FormData define automaticamente com boundary
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Erro ao enviar formulário');
            ridSuccess.value = 'Formulário RID gerado e email enviado! O fornecedor será cadastrado em breve.';
            // Atualiza o lançamento na lista para refletir ridEmailSent=true
            await _refreshLaunchInList(launchId);
            return data;
        } catch (err) {
            ridError.value = err.message || 'Erro ao enviar formulário';
            throw err;
        } finally {
            ridSending.value = false;
        }
    }

    // ── Modal ─────────────────────────────────────────────────────────────────
    function openCreateModal() {
        // Reset completo do estado de upload
        nfFile.value = boletoFile.value = null;
        nfUploadResult.value = boletoUploadResult.value = null;
        nfPrefill.value = boletoPrefill.value = null;
        nfMeta.value = boletoMeta.value = null;
        nfError.value = boletoError.value = null;
        nfUploading.value = nfExtracting.value = false;
        boletoUploading.value = boletoExtracting.value = false;
        extraFiles.value = [];
        showCreateModal.value = true;
    }

    function closeCreateModal() {
        showCreateModal.value = false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    return {
        // Estado: lista
        launches, currentLaunch, summary, pagination, filters,
        error, success, hasLaunches, hasActivePipelines,

        // Estado: modal / upload
        showCreateModal, isProcessing,
        nfFile, nfUploading, nfExtracting, nfUploadResult, nfPrefill, nfMeta, nfError,
        boletoFile, boletoUploading, boletoExtracting, boletoUploadResult, boletoPrefill, boletoMeta, boletoError,
        extraFiles,

        // Estado: pipeline
        pipelineRunning, pipelineRunningIds, pipelinePolling,

        // Estado: RID
        showRidModal, ridModalLaunchId, ridFile, ridSending, ridError, ridSuccess,

        // Estado: tipos de lançamento / credenciais
        launchTypes, siengeCredentialsOk,

        // Estado: visibilidade cancelados/erros + conflito de duplicidade + live refresh
        showCancelled, showErrors, conflictLaunch, liveRefreshId,

        // Actions: upload
        handleNfFile, handleBoletoFile, handleExtraFile, removeExtraFile,
        uploadNfFile, uploadBoletoFile, uploadExtraFile,

        // Actions: CRUD
        fetchLaunches, fetchSummary, fetchLaunch,
        createLaunch, updateLaunch, cancelConflictAndCreate,
        cancelLaunch, markPaid, advanceStage,

        // Actions: pipeline
        runPipeline, startPolling, stopPolling, stopAllPolling,

        // Actions: live refresh
        startLiveRefresh, stopLiveRefresh,

        // Actions: tipos de lançamento / credenciais
        fetchLaunchTypes, checkSiengeCredentials, getTypeDefaults,

        // Actions: filtros / paginação
        setPage, applyFilters, resetFilters, toggleShowCancelled, toggleShowErrors,

        // Actions: RID
        openRidModal, closeRidModal, downloadRidTemplate, sendRidEmail, sendRidForm,

        // Actions: modal
        openCreateModal, closeCreateModal,
    };
});