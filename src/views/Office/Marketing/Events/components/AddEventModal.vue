<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { addEvent, getSelectableEnterprises } from '@/utils/Event/apiEvents';
import { getAddress } from '@/utils/Config/apiExternalBuilding';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import OrganizerPicker from './OrganizerPicker.vue';
import NotifyToPicker from './NotifyToPicker.vue';

const authStore = useAuthStore();
const emit = defineEmits(['close']);

const emptyAddress = () => ({
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  zip_code: '',
});

const form = ref({
  title: '',
  eventDate: '',
  description: '',
  tags: [],
  images: [],
  address: emptyAddress(),
  created_by: authStore.user?.username || '',
  organizers: [],
  notify_to: { users: [], positions: [], emails: [] },
  notification: false,

  enterprise_id: null,
  enterprise_name: '',
  enterprise_logo: '',
});

const isSubmitting = ref(false);
const errors = ref({});
const titleRef = ref(null);
const openSections = ref({ location: false, media: false, organizers: false });
const toggle = (k) => { openSections.value[k] = !openSections.value[k]; };

// ── ENTERPRISES ──────────────────────────────────────────────────────────────
const enterprises = ref([]);
const loadingEnterprises = ref(false);
const enterpriseSearch = ref('');
const showEnterpriseResults = ref(false);

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const stateMap = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const normalizeState = (enterprise) => {
  const sigla = String(enterprise?.sigla || '').trim();
  if (sigla) return sigla.toUpperCase();

  const estado = normalizeText(enterprise?.estado || '');
  return stateMap[estado] || String(enterprise?.estado || '').toUpperCase();
};

const mapEnterpriseAddress = (enterprise) => ({
  street: enterprise?.endereco_emp || enterprise?.logradouro || enterprise?.endereco || '',
  number: enterprise?.numero || '',
  neighborhood: enterprise?.bairro || '',
  city: enterprise?.cidade || '',
  state: normalizeState(enterprise),
  zip_code: String(enterprise?.cep || '').replace(/\D/g, '').slice(0, 8),
});

const filteredEnterprises = computed(() => {
  const q = normalizeText(enterpriseSearch.value);

  if (!q) return enterprises.value.slice(0, 8);

  return enterprises.value
    .filter((enterprise) => {
      const haystack = normalizeText([
        enterprise.nome,
        enterprise.cidade,
        enterprise.estado,
        enterprise.bairro,
        enterprise.idempreendimento_int,
        enterprise.endereco,
        enterprise.endereco_emp,
      ].filter(Boolean).join(' '));

      return haystack.includes(q);
    })
    .slice(0, 8);
});

const selectedEnterprise = computed(() => {
  if (!form.value.enterprise_id) return null;

  return enterprises.value.find(
    (enterprise) => String(enterprise.idempreendimento) === String(form.value.enterprise_id)
  ) || null;
});

const selectEnterprise = (enterprise) => {
  form.value.enterprise_id = enterprise?.idempreendimento ?? null;
  form.value.enterprise_name = enterprise?.nome || '';
  form.value.enterprise_logo = enterprise?.logo || '';
  form.value.address = mapEnterpriseAddress(enterprise);

  enterpriseSearch.value = enterprise?.nome || '';
  showEnterpriseResults.value = false;

  if (errors.value.enterprise_id) {
    delete errors.value.enterprise_id;
  }
};

const clearEnterprise = () => {
  form.value.enterprise_id = null;
  form.value.enterprise_name = '';
  form.value.enterprise_logo = '';
  enterpriseSearch.value = '';
  showEnterpriseResults.value = false;
};

// ── QUICK DATES ──────────────────────────────────────────────────────────────
const quickDates = [
  { label: 'Hoje', getValue: () => localISO(offset(0)) },
  { label: 'Amanhã', getValue: () => localISO(offset(1)) },
  { label: 'Próx. seg', getValue: () => localISO(weekday(1)) },
  { label: 'Próx. sáb', getValue: () => localISO(weekday(6)) },
];

