<script setup>
// Renderer do painel de PREFERÊNCIAS DE NOTIFICAÇÃO na Eme
// (type: 'notification_prefs', vindo de ProfileTools no backend).
// Toggles interativos por tipo × canal (no app / e-mail / WhatsApp), agrupados,
// salvando direto na API existente (PUT /notifications/preferences) — mesma
// fonte da tela /settings/notifications. Padrão de formulário inline seguindo
// o ChatAlertEditor (estado local + saved feedback).
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { saveNotificationPreference } from '@/utils/Config/apiNotification';

const props = defineProps({
    action: { type: Object, required: true },
});

const router = useRouter();

// Cópia local editável (o action é imutável na mensagem)
const prefs = ref((props.action.prefs || []).map(p => ({ ...p })));
const savingKey = ref(null);   // `${type}:${canal}` em salvamento
const savedKey = ref(null);    // último salvo (feedback ✓)
const errorKey = ref(null);

const groups = computed(() => {
    const map = new Map();
    for (const p of prefs.value) {
        const g = p.group || 'Outros';
        if (!map.has(g)) map.set(g, []);
        map.get(g).push(p);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }));
});

const CHANNELS = [
    { key: 'inapp', label: 'No app', icon: 'fas fa-bell', available: () => true },
    { key: 'email', label: 'E-mail', icon: 'fas fa-envelope', available: (p) => p.hasEmail },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp', available: (p) => p.hasWhatsapp },
];

async function toggle(pref, canal) {
    if (!pref.userOptional) return; // obrigatória: sempre ligada
    const key = `${pref.type}:${canal}`;
    if (savingKey.value) return;
    const newVal = !pref[canal];
    savingKey.value = key;
    errorKey.value = null;
    try {
        await saveNotificationPreference({ type: pref.type, [canal]: newVal });
        pref[canal] = newVal;
        savedKey.value = key;
        setTimeout(() => { if (savedKey.value === key) savedKey.value = null; }, 1500);
    } catch {
        errorKey.value = key;
        setTimeout(() => { if (errorKey.value === key) errorKey.value = null; }, 2500);
    } finally {
        savingKey.value = null;
    }
}
</script>

<template>
    <div class="mt-2 rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
        <div class="flex items-center justify-between gap-2 border-b border-line bg-surface-sunken px-3 py-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                <i class="fas fa-sliders mr-1.5 text-[10px]"></i>{{ action.title || 'Preferências de notificação' }}
            </p>
            <button v-if="action.screenLink" type="button" @click="router.push(action.screenLink)"
                class="text-[11px] font-medium text-accent transition hover:underline">
                Abrir tela completa
            </button>
        </div>

        <div class="max-h-96 overflow-y-auto divide-y divide-line">
            <div v-for="g in groups" :key="g.name" class="px-3 py-2">
                <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">{{ g.name }}</p>

                <div v-for="p in g.items" :key="p.type"
                    class="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                    <div class="min-w-0 flex-1 basis-40">
                        <p class="truncate text-xs font-medium text-ink" :title="p.description || ''">
                            {{ p.label }}
                            <span v-if="!p.userOptional"
                                class="ml-1 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-px text-[9px] font-medium
                                       text-amber-600 dark:text-amber-400" title="Notificação obrigatória">
                                obrigatória
                            </span>
                        </p>
                    </div>

                    <div class="flex shrink-0 items-center gap-1">
                        <template v-for="ch in CHANNELS" :key="ch.key">
                            <button v-if="ch.available(p)" type="button"
                                @click="toggle(p, ch.key)"
                                :disabled="!p.userOptional || savingKey === `${p.type}:${ch.key}`"
                                :title="`${ch.label}: ${p[ch.key] ? 'ligado' : 'desligado'}${!p.userOptional ? ' (obrigatória)' : ''}`"
                                class="inline-flex min-h-[28px] items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium
                                       transition disabled:cursor-not-allowed"
                                :class="p[ch.key]
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'border-line bg-surface-sunken text-ink-subtle hover:text-ink-muted'">
                                <i v-if="savingKey === `${p.type}:${ch.key}`" class="fas fa-circle-notch fa-spin"></i>
                                <i v-else-if="savedKey === `${p.type}:${ch.key}`" class="fas fa-check text-emerald-500"></i>
                                <i v-else-if="errorKey === `${p.type}:${ch.key}`" class="fas fa-triangle-exclamation text-rose-500"></i>
                                <i v-else :class="ch.icon"></i>
                                {{ ch.label }}
                            </button>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <p class="border-t border-line bg-surface-sunken px-3 py-1.5 text-[10px] text-ink-subtle">
            Toque num canal para ligar/desligar — salva na hora. Você também pode pedir por texto ("desativa o e-mail de eventos").
        </p>
    </div>
</template>
