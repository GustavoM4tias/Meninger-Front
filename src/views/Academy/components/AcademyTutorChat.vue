<template>
    <!-- Bolha flutuante (todas as telas, menos o Painel) -->
    <Transition name="ate-pop">
        <button v-if="!tutor.isOpen && !isPanelRoute" type="button" @click="tutor.open()"
            class="absolute bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95"
            title="Falar com o Eme">
            <i class="fa-solid fa-graduation-cap text-xl"></i>
        </button>
    </Transition>

    <!-- Chat — preenche a área de conteúdo; a barra lateral continua visível -->
    <Transition name="ate-screen">
        <div v-if="tutor.isOpen" class="absolute inset-0 z-40 flex flex-col bg-slate-50 dark:bg-slate-950">
            <!-- Header -->
            <header
                class="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-4 sm:py-3">
                <div class="flex items-center gap-2.5">
                    <span
                        class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                        <i class="fa-solid fa-graduation-cap"></i>
                    </span>
                    <div>
                        <div class="text-sm font-semibold text-slate-900 dark:text-white">Eme · Tutor</div>
                        <div class="text-[11px] text-slate-400 dark:text-slate-500">
                            Assistente de estudos do Academy
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button type="button" @click="openHistory" title="Histórico de conversas"
                        class="rounded-lg px-2.5 py-2 transition"
                        :class="historyOpen
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'">
                        <i class="fa-solid fa-clock-rotate-left text-sm"></i>
                    </button>
                    <button type="button" @click="newConversation" title="Nova conversa"
                        class="rounded-lg px-2.5 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
                        <i class="fa-solid fa-pen-to-square text-sm"></i>
                    </button>
                    <button type="button" @click="tutor.close()" title="Fechar"
                        class="rounded-lg px-2.5 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
                        <i class="fa-solid fa-xmark text-base"></i>
                    </button>
                </div>
            </header>

            <!-- ─────────────── Histórico ─────────────── -->
            <div v-if="historyOpen" class="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
                <div
                    class="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <span class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <i class="fa-regular fa-clock text-indigo-500"></i>
                        Histórico de conversas
                    </span>
                    <button type="button" @click="historyOpen = false"
                        class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                        Voltar à conversa
                    </button>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div class="mx-auto w-full max-w-3xl px-3 py-3">
                        <div v-if="error"
                            class="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                            {{ error }}
                        </div>

                        <!-- Carregando -->
                        <div v-if="loadingSessions" class="flex items-center justify-center gap-1 py-12 text-slate-400">
                            <span class="ate-dot"></span>
                            <span class="ate-dot" style="animation-delay:.15s"></span>
                            <span class="ate-dot" style="animation-delay:.3s"></span>
                        </div>

                        <!-- Vazio -->
                        <div v-else-if="!sessions.length"
                            class="flex flex-col items-center justify-center gap-2 py-14 text-center">
                            <div
                                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                <i class="fa-regular fa-comments text-lg"></i>
                            </div>
                            <p class="text-sm text-slate-500 dark:text-slate-400">Nenhuma conversa ainda</p>
                            <p class="text-xs text-slate-400 dark:text-slate-500">
                                Suas conversas com o Eme aparecem aqui
                            </p>
                        </div>

                        <!-- Lista -->
                        <template v-else>
                            <p v-if="favoriteSessions.length"
                                class="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Favoritas
                            </p>
                            <div v-for="s in favoriteSessions" :key="s.id"
                                class="group flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white dark:hover:bg-slate-900"
                                :class="s.id === sessionId ? 'bg-white ring-1 ring-indigo-200 dark:bg-slate-900 dark:ring-indigo-900/60' : ''">
                                <button type="button" @click="loadSession(s.id)" class="min-w-0 flex-1 text-left">
                                    <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {{ s.title || 'Conversa sem título' }}
                                    </p>
                                    <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ fromNow(s.updated_at)
                                        }}</p>
                                </button>
                                <div class="flex shrink-0 items-center gap-0.5">
                                    <button type="button" @click.stop="renameSessionRow(s)" title="Renomear"
                                        class="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                                        <i class="fa-solid fa-pen text-[11px]"></i>
                                    </button>
                                    <button type="button" @click.stop="toggleFavorite(s)" title="Desfavoritar"
                                        class="grid h-7 w-7 place-items-center rounded-md text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-950/40">
                                        <i class="fa-solid fa-star text-[11px]"></i>
                                    </button>
                                    <button type="button" @click.stop="deleteSession(s)" title="Excluir"
                                        class="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
                                        <i class="fa-regular fa-trash-can text-[11px]"></i>
                                    </button>
                                </div>
                            </div>

                            <p v-if="recentSessions.length"
                                class="mt-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Recentes
                            </p>
                            <div v-for="s in recentSessions" :key="s.id"
                                class="group flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white dark:hover:bg-slate-900"
                                :class="s.id === sessionId ? 'bg-white ring-1 ring-indigo-200 dark:bg-slate-900 dark:ring-indigo-900/60' : ''">
                                <button type="button" @click="loadSession(s.id)" class="min-w-0 flex-1 text-left">
                                    <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {{ s.title || 'Conversa sem título' }}
                                    </p>
                                    <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ fromNow(s.updated_at)
                                        }}</p>
                                </button>
                                <div class="flex shrink-0 items-center gap-0.5">
                                    <button type="button" @click.stop="renameSessionRow(s)" title="Renomear"
                                        class="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                                        <i class="fa-solid fa-pen text-[11px]"></i>
                                    </button>
                                    <button type="button" @click.stop="toggleFavorite(s)" title="Favoritar"
                                        class="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-amber-100 hover:text-amber-500 dark:hover:bg-amber-950/40">
                                        <i class="fa-regular fa-star text-[11px]"></i>
                                    </button>
                                    <button type="button" @click.stop="deleteSession(s)" title="Excluir"
                                        class="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
                                        <i class="fa-regular fa-trash-can text-[11px]"></i>
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <div class="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <button type="button" @click="newConversation"
                        class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95">
                        <i class="fa-solid fa-plus text-xs"></i>
                        Nova conversa
                    </button>
                </div>
            </div>

            <!-- ─────────────── Conversa ─────────────── -->
            <template v-else>
                <!-- Mensagens -->
                <div ref="scrollEl" class="min-h-0 flex-1 overflow-y-auto">
                    <div class="mx-auto w-full max-w-3xl px-4 py-6">
                        <!-- Estado inicial -->
                        <div v-if="!messages.length"
                            class="flex min-h-[58vh] flex-col items-center justify-center text-center">
                            <div
                                class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                                <i class="fa-solid fa-graduation-cap text-2xl text-white"></i>
                            </div>
                            <h2 class="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                                Olá! Eu sou o Eme 👋
                            </h2>
                            <p class="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                Seu tutor de estudos. Recomendo trilhas, busco artigos e acompanho o seu
                                progresso — sempre com base no conteúdo real do Academy.
                            </p>
                            <div class="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                                <button v-for="s in suggestions" :key="s" type="button" @click="send(s)"
                                    class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-slate-800">
                                    <i class="fa-regular fa-comment-dots text-indigo-400"></i>
                                    {{ s }}
                                </button>
                            </div>
                        </div>

                        <!-- Conversa -->
                        <div v-else class="space-y-4">
                            <div v-for="(m, i) in messages" :key="i" class="flex"
                                :class="m.role === 'user' ? 'justify-end' : 'gap-2.5'">
                                <span v-if="m.role !== 'user'"
                                    class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                                    <i class="fa-solid fa-graduation-cap text-xs"></i>
                                </span>
                                <div class="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                                    :class="m.role === 'user'
                                        ? 'rounded-br-md bg-indigo-600 text-white'
                                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'">
                                    <p v-if="m.text" class="whitespace-pre-wrap break-words">{{ m.text }}<span
                                            v-if="isRevealing(m)" class="ate-caret"></span></p>
                                    <p v-else-if="m.role === 'assistant' && streaming"
                                        class="flex items-center gap-1 text-slate-400">
                                        <span class="ate-dot"></span>
                                        <span class="ate-dot" style="animation-delay:.15s"></span>
                                        <span class="ate-dot" style="animation-delay:.3s"></span>
                                    </p>

                                    <button v-if="m.action && actionLink(m.action)" type="button"
                                        @click="openAction(m.action)"
                                        class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500">
                                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                                        Abrir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Input -->
                <div class="shrink-0 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div class="mx-auto w-full max-w-3xl px-4 py-3">
                        <div v-if="error"
                            class="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                            {{ error }}
                        </div>
                        <div
                            class="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-1.5 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-indigo-700 dark:focus-within:ring-indigo-950/60">
                            <textarea ref="inputEl" v-model="draft" rows="1" :disabled="streaming"
                                placeholder="Pergunte sobre seus estudos..."
                                class="max-h-32 min-h-0 flex-1 resize-none border-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-white dark:placeholder:text-slate-500"
                                @keydown.enter.exact.prevent="send()" />
                            <button type="button" :disabled="streaming || typing || !draft.trim()" @click="send()"
                                aria-label="Enviar"
                                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition hover:opacity-95 active:scale-95 disabled:opacity-40">
                                <i class="fa-solid"
                                    :class="(streaming || typing) ? 'fa-spinner fa-spin' : 'fa-arrow-up'"></i>
                            </button>
                        </div>
                        <p class="mt-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500">
                            O Eme responde apenas com base no conteúdo real do Academy.
                        </p>
                    </div>
                </div>
            </template>
        </div>
    </Transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { useAcademyTutorStore } from '@/stores/Academy/academyTutorStore';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const tutor = useAcademyTutorStore();
