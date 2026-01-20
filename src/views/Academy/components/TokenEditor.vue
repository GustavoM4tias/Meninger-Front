<template>
    <div class="space-y-5">
        <!-- Toggle Edit/Preview -->
        <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <button type="button" class="rounded-xl border px-4 py-2 text-sm transition"
                    :class="!isPreview
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'" @click="isPreview = false">
                    Editar
                </button>

                <button type="button" class="rounded-xl border px-4 py-2 text-sm transition"
                    :class="isPreview
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'" @click="isPreview = true">
                    Preview
                </button>
            </div>

            <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                tokens: <span class="select-none">@[TYPE:ref]</span>
            </div>
        </div>

        <!-- Toolbar -->
        <div v-if="!isPreview" class="flex flex-wrap gap-2 items-center">
            <button class="tool-btn" type="button" @click="wrapSelection('**', '**')" title="Negrito">
                <span class="font-semibold">B</span>
            </button>
            <button class="tool-btn" type="button" @click="wrapSelection('*', '*')" title="Itálico">
                <span class="italic">I</span>
            </button>
            <button class="tool-btn" type="button" @click="prefixLine('# ')" title="Título (H1)">H1</button>
            <button class="tool-btn" type="button" @click="prefixLine('## ')" title="Subtítulo (H2)">H2</button>
            <button class="tool-btn" type="button" @click="prefixLine('### ')" title="Subtítulo (H3)">H3</button>
            <button class="tool-btn" type="button" @click="prefixLine('- ')" title="Lista">• Lista</button>
            <button class="tool-btn" type="button" @click="prefixLine('> ')" title="Citação">❝</button>
            <button class="tool-btn" type="button" @click="wrapSelection('`', '`')" title="Código inline">{ "<>"
                    }</button>
            <button class="tool-btn" type="button" @click="insertLink()" title="Link markdown">🔗</button>

            <div class="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

            <button class="tool-btn" type="button" @click="openMenuAtCaret(false)" title="Inserir (@)">
                @ Inserir
            </button>
        </div>

        <!-- Editor / Preview -->
        <div class="relative" ref="editorWrapRef">
            <div class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                {{ isPreview ? 'Pré-visualização' : 'Conteúdo (markdown)' }}
            </div>

            <textarea v-if="!isPreview" ref="textAreaRef" v-model="contentLocal" :rows="rows"
                class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm leading-7 font-mono"
                :placeholder="placeholder" @keydown="onEditorKeyDown" @click="syncMenuPosition"
                @scroll="syncMenuPosition" @keyup="syncMenuPosition" />

            <div v-else
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 markdown text-sm text-slate-700 dark:text-slate-200 leading-7"
                v-html="previewHtml"></div>

            <!-- Menu @ -->
            <div v-if="showMenu && !isPreview"
                class="absolute z-[60] w-[460px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                :style="{ left: menuPos.x + 'px', top: menuPos.y + 'px' }">
                <div
                    class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white">Inserir</div>
                    <button class="text-slate-500 hover:text-slate-900 dark:hover:text-white" type="button"
                        @click="closeMenu">✕</button>
                </div>

                <div class="p-3 space-y-3">
                    <!-- Tabs -->
                    <div class="flex flex-wrap gap-2">
                        <button v-for="t in menuTabs" :key="t.key" type="button"
                            class="rounded-full px-3 py-1.5 text-xs border transition"
                            :class="activeTab === t.key
                                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'"
                            @click="activeTab = t.key; onTabOpen()">
                            {{ t.label }}
                        </button>
                    </div>

                    <!-- ARTICLE -->
                    <div v-if="activeTab === 'ARTICLE'" class="space-y-2">
                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Buscar artigo</div>
                            <input v-model="kbQ"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Nome do artigo..." />
                        </label>

                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div
                                class="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                                {{ kbLoading ? 'Carregando...' : `${(meta.kbArticlesSearch?.length || 0)} itens` }}
                            </div>

                            <div class="max-h-[260px] overflow-auto p-2 space-y-2">
                                <div v-if="kbLoading" class="p-3 text-sm text-slate-500 dark:text-slate-400">
                                    Carregando...</div>
                                <div v-else-if="!meta.kbArticlesSearch?.length"
                                    class="p-3 text-sm text-slate-500 dark:text-slate-400">
                                    Nenhum artigo encontrado.
                                </div>

                                <button v-else v-for="a in meta.kbArticlesSearch" :key="a.id" type="button"
                                    class="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    @click="insertArticle(a)">
                                    <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{
                                        a.title }}</div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                        id={{ a.id }} · {{ a.categorySlug || a.category_slug || '-' }}/{{ a.slug || '-'
                                        }}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- COMMUNITY -->
                    <div v-else-if="activeTab === 'COMMUNITY_TOPIC'" class="space-y-2">
                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Buscar tópico</div>
                            <input v-model="comQ"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Nome do tópico..." />
                        </label>

                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div
                                class="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                                {{ comLoading ? 'Carregando...' : `${(meta.communityTopicsSearch?.length || 0)} itens`
                                }}
                            </div>

                            <div class="max-h-[260px] overflow-auto p-2 space-y-2">
                                <div v-if="comLoading" class="p-3 text-sm text-slate-500 dark:text-slate-400">
                                    Carregando...</div>
                                <div v-else-if="!meta.communityTopicsSearch?.length"
                                    class="p-3 text-sm text-slate-500 dark:text-slate-400">
                                    Nenhum tópico encontrado.
                                </div>

                                <button v-else v-for="t in meta.communityTopicsSearch" :key="t.id" type="button"
                                    class="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    @click="insertTopic(t)">
                                    <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{
                                        t.title }}</div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">id={{
                                        t.id }} · {{ t.type || '-' }}</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- VIDEO -->
                    <div v-else-if="activeTab === 'VIDEO'" class="space-y-2">
                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título (opcional)</div>
                            <input v-model="draft.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Aula 1 - Conceitos" />
                        </label>

                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">URL do vídeo</div>
                            <input v-model="draft.url"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                                placeholder="https://..." />
                        </label>

                        <div class="flex justify-end gap-2 pt-1">
                            <button class="btn-secondary" type="button" @click="closeMenu">Cancelar</button>
                            <button class="btn-primary" type="button" @click="insertVideo">Inserir</button>
                        </div>
                    </div>

                    <!-- LINK -->
                    <div v-else-if="activeTab === 'LINK'" class="space-y-2">
                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título (opcional)</div>
                            <input v-model="draft.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Material complementar" />
                        </label>

                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">URL</div>
                            <input v-model="draft.url"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                                placeholder="https://..." />
                        </label>

                        <div class="flex justify-end gap-2 pt-1">
                            <button class="btn-secondary" type="button" @click="closeMenu">Cancelar</button>
                            <button class="btn-primary" type="button" @click="insertLinkBlock">Inserir</button>
                        </div>
                    </div>

                    <!-- QUIZ -->
                    <div v-else-if="activeTab === 'QUIZ'" class="space-y-2">
                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título do quiz</div>
                            <input v-model="quizDraft.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Quiz - Conceitos" />
                        </label>

                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">Perguntas</div>
                                <button class="text-sm underline text-slate-700 dark:text-slate-200" type="button"
                                    @click="addQuizQuestion">+ Pergunta</button>
                            </div>

                            <div v-if="!quizDraft.questions.length" class="text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma pergunta.</div>

                            <div v-for="(q, qi) in quizDraft.questions" :key="qi"
                                class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                                <div class="flex items-start justify-between gap-2">
                                    <input v-model="q.text"
                                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                        placeholder="Pergunta..." />
                                    <button class="text-slate-500 hover:text-rose-600" type="button"
                                        @click="removeQuizQuestion(qi)">✕</button>
                                </div>

                                <div class="space-y-2">
                                    <div class="flex items-center justify-between">
                                        <div class="text-xs text-slate-500 dark:text-slate-400">Alternativas (marque a
                                            correta)</div>
                                        <button class="text-xs underline text-slate-700 dark:text-slate-200"
                                            type="button" @click="addQuizOption(qi)">+ Alternativa</button>
                                    </div>

                                    <div v-for="(opt, oi) in q.options" :key="oi"
                                        class="grid grid-cols-12 gap-2 items-center">
                                        <div class="col-span-1 flex justify-center items-center">
                                            <label class="custom-radio-box">
                                                <input type="radio" :name="`qz-${qi}`" :value="oi"
                                                    v-model="q.correctIndex" />
                                                <span class="checkmark"></span>
                                            </label>
                                        </div>

                                        <div class="col-span-10">
                                            <input v-model="q.options[oi]"
                                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                                placeholder="Alternativa..." />
                                        </div>

                                        <div class="col-span-1 flex justify-center">
                                            <button class="text-slate-500 hover:text-rose-600" type="button"
                                                @click="removeQuizOption(qi, oi)">🗑</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 pt-1">
                            <button class="btn-secondary" type="button" @click="closeMenu">Cancelar</button>
                            <button class="btn-primary" type="button" @click="insertQuiz">Inserir</button>
                        </div>
                    </div>

                    <!-- TASK -->
                    <div v-else-if="activeTab === 'TASK'" class="space-y-2">
                        <label>
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título da checklist
                            </div>
                            <input v-model="taskDraft.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Checklist da etapa" />
                        </label>

                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">Tarefas</div>
                                <button class="text-sm underline text-slate-700 dark:text-slate-200" type="button"
                                    @click="addTaskLine">+ Tarefa</button>
                            </div>

                            <div v-if="!taskDraft.tasks.length" class="text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma tarefa.</div>

                            <div v-for="(t, ti) in taskDraft.tasks" :key="ti" class="flex items-start gap-2">
                                <input v-model="t.text"
                                    class="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                    placeholder="Descreva a tarefa..." />
                                <button class="text-slate-500 hover:text-rose-600" type="button"
                                    @click="removeTaskLine(ti)">✕</button>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 pt-1">
                            <button class="btn-secondary" type="button" @click="closeMenu">Cancelar</button>
                            <button class="btn-primary" type="button" @click="insertTaskWidget">Inserir</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, toRaw } from 'vue';
