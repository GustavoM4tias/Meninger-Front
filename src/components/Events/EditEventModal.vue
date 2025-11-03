<!-- src/components/Events/EditEventModal.vue -->
<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { updateEvent } from '@/utils/Event/apiEvents';
import { getAddress } from '@/utils/Config/apiExternalBuilding';
import OrganizerPicker from './OrganizerPicker.vue';

const props = defineProps({
  event: { type: Object, required: true },
  // opcional: lista de usuários do sistema para sugerir no picker
  // se não passar, o picker ainda permite editar/ adicionar externos
  users: { type: Array, default: () => [] }
});
const emit = defineEmits(['close']);

/* ---------- Helpers ---------- */
const toDateTimeLocal = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};
const ensureIsoMinute = (v) => (v && v.length === 16 ? `${v}:00` : v);
  // Converte "YYYY-MM-DDTHH:mm[:ss]" (LOCAL) → ISO UTC (com "Z")
const toUtcIsoFromLocalInput = (localStr) => {
  if (!localStr) return null;
  const full = localStr.length === 16 ? `${localStr}:00` : localStr; // garante segundos
  const [date, time] = full.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  // Cria Date no fuso LOCAL
  const dtLocal = new Date(y, (m - 1), d, hh, mm, ss || 0);
  // Retorna em UTC (padrão ISO)
  return dtLocal.toISOString();
};

const formatDateTime = (isoLike) => {
  if (!isoLike) return '';
  const d = new Date(isoLike);
  const date = d.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
};

/* ---------- Form base ---------- */
const baseAddress = { street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '' };

const editedEvent = ref({
  id: props.event.id,
  title: props.event.title || '',
  description: props.event.description || '',
  eventDate: toDateTimeLocal(props.event.event_date),
  tags: Array.isArray(props.event.tags) ? [...props.event.tags] : [],
  images: Array.isArray(props.event.images) ? [...props.event.images] : [],
  address: { ...(props.event.address || baseAddress) },
  created_by: props.event.created_by || '',
  // 👇 agora editável
  organizers: Array.isArray(props.event.organizers) ? [...props.event.organizers] : []
});

/* ---------- UI state ---------- */
const newTag = ref('');
const newImageUrl = ref('');
const isSubmitting = ref(false);
const errors = ref({});
const currentStep = ref(1);

const steps = [
  { number: 1, title: 'Informações Básicas', icon: 'fas fa-info-circle' },
  { number: 2, title: 'Localização', icon: 'fas fa-map-marker-alt' },
  { number: 3, title: 'Mídia e Tags', icon: 'fas fa-images' },
  { number: 4, title: 'Organizadores', icon: 'fas fa-people-group' },
  { number: 5, title: 'Revisão', icon: 'fas fa-check-circle' }
];
const totalSteps = computed(() => steps.length);

const isLoadingAddress = ref(false);

/* ---------- CEP (máscara + autofill) ---------- */
const maskedCep = computed({
  get() {
    const raw = editedEvent.value.address.zip_code || '';
    const onlyDigits = String(raw).replace(/\D/g, '').slice(0, 8);
    if (onlyDigits.length <= 5) return onlyDigits;
    return `${onlyDigits.slice(0, 5)}-${onlyDigits.slice(5)}`;
  },
  set(v) {
    editedEvent.value.address.zip_code = (v || '').replace(/\D/g, '').slice(0, 8);
  }
});

const fetchAddress = async (cep) => {
  if (cep.length !== 8) return;
  isLoadingAddress.value = true;
  try {
    const data = await getAddress(cep);
    editedEvent.value.address.street = data.logradouro || '';
    editedEvent.value.address.neighborhood = data.bairro || '';
    editedEvent.value.address.city = data.localidade || '';
    editedEvent.value.address.state = data.uf || '';
  } finally {
    isLoadingAddress.value = false;
  }
};

watch(() => editedEvent.value.address.zip_code, (newCep) => {
  const clean = (newCep || '').replace(/\D/g, '');
  if (clean.length === 8) fetchAddress(clean);
  else if (clean.length === 0) editedEvent.value.address = { ...baseAddress };
});

/* ---------- Validações + navegação ---------- */
const validateStep = (step) => {
  errors.value = {};
  switch (step) {
    case 1:
      if (!editedEvent.value.title.trim()) errors.value.title = 'Título é obrigatório';
      if (!editedEvent.value.description.trim()) errors.value.description = 'Descrição é obrigatória';
      if (!editedEvent.value.eventDate) errors.value.eventDate = 'Data é obrigatória';
      break;
    case 2:
      if (!editedEvent.value.address.zip_code) errors.value.zip_code = 'CEP é obrigatório';
      break;
    case 4:
      // opcional: pode exigir pelo menos 1 organizador
      // if (!editedEvent.value.organizers.length) errors.value.organizers = 'Informe ao menos um organizador.';
      break;
  }
  return Object.keys(errors.value).length === 0;
};

const nextStep = () => {
  if (validateStep(currentStep.value)) {
    currentStep.value = Math.min(currentStep.value + 1, totalSteps.value);
  }
};
const prevStep = () => { currentStep.value = Math.max(currentStep.value - 1, 1); };

