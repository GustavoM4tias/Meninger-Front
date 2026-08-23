<script setup>
// Renderer de RELATÓRIOS na Eme (type: 'report_cards', vindo de ReportsTools).
// Card de resumo: título, empreendimento, período, nº de blocos/seções, badges de
// visibilidade e modo (fixo/ao vivo), e botão para abrir sem entrar na tela.
import { useRouter } from 'vue-router';

const props = defineProps({ action: { type: Object, required: true } });
const router = useRouter();

const VIS = {
    public: { label: 'Público', cls: 'text-data-warn bg-data-warn/10 border-data-warn/20', icon: 'fas fa-globe' },
    internal: { label: 'Interno', cls: 'text-accent bg-accent/10 border-accent/20', icon: 'fas fa-building' },
    private: { label: 'Privado', cls: 'text-ink-muted bg-surface-sunken border-line', icon: 'fas fa-lock' },
};
const vis = (v) => VIS[v] || VIS.private;

function open(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) { window.open(link, '_blank'); return; }
    router.push(link);
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title" class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ action.title }}</p>

        <div v-for="(c, i) in (action.cards || [])" :key="c.id || i"
            class="rounded-xl border border-line bg-surface-raised p-3 shadow-soft transition hover:border-accent/40">
            <div class="flex items-start gap-2.5">
                <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs" :class="vis(c.visibilidade).cls">
                    <i class="fas fa-chart-column"></i>
                </span>
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <p class="truncate text-sm font-semibold text-ink">{{ c.title }}</p>
                        <span v-if="c.status !== 'published'"
                            class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-micro font-medium text-ink-muted">Rascunho</span>
                    </div>
                    <p v-if="c.empreendimento" class="mt-0.5 truncate text-xs text-ink-muted">
                        <i class="fas fa-building mr-1 text-[9px]"></i>{{ c.empreendimento }}
                    </p>
                    <p v-if="c.periodo" class="mt-0.5 text-micro text-ink-subtle">{{ c.periodo }}</p>
                </div>
                <button type="button" @click="open(c.link)"
                    class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1
                           text-xs font-medium text-accent transition hover:bg-accent hover:text-white">
                    <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    Abrir
                </button>
            </div>

            <div class="mt-2 flex flex-wrap gap-1">
                <span class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-medium" :class="vis(c.visibilidade).cls">
                    <i :class="vis(c.visibilidade).icon" class="text-[9px]"></i>{{ vis(c.visibilidade).label }}
                </span>
                <span class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-micro font-medium text-ink-muted">
                    <i class="fas fa-cube mr-1 text-[9px]"></i>{{ c.blocos }} bloco{{ c.blocos === 1 ? '' : 's' }}
                </span>
                <span class="rounded-md border px-1.5 py-0.5 text-micro font-medium"
                    :class="c.modo === 'live' ? 'text-data-pos bg-data-pos/10 border-data-pos/20' : 'text-ink-muted bg-surface-sunken border-line'">
                    <i :class="c.modo === 'live' ? 'fas fa-bolt' : 'fas fa-thumbtack'" class="mr-1 text-[9px]"></i>{{ c.modo === 'live' ? 'Ao vivo' : 'Fixo' }}
                </span>
                <span v-if="c.origem === 'compartilhado' && c.dono"
                    class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-micro font-medium text-ink-muted">
                    <i class="fas fa-share-nodes mr-1 text-[9px]"></i>por {{ c.dono }}
                </span>
            </div>

            <div v-if="c.secoes?.length" class="mt-1.5 flex flex-wrap gap-1">
                <span v-for="(s, si) in c.secoes.slice(0, 5)" :key="si"
                    class="rounded-md bg-accent-soft/50 px-1.5 py-0.5 text-micro text-accent">{{ s }}</span>
            </div>
        </div>

        <button v-if="action.screenLink" type="button" @click="open(action.screenLink)"
            class="inline-flex items-center gap-1.5 px-0.5 text-xs font-medium text-accent transition hover:underline">
            <i class="fas fa-chart-column text-[10px]"></i>
            Abrir a tela de Relatórios
        </button>
    </div>
</template>
