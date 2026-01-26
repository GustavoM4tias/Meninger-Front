<!-- src/components/Events/AddEventModal.vue -->
<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { addEvent } from '@/utils/Event/apiEvents';
import { getAddress } from '@/utils/Config/apiExternalBuilding';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import OrganizerPicker from './OrganizerPicker.vue';
import NotifyToPicker from './NotifyToPicker.vue';

const authStore = useAuthStore();
const emit = defineEmits(['close']);

// ====== FORM DATA ======
const newEvent = ref({
  title: '',
  description: '',
  eventDate: '',
  tags: [],
  images: [],
  address: {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: ''
  },
  created_by: authStore.user?.username || '',
  organizers: [],                               // [{type:'user'|'external', id?, name, email?, position?}]
  notify_to: { users: [], positions: [], emails: [] }, // ← inclui positions
  notification: false
});

// ====== UI STATE ======
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
// use sempre o length para não desincronizar
const totalSteps = computed(() => steps.length);

// ====== HELPERS ======
const formatDateTime = (isoLike) => {
  if (!isoLike) return '';
  const d = new Date(isoLike);
  const date = d.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
};

const maskedCep = computed({
  get() {
    const raw = newEvent.value.address.zip_code || '';
    const onlyDigits = raw.replace(/\D/g, '').slice(0, 8);
    if (onlyDigits.length <= 5) return onlyDigits;
    return `${onlyDigits.slice(0, 5)}-${onlyDigits.slice(5)}`;
  },
  set(v) {
    newEvent.value.address.zip_code = (v || '').replace(/\D/g, '').slice(0, 8);
  }
});

// ====== CEP AUTO-FILL ======
const isLoadingAddress = ref(false);
const fetchAddress = async (cep) => {
  if (cep.length !== 8) return;
  isLoadingAddress.value = true;
  try {
    const data = await getAddress(cep);
    newEvent.value.address.street = data.logradouro || '';
    newEvent.value.address.neighborhood = data.bairro || '';
    newEvent.value.address.city = data.localidade || '';
    newEvent.value.address.state = data.uf || '';
  } catch (error) {
    console.error('Erro ao buscar endereço:', error);
  } finally {
    isLoadingAddress.value = false;
  }
};

watch(
  () => newEvent.value.address.zip_code,
  (newCep) => {
    const cleanCep = (newCep || '').replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchAddress(cleanCep);
    } else if (cleanCep.length === 0) {
      newEvent.value.address = { street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '' };
    }
  }
);

// ====== VALIDAÇÃO POR ETAPA ======
const validateStep = (step) => {
  errors.value = {};
  switch (step) {
    case 1:
      if (!newEvent.value.title.trim()) errors.value.title = 'Título é obrigatório';
      if (!newEvent.value.description.trim()) errors.value.description = 'Descrição é obrigatória';
      if (!newEvent.value.eventDate) errors.value.eventDate = 'Data é obrigatória';
      break;
    case 2:
      if (!newEvent.value.address.zip_code) errors.value.zip_code = 'CEP é obrigatório';
      break;
    case 4:
      // se marcar notificação, exige ao menos um destino (users|positions|emails)
      if (newEvent.value.notification) {
        const { users = [], positions = [], emails = [] } = newEvent.value.notify_to || {};
        if ((users.length + positions.length + emails.length) === 0) {
          errors.value.notify_to = 'Selecione ao menos um destinatário (usuário, cargo ou e-mail).';
        }
      }
      break;
    default:
      // etapas 3 e 5 não possuem validações obrigatórias
      break;
  }
  return Object.keys(errors.value).length === 0;
};

// ====== NAVEGAÇÃO ======
const nextStep = () => {
  // valida a etapa atual antes de avançar
  if (validateStep(currentStep.value)) {
    currentStep.value = Math.min(currentStep.value + 1, totalSteps.value);
  }
};
const prevStep = () => {
  currentStep.value = Math.max(currentStep.value - 1, 1);
};

// ====== TAGS ======
const addTag = () => {
  const t = newTag.value.trim();
  if (t && !newEvent.value.tags.includes(t)) {
    newEvent.value.tags.push(t);
    newTag.value = '';
  }
};
const removeTag = (index) => newEvent.value.tags.splice(index, 1);

// ====== IMAGENS ======
const addImage = () => {
  const url = newImageUrl.value.trim();
  if (url && !newEvent.value.images.includes(url)) {
    newEvent.value.images.push(url);
    newImageUrl.value = '';
  }
};
const removeImage = (index) => newEvent.value.images.splice(index, 1);

