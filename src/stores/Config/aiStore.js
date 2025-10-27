// src/stores/config/aiStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

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
            const res = await fetch(`${API_URL}/ai/validator`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Erro ao validar documentos');
            validatorResult.value = await res.json();
        } catch (e) {
            error.value = 'Erro ao validar documentos';
            console.error(e);
        } finally {
            carregamento.finalizarCarregamento();
        }
    };

    // Histórico de validações 
    const fetchValidatorHistory = async (summary = false) => {
        error.value = null;

        try {
            if (!summary) carregamento.iniciarCarregamento(); // só inicia se for listagem completa

            const url = summary
                ? `${API_URL}/ai/validator/history?summary=true`
                : `${API_URL}/ai/validator/history`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('Erro ao buscar histórico de validações');
            const data = await res.json();

            validatorHistory.value = data.results || data;
        } catch (e) {
            error.value = 'Erro ao buscar histórico';
            console.error(e);
        } finally {
            if (!summary) carregamento.finalizarCarregamento(); // só finaliza se iniciou
        }
    };

    // Enviar mensagem ao chat AI
    const sendChatMessage = async (message) => {
        error.value = null;

        try {
            carregamento.iniciarCarregamento();
            const res = await fetch(`${API_URL}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
            if (!res.ok) throw new Error('Erro ao enviar mensagem ao chat');
            const data = await res.json();
            chatHistory.value.push({ user: message, ai: data.response });
        } catch (e) {
            error.value = 'Erro no chat AI';
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
            const res = await fetch(`${API_URL}/ai/token`);
            if (!res.ok) throw new Error('Erro ao buscar estatísticas de tokens');
            tokenStats.value = await res.json();
        } catch (e) {
            error.value = 'Erro ao buscar tokens';
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
