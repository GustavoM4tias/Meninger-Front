// stores/Cv/cvIntegrationStore.js
//
// Estado da tela CV CRM > Integrações.
//
// A tela mostra os DOIS lados da mesma ponte, e por isso eles moram juntos
// aqui: o que o CV tem cadastrado (para onde ele manda) e o que o Office tem
// ligado (o que ele aceita receber). O erro mais chato dessa integração é
// justamente a divergência entre os dois - o CV chamando um endereço que o
// Office ignora - e ele só é visível olhando os dois ao mesmo tempo.

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = '/cv-integracoes';

export const useCvIntegrationStore = defineStore('cvIntegration', () => {
    const webhooks = ref([]);        // cadastrados no CV
    const endpoints = ref([]);       // os que recebem no Office
    const funcionalidades = ref({}); // código do CV -> rótulo
    const cvParaLocal = ref({});     // RS -> reservas, RP -> repasses
    const catalogo = ref([]);        // gatilhos por funcionalidade
    const eventos = ref([]);
    const eventosTotal = ref(0);

    const carregando = ref(false);
    const carregandoEventos = ref(false);
    const erro = ref('');

    // Falha de carga precisa virar ERRO na tela. Lista vazia por API fora do ar
    // se parece com "nenhum webhook cadastrado", que é a leitura oposta da
    // verdade e a mais perigosa nesta tela.
    async function carregar() {
        carregando.value = true;
        erro.value = '';
        try {
            const data = await requestWithAuth(`${BASE}/webhooks`);
            webhooks.value = data?.webhooks || [];
            endpoints.value = data?.endpoints || [];
            funcionalidades.value = data?.funcionalidades || {};
            cvParaLocal.value = data?.cv_para_local || {};
        } catch (err) {
            erro.value = err?.message || 'Não foi possível ler os webhooks no CV.';
            throw err;
        } finally {
            carregando.value = false;
        }
    }

    async function carregarCatalogo() {
        if (catalogo.value.length) return catalogo.value;
        catalogo.value = await requestWithAuth(`${BASE}/gatilhos`) || [];
        return catalogo.value;
    }

    async function criarWebhook(payload) {
        const r = await requestWithAuth(`${BASE}/webhooks`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        await carregar();
        return r;
    }

    async function apagarWebhook(id) {
        const r = await requestWithAuth(`${BASE}/webhooks/${id}`, { method: 'DELETE' });
        await carregar();
        return r;
    }

    async function padronizarNome(id) {
        const r = await requestWithAuth(`${BASE}/webhooks/${id}/padronizar-nome`, { method: 'POST' });
        await carregar();
        return r;
    }

    async function alternarAtivoNoCv(id) {
        const r = await requestWithAuth(`${BASE}/webhooks/${id}/alternar-ativo`, { method: 'POST' });
        await carregar();
        return r;
    }

    async function salvarEndpoint(funcionalidade, patch) {
        await requestWithAuth(`${BASE}/endpoints/${funcionalidade}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
        });
        await carregar();
    }

    async function regenerarToken(funcionalidade) {
        await requestWithAuth(`${BASE}/endpoints/${funcionalidade}/regenerar-token`, { method: 'POST' });
        await carregar();
    }

    async function reprocessar(funcionalidade, id) {
        return requestWithAuth(`${BASE}/endpoints/${funcionalidade}/reprocessar`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
    }

    async function carregarEventos(filtros = {}) {
        carregandoEventos.value = true;
        try {
            const qs = new URLSearchParams(
                Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
            ).toString();
            const data = await requestWithAuth(`${BASE}/eventos${qs ? `?${qs}` : ''}`);
            eventos.value = data?.eventos || [];
            eventosTotal.value = Number(data?.total || 0);
            return data;
        } finally {
            carregandoEventos.value = false;
        }
    }

    return {
        webhooks, endpoints, funcionalidades, cvParaLocal, catalogo,
        eventos, eventosTotal,
        carregando, carregandoEventos, erro,
        carregar, carregarCatalogo, criarWebhook, apagarWebhook, padronizarNome, alternarAtivoNoCv,
        salvarEndpoint, regenerarToken, reprocessar, carregarEventos,
    };
});
