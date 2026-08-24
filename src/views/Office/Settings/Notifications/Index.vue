<script setup>
import { onMounted, computed } from 'vue';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';
import { RouterLink } from 'vue-router';

import Skeleton from '@/components/UI/Skeleton.vue';
const store = useNotificationStore();
const wpp = useWhatsappStore();
const auth = useAuthStore();

onMounted(() => {
  store.fetchPreferences();
  wpp.fetchSystemInfo();
  if (!auth.user) auth.fetchUserInfo();
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

// Não existe opt-in: estar no Office já autoriza o canal (igual e-mail e sino).
// O switch de WhatsApp só depende do sistema estar configurado E do usuário ter
// telefone no perfil — é por ele que a mensagem sai.
const systemReady   = computed(() => !!wpp.systemInfo?.ready);
const hasPhone      = computed(() => !!String(auth.user?.phone || '').trim());
const whatsappReady = computed(() => systemReady.value && hasPhone.value);

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
      eyebrow="Notificações" >
      <template #actions>
        <PageHelp
          storage-key="prefs-notificacao"
          title="Como escolher seus avisos"
          intro="Estas preferências são suas: elas decidem por onde cada tipo de evento chega até você. Não mudam nada para os outros."
          :steps="[
            { title: 'Escolha por tipo', text: 'Cada linha é um tipo de evento. Você liga e desliga canal por canal: no app, e-mail e WhatsApp.' },
            { title: 'Pese o silêncio', text: 'Desligar tudo de um tipo significa não ser avisado nem quando algo depende de você.' },
          ]"
          :tips="[
            'Alguns avisos críticos ignoram a preferência de propósito, para não passarem em branco.',
            'WhatsApp só chega se o número estiver confirmado no seu cadastro.',
          ]" />
      </template>
    </PageHeader>

    <!-- Aviso WhatsApp -->
    <div v-if="!systemReady"
      class="mb-6 rounded-xl border border-data-warn/25 bg-data-warn/10 px-4 py-3 flex items-start gap-3">
      <i class="fa-brands fa-whatsapp text-data-warn text-lg mt-0.5"></i>
      <div class="text-xs text-ink">
        O administrador ainda não configurou o WhatsApp do sistema. O canal por WhatsApp ficará disponível assim que isso for feito.
      </div>
    </div>
    <div v-else-if="!hasPhone"
      class="mb-6 rounded-xl border border-data-warn/25 bg-data-warn/10 px-4 py-3 flex items-start gap-3">
      <i class="fa-brands fa-whatsapp text-data-warn text-lg mt-0.5"></i>
      <div class="text-xs text-ink">
        Você ainda não tem telefone no perfil, então nada sai por WhatsApp. Cadastre o número na sua
        <RouterLink to="/settings/Account" class="text-accent hover:underline">conta</RouterLink>
        para receber por lá.
      </div>
    </div>
    <div v-else-if="wpp.systemInfo?.display_phone"
      class="mb-6 rounded-xl border border-line bg-surface-raised px-4 py-3 flex items-start gap-3">
      <i class="fa-brands fa-whatsapp text-data-pos text-lg mt-0.5"></i>
      <div class="text-xs text-ink-muted">
        As mensagens chegam de <strong class="text-ink">{{ wpp.systemInfo.display_phone }}</strong>
        no telefone do seu perfil. Para trocar o número, edite na sua
        <RouterLink to="/settings/Account" class="text-accent hover:underline">conta</RouterLink>.
      </div>
    </div>

    <Skeleton v-if="store.prefsLoading" variant="row" :lines="5" />

    <div v-else-if="!store.preferences.length"
      class="py-12 text-center text-sm text-ink-muted">
      Nenhuma preferência disponível.
    </div>

    <div v-else class="space-y-8">
      <section v-for="block in grouped" :key="block.group">
        <h2 class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2">
          {{ block.group }}
        </h2>

        <div class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
          <div class="hidden sm:grid grid-cols-[1fr_110px_110px_110px] px-4 py-2.5 border-b border-line
                      text-micro font-mono uppercase tracking-wider text-ink-subtle bg-surface-sunken/40">
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

      <p class="text-micro text-ink-subtle">
        As alterações são salvas automaticamente.
      </p>
    </div>
  </PageContainer>
</template>
