// stores/Microsoft/sharepointStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { readDefaultPref, writeDefaultPref } from '@/utils/Microsoft/defaultPref';

import { noteGraphError } from '@/utils/Microsoft/noteGraphError';
const BASE = `${API_URL}/microsoft/sharepoint`;

// Upload com progresso via XMLHttpRequest
function uploadXHR(url, file, onProgress) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('token');
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error || `HTTP ${xhr.status}`));
                } catch { reject(new Error(`HTTP ${xhr.status}`)); }
            }
        };
        xhr.onerror = () => reject(new Error('Erro de rede no upload'));
        xhr.open('PUT', url);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
    });
}

export const useSharepointStore = defineStore('sharepoint', () => {

    // ── Dados ─────────────────────────────────────────────────────────────────
    const sites  = ref([]);
    const drives = ref([]);
    const items  = ref([]);

    // ── Seleção ───────────────────────────────────────────────────────────────
    const selectedSite  = ref(null);
    const selectedDrive = ref(null);
    const breadcrumb    = ref([]);

    // ── Busca ─────────────────────────────────────────────────────────────────
    const searchQuery   = ref('');
    const searchResults = ref([]);
    const isSearching   = ref(false);

    // ── Upload ────────────────────────────────────────────────────────────────
    const uploadProgress = ref(null); // null | { filename, percent }
    const uploading      = ref(false);

    // ── Favoritos (localStorage) ───────────────────────────────────────────────
    const _favKey = () => `sp_favorites_${localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}')?.id : 'anon'}`;
    const favorites = ref(new Set(JSON.parse(localStorage.getItem(_favKey()) || '[]')));

    function _saveFavorites() {
        localStorage.setItem(_favKey(), JSON.stringify([...favorites.value]));
    }

    function isFavorited(itemId) { return favorites.value.has(itemId); }

    function toggleFavorite(itemId) {
        if (favorites.value.has(itemId)) {
            favorites.value.delete(itemId);
        } else {
            favorites.value.add(itemId);
        }
        _saveFavorites();
    }

    // ── Estado ────────────────────────────────────────────────────────────────
    const loading = ref(false);
    const error   = ref(null);

    // ── Corte de listagem ─────────────────────────────────────────────────────
    // O backend agora completa a lista seguindo o @odata.nextLink; quando bate
    // no teto configurado, avisa pelo cabeçalho X-Graph-Truncated. A tela DIZ
    // que está cortada em vez de fingir que a pasta acabou.
    const listTruncated = ref(false);
    const searchTruncated = ref(false);

    /** GET que devolve o array e registra se a listagem veio cortada. */
    async function _getList(url) {
        const { data, headers } = await requestWithAuth(url, { withMeta: true });
        listTruncated.value = headers?.get?.('X-Graph-Truncated') === '1';
        return Array.isArray(data) ? data : [];
    }

    // ── Atalhos pessoais: OneDrive e compartilhados comigo ────────────────────
    //
    // Só os sites da empresa estavam expostos, e é no OneDrive que mora o
    // documento em rascunho — o que a pessoa ainda não publicou em biblioteca de
    // time. "Compartilhados comigo" é uma lista PLANA: cada item vive na
    // biblioteca de quem compartilhou, então abrir depende do driveId de origem
    // que vem no próprio item, não do drive selecionado.
    const sharedItems = ref([]);
    const viewMode = ref('library'); // library | shared

    async function openMyDrive() {
        loading.value = true; error.value = null;
        viewMode.value = 'library';
        try {
            const drive = await requestWithAuth(`${BASE}/my-drive`);
            selectedSite.value = { id: '__me__', name: 'Meus arquivos' };
            drives.value = [drive];
            searchQuery.value = ''; searchResults.value = [];
            await selectDrive(drive);
        } catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    async function openSharedWithMe() {
        loading.value = true; error.value = null;
        viewMode.value = 'shared';
        selectedSite.value = { id: '__shared__', name: 'Compartilhados comigo' };
        selectedDrive.value = null;
        drives.value = []; items.value = []; breadcrumb.value = [];
        searchQuery.value = ''; searchResults.value = [];
        try {
            sharedItems.value = await _getList(`${BASE}/shared-with-me`);
        } catch (err) { error.value = err.message; noteGraphError(err); sharedItems.value = []; }
        finally { loading.value = false; }
    }

    /**
     * Entra numa pasta que veio de "compartilhados comigo".
     * O item traz o driveId de quem compartilhou; daí em diante a navegação é
     * normal, dentro daquela biblioteca.
     */
    async function enterSharedFolder(item) {
        if (!item?.driveId) return;
        viewMode.value = 'library';
        selectedDrive.value = { id: item.driveId, name: item.name || 'Compartilhado' };
        breadcrumb.value = [{ id: item.id, name: item.name }];
        loading.value = true; error.value = null;
        try {
            items.value = await _getList(`${BASE}/drives/${item.driveId}/items/${item.id}/children`);
        } catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    // ── Computed ──────────────────────────────────────────────────────────────
    const currentFolderId = computed(() =>
        breadcrumb.value.length ? breadcrumb.value[breadcrumb.value.length - 1].id : null
    );
    const isAtRoot = computed(() => breadcrumb.value.length === 0);

    // ── Actions: navegação ────────────────────────────────────────────────────

    async function fetchSites() {
        loading.value = true; error.value = null;
        try { sites.value = await _getList(`${BASE}/sites`); }
        catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    // ── Local padrão (abre sempre aqui) ───────────────────────────────────────
    const defaultLocation = ref(readDefaultPref('sharepoint')); // { siteId, siteName, driveId, driveName }

    const isCurrentDefault = computed(() =>
        !!defaultLocation.value
        && defaultLocation.value.siteId === selectedSite.value?.id
        && defaultLocation.value.driveId === selectedDrive.value?.id
    );

    function setDefaultLocation() {
        if (!selectedSite.value || !selectedDrive.value) return;
        defaultLocation.value = {
            siteId:    selectedSite.value.id,
            siteName:  selectedSite.value.displayName || selectedSite.value.name || '',
            driveId:   selectedDrive.value.id,
            driveName: selectedDrive.value.name || '',
        };
        writeDefaultPref('sharepoint', defaultLocation.value);
    }

    function clearDefaultLocation() {
        defaultLocation.value = null;
        writeDefaultPref('sharepoint', null);
    }

    /**
     * Carrega os sites e, se houver local padrão, já abre nele.
     * Se o site/biblioteca padrão não existir mais, a preferência é descartada.
     */
    async function initWithDefault() {
        if (!sites.value.length) await fetchSites();
        const pref = defaultLocation.value;
        if (!pref || selectedDrive.value) return;

        const site = sites.value.find(s => s.id === pref.siteId);
        if (!site) { clearDefaultLocation(); return; }

        await selectSite(site);                       // já carrega as bibliotecas
        const drive = drives.value.find(d => d.id === pref.driveId);
        if (!drive) { clearDefaultLocation(); return; }
        if (selectedDrive.value?.id !== drive.id) await selectDrive(drive);
    }

    async function selectSite(site) {
        selectedSite.value = site; selectedDrive.value = null;
        drives.value = []; items.value = [];
        breadcrumb.value = []; searchQuery.value = ''; searchResults.value = [];
        loading.value = true; error.value = null;
        try {
            drives.value = await _getList(`${BASE}/sites/${site.id}/drives`);
            if (drives.value.length === 1) await selectDrive(drives.value[0]);
        } catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    async function selectDrive(drive) {
        selectedDrive.value = drive; breadcrumb.value = [];
        items.value = []; searchQuery.value = ''; searchResults.value = [];
        await _loadRoot();
    }

    async function _loadRoot() {
        if (!selectedDrive.value) return;
        loading.value = true; error.value = null;
        try { items.value = await _getList(`${BASE}/drives/${selectedDrive.value.id}/root`); }
        catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    async function openFolder(folder) {
        if (!selectedDrive.value) return;
        breadcrumb.value = [...breadcrumb.value, { id: folder.id, name: folder.name }];
        loading.value = true; error.value = null;
        try {
            items.value = await _getList(
                `${BASE}/drives/${selectedDrive.value.id}/items/${folder.id}/children`
            );
        } catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    async function navigateToBreadcrumb(index) {
        if (index === -1) { breadcrumb.value = []; await _loadRoot(); return; }
        breadcrumb.value = breadcrumb.value.slice(0, index + 1);
        const target = breadcrumb.value[index];
        loading.value = true; error.value = null;
        try {
            items.value = await _getList(
                `${BASE}/drives/${selectedDrive.value.id}/items/${target.id}/children`
            );
        } catch (err) { error.value = err.message; noteGraphError(err); }
        finally { loading.value = false; }
    }

    async function doSearch() {
        if (!selectedDrive.value || !searchQuery.value.trim()) return;
        isSearching.value = true; error.value = null;
        try {
            const { data, headers } = await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/search?q=${encodeURIComponent(searchQuery.value.trim())}`,
                { withMeta: true }
            );
            searchResults.value = Array.isArray(data) ? data : [];
            searchTruncated.value = headers?.get?.('X-Graph-Truncated') === '1';
        } catch (err) { error.value = err.message; noteGraphError(err); }
        finally { isSearching.value = false; }
    }

    function clearSearch() { searchQuery.value = ''; searchResults.value = []; searchTruncated.value = false; }

    // ── Actions: mutações ─────────────────────────────────────────────────────

    async function deleteItem(itemId) {
        if (!selectedDrive.value) return;
        error.value = null;
        try {
            await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/items/${itemId}`,
                { method: 'DELETE' }
            );
            items.value = items.value.filter(i => i.id !== itemId);
            searchResults.value = searchResults.value.filter(i => i.id !== itemId);
        } catch (err) {
            error.value = err.message; noteGraphError(err);
            throw err;
        }
    }

    async function renameItem(itemId, newName) {
        if (!selectedDrive.value) return;
        error.value = null;
        try {
            const updated = await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/items/${itemId}`,
                { method: 'PATCH', body: JSON.stringify({ name: newName }) }
            );
            _replaceItem(updated);
            return updated;
        } catch (err) {
            error.value = err.message; noteGraphError(err);
            throw err;
        }
    }

    async function moveItem(itemId, targetFolderId) {
        if (!selectedDrive.value) return;
        error.value = null;
        try {
            await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/items/${itemId}`,
                { method: 'PATCH', body: JSON.stringify({ parentId: targetFolderId }) }
            );
            // Remove from current list (it moved to another folder)
            items.value = items.value.filter(i => i.id !== itemId);
            searchResults.value = searchResults.value.filter(i => i.id !== itemId);
        } catch (err) {
            error.value = err.message; noteGraphError(err);
            throw err;
        }
    }

    // ── Teto de upload (vem do painel, com fallback) ──────────────────────────
    const uploadMaxMb = ref(null);

    async function fetchUploadLimits() {
        if (uploadMaxMb.value !== null) return uploadMaxMb.value;
        try {
            const data = await requestWithAuth(`${BASE}/upload-limits`);
            uploadMaxMb.value = Number(data?.maxMb) || 250;
        } catch {
            uploadMaxMb.value = 250; // backend antigo/sem resposta: não bloqueia o envio
        }
        return uploadMaxMb.value;
    }

    async function uploadFile(file, parentId) {
        if (!selectedDrive.value) return;

        // Recusa aqui em vez de deixar a pessoa esperar a barra encher para
        // receber o erro só no fim.
        const maxMb = await fetchUploadLimits();
        if (file.size > maxMb * 1024 * 1024) {
            const err = new Error(
                `"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB e o limite de envio é ${maxMb} MB.`
            );
            error.value = err.message;
            throw err;
        }

        uploading.value = true;
        uploadProgress.value = { filename: file.name, percent: 0 };
        error.value = null;
        try {
            const url = `${BASE}/drives/${selectedDrive.value.id}/folders/${parentId}/upload/${encodeURIComponent(file.name)}`;
            const newItem = await uploadXHR(url, file, (percent) => {
                uploadProgress.value = { filename: file.name, percent };
            });
            // Insert or update in list
            const idx = items.value.findIndex(i => i.id === newItem.id);
            if (idx >= 0) items.value[idx] = newItem;
            else items.value = [newItem, ...items.value];
            return newItem;
        } catch (err) {
            error.value = err.message; noteGraphError(err);
            throw err;
        } finally {
            uploading.value = false;
            uploadProgress.value = null;
        }
    }

    /**
     * Faz download de um arquivo via proxy do backend (sem CORS).
     * Chama /drives/:driveId/items/:itemId/content?dl=1 com auth header.
     */
    async function downloadFile(driveId, itemId, filename) {
        const token = localStorage.getItem('token');
        const url = `${BASE}/drives/${driveId}/items/${itemId}/content?dl=1`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }

    async function createSharingLink(itemId) {
        if (!selectedDrive.value) return null;
        error.value = null;
        try {
            const { link } = await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/items/${itemId}/link`,
                { method: 'POST', body: JSON.stringify({}) }
            );
            return link;
        } catch (err) {
            error.value = err.message; noteGraphError(err);
            throw err;
        }
    }

    function _replaceItem(updated) {
        const idx = items.value.findIndex(i => i.id === updated.id);
        if (idx >= 0) items.value[idx] = updated;
        const sidx = searchResults.value.findIndex(i => i.id === updated.id);
        if (sidx >= 0) searchResults.value[sidx] = updated;
    }

    /** Busca detalhes de um item (inclui downloadUrl fresca) */
    async function fetchItemDetail(driveId, itemId) {
        try {
            return await requestWithAuth(`${BASE}/drives/${driveId}/items/${itemId}`);
        } catch {
            return null;
        }
    }

    function reset() {
        sites.value = []; drives.value = []; items.value = [];
        selectedSite.value = null; selectedDrive.value = null;
        breadcrumb.value = []; searchQuery.value = ''; searchResults.value = [];
        error.value = null; uploadProgress.value = null; uploading.value = false;
    }

    return {
        sites, drives, items, selectedSite, selectedDrive,
        breadcrumb, searchQuery, searchResults, isSearching,
        uploadProgress, uploading,
        favorites, isFavorited, toggleFavorite,
        loading, error, listTruncated, searchTruncated, uploadMaxMb, fetchUploadLimits,
        currentFolderId, isAtRoot,
        fetchSites, selectSite, selectDrive,
        sharedItems, viewMode, openMyDrive, openSharedWithMe, enterSharedFolder,
        defaultLocation, isCurrentDefault, setDefaultLocation, clearDefaultLocation, initWithDefault,
        openFolder, navigateToBreadcrumb,
        doSearch, clearSearch,
        deleteItem, renameItem, moveItem, uploadFile, createSharingLink, fetchItemDetail,
        downloadFile,
        reset,
    };
});
