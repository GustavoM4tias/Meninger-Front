<template>
  <div class="space-y-4">
    <div v-if="!hasAnyContent" class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
      <div class="text-sm font-semibold text-slate-900 dark:text-white">Conteúdo não disponível</div>
      <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Esta etapa ainda não possui conteúdo cadastrado.
      </div>
    </div>

    <template v-else>
      <div v-for="(p, i) in parts" :key="i">
        <div v-if="p.kind === 'md'" class="markdown text-sm leading-7 text-slate-700 dark:text-slate-200"
          v-html="p.html" />

        <div v-else class="not-prose">
          <!-- ARTICLE -->
          <div v-if="p.type === 'ARTICLE'" class="token-card">
            <div class="token-kicker">ARTIGO</div>

            <a v-if="articleHref(p.ref)" class="token-title underline break-words" target="__blank" rel="noopener"
              :href="articleHref(p.ref)">
              {{ getEmbedTitle('ARTICLE', p.ref, `Artigo #${p.ref}`) }}
            </a>

            <div v-else class="token-title">
              {{ getEmbedTitle('ARTICLE', p.ref, `Artigo #${p.ref}`) }}
            </div>

            <div v-if="articleHref(p.ref)" class="mt-2 text-xs text-slate-500 dark:text-slate-400 break-all">
              {{ articleHref(p.ref) }}
            </div>

            <a v-if="articleHref(p.ref)" class="token-action" target="_blank" rel="noopener noreferrer"
              :href="articleHref(p.ref)">Abrir Artigo</a>

            <div v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Artigo não encontrado.
            </div>
          </div>

          <!-- COMMUNITY_TOPIC -->
          <div v-else-if="p.type === 'COMMUNITY_TOPIC'" class="token-card">
            <div class="token-kicker">COMUNIDADE</div>

            <a class="token-title underline break-words">
              {{ getEmbedTitle('COMMUNITY_TOPIC', p.ref, `Tópico #${p.ref}`) }}
            </a>

            <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 break-all">
              {{ topicHref(p.ref) }}
            </div>

            <a class="token-action" target="_blank" rel="noopener noreferrer" :href="topicHref(p.ref)">Abrir Tópico</a>

          </div>

          <!-- VIDEO -->
          <div v-else-if="p.type === 'VIDEO'" class="token-card">
            <div class="token-kicker">VÍDEO</div>
            <div class="token-title">{{ getEmbedTitle('VIDEO', p.ref, 'Vídeo') }}</div>

            <div v-if="getEmbedUrl('VIDEO', p.ref)" class="mt-3 space-y-2">
              <iframe class="w-full aspect-video rounded-2xl border border-slate-200 dark:border-slate-800"
                :src="toEmbedUrl(getEmbedUrl('VIDEO', p.ref))" allowfullscreen />
              <!-- <a class="text-xs underline text-slate-600 dark:text-slate-300 break-all"
                :href="getEmbedUrl('VIDEO', p.ref)" target="_blank" rel="noopener noreferrer">
                Abrir em nova aba
              </a> -->
            </div>

            <div v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Vídeo sem URL cadastrada.
            </div>
          </div>

          <!-- LINK -->
          <div v-else-if="p.type === 'LINK'" class="token-card">
            <div class="token-kicker">LINK</div>
            <div class="token-title">{{ getEmbedTitle('LINK', p.ref, 'Link') }}</div>

            <a v-if="getEmbedUrl('LINK', p.ref)"
              class="mt-2 inline-block text-sm underline text-slate-700 dark:text-slate-200 break-all"
              :href="getEmbedUrl('LINK', p.ref)" target="_blank" rel="noopener noreferrer">
              Abrir link
            </a>

            <div v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Link sem URL cadastrada.
            </div>
          </div>

          <!-- QUIZ -->
          <div v-else-if="p.type === 'QUIZ'" class="token-card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="token-kicker">QUIZ</div>
                <div class="token-title">{{ resolvedQuiz?.title || 'Quiz' }}</div>
                <div v-if="resolvedQuiz?.description" class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {{ resolvedQuiz.description }}
                </div>
              </div>

              <div class="shrink-0">
                <span v-if="quizSubmitted" class="rounded-full px-3 py-1.5 text-xs font-mono border"
                  :class="quizAllCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300'">
                  {{ quizAllCorrect ? 'aprovado' : 'revisar' }}
                </span>

                <span v-else
                  class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                  {{ quizCanSubmit ? 'pronto' : 'pendente' }}
                </span>
              </div>
            </div>

            <div v-if="resolvedQuiz?.questions?.length" class="mt-4 space-y-3">
              <div v-for="(q, qi) in resolvedQuiz.questions" :key="qi"
                class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white/60 dark:bg-slate-900/40">
                <div class="flex items-start justify-between gap-3">
                  <div class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ q.text || q.title || `Pergunta ${qi + 1}` }}
                  </div>

                  <div v-if="quizSubmitted" class="text-xs font-mono">
                    <span v-if="questionCorrect(qi)" class="text-emerald-600 dark:text-emerald-400">correta</span>
                    <span v-else class="text-rose-600 dark:text-rose-400">incorreta</span>
                  </div>
                </div>

                <div class="mt-3 space-y-2">
                  <label v-for="(opt, oi) in normalizeOptions(q)" :key="oi" class="flex items-start gap-3 text-sm">
                    <span class="custom-radio-box mt-0.5">
                      <input type="radio" :name="`quiz-${quizKey}-q-${qi}`" :value="oi" v-model.number="answers[qi]"
                        :disabled="quizSubmitted" />
                      <span class="checkmark"></span>
                    </span>

                    <span class="flex-1" :class="optionClass(qi, oi)">
                      {{ opt }}
                    </span>

                    <span v-if="quizSubmitted && oi === correctIndexOf(q)" class="ml-2 rounded-full px-2 py-0.5 text-[11px] font-mono border
                             border-emerald-200 dark:border-emerald-900/40
                             bg-emerald-50/60 dark:bg-emerald-900/10
                             text-emerald-700 dark:text-emerald-300">
                      correta
                    </span>
                  </label>

                  <div v-if="quizSubmitted && !questionCorrect(qi)"
                    class="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Sua resposta: <span class="font-mono">{{ labelOf(q, answers[qi]) }}</span> •
                    Correta: <span class="font-mono">{{ labelOf(q, correctIndexOf(q)) }}</span>
                  </div>
                </div>
              </div>

              <div class="pt-2 flex items-center justify-between gap-3">
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ quizSubmitted ? 'Resposta enviada.' : 'Selecione uma alternativa em cada pergunta.' }}
                </div>

                <button v-if="!quizSubmitted" type="button"
                  class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold
                         text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition" :disabled="!quizCanSubmit"
                  @click="submitQuiz">
                  Enviar resposta
                </button>
              </div>
            </div>

            <div v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Quiz inválido ou sem perguntas.
            </div>
          </div>

          <!-- TASK -->
          <div v-else-if="p.type === 'TASK'" class="token-card">
            <div class="token-kicker">CHECKLIST</div>
            <div class="token-title">{{ resolvedTask?.title || 'Checklist' }}</div>

            <div v-if="resolvedTask?.tasks?.length" class="mt-3 space-y-2">
              <label v-for="(t, ti) in resolvedTask.tasks" :key="ti"
                class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" class="mt-1" />
                <span>{{ t.text || t.title || String(t) }}</span>
              </label>
            </div>

            <div v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Checklist inválida ou vazia.
            </div>
          </div>

          <!-- Fallback -->
          <div v-else class="token-card">
            <div class="token-kicker">BLOCO</div>
            <div class="token-title">Token não suportado: {{ p.type }}:{{ p.ref }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import linkAttrs from 'markdown-it-link-attributes';

const DEBUG = false;
function dwarn(...args) { console.warn('[TrackTokenRenderer]', ...args); }
function dlog(...args) { if (DEBUG) console.log('[TrackTokenRenderer]', ...args); }

const props = defineProps({
  content: { type: String, default: '' },
  payload: { type: [Object, String, null], default: null },
  itemType: { type: String, default: '' },
  itemKey: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  quizAttempt: { type: [Object, String, null], default: null },
  target: { type: [String, Number, null], default: null },
});

const emit = defineEmits(['open-article', 'open-topic', 'quiz-state', 'quiz-submit']);

function isObj(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function normalizeType(t) {
  const up = String(t || '').toUpperCase();
  if (up === 'COMMUNITY') return 'COMMUNITY_TOPIC';
  return up;
}

/* payload */
const normalizedPayload = computed(() => {
  const p = props.payload;
  if (!p) return null;
  if (typeof p === 'string') {
    try { return JSON.parse(p); } catch { return null; }
  }
  return p;
});

/* markdown */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: true })
  .use(anchor)
  .use(linkAttrs, { attrs: { target: '_blank', rel: 'noopener noreferrer' } });

