<!-- src/views/Office/Marketing/Events/components/EditEventModal.vue -->
<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { updateEvent, getSelectableEnterprises } from '@/utils/Event/apiEvents';
import { getAddress } from '@/utils/Config/apiExternalBuilding';
import OrganizerPicker from './OrganizerPicker.vue';

const props = defineProps({
  event: { type: Object, required: true },
  users: { type: Array, default: () => [] }
});

const emit = defineEmits(['close']);

// ── HELPERS ──────────────────────────────────────────────────────────────────
const toLocal = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
};

const toUTC = (s) => {
  if (!s) return null;
  const full = s.length === 16 ? `${s}:00` : s;
  const [date, time] = full.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss || 0).toISOString();
};

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

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const emptyAddress = () => ({
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  zip_code: '',
});

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

// ── FORM ─────────────────────────────────────────────────────────────────────
const form = ref({
  id: props.event.id,
  title: props.event.title || '',
  description: props.event.description || '',
  eventDate: toLocal(props.event.event_date),
  tags: Array.isArray(props.event.tags) ? [...props.event.tags] : [],
  images: Array.isArray(props.event.images) ? [...props.event.images] : [],
  address: { ...emptyAddress(), ...(props.event.address || {}) },
  created_by: props.event.created_by || '',
  organizers: Array.isArray(props.event.organizers) ? [...props.event.organizers] : [],

  enterprise_id: props.event.enterprise_id ?? null,
  enterprise_name: props.event.enterprise_name || '',
  enterprise_logo: props.event.enterprise_logo || '',
});

// ── UI STATE ─────────────────────────────────────────────────────────────────
const isSubmitting = ref(false);
const errors = ref({});
const titleRef = ref(null);
const openSections = ref({ location: false, media: false, organizers: false });
const toggle = (k) => { openSections.value[k] = !openSections.value[k]; };

// ── ENTERPRISES ──────────────────────────────────────────────────────────────
const enterprises = ref([]);
const loadingEnterprises = ref(false);
const enterpriseSearch = ref(props.event.enterprise_name || '');
const showEnterpriseResults = ref(false);

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

const syncEnterpriseFromInitialEvent = () => {
  if (!form.value.enterprise_id) return;

  const found = enterprises.value.find(
    (enterprise) => String(enterprise.idempreendimento) === String(form.value.enterprise_id)
  );

  if (!found) return;

  form.value.enterprise_name = found.nome || form.value.enterprise_name || '';
  form.value.enterprise_logo = found.logo || form.value.enterprise_logo || '';

  if (!enterpriseSearch.value) {
    enterpriseSearch.value = found.nome || '';
  }
};

const selectEnterprise = (enterprise) => {
  form.value.enterprise_id = enterprise?.idempreendimento ?? null;
  form.value.enterprise_name = enterprise?.nome || '';
  form.value.enterprise_logo = enterprise?.logo || '';
  form.value.address = mapEnterpriseAddress(enterprise);

  enterpriseSearch.value = enterprise?.nome || '';
  showEnterpriseResults.value = false;
};

const clearEnterprise = () => {
  form.value.enterprise_id = null;
  form.value.enterprise_name = '';
  form.value.enterprise_logo = '';
  enterpriseSearch.value = '';
  showEnterpriseResults.value = false;
};

const onEnterpriseInputFocus = () => {
  showEnterpriseResults.value = true;
};

