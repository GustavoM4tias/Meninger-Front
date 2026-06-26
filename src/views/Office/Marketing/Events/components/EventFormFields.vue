<script setup>
import { ref, computed, onMounted } from 'vue';
import OrganizerPicker from './OrganizerPicker.vue';
import NotifyToPicker from './NotifyToPicker.vue';
import AttachmentPicker from '@/views/Office/Comercial/Conditions/components/AttachmentPicker.vue';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useEnterpriseSearch, mapEnterpriseAddress } from '../composables/useEnterpriseSearch';
import { useCepLookup } from '../composables/useCepLookup';

import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import Spinner from '@/components/UI/Spinner.vue';

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  users: { type: Array, default: () => [] },
});

const titleRef = ref(null);
defineExpose({ focusTitle: () => titleRef.value?.$el?.querySelector('input')?.focus() });

const microsoftStore = useMicrosoftStore();

// ── Enterprise ───────────────────────────────────────
const ent = useEnterpriseSearch();
ent.search.value = props.form.enterprise_name || '';

const selectedEnterprise = computed(() => {
  if (!props.form.enterprise_id) return null;
  return ent.findById(props.form.enterprise_id);
});

function selectEnterprise(e) {
  props.form.enterprise_id = e?.idempreendimento ?? null;
  props.form.enterprise_name = e?.nome || '';
  props.form.enterprise_logo = e?.logo || '';
  props.form.address = mapEnterpriseAddress(e);
  ent.search.value = e?.nome || '';
  ent.showResults.value = false;
  if (props.errors.enterprise_id) delete props.errors.enterprise_id;
}

function clearEnterprise() {
  props.form.enterprise_id = null;
  props.form.enterprise_name = '';
  props.form.enterprise_logo = '';
  ent.search.value = '';
  ent.showResults.value = false;
}

// ── CEP ──────────────────────────────────────────────
const addressRef = computed(() => props.form.address);
const cep = useCepLookup(addressRef);