function renderMd(s) {
  return md.render(String(s || ''));
}

/* tokens */
const TOKEN_RE = /@\[(ARTICLE|COMMUNITY|COMMUNITY_TOPIC|VIDEO|LINK|QUIZ|TASK):([a-zA-Z0-9_-]+)\]/gi;

/* embeds */
function embeds() {
  const p = normalizedPayload.value || {};
  return Array.isArray(p.embeds) ? p.embeds : [];
}

function getEmbed(type, ref) {
  const wantType = normalizeType(type);
  const wantRef = String(ref ?? '');
  return embeds().find((e) => normalizeType(e?.type) === wantType && String(e?.ref ?? '') === wantRef) || null;
}

function getEmbedTitle(type, ref, fallback) {
  const e = getEmbed(type, ref);
  return String(e?.title || fallback || '');
}

function getEmbedUrl(type, ref) {
  const e = getEmbed(type, ref);
  return e?.url ? String(e.url) : '';
}

/* -------------------------
   helpers: refs robustos
------------------------- */
function pickStr(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s && s !== 'undefined' && s !== 'null') return s;
  }
  return '';
}

function resolveArticleRef() {
  const p = normalizedPayload.value || {};

  const byTarget = pickStr(props.target);

  const categorySlug = pickStr(
    p.categorySlug, p.category, p.data?.categorySlug, p.data?.category
  );

  const articleSlug = pickStr(
    p.articleSlug, p.slug, p.data?.articleSlug, p.data?.slug
  );

  const byPayloadPair = (categorySlug && articleSlug) ? `${categorySlug}/${articleSlug}` : '';

  const byPayloadRef = pickStr(
    p.ref, p.articleRef, p.data?.ref, p.data?.articleRef
  );

  const e = embeds().find((x) => normalizeType(x?.type) === 'ARTICLE');
  const byEmbed = pickStr(e?.ref);

  return pickStr(byTarget, byPayloadPair, byPayloadRef, byEmbed);
}

