<script setup>
// Editor de um comunicado (criar/editar). Inclui os metadados, os canais de
// notificação e o público-alvo (AudienceEditor). "Salvar e publicar" grava e já
// dispara a publicação (materializa destinatários + notifica).

import { ref, reactive, computed, watch } from 'vue';
import { useMuralAdminStore } from '@/stores/Mural/muralAdminStore';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Button from '@/components/UI/Button.vue';
import AudienceEditor from './AudienceEditor.vue';
import { KIND_OPTIONS, toLocalInput } from '@/utils/Mural/muralFormat';

const props = defineProps({
    open: { type: Boolean, default: false },
    comunicado: { type: Object, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useMuralAdminStore();
const localError = ref('');

const fieldCls = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-ring/30';
const labelCls = 'block text-xs font-medium text-ink-muted mb-1';

const isEditing = computed(() => !!props.comunicado?.id);

const form = reactive({
    title: '', body: '', kind: 'INFORMATIVO',
    requiresAck: false, pinned: false, priority: 10,
    startsAt: '', endsAt: '',
    channels: { inapp: true, email: true, whatsapp: false },
    link: '',
});
const assignments = ref([]);

function reset() {
    const c = props.comunicado;
    form.title = c?.title || '';
    form.body = c?.body || '';
    form.kind = c?.kind || 'INFORMATIVO';
    form.requiresAck = !!c?.requiresAck;
    form.pinned = !!c?.pinned;
    form.priority = c?.priority ?? 10;
    form.startsAt = toLocalInput(c?.startsAt);
    form.endsAt = toLocalInput(c?.endsAt);
    const ch = c?.channels;
    form.channels = { inapp: ch ? ch.inapp !== false : true, email: ch ? !!ch.email : true, whatsapp: false };
    form.link = c?.link || '';
    assignments.value = Array.isArray(c?.assignments)
        ? c.assignments.map((a) => ({ scopeType: a.scopeType, scopeValue: String(a.scopeValue) }))
        : [];
    localError.value = '';
}

watch(() => props.open, (v) => { if (v) reset(); });

function localToIso(s) {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function buildPayload() {
    return {
        title: form.title.trim(),
        body: form.body,
        kind: form.kind,
        requiresAck: form.requiresAck,
        pinned: form.pinned,
        priority: Number(form.priority) || 10,
        startsAt: localToIso(form.startsAt),
        endsAt: localToIso(form.endsAt),
        channels: { inapp: form.channels.inapp, email: form.channels.email, whatsapp: false },
        link: form.link?.trim() || null,
        assignments: assignments.value,
    };
}

async function save(publishAfter = false) {
    localError.value = '';
    if (!form.title.trim()) { localError.value = 'Informe um título.'; return; }
    if (publishAfter && !assignments.value.length) {
        localError.value = 'Defina ao menos um público-alvo para publicar.';
        return;
    }
    try {
        const payload = buildPayload();
        const saved = isEditing.value
            ? await store.update(props.comunicado.id, payload)
            : await store.create(payload);
        if (publishAfter && saved?.id) await store.publish(saved.id);
        emit('saved');
        emit('update:open', false);
    } catch (e) {
        localError.value = e.message || 'Erro ao salvar.';
    }
}
</script>

<template>
  <Modal
    :open="open"
    size="lg"
    :title="isEditing ? 'Editar comunicado' : 'Novo comunicado'"
    subtitle="Avisos do mural - defina o público-alvo e publique."
    @update:open="emit('update:open', $event)">

    <div class="space-y-4">
      <Input v-model="form.title" label="Título" placeholder="Ex.: Ação obrigatória aos sábados" required />

      <div>
        <label :class="labelCls">Mensagem</label>
        <textarea v-model="form.body" rows="5" :class="fieldCls"
          placeholder="Texto do comunicado (markdown curto)."></textarea>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select v-model="form.kind" :options="KIND_OPTIONS" label="Tipo" />
        <div>
          <label :class="labelCls">Início da validade</label>
          <input v-model="form.startsAt" type="datetime-local" :class="fieldCls" />
        </div>
        <div>
          <label :class="labelCls">Fim da validade</label>
          <input v-model="form.endsAt" type="datetime-local" :class="fieldCls" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Switch v-model="form.requiresAck" label="Exige ciência" />
        <Switch v-model="form.pinned" label="Fixar no topo" />
        <div class="w-28">
          <label :class="labelCls">Prioridade</label>
          <input v-model="form.priority" type="number" min="1" :class="fieldCls" />
        </div>
      </div>

      <div>
        <label :class="labelCls">Canais de notificação ao publicar</label>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Switch v-model="form.channels.inapp" size="sm" label="Sino (in-app)" />
          <Switch v-model="form.channels.email" size="sm" label="E-mail" />
          <Switch :model-value="false" size="sm" label="WhatsApp" disabled />
          <span class="text-[11px] text-ink-subtle">WhatsApp chega em fase futura.</span>
        </div>
      </div>

      <Input v-model="form.link" label="Link (opcional)" placeholder="https://…" iconLeft="fas fa-link" />

      <div>
        <label :class="labelCls">Público-alvo (responsáveis / departamentos)</label>
        <AudienceEditor v-model="assignments" />
      </div>

      <p v-if="localError" class="text-sm text-red-500"><i class="fas fa-circle-exclamation"></i> {{ localError }}</p>
    </div>

    <template #footer>
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancelar</Button>
      <Button variant="secondary" size="sm" icon="fas fa-floppy-disk" :loading="store.saving" @click="save(false)">
        Salvar rascunho
      </Button>
      <Button variant="primary" size="sm" icon="fas fa-paper-plane" :loading="store.saving" @click="save(true)">
        Salvar e publicar
      </Button>
    </template>
  </Modal>
</template>