function offset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function weekday(targetDay) {
  const d = new Date();
  d.setDate(d.getDate() + ((targetDay - d.getDay() + 7) % 7 || 7));
  return d;
}

function localISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`;
}

const applyQuick = (qd) => {
  form.value.eventDate = qd.getValue();
};

// ── TAGS ─────────────────────────────────────────────────────────────────────
const newTag = ref('');

const addTag = () => {
  const tag = newTag.value.trim();

  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag);
    newTag.value = '';
  }
};

const removeTag = (index) => form.value.tags.splice(index, 1);

// ── IMAGES ───────────────────────────────────────────────────────────────────
const newImg = ref('');

const addImg = () => {
  const url = newImg.value.trim();

  if (url && !form.value.images.includes(url)) {
    form.value.images.push(url);
    newImg.value = '';
  }
};

const removeImg = (index) => form.value.images.splice(index, 1);

// ── CEP ──────────────────────────────────────────────────────────────────────
const loadingCep = ref(false);

const maskedCep = computed({
  get() {
    const raw = (form.value.address.zip_code || '').replace(/\D/g, '').slice(0, 8);
    return raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
  },
  set(value) {
    form.value.address.zip_code = (value || '').replace(/\D/g, '').slice(0, 8);
  }
});

watch(() => form.value.address.zip_code, async (cep) => {
  const cleanCep = (cep || '').replace(/\D/g, '');

  if (cleanCep.length === 8) {
    loadingCep.value = true;

    try {
      const data = await getAddress(cleanCep);
      Object.assign(form.value.address, {
        street: data.logradouro || form.value.address.street || '',
        neighborhood: data.bairro || form.value.address.neighborhood || '',
        city: data.localidade || form.value.address.city || '',
        state: data.uf || form.value.address.state || '',
      });
    } catch (error) {
      // silent
    } finally {
      loadingCep.value = false;
    }
  } else if (cleanCep.length === 0) {
    form.value.address.zip_code = '';
  }
});

// ── VALIDATE / SUBMIT ────────────────────────────────────────────────────────
const validate = () => {
  errors.value = {};

  if (!form.value.title.trim()) errors.value.title = 'Obrigatório';
  if (!form.value.eventDate) errors.value.eventDate = 'Obrigatório';

  if (form.value.notification) {
    const { users = [], positions = [], emails = [] } = form.value.notify_to;

    if (users.length + positions.length + emails.length === 0) {
      errors.value.notify_to = 'Selecione ao menos um destinatário.';
    }
  }

  return !Object.keys(errors.value).length;
};

const submit = async () => {
  if (!validate()) return;

  isSubmitting.value = true;

  try {
    const payload = {
      ...form.value,
      address: { ...form.value.address },
      tags: [...form.value.tags],
      images: [...form.value.images],
      organizers: [...form.value.organizers],
      notify_to: {
        users: [...(form.value.notify_to?.users || [])],
        positions: [...(form.value.notify_to?.positions || [])],
        emails: [...(form.value.notify_to?.emails || [])],
      },
    };

    if ((!payload.images || payload.images.length === 0) && payload.enterprise_logo) {
      payload.images = [payload.enterprise_logo];
    }

    if (payload.eventDate) {
      payload.eventDate = new Date(payload.eventDate).toISOString();
    }

    await addEvent(payload);
    emit('close');
  } catch (error) {
    errors.value.submit = 'Erro ao criar evento.';
  } finally {
    isSubmitting.value = false;
  }
};

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
const onKey = (e) => {
  if (e.key === 'Escape') emit('close');
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
};

const onEnterpriseInputFocus = () => {
  showEnterpriseResults.value = true;
};

const onEnterpriseInputBlur = () => {
  setTimeout(() => {
    showEnterpriseResults.value = false;
  }, 120);
};

onMounted(async () => {
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';

  await nextTick();
  titleRef.value?.focus();

  if (!authStore.users?.length) {
    await authStore.getAllUsers();
  }

  loadingEnterprises.value = true;
  try {
    const result = await getSelectableEnterprises();
    enterprises.value = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Erro ao carregar empreendimentos:', error);
  } finally {
    loadingEnterprises.value = false;
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});

const fmtDate = (iso) => {
  if (!iso) return '';

  const d = new Date(iso);

  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' • ' + d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ── TOKENS ───────────────────────────────────────────────────────────────────
const base = 'w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder:text-gray-400';
const inp = `${base} border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15`;
const inpE = `${base} border-red-400 bg-red-50 dark:bg-red-900/10 focus:ring-2 focus:ring-red-400/20`;
const lbl = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />

    <div class="relative h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
      style="animation: slideIn .22s cubic-bezier(.4,0,.2,1)">
      <!-- HEADER -->
      <div
        class="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-600 grid place-items-center shrink-0">
            <i class="fas fa-calendar-plus text-white text-xs"></i>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white leading-none">Novo Evento</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              <kbd class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono">⌘ Enter</kbd>
              para salvar
            </p>
          </div>
        </div>

        <button @click="$emit('close')"
          class="w-8 h-8 rounded-lg grid place-items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <i class="fas fa-times text-sm"></i>
        </button>
      </div>

      <!-- BODY -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <!-- TÍTULO -->
        <div class="space-y-1.5">
          <label :class="lbl">Título <span class="text-red-400">*</span></label>
          <input ref="titleRef" v-model="form.title" type="text" placeholder="Nome do evento..."
            :class="errors.title ? inpE : inp" />
          <p v-if="errors.title" class="text-xs text-red-500">{{ errors.title }}</p>
        </div>

        <!-- EMPREENDIMENTO -->
        <div class="space-y-2">
          <label :class="lbl">Empreendimento</label>

          <div class="relative">
            <input v-model="enterpriseSearch" type="text" placeholder="Buscar empreendimento por nome, cidade ou bairro"
              :class="inp" @focus="onEnterpriseInputFocus" @blur="onEnterpriseInputBlur" />

            <div v-if="showEnterpriseResults"
              class="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
              <div v-if="loadingEnterprises" class="px-4 py-3 text-sm text-gray-400">
                Carregando empreendimentos...
              </div>

              <div v-else-if="filteredEnterprises.length" class="max-h-64 overflow-y-auto">
                <button v-for="enterprise in filteredEnterprises" :key="enterprise.idempreendimento" type="button"
                  @mousedown.prevent="selectEnterprise(enterprise)"
                  class="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ enterprise.nome }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {{ enterprise.cidade || 'Sem cidade' }}
                        <span v-if="enterprise.estado"> - {{ enterprise.estado }}</span>
                        <span v-if="enterprise.bairro"> • {{ enterprise.bairro }}</span>
                      </p>
                    </div>

                    <i v-if="String(form.enterprise_id) === String(enterprise.idempreendimento)"
                      class="fas fa-check text-xs text-blue-600 mt-1 shrink-0"></i>
                  </div>
                </button>
              </div>

              <div v-else class="px-4 py-3 text-sm text-gray-400">
                Nenhum empreendimento encontrado.
              </div>
            </div>
          </div>

          <div v-if="selectedEnterprise"
            class="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-900/10 px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0">
                <img v-if="selectedEnterprise.logo" :src="selectedEnterprise.logo" alt="Logo empreendimento"
                  class="w-12 h-12 rounded-xl object-cover bg-white border border-gray-200 dark:border-gray-700 shrink-0" />

                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ selectedEnterprise.nome }}
                  </p>

                  <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {{ selectedEnterprise.endereco_emp || selectedEnterprise.endereco || 'Endereço não informado' }}
                    <span v-if="selectedEnterprise.numero">, {{ selectedEnterprise.numero }}</span>
                    <span v-if="selectedEnterprise.bairro"> • {{ selectedEnterprise.bairro }}</span>
                    <span v-if="selectedEnterprise.cidade"> • {{ selectedEnterprise.cidade }}</span>
                    <span v-if="selectedEnterprise.estado">/{{ selectedEnterprise.estado }}</span>
                  </p>

                  <p class="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                    Endereço preenchido automaticamente. Se quiser, você ainda pode editar abaixo.
                  </p>
                </div>
              </div>

              <button type="button" @click="clearEnterprise"
                class="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-gray-400 hover:text-red-500 hover:bg-white/70 dark:hover:bg-gray-800 transition"
                title="Remover empreendimento">
                <i class="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- DATA + ATALHOS -->
        <div class="space-y-1.5">
          <label :class="lbl">Data &amp; Hora <span class="text-red-400">*</span></label>

          <div class="flex flex-wrap gap-1.5">
            <button v-for="qd in quickDates" :key="qd.label" type="button" @click="applyQuick(qd)"
              class="px-2.5 py-1 rounded-lg text-xs font-medium border transition"
              :class="form.eventDate === qd.getValue()
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'">
              {{ qd.label }}
            </button>
          </div>

          <input v-model="form.eventDate" type="datetime-local" :class="errors.eventDate ? inpE : inp" />

          <p v-if="form.eventDate" class="text-xs text-blue-600 dark:text-blue-400 capitalize">
            <i class="fas fa-calendar-check mr-1 opacity-60"></i>{{ fmtDate(form.eventDate) }}
          </p>

          <p v-if="errors.eventDate" class="text-xs text-red-500">{{ errors.eventDate }}</p>
        </div>

        <!-- DESCRIÇÃO -->
        <div class="space-y-1.5">
          <label :class="lbl">
            Descrição
            <span class="text-gray-400 font-normal normal-case text-xs">(opcional)</span>
          </label>

          <textarea v-model="form.description" rows="3" placeholder="Detalhes, público-alvo, programação..."
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 placeholder:text-gray-400 resize-none transition" />
        </div>

        <!-- TAGS -->
        <div class="space-y-1.5">
          <label :class="lbl">
            Tags
            <span class="text-gray-400 font-normal normal-case text-xs">(Enter para adicionar)</span>
          </label>

          <input v-model="newTag" type="text" placeholder="Ex: Workshop, Lançamento..." @keydown.enter.prevent="addTag"
            :class="inp" />

          <div v-if="form.tags.length" class="flex flex-wrap gap-1.5 pt-0.5">
            <span v-for="(tag, i) in form.tags" :key="i"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {{ tag }}
              <button @click="removeTag(i)" class="hover:text-red-500 transition leading-none">
                <i class="fas fa-times text-[10px]"></i>
              </button>
            </span>
          </div>
        </div>

        <!-- LOCALIZAÇÃO -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button type="button" @click="toggle('location')"
            class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <span class="flex items-center gap-2">
              <i class="fas fa-map-marker-alt text-xs text-gray-400"></i>
              Localização
              <span v-if="form.address.city" class="text-xs font-normal text-gray-400">
                — {{ form.address.city }}<span v-if="form.address.state">/{{ form.address.state }}</span>
              </span>
            </span>

            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': openSections.location }"></i>
          </button>

          <div v-show="openSections.location"
            class="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div class="space-y-1.5">
              <label :class="lbl">CEP</label>
              <div class="relative">
                <input v-model="maskedCep" type="text" inputmode="numeric" maxlength="9" placeholder="00000-000"
                  :class="inp" />
                <i v-if="loadingCep"
                  class="fas fa-spinner fa-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs"></i>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2 space-y-1.5">
                <label :class="lbl">Cidade</label>
                <input v-model="form.address.city" type="text" placeholder="Cidade" :class="inp" />
              </div>

              <div class="space-y-1.5">
                <label :class="lbl">UF</label>
                <input v-model="form.address.state" type="text" maxlength="2" placeholder="SP"
                  :class="inp + ' uppercase'" />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2 space-y-1.5">
                <label :class="lbl">Rua</label>
                <input v-model="form.address.street" type="text" placeholder="Logradouro" :class="inp" />
              </div>

              <div class="space-y-1.5">
                <label :class="lbl">Nº</label>
                <input v-model="form.address.number" type="text" placeholder="123" :class="inp" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label :class="lbl">Bairro</label>
              <input v-model="form.address.neighborhood" type="text" placeholder="Bairro" :class="inp" />
            </div>
          </div>
        </div>

        <!-- IMAGENS -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button type="button" @click="toggle('media')"
            class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <span class="flex items-center gap-2">
              <i class="fas fa-images text-xs text-gray-400"></i>
              Imagens
              <span v-if="form.images.length" class="text-xs font-normal text-gray-400">
                — {{ form.images.length }} adicionada{{ form.images.length > 1 ? 's' : '' }}
              </span>
            </span>

            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': openSections.media }"></i>
          </button>

          <div v-show="openSections.media"
            class="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div class="flex gap-2">
              <input v-model="newImg" type="url" placeholder="URL da imagem..." @keydown.enter.prevent="addImg"
                :class="inp + ' flex-1'" />

              <button type="button" @click="addImg"
                class="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition shrink-0">
                <i class="fas fa-plus text-xs"></i>
              </button>
            </div>

            <p v-if="!form.images.length && form.enterprise_logo" class="text-xs text-gray-500 dark:text-gray-400">
              Nenhuma imagem anexada. Ao salvar, a logo do empreendimento será usada automaticamente.
            </p>

            <div v-if="form.images.length" class="grid grid-cols-3 gap-2">
              <div v-for="(img, i) in form.images" :key="i"
                class="relative group rounded-lg overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                <img :src="img" class="w-full h-full object-cover" />
                <button @click="removeImg(i)"
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition">
                  <i class="fas fa-times text-[9px]"></i>
                </button>
              </div>
            </div>

            <p v-else class="text-xs text-gray-400">Nenhuma imagem adicionada.</p>
          </div>
        </div>

        <!-- ORGANIZADORES -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button type="button" @click="toggle('organizers')"
            class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <span class="flex items-center gap-2">
              <i class="fas fa-people-group text-xs text-gray-400"></i>
              Organizadores
              <span v-if="form.organizers.length" class="text-xs font-normal text-gray-400">
                — {{ form.organizers.length }}
              </span>
            </span>

            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': openSections.organizers }"></i>
          </button>

          <div v-show="openSections.organizers" class="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800">
            <OrganizerPicker v-model="form.organizers" :users="authStore.users" />
          </div>
        </div>

        <!-- NOTIFICAÇÃO -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3">
            <span class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <i class="fas fa-bell text-xs text-gray-400"></i>
              Notificação
            </span>

            <button type="button" @click="form.notification = !form.notification" :class="[
              'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer',
              form.notification ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            ]">
              <span :class="[
                'block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                form.notification ? 'translate-x-4' : 'translate-x-0'
              ]"></span>
            </button>
          </div>

          <div v-show="form.notification"
            class="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <NotifyToPicker v-model="form.notify_to" :users="authStore.users" />
            <p v-if="errors.notify_to" class="text-xs text-red-500">{{ errors.notify_to }}</p>
          </div>
        </div>

        <p v-if="errors.submit" class="text-xs text-red-500 text-center">{{ errors.submit }}</p>
      </div>

      <!-- FOOTER -->
      <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <button @click="$emit('close')"
          class="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          Cancelar
        </button>

        <button @click="submit" :disabled="isSubmitting"
          class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-sm transition">
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin text-xs"></i>
          <i v-else class="fas fa-check text-xs"></i>
          {{ isSubmitting ? 'Criando...' : 'Criar Evento' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>