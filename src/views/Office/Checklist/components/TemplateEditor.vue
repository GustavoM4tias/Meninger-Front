<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import api from '@/utils/Checklist/api.js';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import Button from '@/components/UI/Button.vue';

const store = useChecklistStore();
const toast = useToast();

const templates = ref([]);
const selectedId = ref(null);
const data = ref(null); // { template, sections, items }
const loading = ref(false);
const saving = ref(false);

const ANCHORS = [
    { v: 'TODAY', l: 'Dias a partir de hoje' },
    { v: 'MEETING', l: 'Relativo ao Meeting' },
    { v: 'STORE_OPENING', l: 'Relativo à Abertura de Loja' },
];
const PRIORITIES = [{ v: 'LOW', l: 'Baixa' }, { v: 'MEDIUM', l: 'Média' }, { v: 'HIGH', l: 'Alta' }, { v: 'URGENT', l: 'Urgente' }];

onMounted(async () => { await store.loadUsers(); await loadList(); });

async function loadList() {
    try {
        templates.value = await api.templatesAll();
        if ((!selectedId.value || !templates.value.some((t) => t.id === selectedId.value)) && templates.value.length) selectedId.value = templates.value[0].id;
        await loadOne();
    } catch (e) { toast.error(e.message); }
}
async function loadOne() {
    if (!selectedId.value) { data.value = null; return; }
    loading.value = true;
    try { data.value = await api.template(selectedId.value); }
    catch (e) { toast.error(e.message); }
    finally { loading.value = false; }
}
function itemsOf(sectionId) { return (data.value?.items || []).filter((i) => i.section_id === sectionId).sort((a, b) => (a.position || 0) - (b.position || 0)); }

async function newTemplate() {
    try { const t = await api.createTemplate({ name: 'Novo modelo', description: '' }); await loadList(); selectedId.value = t.template.id; await loadOne(); toast.success('Modelo criado.'); }
    catch (e) { toast.error(e.message); }
}
async function saveTemplate() {
    saving.value = true;
    try { await api.updateTemplate(data.value.template.id, { name: data.value.template.name, description: data.value.template.description, is_active: data.value.template.is_active }); toast.success('Modelo salvo.'); }
    catch (e) { toast.error(e.message); } finally { saving.value = false; }
}
async function deleteTemplate() {
    if (!confirm(`Excluir o modelo "${data.value.template.name}"?`)) return;
    try { await api.deleteTemplate(data.value.template.id); selectedId.value = null; await loadList(); toast.success('Modelo excluído.'); }
    catch (e) { toast.error(e.message); }
}
async function addSection() { try { await api.saveTemplateSection(data.value.template.id, { name: 'Nova seção' }); await loadOne(); } catch (e) { toast.error(e.message); } }
async function saveSection(s) { try { await api.saveTemplateSection(data.value.template.id, { id: s.id, name: s.name, color: s.color }); toast.success('Seção salva.'); } catch (e) { toast.error(e.message); } }
async function removeSection(s) { if (!confirm(`Excluir a seção "${s.name}" e suas tarefas-modelo?`)) return; try { await api.removeTemplateSection(s.id); await loadOne(); } catch (e) { toast.error(e.message); } }
async function addItem(sectionId) { try { await api.saveTemplateItem(data.value.template.id, { section_id: sectionId, title: 'Nova tarefa', due_anchor: 'TODAY', due_offset_days: 0, default_priority: 'MEDIUM' }); await loadOne(); } catch (e) { toast.error(e.message); } }
async function saveItem(it) {
    try {
        await api.saveTemplateItem(data.value.template.id, {
            id: it.id, section_id: it.section_id, title: it.title, category: it.category || null,
            default_priority: it.default_priority || 'MEDIUM', default_value: it.default_value ?? null,
            default_assignee_user_id: it.default_assignee_user_id || null,
            due_anchor: it.due_anchor || null, due_offset_days: it.due_anchor ? (Number(it.due_offset_days) || 0) : null,
            notes_template: it.notes_template || null,
        });
        toast.success('Tarefa-modelo salva.');
    } catch (e) { toast.error(e.message); }
}
async function removeItem(it) { if (!confirm('Excluir esta tarefa-modelo?')) return; try { await api.removeTemplateItem(it.id); await loadOne(); } catch (e) { toast.error(e.message); } }

const fieldCls = 'rounded-lg border border-line bg-surface-raised text-ink px-2.5 h-9 text-sm focus-ring';
</script>

