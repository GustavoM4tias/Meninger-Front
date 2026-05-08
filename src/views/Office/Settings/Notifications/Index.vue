<script setup>
import { onMounted, computed } from 'vue';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';
import { RouterLink } from 'vue-router';

const store = useNotificationStore();
const wpp = useWhatsappStore();

onMounted(() => {
  store.fetchPreferences();
  wpp.fetchOpt();
  wpp.fetchSystemInfo();
});

const grouped = computed(() => {
  const map = new Map();
  for (const p of store.preferences) {
    const g = p.group || 'Outros';
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(p);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
});

// switches WA só ficam habilitados se o sistema está pronto E o user fez opt-in
const systemReady   = computed(() => !!wpp.systemInfo?.ready);
const whatsappReady = computed(() => systemReady.value && !!wpp.opt?.consented && !!wpp.opt?.phone);

const onToggle = (pref, key, value) => {
  pref[key] = value;
  store.setPreference(pref.type, {
    inapp: pref.inapp, email: pref.email, whatsapp: pref.whatsapp,
  });
};
</script>

<template>
  <PageContainer size="lg">
    <PageHeader
      icon="fas fa-bell"
      title="Preferências de notificação"
      subtitle="Escolha como quer ser avisado de cada tipo de evento."
      eyebrow="Notificações" />

    <!-- Aviso WhatsApp -->
    <div v-if="!systemReady"
      class="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
      <i class="fa-brands fa-whatsapp text-amber-600 dark:text-amber-400 text-lg mt-0.5"></i>
      <div class="text-xs text-ink">
        O administrador ainda não configurou o WhatsApp do sistema. O canal por WhatsApp ficará disponível assim que isso for feito.
      </div>
    </div>
    <div v-else-if="!whatsappReady"
      class="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
      <i class="fa-brands fa-whatsapp text-amber-600 dark:text-amber-400 text-lg mt-0.5"></i>
      <div class="text-xs text-ink">
        Para receber notificações por WhatsApp, informe seu telefone e aceite o termo na sua
        <RouterLink to="/settings/Account" class="text-accent hover:underline">conta</RouterLink>.
      </div>
    </div>

    <div v-if="store.prefsLoading" class="py-16 grid place-items-center">
      <Spinner />
    </div>

    <div v-else-if="!store.preferences.length"
      class="py-12 text-center text-sm text-ink-muted">
      Nenhuma preferência disponível.
    </div>

    <div v-else class="space-y-8">
      <section v-for="block in grouped" :key="block.group">
        <h2 class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
          {{ block.group }}
        </h2>

        <div class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
          <div class="hidden sm:grid grid-cols-[1fr_110px_110px_110px] px-4 py-2.5 border-b border-line
                      text-[11px] font-mono uppercase tracking-wider text-ink-subtle bg-surface-sunken/40">
            <span>Tipo</span>
            <span class="text-center">Sistema</span>
            <span class="text-center">E-mail</span>
            <span class="text-center">WhatsApp</span>
          </div>

          <div class="divide-y divide-line">
            <div v-for="pref in block.items" :key="pref.type"
              class="grid grid-cols-1 sm:grid-cols-[1fr_110px_110px_110px] gap-3 px-4 py-3.5 items-center">
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">{{ pref.label }}</p>
                <p v-if="pref.description" class="text-xs text-ink-muted mt-0.5">{{ pref.description }}</p>
              </div>

              <div class="flex sm:justify-center items-center gap-2">
                <span class="sm:hidden text-xs text-ink-muted w-20">Sistema</span>
                <Switch :model-value="pref.inapp" size="sm"
                  @update:model-value="(v) => onToggle(pref, 'inapp', v)" />
              </div>
              <div class="flex sm:justify-center items-center gap-2">
                <span class="sm:hidden text-xs text-ink-muted w-20">E-mail</span>
                <Switch :model-value="pref.email" size="sm" :disabled="!pref.hasEmail"
                  @update:model-value="(v) => onToggle(pref, 'email', v)" />
              </div>
              <div class="flex sm:justify-center items-center gap-2">
                <span class="sm:hidden text-xs text-ink-muted w-20">WhatsApp</span>
                <Switch :model-value="pref.whatsapp" size="sm"
                  :disabled="!pref.hasWhatsapp || !whatsappReady"
                  @update:model-value="(v) => onToggle(pref, 'whatsapp', v)" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <p class="text-[11px] text-ink-subtle">
        As alterações são salvas automaticamente.
      </p>
    </div>
  </PageContainer>
</template>
