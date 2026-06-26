<script setup>
import { ref, computed } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import API_URL from '@/config/apiUrl';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';

const emit = defineEmits(['done']);

const store = useWhatsappStore();

// passos: 0 token → 1 escolher business/waba/phone → 2 webhook+secrets → 3 done
const step = ref(0);

// passo 0
const accessToken = ref('');
const apiVersion = ref('v21.0');
const discovering = ref(false);
const discovery = ref(null); // { user, businesses }

// passo 1
const businessId = ref('');
const wabaId = ref('');
const phoneId = ref('');

// passo 2
const appSecret = ref('');
const verifyToken = ref('');     // se vazio o backend gera
const active = ref(true);
const dryRun = ref(false);

// passo 3
const result = ref(null);  // { ok, config, health, generated_verify_token }

const error = ref('');

const businesses = computed(() => discovery.value?.businesses || []);
const selectedBusiness = computed(() => businesses.value.find(b => b.id === businessId.value) || null);
const wabas = computed(() => selectedBusiness.value?.wabas || []);
const selectedWaba = computed(() => wabas.value.find(w => w.id === wabaId.value) || null);
const phones = computed(() => selectedWaba.value?.phone_numbers || []);
const selectedPhone = computed(() => phones.value.find(p => p.id === phoneId.value) || null);

const webhookUrl = computed(() => `${API_URL || ''}/whatsapp/webhook`);

const onDiscover = async () => {
  error.value = '';
  if (!accessToken.value.trim()) { error.value = 'Cole o access token primeiro.'; return; }
  discovering.value = true;
  try {
    const r = await store.discoverFromToken({
      access_token: accessToken.value.trim(),
      api_version: apiVersion.value,
    });
    discovery.value = r;

    // pré-seleciona se houver apenas 1 opção em cada nível
    if (r.businesses?.length === 1) businessId.value = r.businesses[0].id;
    if (selectedBusiness.value?.wabas?.length === 1) wabaId.value = selectedBusiness.value.wabas[0].id;
    if (selectedWaba.value?.phone_numbers?.length === 1) phoneId.value = selectedWaba.value.phone_numbers[0].id;

    step.value = 1;
  } catch (e) {
    error.value = e.message || 'Falha ao descobrir contas. Verifique o token e suas permissões.';
  } finally {
    discovering.value = false;
  }
};

const goToWebhook = () => {
  if (!businessId.value || !wabaId.value || !phoneId.value) {
    error.value = 'Selecione Business, WABA e número.';
    return;
  }
  error.value = '';
  step.value = 2;
};

const onApply = async () => {
  error.value = '';
  try {
    const r = await store.applyDiscovered({
      access_token: accessToken.value.trim(),
      api_version: apiVersion.value,
      business_id: businessId.value,
      waba_id: wabaId.value,
      phone_number_id: phoneId.value,
      display_phone: selectedPhone.value?.display_phone_number,
      display_name: selectedPhone.value?.verified_name,
      webhook_verify_token: verifyToken.value || undefined,
      active: active.value,
      dry_run: dryRun.value,
    });
    result.value = r;
    step.value = 3;
  } catch (e) {
    error.value = e.message || 'Falha ao aplicar.';
  }
};

const finalVerifyToken = computed(() => result.value?.generated_verify_token || verifyToken.value);

