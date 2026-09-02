// stores/Comercial/Aditivos/aditivosStore.js
//
// Acompanhamento das assinaturas de aditivo. `fetchPainel` lê o cache do banco
// (rápido); `atualizar` vai ao DocuSign buscar o status de cada envelope, o que
// demora e por isso é um botão, não algo automático ao abrir a tela.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAditivosStore = defineStore('aditivos', () => {
    const unidades = ref([]);
    const resumo = ref(null);
    const empreendimentos = ref([]);
    const empreendimento = ref('');

    const carregando = ref(false);
    const atualizando = ref(false);
    const erro = ref(null);
    const ultimaAtualizacao = ref(null);
    const falhasUltimaLeitura = ref([]);

    const qs = () => (empreendimento.value
        ? `?empreendimento=${encodeURIComponent(empreendimento.value)}`
        : '');

    function aplicar(dados) {
        unidades.value = dados.unidades ?? [];
        resumo.value = dados.resumo ?? null;
        if (dados.empreendimentos) empreendimentos.value = dados.empreendimentos;
    }

    async function fetchPainel() {
        carregando.value = true;
        erro.value = null;
        try {
            aplicar(await requestWithAuth(`/aditivos/painel${qs()}`));
        } catch (err) {
            erro.value = err.message || 'Erro ao carregar o acompanhamento.';
        } finally {
            carregando.value = false;
        }
    }

    async function atualizar() {
        atualizando.value = true;
        erro.value = null;
        try {
            const dados = await requestWithAuth(`/aditivos/painel/atualizar${qs()}`, { method: 'POST' });
            aplicar(dados);
            falhasUltimaLeitura.value = dados.falhas ?? [];
            ultimaAtualizacao.value = new Date();
        } catch (err) {
            erro.value = err.message || 'Erro ao atualizar pelo DocuSign.';
        } finally {
            atualizando.value = false;
        }
    }

    // Percentual de assinaturas colhidas, para a barra de progresso.
    const progresso = computed(() => {
        const r = resumo.value;
        if (!r?.assinantes) return 0;
        return Math.round((r.assinaram / r.assinantes) * 100);
    });

    return {
        unidades, resumo, empreendimentos, empreendimento,
        carregando, atualizando, erro, ultimaAtualizacao, falhasUltimaLeitura,
        progresso, fetchPainel, atualizar,
    };
});
