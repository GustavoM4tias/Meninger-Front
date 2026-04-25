<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">

    <!-- Top bar -->
    <div class="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <div class="max-w-full flex items-center gap-3 flex-wrap">

        <!-- Ícone Microsoft Planner -->
        <div class="flex items-center gap-2 mr-2">
          <div class="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <i class="fas fa-table-columns text-green-600 dark:text-green-400 text-xs"></i>
          </div>
          <span class="text-sm font-semibold text-gray-900 dark:text-white hidden sm:block">Planner</span>
        </div>

        <!-- Seletor de Grupo -->
        <div class="relative">
          <select
            v-model="selectedGroupId"
            @change="onGroupChange"
            :disabled="store.loadingGroups"
            class="pl-3 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 text-gray-900 dark:text-gray-100 transition appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="">
              {{ store.loadingGroups ? 'Carregando...' : 'Selecionar grupo' }}
            </option>
            <option v-for="g in store.groups" :key="g.id" :value="g.id">{{ g.displayName }}</option>
          </select>
          <i class="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
        </div>

        <!-- Seletor de Plano -->
        <template v-if="selectedGroupId">
          <i class="fas fa-chevron-right text-gray-300 dark:text-gray-600 text-xs"></i>
          <div class="relative">
            <select
              v-model="selectedPlanId"
              @change="onPlanChange"
              :disabled="store.loadingGroups || !store.plans.length"
              class="pl-3 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 text-gray-900 dark:text-gray-100 transition appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">{{ store.plans.length ? 'Selecionar plano' : 'Sem planos neste grupo' }}</option>
              <option v-for="p in store.plans" :key="p.id" :value="p.id">{{ p.title }}</option>
            </select>
            <i class="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
          </div>

          <!-- Criar plano -->
          <button
            @click="showCreatePlan = true"
            v-tippy="'Criar novo plano neste grupo'"
            class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
          >
            <i class="fas fa-plus text-xs"></i>
          </button>
        </template>

        <!-- Refresh -->
        <button
          v-if="store.selectedPlan"
          @click="store.refreshPlan()"
          :disabled="store.loadingPlan"
          v-tippy="'Recarregar'"
          class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition ml-auto"
        >
          <i class="fas fa-rotate-right text-xs" :class="{ 'animate-spin': store.loadingPlan }"></i>
        </button>
      </div>
    </div>

    <!-- Estado vazio: sem grupo/plano selecionado -->
    <div
      v-if="!store.selectedPlan && !store.loadingPlan"
      class="flex-1 flex items-center justify-center p-8"
    >
      <div class="text-center max-w-xs">
        <div class="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-table-columns text-green-500 text-2xl"></i>
        </div>
        <p class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Selecione um plano</p>
        <p class="text-xs text-gray-400">Escolha um grupo e um plano do Microsoft Planner para ver o quadro Kanban.</p>
      </div>
    </div>

    <!-- Loading do plano -->
    <div v-else-if="store.loadingPlan" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-gray-400">
        <i class="fas fa-spinner animate-spin"></i>
        <span class="text-sm">Carregando plano...</span>
      </div>
    </div>

    <!-- Kanban board -->
    <div v-else class="flex-1 overflow-x-auto p-4">
      <div class="flex gap-3 h-full items-start min-w-max">

        <!-- Cada coluna = bucket -->
        <div
          v-for="bucket in store.bucketsOrdered"
          :key="bucket.id"
          class="w-72 shrink-0 flex flex-col bg-gray-100 dark:bg-gray-800/50 rounded-2xl overflow-hidden"
        >
          <!-- Header da coluna -->
          <div class="flex items-center justify-between px-3 py-2.5 gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{{ bucket.name }}</span>
              <span class="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                {{ (store.tasksByBucket[bucket.id] ?? []).length }}
              </span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- Renomear coluna -->
              <button
                @click="startRenameBucket(bucket)"
                v-tippy="'Renomear coluna'"
                class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <i class="fas fa-pen text-[10px]"></i>
              </button>
              <!-- Excluir coluna -->
              <button
                @click="deleteBucket(bucket)"
                v-tippy="'Excluir coluna'"
                class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <i class="fas fa-trash text-[10px]"></i>
              </button>
            </div>
          </div>

          <!-- Tasks -->
          <div class="flex flex-col gap-2 px-2 pb-2 min-h-[60px] max-h-[calc(100vh-200px)] overflow-y-auto">
            <div
              v-for="task in (store.tasksByBucket[bucket.id] ?? [])"
              :key="task.id"
              @click="openTask(task, bucket)"
              class="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-150 group"
            >
              <!-- Título + checkbox -->
              <div class="flex items-start gap-2">
                <button
                  @click.stop="store.toggleTaskComplete(task)"
                  class="mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition"
                  :class="task.percentComplete === 100
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'"
                >
                  <i v-if="task.percentComplete === 100" class="fas fa-check text-[8px]"></i>
                </button>
                <span
                  class="text-sm text-gray-800 dark:text-gray-200 leading-snug flex-1 min-w-0"
                  :class="task.percentComplete === 100 ? 'line-through text-gray-400 dark:text-gray-500' : ''"
                >
                  {{ task.title }}
                </span>
              </div>

              <!-- Meta -->
              <div class="mt-2 flex items-center gap-2 flex-wrap">
                <!-- Prioridade -->
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" :class="priorityBadge(task.priority)">
                  {{ priorityLabel(task.priority) }}
                </span>

                <!-- Vencimento -->
                <span
                  v-if="task.dueDateTime"
                  class="text-[10px] flex items-center gap-1"
                  :class="isOverdue(task) ? 'text-red-500' : 'text-gray-400'"
                >
                  <i class="fas fa-calendar text-[9px]"></i>
                  {{ formatShortDate(task.dueDateTime) }}
                </span>

                <!-- Progresso em progresso -->
                <span
                  v-if="task.percentComplete === 50"
                  class="text-[10px] text-blue-500 flex items-center gap-1"
                >
                  <i class="fas fa-circle-half-stroke text-[9px]"></i>
                  Em progresso
                </span>

                <!-- Checklist count -->
                <span
                  v-if="task.checklistItemCount > 0"
                  class="text-[10px] text-gray-400 flex items-center gap-1 ml-auto"
                >
                  <i class="fas fa-list-check text-[9px]"></i>
                  {{ task.activeChecklistItemCount }}/{{ task.checklistItemCount }}
                </span>
              </div>
            </div>

            <!-- Empty -->
            <div
              v-if="!(store.tasksByBucket[bucket.id] ?? []).length"
              class="text-center py-4"
            >
              <p class="text-[11px] text-gray-400">Sem tarefas</p>
            </div>
          </div>

          <!-- Add task -->
          <div class="px-2 pb-2">
            <template v-if="addingTaskBucketId === bucket.id">
              <div class="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-blue-300 dark:border-blue-700 shadow-sm space-y-2">
                <input
                  ref="newTaskInput"
                  v-model="newTaskTitle"
                  type="text"
                  placeholder="Título da tarefa..."
                  @keydown.enter="saveNewTask(bucket.id)"
                  @keydown.escape="cancelNewTask"
                  class="w-full text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400"
                />
                <div class="flex gap-2">
                  <button @click="saveNewTask(bucket.id)" class="px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition">
                    Adicionar
                  </button>
                  <button @click="cancelNewTask" class="px-3 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            </template>
            <button
              v-else
              @click="startAddTask(bucket.id)"
              class="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-xl transition"
            >
              <i class="fas fa-plus text-[10px]"></i>
              Adicionar tarefa
            </button>
          </div>
        </div>

        <!-- Adicionar nova coluna -->
        <div class="w-72 shrink-0">
          <template v-if="addingBucket">
            <div class="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-3 space-y-2">
              <input
                ref="bucketInput"
                v-model="newBucketName"
                type="text"
                placeholder="Nome da coluna..."
                @keydown.enter="saveNewBucket"
                @keydown.escape="addingBucket = false"
                class="w-full text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-400"
              />
              <div class="flex gap-2">
                <button @click="saveNewBucket" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition">
                  Criar
                </button>
                <button @click="addingBucket = false" class="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  Cancelar
                </button>
              </div>
            </div>
          </template>
          <button
            v-else
            @click="startAddBucket"
            class="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-2xl transition"
          >
            <i class="fas fa-plus text-xs"></i>
            Nova coluna
          </button>
        </div>

      </div>
    </div>

    <!-- Modal detalhe da task -->
    <TaskDetailModal
      v-if="selectedTask"
      :task="selectedTask"
      :plan-name="store.selectedPlan?.title ?? ''"
      :bucket-name="selectedTaskBucketName"
      @close="selectedTask = null"
      @deleted="selectedTask = null"
    />

    <!-- Modal criar plano -->
    <Teleport to="body">
      <div v-if="showCreatePlan" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Criar novo plano</h3>
          <input
            v-model="newPlanTitle"
            type="text"
            placeholder="Nome do plano..."
            @keydown.enter="saveNewPlan"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
          />
          <div class="flex gap-3">
            <button @click="showCreatePlan = false" class="flex-1 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
            <button @click="saveNewPlan" :disabled="!newPlanTitle.trim()" class="flex-1 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-40">Criar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal renomear bucket -->
    <Teleport to="body">
      <div v-if="renamingBucket" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Renomear coluna</h3>
          <input
            v-model="renameBucketName"
            type="text"
            @keydown.enter="confirmRenameBucket"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
          />
          <div class="flex gap-3">
            <button @click="renamingBucket = null" class="flex-1 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
            <button @click="confirmRenameBucket" class="flex-1 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition">Salvar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { usePlannerStore } from '@/stores/Microsoft/plannerStore';
