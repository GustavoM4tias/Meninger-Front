<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const router = useRouter();
const auth = useAuthStore();

const mode = ref('INTERNAL'); // INTERNAL | BROKER | REALESTATE
const email = ref('');
const password = ref('');

const documentValue = ref(''); // CPF digits
const accessCode = ref('');
const step = ref('FORM'); // FORM | CODE
const loading = ref(false);
const error = ref('');

const isExternal = computed(() => mode.value !== 'INTERNAL');

function onlyDigits(v) {
    return String(v || '').replace(/\D/g, '');
}

function api(path) {
    // VITE_API_URL deve apontar para ".../api"
    // ex: https://office.menin.com.br/api
    return `${import.meta.env.VITE_API_URL}${path}`;
}

async function loginInternal() {
    loading.value = true; error.value = '';
    try {
        const resp = await fetch(api('/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, password: password.value }),
        }).then(r => r.json());

        if (!resp?.success) throw new Error(resp?.message || resp?.error || 'Falha no login');

        auth.setToken(resp.data?.token || resp.token);
        await auth.fetchMe();

        router.push({ name: 'AcademyPanel' });
    } catch (e) {
        error.value = e?.message || 'Erro no login';
    } finally {
        loading.value = false;
    }
}

async function requestExternalCode() {
    loading.value = true; error.value = '';
    try {
        const cpf = onlyDigits(documentValue.value);
        if (cpf.length !== 11) throw new Error('CPF inválido');

        const resp = await fetch(api('/academy/external/request'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: cpf, kind: mode.value }),
        }).then(r => r.json());

        if (!resp?.success) throw new Error(resp?.message || resp?.error || 'Não foi possível enviar o código');

        step.value = 'CODE';
    } catch (e) {
        error.value = e?.message || 'Erro';
    } finally {
        loading.value = false;
    }
}

async function verifyExternalCode() {
    loading.value = true; error.value = '';
    try {
        const cpf = onlyDigits(documentValue.value);
        const code = onlyDigits(accessCode.value);
        if (cpf.length !== 11) throw new Error('CPF inválido');
        if (code.length < 4) throw new Error('Código inválido');

        const resp = await fetch(api('/academy/external/verify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: cpf, kind: mode.value, code }),
        }).then(r => r.json());

        if (!resp?.success) throw new Error(resp?.message || resp?.error || 'Código incorreto');

        auth.setToken(resp.data?.token || resp.token);
        await auth.fetchMe();

        router.push({ name: 'AcademyPanel' });
    } catch (e) {
        error.value = e?.message || 'Erro';
    } finally {
        loading.value = false;
    }
}

async function submit() {
    if (!isExternal.value) return loginInternal();
    if (step.value === 'FORM') return requestExternalCode();
    return verifyExternalCode();
}
</script>

<template>
    <div class="max-w-md mx-auto p-6 space-y-4">
        <h1 class="text-xl font-semibold">Acesso</h1>

        <div class="flex gap-2">
            <button class="px-3 py-2 border rounded" :class="mode === 'INTERNAL' ? 'bg-black text-white' : ''"
                @click="mode = 'INTERNAL'; step = 'FORM'">Interno</button>
            <button class="px-3 py-2 border rounded" :class="mode === 'BROKER' ? 'bg-black text-white' : ''"
                @click="mode = 'BROKER'; step = 'FORM'">Corretor</button>
            <button class="px-3 py-2 border rounded" :class="mode === 'REALESTATE' ? 'bg-black text-white' : ''"
                @click="mode = 'REALESTATE'; step = 'FORM'">Imobiliária</button>
        </div>

        <div v-if="error" class="p-3 border border-red-300 rounded text-sm text-red-700">{{ error }}</div>

        <div v-if="mode === 'INTERNAL'" class="space-y-3">
            <input v-model="email" class="w-full border rounded px-3 py-2" placeholder="Email" />
            <input v-model="password" type="password" class="w-full border rounded px-3 py-2" placeholder="Senha" />
        </div>

        <div v-else class="space-y-3">
            <input v-model="documentValue" class="w-full border rounded px-3 py-2"
                placeholder="CPF (somente números)" />
            <input v-if="step === 'CODE'" v-model="accessCode" class="w-full border rounded px-3 py-2"
                placeholder="Código recebido por e-mail" />
            <p v-if="step === 'CODE'" class="text-xs text-slate-500">Não recebeu? volte e solicite novamente.</p>
        </div>

        <button class="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60" :disabled="loading"
            @click="submit">
            <span v-if="mode === 'INTERNAL'">Entrar</span>
            <span v-else-if="step === 'FORM'">Enviar código</span>
            <span v-else>Validar código</span>
        </button>

        <button v-if="mode !== 'INTERNAL' && step === 'CODE'" class="w-full px-4 py-2 rounded border"
            @click="step = 'FORM'">
            Voltar
        </button>
    </div>
</template>
