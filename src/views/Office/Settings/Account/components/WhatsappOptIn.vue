<script setup>
import { onMounted, ref, computed } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';

const wpp = useWhatsappStore();

const phone = ref('');
const accept = ref(false);
const error = ref('');
const success = ref('');

onMounted(async () => {
  await Promise.all([wpp.fetchSystemInfo(), wpp.fetchOpt()]);
  phone.value = wpp.opt?.phone || '';
});

const consented = computed(() => !!wpp.opt?.consented);
const systemReady = computed(() => !!wpp.systemInfo?.ready);
const systemNumber = computed(() =>
  wpp.systemInfo?.display_phone
    ? `${wpp.systemInfo.display_name ? wpp.systemInfo.display_name + ' · ' : ''}${wpp.systemInfo.display_phone}`
    : null
);

const flash = (kind, msg) => {
  if (kind === 'error') { error.value = msg; success.value = ''; }
  else { success.value = msg; error.value = ''; }
  setTimeout(() => { error.value = ''; success.value = ''; }, 4000);
};

const onOptIn = async () => {
  error.value = ''; success.value = '';
  if (!accept.value) return flash('error', 'É preciso aceitar o termo.');
  if (!/^\+?\d{10,15}$/.test(String(phone.value).replace(/[^\d+]/g, ''))) {
    return flash('error', 'Telefone inválido. Use formato com DDI (+55…).');
  }
  try {
    await wpp.optIn({ phone: phone.value, accept: accept.value });
    flash('success', 'Pronto! Você agora pode receber notificações por WhatsApp.');
  } catch (e) {
    flash('error', e.message || 'Falha ao salvar.');
  }
};

const onOptOut = async () => {
  try {
    await wpp.optOut();
    flash('success', 'Você não receberá mais notificações por WhatsApp.');
  } catch (e) {
    flash('error', e.message || 'Falha ao revogar.');
  }
};
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft surface-gradient">
    <header class="flex items-center gap-3 mb-4">
      <div class="h-9 w-9 rounded-lg grid place-items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <i class="fa-brands fa-whatsapp"></i>
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold text-ink">Notificações por WhatsApp</p>
        <p class="text-xs text-ink-muted">Receba avisos do sistema também no WhatsApp.</p>
      </div>
      <span v-if="consented"
        class="text-[11px] px-2 py-0.5 rounded-md border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
        Ativo
      </span>
    </header>

    <div v-if="wpp.loadingOpt" class="py-6 grid place-items-center"><Spinner /></div>

    <div v-else class="space-y-4">
      <!-- Caixa explicativa: deixa claro que o sistema tem o WhatsApp dele -->
      <div class="rounded-lg border border-line bg-surface-sunken/50 px-3 py-2.5 text-xs text-ink-muted">
        <p class="mb-1">
          <i class="fa-brands fa-whatsapp text-emerald-500 mr-1"></i>
          <span v-if="systemNumber">
            Você receberá mensagens do número oficial do sistema:
            <strong class="text-ink">{{ systemNumber }}</strong>.
          </span>
          <span v-else-if="!systemReady">
            O administrador ainda não configurou o WhatsApp do sistema.
          </span>
          <span v-else>
            Você receberá mensagens do número oficial do sistema.
          </span>
        </p>
        <p class="text-[11px] text-ink-subtle">
          Você só precisa informar seu telefone abaixo e aceitar o termo —
          não é necessário conectar conta nem instalar nada.
        </p>
      </div>

      <Input v-model="phone" label="Seu telefone WhatsApp"
        placeholder="+5511999999999"
        hint="Formato internacional. Exemplo: +55 11 99999-9999"
        :disabled="consented || !systemReady" />

      <Switch v-if="!consented" v-model="accept" size="sm"
        :disabled="!systemReady"
        label="Aceito receber notificações por WhatsApp do sistema"
        description="Você pode cancelar a qualquer momento aqui ou enviando 'PARAR' para o nosso número." />

      <div v-if="error"  class="text-xs text-red-600 dark:text-red-400">{{ error }}</div>
      <div v-if="success" class="text-xs text-emerald-600 dark:text-emerald-400">{{ success }}</div>

      <div class="flex gap-2">
        <Button v-if="!consented" icon="fas fa-check" :disabled="!systemReady" @click="onOptIn">
          Ativar
        </Button>
        <Button v-else variant="secondary" icon="fas fa-bell-slash" @click="onOptOut">
          Cancelar
        </Button>
      </div>
    </div>
  </section>
</template>