function resolveTopicRef() {
  const p = normalizedPayload.value || {};

  const byTarget = pickStr(props.target);

  const byPayload = pickStr(
    p.topicId, p.topic_id, p.communityTopicId,
    p.data?.topicId, p.data?.topic_id, p.data?.communityTopicId
  );

  const e = embeds().find((x) => normalizeType(x?.type) === 'COMMUNITY_TOPIC');
  const byEmbed = pickStr(e?.ref);

  return pickStr(byTarget, byPayload, byEmbed);
}

function resolveVideoRef() {
  const p = normalizedPayload.value || {};
  const byTarget = pickStr(props.target);
  const byPayload = pickStr(p.url, p.videoUrl, p.data?.url, p.data?.videoUrl);
  const e = embeds().find((x) => normalizeType(x?.type) === 'VIDEO');
  const byEmbed = pickStr(e?.ref);
  return pickStr(byTarget, byPayload, byEmbed);
}

function resolveLinkRef() {
  const p = normalizedPayload.value || {};
  const byTarget = pickStr(props.target);
  const byPayload = pickStr(p.url, p.linkUrl, p.data?.url, p.data?.linkUrl);
  const e = embeds().find((x) => normalizeType(x?.type) === 'LINK');
  const byEmbed = pickStr(e?.ref);
  return pickStr(byTarget, byPayload, byEmbed);
}

