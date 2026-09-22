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
    // [{ id, nome }]: a chave é o id do CV, o nome é o rótulo de hoje (a tela
    // rotula pelo catálogo). Aditivo antigo sem id vem com id null.
    const empreendimentos = ref([]);
    // '' = todos; senão o id do empreendimento (a query manda `?empreendimento=<id>`).
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
        // Formato antigo (array de nomes) vira { id: null, nome } para a tela
        // montar as opções do mesmo jeito.
        if (Array.isArray(dados.empreendimentos)) {
            empreendimentos.value = dados.empreendimentos.map(e => (e !== null && typeof e === 'object')
                ? { ...e, id: e.id ?? null, nome: e.nome ?? e.name ?? '' }
                : { id: null, nome: String(e ?? '') });
        }
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

    // Percentual de unidades fechadas, para a barra de progresso: a entrega é
    // a unidade com o documento completo, não a assinatura solta.
    const progresso = computed(() => {
        const r = resumo.value;
        if (!r?.unidades) return 0;
        return Math.round((r.unidades_concluidas / r.unidades) * 100);
    });

    return {
        unidades, resumo, empreendimentos, empreendimento,
        carregando, atualizando, erro, ultimaAtualizacao, falhasUltimaLeitura,
        progresso, fetchPainel, atualizar,
    };
});