const route = useRoute();
const router = useRouter();
// No Painel a Eme é acessada pelo campo grande — a bolha some lá.
const isPanelRoute = computed(() => route.name === 'AcademyPanel');

const draft = ref('');
const messages = ref([]);
const streaming = ref(false);
const typing = ref(false);
const error = ref('');
const sessionId = ref(null);
const scrollEl = ref(null);
const inputEl = ref(null);

// ── Histórico de conversas ───────────────────────────────────────────
const historyOpen = ref(false);
const sessions = ref([]);
const loadingSessions = ref(false);

const favoriteSessions = computed(() => sessions.value.filter((s) => s.is_favorited));
const recentSessions = computed(() => sessions.value.filter((s) => !s.is_favorited));

const suggestions = [
    'O que eu posso estudar aqui?',
    'O que devo estudar agora?',
    'Quais trilhas eu tenho?',
    'Qual é o meu nível e XP?',
];

function fromNow(d) {
    if (!d) return '';
    const m = dayjs(d);
    return m.isValid() ? m.fromNow() : '';
}

// ── Histórico local — mantém a conversa atual entre fechar/reabrir ───
function chatKey() {
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        return `academy:eme:chat:${u?.id || 'anon'}`;
    } catch {
        return 'academy:eme:chat:anon';
    }
}
function persist() {
    try {
        const payload = {
            sessionId: sessionId.value,
            messages: messages.value
                .slice(-50)
                .map((m) => ({ role: m.role, text: m._buf != null ? m._buf : m.text, action: m.action || null })),
        };
        localStorage.setItem(chatKey(), JSON.stringify(payload));
    } catch { /* storage indisponível — ignora */ }
}
function restore() {
    try {
        const raw = localStorage.getItem(chatKey());
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data?.messages)) {
            messages.value = data.messages.map((m) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                text: String(m.text || ''),
                action: m.action || null,
            }));
        }
        sessionId.value = data?.sessionId || null;
    } catch { /* ignora estado corrompido */ }
}

