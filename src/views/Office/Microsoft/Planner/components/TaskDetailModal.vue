<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-white dark:bg-gray-900 h-full w-full max-w-lg shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div class="flex-1 min-w-0">
            <input
              v-if="editingTitle"
              ref="titleInput"
              v-model="form.title"
              @blur="saveTitle"
              @keydown.enter="saveTitle"
              @keydown.escape="editingTitle = false"
              class="w-full text-base font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 outline-none pb-0.5"
            />
            <h2
              v-else
              class="text-base font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
              @click="startEditTitle"
            >
              {{ task.title }}
            </h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ bucketName }} · {{ planName }}
            </p>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0">
            <i class="fas fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- Body scrollável -->
        <div class="flex-1 overflow-y-auto p-5 space-y-5">

          <!-- Status + Prioridade + Vencimento -->
          <div class="grid grid-cols-3 gap-3">

            <!-- Progresso -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</label>
              <button
                @click="toggleComplete"
                :disabled="store.savingTask"
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition"
                :class="task.percentComplete === 100
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                  : task.percentComplete === 50
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                    : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'"
              >
                <i :class="task.percentComplete === 100 ? 'fas fa-circle-check' : task.percentComplete === 50 ? 'fas fa-circle-half-stroke' : 'far fa-circle'"></i>
                {{ task.percentComplete === 100 ? 'Concluída' : task.percentComplete === 50 ? 'Em progresso' : 'A fazer' }}
              </button>
            </div>

            <!-- Prioridade -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Prioridade</label>
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
              <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Vencimento</label>
              <input
                type="date"
                v-model="form.dueDate"
                @change="saveDueDate"
                class="w-full px-2 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 transition"
              />
            </div>
          </div>

          <!-- Coluna (Bucket) -->
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Coluna</label>
            <select
              v-model="form.bucketId"
              @change="saveBucket"
              class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 transition"
            >
              <option v-for="b in store.bucketsOrdered" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>

          <!-- Descrição -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Descrição</label>
            <textarea
              v-model="form.description"
              @blur="saveDescription"
              rows="3"
              placeholder="Adicione uma descrição..."
              class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none transition"
            ></textarea>
          </div>

          <!-- Checklist -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Checklist</label>
              <span v-if="checklist.length > 0" class="text-[11px] text-gray-400">
                {{ checklist.filter(i => i.isChecked).length }}/{{ checklist.length }}
              </span>
            </div>

            <!-- Barra de progresso -->
            <div v-if="checklist.length > 0" class="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full transition-all duration-300"
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
                  class="flex-1 text-sm text-gray-700 dark:text-gray-300 min-w-0"
                  :class="item.isChecked ? 'line-through text-gray-400 dark:text-gray-500' : ''"
                >{{ item.title }}</span>
                <button
                  @click="removeChecklistItem(item.id)"
                  class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition p-0.5"
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
                class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-blue-400 transition"
              />
              <button
                @click="addChecklistItem"
                :disabled="!newChecklistItem.trim()"
                class="px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-40"
              >
                <i class="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Rodapé com info -->
          <div class="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
            <p v-if="task.createdDateTime" class="text-xs text-gray-400">
              Criada em {{ formatDate(task.createdDateTime) }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button
            @click="confirmDelete"
            class="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition"
          >
            <i class="fas fa-trash text-xs"></i>
            Excluir tarefa
          </button>
          <div v-if="saving" class="text-xs text-gray-400 flex items-center gap-1.5">
            <i class="fas fa-spinner animate-spin text-xs"></i> Salvando...
          </div>
          <div v-else-if="savedMsg" class="text-xs text-green-500 flex items-center gap-1.5">
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
  if (p <= 1) return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400';
  if (p <= 3) return 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400';
  if (p <= 6) return 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400';
  return 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300';
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
  if (!confirm(`Excluir a tarefa "${props.task.title}"?`)) return;
  try {
    await store.deleteTask(props.task);
    emit('deleted');
    emit('close');
  } catch (err) { toast.error(err.message); }
}
</script>
