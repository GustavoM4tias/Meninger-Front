<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex flex-col">

    <!-- ── Sem conta Microsoft conectada ─────────────────────────────────────── -->
    <div v-if="!ms.connected && !ms.loading" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center max-w-sm">
        <div class="h-14 w-14 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-4">
          <i class="fas fa-list-check text-2xl text-ink-subtle"></i>
        </div>
        <h2 class="text-base font-semibold text-ink">Conecte sua conta Microsoft</h2>
        <p class="text-sm text-ink-muted mt-1 mb-4">
          O To Do sincroniza com suas tarefas do Microsoft (Outlook, app To Do e Teams).
        </p>
        <button
          @click="ms.redirectToLogin()"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition">
          <i class="fab fa-microsoft text-xs"></i> Conectar Microsoft
        </button>
      </div>
    </div>

    <template v-else>
      <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
      <div class="shrink-0 bg-surface-raised border-b border-line px-4 sm:px-6 pt-5 pb-4">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2 mr-2 min-w-0">
            <div class="h-9 w-9 rounded-xl bg-surface-sunken border border-line grid place-items-center shrink-0">
              <i class="fas fa-list-check text-accent"></i>
            </div>
            <div class="hidden sm:block min-w-0">
              <p class="text-sm font-semibold text-ink leading-tight">Microsoft To Do</p>
              <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Tarefas pessoais</p>
            </div>
          </div>

          <!-- Busca -->
          <div class="relative flex-1 min-w-[160px] max-w-xs">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
            <input
              v-model="store.search"
              type="text"
              placeholder="Buscar tarefa..."
              class="w-full pl-9 pr-3 h-9 text-sm bg-surface-sunken/60 border border-line rounded-lg text-ink outline-none focus:border-accent transition" />
          </div>

          <!-- Mostrar concluídas -->
          <label class="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
            <input type="checkbox" v-model="store.showCompleted" />
            Concluídas
          </label>

          <button
            @click="store.loadMy()"
            :disabled="store.loading"
            class="ml-auto h-9 w-9 grid place-items-center rounded-lg text-ink-muted hover:bg-surface-hover transition"
            :class="store.loading ? 'animate-spin' : ''"
            title="Recarregar">
            <i class="fas fa-rotate-right text-sm"></i>
          </button>
        </div>

        <!-- Dashboard cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div v-for="c in cards" :key="c.key"
            class="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 flex items-center gap-3">
            <div class="h-8 w-8 rounded-lg grid place-items-center shrink-0" :class="c.bg">
              <i :class="c.icon" class="text-sm"></i>
            </div>
            <div class="min-w-0">
              <p class="text-lg font-bold tabular-nums leading-none text-ink">{{ c.value }}</p>
              <p class="text-[11px] text-ink-subtle truncate">{{ c.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Corpo: barra de listas + tarefas ─────────────────────────────────── -->
      <div class="flex-1 flex min-h-0">

        <!-- Sidebar de listas -->
        <aside class="w-56 shrink-0 border-r border-line bg-surface-raised/40 overflow-y-auto hidden md:flex md:flex-col py-2">
          <button
            @click="store.selectList(null)"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-left transition"
            :class="store.selectedListId === null ? 'bg-accent-soft text-accent font-semibold' : 'text-ink-muted hover:bg-surface-hover'">
            <i class="fas fa-inbox w-4 text-center"></i>
            <span class="flex-1 truncate">Minhas tarefas</span>
            <span class="text-xs tabular-nums text-ink-subtle">{{ store.counts.open }}</span>
          </button>

          <div class="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Listas</div>

          <button
            v-for="l in store.listsWithCounts"
            :key="l.id"
            @click="store.selectList(l.id)"
            class="flex items-center gap-2.5 px-4 py-2 text-sm text-left transition group"
            :class="store.selectedListId === l.id ? 'bg-accent-soft text-accent font-semibold' : 'text-ink-muted hover:bg-surface-hover'">
            <i :class="listIcon(l)" class="w-4 text-center"></i>
            <span class="flex-1 truncate">{{ l.displayName }}</span>
            <span class="text-xs tabular-nums text-ink-subtle">{{ l.openCount || '' }}</span>
          </button>

          <!-- Nova lista -->
          <div class="px-3 pt-2">
            <div v-if="showNewList" class="flex items-center gap-1">
              <input
                v-model="newListName"
                @keyup.enter="confirmNewList"
                @keyup.esc="showNewList = false"
                placeholder="Nome da lista"
                class="flex-1 px-2 h-8 text-sm bg-surface-sunken border border-line rounded-md text-ink outline-none focus:border-accent"
                ref="newListInput" />
              <button @click="confirmNewList" class="h-8 w-8 grid place-items-center text-accent hover:bg-surface-hover rounded-md">
                <i class="fas fa-check text-xs"></i>
              </button>
            </div>
            <button
              v-else
              @click="startNewList"
              class="w-full flex items-center gap-2.5 px-1 py-2 text-sm text-ink-subtle hover:text-accent transition">
              <i class="fas fa-plus w-4 text-center"></i> Nova lista
            </button>
          </div>
        </aside>

        <!-- Lista de tarefas -->
        <main class="flex-1 min-w-0 flex flex-col overflow-hidden">
          <!-- Quick add -->
          <div class="shrink-0 px-4 sm:px-6 py-3 border-b border-line">
            <div class="flex items-center gap-2">
              <i class="fas fa-plus text-ink-subtle text-sm"></i>
              <input
                v-model="newTaskTitle"
                @keyup.enter="quickAdd"
                :placeholder="`Adicionar tarefa em '${targetListName}'...`"
                class="flex-1 h-9 text-sm bg-transparent text-ink outline-none placeholder:text-ink-subtle" />
              <button
                v-if="newTaskTitle.trim()"
                @click="quickAdd"
                :disabled="store.savingTask"
                class="px-3 h-8 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition">
                Adicionar
              </button>
            </div>
          </div>

          <!-- Tarefas -->
          <div class="flex-1 overflow-y-auto px-2 sm:px-4 py-2">
            <div v-if="store.loading" class="flex items-center justify-center py-16 text-ink-muted gap-2">
              <i class="fas fa-spinner fa-spin"></i> Carregando suas tarefas...
            </div>

            <div v-else-if="!store.visibleTasks.length" class="flex flex-col items-center justify-center py-16 text-ink-subtle">
              <i class="fas fa-clipboard-check text-3xl mb-3"></i>
              <p class="text-sm">Nenhuma tarefa por aqui.</p>
            </div>

            <ul v-else class="space-y-1.5">
              <li
                v-for="t in store.visibleTasks"
                :key="t.id"
                @click="store.openDetail(t)"
                class="group flex items-start gap-3 px-3 py-2.5 rounded-xl border border-line bg-surface-raised hover:border-accent/40 hover:bg-surface-hover/40 cursor-pointer transition">
                <!-- Checkbox -->
                <button
                  @click.stop="store.toggleComplete(t)"
                  class="mt-0.5 h-5 w-5 rounded-full border-2 grid place-items-center shrink-0 transition"
                  :class="store.isDone(t) ? 'bg-accent border-accent text-white' : 'border-ink-subtle hover:border-accent'">
                  <i v-if="store.isDone(t)" class="fas fa-check text-[10px]"></i>
                </button>

                <div class="flex-1 min-w-0">
                  <p class="text-sm text-ink leading-snug" :class="store.isDone(t) ? 'line-through text-ink-subtle' : ''">
                    {{ t.title }}
                  </p>
                  <div class="flex items-center gap-2.5 mt-1 flex-wrap text-[11px]">
                    <span v-if="store.selectedListId === null" class="text-ink-subtle">
                      <i :class="listIcon({ wellknownListName: null })" class="mr-1"></i>{{ t.listName }}
                    </span>
                    <span v-if="fmtDue(t)" :class="dueClass(t)" class="inline-flex items-center gap-1">
                      <i class="far fa-calendar"></i>{{ fmtDue(t) }}
                    </span>
                    <span v-if="stepInfo(t)" class="text-ink-subtle inline-flex items-center gap-1">
                      <i class="fas fa-list-ul"></i>{{ stepInfo(t) }}
                    </span>
                    <span v-if="t.attachmentsCount" class="text-ink-subtle inline-flex items-center gap-1">
                      <i class="fas fa-paperclip"></i>{{ t.attachmentsCount }}
                    </span>
                    <span v-if="t.meeting" class="text-accent inline-flex items-center gap-1">
                      <i class="fas fa-video"></i>Reunião
                    </span>
                  </div>
                </div>

                <button
                  v-if="t.importance === 'high'"
                  @click.stop="store.patchTask(t, { importance: 'normal' })"
                  class="text-amber-500 shrink-0" title="Importante">
                  <i class="fas fa-star text-xs"></i>
                </button>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </template>

    <!-- ── Drawer de detalhe ────────────────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="todo-drawer">
        <div v-if="store.openTask" class="fixed inset-0 z-[9998] flex justify-end" @click.self="store.closeDetail()">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-md bg-surface-raised h-full shadow-2xl border-l border-line flex flex-col">
            <!-- Header -->
            <div class="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-line">
              <button
                @click="store.toggleComplete(store.openTask)"
                class="h-6 w-6 rounded-full border-2 grid place-items-center shrink-0 transition"
                :class="store.isDone(store.openTask) ? 'bg-accent border-accent text-white' : 'border-ink-subtle hover:border-accent'">
                <i v-if="store.isDone(store.openTask)" class="fas fa-check text-[11px]"></i>
              </button>
              <span class="text-xs text-ink-subtle truncate flex-1">{{ store.openTask.listName }}</span>
              <button
                @click="confirmDelete"
                class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle hover:text-red-500 hover:bg-surface-hover transition" title="Excluir">
                <i class="fas fa-trash text-sm"></i>
              </button>
              <button
                @click="store.closeDetail()"
                class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle hover:bg-surface-hover transition">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-5">
              <!-- Título -->
              <textarea
                v-model="draft.title"
                @blur="saveField('title')"
                rows="1"
                class="w-full text-base font-semibold text-ink bg-transparent resize-none outline-none leading-snug"
                :class="store.isDone(store.openTask) ? 'line-through text-ink-subtle' : ''"></textarea>

              <!-- Linha de atributos -->
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  @click="toggleImportance"
                  class="inline-flex items-center gap-1.5 px-2.5 h-8 text-xs rounded-lg border transition"
                  :class="store.openTask.importance === 'high'
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                    : 'border-line text-ink-muted hover:bg-surface-hover'">
                  <i class="fas fa-star text-[11px]"></i> Importante
                </button>
              </div>

              <!-- Prazo + Lembrete -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-ink-subtle uppercase tracking-wide mb-1">Prazo</label>
                  <input
                    type="date"
                    :value="toDateInput(store.openTask.dueDateTime)"
                    @change="saveDue($event.target.value)"
                    class="w-full px-2.5 h-9 text-sm bg-surface-sunken border border-line rounded-lg text-ink outline-none focus:border-accent" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-ink-subtle uppercase tracking-wide mb-1">Lembrete</label>
                  <input
                    type="datetime-local"
                    :value="toDateTimeInput(store.openTask.reminderDateTime)"
                    @change="saveReminder($event.target.value)"
                    class="w-full px-2.5 h-9 text-sm bg-surface-sunken border border-line rounded-lg text-ink outline-none focus:border-accent" />
                </div>
              </div>

              <!-- Reunião / Teams -->
              <div>
                <label class="block text-[11px] font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">Reunião</label>

                <!-- Vinculada -->
                <div v-if="store.openTask.meeting" class="flex items-center gap-2 p-2.5 rounded-lg bg-accent-soft border border-accent/30">
                  <i class="fas fa-video text-accent shrink-0"></i>
                  <span class="text-sm text-accent truncate flex-1 font-medium">{{ store.openTask.meeting.subject || 'Reunião do Teams' }}</span>
                  <a :href="store.openTask.meeting.joinUrl" target="_blank" rel="noopener"
                    class="px-2.5 h-7 grid place-items-center text-xs font-semibold bg-accent text-white rounded-md hover:bg-accent-hover shrink-0">Entrar</a>
                  <button @click="store.unlinkMeeting()" class="h-7 w-7 grid place-items-center text-ink-subtle hover:text-red-500 shrink-0" title="Desvincular">
                    <i class="fas fa-link-slash text-xs"></i>
                  </button>
                </div>

                <!-- Sem reunião -->
                <template v-else>
                  <div v-if="meetingMode === null" class="grid grid-cols-2 gap-2">
                    <button @click="openCreateMeeting"
                      class="inline-flex items-center justify-center gap-1.5 h-9 text-xs font-semibold border border-line text-ink-muted rounded-lg hover:bg-surface-hover transition">
                      <i class="fas fa-video text-accent"></i> Criar reunião
                    </button>
                    <button @click="openLinkMeeting"
                      class="inline-flex items-center justify-center gap-1.5 h-9 text-xs font-semibold border border-line text-ink-muted rounded-lg hover:bg-surface-hover transition">
                      <i class="fas fa-link"></i> Vincular existente
                    </button>
                  </div>

                  <!-- Form: criar reunião -->
                  <div v-else-if="meetingMode === 'create'" class="space-y-2 p-3 rounded-lg bg-surface-sunken border border-line">
                    <input v-model="meetingForm.subject" placeholder="Assunto"
                      class="w-full px-2.5 h-9 text-sm bg-surface-raised border border-line rounded-md text-ink outline-none focus:border-accent" />
                    <div class="grid grid-cols-3 gap-2">
                      <input type="date" v-model="meetingForm.date" class="px-2 h-9 text-sm bg-surface-raised border border-line rounded-md text-ink outline-none focus:border-accent" />
                      <input type="time" v-model="meetingForm.time" class="px-2 h-9 text-sm bg-surface-raised border border-line rounded-md text-ink outline-none focus:border-accent" />
                      <select v-model.number="meetingForm.duration" class="px-1 h-9 text-sm bg-surface-raised border border-line rounded-md text-ink outline-none focus:border-accent">
                        <option :value="30">30 min</option>
                        <option :value="60">1 h</option>
                        <option :value="90">1h30</option>
                        <option :value="120">2 h</option>
                      </select>
                    </div>
                    <input v-model="meetingForm.attendees" placeholder="Participantes (e-mails separados por vírgula)"
                      class="w-full px-2.5 h-9 text-sm bg-surface-raised border border-line rounded-md text-ink outline-none focus:border-accent" />
                    <div class="flex justify-end gap-2 pt-0.5">
                      <button @click="meetingMode = null" class="px-3 h-8 text-xs text-ink-muted hover:bg-surface-hover rounded-md">Cancelar</button>
                      <button @click="submitCreateMeeting" :disabled="meetingBusy || !meetingForm.date || !meetingForm.time"
                        class="px-3 h-8 text-xs font-semibold bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50">
                        <i v-if="meetingBusy" class="fas fa-spinner fa-spin mr-1"></i>{{ meetingBusy ? 'Criando' : 'Criar reunião' }}
                      </button>
                    </div>
                  </div>

                  <!-- Vincular reunião existente -->
                  <div v-else-if="meetingMode === 'link'" class="p-2 rounded-lg bg-surface-sunken border border-line">
                    <div v-if="meetingBusy" class="py-4 text-center text-ink-muted text-sm"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>
                    <div v-else-if="!availableMeetings.length" class="py-4 text-center text-ink-subtle text-sm">Nenhuma reunião online nos próximos dias.</div>
                    <ul v-else class="space-y-0.5 max-h-48 overflow-y-auto">
                      <li v-for="mtg in availableMeetings" :key="mtg.eventId">
                        <button @click="submitLinkMeeting(mtg)" class="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-accent-soft transition">
                          <p class="text-sm text-ink truncate">{{ mtg.subject }}</p>
                          <p class="text-[11px] text-ink-subtle">{{ fmtMeetingWhen(mtg.start) }}</p>
                        </button>
                      </li>
                    </ul>
                    <div class="flex justify-end mt-1">
                      <button @click="meetingMode = null" class="px-3 h-8 text-xs text-ink-muted hover:bg-surface-hover rounded-md">Fechar</button>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Notas -->
              <div>
                <label class="block text-[11px] font-semibold text-ink-subtle uppercase tracking-wide mb-1">Notas</label>
                <textarea
                  v-model="draft.notes"
                  @blur="saveField('notes')"
                  rows="3"
                  placeholder="Adicionar nota..."
                  class="w-full px-3 py-2 text-sm bg-surface-sunken border border-line rounded-lg text-ink outline-none focus:border-accent resize-y"></textarea>
              </div>

              <!-- Etapas -->
              <div>
                <label class="flex items-center justify-between text-[11px] font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">
                  <span>Etapas</span>
                  <span v-if="store.openTask.checklistItems?.length" class="tabular-nums">{{ stepInfo(store.openTask) }}</span>
                </label>
                <ul class="space-y-1">
                  <li v-for="s in store.openTask.checklistItems || []" :key="s.id" class="flex items-center gap-2 group">
                    <button
                      @click="store.toggleStep(s)"
                      class="h-4 w-4 rounded border grid place-items-center shrink-0 transition"
                      :class="s.isChecked ? 'bg-accent border-accent text-white' : 'border-ink-subtle hover:border-accent'">
                      <i v-if="s.isChecked" class="fas fa-check text-[8px]"></i>
                    </button>
                    <span class="flex-1 text-sm text-ink" :class="s.isChecked ? 'line-through text-ink-subtle' : ''">{{ s.displayName }}</span>
                    <button @click="store.removeStep(s)" class="text-ink-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                  </li>
                </ul>
                <div class="flex items-center gap-2 mt-1">
                  <i class="fas fa-plus text-ink-subtle text-xs"></i>
                  <input
                    v-model="newStep"
                    @keyup.enter="addStep"
                    placeholder="Adicionar etapa"
                    class="flex-1 h-8 text-sm bg-transparent text-ink outline-none placeholder:text-ink-subtle" />
                </div>
              </div>

              <!-- Anexos -->
              <div>
                <label class="block text-[11px] font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">Anexos</label>
                <ul v-if="store.openTask.localAttachments?.length" class="space-y-1 mb-2">
                  <li v-for="a in store.openTask.localAttachments" :key="a.id"
                    class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-sunken border border-line group">
                    <i :class="attIcon(a)" class="text-sm shrink-0"></i>
                    <a :href="a.webUrl" target="_blank" rel="noopener" class="flex-1 text-sm text-ink truncate hover:text-accent" @click.stop>
                      {{ a.displayName }}
                    </a>
                    <button @click="store.removeAttachment(a.id)" class="text-ink-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                  </li>
                </ul>
                <div class="flex items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <AttachmentPicker
                      v-model="attUrl"
                      upload-context="todo_attachment"
                      :reference-id="store.openTask.id"
                      resource-type=""
                      placeholder="Cole URL, envie arquivo ou busque no SharePoint" />
                  </div>
                  <button
                    @click="addAttachmentFromPicker"
                    :disabled="!attUrl"
                    class="shrink-0 h-10 px-3 text-xs font-semibold bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-40 transition">
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Confirmação de exclusão -->
    <teleport to="body">
      <div v-if="deleting" class="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50" @click.self="deleting = false">
        <div class="bg-surface-raised rounded-2xl border border-line shadow-2xl w-full max-w-sm p-5">
          <h3 class="text-sm font-bold text-ink mb-1">Excluir tarefa?</h3>
          <p class="text-sm text-ink-muted mb-4">Isso remove a tarefa do seu Microsoft To Do. Não dá pra desfazer.</p>
          <div class="flex justify-end gap-2">
            <button @click="deleting = false" class="px-3 h-9 text-sm text-ink-muted hover:bg-surface-hover rounded-lg transition">Cancelar</button>
            <button @click="doDelete" class="px-3 h-9 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Excluir</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onActivated, nextTick } from 'vue';
import { useTodoStore } from '@/stores/Microsoft/todoStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import AttachmentPicker from '@/views/Office/Comercial/Conditions/components/AttachmentPicker.vue';

const TZ = 'America/Sao_Paulo';
const store = useTodoStore();
const ms = useMicrosoftStore();

const newTaskTitle = ref('');
const newStep = ref('');
const newListName = ref('');
const showNewList = ref(false);
const newListInput = ref(null);
const attUrl = ref('');
const deleting = ref(false);

// Reunião / Teams
const meetingMode = ref(null);          // null | 'create' | 'link'
const meetingBusy = ref(false);
const availableMeetings = ref([]);
const meetingForm = reactive({ subject: '', date: '', time: '', duration: 30, attendees: '' });

// Buffer de edição do drawer (título/notas salvam no blur).
const draft = reactive({ title: '', notes: '' });
watch(() => store.openTask?.id, () => {
  draft.title = store.openTask?.title || '';
  draft.notes = store.openTask?.body?.content || '';
  meetingMode.value = null;
});

const targetListName = computed(() => {
  const id = store.selectedListId || store.defaultListId;
  return store.lists.find((l) => l.id === id)?.displayName || 'Tarefas';
});

const cards = computed(() => [
  { key: 'today',    label: 'Hoje',        value: store.counts.today,    icon: 'fas fa-sun text-amber-500',       bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { key: 'overdue',  label: 'Atrasadas',   value: store.counts.overdue,  icon: 'fas fa-triangle-exclamation text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  { key: 'upcoming', label: 'Próximas 7d', value: store.counts.upcoming, icon: 'fas fa-calendar-day text-accent', bg: 'bg-accent-soft' },
  { key: 'done',     label: 'Concluídas',  value: store.counts.completed, icon: 'fas fa-circle-check text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
]);

// ── Helpers de exibição ─────────────────────────────────────────────────────────
function listIcon(l) {
  const w = l?.wellknownListName;
  if (w === 'defaultList') return 'fas fa-list';
  if (w === 'flaggedEmails') return 'fas fa-flag';
  return 'far fa-circle';
}
function fmtDue(t) {
  const d = store.dueOf(t); if (!d) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function dueClass(t) {
  const d = store.dueOf(t); if (!d || store.isDone(t)) return 'text-ink-subtle';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d < today) return 'text-red-600 dark:text-red-400 font-medium';
  if (d.toDateString() === today.toDateString()) return 'text-amber-600 dark:text-amber-400 font-medium';
  return 'text-ink-subtle';
}
function stepInfo(t) {
  const items = t.checklistItems || [];
  if (!items.length) return null;
  return `${items.filter((s) => s.isChecked).length}/${items.length}`;
}
function attIcon(a) {
  if (a.kind === 'SHAREPOINT') return 'fab fa-microsoft text-accent';
  if (a.kind === 'MEETING') return 'fas fa-video text-accent';
  const ext = (a.displayName || a.webUrl || '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'fas fa-file-pdf text-red-500';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'fas fa-file-image text-purple-500';
  return 'fas fa-link text-ink-subtle';
}
function toDateInput(dt) {
  if (!dt?.dateTime) return '';
  return new Date(dt.dateTime).toISOString().slice(0, 10);
}
function toDateTimeInput(dt) {
  if (!dt?.dateTime) return '';
  const d = new Date(dt.dateTime);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// ── Ações ────────────────────────────────────────────────────────────────────────
async function quickAdd() {
  const title = newTaskTitle.value.trim();
  if (!title) return;
  newTaskTitle.value = '';
  try { await store.createTask({ title }); }
  catch (e) { alert(e.message); newTaskTitle.value = title; }
}

function startNewList() {
  showNewList.value = true;
  nextTick(() => newListInput.value?.focus());
}
async function confirmNewList() {
  const name = newListName.value.trim();
  if (!name) { showNewList.value = false; return; }
  newListName.value = '';
  showNewList.value = false;
  try { await store.addList(name); } catch (e) { alert(e.message); }
}

async function saveField(which) {
  if (!store.openTask) return;
  if (which === 'title') {
    const v = draft.title.trim();
    if (!v || v === store.openTask.title) return;
    await store.patchTask(store.openTask, { title: v });
  } else if (which === 'notes') {
    if (draft.notes === (store.openTask.body?.content || '')) return;
    await store.patchTask(store.openTask, { body: { content: draft.notes, contentType: 'text' } });
  }
}
async function toggleImportance() {
  const next = store.openTask.importance === 'high' ? 'normal' : 'high';
  await store.patchTask(store.openTask, { importance: next });
}
async function saveDue(val) {
  const patch = val
    ? { dueDateTime: { dateTime: `${val}T12:00:00`, timeZone: TZ } }
    : { dueDateTime: null };
  await store.patchTask(store.openTask, patch);
}
async function saveReminder(val) {
  const patch = val
    ? { isReminderOn: true, reminderDateTime: { dateTime: `${val}:00`, timeZone: TZ } }
    : { isReminderOn: false, reminderDateTime: null };
  await store.patchTask(store.openTask, patch);
}
async function addStep() {
  const v = newStep.value.trim();
  if (!v) return;
  newStep.value = '';
  await store.addStep(v);
}
function addAttachmentFromPicker() {
  const url = attUrl.value?.trim();
  if (!url) return;
  let kind = 'URL';
  if (/sharepoint\.com|onedrive|1drv\.ms/i.test(url)) kind = 'SHAREPOINT';
  const name = decodeURIComponent(url.split('?')[0].split('/').pop() || url).slice(0, 80) || url;
  store.addAttachment({ webUrl: url, displayName: name, kind });
  attUrl.value = '';
}

function confirmDelete() { deleting.value = true; }
async function doDelete() {
  deleting.value = false;
  try { await store.removeTask(store.openTask); } catch (e) { alert(e.message); }
}

// ── Reunião / Teams ─────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
function openCreateMeeting() {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  meetingForm.subject = store.openTask?.title || 'Reunião';
  meetingForm.date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  meetingForm.time = `${pad(now.getHours())}:00`;
  meetingForm.duration = 30;
  meetingForm.attendees = '';
  meetingMode.value = 'create';
}
async function openLinkMeeting() {
  meetingMode.value = 'link';
  meetingBusy.value = true;
  try { availableMeetings.value = await store.fetchAvailableMeetings(21); }
  catch (e) { alert(e.message); }
  finally { meetingBusy.value = false; }
}
function meetingEnd(dateStr, timeStr, minutes) {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  d.setMinutes(d.getMinutes() + (Number(minutes) || 30));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
async function submitCreateMeeting() {
  if (!meetingForm.date || !meetingForm.time) return;
  meetingBusy.value = true;
  try {
    const start = `${meetingForm.date}T${meetingForm.time}:00`;
    const end = meetingEnd(meetingForm.date, meetingForm.time, meetingForm.duration);
    const attendees = meetingForm.attendees.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    await store.createMeeting({ subject: meetingForm.subject || store.openTask.title, start, end, attendees });
    meetingMode.value = null;
  } catch (e) { alert(e.message || 'Erro ao criar reunião.'); }
  finally { meetingBusy.value = false; }
}
async function submitLinkMeeting(mtg) {
  meetingBusy.value = true;
  try { await store.linkMeeting(mtg); meetingMode.value = null; }
  catch (e) { alert(e.message); }
  finally { meetingBusy.value = false; }
}
function fmtMeetingWhen(start) {
  if (!start) return '';
  return new Date(start).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────────
async function init() {
  if (!ms.connected) await ms.fetchStatus();
  if (ms.connected) await store.loadMy();
}
onMounted(init);
onActivated(() => { if (ms.connected && !store.tasks.length) store.loadMy(); });
</script>

<style scoped>
.todo-drawer-enter-active, .todo-drawer-leave-active { transition: opacity .2s; }
.todo-drawer-enter-from, .todo-drawer-leave-to { opacity: 0; }
.todo-drawer-enter-active .relative, .todo-drawer-leave-active .relative { transition: transform .25s ease; }
.todo-drawer-enter-from .relative, .todo-drawer-leave-to .relative { transform: translateX(100%); }
</style>
