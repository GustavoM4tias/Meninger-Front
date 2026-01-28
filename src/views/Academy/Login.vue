<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import { Splide, SplideSlide } from '@splidejs/vue-splide';

const router = useRouter();
const auth = useAuthStore();

const mode = ref('INTERNAL'); // INTERNAL | BROKER | REALESTATE | CORRESPONDENT
const email = ref('');
const password = ref('');
const showPassword = ref(false);

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
    return `${import.meta.env.VITE_API_URL}${path}`;
}

function setMode(nextMode) {
    mode.value = nextMode;
    step.value = 'FORM';
    error.value = '';
    accessCode.value = '';
}

const modeLabel = computed(() => {
    if (mode.value === 'INTERNAL') return 'Acesso • interno';
    if (mode.value === 'BROKER') return 'Acesso • Corretor';
    if (mode.value === 'REALESTATE') return 'Acesso • Imobiliária';
    if (mode.value === 'CORRESPONDENT') return 'Acesso • Correspondente';
    return 'Menin • Academy';
});

const subtitle = computed(() => {
    if (mode.value === 'INTERNAL') return 'Entre com sua conta e continue suas trilhas.';
    if (step.value === 'FORM') return 'Informe seu CPF para receber um código por e-mail.';
    return 'Digite o código recebido para concluir o acesso.';
});

const helperText = computed(() => {
    if (mode.value === 'INTERNAL') return 'Use seu e-mail e senha.';
    if (step.value === 'FORM') return 'CPF com 11 dígitos (somente números).';
    return 'Código numérico recebido por e-mail.';
});

const slides = [
    {
        img: 'https://menin.com.br/wp-content/uploads/2024/06/Objeto-Inteligente-de-Vetor.jpg',
        tag: 'Treinamento',
        title: 'Trilhas objetivas e atualizadas',
        desc: 'Conteúdo para time interno e parceiros de venda.',
    },
    {
        img: 'https://menin.com.br/wp-content/uploads/2025/07/549-1.jpg',
        tag: 'Performance',
        title: 'Materiais que apoiam a operação',
        desc: 'Do produto ao atendimento: rápido, prático e direto.',
    },
];

// dentro do seu <script setup> (substitua a função inteira)

async function requestExternalCode() {
    loading.value = true;
    error.value = '';

    const controller = new AbortController();
    const timeoutMs = 12000; // 12s
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const cpf = onlyDigits(documentValue.value);
        if (cpf.length !== 11) throw new Error('CPF inválido');

        const respRaw = await fetch(api('/academy/external/request'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: cpf, kind: mode.value }),
            signal: controller.signal,
        });

        // tenta ler json, mas não quebra se vier vazio
        let resp = null;
        try { resp = await respRaw.json(); } catch { resp = null; }

        // Se backend respondeu, não trava UX:
        // - Se vier erro explícito (success:false), mostra.
        // - Caso contrário, segue para a etapa de código (resposta neutra é ok)
        if (resp?.success === false) {
            throw new Error(resp?.message || resp?.error || 'Não foi possível enviar o código');
        }

        step.value = 'CODE';
    } catch (e) {
        if (e?.name === 'AbortError') {
            error.value = 'Demorou para responder. Tente novamente.';
        } else {
            error.value = e?.message || 'Erro';
        }
    } finally {
        clearTimeout(t);
        loading.value = false;
    }
}

function academyOrigin() {
    return 'https://academy.menin.com.br';
}

function isAcademyHost() {
    return window.location.host === 'academy.menin.com.br';
}

function hardGoToAcademy(path) {
    window.location.replace(`${academyOrigin()}${path}`);
}

