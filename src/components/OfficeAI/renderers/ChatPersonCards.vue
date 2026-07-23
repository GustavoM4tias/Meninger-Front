<script setup>
// Renderer de PESSOAS na Eme (type: 'person_cards', vindo de PeopleTools no backend).
// Card compacto (nome, cargo, departamento, cidade, contato) + modal de detalhe
// (UI/Modal.vue) com gestor, equipe e atalhos de contato — mobile-first.
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/UI/Modal.vue';
import { whatsappUrl, mailtoUrl } from '@/utils/contactLinks';

const props = defineProps({
    action: { type: Object, required: true },
});

const router = useRouter();
const detail = ref(null); // card aberto no modal

function initials(nome) {
    return String(nome || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
}

function open(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) { window.open(link, '_blank'); return; }
    router.push(link);
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title" class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ action.title }}
        </p>

        <div v-for="(card, i) in (action.cards || [])" :key="card.id || i"
            class="rounded-xl border border-line bg-surface-raised p-3 shadow-soft transition hover:border-accent/40">
            <div class="flex items-start gap-2.5">
                <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft border border-accent/20
                             text-xs font-bold text-accent">
                    {{ initials(card.nome) }}
                </span>
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <p class="truncate text-sm font-semibold text-ink">{{ card.nome }}</p>
                        <span v-if="card.admin"
                            class="rounded-md border border-accent/20 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                            Admin
                        </span>
                        <span v-if="card.equipeTotal"
                            class="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium
                                   text-emerald-600 dark:text-emerald-400">
                            Gestor · {{ card.equipeTotal }}
                        </span>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-ink-muted">
                        {{ [card.cargo, card.departamento].filter(Boolean).join(' · ') || 'Sem cargo definido' }}
                    </p>
                    <p v-if="card.cidade" class="mt-0.5 text-[11px] text-ink-subtle">
                        <i class="fas fa-location-dot mr-1 text-[9px]"></i>{{ card.cidade }}
                    </p>
                </div>
                <button type="button" @click="detail = card"
                    class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1
                           text-xs font-medium text-accent transition hover:bg-accent hover:text-white">
                    <i class="fas fa-id-card text-[10px]"></i>
                    Detalhes
                </button>
            </div>

            <!-- contato rápido -->
            <div v-if="card.telefone || card.email" class="mt-2 flex flex-wrap gap-1.5">
                <a v-if="card.telefone" :href="whatsappUrl(card.telefone)" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1
                           text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-600 hover:text-white dark:text-emerald-400">
                    <i class="fab fa-whatsapp"></i>{{ card.telefone }}
                </a>
                <a v-if="card.email" :href="mailtoUrl(card.email)"
                    class="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-surface-sunken px-2 py-1
                           text-[11px] font-medium text-ink-muted transition hover:border-accent/40 hover:text-accent">
                    <i class="fas fa-envelope"></i><span class="truncate">{{ card.email }}</span>
                </a>
            </div>
        </div>

        <!-- atalho p/ o organograma -->
        <button v-if="action.screenLink" type="button" @click="open(action.screenLink)"
            class="inline-flex items-center gap-1.5 px-0.5 text-xs font-medium text-accent transition hover:underline">
            <i class="fas fa-sitemap text-[10px]"></i>
            Abrir o organograma
        </button>

        <!-- ═══ Modal de detalhe da pessoa ═══ -->
        <Modal :open="!!detail" size="md" :title="detail?.nome || ''"
            :subtitle="[detail?.cargo, detail?.departamento].filter(Boolean).join(' · ')"
            @close="detail = null" @update:open="v => { if (!v) detail = null; }">
            <div v-if="detail" class="space-y-3">
                <div class="flex items-center gap-3">
                    <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft border border-accent/20
                                 text-lg font-bold text-accent">
                        {{ initials(detail.nome) }}
                    </span>
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <p class="text-base font-semibold text-ink">{{ detail.nome }}</p>
                            <span v-if="detail.admin"
                                class="rounded-md border border-accent/20 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                                Admin do sistema
                            </span>
                        </div>
                        <p class="text-sm text-ink-muted">{{ detail.cargo || 'Sem cargo definido' }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div v-if="detail.departamento" class="rounded-lg border border-line bg-surface-sunken p-2.5">
                        <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Departamento</p>
                        <p class="mt-0.5 text-sm text-ink">{{ detail.departamento }}</p>
                    </div>
                    <div v-if="detail.cidade" class="rounded-lg border border-line bg-surface-sunken p-2.5">
                        <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Cidade</p>
                        <p class="mt-0.5 text-sm text-ink">{{ detail.cidade }}</p>
                    </div>
                </div>

                <!-- contato -->
                <div v-if="detail.telefone || detail.email" class="rounded-lg border border-line bg-surface-sunken p-2.5">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Contato</p>
                    <div class="mt-1.5 flex flex-wrap gap-1.5">
                        <a v-if="detail.telefone" :href="whatsappUrl(detail.telefone)" target="_blank" rel="noopener"
                            class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1
                                   text-xs font-medium text-emerald-600 transition hover:bg-emerald-600 hover:text-white dark:text-emerald-400">
                            <i class="fab fa-whatsapp"></i>{{ detail.telefone }}
                        </a>
                        <a v-if="detail.email" :href="mailtoUrl(detail.email)"
                            class="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-surface-raised px-2 py-1
                                   text-xs font-medium text-ink-muted transition hover:border-accent/40 hover:text-accent">
                            <i class="fas fa-envelope"></i><span class="truncate">{{ detail.email }}</span>
                        </a>
                    </div>
                </div>

                <!-- gestor direto -->
                <div v-if="detail.gestor" class="rounded-lg border border-line bg-surface-sunken p-2.5">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Gestor direto</p>
                    <p class="mt-0.5 text-sm text-ink">
                        {{ detail.gestor.nome }}<span v-if="detail.gestor.cargo" class="text-ink-muted"> · {{ detail.gestor.cargo }}</span>
                    </p>
                </div>

                <!-- equipe -->
                <div v-if="detail.equipeTotal" class="rounded-lg border border-line bg-surface-sunken p-2.5">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
                        Equipe ({{ detail.equipeTotal }})
                    </p>
                    <div class="mt-1 flex flex-wrap gap-1">
                        <span v-for="m in detail.equipe" :key="m.id"
                            class="rounded-md border border-line bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
                            :title="m.cargo || ''">
                            {{ m.nome }}
                        </span>
                        <span v-if="detail.equipeTotal > detail.equipe.length"
                            class="rounded-md px-1.5 py-0.5 text-[10px] text-ink-subtle">
                            +{{ detail.equipeTotal - detail.equipe.length }}
                        </span>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex w-full items-center justify-between gap-2">
                    <button type="button" @click="open('/settings/organograma'); detail = null"
                        class="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition hover:underline">
                        <i class="fas fa-sitemap text-[10px]"></i>
                        Ver no organograma
                    </button>
                    <button type="button" @click="detail = null"
                        class="rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted
                               transition hover:border-accent/40 hover:text-accent">
                        Fechar
                    </button>
                </div>
            </template>
        </Modal>
    </div>
</template>
