<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-surface-raised h-full w-full max-w-lg shadow-2xl border-l border-line flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-start justify-between gap-3 p-5 border-b border-line shrink-0">
          <div class="flex-1 min-w-0">
            <input
              v-if="editingTitle"
              ref="titleInput"
              v-model="form.title"
              @blur="saveTitle"
              @keydown.enter="saveTitle"
              @keydown.escape="editingTitle = false"
              class="w-full text-base font-semibold text-ink bg-transparent border-b-2 border-accent outline-none pb-0.5"
            />
            <h2
              v-else
              class="text-base font-semibold text-ink cursor-pointer hover:text-accent  transition"
              @click="startEditTitle"
            >
              {{ task.title }}
            </h2>
            <p class="text-xs text-ink-subtle mt-0.5">
              {{ bucketName }} · {{ planName }}
            </p>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg text-ink-subtle hover:text-ink-muted dark:hover:text-ink-subtle hover:bg-surface-hover transition shrink-0">
            <i class="fas fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- Body scrollável -->
        <div class="flex-1 overflow-y-auto p-5 space-y-5">

          <!-- Status + Prioridade + Vencimento -->
          <div class="grid grid-cols-3 gap-3">

            <!-- Progresso -->
            <div class="space-y-1">
              <label class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Status</label>
              <button
                @click="toggleComplete"
                :disabled="store.savingTask"
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition"
                :class="task.percentComplete === 100
                  ? 'bg-data-pos/10 border-data-pos/25 text-data-pos   '
                  : task.percentComplete === 50
                    ? 'bg-accent/10 border-accent/25 text-accent   '
                    : 'bg-surface-sunken border-line text-ink-muted bg-surface-sunken border-line text-ink-subtle'"
              >
                <i :class="task.percentComplete === 100 ? 'fas fa-circle-check' : task.percentComplete === 50 ? 'fas fa-circle-half-stroke' : 'far fa-circle'"></i>
                {{ task.percentComplete === 100 ? 'Concluída' : task.percentComplete === 50 ? 'Em progresso' : 'A fazer' }}
              </button>
            </div>

            <!-- Prioridade -->
            <div class="space-y-1">
              <label class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Prioridade</label>
              <select
                v-model="form.priority"
                @change="savePriority"
                class="w-full px-2 py-2 text-xs rounded-lg border outline-none transition"
                :class="priorityClass(form.priority)"
              >
                <option :value="0">Urgente</option>
                <option :value="2">Importante</option>
                <option :value="5">Médio</option>
                <option :value="9">Baixo</option>
              </select>
            </div>

            <!-- Vencimento -->
            <div class="space-y-1">
              <label class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Vencimento</label>
              <input
                type="date"
                v-model="form.dueDate"
                @change="saveDueDate"
                class="w-full px-2 py-2 text-xs rounded-lg border border-line bg-surface-raised/60 text-ink outline-none focus:border-accent transition"
              />
            </div>
          </div>

          <!-- Coluna (Bucket) -->
          <div class="space-y-1">
            <label class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Coluna</label>
            <select
              v-model="form.bucketId"
              @change="saveBucket"
              class="w-full px-3 py-2 text-sm rounded-lg border border-line bg-surface-raised/60 text-ink outline-none focus:border-accent transition"
            >
              <option v-for="b in store.bucketsOrdered" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>

          <!-- Descrição -->
          <div class="space-y-1.5">
            <label class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Descrição</label>
            <textarea
              v-model="form.description"
              @blur="saveDescription"
              rows="3"
              placeholder="Adicione uma descrição..."
              class="w-full px-3 py-2.5 text-sm rounded-lg border border-line bg-surface-raised/60 text-ink placeholder:text-ink-subtle dark:placeholder:text-ink-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 resize-none transition"
            ></textarea>
          </div>

          <!-- Checklist -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Checklist</label>
              <span v-if="checklist.length > 0" class="text-micro text-ink-subtle">
                {{ checklist.filter(i => i.isChecked).length }}/{{ checklist.length }}
              </span>
            </div>

            <!-- Barra de progresso -->
            <div v-if="checklist.length > 0" class="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
              <div
                class="h-full bg-accent rounded-full transition-all duration-300"
                :style="{ width: `${checklistProgress}%` }"
              ></div>
            </div>

            <!-- Itens -->
            <div class="space-y-1.5">
              <div
                v-for="item in checklist"
                :key="item.id"
                class="flex items-center gap-2 group"
              >
                <input
                  type="checkbox"
                  :checked="item.isChecked"
                  @change="toggleChecklistItem(item)"
                  class="rounded accent-blue-600 shrink-0 cursor-pointer"
                />
                <span
                  class="flex-1 text-sm text-ink-muted min-w-0"
                  :class="item.isChecked ? 'line-through text-ink-subtle' : ''"
                >{{ item.title }}</span>
                <button
                  @click="removeChecklistItem(item.id)"
                  class="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-data-neg transition p-0.5"
                >
                  <i class="fas fa-xmark text-xs"></i>
                </button>
              </div>
            </div>

            <!-- Add item -->
            <div class="flex gap-2 mt-2">
              <input
                v-model="newChecklistItem"
                type="text"
                placeholder="Adicionar item..."
                @keydown.enter="addChecklistItem"
                class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-line bg-surface-raised/60 text-ink placeholder:text-ink-subtle dark:placeholder:text-ink-muted outline-none focus:border-accent transition"
              />
              <button
                @click="addChecklistItem"
                :disabled="!newChecklistItem.trim()"
                class="px-3 py-1.5 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition disabled:opacity-40"
              >
                <i class="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Rodapé com info -->
          <div class="pt-2 border-t border-line space-y-1">
            <p v-if="task.createdDateTime" class="text-xs text-ink-subtle">
              Criada em {{ formatDate(task.createdDateTime) }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 p-4 border-t border-line flex justify-between items-center">
          <button
            @click="confirmDelete"
            class="flex items-center gap-1.5 text-xs text-data-neg hover:text-data-neg hover:bg-data-neg/10  px-3 py-2 rounded-lg transition"
          >
            <i class="fas fa-trash text-xs"></i>
            Excluir tarefa
          </button>
          <div v-if="saving" class="text-xs text-ink-subtle flex items-center gap-1.5">
            <i class="fas fa-spinner animate-spin text-xs"></i> Salvando...
          </div>
          <div v-else-if="savedMsg" class="text-xs text-data-pos flex items-center gap-1.5">
            <i class="fas fa-check text-xs"></i> Salvo
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { usePlannerStore } from '@/stores/Microsoft/plannerStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

const props = defineProps({
  task:      { type: Object, required: true },
  planName:  { type: String, default: '' },
  bucketName:{ type: String, default: '' },
});
const emit = defineEmits(['close', 'deleted']);

const store = usePlannerStore();
const toast = useToast();

const saving    = ref(false);
const savedMsg  = ref(false);
const editingTitle = ref(false);
const titleInput   = ref(null);
const newChecklistItem = ref('');

// Detalhes da tarefa (checklist + descrição)
const details  = ref(null);
const checklist = ref([]);

const form = ref({
  title:       props.task.title,
  priority:    props.task.priority ?? 5,
  dueDate:     props.task.dueDateTime ? props.task.dueDateTime.slice(0, 10) : '',
  bucketId:    props.task.bucketId,
  description: '',
});

onMounted(async () => {
  try {
    details.value = await store.getTaskDetails(props.task.id);
    form.value.description = details.value?.description ?? '';
    // Checklist vem como objeto { id: { title, isChecked, orderHint } }
    const raw = details.value?.checklist ?? {};
    checklist.value = Object.entries(raw).map(([id, item]) => ({ id, ...item }))
      .sort((a, b) => (a.orderHint ?? '').localeCompare(b.orderHint ?? ''));
  } catch {
    // Sem detalhes — não crítico
  }
});

const checklistProgress = computed(() => {
  if (!checklist.value.length) return 0;
  return Math.round(checklist.value.filter(i => i.isChecked).length / checklist.value.length * 100);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function priorityClass(p) {
  if (p <= 1) return 'bg-data-neg/10 border-data-neg/25 text-data-neg   ';
  if (p <= 3) return 'bg-data-warn/10 border-data-warn/25 text-data-warn   ';
  if (p <= 6) return 'bg-data-warn/10 border-data-warn/25 text-data-warn   ';
  return 'bg-surface-sunken border-line text-ink-muted bg-surface-sunken border-line text-ink-subtle';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function flashSaved() {
  savedMsg.value = true;
  setTimeout(() => { savedMsg.value = false; }, 2000);
}

// ── Ações de salvamento ───────────────────────────────────────────────────────

function startEditTitle() {
  editingTitle.value = true;
  nextTick(() => titleInput.value?.focus());
}

async function saveTitle() {
  editingTitle.value = false;
  if (!form.value.title.trim() || form.value.title === props.task.title) return;
  saving.value = true;
  try {
    await store.updateTask(props.task.id, { title: form.value.title, etag: props.task['@odata.etag'] });
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

async function savePriority() {
  saving.value = true;
  try {
    await store.updateTask(props.task.id, { priority: form.value.priority, etag: props.task['@odata.etag'] });
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

async function saveDueDate() {
  saving.value = true;
  try {
    const dueDateTime = form.value.dueDate ? `${form.value.dueDate}T12:00:00Z` : null;
    await store.updateTask(props.task.id, { dueDateTime, etag: props.task['@odata.etag'] });
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

async function saveBucket() {
  if (form.value.bucketId === props.task.bucketId) return;
  saving.value = true;
  try {
    await store.moveTask(props.task, form.value.bucketId);
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

async function saveDescription() {
  if (!details.value) return;
  saving.value = true;
  try {
    await store.updateTaskDetails(props.task.id, {
      description: form.value.description,
      etag: details.value['@odata.etag'],
    });
    details.value = await store.getTaskDetails(props.task.id);
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

async function toggleComplete() {
  saving.value = true;
  try {
    await store.toggleTaskComplete(props.task);
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

// ── Checklist ─────────────────────────────────────────────────────────────────

async function saveChecklist() {
  if (!details.value) return;
  saving.value = true;
  try {
    const checklistObj = {};
    for (const item of checklist.value) {
      checklistObj[item.id] = { '@odata.type': 'microsoft.graph.plannerChecklistItem', title: item.title, isChecked: item.isChecked };
    }
    const updated = await store.updateTaskDetails(props.task.id, {
      checklist: checklistObj,
      etag: details.value['@odata.etag'],
    });
    details.value = await store.getTaskDetails(props.task.id);
    flashSaved();
  } catch (err) { toast.error(err.message); }
  finally { saving.value = false; }
}

function addChecklistItem() {
  const title = newChecklistItem.value.trim();
  if (!title) return;
  checklist.value.push({ id: `local-${Date.now()}`, title, isChecked: false, orderHint: ' !' });
  newChecklistItem.value = '';
  saveChecklist();
}

function toggleChecklistItem(item) {
  item.isChecked = !item.isChecked;
  saveChecklist();
}

function removeChecklistItem(id) {
  checklist.value = checklist.value.filter(i => i.id !== id);
  saveChecklist();
}

// ── Excluir ───────────────────────────────────────────────────────────────────

async function confirmDelete() {
  if (!await pedirConfirmacao({
    title: `Excluir a tarefa "${props.task.title}"?`,
    consequence: 'Ela sai tambem do Planner no Microsoft 365, para todo mundo do plano.',
    confirmLabel: 'Excluir tarefa',
  })) return;
  try {
    await store.deleteTask(props.task);
    emit('deleted');
    emit('close');
  } catch (err) { toast.error(err.message); }
}
</script>