import { useAcademyAdminMetaStore } from '@/stores/Academy/academyAdminMetaStore';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import linkAttrs from 'markdown-it-link-attributes';

const props = defineProps({
    modelValue: { type: String, default: '' },         // markdown
    modelPayload: { type: [Object, String, null], default: null }, // payload
    rows: { type: Number, default: 14 },
    placeholder: { type: String, default: 'Escreva seu conteúdo aqui. Digite @ para inserir itens.' },
});
const emit = defineEmits(['update:modelValue', 'update:modelPayload']);

const meta = useAcademyAdminMetaStore();

const isPreview = ref(false);
const textAreaRef = ref(null);
const editorWrapRef = ref(null);

/* v-model proxies */
const contentLocal = computed({
    get: () => String(props.modelValue || ''),
    set: (v) => emit('update:modelValue', String(v ?? '')),
});

const payloadLocal = computed({
    get: () => {
        const p = props.modelPayload;
        if (!p) return { embeds: [], widgets: { quiz: {}, task: {} } };
        if (typeof p === 'string') {
            try { return JSON.parse(p); } catch { return { embeds: [], widgets: { quiz: {}, task: {} } }; }
        }
        if (typeof p === 'object') return p;
        return { embeds: [], widgets: { quiz: {}, task: {} } };
    },
    set: (v) => emit('update:modelPayload', v),
});