import TaskDetailModal from './components/TaskDetailModal.vue';

const store = usePlannerStore();
const toast = useToast();

// ── Seleção ───────────────────────────────────────────────────────────────────
const selectedGroupId = ref('');
const selectedPlanId  = ref('');

async function onGroupChange() {
  selectedPlanId.value = '';
  const group = store.groups.find(g => g.id === selectedGroupId.value);
  if (group) await store.selectGroup(group);
}

async function onPlanChange() {
  const plan = store.plans.find(p => p.id === selectedPlanId.value);
  if (plan) await store.selectPlan(plan);
}

// ── Bucket ────────────────────────────────────────────────────────────────────
const addingBucket   = ref(false);
const newBucketName  = ref('');
const bucketInput    = ref(null);
const renamingBucket = ref(null);
const renameBucketName = ref('');

function startAddBucket() {
  addingBucket.value = true;
  nextTick(() => bucketInput.value?.focus());
}

async function saveNewBucket() {
  const name = newBucketName.value.trim();
  if (!name) return;
  try {
    await store.createBucket(name);
    newBucketName.value = '';
    addingBucket.value  = false;
  } catch (err) { toast.error(err.message); }
}

function startRenameBucket(bucket) {
  renamingBucket.value   = bucket;
  renameBucketName.value = bucket.name;
}