// ── Sessões (backend) ────────────────────────────────────────────────
async function fetchSessions() {
    loadingSessions.value = true;
    try {
        const data = await requestWithAuth('/academy-chat/sessions');
        sessions.value = Array.isArray(data?.sessions) ? data.sessions : [];
    } catch {
        sessions.value = [];
        error.value = 'Não foi possível carregar o histórico.';
    } finally {
        loadingSessions.value = false;
    }
}

function openHistory() {
    error.value = '';
    historyOpen.value = true;
    fetchSessions();
}

function newConversation() {
    historyOpen.value = false;
    resetChat();
}

// Converte a mensagem do backend para o formato do chat ({role, text, action}).
function mapServerMessage(m) {
    if (m.role === 'assistant' && m.response_type && m.response_type !== 'text') {
        try {
            const parsed = JSON.parse(m.content || '{}');
            return { role: 'assistant', text: String(parsed.text || ''), action: parsed.action || null };
        } catch {
            return { role: 'assistant', text: String(m.content || ''), action: null };
        }
    }
    return { role: m.role === 'user' ? 'user' : 'assistant', text: String(m.content || ''), action: null };
}

async function loadSession(id) {
    error.value = '';
    try {
        const data = await requestWithAuth(`/academy-chat/sessions/${id}/messages`);
        messages.value = (data?.messages || []).map(mapServerMessage);
        sessionId.value = id;
        historyOpen.value = false;
        persist();
        scrollDown();
    } catch {
        error.value = 'Não foi possível abrir esta conversa.';
    }
}

