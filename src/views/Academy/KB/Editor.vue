<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader :title="headerTitle" subtitle="KB • criar e editar artigos"
            :backTo="{ name: 'AcademyKB' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Artigos', to: { name: 'AcademyKB' } },
                { label: isEdit ? 'Editar' : 'Novo' }
            ]">
            <template #actions>
                <div class="flex flex-wrap items-center gap-2">
                    <!-- Status do auto-save -->
                    <div class="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium"
                        :class="statusPill.cls" :title="statusPill.tooltip">
                        <i :class="statusPill.icon"></i>
                        <span>{{ statusPill.label }}</span>
                    </div>

                    <button v-if="articleId" type="button" @click="versionsOpen = true"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                        <i class="fa-solid fa-clock-rotate-left text-xs"></i>
                        Histórico
                    </button>

                    <button v-if="isAdmin" type="button" @click="aiOpen = true"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:from-violet-100 hover:to-indigo-100 dark:border-violet-900/60 dark:from-violet-950/40 dark:to-indigo-950/40 dark:text-violet-300 dark:hover:from-violet-950/60 dark:hover:to-indigo-950/60">
                        <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                        Gerar com IA
                    </button>

                    <button type="button" :disabled="!canSave || saving" @click="saveAndCreateAnother"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-40 dark:border-indigo-900/60 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40">
                        <i class="fa-solid fa-plus text-xs"></i>
                        Salvar e criar outro
                    </button>

                    <button type="button" :disabled="!articleId || saving" @click="togglePublish"
                        class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-40">
                        <i class="fa-solid text-xs" :class="isPublished ? 'fa-eye-slash' : 'fa-paper-plane'"></i>
                        {{ isPublished ? 'Despublicar' : 'Publicar' }}
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="admin.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ admin.error }}
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- ─────────────── Dados + Estrutura + Validação ─────────────── -->
            <aside class="space-y-5 lg:col-span-4">
                <!-- Dados -->
                <section
                    class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-file-pen text-indigo-500"></i>
                            Dados
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Título e categoria — o resto é automático.
                        </p>
                    </div>

                    <div class="space-y-4 p-5">
                        <div>
                            <label
                                class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Título
                            </label>
                            <input ref="titleInputEl" v-model="title" type="text"
                                placeholder="Ex: Fluxo comercial do Gestor"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                        </div>

                        <div class="relative">
                            <label
                                class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Categoria
                            </label>
                            <div class="relative mt-1.5">
                                <input v-model="categorySlug" type="text" @focus="categoryFocused = true"
                                    @blur="onCategoryBlur" placeholder="Ex: processos-comerciais"
                                    class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                                <span v-if="categorySlug && !isExistingCategory"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    nova
                                </span>
                            </div>

                            <Transition name="ate-pop">
                                <div v-if="categoryFocused && categoryMatches.length"
                                    class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                    <button v-for="c in categoryMatches" :key="c.slug" type="button"
                                        @mousedown.prevent="pickCategory(c)"
                                        class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                                        <span class="flex items-center gap-2">
                                            <i class="fa-regular fa-folder text-xs text-slate-400"></i>
                                            <span class="text-slate-800 dark:text-slate-200">{{ c.name }}</span>
                                        </span>
                                        <span class="font-mono text-[10px] text-slate-400">{{ c.slug }}</span>
                                    </button>
                                </div>
                            </Transition>

                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                                Digite para buscar uma existente, ou crie nova em kebab-case.
                            </p>
                        </div>

                        <div class="relative">
                            <label
                                class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Subcategoria <span class="font-normal normal-case text-slate-400">(opcional)</span>
                            </label>
                            <div class="relative mt-1.5">
                                <input v-model="subcategorySlug" type="text" list="kb-subcats" placeholder="Ex: cartorio"
                                    class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                                <datalist id="kb-subcats">
                                    <option v-for="s in subcategorySuggestions" :key="s.slug" :value="s.slug">{{ s.name }}</option>
                                </datalist>
                            </div>
                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                                2º nível dentro da categoria (kebab-case). Ex.: Comercial › Cartório.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Visibilidade (públicos) -->
                <AudienceSelector v-model="audiences" />

                <!-- Quem pode editar (além do autor + admin) -->
                <EditorsSelector v-model="editorUserIds" :seed="editorSeed" />

                <!-- Estrutura (outline) -->
                <section
                    class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-list-tree text-indigo-500"></i>
                            Estrutura
                        </h2>
                        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Resumo dos títulos do artigo.
                        </p>
                    </div>
                    <div class="p-3">
                        <ul v-if="outline.length" class="space-y-0.5">
                            <li v-for="(o, i) in outline" :key="i"
                                class="truncate rounded-md px-2 py-1 text-sm"
                                :class="[
                                    o.level === 1 ? 'pl-2 font-semibold text-slate-900 dark:text-white' : '',
                                    o.level === 2 ? 'pl-5 text-slate-700 dark:text-slate-300' : '',
                                    o.level === 3 ? 'pl-8 text-xs text-slate-500 dark:text-slate-400' : ''
                                ]">
                                <span class="mr-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                    {{ '#'.repeat(o.level) }}
                                </span>
                                {{ o.text }}
                            </li>
                        </ul>
                        <p v-else class="px-2 py-3 text-xs text-slate-400 dark:text-slate-500">
                            Adicione títulos (## Seção) para organizar.
                        </p>
                    </div>
                </section>

                <!-- Validação ("testes") -->
                <section
                    class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-shield-halved text-indigo-500"></i>
                            Validação
                        </h2>
                        <span class="text-xs font-semibold"
                            :class="validationScore.passed === validationScore.total
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'">
                            {{ validationScore.passed }}/{{ validationScore.total }}
                        </span>
                    </div>
                    <ul class="space-y-1 p-3 text-xs">
                        <li v-for="c in validation" :key="c.label"
                            class="flex items-start gap-2 rounded-md px-2 py-1"
                            :class="c.pass ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'">
                            <i class="fa-solid mt-0.5 shrink-0"
                                :class="c.pass ? 'fa-circle-check text-emerald-500' : 'fa-circle text-slate-300 dark:text-slate-600'"></i>
                            <span class="flex-1">
                                {{ c.label }}
                                <span v-if="c.warn" class="ml-1 text-amber-600 dark:text-amber-400">
                                    — {{ c.warn }}
                                </span>
                            </span>
                        </li>
                    </ul>
                </section>

                <!-- Atalhos -->
                <section
                    class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                    <span
                        class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        <i class="fa-solid fa-keyboard"></i> Atalhos
                    </span>
                    <ul class="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <li class="flex items-center justify-between gap-3">
                            <span>Salvar</span>
                            <span><kbd class="kb-key">{{ modKeyLabel }}</kbd><kbd class="kb-key">S</kbd></span>
                        </li>
                        <li class="flex items-center justify-between gap-3">
                            <span>Salvar e criar outro</span>
                            <span><kbd class="kb-key">{{ modKeyLabel }}</kbd><kbd class="kb-key">Enter</kbd></span>
                        </li>
                        <li class="text-[11px] text-slate-500 dark:text-slate-400">
                            Auto-save a cada 2s enquanto você edita.
                        </li>
                    </ul>
                </section>
            </aside>

            <!-- ─────────────── Editor + Templates + Preview ─────────────── -->
            <section class="space-y-3 lg:col-span-8">
                <!-- Templates -->
                <div
                    class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="mb-2 flex items-center justify-between px-2">
                        <span
                            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <i class="fa-solid fa-shapes text-violet-500"></i> Comece com um modelo
                        </span>
                        <span v-if="body && body.trim()"
                            class="text-[11px] text-slate-400 dark:text-slate-500">
                            Aplicar substitui o conteúdo
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <button v-for="t in TEMPLATES" :key="t.key" type="button" @click="applyTemplate(t)"
                            class="group flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                            <span class="flex h-7 w-7 items-center justify-center rounded-lg" :class="t.tint">
                                <i class="fa-solid" :class="t.icon"></i>
                            </span>
                            <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">{{ t.label }}</span>
                            <span class="line-clamp-2 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                                {{ t.desc }}
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Editor -->
                <section
                    class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div
                        class="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                        <div class="flex items-center gap-1">
                            <button type="button" @click="previewMode = false"
                                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                                :class="!previewMode
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'">
                                <i class="fa-solid fa-pen-nib text-xs"></i>
                                Editar
                            </button>
                            <button type="button" @click="previewMode = true"
                                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                                :class="previewMode
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'">
                                <i class="fa-solid fa-eye text-xs"></i>
                                Pré-visualizar
                            </button>
                        </div>
                        <span class="text-xs text-slate-400 dark:text-slate-500">
                            Markdown · embeds com
                            <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">@</code>
                        </span>
                    </div>
                    <div class="p-5">
                        <TokenEditor v-if="!previewMode" v-model="body" v-model:modelPayload="payload" :rows="20"
                            placeholder="# Objetivo&#10;&#10;## Pré-requisitos&#10;- ...&#10;&#10;## Passo a passo&#10;1) ...&#10;" />
                        <div v-else class="min-h-[400px]">
                            <div v-if="body && body.trim()" class="prose prose-slate max-w-none dark:prose-invert">
                                <TokenRenderer :content="body || ''" :payload="payload" item-type="" item-key="" />
                            </div>
                            <div v-else
                                class="flex min-h-[400px] flex-col items-center justify-center gap-2 text-center">
                                <i class="fa-regular fa-eye text-3xl text-slate-300 dark:text-slate-700"></i>
                                <p class="text-sm text-slate-500 dark:text-slate-400">
                                    Comece a escrever para ver a pré-visualização.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </section>
        </div>

        <!-- Histórico de versões (S2.4) -->
        <ArticleVersionsModal v-model:open="versionsOpen" :article-id="articleId" @restored="onVersionRestored" />

        <!-- Modal: Gerar com IA (admin) -->
        <AiArticleModal v-model:open="aiOpen" :categories="kb.categories" :default-category-slug="categorySlug"
            @apply="onAiApply" />
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import AudienceSelector from '@/views/Academy/components/AudienceSelector.vue';
import EditorsSelector from '@/views/Academy/components/EditorsSelector.vue';
import TokenEditor from '@/views/Academy/components/TokenEditor.vue';
import TokenRenderer from '@/views/Academy/components/TokenRenderer.vue';
import ArticleVersionsModal from '@/views/Academy/KB/ArticleVersionsModal.vue';
import AiArticleModal from '@/views/Academy/KB/AiArticleModal.vue';

import { useAcademyKbAdminStore } from '@/stores/Academy/academyKbAdminStore';
import { useAcademyKbStore } from '@/stores/Academy/academyKbStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const route = useRoute();
const router = useRouter();
const admin = useAcademyKbAdminStore();
const kb = useAcademyKbStore();
const auth = useAuthStore();

const articleId = ref(route.params.id ? Number(route.params.id) : null);
const isEdit = computed(() => !!articleId.value);
const isAdmin = computed(() => String(auth.user?.role || '').toLowerCase() === 'admin');

const title = ref('');
const categorySlug = ref('');
const body = ref('');
const payload = ref({ embeds: [], widgets: { quiz: {}, task: {} } });
// audiences = set canônico da classe de visibilidade (modelo de 4 classes:
// Interno | Externo | Ambos | Somente admin). Artigo novo nasce INTERNO —
// padrão SEGURO: conteúdo interno nunca vaza por esquecimento.
const DEFAULT_AUDIENCES = ['INTERNAL', 'GESTOR'];
const audiences = ref(DEFAULT_AUDIENCES.slice());
// Editores adicionais (além do autor + admin). Array de ids; seed = objetos.
const editorUserIds = ref([]);
const editorSeed = ref([]);

const titleInputEl = ref(null);
const versionsOpen = ref(false);
const aiOpen = ref(false);
const previewMode = ref(false);

// ── Categoria (combobox) ─────────────────────────────────────────────
const categoryFocused = ref(false);
const categoryMatches = computed(() => {
    const q = String(categorySlug.value || '').toLowerCase().trim();
    const list = Array.isArray(kb.categories) ? kb.categories : [];
    if (!q) return list.slice(0, 6);
    return list.filter((c) =>
        String(c.slug || '').toLowerCase().includes(q) ||
        String(c.name || '').toLowerCase().includes(q)
    ).slice(0, 6);
});
const isExistingCategory = computed(() => {
    const slug = String(categorySlug.value || '').trim();
    if (!slug) return false;
    return (kb.categories || []).some((c) => c.slug === slug);
});
function pickCategory(c) {
    categorySlug.value = c.slug;
    categoryFocused.value = false;
}
function onCategoryBlur() {
    setTimeout(() => { categoryFocused.value = false; }, 100);
}

// ── Subcategoria (2º nível, opcional) ────────────────────────────────
const subcategorySlug = ref('');
// Sugestões = subcategorias já existentes na categoria atual (datalist).
const subcategorySuggestions = computed(() => {
    const cat = (kb.categories || []).find((c) => c.slug === String(categorySlug.value || '').trim());
    return Array.isArray(cat?.subcategories) ? cat.subcategories : [];
});

// ── Templates (modelos prontos) ──────────────────────────────────────
const TEMPLATES = [
    {
        key: 'procedimento', label: 'Procedimento padrão', icon: 'fa-list-check',
        tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300',
        desc: 'Objetivo, pré-requisitos, passos, validação e erros.',
        body: `# Objetivo

Descreva o que este procedimento entrega e quando deve ser usado.

## Pré-requisitos

- Item 1
- Item 2

## Passo a passo

1. Faça X.
2. Faça Y.
3. Faça Z.

## Validação

Como confirmar que deu certo.

## Erros comuns

- **Erro X:** como resolver.
- **Erro Y:** como resolver.
`,
    },
    {
        key: 'tutorial', label: 'Tutorial', icon: 'fa-graduation-cap',
        tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
        desc: 'Cenário, passos detalhados e resultado esperado.',
        body: `# Introdução

Contexto da tarefa e quem deve usar este tutorial.

## Cenário

Situação concreta que dispara este tutorial.

## Passos

1. **Passo 1:** descrição detalhada.
2. **Passo 2:** descrição detalhada.
3. **Passo 3:** descrição detalhada.

## Resultado esperado

O que deve estar pronto ou verdadeiro ao final.
`,
    },
    {
        key: 'faq', label: 'FAQ', icon: 'fa-circle-question',
        tint: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
        desc: 'Perguntas e respostas para dúvidas recorrentes.',
        body: `# Perguntas frequentes

## Pergunta 1?

Resposta breve e direta.

## Pergunta 2?

Resposta breve e direta.

## Pergunta 3?

Resposta breve e direta.
`,
    },
    {
        key: 'checklist', label: 'Checklist', icon: 'fa-square-check',
        tint: 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300',
        desc: 'Lista de verificação para tarefas repetitivas.',
        body: `# Checklist

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3
- [ ] Item 4

> Marque cada item conforme for concluindo.
`,
    },
];

function applyTemplate(t) {
    const has = !!(body.value && body.value.trim());
    if (has && !window.confirm('Substituir o conteúdo atual pelo modelo "' + t.label + '"?')) return;
    body.value = t.body;
}

// ── Auto-save ────────────────────────────────────────────────────────
const loaded = ref(false);
const saving = ref(false);
const dirty = ref(false);
const savingError = ref(false);
const lastSavedAt = ref(null);

const canSave = computed(() =>
    !!(title.value.trim() && categorySlug.value.trim() && audiences.value.length > 0)
);

let saveTimer = null;
let saveToken = 0;

function scheduleAutoSave() {
    if (!canSave.value) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save({ auto: true }), 2000);
}