async function confirmRenameBucket() {
  if (!renamingBucket.value || !renameBucketName.value.trim()) return;
  try {
    await store.renameBucket(renamingBucket.value, renameBucketName.value.trim());
    renamingBucket.value = null;
  } catch (err) { toast.error(err.message); }
}

async function deleteBucket(bucket) {
  const count = (store.tasksByBucket[bucket.id] ?? []).length;
  const msg = count > 0
    ? `Excluir a coluna "${bucket.name}" e suas ${count} tarefa${count > 1 ? 's' : ''}?`
    : `Excluir a coluna "${bucket.name}"?`;
  if (!confirm(msg)) return;
  try {
    await store.deleteBucket(bucket);
  } catch (err) { toast.error(err.message); }
}

// ── Task ──────────────────────────────────────────────────────────────────────
const addingTaskBucketId = ref(null);
const newTaskTitle       = ref('');
const newTaskInput       = ref(null);
const selectedTask           = ref(null);
const selectedTaskBucketName = ref('');

function startAddTask(bucketId) {
  addingTaskBucketId.value = bucketId;
  newTaskTitle.value = '';
  nextTick(() => newTaskInput.value?.focus());
}

function cancelNewTask() {
  addingTaskBucketId.value = null;
  newTaskTitle.value = '';
}

async function saveNewTask(bucketId) {
  const title = newTaskTitle.value.trim();
  if (!title) return;
  try {
    await store.createTask({ bucketId, title });
    cancelNewTask();
  } catch (err) { toast.error(err.message); }
}

function openTask(task, bucket) {
  selectedTask.value = task;
  selectedTaskBucketName.value = bucket.name;
}

// ── Criar plano ───────────────────────────────────────────────────────────────
const showCreatePlan = ref(false);
const newPlanTitle   = ref('');

async function saveNewPlan() {
  const title = newPlanTitle.value.trim();
  if (!title || !selectedGroupId.value) return;
  try {
    const plan = await store.createPlan(selectedGroupId.value, title);
    newPlanTitle.value = '';
    showCreatePlan.value = false;
    selectedPlanId.value = plan.id;
    await store.selectPlan(plan);
    toast.success(`Plano "${plan.title}" criado!`);
  } catch (err) { toast.error(err.message); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function priorityLabel(p) {
  if (p <= 1) return 'Urgente';
  if (p <= 3) return 'Importante';
  if (p <= 6) return 'Médio';
  return 'Baixo';
}

function priorityBadge(p) {
  if (p <= 1) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  if (p <= 3) return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
  if (p <= 6) return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
}

function isOverdue(task) {
  if (!task.dueDateTime) return false;
  return new Date(task.dueDateTime) < new Date() && task.percentComplete < 100;
}

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

onMounted(() => store.fetchGroups());
</script>