<template>
    <div>
        <div class="flex flex-wrap items-center gap-2 mb-4">
            <select v-model="selectedId" @change="loadOne" :class="[fieldCls, 'min-w-[220px]']">
                <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (padrão)' : '' }}{{ t.is_active === false ? ' (inativo)' : '' }}</option>
            </select>
            <Button size="sm" icon="fas fa-plus" @click="newTemplate">Novo modelo</Button>
            <p class="text-xs text-ink-subtle ml-auto">Edite seções, tarefas, responsáveis e prazos padrão. Vale para todo NOVO checklist criado a partir do modelo.</p>
        </div>

        <div v-if="loading" class="text-center text-ink-subtle py-12"><i class="fas fa-spinner fa-spin"></i></div>
        <div v-else-if="!data" class="text-center text-ink-subtle py-12 surface-card">Nenhum modelo. Crie o primeiro.</div>

        <template v-else>
            <!-- Cabeçalho do modelo -->
            <div class="surface-card p-4 mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label class="text-xs font-medium text-ink-muted">Nome<input v-model="data.template.name" :class="[fieldCls, 'w-full mt-1']" /></label>
                    <label class="text-xs font-medium text-ink-muted">Descrição<input v-model="data.template.description" :class="[fieldCls, 'w-full mt-1']" /></label>
                </div>
                <div class="flex items-center gap-2 mt-3">
                    <Button size="sm" icon="fas fa-floppy-disk" :loading="saving" @click="saveTemplate">Salvar modelo</Button>
                    <Button v-if="!data.template.is_default" variant="danger" size="sm" icon="fas fa-trash" @click="deleteTemplate">Excluir modelo</Button>
                    <span v-else class="text-xs text-ink-subtle">Modelo padrão (não excluível)</span>
                </div>
            </div>

            <!-- Seções + tarefas-modelo -->
            <div v-for="s in data.sections" :key="s.id" class="surface-card p-4 mb-3">
                <div class="flex items-center gap-2 mb-3">
                    <input type="color" :value="s.color || '#64748b'" @input="s.color = $event.target.value" class="w-8 h-8 rounded-lg border border-line bg-surface p-0.5 cursor-pointer shrink-0" title="Cor da seção" />
                    <input v-model="s.name" placeholder="Nome da seção" :class="[fieldCls, 'flex-1 font-semibold']" />
                    <Button size="sm" variant="outline" @click="saveSection(s)">Salvar</Button>
                    <Button size="sm" variant="ghost" icon="fas fa-trash" class="!text-red-500" @click="removeSection(s)" />
                </div>

                <div class="space-y-2">
                    <div v-for="it in itemsOf(s.id)" :key="it.id" class="rounded-lg border border-line bg-surface-sunken/40 p-2.5 space-y-2">
                        <div class="flex flex-wrap gap-2">
                            <input v-model="it.title" placeholder="Tarefa" :class="[fieldCls, 'flex-1 min-w-[180px]']" />
                            <input v-model="it.category" placeholder="categoria (opcional)" :class="[fieldCls, 'w-40']" />
                        </div>
                        <div class="flex flex-wrap gap-2 items-center">
                            <select v-model.number="it.default_assignee_user_id" :class="fieldCls" title="Responsável padrão">
                                <option :value="null">- sem responsável -</option>
                                <option v-for="u in store.users" :key="u.id" :value="u.id">{{ u.username }}</option>
                            </select>
                            <select v-model="it.default_priority" :class="fieldCls" title="Prioridade">
                                <option v-for="p in PRIORITIES" :key="p.v" :value="p.v">{{ p.l }}</option>
                            </select>
                            <select v-model="it.due_anchor" :class="fieldCls" title="Origem do prazo">
                                <option :value="null">sem prazo</option>
                                <option v-for="a in ANCHORS" :key="a.v" :value="a.v">{{ a.l }}</option>
                            </select>
                            <label v-if="it.due_anchor" class="inline-flex items-center gap-1 text-xs text-ink-muted">
                                <input type="number" v-model.number="it.due_offset_days" class="w-16 rounded-lg border border-line bg-surface-raised text-ink px-2 h-9 text-sm focus-ring" /> dias
                            </label>
                            <input type="number" step="0.01" v-model.number="it.default_value" placeholder="valor R$" :class="[fieldCls, 'w-28']" />
                            <div class="ml-auto inline-flex gap-1.5">
                                <Button size="sm" variant="outline" icon="fas fa-floppy-disk" @click="saveItem(it)">Salvar</Button>
                                <Button size="sm" variant="ghost" icon="fas fa-trash" class="!text-red-500" @click="removeItem(it)" />
                            </div>
                        </div>
                    </div>
                    <button @click="addItem(s.id)" class="text-xs text-accent hover:underline focus-ring rounded"><i class="fas fa-plus"></i> tarefa-modelo</button>
                </div>
            </div>

            <Button size="sm" variant="outline" icon="fas fa-plus" @click="addSection">Nova seção</Button>
            <p class="text-[11px] text-ink-subtle mt-2">"Dias a partir de hoje": o prazo da tarefa = data de criação do checklist + N dias (ex.: 7 = uma semana depois). Use negativo para "antes" dos marcos Meeting/Abertura.</p>
        </template>
    </div>
</template>