/* ✅ resolve href do artigo */
function articleHref(ref) {
  // 1) embed completo
  const e = getEmbed('ARTICLE', ref);
  const byUrl = pickStr(e?.url);
  if (byUrl) return byUrl;

  const categorySlug = pickStr(e?.categorySlug, e?.category);
  const slug = pickStr(e?.slug, e?.articleSlug);
  if (categorySlug && slug) {
    return `/academy/kb/${categorySlug}/${slug}`;
  }

  // 2) se ref vier "category/slug"
  const r = String(ref ?? '').trim();
  if (r.includes('/')) {
    const [cs, as] = r.split('/');
    if (cs && as) return `/academy/kb/${cs}/${as}`;
  }

  // 3) fallback url genérico (se existir)
  const u = getEmbedUrl('ARTICLE', ref);
  if (u) return u;

  return '';
}

function topicHref(ref) {
  return `/academy/community/topic/${String(ref ?? '').trim()}`;
}

/* quiz/task maps */
const quizMap = computed(() => {
  const p = normalizedPayload.value || {};
  const out = {};
  if (isObj(p.widgets?.quiz)) Object.assign(out, p.widgets.quiz);
  if (isObj(p.widget?.quiz)) Object.assign(out, p.widget.quiz);
  if (isObj(p.quiz)) { const k = props.itemKey || 'default'; out[k] = p.quiz; }
  if (isObj(p.quizzes)) Object.assign(out, p.quizzes);
  if (Array.isArray(p.questions)) { const k = props.itemKey || 'default'; out[k] = { title: p.title || 'Quiz', questions: p.questions }; }
  if (isObj(p.data?.quiz)) { const k = props.itemKey || 'default'; out[k] = p.data.quiz; }
  return out;
});

function getQuiz(ref) {
  const key = String(ref ?? '');
  const map = quizMap.value || {};
  if (map[key]) return map[key];
  if (props.itemKey && map[String(props.itemKey)]) return map[String(props.itemKey)];
  const firstKey = Object.keys(map)[0];
  return firstKey ? map[firstKey] : null;
}

const taskMap = computed(() => {
  const p = normalizedPayload.value || {};
  if (isObj(p.widgets?.task)) return p.widgets.task;
  if (isObj(p.widget?.task)) return p.widget.task;
  if (isObj(p.tasks)) return p.tasks;
  if (isObj(p.data?.task)) return p.data.task;
  return {};
});

function getTask(ref) {
  const key = String(ref ?? '');
  const map = taskMap.value || {};
  if (map[key]) return map[key];
  if (props.itemKey && map[String(props.itemKey)]) return map[String(props.itemKey)];
  const firstKey = Object.keys(map)[0];
  return firstKey ? map[firstKey] : null;
}

const resolvedQuiz = computed(() => getQuiz(props.itemKey) || getQuiz('default'));
const resolvedTask = computed(() => getTask(props.itemKey) || getTask('default'));

/* tem conteúdo? */
const hasAnyContent = computed(() => {
  const c = String(props.content || '').trim();

  const p = normalizedPayload.value || {};
  const hasEmbeds = Array.isArray(p.embeds) && p.embeds.length > 0;
  const hasQuiz = Object.keys(quizMap.value || {}).length > 0;
  const hasTask = Object.keys(taskMap.value || {}).length > 0;

  const t = normalizeType(props.itemType);

  const hasArticle = t === 'ARTICLE' && !!resolveArticleRef();
  const hasTopic = t === 'COMMUNITY_TOPIC' && !!resolveTopicRef();
  const hasVideo = t === 'VIDEO' && (!!getEmbedUrl('VIDEO', resolveVideoRef()) || !!resolveVideoRef());
  const hasLink = t === 'LINK' && (!!getEmbedUrl('LINK', resolveLinkRef()) || !!resolveLinkRef());

  const hasDirect =
    (t === 'QUIZ' && (hasQuiz || !!props.itemKey)) ||
    (t === 'TASK' && (hasTask || !!props.itemKey)) ||
    hasArticle || hasTopic || hasVideo || hasLink;

  return !!c || hasEmbeds || hasQuiz || hasTask || hasDirect;
});

