<script setup>
// Cobertura do canal: quem recebe e quem está de fora.
//
// Desde a remoção do opt-in (2026-08-17), estar no Office já autoriza o WhatsApp
// — o único motivo de alguém não receber é não ter telefone no perfil. Esse
// buraco era invisível; aqui ele fica explícito pro admin cobrar o cadastro.
import { onMounted, ref, computed } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Spinner from '@/components/UI/Spinner.vue';

const store = useWhatsappStore();
const expanded = ref(false);

onMounted(() => store.fetchCoverage());

const cov = computed(() => store.coverage);
const pct = computed(() => Math.round((cov.value?.coverage || 0) * 100));
const missing = computed(() => cov.value?.missing || []);

const barCls = computed(() => {
  if (pct.value >= 90) return 'bg-data-pos';
  if (pct.value >= 60) return 'bg-data-warn';
  return 'bg-data-neg';
});
</script>

<template>
  <section class="mb-4 rounded-xl border border-line bg-surface-raised p-4 shadow-soft">
    <div v-if="store.loadingCoverage" class="py-4 grid place-items-center"><Spinner /></div>

    <template v-else-if="cov">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-address-book text-ink-subtle"></i>
            Quem recebe
          </h3>
          <p class="text-xs text-ink-muted mt-0.5">
            Não há opt-in: todo usuário ativo recebe. Só fica de fora quem não tem telefone no perfil.
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-xl font-semibold text-ink leading-none">{{ pct }}%</p>
          <p class="text-micro text-ink-subtle mt-1">{{ cov.withPhone }} de {{ cov.total }} ativos</p>
        </div>
      </div>

      <div class="mt-3 h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
        <div :class="['h-full rounded-full transition-all', barCls]" :style="{ width: `${pct}%` }"></div>
      </div>

      <div v-if="cov.withoutPhone" class="mt-3">
        <button type="button" @click="expanded = !expanded"
          class="w-full flex items-center justify-between gap-2 rounded-lg border border-data-warn/20
                 bg-data-warn/10 px-3 py-2.5 text-left min-h-[40px]">
          <span class="text-xs text-ink">
            <strong>{{ cov.withoutPhone }}</strong>
            {{ cov.withoutPhone === 1 ? 'pessoa não recebe' : 'pessoas não recebem' }} nada por WhatsApp
          </span>
          <i :class="['fas text-[11px] text-ink-subtle', expanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        </button>

        <ul v-if="expanded" class="mt-2 divide-y divide-line rounded-lg border border-line overflow-hidden">
          <li v-for="u in missing" :key="u.id"
            class="px-3 py-2.5 flex items-center justify-between gap-3 text-xs">
            <span class="min-w-0">
              <span class="block font-medium text-ink truncate">{{ u.username }}</span>
              <span class="block text-ink-subtle truncate">{{ u.email }}</span>
            </span>
            <span v-if="u.position" class="text-ink-subtle shrink-0 hidden sm:block">{{ u.position }}</span>
          </li>
        </ul>
      </div>

      <p v-else class="mt-3 text-xs text-data-pos">
        <i class="fas fa-check mr-1"></i> Todo mundo com telefone cadastrado.
      </p>
    </template>
  </section>
</template>