/* ---------- Tags & Imagens ---------- */
const addTag = () => {
  const t = newTag.value.trim();
  if (t && !editedEvent.value.tags.includes(t)) {
    editedEvent.value.tags.push(t);
    newTag.value = '';
  }
};
const removeTag = (i) => editedEvent.value.tags.splice(i, 1);

const addImage = () => {
  const url = newImageUrl.value.trim();
  if (url && !editedEvent.value.images.includes(url)) {
    editedEvent.value.images.push(url);
    newImageUrl.value = '';
  }
};
const removeImage = (i) => editedEvent.value.images.splice(i, 1);

/* ---------- Submit ---------- */
const submitEdit = async () => {
  if (!validateStep(1) || !validateStep(2) /* || !validateStep(4) */) {
    if (errors.value.title || errors.value.description || errors.value.eventDate) currentStep.value = 1;
    else if (errors.value.zip_code) currentStep.value = 2;
    else currentStep.value = 4;
    return;
  }
  isSubmitting.value = true;
  try {
    const payload = {
      ...editedEvent.value,
      eventDate: toUtcIsoFromLocalInput(
        ensureIsoMinute(editedEvent.value.eventDate)
      )
    };
    await updateEvent(payload);
    emit('close');
  } catch (error) {
    console.error('Erro ao atualizar o evento:', error);
    errors.value.submit = 'Erro ao salvar alterações. Tente novamente.';
  } finally {
    isSubmitting.value = false;
  }
};

