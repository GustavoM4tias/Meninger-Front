<template>
    <div class="space-y-4">
        <!-- Header track -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ track?.title }}</h3>
            <p v-if="track?.description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ track.description }}
            </p>
        </div>

        <!-- Empty -->
        <div v-if="!items?.length"
            class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Sem itens para preview.
        </div>

        <!-- Finish -->
        <div v-else-if="isFinished"
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
            <div class="text-base font-semibold text-slate-900 dark:text-white">Trilha finalizada (preview)</div>
            <div class="text-sm text-slate-600 dark:text-slate-300">
                Você concluiu todos os itens obrigatórios.
            </div>

            <div class="pt-2">
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    @click="$emit('back')">
                    Voltar
                </button>
            </div>
        </div>

        <!-- Item -->
        <div v-else class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {{ currentIndex + 1 }} / {{ items.length }} · {{ currentItem.type || 'ITEM' }} · {{
                            currentItem.estimatedMinutes || 0 }}min ·
                        {{ currentItem.required ? 'Conta no progresso' : 'Opcional' }}
                    </div>

                    <div class="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        {{ currentItem.title }}
                    </div>

                    <div v-if="currentItem.payload?.meta?.subtitle"
                        class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {{ currentItem.payload.meta.subtitle }}
                    </div>
                </div>

                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 select-none">
                    <input type="checkbox" v-model="done[currentItem.id]" />
                    Concluído (preview)
                </label>
            </div>

            <!-- meta before -->
            <div v-if="currentItem.payload?.meta?.beforeText"
                class="mt-4 markdown text-sm text-slate-700 dark:text-slate-200 leading-7"
                v-html="renderMixedMarkdown(currentItem.payload.meta.beforeText, currentItem.payload)"></div>

            <!-- content main -->
            <div class="mt-4 markdown text-sm text-slate-700 dark:text-slate-200 leading-7"
                v-html="renderItemMain(currentItem)"></div>

            <!-- meta after -->
            <div v-if="currentItem.payload?.meta?.afterText"
                class="mt-4 markdown text-sm text-slate-700 dark:text-slate-200 leading-7"
                v-html="renderMixedMarkdown(currentItem.payload.meta.afterText, currentItem.payload)"></div>

            <!-- Footer nav -->
            <div
                class="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div class="text-xs text-slate-500 dark:text-slate-400">
                    Progresso (preview): <span class="font-mono">{{ progressPercent }}%</span>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="currentIndex === 0" @click="prev">
                        Anterior
                    </button>

                    <button
                        class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="!canGoNext" @click="next">
                        {{ currentIndex === items.length - 1 ? 'Finalizar' : 'Próximo' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import linkAttrs from 'markdown-it-link-attributes';

const props = defineProps({
    track: { type: Object, default: null },
    items: { type: Array, default: () => [] },
});
defineEmits(['back']);

const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    typographer: true,
})
    .use(anchor)
    .use(linkAttrs, { attrs: { target: '_blank', rel: 'noopener noreferrer' } });

const done = reactive({});
const currentIndex = reactive({ value: 0 });

watch(
    () => props.items,
    () => {
        currentIndex.value = 0;
        Object.keys(done).forEach((k) => delete done[k]);
    }
);

const requiredItems = computed(() => props.items.filter((i) => !!i.required));
const progressPercent = computed(() => {
    const req = requiredItems.value;
    if (!req.length) return 0;
    const completed = req.filter((i) => !!done[i.id]).length;
    return Math.round((completed / req.length) * 100);
});

const currentItem = computed(() => props.items[currentIndex.value] || null);

const isFinished = computed(() => {
    const req = requiredItems.value;
    if (!req.length) return false;
    return req.every((i) => !!done[i.id]);
});

const canGoNext = computed(() => {
    const it = currentItem.value;
    if (!it) return false;
    if (!it.required) return true;
    return !!done[it.id];
});

function prev() {
    currentIndex.value = Math.max(0, currentIndex.value - 1);
}
function next() {
    if (currentIndex.value >= props.items.length - 1) return;
    currentIndex.value = Math.min(props.items.length - 1, currentIndex.value + 1);
}

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
        if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
            return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
        }
        if (u.hostname.includes('youtu.be')) {
            return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
        }
        return url;
    } catch {
        return url;
    }
}