/* parts */
const parts = computed(() => {
  const src = String(props.content || '');
  const out = [];
  let last = 0;

  for (const m of src.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;

    const before = src.slice(last, start);
    if (before.trim()) out.push({ kind: 'md', html: renderMd(before) });

    out.push({ kind: 'token', type: normalizeType(m[1]), ref: String(m[2]) });
    last = end;
  }

  const tail = src.slice(last);
  if (tail.trim()) out.push({ kind: 'md', html: renderMd(tail) });

  const hasTokenInContent = out.some((x) => x.kind === 'token');

  if (!hasTokenInContent) {
    if (src.trim() && !out.some((x) => x.kind === 'md')) out.push({ kind: 'md', html: renderMd(src) });

    for (const e of embeds()) {
      const t = normalizeType(e?.type);
      const r = String(e?.ref ?? '');
      if (t && r) out.push({ kind: 'token', type: t, ref: r });
    }

    const t = normalizeType(props.itemType);

    if (t === 'QUIZ') {
      const ref = props.itemKey || Object.keys(quizMap.value || {})[0] || 'default';
      out.push({ kind: 'token', type: 'QUIZ', ref: String(ref) });
    }

    if (t === 'TASK') {
      const ref = props.itemKey || Object.keys(taskMap.value || {})[0] || 'default';
      out.push({ kind: 'token', type: 'TASK', ref: String(ref) });
    }

    if (t === 'ARTICLE') {
      const ref = resolveArticleRef();
      if (ref) out.push({ kind: 'token', type: 'ARTICLE', ref });
      else dwarn('ARTICLE sem ref (target/payload/embeds)', { itemKey: props.itemKey, payload: normalizedPayload.value });
    }

    if (t === 'COMMUNITY_TOPIC') {
      const ref = resolveTopicRef();
      if (ref) out.push({ kind: 'token', type: 'COMMUNITY_TOPIC', ref });
      else dwarn('COMMUNITY_TOPIC sem ref (target/payload/embeds)', { itemKey: props.itemKey, payload: normalizedPayload.value });
    }

    if (t === 'VIDEO') {
      const ref = resolveVideoRef();
      if (ref) out.push({ kind: 'token', type: 'VIDEO', ref });
      else dwarn('VIDEO sem ref/url (target/payload/embeds)', { itemKey: props.itemKey, payload: normalizedPayload.value });
    }

    if (t === 'LINK') {
      const ref = resolveLinkRef();
      if (ref) out.push({ kind: 'token', type: 'LINK', ref });
      else dwarn('LINK sem ref/url (target/payload/embeds)', { itemKey: props.itemKey, payload: normalizedPayload.value });
    }
  }

  return out;
});

/* quiz utils */
function normalizeOptions(q) {
  if (!q) return [];
  if (Array.isArray(q.options)) return q.options.map((x) => (isObj(x) ? String(x.label ?? x.text ?? x.value ?? '') : String(x)));
  if (Array.isArray(q.answers)) return q.answers.map((x) => String(x));
  if (Array.isArray(q.alternatives)) return q.alternatives.map((x) => String(x));
  return [];
}

function correctIndexOf(q) {
  const ci = Number(q?.correctIndex);
  if (Number.isFinite(ci)) return ci;
  const c2 = Number(q?.correct_index);
  if (Number.isFinite(c2)) return c2;
  return 0;
}

