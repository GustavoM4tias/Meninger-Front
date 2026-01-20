// src/stores/config/aiStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// ajuste aqui se você guarda o token em outro lugar (ex.: Pinia de auth)
function getToken() {
    return localStorage.getItem('token'); // ou sessionStorage / cookie, etc.
}
 
export const useAIStore = defineStore('ai', () => {
    const validatorResult = ref(null);
    const validatorHistory = ref([]);
    const chatHistory = ref([]);
    const tokenStats = ref(null);
    const error = ref(null);
    const carregamento = useCarregamentoStore();

    // Valida documentos
    const validateDocuments = async (formData) => {
        error.value = null;
        validatorResult.value = null;

        try {
            carregamento.iniciarCarregamento();
            const data = await requestWithAuth(`${API_URL}/ai/validator`, {
                method: 'POST',
                body: formData, // não setar Content-Type manualmente
            });
            validatorResult.value = data;
        } catch (e) {
            error.value = e.message || 'Erro ao validar documentos';
            console.error(e);
        } finally {
            carregamento.finalizarCarregamento();
        }
    };

    // Histórico de validações (sem filtros, só cidade via backend)
    const fetchValidatorHistory = async (summary = false) => {
        error.value = null;
        try {
            if (!summary) carregamento.iniciarCarregamento();

            const url = summary
                ? `${API_URL}/ai/validator/history?summary=true`
                : `${API_URL}/ai/validator/history`;
 
            // backend retorna array puro; manter compat com possível {results: []}
            const data = await requestWithAuth(url);
            const list = Array.isArray(data) ? data : (data.results || []);
            validatorHistory.value = list.map(({ created_at, updated_at, ...rest }) => ({
                ...rest,
                createdAt: created_at,
                updatedAt: updated_at,
            }));
        } catch (e) {
            error.value = e.message || 'Erro ao buscar histórico';
            console.error(e);
        } finally {
            if (!summary) carregamento.finalizarCarregamento();
        }
    };

    // Chat
    const sendChatMessage = async (message) => {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const data = await requestWithAuth(`${API_URL}/ai/chat`, {
                method: 'POST',
                body: JSON.stringify({ message }),
            });
            chatHistory.value.push({ user: message, ai: data.response });
        } catch (e) {
            error.value = e.message || 'Erro no chat AI';
            console.error(e);
        } finally {
            carregamento.finalizarCarregamento();
        }
    };

    // Estatísticas de tokens
    const fetchTokenStats = async () => {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            tokenStats.value = await requestWithAuth(`${API_URL}/ai/token`);
        } catch (e) {
            error.value = e.message || 'Erro ao buscar tokens';
            console.error(e);
        } finally {
            carregamento.finalizarCarregamento();
        }
    };

    return {
        validatorResult,
        validatorHistory,
        chatHistory,
        tokenStats,
        error,
        validateDocuments,
        fetchValidatorHistory,
        sendChatMessage,
        fetchTokenStats,
    };
});