const onEnterpriseInputBlur = () => {
  setTimeout(() => {
    showEnterpriseResults.value = false;
  }, 120);
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

function weekday(t) {
  const d = new Date();
  d.setDate(d.getDate() + ((t - d.getDay() + 7) % 7 || 7));
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
  const t = newTag.value.trim();
  if (t && !form.value.tags.includes(t)) {
    form.value.tags.push(t);
    newTag.value = '';
  }
};

const removeTag = (i) => form.value.tags.splice(i, 1);

// ── IMAGES ───────────────────────────────────────────────────────────────────
const newImg = ref('');

const addImg = () => {
  const u = newImg.value.trim();
  if (u && !form.value.images.includes(u)) {
    form.value.images.push(u);
    newImg.value = '';
  }
};

const removeImg = (i) => form.value.images.splice(i, 1);

// ── CEP ──────────────────────────────────────────────────────────────────────
const loadingCep = ref(false);

const maskedCep = computed({
  get() {
    const r = (form.value.address.zip_code || '').replace(/\D/g, '').slice(0, 8);
    return r.length > 5 ? `${r.slice(0, 5)}-${r.slice(5)}` : r;
  },
  set(v) {
    form.value.address.zip_code = (v || '').replace(/\D/g, '').slice(0, 8);
  }
});

watch(() => form.value.address.zip_code, async (cep) => {
  const c = (cep || '').replace(/\D/g, '');

  if (c.length === 8) {
    loadingCep.value = true;
    try {
      const d = await getAddress(c);
      Object.assign(form.value.address, {
        street: d.logradouro || form.value.address.street || '',
        neighborhood: d.bairro || form.value.address.neighborhood || '',
        city: d.localidade || form.value.address.city || '',
        state: d.uf || form.value.address.state || '',
      });
    } catch (e) {
      // silent
    } finally {
      loadingCep.value = false;
    }
  } else if (c.length === 0) {
    form.value.address.zip_code = '';
  }
});

// ── VALIDATE / SUBMIT ────────────────────────────────────────────────────────
const validate = () => {
  errors.value = {};
  if (!form.value.title.trim()) errors.value.title = 'Obrigatório';
  if (!form.value.eventDate) errors.value.eventDate = 'Obrigatório';
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
      eventDate: toUTC(form.value.eventDate),
    };

    if ((!payload.images || payload.images.length === 0) && payload.enterprise_logo) {
      payload.images = [payload.enterprise_logo];
    }

    await updateEvent(payload);
    emit('close');
  } catch (e) {
    errors.value.submit = 'Erro ao salvar alterações.';
  } finally {
    isSubmitting.value = false;
  }
};

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
const onKey = (e) => {
  if (e.key === 'Escape') emit('close');
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
};

onMounted(async () => {
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';

  await nextTick();
  titleRef.value?.focus();

  loadingEnterprises.value = true;
  try {
    const result = await getSelectableEnterprises();
    enterprises.value = Array.isArray(result) ? result : [];
    syncEnterpriseFromInitialEvent();
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

// ── TOKENS ───────────────────────────────────────────────────────────────────
const b = 'w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder:text-gray-400';
const inp = `${b} border-gray-200 dark:border-gray-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15`;
const inpE = `${b} border-red-400 bg-red-50 dark:bg-red-900/10 focus:ring-2 focus:ring-red-400/20`;
const lbl = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';
</script>

<template>
  <div class="fixed inset-0 z-[60] flex justify-end" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />

    <div class="relative h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
      style="animation:slideIn .22s cubic-bezier(.4,0,.2,1)">
      <!-- HEADER -->
      <div
        class="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-amber-500 grid place-items-center shrink-0">
            <i class="fas fa-pen text-white text-xs"></i>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white leading-none">Editar Evento</h2>
            <p class="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{{ form.title || 'sem título' }}</p>
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
                      class="fas fa-check text-xs text-amber-500 mt-1 shrink-0"></i>
                  </div>
                </button>
              </div>

              <div v-else class="px-4 py-3 text-sm text-gray-400">
                Nenhum empreendimento encontrado.
              </div>
            </div>
          </div>

          <div v-if="selectedEnterprise"
            class="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 px-4 py-3">
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

                  <p class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Endereço preenchido automaticamente. Você ainda pode editar abaixo.
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
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'">
              {{ qd.label }}
            </button>
          </div>

          <input v-model="form.eventDate" type="datetime-local" :class="errors.eventDate ? inpE : inp" />

          <p v-if="form.eventDate" class="text-xs text-amber-600 dark:text-amber-400 capitalize">
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
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-gray-400 resize-none transition" />
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
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
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
                  class="fas fa-spinner fa-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-400 text-xs"></i>
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
              Sem imagens anexadas. Ao salvar, a logo do empreendimento será usada automaticamente.
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

            <p v-else class="text-xs text-gray-400">Sem imagens.</p>
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
            <OrganizerPicker v-model="form.organizers" :users="props.users" />
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
          class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-sm transition">
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin text-xs"></i>
          <i v-else class="fas fa-check text-xs"></i>
          {{ isSubmitting ? 'Salvando...' : 'Salvar Alterações' }}
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