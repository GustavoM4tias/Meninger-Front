<script setup>
// "Gerar ficha": leva um evento aprovado para as Aprovações (/aprovacoes) já
// preenchido, em vez de o Marketing redigitar tudo.
//
// Fala direto com a API de Aprovações, sem endpoint intermediário: aquele módulo
// já tem protocolo, anexo, WhatsApp e cobrança. Aqui só montamos o payload.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    event: { type: Object, default: null },
    enterpriseName: { type: String, default: '' },
});

const emit = defineEmits(['close', 'created']);

const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const types = ref([]);
const profiles = ref([]);
const form = ref({ type_key: 'evento', profile_names: [], justification: '', due_date: '' });

function authHeaders() {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };
}

async function call(path, opts = {}) {
    const resp = await fetch(`${API_URL}/marketing-approvals${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || data?.message || 'Erro na requisição.');
    return data;
}

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Só o que passou nas duas etapas entra na ficha, pelo valor aprovado.
const approvedItems = computed(() =>
    (props.event?.items || [])
        .filter(i => ['APPROVED', 'APPROVED_WITH_NOTES'].includes(i.comercial_status)
            && ['APPROVED', 'APPROVED_WITH_NOTES'].includes(i.marketing_status))
        .map(i => ({
            name: i.name,
            description: [i.supplier, i.quantity > 1 ? `${Number(i.quantity)} un.` : null]
                .filter(Boolean).join(' · ') || null,
            amount: Number(i.approved_value == null ? i.proposed_value : i.approved_value),
        }))
);

const total = computed(() => approvedItems.value.reduce((s, i) => s + i.amount, 0));

const typeOptions = computed(() => types.value.map(t => ({ value: t.key, label: t.label })));
const profileOptions = computed(() => profiles.value.map(p => p.name));

watch(() => props.open, async (open) => {
    if (!open) return;
    form.value = {
        type_key: 'evento',
        profile_names: [],
        justification: props.event?.objective || '',
        due_date: props.event?.event_date || '',
    };
    loading.value = true;
    try {
        const [typeList, profileList] = await Promise.all([call('/types'), call('/profiles')]);
        types.value = typeList || [];
        profiles.value = (profileList || []).filter(p => p.is_active !== false);
    } catch (e) {
        toast.error(e?.message || 'Falha ao carregar os dados das Aprovações.');
    } finally {
        loading.value = false;
    }
});

async function gerar() {
    if (!approvedItems.value.length) {
        toast.warning('Este evento não tem item aprovado para levar à ficha.');
        return;
    }
    const profileIds = form.value.profile_names
        .map(n => profiles.value.find(p => p.name === n)?.id)
        .filter(Boolean);
    if (!profileIds.length) {
        toast.warning('Escolha quem precisa autorizar.');
        return;
    }

    saving.value = true;
    try {
        const created = await call('/', {
            method: 'POST',
            body: JSON.stringify({
                type_key: form.value.type_key,
                description: `${props.event.title}${props.enterpriseName ? ` - ${props.enterpriseName}` : ''}`,
                justification: form.value.justification || null,
                items: approvedItems.value,
                auth_profile_ids: profileIds,
                due_date: form.value.due_date || null,
            }),
        });
        toast.success(`Ficha ${created?.protocol || ''} criada nas Aprovações.`);
        emit('created', created);
        emit('close');
    } catch (e) {
        toast.error(e?.message || 'Falha ao gerar a ficha.');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <Modal :open="open" title="Gerar ficha de aprovação" :subtitle="event?.title" size="md" @close="emit('close')">
        <div class="space-y-4">
            <div class="rounded-lg border border-line bg-surface-sunken p-3">
                <p class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                    Itens que vão para a ficha
                </p>
                <p v-if="!approvedItems.length" class="text-sm text-ink-subtle">
                    Nenhum item aprovado neste evento.
                </p>
                <ul v-else class="space-y-1">
                    <li v-for="(item, index) in approvedItems" :key="index"
                        class="flex items-center justify-between gap-2 text-sm">
                        <span class="text-ink">{{ item.name }}</span>
                        <span class="text-ink-muted">{{ money(item.amount) }}</span>
                    </li>
                </ul>
                <div v-if="approvedItems.length" class="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
                    <span class="text-ink-muted">Total</span>
                    <strong class="text-ink">{{ money(total) }}</strong>
                </div>
            </div>

            <Select v-model="form.type_key" label="Tipo" :options="typeOptions" :disabled="loading" />

            <div>
                <label class="mb-1 block text-sm font-medium text-ink">Quem autoriza</label>
                <MultiSelector
                    :options="profileOptions"
                    v-model="form.profile_names"
                    placeholder="Escolha os perfis..."
                    overlay
                    :disabled="loading"
                />
                <p class="mt-1 text-xs text-ink-subtle">
                    Todos os perfis escolhidos precisam decidir. Qualquer reprovação encerra a ficha.
                </p>
            </div>

            <Input v-model="form.due_date" type="date" label="Prazo" hint="Padrão: a data do evento" />
            <Input v-model="form.justification" label="Justificativa" placeholder="Opcional" />

            <p class="text-xs text-ink-subtle">
                <Badge variant="info" size="sm">Atenção</Badge>
                A ficha nasce independente do plano: decidir lá não muda o que já foi decidido aqui.
            </p>
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
            <Button variant="primary" :loading="saving" :disabled="loading || !approvedItems.length" @click="gerar">
                Gerar ficha
            </Button>
        </template>
    </Modal>
</template>
