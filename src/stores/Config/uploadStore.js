import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

export const useUploadStore = defineStore('upload', () => {
    const carregamento = useCarregamentoStore();

    const file = ref(null);
    const previewUrl = ref('');
    const uploadedFile = ref(null);
    const error = ref(null);
    const success = ref(null);

    const hasFile = computed(() => !!file.value);
    const isImage = computed(() => !!file.value && String(file.value.type || '').startsWith('image/'));

    const authHeaders = () => {
        const token = localStorage.getItem('token');

        return {
            Authorization: token ? `Bearer ${token}` : '',
        };
    };

    function clearMessages() {
        error.value = null;
        success.value = null;
    }

    function clearPreview() {
        if (previewUrl.value) {
            URL.revokeObjectURL(previewUrl.value);
            previewUrl.value = '';
        }
    }

    function setFile(selectedFile) {
        clearMessages();
        uploadedFile.value = null;
        clearPreview();

        file.value = selectedFile || null;

        if (file.value && String(file.value.type || '').startsWith('image/')) {
            previewUrl.value = URL.createObjectURL(file.value);
        }
    }

    function resetUpload() {
        clearPreview();
        file.value = null;
        uploadedFile.value = null;
        error.value = null;
        success.value = null;
    }

    async function uploadByContext({ context, referenceId = null, resourceType = null }, loading = true) {
        error.value = null;
        success.value = null;
        uploadedFile.value = null;

        try {
            if (!file.value) {
                throw new Error('Selecione um arquivo');
            }

            if (!context) {
                throw new Error('Contexto de upload não informado');
            }

            if (loading) carregamento.iniciarCarregamento();

            const formData = new FormData();
            formData.append('file', file.value);
            formData.append('context', context);

            if (referenceId !== null && referenceId !== undefined && String(referenceId).trim() !== '') {
                formData.append('referenceId', String(referenceId).trim());
            }

            if (resourceType !== null && resourceType !== undefined && String(resourceType).trim() !== '') {
                formData.append('resourceType', String(resourceType).trim());
            }

            const response = await fetch(`${API_URL}/uploads`, {
                method: 'POST',
                headers: authHeaders(),
                body: formData,
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Erro ao enviar arquivo');
            }

            uploadedFile.value = data;
            success.value = data?.message || 'Arquivo enviado com sucesso';

            return data;
        } catch (err) {
            error.value = err.message || 'Erro ao enviar arquivo';
            throw err;
        } finally {
            if (loading) carregamento.finalizarCarregamento();
        }
    }

    return {
        file,
        previewUrl,
        uploadedFile,
        error,
        success,
        hasFile,
        isImage,
        setFile,
        resetUpload,
        uploadByContext,
    };
});