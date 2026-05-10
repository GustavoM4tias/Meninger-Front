<script setup>
import { onMounted, ref, computed } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';

const wpp = useWhatsappStore();

// Phone "local" (DDD + número, sem +55). O prefixo +55 é fixo na UI.
const phoneLocal = ref('');
const accept = ref(false);
const error = ref('');
const success = ref('');
const fromAccount = ref(false); // se foi pré-preenchido do cadastro

// Remove tudo que não for dígito e tira o "55" do começo se houver
function stripBrazilPrefix(input) {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  return digits;
}

// "14998675593" → "(14) 99867-5593"
function formatLocal(digits) {
  const d = stripBrazilPrefix(digits);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

const phoneDigits = computed(() => stripBrazilPrefix(phoneLocal.value));
const phoneFull = computed(() => phoneDigits.value ? `+55${phoneDigits.value}` : '');
const phoneFormatted = computed(() => formatLocal(phoneLocal.value));

function onPhoneInput(e) {
  // Mantém só dígitos no model, exibe formatado
  phoneLocal.value = formatLocal(e.target.value);
}

onMounted(async () => {
  await Promise.all([wpp.fetchSystemInfo(), wpp.fetchOpt()]);
  if (wpp.opt?.phone) {
    phoneLocal.value = formatLocal(wpp.opt.phone);
    fromAccount.value = false;
  } else if (wpp.opt?.account_phone) {
    phoneLocal.value = formatLocal(wpp.opt.account_phone);
    fromAccount.value = true;
  }
});

const consented = computed(() => !!wpp.opt?.consented);
const systemReady = computed(() => !!wpp.systemInfo?.ready);
const systemNumber = computed(() =>
  wpp.systemInfo?.display_phone
    ? `${wpp.systemInfo.display_name ? wpp.systemInfo.display_name + ' · ' : ''}${wpp.systemInfo.display_phone}`
    : null
);

const canSubmit = computed(() => phoneDigits.value.length >= 10 && phoneDigits.value.length <= 11 && accept.value);

const flash = (kind, msg) => {
  if (kind === 'error') { error.value = msg; success.value = ''; }
  else { success.value = msg; error.value = ''; }
  setTimeout(() => { error.value = ''; success.value = ''; }, 4000);
};

const onOptIn = async () => {
  error.value = ''; success.value = '';
  if (!accept.value) return flash('error', 'É preciso aceitar o termo.');
  if (phoneDigits.value.length < 10 || phoneDigits.value.length > 11) {
    return flash('error', 'Telefone inválido. Digite DDD + número (10 ou 11 dígitos).');
  }
  try {
    await wpp.optIn({ phone: phoneFull.value, accept: accept.value });
    fromAccount.value = false;
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
      <!-- Caixa explicativa -->
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
          Apenas confirme o número e aceite o termo —
          não é necessário conectar conta nem instalar nada.
        </p>
      </div>

      <!-- Campo telefone (com +55 fixo) -->
      <div>
        <label class="text-xs font-medium text-ink-muted mb-1.5 block">
          Seu WhatsApp
          <span v-if="fromAccount && !consented"
            class="ml-1.5 text-[10px] font-normal text-accent">
            (puxado do seu cadastro)
          </span>
        </label>
        <div class="flex items-stretch rounded-lg border border-line bg-surface-raised
                    overflow-hidden transition-colors focus-within:border-accent
                    focus-within:ring-2 focus-within:ring-accent-ring/20"
             :class="{ 'opacity-60': consented || !systemReady }">
          <span class="flex items-center justify-center gap-1 px-3 text-sm font-medium
                       text-ink-muted bg-surface-sunken border-r border-line shrink-0 select-none">
            <span class="text-base">🇧🇷</span>
            +55
          </span>
          <input :value="phoneLocal" @input="onPhoneInput"
            placeholder="(11) 99999-9999"
            inputmode="tel"
            :disabled="consented || !systemReady"
            class="flex-1 px-3 py-2 text-sm bg-transparent text-ink outline-none
                   placeholder:text-ink-subtle" />
        </div>
        <p v-if="phoneDigits" class="text-[11px] text-ink-subtle mt-1 font-mono">
          Será enviado para: {{ phoneFull }}
        </p>
        <p v-else class="text-[11px] text-ink-subtle mt-1">
          Digite o DDD + número. Ex.: 11 99999-9999.
        </p>
      </div>

      <Switch v-if="!consented" v-model="accept" size="sm"
        :disabled="!systemReady"
        label="Aceito receber notificações por WhatsApp do sistema"
        description="Você pode cancelar a qualquer momento por aqui." />

      <div v-if="error"  class="text-xs text-red-600 dark:text-red-400">{{ error }}</div>
      <div v-if="success" class="text-xs text-emerald-600 dark:text-emerald-400">{{ success }}</div>

      <div class="flex gap-2">
        <Button v-if="!consented" icon="fas fa-check" :disabled="!canSubmit || !systemReady" @click="onOptIn">
          Ativar
        </Button>
        <Button v-else variant="secondary" icon="fas fa-bell-slash" @click="onOptOut">
          Cancelar
        </Button>
      </div>
    </div>
  </section>
</template>
