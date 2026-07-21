<script setup>
// Renderer específico de IMOBILIÁRIAS na Eme (type: 'imobiliaria_cards').
// Dois tipos de card, ambos vindos de RealEstateTools (backend):
//   kind 'imobiliaria' — parceira do CV: contatos com atalho (WhatsApp/e-mail),
//     gerente, CRECI, empreendimentos vinculados e deep-link p/ a tela já
//     filtrada no CNPJ.
//   kind 'cadastro' — cadastro/convite feito pelo Office: status com tom,
//     janela e submissões de link multi-uso, link público copiável.
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { whatsappUrl, mailtoUrl } from '@/utils/contactLinks';

const props = defineProps({
    action: { type: Object, required: true },
});

const router = useRouter();

const TONES = {
    accent: 'text-accent bg-accent-soft border-accent/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    slate: 'text-ink-muted bg-surface-sunken border-line',
};
const toneClass = (t) => TONES[t] || TONES.accent;

function open(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) { window.open(link, '_blank'); return; }
    router.push(link);
}

function fmtCnpj(v) {
    const d = String(v || '').replace(/\D/g, '');
    if (d.length !== 14) return v || null;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
function fmtDate(v) {
    if (!v) return null;
    try {
        // DATEONLY 'YYYY-MM-DD' sem fuso: formata direto.
        const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
        return new Date(v).toLocaleDateString('pt-BR');
    } catch { return String(v); }
}

// Copiar link público do convite.
const copiedIdx = ref(null);
async function copyInvite(url, i) {
    try {
        await navigator.clipboard.writeText(url);
        copiedIdx.value = i;
        setTimeout(() => { if (copiedIdx.value === i) copiedIdx.value = null; }, 2000);
    } catch { /* clipboard indisponível: o link segue visível no card */ }
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title" class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ action.title }}
        </p>

        <div v-for="(card, i) in (action.cards || [])" :key="i"
            class="rounded-xl border border-line bg-surface-raised p-3 shadow-soft transition hover:border-accent/40">

            <!-- ═══ Card de IMOBILIÁRIA ═══ -->
            <template v-if="card.kind === 'imobiliaria'">
                <div class="flex items-start gap-2.5">
                    <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs"
                        :class="toneClass(card.ativo ? 'accent' : 'slate')">
                        <i class="fas fa-house-flag"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <p class="truncate text-sm font-semibold text-ink">{{ card.title }}</p>
                            <span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                                :class="toneClass(card.ativo ? 'emerald' : 'rose')">
                                {{ card.ativo ? 'Ativa' : 'Inativa' }}
                            </span>
                        </div>
                        <p v-if="card.subtitle" class="mt-0.5 truncate text-xs text-ink-muted">{{ card.subtitle }}</p>
                        <p v-if="fmtCnpj(card.cnpj)" class="mt-0.5 text-[11px] text-ink-subtle">
                            CNPJ {{ fmtCnpj(card.cnpj) }}<span v-if="card.sigla"> · Sigla {{ card.sigla }}</span>
                        </p>
                    </div>
                    <button v-if="card.link" type="button" @click="open(card.link)"
                        class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1
                               text-xs font-medium text-accent transition hover:bg-accent hover:text-white">
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        Ver na tela
                    </button>
                </div>

                <!-- badges: cidades, CRECI, origem -->
                <div class="mt-2 flex flex-wrap gap-1">
                    <span v-for="c in (card.cidades || [])" :key="c"
                        class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                        <i class="fas fa-location-dot mr-1 text-[9px]"></i>{{ c }}
                    </span>
                    <span v-if="card.creci"
                        class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                        CRECI {{ card.creci }}<template v-if="card.validade_creci"> · até {{ card.validade_creci }}</template>
                    </span>
                    <span v-if="card.origem && card.origem !== 'cv'"
                        class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                        <i :class="card.origem === 'link' ? 'fas fa-link' : 'fas fa-desktop'" class="mr-1 text-[9px]"></i>
                        Cadastrada pelo Office
                    </span>
                </div>

                <!-- contatos da imobiliária -->
                <div v-if="card.contato && (card.contato.celular || card.contato.telefone || card.contato.email)"
                    class="mt-2 flex flex-wrap gap-1.5">
                    <a v-for="tel in [card.contato.celular, card.contato.telefone].filter(Boolean)" :key="tel"
                        :href="whatsappUrl(tel)" target="_blank" rel="noopener"
                        class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1
                               text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-600 hover:text-white dark:text-emerald-400">
                        <i class="fab fa-whatsapp"></i>{{ tel }}
                    </a>
                    <a v-if="card.contato.email" :href="mailtoUrl(card.contato.email)"
                        class="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-surface-sunken px-2 py-1
                               text-[11px] font-medium text-ink-muted transition hover:border-accent/40 hover:text-accent">
                        <i class="fas fa-envelope"></i><span class="truncate">{{ card.contato.email }}</span>
                    </a>
                </div>

                <!-- gerente responsável -->
                <div v-if="card.gerente" class="mt-2 rounded-lg border border-line bg-surface-sunken p-2">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Gerente responsável</p>
                    <div class="mt-1 flex flex-wrap items-center gap-1.5">
                        <span class="text-xs font-medium text-ink">{{ card.gerente.nome }}</span>
                        <a v-if="card.gerente.celular" :href="whatsappUrl(card.gerente.celular)" target="_blank" rel="noopener"
                            class="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5
                                   text-[10px] font-medium text-emerald-600 transition hover:bg-emerald-600 hover:text-white dark:text-emerald-400">
                            <i class="fab fa-whatsapp"></i>{{ card.gerente.celular }}
                        </a>
                        <a v-if="card.gerente.email" :href="mailtoUrl(card.gerente.email)"
                            class="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-surface-raised px-1.5 py-0.5
                                   text-[10px] font-medium text-ink-muted transition hover:border-accent/40 hover:text-accent">
                            <i class="fas fa-envelope"></i><span class="truncate">{{ card.gerente.email }}</span>
                        </a>
                    </div>
                </div>

                <!-- empreendimentos vinculados -->
                <div v-if="card.empreendimentos?.length" class="mt-2">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
                        Empreendimentos ({{ card.empreendimentos.length }})
                    </p>
                    <div class="mt-1 flex flex-wrap gap-1">
                        <button v-for="e in card.empreendimentos" :key="e.id || e.nome" type="button"
                            :disabled="!e.id" @click="e.id && open(`/comercial/buildings?open=${e.id}`)"
                            class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted
                                   transition enabled:hover:border-accent/40 enabled:hover:text-accent">
                            {{ e.nome }}
                        </button>
                    </div>
                </div>
            </template>

            <!-- ═══ Card de CADASTRO / CONVITE ═══ -->
            <template v-else>
                <div class="flex items-start gap-2.5">
                    <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs"
                        :class="toneClass(card.tone)">
                        <i :class="card.source === 'public' ? 'fas fa-link' : 'fas fa-file-signature'"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <p class="truncate text-sm font-semibold text-ink">{{ card.title }}</p>
                            <span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium" :class="toneClass(card.tone)">
                                {{ card.statusLabel }}
                            </span>
                        </div>
                        <p class="mt-0.5 text-[11px] text-ink-subtle">
                            {{ card.source === 'public' ? (card.multiUse ? 'Link público multi-uso' : 'Link público de uso único') : 'Cadastro pela tela' }}
                            <template v-if="card.creator"> · por {{ card.creator }}</template>
                            <template v-if="card.completedAt"> · concluído em {{ fmtDate(card.completedAt) }}</template>
                        </p>
                        <p v-if="card.multiUse && (card.startsAt || card.endsAt)" class="mt-0.5 text-[11px] text-ink-subtle">
                            Janela: {{ fmtDate(card.startsAt) || '…' }} → {{ fmtDate(card.endsAt) || '…' }}
                            <template v-if="card.submissions !== null"> · {{ card.submissions }} cadastro(s) recebido(s)</template>
                        </p>
                    </div>
                    <button v-if="card.link" type="button" @click="open(card.link)"
                        class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1
                               text-xs font-medium text-accent transition hover:bg-accent hover:text-white">
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        Acompanhar
                    </button>
                </div>

                <!-- link público copiável (convites em aberto) -->
                <div v-if="card.inviteUrl" class="mt-2 flex items-center gap-1.5 rounded-lg border border-line bg-surface-sunken p-1.5">
                    <code class="min-w-0 flex-1 truncate text-[10px] text-ink-muted">{{ card.inviteUrl }}</code>
                    <button type="button" @click="copyInvite(card.inviteUrl, i)"
                        class="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface-raised px-2 py-1
                               text-[10px] font-medium text-ink-muted transition hover:border-accent/40 hover:text-accent">
                        <i :class="copiedIdx === i ? 'fas fa-check' : 'fas fa-copy'"></i>
                        {{ copiedIdx === i ? 'Copiado!' : 'Copiar' }}
                    </button>
                </div>

                <!-- empreendimentos do convite -->
                <div v-if="card.enterprises?.length" class="mt-2 flex flex-wrap gap-1">
                    <span v-for="(e, ei) in card.enterprises" :key="ei"
                        class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                        {{ e }}
                    </span>
                </div>
            </template>
        </div>

        <!-- atalho p/ a tela completa -->
        <button v-if="action.screenLink" type="button" @click="open(action.screenLink)"
            class="inline-flex items-center gap-1.5 px-0.5 text-xs font-medium text-accent transition hover:underline">
            <i class="fas fa-house-flag text-[10px]"></i>
            Abrir a tela de Imobiliárias
        </button>
    </div>
</template>