const onFinish = () => emit('done');
const onRestart = () => {
  step.value = 0;
  discovery.value = null;
  result.value = null;
  businessId.value = ''; wabaId.value = ''; phoneId.value = '';
  appSecret.value = ''; verifyToken.value = '';
};
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft">
    <header class="flex items-center gap-3 mb-5">
      <div class="h-9 w-9 rounded-lg grid place-items-center bg-accent-soft text-accent border border-accent/20">
        <i class="fas fa-wand-magic-sparkles"></i>
      </div>
      <div class="flex-1">
        <h2 class="text-sm font-semibold text-ink">Conectar WhatsApp Business</h2>
        <p class="text-xs text-ink-muted">Cole o access token e selecione a conta — o resto é descoberto automaticamente.</p>
      </div>

      <!-- stepper -->
      <ol class="hidden sm:flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider">
        <li v-for="(label, i) in ['Token', 'Conta', 'Webhook', 'Pronto']" :key="i"
          :class="['px-2 py-0.5 rounded-md border',
            i === step ? 'bg-accent-soft text-accent border-accent/20'
            : i < step ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-surface-sunken text-ink-subtle border-line']">
          {{ i + 1 }}. {{ label }}
        </li>
      </ol>
    </header>

    <!-- ── PASSO 0: TOKEN ──────────────────────────────────── -->
    <div v-if="step === 0" class="space-y-4">
      <div class="text-xs text-ink-muted">
        Use um <strong class="text-ink">System User Token permanente</strong> (Meta Business Manager → Configurações de empresa → Usuários do sistema → "Gerar token de acesso"). Selecione o app do WhatsApp e os escopos
        <code class="px-1 rounded bg-surface-sunken">whatsapp_business_management</code> e
        <code class="px-1 rounded bg-surface-sunken">whatsapp_business_messaging</code>.
      </div>

      <Input v-model="accessToken" label="Access Token" type="password" placeholder="EAAG..." />
      <Input v-model="apiVersion" label="Versão da Graph API" placeholder="v21.0" hint="Use a mais recente disponível na sua app." />

      <div v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</div>

      <Button :loading="discovering" icon="fas fa-magnifying-glass" @click="onDiscover">
        Descobrir contas
      </Button>
    </div>

    <!-- ── PASSO 1: SELECIONAR ─────────────────────────────── -->
    <div v-else-if="step === 1" class="space-y-5">
      <div class="text-xs text-ink-muted">
        Token validado para <strong class="text-ink">{{ discovery?.user?.name || discovery?.user?.id }}</strong>.
        Escolha qual conta usar:
      </div>

      <!-- Business -->
      <div>
        <label class="text-xs font-medium text-ink-muted mb-1.5 block">Meta Business</label>
        <select v-model="businessId"
          class="w-full h-10 px-3 rounded-md border border-line bg-surface-raised text-sm text-ink">
          <option value="">— selecione —</option>
          <option v-for="b in businesses" :key="b.id" :value="b.id">
            {{ b.name }} ({{ b.id }})
          </option>
        </select>
      </div>

      <!-- WABA -->
      <div v-if="businessId">
        <label class="text-xs font-medium text-ink-muted mb-1.5 block">WhatsApp Business Account (WABA)</label>
        <select v-model="wabaId"
          class="w-full h-10 px-3 rounded-md border border-line bg-surface-raised text-sm text-ink">
          <option value="">— selecione —</option>
          <option v-for="w in wabas" :key="w.id" :value="w.id">
            {{ w.name || w.id }}{{ w.currency ? ` · ${w.currency}` : '' }}
          </option>
        </select>
        <p v-if="!wabas.length" class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          Nenhuma WABA visível para esse Business. Verifique permissões do System User.
        </p>
      </div>

      <!-- Phone -->
      <div v-if="wabaId">
        <label class="text-xs font-medium text-ink-muted mb-1.5 block">Número de telefone</label>
        <select v-model="phoneId"
          class="w-full h-10 px-3 rounded-md border border-line bg-surface-raised text-sm text-ink">
          <option value="">— selecione —</option>
          <option v-for="p in phones" :key="p.id" :value="p.id">
            {{ p.display_phone_number }}{{ p.verified_name ? ` · ${p.verified_name}` : '' }}{{ p.quality_rating ? ` · ${p.quality_rating}` : '' }}
          </option>
        </select>
        <p v-if="!phones.length" class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          Nenhum número cadastrado nessa WABA.
        </p>
      </div>

      <div v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</div>

      <div class="flex gap-2">
        <Button variant="secondary" icon="fas fa-arrow-left" @click="step = 0">Voltar</Button>
        <Button icon="fas fa-arrow-right" @click="goToWebhook" :disabled="!businessId || !wabaId || !phoneId">
          Continuar
        </Button>
      </div>
    </div>

    <!-- ── PASSO 2: WEBHOOK + SECRETS ──────────────────────── -->
    <div v-else-if="step === 2" class="space-y-5">
      <div class="rounded-lg border border-line bg-surface-sunken/50 p-3 text-xs">
        <p class="text-ink-muted mb-2">Configure o webhook na Meta apontando para a URL abaixo:</p>
        <code class="block font-mono break-all p-2 bg-surface rounded border border-line">{{ webhookUrl }}</code>
      </div>

      <Input v-model="verifyToken" label="Webhook Verify Token (opcional)"
        placeholder="deixe em branco pra gerar um aleatório"
        hint="Use a MESMA string aqui e na configuração de webhook da Meta." />

      <p class="text-xs text-ink-muted rounded-lg border border-line bg-surface-sunken/50 p-3">
        <i class="fas fa-key mr-1 text-[#0866FF]"></i>
        O <b>App Secret</b> (valida a assinatura do webhook) é compartilhado com o Lead Ads e fica em
        <RouterLink to="/settings/meta" class="text-accent underline">Configurações Meta (App)</RouterLink>. Configure lá uma vez - vale pros dois.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 border-t border-line pt-4">
        <Switch v-model="active"  size="sm" label="Ativar imediatamente"
          description="Envia mensagens reais já após salvar." />
        <Switch v-model="dryRun"  size="sm" label="Modo simulação (dry-run)"
          description="Loga em vez de enviar. Recomendado para teste inicial." />
      </div>

      <div v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</div>

      <div class="flex gap-2">
        <Button variant="secondary" icon="fas fa-arrow-left" @click="step = 1">Voltar</Button>
        <Button icon="fas fa-floppy-disk" :loading="store.savingConfig" @click="onApply">Salvar e conectar</Button>
      </div>
    </div>

    <!-- ── PASSO 3: PRONTO ─────────────────────────────────── -->
    <div v-else-if="step === 3" class="space-y-4">
      <div :class="['rounded-lg border p-4',
        result?.health?.ok
          ? 'border-emerald-500/20 bg-emerald-500/10'
          : 'border-amber-500/20 bg-amber-500/10']">
        <p class="text-sm font-semibold text-ink flex items-center gap-2">
          <i :class="result?.health?.ok ? 'fas fa-circle-check text-emerald-500' : 'fas fa-triangle-exclamation text-amber-500'"></i>
          {{ result?.health?.ok ? 'Conectado!' : 'Salvo, mas health check falhou' }}
        </p>
        <p v-if="!result?.health?.ok" class="text-xs text-amber-700 dark:text-amber-400 mt-1">
          {{ result?.health?.error }}
        </p>
      </div>

      <div class="rounded-lg border border-line bg-surface-sunken/50 p-4 text-xs space-y-2">
        <div><span class="text-ink-subtle">Telefone:</span> <strong class="text-ink">{{ result?.config?.display_phone || selectedPhone?.display_phone_number }}</strong></div>
        <div><span class="text-ink-subtle">Nome:</span> <strong class="text-ink">{{ result?.config?.display_name || selectedPhone?.verified_name || '—' }}</strong></div>
        <div><span class="text-ink-subtle">Phone ID:</span> <code class="font-mono">{{ phoneId }}</code></div>
        <div><span class="text-ink-subtle">WABA ID:</span> <code class="font-mono">{{ wabaId }}</code></div>
      </div>

      <div v-if="finalVerifyToken"
        class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs">
        <p class="font-semibold text-ink mb-1">Verify Token gerado — anote agora!</p>
        <p class="text-ink-muted mb-2">
          Cole essa string no Meta Business → WhatsApp → Configuração → Webhook → "Verify token". É a única vez que ela é exibida em texto puro.
        </p>
        <code class="block font-mono break-all p-2 bg-surface rounded border border-line">{{ finalVerifyToken }}</code>
      </div>

      <div class="flex gap-2">
        <Button icon="fas fa-check" @click="onFinish">Concluir</Button>
        <Button variant="secondary" icon="fas fa-rotate-left" @click="onRestart">Recomeçar</Button>
      </div>
    </div>
  </section>
</template>
