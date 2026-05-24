<template>
    <section
        class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
            <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                Comentários
                <span class="text-slate-400 dark:text-slate-500">({{ totalComments }})</span>
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
                Tire dúvidas e compartilhe insights. Use @ para mencionar colegas.
            </p>
        </div>

        <!-- Novo comentário (raiz) -->
        <div class="border-b border-slate-100 dark:border-slate-800 p-5">
            <CommentComposer placeholder="Escreva um comentário..." :busy="posting"
                @submit="onRootSubmit" />
        </div>

        <!-- Lista -->
        <div class="p-2">
            <div v-if="loading" class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Carregando comentários...
            </div>

            <div v-else-if="!comments.length"
                class="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Seja o primeiro a comentar.
            </div>

            <ul v-else class="space-y-1">
                <li v-for="c in comments" :key="c.id" class="rounded-xl p-3">
                    <CommentRow :comment="c" :current-user-id="currentUserId" :is-admin="isAdmin"
                        @reply="onReply" @edit="onEdit" @remove="onRemove" />

                    <!-- Replies -->
                    <ul v-if="c.replies && c.replies.length" class="mt-2 space-y-1 pl-6 border-l-2 border-slate-100 dark:border-slate-800">
                        <li v-for="r in c.replies" :key="r.id" class="rounded-xl p-2">
                            <CommentRow :comment="r" :current-user-id="currentUserId" :is-admin="isAdmin"
                                :is-reply="true" @edit="onEdit" @remove="onRemove" />
                        </li>
                    </ul>

                    <!-- Composer de reply -->
                    <div v-if="replyingTo === c.id" class="mt-2 pl-6">
                        <CommentComposer placeholder="Escreva uma resposta..." :busy="posting" compact
                            @submit="(body) => onReplySubmit(c.id, body)" @cancel="replyingTo = null" />
                    </div>
                </li>
            </ul>
        </div>
    </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAcademyCommentsStore } from '@/stores/Academy/academyCommentsStore';
import CommentComposer from './CommentComposer.vue';
import CommentRow from './CommentRow.vue';

const props = defineProps({
    articleId: { type: [Number, String], required: true },
    currentUserId: { type: [Number, String], default: null },
    isAdmin: { type: Boolean, default: false },
});

const store = useAcademyCommentsStore();
const posting = ref(false);
const replyingTo = ref(null);

const comments = computed(() => store.commentsFor(props.articleId));
const loading = computed(() => store.isLoading(props.articleId));

const totalComments = computed(() => {
    let n = 0;
    for (const c of comments.value) {
        n += 1 + (c.replies?.length || 0);
    }
    return n;
});

async function onRootSubmit(body) {
    if (!body?.trim() || posting.value) return;
    posting.value = true;
    try {
        await store.create(props.articleId, { body });
    } finally {
        posting.value = false;
    }
}

function onReply(commentId) {
    replyingTo.value = replyingTo.value === commentId ? null : commentId;
}

async function onReplySubmit(parentId, body) {
    if (!body?.trim() || posting.value) return;
    posting.value = true;
    try {
        await store.create(props.articleId, { body, parentId });
        replyingTo.value = null;
    } finally {
        posting.value = false;
    }
}

async function onEdit(commentId, body) {
    await store.update(props.articleId, commentId, { body });
}

async function onRemove(commentId) {
    await store.remove(props.articleId, commentId);
}

onMounted(() => {
    store.fetch(props.articleId);
});
</script>
