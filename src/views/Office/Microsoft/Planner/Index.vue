<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex flex-col">

    <!-- Top bar -->
    <div class="shrink-0 bg-surface-raised border-b border-line px-4 sm:px-6 py-3">
      <div class="flex items-center gap-3 flex-wrap">

        <!-- Identidade Planner -->
        <div class="flex items-center gap-2 mr-2 min-w-0">
          <div class="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center shrink-0">
            <i class="fas fa-table-columns text-emerald-500 text-sm"></i>
          </div>
          <div class="hidden sm:block min-w-0">
            <p class="text-sm font-semibold text-ink leading-tight">Microsoft Planner</p>
            <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Quadro Kanban</p>
          </div>
        </div>

        <!-- Seletor de Grupo -->
        <div class="min-w-[180px]">
          <Select
            v-model="selectedGroupId"
            :options="groupOptions"
            :placeholder="store.loadingGroups ? 'Carregando...' : 'Selecionar grupo'"
            :disabled="store.loadingGroups"
            size="sm"
            @change="onGroupChange" />
        </div>

        <!-- Seletor de Plano -->
        <template v-if="selectedGroupId">
          <i class="fas fa-chevron-right text-ink-subtle text-xs"></i>
          <div class="min-w-[180px]">
            <Select
              v-model="selectedPlanId"
              :options="planOptions"
              :placeholder="store.plans.length ? 'Selecionar plano' : 'Sem planos neste grupo'"
              :disabled="store.loadingGroups || !store.plans.length"
              size="sm"
              @change="onPlanChange" />
          </div>

          <IconButton
            icon="fas fa-plus"
            label="Criar novo plano neste grupo"
            variant="ghost"
            size="sm"
            @click="showCreatePlan = true" />
        </template>

        <!-- Refresh -->
        <IconButton
          v-if="store.selectedPlan"
          icon="fas fa-rotate-right"
          label="Recarregar"
          variant="ghost"
          size="sm"
          :disabled="store.loadingPlan"
          :class="['ml-auto', store.loadingPlan ? 'animate-spin' : '']"
          @click="store.refreshPlan()" />
      </div>
    </div>

    <!-- Estado vazio: sem grupo/plano selecionado -->
    <div
      v-if="!store.selectedPlan && !store.loadingPlan"
      class="flex-1 flex items-center justify-center p-8">
      <EmptyState
        icon="fas fa-table-columns"
        title="Selecione um plano"
        description="Escolha um grupo e um plano do Microsoft Planner para ver o quadro Kanban." />
    </div>

    <!-- Loading do plano -->
    <div v-else-if="store.loadingPlan" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-ink-muted">
        <Spinner size="sm" />
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
          class="w-72 shrink-0 flex flex-col bg-surface-sunken/60 border border-line rounded-2xl overflow-hidden">
          <!-- Header da coluna -->
          <div class="flex items-center justify-between px-3 py-2.5 gap-2 border-b border-line/60">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs font-semibold text-ink truncate">{{ bucket.name }}</span>
              <Badge variant="neutral" size="xs">
                <span class="font-mono tabular-nums">{{ (store.tasksByBucket[bucket.id] ?? []).length }}</span>
              </Badge>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <IconButton
                icon="fas fa-pen"
                label="Renomear coluna"
                variant="ghost"
                size="sm"
                class="!h-7 !w-7"
                @click="startRenameBucket(bucket)" />
              <IconButton
                icon="fas fa-trash"
                label="Excluir coluna"
                variant="danger"
                size="sm"
                class="!h-7 !w-7"
                @click="deleteBucket(bucket)" />
            </div>
          </div>

          <!-- Tasks -->
          <div class="flex flex-col gap-2 p-2 min-h-[60px] max-h-[calc(100vh-220px)] overflow-y-auto">
            <div
              v-for="task in (store.tasksByBucket[bucket.id] ?? [])"
              :key="task.id"
              @click="openTask(task, bucket)"
              class="bg-surface-raised rounded-xl p-3 shadow-soft border border-line cursor-pointer hover:shadow-md hover:border-accent/40 transition-all duration-150 group">
              <!-- Título + checkbox -->
              <div class="flex items-start gap-2">
                <button
                  @click.stop="store.toggleTaskComplete(task)"
                  class="mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition"
                  :class="task.percentComplete === 100
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-line hover:border-emerald-400'">
                  <i v-if="task.percentComplete === 100" class="fas fa-check text-[8px]"></i>
                </button>
                <span
                  class="text-sm text-ink leading-snug flex-1 min-w-0"
                  :class="task.percentComplete === 100 ? 'line-through text-ink-subtle' : ''">
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
                  :class="isOverdue(task) ? 'text-red-500' : 'text-ink-subtle'">
                  <i class="fas fa-calendar text-[9px]"></i>
                  {{ formatShortDate(task.dueDateTime) }}
                </span>

                <!-- Progresso em progresso -->
                <span
                  v-if="task.percentComplete === 50"
                  class="text-[10px] text-accent flex items-center gap-1">
                  <i class="fas fa-circle-half-stroke text-[9px]"></i>
                  Em progresso
                </span>

                <!-- Checklist count -->
                <span
                  v-if="task.checklistItemCount > 0"
                  class="text-[10px] text-ink-subtle flex items-center gap-1 ml-auto">
                  <i class="fas fa-list-check text-[9px]"></i>
                  <span class="font-mono tabular-nums">{{ task.activeChecklistItemCount }}/{{ task.checklistItemCount }}</span>
                </span>
              </div>
            </div>

            <!-- Empty -->
            <div
              v-if="!(store.tasksByBucket[bucket.id] ?? []).length"
              class="text-center py-4">
              <p class="text-[11px] text-ink-subtle">Sem tarefas</p>
            </div>
          </div>

          <!-- Add task -->
          <div class="px-2 pb-2">
            <template v-if="addingTaskBucketId === bucket.id">
              <div class="bg-surface-raised rounded-xl p-2.5 border border-accent/40 shadow-soft space-y-2">
                <input
                  ref="newTaskInput"
                  v-model="newTaskTitle"
                  type="text"
                  placeholder="Título da tarefa..."
                  @keydown.enter="saveNewTask(bucket.id)"
                  @keydown.escape="cancelNewTask"
                  class="w-full text-sm text-ink bg-transparent outline-none placeholder:text-ink-subtle" />
                <div class="flex gap-2">
                  <Button variant="primary" size="xs" @click="saveNewTask(bucket.id)">Adicionar</Button>
                  <Button variant="ghost" size="xs" @click="cancelNewTask">Cancelar</Button>
                </div>
              </div>
            </template>
            <button
              v-else
              @click="startAddTask(bucket.id)"
              class="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-ink-muted hover:text-ink hover:bg-surface-hover/60 rounded-xl transition">
              <i class="fas fa-plus text-[10px]"></i>
              Adicionar tarefa
            </button>
          </div>
        </div>

        <!-- Adicionar nova coluna -->
        <div class="w-72 shrink-0">
          <template v-if="addingBucket">
            <div class="bg-surface-sunken/60 border border-line rounded-2xl p-3 space-y-2">
              <input
                ref="bucketInput"
                v-model="newBucketName"
                type="text"
                placeholder="Nome da coluna..."
                @keydown.enter="saveNewBucket"
                @keydown.escape="addingBucket = false"
                class="w-full text-sm text-ink bg-surface-raised rounded-lg px-3 py-2 border border-line outline-none focus:border-accent" />
              <div class="flex gap-2">
                <Button variant="primary" size="sm" @click="saveNewBucket">Criar</Button>
                <Button variant="ghost" size="sm" @click="addingBucket = false">Cancelar</Button>
              </div>
            </div>
          </template>
          <button
            v-else
            @click="startAddBucket"
            class="w-full flex items-center justify-center gap-2 py-3 text-sm text-ink-muted hover:text-ink border-2 border-dashed border-line hover:border-accent/40 rounded-2xl transition">
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
      @deleted="selectedTask = null" />

    <!-- Modal criar plano -->
    <Modal :open="showCreatePlan"
      size="sm"
      title="Criar novo plano"
      @close="showCreatePlan = false">
      <Input
        v-model="newPlanTitle"
        placeholder="Nome do plano..."
        @keydown.enter="saveNewPlan" />
      <template #footer>
        <Button variant="ghost" @click="showCreatePlan = false">Cancelar</Button>
        <Button
          variant="primary"
          icon="fas fa-plus"
          :disabled="!newPlanTitle.trim()"
          @click="saveNewPlan">Criar</Button>
      </template>
    </Modal>

    <!-- Modal renomear bucket -->
    <Modal :open="!!renamingBucket"
      size="sm"
      title="Renomear coluna"
      @close="renamingBucket = null">
      <Input
        v-model="renameBucketName"
        placeholder="Nome da coluna..."
        @keydown.enter="confirmRenameBucket" />
      <template #footer>
        <Button variant="ghost" @click="renamingBucket = null">Cancelar</Button>
        <Button
          variant="primary"
          icon="fas fa-check"
          @click="confirmRenameBucket">Salvar</Button>
      </template>
    </Modal>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { usePlannerStore } from '@/stores/Microsoft/plannerStore';
import TaskDetailModal from './components/TaskDetailModal.vue';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Spinner from '@/components/UI/Spinner.vue';

const store = usePlannerStore();
const toast = useToast();

// ── Seleção ───────────────────────────────────────────────────────────────────
const selectedGroupId = ref('');
const selectedPlanId  = ref('');

const groupOptions = computed(() =>
  (store.groups || []).map(g => ({ value: g.id, label: g.displayName }))
);
const planOptions = computed(() =>
  (store.plans || []).map(p => ({ value: p.id, label: p.title }))
);

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
  nextTick(() => bucketInput.value?.focus?.());
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
  nextTick(() => newTaskInput.value?.focus?.());
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
  if (p <= 1) return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (p <= 3) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
  if (p <= 6) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-surface-sunken text-ink-muted';
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
