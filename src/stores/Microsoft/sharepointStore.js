// stores/Microsoft/sharepointStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

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

    // ── Computed ──────────────────────────────────────────────────────────────
    const currentFolderId = computed(() =>
        breadcrumb.value.length ? breadcrumb.value[breadcrumb.value.length - 1].id : null
    );
    const isAtRoot = computed(() => breadcrumb.value.length === 0);

    // ── Actions: navegação ────────────────────────────────────────────────────

    async function fetchSites() {
        loading.value = true; error.value = null;
        try { sites.value = await requestWithAuth(`${BASE}/sites`); }
        catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    }

    async function selectSite(site) {
        selectedSite.value = site; selectedDrive.value = null;
        drives.value = []; items.value = [];
        breadcrumb.value = []; searchQuery.value = ''; searchResults.value = [];
        loading.value = true; error.value = null;
        try {
            drives.value = await requestWithAuth(`${BASE}/sites/${site.id}/drives`);
            if (drives.value.length === 1) await selectDrive(drives.value[0]);
        } catch (err) { error.value = err.message; }
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
        try { items.value = await requestWithAuth(`${BASE}/drives/${selectedDrive.value.id}/root`); }
        catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    }

    async function openFolder(folder) {
        if (!selectedDrive.value) return;
        breadcrumb.value = [...breadcrumb.value, { id: folder.id, name: folder.name }];
        loading.value = true; error.value = null;
        try {
            items.value = await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/items/${folder.id}/children`
            );
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    }

    async function navigateToBreadcrumb(index) {
        if (index === -1) { breadcrumb.value = []; await _loadRoot(); return; }
        breadcrumb.value = breadcrumb.value.slice(0, index + 1);
        const target = breadcrumb.value[index];
        loading.value = true; error.value = null;
        try {
            items.value = await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/items/${target.id}/children`
            );
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    }

    async function doSearch() {
        if (!selectedDrive.value || !searchQuery.value.trim()) return;
        isSearching.value = true; error.value = null;
        try {
            searchResults.value = await requestWithAuth(
                `${BASE}/drives/${selectedDrive.value.id}/search?q=${encodeURIComponent(searchQuery.value.trim())}`
            );
        } catch (err) { error.value = err.message; }
        finally { isSearching.value = false; }
    }

    function clearSearch() { searchQuery.value = ''; searchResults.value = []; }

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
            error.value = err.message;
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
            error.value = err.message;
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
            error.value = err.message;
            throw err;
        }
    }

    async function uploadFile(file, parentId) {
        if (!selectedDrive.value) return;
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
            error.value = err.message;
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
            error.value = err.message;
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
        loading, error,
        currentFolderId, isAtRoot,
        fetchSites, selectSite, selectDrive,
        openFolder, navigateToBreadcrumb,
        doSearch, clearSearch,
        deleteItem, renameItem, moveItem, uploadFile, createSharingLink, fetchItemDetail,
        downloadFile,
        reset,
    };
});