async function renameSession(id, title) {
    try {
        await requestWithAuth(`/academy-chat/sessions/${id}/title`, {
            method: 'PATCH',
            body: JSON.stringify({ title }),
        });
        const s = sessions.value.find((x) => x.id === id);
        if (s) s.title = title;
    } catch {
        error.value = 'Não foi possível renomear a conversa.';
    }
}
function renameSessionRow(s) {
    const next = window.prompt('Renomear conversa:', s.title || '');
    if (next == null) return;
    const title = next.trim();
    if (title) renameSession(s.id, title);
}

async function toggleFavorite(s) {
    try {
        const data = await requestWithAuth(`/academy-chat/sessions/${s.id}/favorite`, { method: 'PATCH' });
        s.is_favorited = !!data?.is_favorited;
    } catch {
        error.value = 'Não foi possível favoritar a conversa.';
    }
}

async function deleteSession(s) {
    if (!window.confirm('Excluir esta conversa do histórico?')) return;
    try {
        await requestWithAuth(`/academy-chat/sessions/${s.id}`, { method: 'DELETE' });
        sessions.value = sessions.value.filter((x) => x.id !== s.id);
        if (sessionId.value === s.id) {
            messages.value = [];
            sessionId.value = null;
            persist();
        }
    } catch {
        error.value = 'Não foi possível excluir a conversa.';
    }
}

function actionLink(action) {
    if (!action) return null;
    if (action.link) return action.link;
    if (action.result?.link) return action.result.link;
    return null;
}

// Navega dentro do app (sem recarregar) e fecha o chat.
function openAction(action) {
    const link = actionLink(action);
    if (!link) return;
    tutor.close();
    router.push(link).catch(() => { /* rota repetida — ignora */ });
}

function resetChat() {
    messages.value = [];
    sessionId.value = null;
    error.value = '';
    try { localStorage.removeItem(chatKey()); } catch { /* ignora */ }
    nextTick(() => inputEl.value?.focus());
}

async function scrollDown() {
    await nextTick();
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
}

// ── Efeito de escrita (typewriter) ───────────────────────────────────
let typingRAF = null;

function isRevealing(m) {
    return !!m && m._buf != null && m.text.length < m._buf.length;
}

function pumpTyping() {
    let active = false;
    for (const m of messages.value) {
        if (isRevealing(m)) {
            const backlog = m._buf.length - m.text.length;
            const step = Math.max(2, Math.ceil(backlog / 5));
            m.text = m._buf.slice(0, m.text.length + step);
            active = true;
        }
    }
    if (active) {
        scrollDown();
        typingRAF = requestAnimationFrame(pumpTyping);
    } else {
        typingRAF = null;
        if (!streaming.value) typing.value = false;
    }
}
function ensureTyping() {
    typing.value = true;
    if (typingRAF == null) typingRAF = requestAnimationFrame(pumpTyping);
}