watch([title, categorySlug, subcategorySlug, body, payload, audiences, editorUserIds], () => {
    if (!loaded.value) return;
    dirty.value = true;
    savingError.value = false;
    scheduleAutoSave();
}, { deep: true });

async function save({ auto = false } = {}) {
    if (!canSave.value) return;
    clearTimeout(saveTimer);

    saving.value = true;
    savingError.value = false;
    const token = ++saveToken;

    try {
        const wasNewCategory = !isExistingCategory.value;

        if (!articleId.value) {
            const created = await admin.createArticle({
                title: title.value.trim(),
                categorySlug: categorySlug.value.trim(),
                subcategorySlug: subcategorySlug.value.trim(),
                body: body.value,
                payload: payload.value,
                audiences: audiences.value.slice(),
                editorUserIds: editorUserIds.value.slice(),
            });
            if (token !== saveToken) return;
            articleId.value = created?.id || null;
            admin.lastSaved = created || null;
        } else {
            const updated = await admin.updateArticle(articleId.value, {
                title: title.value.trim(),
                categorySlug: categorySlug.value.trim(),
                subcategorySlug: subcategorySlug.value.trim(),
                body: body.value,
                payload: payload.value,
                audiences: audiences.value.slice(),
                editorUserIds: editorUserIds.value.slice(),
            });
            if (token !== saveToken) return;
            admin.lastSaved = updated;
        }

        lastSavedAt.value = Date.now();
        dirty.value = false;

        if (wasNewCategory) {
            kb.fetchCategories().catch(() => { });
        }
    } catch (e) {
        savingError.value = true;
        if (!auto) console.error('[KB Editor] save error', e);
    } finally {
        saving.value = false;
    }
}