function renderEmbedsIntoHtml(html, payload) {
    const embeds = Array.isArray(payload?.embeds) ? payload.embeds : [];
    const widgets = payload?.widgets && typeof payload.widgets === 'object' ? payload.widgets : {};

    // token: @[type:ref]
    return html.replace(/@\[(ARTICLE|COMMUNITY_TOPIC|VIDEO|LINK|QUIZ|FORM|TASK):([a-zA-Z0-9_-]+)\]/g, (_, type, ref) => {
        if (type === 'ARTICLE') {
            const e = embeds.find((x) => x.type === 'ARTICLE' && String(x.ref) === String(ref));
            const title = escapeHtml(e?.title || `Artigo #${ref}`);
            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">ARTICLE</div>
          <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">id=${escapeHtml(ref)}</div>
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
            const body = qs
                .map((q, qi) => {
                    const opts = Array.isArray(q.options) ? q.options : [];
                    const correct = Number.isFinite(q.correctIndex) ? q.correctIndex : 0;
                    return `
            <div class="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(q.text || `Pergunta ${qi + 1}`)}</div>
              <div class="mt-2 space-y-1">
                ${opts
                            .map((o, oi) => `
                    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input type="radio" disabled ${oi === correct ? 'checked' : ''} />
                      <span>${escapeHtml(o)}</span>
                      ${oi === correct ? '<span class="ml-2 text-[11px] font-mono text-emerald-600">correta</span>' : ''}
                    </label>
                  `)
                            .join('')}
              </div>
            </div>
          `;
                })
                .join('');

            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">QUIZ</div>
          <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
          ${body}
        </div>
      `;
        }

        if (type === 'FORM') {
            const fm = widgets?.form?.[ref];
            if (!fm) return `<span class="text-rose-600">[FORM inválido]</span>`;
            const title = escapeHtml(fm.title || 'Formulário');
            const fields = Array.isArray(fm.fields) ? fm.fields : [];
            const body = fields
                .map((f) => `
          <div class="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div class="text-sm font-medium text-slate-900 dark:text-white">${escapeHtml(f.label || 'Campo')}</div>
            <input class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" disabled />
          </div>
        `)
                .join('');

            return `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">FORM</div>
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
            const body = tasks
                .map((t) => `
          <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" disabled />
            <span>${escapeHtml(t.text || '')}</span>
          </label>
        `)
                .join('');

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

function renderMixedMarkdown(src, payload) {
    const rawHtml = md.render(String(src || ''));
    return renderEmbedsIntoHtml(rawHtml, payload);
}

function renderItemMain(item) {
    // padrão: se vier `content` (markdown), renderiza com embeds
    const base = String(item?.content || '');
    const rawHtml = md.render(base);

    // se item antigo for VIDEO/ARTICLE/COMMUNITY (sem tokens), também renderiza bloco básico
    const payload = item?.payload || {};

    let html = rawHtml;
    html = renderEmbedsIntoHtml(html, payload);

    // fallback para itens antigos de tipos específicos
    if (!base.trim()) {
        if (item?.type === 'VIDEO' && payload?.url) {
            const embed = toEmbedUrl(payload.url);
            html = `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">VIDEO</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">${escapeHtml(payload.url)}</div>
          <iframe class="w-full aspect-video rounded-xl border border-slate-200 dark:border-slate-800" src="${escapeHtml(embed)}" allowfullscreen></iframe>
        </div>
      `;
        } else if (item?.type === 'ARTICLE' && payload?.articleId) {
            html = `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">ARTICLE</div>
          <div class="mt-1 text-sm text-slate-700 dark:text-slate-200">Artigo id: <span class="font-mono">${escapeHtml(payload.articleId)}</span></div>
        </div>
      `;
        } else if (item?.type === 'COMMUNITY_TOPIC' && payload?.topicId) {
            html = `
        <div class="not-prose rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">COMMUNITY_TOPIC</div>
          <div class="mt-1 text-sm text-slate-700 dark:text-slate-200">Tópico id: <span class="font-mono">${escapeHtml(payload.topicId)}</span></div>
        </div>
      `;
        }
    }

    return html;
}
</script>

<style scoped>
.markdown :deep(p) {
    margin: 0.75rem 0;
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
    margin: 1rem 0 0.5rem;
    font-weight: 700;
}

.markdown :deep(ul),
.markdown :deep(ol) {
    padding-left: 1.25rem;
    margin: 0.75rem 0;
}

.markdown :deep(li) {
    margin: 0.25rem 0;
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