// ── Quick dates ──────────────────────────────────────
function offset(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function weekday(target) {
  const d = new Date();
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
  return d;
}
function localISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`;
}
const quickDates = [
  { label: 'Hoje',       getValue: () => localISO(offset(0)) },
  { label: 'Amanhã',     getValue: () => localISO(offset(1)) },
  { label: 'Próx. seg',  getValue: () => localISO(weekday(1)) },
  { label: 'Próx. sáb',  getValue: () => localISO(weekday(6)) },
];
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    + ' • ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// ── Tags ─────────────────────────────────────────────
const newTag = ref('');
function addTag() {
  const t = newTag.value.trim();
  if (t && !props.form.tags.includes(t)) {
    props.form.tags.push(t);
    newTag.value = '';
  }
}
function removeTag(i) { props.form.tags.splice(i, 1); }

// ── Images ───────────────────────────────────────────
// Usa o AttachmentPicker padrão (URL / envio do PC / SharePoint). O arquivo enviado vai
// para o Supabase Storage (não para o banco) e é comprimido antes de subir (compress-images),
// evitando lotar o storage. referenceId: id do evento (edição) ou um token de rascunho (criação).
const draftRef = `event-draft-${Date.now()}`;
const uploadRefId = computed(() => props.form.id || draftRef);

const newImg = ref('');
const imgError = ref('');

function addImg() {
  const u = newImg.value.trim();
  if (!u) return;
  // Bloqueia data: URI (base64) — encheria a coluna JSON do banco. Use "Enviar arquivo" ou um link.
  if (/^data:/i.test(u)) {
    imgError.value = 'Imagens em base64 (data:) não são aceitas. Use "Enviar arquivo" ou cole um link.';
    return;
  }
  imgError.value = '';
  if (!props.form.images.includes(u)) props.form.images.push(u);
  newImg.value = '';
}
function removeImg(i) { props.form.images.splice(i, 1); }

// Vindo do AttachmentPicker (upload/URL/SharePoint): URL completa = adiciona na hora.
// Digitação parcial não casa http(s):// — aí espera o botão "Adicionar".
function onImgPicked(url) {
  newImg.value = url || '';
  if (/^https?:\/\/\S+\.\S+/i.test((url || '').trim())) addImg();
}

// ── Sections ─────────────────────────────────────────
const sections = ref({ location: false, media: false, organizers: false });

// Helper para fechar a lista de empreendimentos com leve atraso (deixa o click dar tempo de selecionar)
function delayedHideEnterpriseResults() {
  window.setTimeout(() => { ent.showResults.value = false; }, 120);
}

// Garante que a aba SharePoint do AttachmentPicker apareça (depende do status MS).
onMounted(() => { if (!microsoftStore.connected) microsoftStore.fetchStatus?.(); });
</script>

<template>
  <div class="space-y-5">
    <!-- TÍTULO -->
    <Input ref="titleRef" v-model="form.title" label="Título" required
      placeholder="Nome do evento..." :error="errors.title" />

    <!-- EMPREENDIMENTO -->
    <div class="space-y-2">
      <label class="block text-xs font-medium text-ink-muted">Empreendimento</label>
      <div class="relative">
        <Input v-model="ent.search.value"
          placeholder="Buscar por nome, cidade ou bairro"
          iconLeft="fas fa-magnifying-glass"
          @focus="ent.showResults.value = true"
          @blur="delayedHideEnterpriseResults" />

        <div v-if="ent.showResults.value"
          class="absolute z-20 mt-1 w-full rounded-lg border border-line bg-surface-overlay shadow-elevated overflow-hidden">
          <div v-if="ent.loading.value" class="px-4 py-4 text-sm text-ink-subtle flex items-center gap-2">
            <Spinner size="sm" /> Carregando empreendimentos...
          </div>
          <div v-else-if="ent.filtered.value.length" class="max-h-64 overflow-y-auto divide-y divide-line">
            <button v-for="e in ent.filtered.value" :key="e.idempreendimento" type="button"
              @mousedown.prevent="selectEnterprise(e)"
              class="w-full px-4 py-3 text-left hover:bg-accent-soft/40 transition-colors">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink truncate">{{ e.nome }}</p>
                  <p class="text-xs text-ink-muted truncate">
                    {{ e.cidade || 'Sem cidade' }}<span v-if="e.estado"> · {{ e.estado }}</span>
                    <span v-if="e.bairro"> · {{ e.bairro }}</span>
                  </p>
                </div>
                <i v-if="String(form.enterprise_id) === String(e.idempreendimento)"
                  class="fas fa-check text-accent text-xs mt-1 shrink-0"></i>
              </div>
            </button>
          </div>
          <div v-else class="px-4 py-4 text-sm text-ink-subtle">Nenhum empreendimento encontrado.</div>
        </div>
      </div>

      <div v-if="selectedEnterprise"
        class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3.5 py-3">
        <div class="flex items-start gap-3">
          <img v-if="selectedEnterprise.logo" :src="selectedEnterprise.logo" alt="logo"
            class="w-12 h-12 rounded-lg object-cover bg-surface border border-line shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink truncate">{{ selectedEnterprise.nome }}</p>
            <p class="text-xs text-ink-muted leading-relaxed">
              {{ selectedEnterprise.endereco_emp || selectedEnterprise.endereco || 'Endereço não informado' }}
              <span v-if="selectedEnterprise.numero">, {{ selectedEnterprise.numero }}</span>
              <span v-if="selectedEnterprise.bairro"> · {{ selectedEnterprise.bairro }}</span>
              <span v-if="selectedEnterprise.cidade"> · {{ selectedEnterprise.cidade }}</span>
              <span v-if="selectedEnterprise.estado">/{{ selectedEnterprise.estado }}</span>
            </p>
            <p class="text-[11px] text-accent mt-1">
              Endereço preenchido automaticamente. Você ainda pode editar abaixo.
            </p>
          </div>
          <button type="button" @click="clearEnterprise"
            class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
            title="Remover">
            <i class="fas fa-xmark text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- DATA + ATALHOS -->
    <div class="space-y-1.5">
      <label class="block text-xs font-medium text-ink-muted">Data &amp; Hora <span class="text-red-500">*</span></label>

      <div class="flex flex-wrap gap-1.5">
        <button v-for="qd in quickDates" :key="qd.label" type="button" @click="form.eventDate = qd.getValue()"
          class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
          :class="form.eventDate === qd.getValue()
            ? 'bg-accent text-white border-accent'
            : 'bg-surface-raised border-line text-ink-muted hover:border-accent/40 hover:text-accent'">
          {{ qd.label }}
        </button>
      </div>

      <Input v-model="form.eventDate" type="datetime-local" :error="errors.eventDate" />

      <p v-if="form.eventDate" class="text-xs text-accent capitalize flex items-center gap-1.5">
        <i class="far fa-calendar-check"></i>{{ fmtDate(form.eventDate) }}
      </p>
    </div>

    <!-- DESCRIÇÃO -->
    <div class="space-y-1.5">
      <label class="block text-xs font-medium text-ink-muted">
        Descrição <span class="text-ink-subtle font-normal">(opcional)</span>
      </label>
      <textarea v-model="form.description" rows="3" placeholder="Detalhes, público-alvo, programação..."
        class="w-full px-3.5 py-2 text-sm bg-surface-raised text-ink border border-line rounded-lg
               placeholder:text-ink-subtle outline-none resize-none transition-all
               shadow-inner-soft
               focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20" />
    </div>

    <!-- TAGS -->
    <div class="space-y-1.5">
      <label class="block text-xs font-medium text-ink-muted">
        Tags <span class="text-ink-subtle font-normal">(Enter para adicionar)</span>
      </label>
      <Input v-model="newTag" placeholder="Ex: Workshop, Lançamento..."
        @keydown.enter.prevent="addTag" />

      <div v-if="form.tags.length" class="flex flex-wrap gap-1.5">
        <span v-for="(tag, i) in form.tags" :key="i"
          class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs rounded-md
                 bg-accent-soft text-accent border border-accent/20">
          {{ tag }}
          <button type="button" @click="removeTag(i)"
            class="h-4 w-4 grid place-items-center rounded hover:bg-accent/20 leading-none">
            <i class="fas fa-xmark text-[9px]"></i>
          </button>
        </span>
      </div>
    </div>

    <!-- LOCALIZAÇÃO -->
    <Collapsible v-model="sections.location" title="Localização" icon="fas fa-location-dot"
      :hint="form.address.city ? `${form.address.city}${form.address.state ? '/' + form.address.state : ''}` : ''">
      <div class="space-y-3">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-ink-muted">CEP</label>
          <div class="relative">
            <Input v-model="cep.masked.value" placeholder="00000-000" />
            <Spinner v-if="cep.loading.value" size="sm"
              class="absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <Input v-model="form.address.city" label="Cidade" placeholder="Cidade" class="col-span-2" />
          <Input v-model="form.address.state" label="UF" placeholder="SP" />
        </div>

        <div class="grid grid-cols-3 gap-3">
          <Input v-model="form.address.street" label="Rua" placeholder="Logradouro" class="col-span-2" />
          <Input v-model="form.address.number" label="Nº" placeholder="123" />
        </div>

        <Input v-model="form.address.neighborhood" label="Bairro" placeholder="Bairro" />
      </div>
    </Collapsible>

    <!-- IMAGENS -->
    <Collapsible v-model="sections.media" title="Imagens" icon="far fa-images"
      :hint="form.images.length ? `${form.images.length} adicionada${form.images.length > 1 ? 's' : ''}` : ''">
      <div class="space-y-3">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <AttachmentPicker
              :model-value="newImg"
              @update:model-value="onImgPicked"
              upload-context="event_image"
              :reference-id="uploadRefId"
              resource-type="event"
              compress-images
              accept=".png,.jpg,.jpeg,.webp"
              upload-hint="PNG, JPG ou WEBP (comprimida ao enviar)"
              placeholder="Cole o link, envie do PC ou busque no SharePoint" />
          </div>
          <Button variant="secondary" icon="fas fa-plus" @click="addImg" :disabled="!newImg.trim()" class="shrink-0">
            Adicionar
          </Button>
        </div>

        <p v-if="imgError" class="text-xs text-red-500 flex items-center gap-1">
          <i class="fas fa-circle-exclamation"></i>{{ imgError }}
        </p>

        <p v-if="!form.images.length && form.enterprise_logo" class="text-xs text-ink-muted">
          Nenhuma imagem anexada. Ao salvar, a logo do empreendimento será usada automaticamente.
        </p>

        <div v-if="form.images.length" class="grid grid-cols-3 gap-2">
          <div v-for="(img, i) in form.images" :key="i"
            class="relative group rounded-lg overflow-hidden aspect-video bg-surface-sunken border border-line">
            <img :src="img" class="w-full h-full object-cover" />
            <button @click="removeImg(i)"
              class="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-950/70 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <i class="fas fa-xmark text-[10px]"></i>
            </button>
          </div>
        </div>
        <p v-else class="text-xs text-ink-subtle">Nenhuma imagem adicionada.</p>
      </div>
    </Collapsible>

    <!-- ORGANIZADORES -->
    <Collapsible v-model="sections.organizers" title="Organizadores" icon="fas fa-people-group"
      :hint="form.organizers.length ? `${form.organizers.length}` : ''">
      <OrganizerPicker v-model="form.organizers" :users="users" />
    </Collapsible>

    <!-- NOTIFICAÇÃO -->
    <div class="rounded-lg border border-line bg-surface-raised overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3">
        <span class="flex items-center gap-2 text-sm font-medium text-ink">
          <i class="far fa-bell text-xs text-ink-muted"></i>
          Notificação
        </span>
        <Switch v-model="form.notification" size="sm" />
      </div>

      <div v-if="form.notification" class="px-4 pb-4 pt-3 border-t border-line space-y-2">
        <NotifyToPicker v-model="form.notify_to" :users="users" />
        <p v-if="errors.notify_to" class="text-xs text-red-500 flex items-center gap-1">
          <i class="fas fa-circle-exclamation"></i>{{ errors.notify_to }}
        </p>
      </div>
    </div>
  </div>
</template>
