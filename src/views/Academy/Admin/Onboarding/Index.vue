<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Onboarding automático"
            subtitle="Regras que atribuem trilhas automaticamente a novos usuários"
            :backTo="{ name: 'AcademyAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Onboarding' },
            ]">
            <template #actions>
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    :disabled="applying" @click="applyNow">
                    <i class="fa-solid fa-bolt mr-1.5"></i>{{ applying ? 'Aplicando...' : 'Aplicar agora' }}
                </button>
                <button
                    class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-all active:scale-95"
                    @click="openCreate">
                    <i class="fa-solid fa-plus mr-1.5"></i>Nova regra
                </button>
            </template>
        </AcademyPageHeader>

        <div class="rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-900/10 px-5 py-3 text-sm text-sky-800 dark:text-sky-300">
            <i class="fa-solid fa-circle-info mr-1.5"></i>
            As regras rodam automaticamente todo dia às 6h. Use "Aplicar agora" para forçar a verificação imediata.
        </div>

        <div v-if="store.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 px-5 py-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <section class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)]">
            <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                <h2 class="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Regras ativas <span class="text-slate-400 dark:text-slate-500">({{ store.list.length }})</span>
                </h2>
            </div>
            <div class="p-2">
                <div v-if="store.loading" class="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Carregando...
                </div>
                <div v-else-if="!store.list.length"
                    class="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma regra criada. Crie uma para auto-atribuir trilhas.
                </div>
                <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="r in store.list" :key="r.id"
                        class="flex items-start justify-between gap-4 px-3 py-3">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ scopeLabel(r) }}
                                </span>
                                <span class="text-slate-400 dark:text-slate-500">→</span>
                                <span class="font-mono text-sm text-slate-700 dark:text-slate-300">{{ r.trackSlug }}</span>
                            </div>
                            <div class="mt-1 flex flex-wrap items-center gap-1.5">
                                <span v-if="r.mandatory"
                                    class="rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                    obrigatória
                                </span>
                                <span v-if="r.dueDays"
                                    class="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                    prazo {{ r.dueDays }} dias
                                </span>
                                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                    :class="r.active
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'">
                                    {{ r.active ? 'ativa' : 'pausada' }}
                                </span>
                            </div>
                        </div>
                        <div class="flex shrink-0 items-center gap-2">
                            <button
                                class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                @click="openEdit(r)">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button
                                class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                @click="remove(r)">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </li>
                </ul>
            </div>
        </section>

        <!-- Modal -->
        <dialog v-if="modalOpen" open class="fixed inset-0 z-50">
            <div class="fixed inset-0 bg-black/60" @click="modalOpen = false" />
            <div class="fixed inset-0 flex items-center justify-center p-3 md:p-6">
                <div class="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                    @click.stop>
                    <header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                            {{ editId ? 'Editar regra' : 'Nova regra' }}
                        </h2>
                        <button class="rounded-xl px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="modalOpen = false">✕</button>
                    </header>

                    <div class="p-6 space-y-4">
                        <div v-if="modalError"
                            class="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-400">
                            {{ modalError }}
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Aplicar a</label>
                                <select v-model="form.scopeType"
                                    class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                                    <option value="ALL">Todos os novos usuários</option>
                                    <option value="ROLE">Por papel (role)</option>
                                    <option value="POSITION">Por cargo (código)</option>
                                    <option value="DEPARTMENT">Por departamento (id)</option>
                                    <option value="CITY">Por cidade (id)</option>
                                </select>
                            </div>
                            <div v-if="form.scopeType !== 'ALL'">
                                <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Valor</label>
                                <input v-model="form.scopeValue" :placeholder="scopeValueHint"
                                    class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Slug da trilha</label>
                            <input v-model="form.trackSlug" placeholder="ex: boas-vindas-comercial"
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100" />
                        </div>

                        <div class="flex items-center gap-4">
                            <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input type="checkbox" v-model="form.mandatory" class="h-4 w-4" />
                                Obrigatória
                            </label>
                            <div v-if="form.mandatory" class="flex items-center gap-2">
                                <span class="text-sm text-slate-600 dark:text-slate-400">Prazo</span>
                                <input v-model.number="form.dueDays" type="number" min="1" max="365"
                                    class="w-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100" />
                                <span class="text-sm text-slate-600 dark:text-slate-400">dias</span>
                            </div>
                        </div>

                        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input type="checkbox" v-model="form.active" class="h-4 w-4" />
                            Regra ativa
                        </label>
                    </div>

                    <footer class="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                        <button class="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800" @click="modalOpen = false">
                            Cancelar
                        </button>
                        <button :disabled="saving"
                            class="rounded-xl bg-slate-900 dark:bg-white px-5 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40"
                            @click="save">
                            {{ saving ? 'Salvando...' : 'Salvar' }}
                        </button>
                    </footer>
                </div>
            </div>
        </dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyOnboardingStore } from '@/stores/Academy/academyOnboardingStore';