/* ---------- Acessibilidade ---------- */
const handleKeydown = (e) => { if (e.key === 'Escape') emit('close'); };
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
});
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-pen text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold">Editar Evento</h2>
              <p class="text-blue-100">Passo {{ currentStep }} de {{ totalSteps }}</p>
            </div>
          </div>
          <button @click="emit('close')"
            class="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Steps -->
        <div class="flex gap-4">
          <div v-for="step in steps" :key="step.number" :class="['flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300',
            currentStep >= step.number ? 'bg-white/20 text-white' : 'bg-white/5 text-blue-200']">
            <i :class="step.icon"></i>
            <span class="hidden md:block font-medium">{{ step.title }}</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
        <!-- Step 1: Basic -->
        <div v-if="currentStep === 1" class="space-y-6">
          <!-- ... (igual ao seu) -->
          <!-- título, data, descrição com validação -->
          <!-- (mantive todo bloco original de Step 1) -->
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Informações Básicas</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Título do Evento *</label>
              <input v-model="editedEvent.title" type="text" placeholder="Digite o título do evento"
                :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors', errors.title ? 'border-red-500 focus:border-red-600' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
                class="bg-gray-50 dark:bg-gray-700 dark:text-white" />
              <p v-if="errors.title" class="text-red-500 text-sm mt-1">{{ errors.title }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data do Evento *</label>
              <input v-model="editedEvent.eventDate" type="datetime-local"
                :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors', errors.eventDate ? 'border-red-500 focus:border-red-600' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
                class="bg-gray-50 dark:bg-gray-700 dark:text-white" />
              <p v-if="errors.eventDate" class="text-red-500 text-sm mt-1">{{ errors.eventDate }}</p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição do Evento *</label>
            <textarea v-model="editedEvent.description" rows="4"
              placeholder="Descreva os detalhes do evento, atividades, público-alvo, etc."
              :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors resize-none', errors.description ? 'border-red-500 focus:border-red-600' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
              class="bg-gray-50 dark:bg-gray-700 dark:text-white"></textarea>
            <p v-if="errors.description" class="text-red-500 text-sm mt-1">{{ errors.description }}</p>
          </div>
        </div>

        <!-- Step 2: Location -->
        <div v-if="currentStep === 2" class="space-y-6">
          <!-- ... (igual ao seu Step 2, mantendo CEP + autofill) -->
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Localização do Evento</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CEP *</label>
              <div class="relative">
                <input v-model="maskedCep" type="text" inputmode="numeric" placeholder="00000-000" maxlength="9"
                  :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors', errors.zip_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
                  class="bg-gray-50 dark:bg-gray-700 dark:text-white" />
                <div v-if="isLoadingAddress" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <i class="fas fa-spinner fa-spin text-blue-500"></i>
                </div>
              </div>
              <p v-if="errors.zip_code" class="text-red-500 text-sm mt-1">{{ errors.zip_code }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</label>
              <input v-model="editedEvent.address.state" type="text" placeholder="Estado"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
              <input v-model="editedEvent.address.city" type="text" placeholder="Cidade"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bairro</label>
              <input v-model="editedEvent.address.neighborhood" type="text" placeholder="Bairro"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rua</label>
              <input v-model="editedEvent.address.street" type="text" placeholder="Nome da rua"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Número</label>
              <input v-model="editedEvent.address.number" type="text" placeholder="Número"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>
          </div>
        </div>

        <!-- Step 3: Mídia e Tags -->
        <div v-if="currentStep === 3" class="space-y-6">
          <!-- ... (igual ao seu Step 3) -->
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Mídia e Categorias</h3>

          <div class="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags do Evento</label>
            <div class="flex gap-3 mb-4">
              <input v-model="newTag" type="text" placeholder="Digite uma tag" @keyup.enter="addTag"
                class="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white focus:border-blue-500 transition-colors" />
              <button type="button" @click="addTag"
                class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                <i class="fas fa-plus mr-2"></i>Adicionar
              </button>
            </div>
            <div v-if="editedEvent.tags.length" class="flex flex-wrap gap-2">
              <span v-for="(tag, i) in editedEvent.tags" :key="i"
                class="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                {{ tag }}
                <button @click="removeTag(i)" class="hover:text-red-500 transition-colors"><i
                    class="fas fa-times text-xs"></i></button>
              </span>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Imagens do Evento</label>
            <div class="flex gap-3 mb-4">
              <input v-model="newImageUrl" type="url" placeholder="URL da imagem" @keyup.enter="addImage"
                class="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white focus:border-blue-500 transition-colors" />
              <button type="button" @click="addImage"
                class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
                <i class="fas fa-image mr-2"></i>Adicionar
              </button>
            </div>
            <div v-if="editedEvent.images.length" class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="(image, i) in editedEvent.images" :key="i" class="relative group rounded-2xl overflow-hidden">
                <img :src="image" :alt="`Imagem ${i + 1}`" class="w-full h-32 object-cover" />
                <button @click="removeImage(i)"
                  class="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Remover imagem">
                  <i class="fas fa-trash text-sm"></i>
                </button>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-300">Sem imagens no momento.</p>
          </div>
        </div>

        <!-- Step 4: Organizadores -->
        <div v-if="currentStep === 4" class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Organizadores</h3>
          <!-- Se quiser sugestões de usuários internos, passe :users="authStore.users" no pai -->
          <OrganizerPicker v-model="editedEvent.organizers" :users="props.users" />
          <p v-if="errors.organizers" class="text-red-500 text-sm mt-2">{{ errors.organizers }}</p>
        </div>

        <!-- Step 5: Revisão -->
        <div v-if="currentStep === 5" class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Revise os dados</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Info -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Informações</h4>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Título:</span> {{
                editedEvent.title || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Quando:</span> {{
                formatDateTime(editedEvent.eventDate) || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line"><span
                  class="font-medium">Descrição:</span> {{ editedEvent.description || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-2"><span class="font-medium">Criado por:</span> {{
                editedEvent.created_by || '-' }}</p>
            </div>

            <!-- Local -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Local</h4>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">CEP:</span> {{ maskedCep ||
                '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-medium">Endereço:</span>
                {{ editedEvent.address.street || '-' }}<span v-if="editedEvent.address.number">, {{
                  editedEvent.address.number }}</span>
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Bairro:</span> {{
                editedEvent.address.neighborhood || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-medium">Cidade/UF:</span>
                {{ editedEvent.address.city || '-' }}<span v-if="editedEvent.address.state">/{{
                  editedEvent.address.state }}</span>
              </p>
            </div>

            <!-- Tags & Imagens -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Tags e Imagens</h4>
              <div class="mb-3">
                <div v-if="editedEvent.tags.length" class="flex flex-wrap gap-2">
                  <span v-for="(tag, i) in editedEvent.tags" :key="i"
                    class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800">{{
                    tag }}</span>
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Sem tags.</p>
              </div>
              <div>
                <div v-if="editedEvent.images.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <img v-for="(img, i) in editedEvent.images" :key="i" :src="img"
                    class="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Sem imagens.</p>
              </div>
            </div>

            <!-- Organizadores -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Organizadores</h4>
              <div v-if="editedEvent.organizers?.length" class="flex flex-wrap gap-2">
                <span v-for="(o, i) in editedEvent.organizers" :key="i"
                  class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-lg border text-xs flex items-center gap-2">
                  <i class="fas fa-user"></i>
                  <span class="truncate max-w-60">
                    {{ o.name }}
                    <span v-if="o.position" class="opacity-70"> — {{ o.position }}</span>
                    <span v-if="o.email" class="opacity-70"> ({{ o.email }})</span>
                  </span>
                </span>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-300">Nenhum organizador informado.</p>
            </div>
          </div>

          <p v-if="errors.submit" class="text-red-500 text-sm mt-2">{{ errors.submit }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white/60 dark:bg-gray-800/60 backdrop-blur">
        <button v-if="currentStep > 1" @click="prevStep"
          class="px-5 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <i class="fas fa-chevron-left mr-2"></i> Voltar
        </button>
        <span v-else></span>

        <div class="flex items-center gap-3">
          <button v-if="currentStep < totalSteps" @click="nextStep"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-colors">
            Próximo <i class="fas fa-chevron-right ml-2"></i>
          </button>

          <button v-else :disabled="isSubmitting" @click="submitEdit"
            class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-70 text-white rounded-lg font-semibold shadow transition-colors">
            <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
            {{ isSubmitting ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