/* Markdown preview */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: true })
    .use(anchor)
    .use(linkAttrs, { attrs: { target: '_blank', rel: 'noopener noreferrer' } });

function escapeHtml(s) {
    return String(s || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function toEmbedUrl(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
        if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
        return url;
    } catch { return url; }
}

function renderEmbedsIntoHtml(html, payload) {
    const embeds = Array.isArray(payload?.embeds) ? payload.embeds : [];
    const widgets = payload?.widgets && typeof payload.widgets === 'object' ? payload.widgets : {};

    return html.replace(/@\[(ARTICLE|COMMUNITY_TOPIC|VIDEO|LINK|QUIZ|TASK):([a-zA-Z0-9_-]+)\]/g, (_, type, ref) => {
        if (type === 'ARTICLE') {
            const e = embeds.find((x) => x.type === 'ARTICLE' && String(x.ref) === String(ref));
            const title = escapeHtml(e?.title || `Artigo #${ref}`);
            const cs = String(e?.categorySlug || '').trim();
            const sl = String(e?.slug || '').trim();
            const href = (cs && sl) ? `/academy/kb/${escapeHtml(cs)}/${escapeHtml(sl)}` : '';
            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">ARTICLE</div>
          <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          ${href ? `<a class="mt-2 inline-block text-sm underline text-slate-700 dark:text-slate-200 break-all" target="_blank" rel="noopener noreferrer" href="${href}">${href}</a>` : ''}
        </div>
      `;
        }

        if (type === 'COMMUNITY_TOPIC') {
            const e = embeds.find((x) => x.type === 'COMMUNITY_TOPIC' && String(x.ref) === String(ref));
            const title = escapeHtml(e?.title || `Tópico #${ref}`);
            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">COMMUNITY_TOPIC</div>
          <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">id=${escapeHtml(ref)}</div>
        </div>
      `;
        }

        if (type === 'VIDEO') {
            const e = embeds.find((x) => x.type === 'VIDEO' && String(x.ref) === String(ref));
            const url = String(e?.url || '');
            const title = escapeHtml(e?.title || 'Vídeo');
            const embed = url ? toEmbedUrl(url) : '';
            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">VIDEO</div>
          <div class="text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          ${url ? `<div class="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">${escapeHtml(url)}</div>` : ''}
          ${embed ? `<iframe class="w-full aspect-video rounded-xl border border-slate-200 dark:border-slate-800" src="${escapeHtml(embed)}" allowfullscreen></iframe>` : ''}
        </div>
      `;
        }

        if (type === 'LINK') {
            const e = embeds.find((x) => x.type === 'LINK' && String(x.ref) === String(ref));
            const url = String(e?.url || '');
            const title = escapeHtml(e?.title || 'Link');
            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">LINK</div>
          <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          ${url ? `<a class="mt-2 inline-block text-sm underline text-slate-700 dark:text-slate-200 break-all" target="_blank" rel="noopener noreferrer" href="${escapeHtml(url)}">${escapeHtml(url)}</a>` : ''}
        </div>
      `;
        }

        if (type === 'QUIZ') {
            const qz = widgets?.quiz?.[ref];
            if (!qz) return `<span class="text-rose-600">[QUIZ inválido]</span>`;
            const title = escapeHtml(qz.title || 'Quiz');
            const qs = Array.isArray(qz.questions) ? qz.questions : [];
            const body = qs.map((q, qi) => {
                const opts = Array.isArray(q.options) ? q.options : [];
                const correct = Number.isFinite(q.correctIndex) ? q.correctIndex : 0;
                return `
          <div class="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div class="text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(q.text || `Pergunta ${qi + 1}`)}</div>
            <div class="mt-2 space-y-1">
              ${opts.map((o, oi) => `
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="radio" disabled ${oi === correct ? 'checked' : ''} />
                  <span>${escapeHtml(o)}</span>
                  ${oi === correct ? '<span class="ml-2 text-[11px] font-mono text-emerald-600">correta</span>' : ''}
                </label>
              `).join('')}
            </div>
          </div>
        `;
            }).join('');

            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">QUIZ</div>
          <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          ${body}
        </div>
      `;
        }

        if (type === 'TASK') {
            const tk = widgets?.task?.[ref];
            if (!tk) return `<span class="text-rose-600">[TASK inválido]</span>`;
            const title = escapeHtml(tk.title || 'Checklist');
            const tasks = Array.isArray(tk.tasks) ? tk.tasks : [];
            const body = tasks.map((t) => `
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" disabled />
          <span>${escapeHtml(t.text || '')}</span>
        </label>
      `).join('');

            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">TASK</div>
          <div class="text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          <div class="space-y-2">${body}</div>
        </div>
      `;
        }

        return _;
    });
}

const previewHtml = computed(() => {
    const raw = md.render(String(contentLocal.value || ''));
    return renderEmbedsIntoHtml(raw, payloadLocal.value);
});

/* normalize payload */
function normalizePayload(p) {
    const raw = toRaw(p) || {};
    const embedsRaw = Array.isArray(raw.embeds) ? raw.embeds : [];
    const widgetsRaw = raw.widgets && typeof raw.widgets === 'object' ? raw.widgets : {};

    const quizRaw = widgetsRaw.quiz && typeof widgetsRaw.quiz === 'object' ? widgetsRaw.quiz : {};
    const taskRaw = widgetsRaw.task && typeof widgetsRaw.task === 'object' ? widgetsRaw.task : {};

    const embeds = embedsRaw
        .map((e) => {
            const er = toRaw(e) || {};
            const type = String(er.type || '');
            const ref = String(er.ref || '');
            if (!type || !ref) return null;

            const out = { type, ref };
            if (er.title != null) out.title = String(er.title);
            if (er.url != null) out.url = String(er.url);

            if (type === 'ARTICLE') {
                if (er.categorySlug != null) out.categorySlug = String(er.categorySlug);
                if (er.slug != null) out.slug = String(er.slug);
            }

            return out;
        })
        .filter(Boolean);

    const quiz = {};
    for (const [k, v] of Object.entries(quizRaw)) {
        const vr = toRaw(v) || {};
        const title = String(vr.title || 'Quiz');
        const questions = Array.isArray(vr.questions) ? vr.questions : [];
        quiz[String(k)] = {
            title,
            questions: questions.map((q) => {
                const qr = toRaw(q) || {};
                return {
                    text: String(qr.text || ''),
                    options: (Array.isArray(qr.options) ? qr.options : []).map((o) => String(o || '')),
                    correctIndex: Number.isFinite(qr.correctIndex) ? Number(qr.correctIndex) : 0,
                };
            }),
        };
    }

    const task = {};
    for (const [k, v] of Object.entries(taskRaw)) {
        const vr = toRaw(v) || {};
        const title = String(vr.title || 'Checklist');
        const tasks = Array.isArray(vr.tasks) ? vr.tasks : [];
        task[String(k)] = {
            title,
            tasks: tasks.map((t) => {
                const tr = toRaw(t) || {};
                return { text: String(tr.text || '') };
            }),
        };
    }

    return { embeds, widgets: { quiz, task } };
}

/* menu state */
const showMenu = ref(false);
const menuPos = reactive({ x: 12, y: 12 });
const menuTabs = [
    { key: 'ARTICLE', label: 'Artigo' },
    { key: 'COMMUNITY_TOPIC', label: 'Tópico' },
    { key: 'VIDEO', label: 'Vídeo' },
    { key: 'LINK', label: 'Link' },
    { key: 'QUIZ', label: 'Quiz' },
    { key: 'TASK', label: 'Tarefas' },
];
const activeTab = ref('ARTICLE');

const kbQ = ref('');
const comQ = ref('');
const kbLoading = ref(false);
const comLoading = ref(false);

const draft = reactive({ title: '', url: '' });
const quizDraft = reactive({ title: '', questions: [] });
const taskDraft = reactive({ title: '', tasks: [] });

const atRange = reactive({ start: null, end: null });

function closeMenu() {
    showMenu.value = false;
    kbQ.value = '';
    comQ.value = '';
    draft.title = '';
    draft.url = '';
    quizDraft.title = '';
    quizDraft.questions = [];
    taskDraft.title = '';
    taskDraft.tasks = [];
    atRange.start = null;
    atRange.end = null;
    clearTimeout(kbTmr);
    clearTimeout(comTmr);
}

async function onTabOpen() {
    draft.title = '';
    draft.url = '';

    // ✅ se trocar pra ARTICLE/COMMUNITY_TOPIC, carrega lista
    if (showMenu.value) {
        await preloadActiveTab();
    }
}

function openMenuAtCaret(fromTypedAt) {
    showMenu.value = true;
    activeTab.value = 'ARTICLE';

    const ta = textAreaRef.value;
    if (ta) {
        const caret = ta.selectionStart ?? 0;

        if (fromTypedAt) {
            const s = Math.max(0, caret - 1);
            const val = String(contentLocal.value || '');
            if (val[s] === '@') {
                atRange.start = s;
                atRange.end = caret;
            } else {
                atRange.start = null;
                atRange.end = null;
            }
        } else {
            atRange.start = null;
            atRange.end = null;
        }
    }

    nextTick(async () => {
        syncMenuPosition();
        await preloadActiveTab(); // ✅
    });
}

function onEditorKeyDown(e) {
    if (e.key === '@') {
        nextTick(() => openMenuAtCaret(true));
        return;
    }
    if (e.key === 'Escape' && showMenu.value) {
        e.preventDefault();
        closeMenu();
        return;
    }
}

/* positioning helpers */
function replaceRange(text, start, end, replacement) {
    return text.substring(0, start) + replacement + text.substring(end);
}
function withTextArea(fn) {
    const ta = textAreaRef.value;
    if (!ta) return;
    fn(ta);
    nextTick(() => {
        ta.focus();
        syncMenuPosition();
    });
}

function getCaretCoordinates(textarea, position) {
    const rect = textarea.getBoundingClientRect();
    const div = document.createElement('div');
    const style = window.getComputedStyle(textarea);

    div.style.position = 'fixed';
    div.style.left = rect.left + 'px';
    div.style.top = rect.top + 'px';
    div.style.width = rect.width + 'px';
    div.style.height = rect.height + 'px';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'hidden';

    const propsToCopy = [
        'boxSizing',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch',
        'fontSize', 'lineHeight', 'fontFamily',
        'letterSpacing', 'textTransform', 'textIndent'
    ];
    propsToCopy.forEach((p) => (div.style[p] = style[p]));
    div.scrollTop = textarea.scrollTop;
    div.scrollLeft = textarea.scrollLeft;

    div.textContent = textarea.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = textarea.value.substring(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(div);

    return { left: spanRect.left, top: spanRect.top, height: spanRect.height };
}

function syncMenuPosition() {
    if (!showMenu.value) return;
    const ta = textAreaRef.value;
    const wrap = editorWrapRef.value;
    if (!ta || !wrap) return;

    const caret = ta.selectionStart ?? 0;
    const { left, top, height } = getCaretCoordinates(ta, caret);
    const wrapRect = wrap.getBoundingClientRect();

    const relX = left - wrapRect.left;
    const relY = (top + height + 8) - wrapRect.top;

    const pad = 8;
    const menuW = 460;
    const approxH = 340;

    const maxX = Math.max(pad, wrap.clientWidth - menuW - pad);
    const maxY = Math.max(pad, wrap.clientHeight - approxH - pad);

    menuPos.x = Math.min(Math.max(pad, relX), maxX);
    menuPos.y = Math.min(Math.max(pad, relY), maxY);
}

/* markdown helpers */
function wrapSelection(before, after) {
    withTextArea((ta) => {
        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? 0;
        const val = String(contentLocal.value || '');
        const selected = val.substring(start, end);
        contentLocal.value = replaceRange(val, start, end, `${before}${selected || ''}${after}`);
        const pos = start + before.length + (selected || '').length + after.length;
        ta.setSelectionRange(pos, pos);
    });
}

function prefixLine(prefix) {
    withTextArea((ta) => {
        const val = String(contentLocal.value || '');
        const start = ta.selectionStart ?? 0;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        contentLocal.value = replaceRange(val, lineStart, lineStart, prefix);
        const pos = start + prefix.length;
        ta.setSelectionRange(pos, pos);
    });
}

function insertLink() {
    withTextArea((ta) => {
        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? 0;
        const val = String(contentLocal.value || '');
        const selected = val.substring(start, end) || 'texto';
        const snippet = `[${selected}](https://)`;
        contentLocal.value = replaceRange(val, start, end, snippet);
        const cursor = start + snippet.length - 1;
        ta.setSelectionRange(cursor, cursor);
    });
}

async function fetchArticles(term = '') {
    kbLoading.value = true;
    try {
        await meta.searchKbArticles(String(term || ''));
    } finally {
        kbLoading.value = false;
    }
}

async function fetchTopics(term = '') {
    comLoading.value = true;
    try {
        await meta.searchCommunityTopics(String(term || ''));
    } finally {
        comLoading.value = false;
    }
}

async function preloadActiveTab() {
    // garante meta carregado (se existir no store)
    if (typeof meta.fetchMeta === 'function') {
        await meta.fetchMeta().catch(() => { });
    }

    if (activeTab.value === 'ARTICLE') {
        await fetchArticles(kbQ.value);
        return;
    }

    if (activeTab.value === 'COMMUNITY_TOPIC') {
        await fetchTopics(comQ.value);
        return;
    }
}

/* search */
let kbTmr = null;
watch(() => kbQ.value, (term) => {
    if (!showMenu.value || activeTab.value !== 'ARTICLE') return;
    clearTimeout(kbTmr);
    kbTmr = setTimeout(() => fetchArticles(term), 200);
});

let comTmr = null;
watch(() => comQ.value, (term) => {
    if (!showMenu.value || activeTab.value !== 'COMMUNITY_TOPIC') return;
    clearTimeout(comTmr);
    comTmr = setTimeout(() => fetchTopics(term), 200);
});

/* insert tokens */
function genRef(prefix) {
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

function ensurePayloadShape() {
    const p = payloadLocal.value || {};
    if (!Array.isArray(p.embeds)) p.embeds = [];
    if (!p.widgets || typeof p.widgets !== 'object') p.widgets = {};
    if (!p.widgets.quiz) p.widgets.quiz = {};
    if (!p.widgets.task) p.widgets.task = {};
    payloadLocal.value = p;
}

function insertAtCursorSmart(snippet) {
    withTextArea((ta) => {
        const val = String(contentLocal.value || '');
        const cursor = ta.selectionStart ?? 0;

        if (Number.isFinite(atRange.start) && Number.isFinite(atRange.end)) {
            contentLocal.value = replaceRange(val, atRange.start, atRange.end, snippet);
            const pos = atRange.start + snippet.length;
            ta.setSelectionRange(pos, pos);
            atRange.start = null;
            atRange.end = null;
            return;
        }

        if (cursor > 0 && val[cursor - 1] === '@') {
            contentLocal.value = replaceRange(val, cursor - 1, cursor, snippet);
            const pos = (cursor - 1) + snippet.length;
            ta.setSelectionRange(pos, pos);
            return;
        }

        contentLocal.value = replaceRange(val, cursor, cursor, snippet);
        const pos = cursor + snippet.length;
        ta.setSelectionRange(pos, pos);
    });
}

function insertArticle(a) {
    const id = Number(a?.id);
    if (!Number.isFinite(id) || id <= 0) return;

    ensurePayloadShape();

    const ref = String(id);
    const categorySlug = String(a.categorySlug || a.category_slug || '').trim();
    const slug = String(a.slug || '').trim();

    const embed = {
        type: 'ARTICLE',
        ref,
        title: String(a.title || `Artigo #${ref}`),
        categorySlug,
        slug,
    };

    const p = payloadLocal.value;
    const idx = p.embeds.findIndex((x) => x.type === 'ARTICLE' && String(x.ref) === ref);
    if (idx >= 0) p.embeds[idx] = embed;
    else p.embeds.push(embed);

    payloadLocal.value = normalizePayload(p);
    insertAtCursorSmart(`@[ARTICLE:${ref}]`);
    closeMenu();
}

function insertTopic(t) {
    const id = Number(t?.id);
    if (!Number.isFinite(id) || id <= 0) return;

    ensurePayloadShape();
    const ref = String(id);

    const embed = { type: 'COMMUNITY_TOPIC', ref, title: String(t.title || `Tópico #${ref}`) };

    const p = payloadLocal.value;
    const idx = p.embeds.findIndex((x) => x.type === 'COMMUNITY_TOPIC' && String(x.ref) === ref);
    if (idx >= 0) p.embeds[idx] = embed;
    else p.embeds.push(embed);

    payloadLocal.value = normalizePayload(p);
    insertAtCursorSmart(`@[COMMUNITY_TOPIC:${ref}]`);
    closeMenu();
}

function insertVideo() {
    const url = String(draft.url || '').trim();
    if (!url) return;

    ensurePayloadShape();
    const ref = genRef('v_');

    const p = payloadLocal.value;
    p.embeds.push({ type: 'VIDEO', ref, title: String(draft.title || 'Vídeo'), url });

    payloadLocal.value = normalizePayload(p);
    insertAtCursorSmart(`@[VIDEO:${ref}]`);
    closeMenu();
}

function insertLinkBlock() {
    const url = String(draft.url || '').trim();
    if (!url) return;

    ensurePayloadShape();
    const ref = genRef('l_');

    const p = payloadLocal.value;
    p.embeds.push({ type: 'LINK', ref, title: String(draft.title || 'Link'), url });

    payloadLocal.value = normalizePayload(p);
    insertAtCursorSmart(`@[LINK:${ref}]`);
    closeMenu();
}

/* quiz */
function addQuizQuestion() {
    quizDraft.questions.push({ text: '', options: ['', ''], correctIndex: 0 });
}
function removeQuizQuestion(qi) {
    quizDraft.questions.splice(qi, 1);
}
function addQuizOption(qi) {
    quizDraft.questions[qi].options.push('');
}
function removeQuizOption(qi, oi) {
    const q = quizDraft.questions[qi];
    q.options.splice(oi, 1);
    if (q.correctIndex >= q.options.length) q.correctIndex = Math.max(0, q.options.length - 1);
}
function insertQuiz() {
    const title = String(quizDraft.title || '').trim() || 'Quiz';
    const questions = Array.isArray(quizDraft.questions) ? quizDraft.questions : [];
    if (!questions.length) return;

    for (const q of questions) {
        if (!String(q.text || '').trim()) return;
        const opts = Array.isArray(q.options) ? q.options : [];
        if (opts.length < 2) return;
        if (opts.some((o) => !String(o || '').trim())) return;
        const ci = Number(q.correctIndex);
        if (!Number.isFinite(ci) || ci < 0 || ci >= opts.length) return;
    }

    ensurePayloadShape();
    const p = normalizePayload(payloadLocal.value);

    const ref = genRef('qz_');
    p.widgets.quiz[ref] = {
        title,
        questions: questions.map((q) => ({
            text: String(q.text || '').trim(),
            options: (q.options || []).map((o) => String(o || '').trim()),
            correctIndex: Number(q.correctIndex || 0),
        })),
    };

    payloadLocal.value = p;
    insertAtCursorSmart(`@[QUIZ:${ref}]`);
    closeMenu();
}

/* task */
function addTaskLine() {
    taskDraft.tasks.push({ text: '' });
}
function removeTaskLine(ti) {
    taskDraft.tasks.splice(ti, 1);
}
function insertTaskWidget() {
    const title = String(taskDraft.title || '').trim() || 'Checklist';
    const tasks = Array.isArray(taskDraft.tasks) ? taskDraft.tasks : [];
    if (!tasks.length) return;
    if (tasks.some((t) => !String(t.text || '').trim())) return;

    ensurePayloadShape();
    const p = normalizePayload(payloadLocal.value);

    const ref = genRef('tk_');
    p.widgets.task[ref] = {
        title,
        tasks: tasks.map((t) => ({ text: String(t.text || '').trim() })),
    };

    payloadLocal.value = p;
    insertAtCursorSmart(`@[TASK:${ref}]`);
    closeMenu();
}
</script>

<style scoped>
.custom-radio-box {
    display: block;
    position: relative;
    width: 24px;
    height: 24px;
    cursor: pointer;
    user-select: none;
}

.custom-radio-box input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
}

.checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 24px;
    width: 24px;
    background-color: #eee;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    transition: all .2s ease-in-out;
}

.custom-radio-box:hover input~.checkmark {
    background-color: #e2e8f0;
}

.custom-radio-box input:checked~.checkmark {
    background-color: #2196f3;
    border-color: #2196f3;
}

.checkmark:after {
    content: "";
    position: absolute;
    display: none;
}

.custom-radio-box input:checked~.checkmark:after {
    display: block;
}

.custom-radio-box .checkmark:after {
    left: 8px;
    top: 4px;
    width: 6px;
    height: 12px;
    border: solid white;
    border-width: 0 3px 3px 0;
    transform: rotate(45deg);
}

.tool-btn {
    @apply rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition;
}

.btn-secondary {
    @apply rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800;
}

.btn-primary {
    @apply rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90;
}

.markdown :deep(p) {
    margin: .75rem 0;
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
    margin: 1rem 0 .5rem;
    font-weight: 700;
}

.markdown :deep(ul),
.markdown :deep(ol) {
    padding-left: 1.25rem;
    margin: .75rem 0;
}

.markdown :deep(li) {
    margin: .25rem 0;
}

.markdown :deep(blockquote) {
    border-left: 3px solid rgba(148, 163, 184, .7);
    padding-left: .75rem;
    margin: .75rem 0;
    opacity: .95;
}

.markdown :deep(code) {
    padding: .15rem .35rem;
    border-radius: .5rem;
    background: rgba(148, 163, 184, .18);
}

.markdown :deep(pre) {
    padding: .75rem;
    border-radius: .75rem;
    overflow: auto;
    background: rgba(148, 163, 184, .14);
}
</style>
