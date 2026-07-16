<script setup>
// Página pública de cadastro de imobiliária — lp.menin.com.br/imobiliaria/<token>.
// O responsável recebe o link de um usuário do Office, envia o cartão CNPJ
// (preenchimento automático) e completa o formulário; o cadastro roda no CV
// automaticamente. Token de uso único gerado na tela de Imobiliárias do Office.

import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import API_URL from '@/config/apiUrl';
import RealEstateForm from '@/components/RealEstate/RealEstateForm.vue';

const route = useRoute();
const token = computed(() => String(route.params.token || ''));

const loading = ref(true);
const invalid = ref(false);
const invite = ref(null);

const submitting = ref(false);
const serverError = ref('');
const finished = ref(false);
const finishedMessage = ref('');
const honeypot = ref('');

const BASE = computed(() => `${API_URL}/realestate/public/invite/${encodeURIComponent(token.value)}`);

async function load() {
    loading.value = true;
    invalid.value = false;
    try {
        const resp = await fetch(BASE.value, { cache: 'no-store' });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok || !d.ok) throw new Error(d.error || 'Link inválido.');
        invite.value = d.invite;
        if (d.invite.done) {
            finished.value = true;
            finishedMessage.value = d.invite.completed
                ? 'Este cadastro já foi concluído. Bem-vindo(a) ao time!'
                : 'Este link já foi utilizado. O cadastro está em processamento pela nossa equipe.';
        }
    } catch {
        invalid.value = true;
    } finally {
        loading.value = false;
    }
}

async function parseCard(file) {
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch(`${BASE.value}/parse-cnpj-card`, { method: 'POST', body: form });
    const d = await resp.json().catch(() => ({}));
    if (!resp.ok || !d.ok) throw new Error(d.error || 'Não foi possível ler este PDF.');
    return d.data;
}

async function onSubmit(form) {
    serverError.value = '';
    submitting.value = true;
    try {
        const resp = await fetch(`${BASE.value}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ form, website: honeypot.value }),
        });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok || !d.ok) throw new Error(d.error || 'Erro ao enviar o cadastro.');
        finished.value = true;
        finishedMessage.value = d.message || 'Cadastro realizado com sucesso!';
    } catch (err) {
        serverError.value = err?.message || 'Erro ao enviar o cadastro. Tente novamente.';
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    // Página pública com card branco: força o tema claro para os tokens do
    // design system usados no formulário (o main.js pode ter aplicado .dark
    // pelo tema do sistema do visitante).
    document.documentElement.classList.remove('dark');
    load();
});
</script>

<template>
    <div class="min-h-screen bg-slate-900 flex p-4 sm:p-6 justify-center">
        <div class="w-full max-w-2xl my-auto">
            <!-- Marca -->
            <div class="flex justify-center mb-5">
                <img src="https://office.menin.com.br/Mlogotext.png" alt="Menin" class="h-9" />
            </div>

            <div class="rounded-2xl bg-white shadow-xl p-5 sm:p-8">
                <!-- Carregando -->
                <div v-if="loading" class="py-16 text-center text-slate-500">
                    <i class="fas fa-circle-notch fa-spin text-2xl"></i>
                    <p class="mt-3 text-sm">Carregando...</p>
                </div>

                <!-- Link inválido -->
                <div v-else-if="invalid" class="py-14 text-center">
                    <i class="fas fa-link-slash text-3xl text-slate-400"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Link inválido ou cancelado</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        Confira se o endereço está completo ou peça um novo link para quem enviou este convite.
                    </p>
                </div>

                <!-- Concluído / já utilizado -->
                <div v-else-if="finished" class="py-14 text-center">
                    <i class="fas fa-circle-check text-4xl text-emerald-500"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Tudo certo!</h1>
                    <p class="mt-1 text-sm text-slate-500">{{ finishedMessage }}</p>
                </div>

                <!-- Formulário -->
                <template v-else>
                    <header class="mb-6">
                        <h1 class="text-xl font-bold text-slate-900">Cadastro de imobiliária</h1>
                        <p class="mt-1 text-sm text-slate-500">
                            <template v-if="invite?.label">Convite: {{ invite.label }}. </template>
                            Preencha os dados abaixo para cadastrar a imobiliária e o gerente responsável.
                        </p>
                        <div v-if="invite?.enterprises?.length" class="mt-3 flex flex-wrap gap-1.5">
                            <span
                                v-for="e in invite.enterprises" :key="e.nome"
                                class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                            >
                                <i class="fas fa-building text-slate-400"></i>{{ e.nome }}
                            </span>
                        </div>
                    </header>

                    <!-- Honeypot anti-bot: humano não vê nem preenche. -->
                    <input v-model="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />

                    <RealEstateForm
                        :parse-card="parseCard"
                        :submitting="submitting"
                        :server-error="serverError"
                        submit-label="Enviar cadastro"
                        @submit="onSubmit"
                    />
                </template>
            </div>

            <p class="mt-4 text-center text-xs text-slate-500">
                Menin Engenharia · dúvidas? Fale com quem enviou este link.
            </p>
        </div>
    </div>
</template>
