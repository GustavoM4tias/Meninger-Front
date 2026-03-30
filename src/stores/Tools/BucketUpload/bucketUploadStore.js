// /stores/Tools/BucketUpload/bucketUploadStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useBucketUploadStore = defineStore('bucketUpload', () => {
    const preview = ref(null);       // { tempId, files: [{ name, previewRows, totalRows }] }
    const history = ref([]);
    const loading = ref(false);
    const uploading = ref(false);
    const error = ref(null);

    async function processFile(file) {
        loading.value = true;
        error.value = null;
        preview.value = null;

        try {
            const form = new FormData();
            form.append('file', file);

            const data = await requestWithAuth('/bucket-upload/preview', {
                method: 'POST',
                body: form,
            });

            preview.value = data;
            return data;
        } catch (err) {
            error.value = err.message || 'Erro ao processar arquivo.';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function confirmSend() {
        if (!preview.value?.tempId) throw new Error('Nenhum preview ativo.');

        uploading.value = true;
        error.value = null;

        try {
            const data = await requestWithAuth('/bucket-upload/confirm', {
                method: 'POST',
                body: JSON.stringify({ tempId: preview.value.tempId }),
            });

            preview.value = null;
            await fetchHistory();
            return data;
        } catch (err) {
            error.value = err.message || 'Erro ao enviar para o bucket.';
            throw err;
        } finally {
            uploading.value = false;
        }
    }

    async function fetchHistory() {
        try {
            const data = await requestWithAuth('/bucket-upload/history');
            history.value = data;
        } catch (err) {
            console.error('[BucketUpload] history fetch error:', err);
        }
    }

    function cancelPreview() {
        preview.value = null;
        error.value = null;
    }

    return { preview, history, loading, uploading, error, processFile, confirmSend, fetchHistory, cancelPreview };
});