// ====== SUBMIT ======
const submitAdd = async () => {
  // segurança: revalida obrigatórios
  if (!validateStep(1) || !validateStep(2) || !validateStep(4)) {
    // manda o usuário para a 1ª etapa com erro encontrado
    if (errors.value.title || errors.value.description || errors.value.eventDate) currentStep.value = 1;
    else if (errors.value.zip_code) currentStep.value = 2;
    else currentStep.value = 4;
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = { ...newEvent.value };
    if (payload.eventDate) {
      const d = new Date(payload.eventDate);
      payload.eventDate = d.toISOString(); // garante ISO para o backend
    }
    await addEvent(payload);
    emit('close');
  } catch (e) {
    console.error(e);
    errors.value.submit = 'Erro ao criar evento. Tente novamente.';
  } finally {
    isSubmitting.value = false;
  }
};

// ====== HOTKEY ESC ======
const handleKeydown = (event) => { if (event.key === 'Escape') emit('close'); };

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
  if (authStore.users.length === 0) {
    await authStore.getAllUsers();
  }
});
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});

// helpers para exibir nomes/cargos na revisão
const resolveUser = (id) => (authStore.users || []).find(u => u.id === id);
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- HEADER -->
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-plus text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold">Criar Novo Evento</h2>
              <p class="text-blue-100">Passo {{ currentStep }} de {{ totalSteps }}</p>
            </div>
          </div>
          <button @click="emit('close')"
            class="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- STEPS -->
        <div class="flex gap-4">
          <div v-for="step in steps" :key="step.number" :class="[
            'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300',
            currentStep >= step.number ? 'bg-white/20 text-white' : 'bg-white/5 text-blue-200'
          ]">
            <i :class="step.icon"></i>
            <span class="hidden md:block font-medium">{{ step.title }}</span>
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
        <!-- STEP 1 -->
        <div v-if="currentStep === 1" class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Informações Básicas</h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Título do Evento *</label>
              <input v-model="newEvent.title" type="text" placeholder="Digite o título do evento"
                :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors', errors.title ? 'border-red-500 focus:border-red-600' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
                class="bg-gray-50 dark:bg-gray-700 dark:text-white" />
              <p v-if="errors.title" class="text-red-500 text-sm mt-1">{{ errors.title }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data do Evento *</label>
              <input v-model="newEvent.eventDate" type="datetime-local"
                :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors', errors.eventDate ? 'border-red-500 focus:border-red-600' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
                class="bg-gray-50 dark:bg-gray-700 dark:text-white" />
              <p v-if="errors.eventDate" class="text-red-500 text-sm mt-1">{{ errors.eventDate }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição do Evento *</label>
            <textarea v-model="newEvent.description" rows="4"
              placeholder="Descreva os detalhes do evento, atividades, público-alvo, etc."
              :class="['w-full px-4 py-3 rounded-xl border-2 transition-colors resize-none', errors.description ? 'border-red-500 focus:border-red-600' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500']"
              class="bg-gray-50 dark:bg-gray-700 dark:text-white"></textarea>
            <p v-if="errors.description" class="text-red-500 text-sm mt-1">{{ errors.description }}</p>
          </div>
        </div>

        <!-- STEP 2 -->
        <div v-if="currentStep === 2" class="space-y-6">
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
              <input v-model="newEvent.address.state" type="text" placeholder="Estado"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
              <input v-model="newEvent.address.city" type="text" placeholder="Cidade"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bairro</label>
              <input v-model="newEvent.address.neighborhood" type="text" placeholder="Bairro"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rua</label>
              <input v-model="newEvent.address.street" type="text" placeholder="Nome da rua"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Número</label>
              <input v-model="newEvent.address.number" type="text" placeholder="Número"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            </div>
          </div>
        </div>

        <!-- STEP 3 -->
        <div v-if="currentStep === 3" class="space-y-6">
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

            <div v-if="newEvent.tags.length" class="flex flex-wrap gap-2">
              <span v-for="(tag, index) in newEvent.tags" :key="index"
                class="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                {{ tag }}
                <button @click="removeTag(index)" class="hover:text-red-500 transition-colors">
                  <i class="fas fa-times text-xs"></i>
                </button>
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

            <div v-if="newEvent.images.length" class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="(image, index) in newEvent.images" :key="index"
                class="relative group rounded-xl overflow-hidden">
                <img :src="image" :alt="`Imagem ${index + 1}`" class="w-full h-32 object-cover" />
                <button @click="removeImage(index)"
                  class="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Remover imagem">
                  <i class="fas fa-trash text-sm"></i>
                </button>
              </div>
            </div>

            <p v-else class="text-sm text-gray-500 dark:text-gray-300">Você ainda não adicionou imagens. (Opcional)</p>
          </div>
        </div>

        <!-- STEP 4 -->
        <div v-if="currentStep === 4" class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Organizadores e notificação</h3>

          <OrganizerPicker v-model="newEvent.organizers" :users="authStore.users" />

          <div class="flex items-center gap-3">
            <input id="notify" v-model="newEvent.notification" type="checkbox"
              class="w-5 h-5 rounded border-gray-300" />
            <label for="notify" class="text-sm text-gray-700 dark:text-gray-300">Enviar notificação para este
              evento</label>
          </div>

          <div v-if="newEvent.notification" class="mt-2">
            <NotifyToPicker v-model="newEvent.notify_to" :users="authStore.users" />
            <p v-if="errors.notify_to" class="text-red-500 text-sm mt-2">{{ errors.notify_to }}</p>
          </div>
        </div>

        <!-- STEP 5 (REVIEW) -->
        <div v-if="currentStep === 5" class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Revise os dados</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Info -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Informações</h4>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Título:</span> {{
                newEvent.title || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Quando:</span> {{
                formatDateTime(newEvent.eventDate) || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line"><span
                  class="font-medium">Descrição:</span> {{ newEvent.description || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-2"><span class="font-medium">Notificação:</span> {{
                newEvent.notification ? 'Sim' : 'Não' }}</p>
            </div>

            <!-- Local -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Local</h4>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">CEP:</span> {{ maskedCep ||
                '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-medium">Endereço:</span>
                {{ newEvent.address.street || '-' }}
                <span v-if="newEvent.address.number">, {{ newEvent.address.number }}</span>
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Bairro:</span> {{
                newEvent.address.neighborhood || '-' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-medium">Cidade/UF:</span>
                {{ newEvent.address.city || '-' }}<span v-if="newEvent.address.state">/{{ newEvent.address.state
                  }}</span>
              </p>
            </div>

            <!-- Tags & Imagens -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Tags e Imagens</h4>

              <div class="mb-3">
                <div v-if="newEvent.tags.length" class="flex flex-wrap gap-2">
                  <span v-for="(tag, i) in newEvent.tags" :key="i"
                    class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800">
                    {{ tag }}
                  </span>
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Sem tags.</p>
              </div>

              <div>
                <div v-if="newEvent.images.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <img v-for="(img, i) in newEvent.images" :key="i" :src="img"
                    class="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Sem imagens.</p>
              </div>
            </div>

            <!-- Organizadores -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Organizadores</h4>
              <div v-if="newEvent.organizers.length" class="flex flex-wrap gap-2">
                <span v-for="(o, i) in newEvent.organizers" :key="i"
                  class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-lg border text-xs flex items-center gap-2">
                  <i class="fas fa-user"></i>
                  <span class="truncate max-w-60">
                    {{ o.name }}
                    <span v-if="(o.type === 'user' ? (resolveUser(o.id)?.position || o.position) : o.position)"
                      class="opacity-70">
                      — {{ o.type === 'user' ? (resolveUser(o.id)?.position || o.position) : o.position }}
                    </span>
                    <span v-if="o.email" class="opacity-70"> ({{ o.email }})</span>
                  </span>
                </span>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-300">Nenhum organizador informado.</p>
            </div>

            <!-- Notificação -->
            <div v-if="newEvent.notification"
              class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Destinatários da notificação</h4>

              <!-- Users -->
              <div class="mb-2">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuários</p>
                <div v-if="newEvent.notify_to.users.length" class="flex flex-wrap gap-2">
                  <span v-for="uid in newEvent.notify_to.users" :key="uid"
                    class="px-2 py-1 bg-green-50 text-green-700 rounded-lg border text-xs flex items-center gap-2">
                    <i class="fas fa-user"></i>
                    <span class="truncate max-w-56">
                      {{ resolveUser(uid)?.username || ('ID ' + uid) }}
                      <span v-if="resolveUser(uid)?.position" class="opacity-70"> — {{ resolveUser(uid)?.position
                        }}</span>
                    </span>
                  </span>
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Nenhum usuário selecionado.</p>
              </div>

              <!-- Positions -->
              <div class="mb-2">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cargos</p>
                <div v-if="newEvent.notify_to.positions.length" class="flex flex-wrap gap-2">
                  <span v-for="p in newEvent.notify_to.positions" :key="p"
                    class="px-2 py-1 bg-sky-50 text-sky-700 rounded-lg border text-xs flex items-center gap-2">
                    <i class="fas fa-users"></i>{{ p }}
                  </span>
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Nenhum cargo selecionado.</p>
              </div>

              <!-- Emails -->
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">E-mails externos</p>
                <div v-if="newEvent.notify_to.emails.length" class="flex flex-wrap gap-2">
                  <span v-for="e in newEvent.notify_to.emails" :key="e"
                    class="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border text-xs flex items-center gap-2">
                    <i class="fas fa-envelope"></i>{{ e }}
                  </span>
                </div>
                <p v-else class="text-sm text-gray-500 dark:text-gray-300">Nenhum e-mail informado.</p>
              </div>
            </div>
          </div>

          <p v-if="errors.submit" class="text-red-500 text-sm mt-2">{{ errors.submit }}</p>
        </div>
      </div>

      <!-- FOOTER -->
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

          <button v-else :disabled="isSubmitting" @click="submitAdd"
            class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-70 text-white rounded-lg font-semibold shadow transition-colors">
            <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
            {{ isSubmitting ? 'Criando...' : 'Criar Evento' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