async function saveAndCreateAnother() {
    if (!canSave.value) return;
    await save();
    if (savingError.value) return;

    const keptCategory = categorySlug.value;
    const keptSubcategory = subcategorySlug.value;
    const keptAudiences = audiences.value.slice();
    articleId.value = null;
    title.value = '';
    body.value = '';
    payload.value = { embeds: [], widgets: { quiz: {}, task: {} } };
    categorySlug.value = keptCategory;
    subcategorySlug.value = keptSubcategory;
    audiences.value = keptAudiences;
    editorUserIds.value = [];
    editorSeed.value = [];
    admin.lastSaved = null;
    lastSavedAt.value = null;
    dirty.value = false;
    previewMode.value = false;

    if (route.name === 'AcademyKBEditorEdit') {
        router.replace({ name: 'AcademyKBEditor' });
    }

    await nextTick();
    titleInputEl.value?.focus();
}

async function togglePublish() {
    if (!articleId.value) return;
    if (dirty.value) await save();
    const next = !isPublished.value;
    const r = await admin.setPublish(articleId.value, next);
    admin.lastSaved = r;
}

// ── IA ───────────────────────────────────────────────────────────────
function onAiApply({ title: aiTitle, body: aiBody, categorySlug: aiCat }) {
    loaded.value = false; // suprime auto-save no momento da injeção
    if (aiTitle) title.value = aiTitle;
    if (aiBody) body.value = aiBody;
    if (aiCat) categorySlug.value = aiCat;
    payload.value = { embeds: [], widgets: { quiz: {}, task: {} } };
    nextTick(() => {
        loaded.value = true;
        dirty.value = true;
        scheduleAutoSave();
    });
}