const toast = useToast();
const store = useAcademyOnboardingStore();

const modalOpen = ref(false);
const modalError = ref('');
const editId = ref(null);
const saving = ref(false);
const applying = ref(false);

const form = reactive({
    scopeType: 'ALL',
    scopeValue: '',
    trackSlug: '',
    mandatory: false,
    dueDays: 15,
    active: true,
});

const scopeValueHint = computed(() => ({
    ROLE: 'admin ou user',
    POSITION: 'código do cargo',
    DEPARTMENT: 'id do departamento',
    CITY: 'id da cidade',
}[form.scopeType] || ''));

function scopeLabel(r) {
    if (r.scopeType === 'ALL') return 'Todos os novos usuários';
    return `${r.scopeType}: ${r.scopeValue}`;
}

function resetForm() {
    form.scopeType = 'ALL';
    form.scopeValue = '';
    form.trackSlug = '';
    form.mandatory = false;
    form.dueDays = 15;
    form.active = true;
    modalError.value = '';
}

function openCreate() {
    editId.value = null;
    resetForm();
    modalOpen.value = true;
}

function openEdit(r) {
    editId.value = r.id;
    form.scopeType = r.scopeType;
    form.scopeValue = r.scopeValue || '';
    form.trackSlug = r.trackSlug;
    form.mandatory = !!r.mandatory;
    form.dueDays = r.dueDays || 15;
    form.active = !!r.active;
    modalError.value = '';
    modalOpen.value = true;
}

async function save() {
    modalError.value = '';
    if (form.scopeType !== 'ALL' && !form.scopeValue.trim()) {
        modalError.value = 'Informe o valor do escopo.';
        return;
    }
    if (!form.trackSlug.trim()) {
        modalError.value = 'Informe o slug da trilha.';
        return;
    }
    const payload = {
        scopeType: form.scopeType,
        scopeValue: form.scopeType === 'ALL' ? null : form.scopeValue.trim(),
        trackSlug: form.trackSlug.trim(),
        mandatory: form.mandatory,
        dueDays: form.mandatory ? form.dueDays : null,
        active: form.active,
    };
    saving.value = true;
    try {
        if (editId.value) await store.update(editId.value, payload);
        else await store.create(payload);
        toast.success('Regra salva.');
        modalOpen.value = false;
    } catch (e) {
        modalError.value = e?.message || 'Erro ao salvar.';
    } finally {
        saving.value = false;
    }
}

async function remove(r) {
    if (!confirm('Excluir esta regra de onboarding?')) return;
    try {
        await store.remove(r.id);
        toast.success('Regra removida.');
    } catch (e) {
        toast.error(e?.message || 'Erro ao remover.');
    }
}

async function applyNow() {
    applying.value = true;
    try {
        const res = await store.applyNow();
        toast.success(`Aplicado: ${res?.assignmentsCreated || 0} atribuição(ões) criada(s).`);
    } catch (e) {
        toast.error(e?.message || 'Erro ao aplicar.');
    } finally {
        applying.value = false;
    }
}

onMounted(() => store.fetch());
</script>