function labelOf(q, idx) {
  const opts = normalizeOptions(q);
  const i = Number(idx);
  if (!Number.isFinite(i) || i < 0 || i >= opts.length) return '-';
  return opts[i];
}

function toEmbedUrl(url) {
  try {
    const u = new URL(String(url || ''));
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    return String(url || '');
  } catch {
    return String(url || '');
  }
}

/* attempt -> estado local */
const quizKey = computed(() => String(props.itemKey || 'default'));
const answers = ref({});
const quizSubmitted = ref(false);
const quizAllCorrect = ref(false);

function parseAttemptRaw(v) {
  if (!v) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  if (isObj(v)) return v;
  return null;
}

function normalizeAnswersMap(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return {}; }
  }
  if (typeof raw !== 'object') return {};

  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const qi = Number(k);
    const oi = Number(v);
    if (Number.isFinite(qi) && Number.isFinite(oi)) out[qi] = oi;
  }
  return out;
}

function resetQuizState() {
  answers.value = {};
  quizSubmitted.value = false;
  quizAllCorrect.value = false;
}

function applyAttempt(attempt) {
  answers.value = normalizeAnswersMap(attempt?.answers);
  quizSubmitted.value = true;
  quizAllCorrect.value = !!(attempt?.allCorrect ?? attempt?.all_correct);
}

const attemptNormalized = computed(() => parseAttemptRaw(props.quizAttempt));

watch(
  () => [props.itemKey, props.itemType, attemptNormalized.value],
  () => {
    resetQuizState();
    if (attemptNormalized.value) applyAttempt(attemptNormalized.value);
  },
  { immediate: true }
);

/* submit */
function questionCorrect(qi) {
  const q = resolvedQuiz.value?.questions?.[qi];
  if (!q) return false;
  return Number(answers.value[qi]) === correctIndexOf(q);
}

const quizCanSubmit = computed(() => {
  const qs = Array.isArray(resolvedQuiz.value?.questions) ? resolvedQuiz.value.questions : [];
  if (!qs.length) return false;
  return qs.every((_, qi) => Number.isFinite(Number(answers.value[qi])));
});

function submitQuiz() {
  if (!quizCanSubmit.value) return;

  const qs = Array.isArray(resolvedQuiz.value?.questions) ? resolvedQuiz.value.questions : [];
  quizAllCorrect.value = qs.every((_, qi) => questionCorrect(qi));
  quizSubmitted.value = true;

  emit('quiz-submit', {
    itemKey: quizKey.value,
    answers: { ...answers.value },
    allCorrect: quizAllCorrect.value,
  });
}

/* pending */
const quizPending = computed(() => {
  if (props.completed) return false;
  if (normalizeType(props.itemType) !== 'QUIZ') return false;

  const qs = Array.isArray(resolvedQuiz.value?.questions) ? resolvedQuiz.value.questions : [];
  if (!qs.length) return false;

  if (attemptNormalized.value) return false;
  return !quizSubmitted.value;
});

watch(
  () => quizPending.value,
  (pending) => emit('quiz-state', { pending }),
  { immediate: true }
);

function optionClass(qi, oi) {
  if (!quizSubmitted.value) return 'text-slate-700 dark:text-slate-200';

  const q = resolvedQuiz.value?.questions?.[qi];
  const correct = correctIndexOf(q);
  const selected = Number(answers.value[qi]);

  if (oi === correct) return 'text-emerald-700 dark:text-emerald-300 font-semibold';
  if (oi === selected && selected !== correct) return 'text-rose-700 dark:text-rose-300';
  return 'text-slate-700 dark:text-slate-200 opacity-90';
}
</script>

<style scoped>
.token-card {
  @apply rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 p-5;
}

.token-kicker {
  @apply text-[11px] font-mono text-slate-500 dark:text-slate-400;
}

.token-title {
  @apply mt-1 text-sm font-semibold text-slate-900 dark:text-white;
}

.token-action {
  @apply mt-3 inline-flex items-center justify-center rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90;
}

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