// ── Outline (estrutura do artigo) ────────────────────────────────────
const outline = computed(() => {
    const lines = String(body.value || '').split('\n');
    const items = [];
    for (const line of lines) {
        const m = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
        if (m) items.push({ level: m[1].length, text: m[2].trim() });
    }
    return items;
});

// ── Validação ("testes" do conteúdo) ─────────────────────────────────
const validation = computed(() => {
    const b = String(body.value || '');
    const headings = (b.match(/^##\s+/gm) || []).length;
    const toConfirm = (b.match(/\[\s*!\s*confirmar\s*\]/gi) || []).length;

    return [
        { label: 'Título com pelo menos 5 caracteres', pass: title.value.trim().length >= 5 },
        { label: 'Categoria definida', pass: categorySlug.value.trim().length > 0 },
        { label: 'Corpo com pelo menos 100 caracteres', pass: b.trim().length >= 100 },
        { label: 'Pelo menos 2 seções (##)', pass: headings >= 2 },
        {
            label: 'Sem marcações pendentes', pass: toConfirm === 0,
            warn: toConfirm > 0 ? `${toConfirm} "[ ! confirmar ]"` : '',
        },
    ];
});
const validationScore = computed(() => {
    const passed = validation.value.filter((c) => c.pass).length;
    return { passed, total: validation.value.length };
});

// ── Pílula de status ─────────────────────────────────────────────────
const now = ref(Date.now());
let nowInterval = null;

const savedAgo = computed(() => {
    if (!lastSavedAt.value) return '';
    const sec = Math.max(0, Math.floor((now.value - lastSavedAt.value) / 1000));
    if (sec < 5) return 'agora';
    if (sec < 60) return `há ${sec}s`;
    if (sec < 3600) return `há ${Math.floor(sec / 60)}min`;
    return `há ${Math.floor(sec / 3600)}h`;
});

const statusPill = computed(() => {
    if (savingError.value) {
        return {
            label: 'Erro ao salvar',
            icon: 'fa-solid fa-circle-exclamation',
            cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
            tooltip: 'Tente novamente — confira a conexão.',
        };
    }
    if (saving.value) {
        return {
            label: 'Salvando…',
            icon: 'fa-solid fa-spinner fa-spin',
            cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
            tooltip: '',
        };
    }
    if (dirty.value) {
        return {
            label: 'Alterações pendentes',
            icon: 'fa-solid fa-circle',
            cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
            tooltip: canSave.value ? 'Será salvo em instantes.' : 'Preencha título e categoria para salvar.',
        };
    }
    if (lastSavedAt.value) {
        return {
            label: `Salvo ${savedAgo.value}`,
            icon: 'fa-solid fa-check',
            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
            tooltip: '',
        };
    }
    return {
        label: isPublished.value ? 'Publicado' : 'Rascunho',
        icon: 'fa-regular fa-circle',
        cls: isPublished.value
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        tooltip: 'Comece a escrever — salvamos sozinho.',
    };
});

const headerTitle = computed(() => (isEdit.value ? 'Editar artigo' : 'Novo artigo'));
const isPublished = computed(() => admin.lastSaved?.status === 'PUBLISHED');

// ── Atalhos de teclado ───────────────────────────────────────────────
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
const modKeyLabel = isMac ? '⌘' : 'Ctrl';

function onKeydown(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = String(e.key || '').toLowerCase();
    if (k === 's') {
        e.preventDefault();
        save();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        saveAndCreateAnother();
    }
}

// ── Versões: ao restaurar, recarrega o conteúdo no editor ────────────
function onVersionRestored(article) {
    if (!article) return;
    loaded.value = false;
    title.value = article.title || title.value;
    categorySlug.value = article.categorySlug || categorySlug.value;
    subcategorySlug.value = article.subcategorySlug || subcategorySlug.value;
    body.value = article.body || '';
    payload.value = article.payload && typeof article.payload === 'object'
        ? article.payload
        : { embeds: [], widgets: { quiz: {}, task: {} } };
    admin.lastSaved = article;
    lastSavedAt.value = Date.now();
    dirty.value = false;
    nextTick(() => { loaded.value = true; });
}

// ── Mount / unmount ──────────────────────────────────────────────────
onMounted(async () => {
    window.addEventListener('keydown', onKeydown);
    nowInterval = setInterval(() => { now.value = Date.now(); }, 5000);

    await kb.fetchCategories();

    if (articleId.value) {
        const a = await admin.fetchById(articleId.value);
        if (a) {
            title.value = a.title || '';
            categorySlug.value = a.categorySlug || '';
            subcategorySlug.value = a.subcategorySlug || '';
            body.value = a.body || '';
            payload.value = a.payload && typeof a.payload === 'object'
                ? a.payload
                : { embeds: [], widgets: { quiz: {}, task: {} } };
            audiences.value = Array.isArray(a.audiences) && a.audiences.length
                ? a.audiences.slice()
                : DEFAULT_AUDIENCES.slice();
            editorUserIds.value = Array.isArray(a.editorUserIds) ? a.editorUserIds.slice() : [];
            editorSeed.value = Array.isArray(a.editors) ? a.editors.slice() : [];
            admin.lastSaved = a;
            lastSavedAt.value = Date.now();
        }
    } else {
        admin.lastSaved = null;
    }

    await nextTick();
    loaded.value = true;
    titleInputEl.value?.focus();
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    clearTimeout(saveTimer);
    clearInterval(nowInterval);
});
</script>

<style scoped>
.kb-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    padding: 0 0.375rem;
    height: 1.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 10px;
    font-weight: 600;
    color: rgb(71 85 105);
    background: rgb(248 250 252);
    border: 1px solid rgb(226 232 240);
    border-radius: 0.375rem;
    margin-left: 0.25rem;
}

:global(.dark) .kb-key {
    color: rgb(203 213 225);
    background: rgb(30 41 59);
    border-color: rgb(51 65 85);
}

/* Suggestion dropdown anim */
.ate-pop-enter-active,
.ate-pop-leave-active {
    transition: opacity .12s ease, transform .12s ease;
}

.ate-pop-enter-from,
.ate-pop-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
