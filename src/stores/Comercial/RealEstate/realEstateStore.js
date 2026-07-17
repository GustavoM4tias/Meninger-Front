// stores/Comercial/RealEstate/realEstateStore.js
//
// Cadastro de imobiliárias no CV: listagem dos cadastros/convites do usuário,
// geração de link público, cadastro interno direto, retry e parse do cartão
// CNPJ. Empreendimentos selecionáveis vêm de /cv/empreendimentos (já filtrado
// pela cidade/acesso do usuário no backend).

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useRealEstateStore = defineStore('realEstate', () => {
    const registrations = ref([]);
    const enterprises = ref([]);      // [{ id, nome }]
    const loading = ref(false);
    const loadingEnterprises = ref(false);

    async function fetchRegistrations() {
        loading.value = true;
        try {
            const data = await requestWithAuth('/realestate/registrations');
            registrations.value = data?.registrations || [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchEnterprises() {
        if (enterprises.value.length) return;
        loadingEnterprises.value = true;
        try {
            const data = await requestWithAuth('/cv/empreendimentos');
            enterprises.value = (Array.isArray(data) ? data : [])
                .map(e => ({ id: Number(e.idempreendimento), nome: e.nome }))
                .filter(e => Number.isFinite(e.id) && e.nome)
                .sort((a, b) => a.nome.localeCompare(b.nome));
        } finally {
            loadingEnterprises.value = false;
        }
    }

    async function createInvite({ label, enterprises: ents, multi_use, starts_at, ends_at }) {
        const data = await requestWithAuth('/realestate/invites', {
            method: 'POST',
            body: JSON.stringify({ label, enterprises: ents, multi_use, starts_at, ends_at }),
        });
        await fetchRegistrations();
        return data.registration;
    }

    async function revokeInvite(id) {
        await requestWithAuth(`/realestate/invites/${id}/revoke`, { method: 'POST' });
        await fetchRegistrations();
    }

    async function createRegistration({ form, enterprises: ents }) {
        const data = await requestWithAuth('/realestate/registrations', {
            method: 'POST',
            body: JSON.stringify({ form, enterprises: ents }),
        });
        await fetchRegistrations();
        return data.registration;
    }

    async function retryRegistration(id) {
        try {
            const data = await requestWithAuth(`/realestate/registrations/${id}/retry`, { method: 'POST' });
            return data.registration;
        } finally {
            await fetchRegistrations();
        }
    }

    // ── Relatório (backup cv_imobiliarias) ───────────────────────────────────
    const report = ref({ imobiliarias: [], total: 0, last_sync: null });
    const loadingReport = ref(false);
    const syncing = ref(false);

    async function fetchReport() {
        loadingReport.value = true;
        try {
            report.value = await requestWithAuth('/realestate/report');
        } finally {
            loadingReport.value = false;
        }
    }

    async function syncImobiliarias() {
        syncing.value = true;
        try {
            await requestWithAuth('/realestate/sync', { method: 'POST' });
            await fetchReport();
        } finally {
            syncing.value = false;
        }
    }

    async function parseCnpjCard(file) {
        const form = new FormData();
        form.append('file', file);
        const data = await requestWithAuth('/realestate/parse-cnpj-card', {
            method: 'POST',
            body: form,
        });
        return data.data;
    }

    return {
        registrations,
        enterprises,
        loading,
        loadingEnterprises,
        report,
        loadingReport,
        syncing,
        fetchRegistrations,
        fetchEnterprises,
        fetchReport,
        syncImobiliarias,
        createInvite,
        revokeInvite,
        createRegistration,
        retryRegistration,
        parseCnpjCard,
    };
});
