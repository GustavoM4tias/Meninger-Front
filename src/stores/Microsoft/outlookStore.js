// stores/Microsoft/outlookStore.js
//
// Estado da caixa de e-mail dentro do Office.
//
// Três decisões que valem a leitura:
//
// 1. A lista é otimista nas ações rápidas (ler, sinalizar, mover). Marcar como
//    lido tem que responder na hora; esperar o Graph faz a caixa parecer travada.
//    Toda ação otimista guarda o valor anterior e desfaz se o servidor recusar.
//
// 2. Busca e filtro não convivem no Graph ($search desliga $filter e $orderby).
//    Em vez de esconder isso, o store limpa os filtros ao buscar e a tela diz
//    por quê — errado seria mandar os dois e receber lista sem ordem.
//
// 3. Paginação por `skip`, não por nextLink. O nextLink voltaria do navegador
//    como caminho pronto para o backend chamar, e caminho vindo do cliente em
//    módulo que usa token de aplicação é convite para ler a caixa alheia.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/utils/Microsoft/apiOutlook';
import { noteGraphError } from '@/utils/Microsoft/noteGraphError';

export const useOutlookStore = defineStore('outlook', () => {

    // ── Dados ─────────────────────────────────────────────────────────────────
    const folders    = ref([]);
    const messages   = ref([]);
    const selected   = ref(null);   // mensagem aberta (com corpo e anexos)
    const categories = ref([]);
    const mailbox    = ref(null);   // fuso, horário de trabalho, resposta automática
    const unread     = ref({ unread: 0, total: 0 });

    // ── Navegação e filtros ───────────────────────────────────────────────────
    const folder  = ref('inbox');
    const search  = ref('');
    const filters = ref({ unread: false, attachments: false, flagged: false, from: '' });
    const skip    = ref(0);
    const hasMore = ref(false);

    // ── Estado ────────────────────────────────────────────────────────────────
    const loadingList    = ref(false);
    const loadingMessage = ref(false);
    const sending        = ref(false);
    const error          = ref(null);

    const currentFolder = computed(() =>
        folders.value.find(f => f.wellKnownName === folder.value || f.id === folder.value) || null
    );

    const hasFilters = computed(() =>
        filters.value.unread || filters.value.attachments || filters.value.flagged || !!filters.value.from
    );

    // ── Carga ─────────────────────────────────────────────────────────────────

    async function fetchFolders() {
        try { folders.value = await api.getFolders(); }
        catch (err) { error.value = err.message; noteGraphError(err); }
    }

    async function fetchUnread() {
        try { unread.value = await api.getUnread(); } catch { /* contador é enfeite */ }
    }

    async function fetchCategories() {
        try { categories.value = await api.getCategories(); } catch { categories.value = []; }
    }

    async function fetchMailbox() {
        try { mailbox.value = await api.getMailbox(); } catch { mailbox.value = null; }
    }

    function _params() {
        return {
            folder: folder.value,
            search: search.value,
            skip: skip.value,
            // Filtro e busca não convivem: quando há busca, o Graph ignora o resto.
            ...(search.value ? {} : {
                unread: filters.value.unread,
                attachments: filters.value.attachments,
                flagged: filters.value.flagged,
                from: filters.value.from,
            }),
        };
    }

    async function fetchMessages({ append = false } = {}) {
        loadingList.value = true;
        error.value = null;
        try {
            const data = await api.listMessages(_params());
            messages.value = append ? [...messages.value, ...data.items] : data.items;
            hasMore.value = data.hasMore;
        } catch (err) {
            error.value = err.message; noteGraphError(err);
            if (!append) messages.value = [];
        } finally {
            loadingList.value = false;
        }
    }

    async function loadMore() {
        if (!hasMore.value || loadingList.value) return;
        skip.value = messages.value.length; // o que já está na tela é o deslocamento
        await fetchMessages({ append: true });
    }

    async function openFolder(id) {
        folder.value = id;
        search.value = '';
        skip.value = 0;
        selected.value = null;
        await fetchMessages();
    }

    async function applySearch(text) {
        search.value = (text || '').trim();
        skip.value = 0;
        await fetchMessages();
    }

    async function applyFilters(next) {
        filters.value = { ...filters.value, ...next };
        search.value = ''; // busca e filtro se excluem no Graph
        skip.value = 0;
        await fetchMessages();
    }

    async function clearFilters() {
        filters.value = { unread: false, attachments: false, flagged: false, from: '' };
        skip.value = 0;
        await fetchMessages();
    }

    // ── Leitura de uma mensagem ───────────────────────────────────────────────

    async function openMessage(id) {
        loadingMessage.value = true;
        selected.value = null;
        try {
            selected.value = await api.getMessage(id);
            // Abrir marca como lida, igual ao Outlook. Silencioso: se falhar, a
            // pessoa continua lendo — não é motivo de erro na tela.
            const naLista = messages.value.find(m => m.id === id);
            if (naLista && !naLista.isRead) markRead(id, true).catch(() => {});
        } catch (err) {
            error.value = err.message; noteGraphError(err);
        } finally {
            loadingMessage.value = false;
        }
    }

    function closeMessage() { selected.value = null; }

    // ── Ações otimistas ───────────────────────────────────────────────────────
    // Guardam o valor anterior e desfazem se o servidor recusar.

    function _patchLocal(id, campos) {
        const i = messages.value.findIndex(m => m.id === id);
        const antes = i >= 0 ? { ...messages.value[i] } : null;
        if (i >= 0) messages.value[i] = { ...messages.value[i], ...campos };
        if (selected.value?.id === id) selected.value = { ...selected.value, ...campos };
        return () => {
            if (antes && i >= 0) messages.value[i] = antes;
            if (selected.value?.id === id && antes) selected.value = { ...selected.value, ...antes };
        };
    }

    async function markRead(id, isRead) {
        const desfazer = _patchLocal(id, { isRead });
        if (isRead) unread.value.unread = Math.max(0, unread.value.unread - 1);
        try { await api.setRead(id, isRead); }
        catch (err) { desfazer(); fetchUnread(); error.value = err.message; noteGraphError(err); throw err; }
    }

    async function toggleFlag(id) {
        const atual = messages.value.find(m => m.id === id)?.flagged ?? selected.value?.flagged ?? false;
        const desfazer = _patchLocal(id, { flagged: !atual });
        try { await api.setFlag(id, !atual); }
        catch (err) { desfazer(); error.value = err.message; noteGraphError(err); throw err; }
    }

    async function setCategories(id, cats) {
        const desfazer = _patchLocal(id, { categories: cats });
        try { await api.setCategories(id, cats); }
        catch (err) { desfazer(); error.value = err.message; noteGraphError(err); throw err; }
    }

    /** Mover e excluir tiram a mensagem da lista atual. */
    async function moveMessage(id, destinationId) {
        const antes = [...messages.value];
        messages.value = messages.value.filter(m => m.id !== id);
        if (selected.value?.id === id) selected.value = null;
        try { await api.moveMessage(id, destinationId); fetchFolders(); }
        catch (err) { messages.value = antes; error.value = err.message; noteGraphError(err); throw err; }
    }

    async function deleteMessage(id) {
        const antes = [...messages.value];
        messages.value = messages.value.filter(m => m.id !== id);
        if (selected.value?.id === id) selected.value = null;
        try { await api.deleteMessage(id); fetchFolders(); }
        catch (err) { messages.value = antes; error.value = err.message; noteGraphError(err); throw err; }
    }

    // ── Escrever ──────────────────────────────────────────────────────────────

    async function startReply(id, kind) {
        // O Outlook monta a citação, os destinatários e o "Re:"/"Enc:".
        return api.createReplyDraft(id, kind);
    }

    async function saveDraft(id, data) {
        return id ? api.updateDraft(id, data) : api.createDraft(data);
    }

    async function send({ draftId, ...data }) {
        sending.value = true;
        try {
            if (draftId) await api.sendDraft(draftId);
            else await api.sendMail(data);
            fetchFolders();
        } finally {
            sending.value = false;
        }
    }

    async function init() {
        await Promise.all([fetchFolders(), fetchMessages(), fetchUnread()]);
        fetchCategories();
        fetchMailbox();
    }

    return {
        folders, messages, selected, categories, mailbox, unread,
        folder, search, filters, hasMore, currentFolder, hasFilters,
        loadingList, loadingMessage, sending, error,

        init, fetchFolders, fetchMessages, fetchUnread, loadMore,
        openFolder, applySearch, applyFilters, clearFilters,
        openMessage, closeMessage,
        markRead, toggleFlag, setCategories, moveMessage, deleteMessage,
        startReply, saveDraft, send,
    };
});