async function goToAcademyPanel() {
    // ✅ garante domínio correto SEM depender do match do router
    if (!isAcademyHost()) {
        hardGoToAcademy('/panel');
        return;
    }

    // ✅ evita voltar pro login no botão voltar
    await router.replace({ name: 'AcademyPanel' });
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

        // ✅ sempre cair no painel do academy
        await goToAcademyPanel();
    } catch (e) {
        error.value = e?.message || 'Erro no login';
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
        if (code.length !== 6) throw new Error('Código inválido');

        const resp = await fetch(api('/academy/external/verify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: cpf, kind: mode.value, code }),
        }).then(r => r.json());

        if (!resp?.success) throw new Error(resp?.message || resp?.error || 'Código incorreto');

        auth.setToken(resp.data?.token || resp.token);
        await auth.fetchMe();

        // ✅ sempre cair no painel do academy
        await goToAcademyPanel();
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

const primaryCtaLabel = computed(() => {
    if (mode.value === 'INTERNAL') return 'Entrar';
    if (step.value === 'FORM') return 'Enviar código';
    return 'Validar código';
});

const splideOptions = {
    type: 'loop',
    autoplay: true,
    interval: 5200,
    pauseOnHover: true,
    arrows: false,
    pagination: true,
    speed: 650,
    gap: 0,       // sem espaço entre slides
    padding: 0,   // sem padding do track
};
</script>

<template>
    <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div class="grid min-h-screen lg:grid-cols-2">
            <!-- LEFT: Carousel -->
            <section class="relative hidden lg:block overflow-hidden">
                <Splide :options="splideOptions" class="h-full">
                    <SplideSlide v-for="(s, idx) in slides" :key="idx" class="!m-0 !p-0">
                        <div class="relative h-screen">
                            <img :src="s.img" alt="" class="absolute inset-0 h-full w-full object-cover"
                                loading="lazy" />

                            <!-- overlay: ajustado para contraste em qualquer modo -->
                            <div class="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/35 to-black/10">
                            </div>

                            <div class="relative z-10 flex h-full items-end p-10">
                                <div class="max-w-xl space-y-4">
                                    <div
                                        class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                                        <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
                                        {{ s.tag }}
                                    </div>

                                    <h2 class="text-4xl font-semibold tracking-tight text-white">
                                        {{ s.title }}
                                    </h2>

                                    <p class="text-base text-white/85">
                                        {{ s.desc }}
                                    </p>

                                    <div class="pt-2 text-sm text-white/70">
                                        Menin Academy • Seu hub de treinamento e processos
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SplideSlide>
                </Splide>

                <!-- brand corner -->
                <div class="pointer-events-none absolute left-8 top-8 z-20">
                    <div class="rounded-2xl bg-white/10 px-4 py-3 text-white ring-1 ring-white/15 backdrop-blur">
                        <img src="/ACADEMY.png" class="h-10 invert dark:invert-0" alt="Menin Academy">
                        <div class="text-xs text-white/75">Trilhas e materiais oficiais</div>
                    </div>
                </div>
            </section>

            <!-- RIGHT: Login -->
            <main class="flex items-center justify-center px-6 py-10">
                <div class="w-full max-w-lg">
                    <div class="mb-6 space-y-2 items-center flex flex-col">
                        <div class="text-sm -mb-2 font-medium text-slate-600 dark:text-slate-300">
                            {{ modeLabel }}
                        </div>

                        <img src="/ACADEMY.png" class="h-16 invert dark:invert-0" alt="Menin Academy">

                        <!-- <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                            {{ headline }}
                        </h1> -->

                        <p class="text-sm text-slate-600 dark:text-slate-300">
                            {{ subtitle }}
                        </p>
                    </div>

                    <!-- Mode switch -->
                    <div class="mb-6 grid grid-cols-2 md:grid-cols-4 text-sm gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200
            dark:bg-slate-900 dark:ring-slate-800">

                        <button class="rounded-xl p-2 font-medium transition" :class="mode === 'INTERNAL'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'"
                            @click="setMode('INTERNAL')" :disabled="loading">
                            Interno
                        </button>

                        <button class="rounded-xl p-2 font-medium transition" :class="mode === 'BROKER'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'"
                            @click="setMode('BROKER')" :disabled="loading">
                            Corretor
                        </button>

                        <button class="rounded-xl p-2 font-medium transition" :class="mode === 'REALESTATE'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'"
                            @click="setMode('REALESTATE')" :disabled="loading">
                            Imobiliária
                        </button>

                        <button class="rounded-xl p-2 font-medium transition" :class="mode === 'CORRESPONDENT'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'"
                            @click="setMode('CORRESPONDENT')" :disabled="loading">
                            Correspondente
                        </button>

                    </div>

                    <!-- Card -->
                    <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200
                      dark:bg-slate-900 dark:ring-slate-800">
                        <div v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700
                     dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                            {{ error }}
                        </div>

                        <div class="mb-4 text-sm text-slate-600 dark:text-slate-300">
                            {{ helperText }}
                        </div>

                        <!-- INTERNAL -->
                        <div v-if="mode === 'INTERNAL'" class="space-y-4">
                            <div class="space-y-2">
                                <label class="text-xs font-medium text-slate-700 dark:text-slate-200">E-mail</label>
                                <input v-model="email" inputmode="email" autocomplete="email" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition
                         focus:border-slate-400 focus:ring-2 focus:ring-slate-200
                         dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500
                         dark:focus:border-slate-600 dark:focus:ring-slate-700/40"
                                    placeholder="seuemail@menin.com.br" />
                            </div>

                            <div class="space-y-2">
                                <label class="text-xs font-medium text-slate-700 dark:text-slate-200">Senha</label>
                                <div class="relative">
                                    <input v-model="password" :type="showPassword ? 'text' : 'password'"
                                        autocomplete="current-password" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-12 text-sm outline-none transition
                           focus:border-slate-400 focus:ring-2 focus:ring-slate-200
                           dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500
                           dark:focus:border-slate-600 dark:focus:ring-slate-700/40" placeholder="Digite sua senha"
                                        @keydown.enter="submit" />

                                    <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium
                           text-slate-600 hover:bg-slate-50
                           dark:text-slate-200 dark:hover:bg-slate-800" @click="showPassword = !showPassword"
                                        :disabled="loading">
                                        {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                                    </button>
                                </div>
                            </div>

                            <div class="flex items-center justify-between">
                                <label
                                    class="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <input type="checkbox"
                                        class="h-4 w-4 rounded border-slate-300 dark:border-slate-700" />
                                    Manter conectado
                                </label>

                                <button type="button"
                                    class="text-sm font-medium text-slate-700 hover:underline dark:text-slate-200"
                                    :disabled="loading">
                                    Esqueci minha senha
                                </button>
                            </div>
                        </div>

                        <!-- EXTERNAL -->
                        <div v-else class="space-y-4">
                            <div class="flex items-center gap-2">
                                <div class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600
                         dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                                    <span class="font-semibold text-slate-800 dark:text-white">1.</span> Solicitar
                                    código
                                </div>

                                <div class="flex-1 rounded-xl border px-3 py-2 text-xs"
                                    :class="step === 'CODE'
                                        ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300'
                                        : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'">
                                    <span class="font-semibold" :class="step === 'CODE'
                                        ? 'text-slate-800 dark:text-white'
                                        : 'text-slate-400 dark:text-slate-500'">2.</span>
                                    Validar código
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="text-xs font-medium text-slate-700 dark:text-slate-200">CPF</label>
                                <input v-model="documentValue" inputmode="numeric" autocomplete="off" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition
                         focus:border-slate-400 focus:ring-2 focus:ring-slate-200
                         dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500
                         dark:focus:border-slate-600 dark:focus:ring-slate-700/40" placeholder="Somente números"
                                    :disabled="loading || step === 'CODE'" @keydown.enter="submit" />
                            </div>

                            <div v-if="step === 'CODE'" class="space-y-2">
                                <label class="text-xs font-medium text-slate-700 dark:text-slate-200">Código</label>
                                <input v-model="accessCode" inputmode="numeric" autocomplete="one-time-code" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition
                         focus:border-slate-400 focus:ring-2 focus:ring-slate-200
                         dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500
                         dark:focus:border-slate-600 dark:focus:ring-slate-700/40"
                                    placeholder="Código recebido por e-mail" @keydown.enter="submit" />
                                <p class="text-xs text-slate-500 dark:text-slate-400">
                                    Se não receber, volte e solicite novamente.
                                </p>
                            </div>

                            <button v-if="step === 'CODE'" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700
                       hover:bg-slate-50 disabled:opacity-60
                       dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800" :disabled="loading"
                                @click="step = 'FORM'; error = ''; accessCode = ''">
                                Voltar e reenviar
                            </button>
                        </div>

                        <!-- CTA -->
                        <button class="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition
                     hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60
                     dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100" :disabled="loading" @click="submit">
                            <span v-if="loading">Processando...</span>
                            <span v-else>{{ primaryCtaLabel }}</span>
                        </button>

                        <div class="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            Ao acessar, você concorda com as políticas internas da plataforma.
                        </div>
                    </div>

                    <div class="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                        Menin Academy • Seu hub de treinamento e processos
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<style>
/* Splide: remove qualquer “gap”/espaço residual */
.splide__track,
.splide__list,
.splide__slide {
    margin: 0 !important;
    padding: 0 !important;
}

/* Paginação mais discreta */
.splide__pagination {
    bottom: 22px;
}

.splide__pagination__page {
    opacity: 0.6;
    transform: scale(0.95);
}

.splide__pagination__page.is-active {
    opacity: 1;
    transform: scale(1.05);
}
</style>
