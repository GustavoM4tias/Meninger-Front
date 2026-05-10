<script setup>
import { ref } from 'vue';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import { useToast } from 'vue-toastification';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({ rule: { type: Object, required: true } });
const emit = defineEmits(['close', 'saved']);

const store = useAlertStore();
const toast = useToast();

const form = ref({
  name:     props.rule.name,
  cron:     props.rule.cron,
  timezone: props.rule.timezone,
  cooldown_minutes: props.rule.cooldown_minutes ?? 0,
  channels: {
    inapp:    props.rule.channels?.inapp    !== false,
    email:    !!props.rule.channels?.email,
    whatsapp: !!props.rule.channels?.whatsapp,
  },
});
const saving = ref(false);

async function save() {
  saving.value = true;
  try {
    await store.update(props.rule.id, { ...form.value });
    toast.success('Alterações salvas.');
    emit('saved');
  } catch (e) {
    toast.error(e.message || 'Falha ao salvar.');
  } finally { saving.value = false; }
}
</script>

<template>
  <Modal :open="true" @close="emit('close')" :title="`Editar alerta`" :subtitle="rule.name" size="md">
    <div class="space-y-4">
      <Input v-model="form.name" label="Nome" />

      <Input v-model="form.cron" label="Cron"
        hint='5 campos. Ex: "0 8 * * 1" = toda segunda 8h. Mínimo 20min entre disparos.'
        placeholder="0 8 * * 1" />

      <Input v-model="form.timezone" label="Timezone" placeholder="America/Sao_Paulo" />

      <Input v-model="form.cooldown_minutes" type="number" label="Cooldown (minutos)"
        hint="Tempo mínimo entre disparos sucessivos. 0 = sem cooldown." />

      <div class="rounded-lg border border-line p-3 space-y-2">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Canais</p>
        <Switch v-model="form.channels.inapp"    size="sm" label="Sistema (sino)" />
        <Switch v-model="form.channels.email"    size="sm" label="E-mail" />
        <Switch v-model="form.channels.whatsapp" size="sm" label="WhatsApp" />
      </div>

      <div class="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
        <i class="fas fa-circle-info mr-1"></i>
        A "receita" do alerta (qual tool, filtros, formato) só pode ser alterada criando um novo via Eme.
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" @click="emit('close')">Cancelar</Button>
      <Button :loading="saving" icon="fas fa-floppy-disk" @click="save">Salvar</Button>
    </template>
  </Modal>
</template>