async function send(preset) {
    const text = String(preset ?? draft.value).trim();
    if (!text || streaming.value || typing.value) return;

    historyOpen.value = false;
    draft.value = '';
    error.value = '';
    messages.value.push({ role: 'user', text });
    const assistantMsg = { role: 'assistant', text: '', action: null, _buf: '' };
    messages.value.push(assistantMsg);
    streaming.value = true;
    scrollDown();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/academy-chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message: text, session_id: sessionId.value }),
        });

        if (!res.ok || !res.body) {
            throw new Error('Não foi possível falar com o tutor agora.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE: eventos separados por \n\n, cada linha "data: {...}"
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
                const line = part.split('\n').find((l) => l.startsWith('data:'));
                if (!line) continue;
                let evt;
                try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
                handleEvent(evt, assistantMsg);
            }
        }
    } catch (e) {
        error.value = e?.message || 'Erro na conversa.';
        if (assistantMsg.text === '' && !assistantMsg._buf) messages.value.pop();
    } finally {
        streaming.value = false;
        scrollDown();
        persist();
    }
}

function handleEvent(evt, assistantMsg) {
    switch (evt.type) {
        case 'chunk':
            assistantMsg._buf = (assistantMsg._buf || '') + (evt.text || '');
            ensureTyping();
            break;
        case 'clear':
            assistantMsg._buf = '';
            assistantMsg.text = '';
            break;
        case 'replace':
            assistantMsg._buf = evt.text || '';
            if (assistantMsg.text.length > assistantMsg._buf.length) {
                assistantMsg.text = assistantMsg._buf;
            }
            ensureTyping();
            break;
        case 'action':
            assistantMsg.action = evt.action || null;
            break;
        case 'error':
            error.value = evt.message || 'Erro do tutor.';
            break;
        case 'done':
            if (evt.sessionId) sessionId.value = evt.sessionId;
            break;
    }
}

// Pergunta enfileirada por outra tela (ex.: campo do Painel): abre e envia.
watch(() => tutor.queued, (q) => {
    if (!q?.text) return;
    tutor.consumeQueued();
    send(q.text);
});

// Foca o campo ao abrir; ao fechar, finaliza o texto em digitação e sai do histórico.
watch(() => tutor.isOpen, (open) => {
    if (open) {
        nextTick(() => inputEl.value?.focus());
    } else {
        historyOpen.value = false;
        for (const m of messages.value) {
            if (m._buf != null) m.text = m._buf;
        }
    }
});

// Navegar pela barra lateral fecha o chat ("navegar e sair por lá").
watch(() => route.fullPath, () => {
    if (tutor.isOpen) tutor.close();
});

onMounted(restore);
</script>

<style scoped>
/* Chat: fade + leve subida */
.ate-screen-enter-active,
.ate-screen-leave-active {
    transition: opacity .22s ease, transform .24s cubic-bezier(.22, 1, .36, 1);
}

.ate-screen-enter-from,
.ate-screen-leave-to {
    opacity: 0;
    transform: translateY(12px);
}

/* Bolha flutuante: pop suave */
.ate-pop-enter-active,
.ate-pop-leave-active {
    transition: opacity .15s ease, transform .15s ease;
}

.ate-pop-enter-from,
.ate-pop-leave-to {
    opacity: 0;
    transform: scale(.6);
}

/* Indicador "digitando" — três pontinhos pulando em sequência */
.ate-dot {
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: currentColor;
    display: inline-block;
    animation: ate-bounce 1s infinite ease-in-out;
}

@keyframes ate-bounce {

    0%,
    80%,
    100% {
        opacity: .3;
        transform: translateY(0);
    }

    40% {
        opacity: 1;
        transform: translateY(-4px);
    }
}

/* Cursor do efeito de escrita */
.ate-caret {
    display: inline-block;
    width: 2px;
    height: 1em;
    margin-left: 1px;
    background: currentColor;
    vertical-align: text-bottom;
    animation: ate-blink 1s steps(2, start) infinite;
}

@keyframes ate-blink {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }
}
</style>
