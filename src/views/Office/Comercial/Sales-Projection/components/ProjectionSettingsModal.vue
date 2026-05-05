<script setup>
import { computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const contractsStore = useContractsStore();
const goalStore = useProjectionGoalModeStore();

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
});

const enterprises = computed(() => contractsStore.enterprises || []);

const sortedEnterprises = computed(() =>
  [...enterprises.value].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
);

const effectiveModeFor = (enterpriseId) => goalStore.modeForEnterprise(enterpriseId);

const hasOverride = (enterpriseId) =>
  goalStore.enterpriseOverrides[String(enterpriseId)] !== undefined;

// Bridge para SegmentedControl global
const globalModeProxy = computed({
  get: () => goalStore.globalMode,
  set: (v) => goalStore.setGlobalMode(v),
});

const globalModeOptions = [
  { value: 'units', label: 'Unidades', icon: 'fas fa-key' },
  { value: 'vgv',   label: 'VGV',      icon: 'fas fa-money-bill-wave' },
];

const overrideCount = computed(() =>
  Object.keys(goalStore.enterpriseOverrides || {}).length
);

function setEnterpriseMode(entId, mode) {
  goalStore.setEnterpriseMode(entId, mode);
}

function clearOverride(entId) {
  goalStore.setEnterpriseMode(entId, null);
}
</script>

<template>
  <Modal :open="open" size="xl"
    title="Configurações de meta"
    subtitle="Como calcular % atingida por empreendimento"
    @close="emit('close')">

    <div class="space-y-5">

      <!-- Modo padrão global -->
      <Surface variant="raised" padding="md" class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-sliders text-accent text-sm"></i>
          <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">
            Modo padrão (todos os empreendimentos)
          </h3>
        </div>

        <SegmentedControl v-model="globalModeProxy" :options="globalModeOptions" size="md" />

        <p class="text-xs text-ink-subtle leading-relaxed">
          <i class="fas fa-circle-info text-[10px] mr-1"></i>
          {{ goalStore.globalMode === 'units'
            ? 'Padrão: % atingida = vendas realizadas ÷ unidades projetadas.'
            : 'Padrão: % atingida = VGV realizado ÷ VGV projetado.' }}
        </p>
      </Surface>

      <!-- Exceções (admin only) -->
      <Surface v-if="isAdmin" variant="raised" padding="md" class="space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2 min-w-0">
            <i class="fas fa-list-ul text-accent text-sm"></i>
            <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">
              Exceções por empreendimento
            </h3>
          </div>
          <Badge v-if="overrideCount > 0" variant="warning" size="sm">
            <span class="font-mono tabular-nums">{{ overrideCount }}</span>
            exceç{{ overrideCount === 1 ? 'ão' : 'ões' }}
          </Badge>
        </div>
        <p class="text-xs text-ink-subtle">Sobrescreve o modo padrão acima para empreendimentos específicos.</p>

        <div v-if="!enterprises.length" class="py-6 text-center text-sm text-ink-muted">
          <i class="fas fa-circle-notch fa-spin mr-1"></i> Carregando empreendimentos...
        </div>

        <div v-else class="rounded-lg border border-line bg-surface-sunken max-h-80 overflow-y-auto">
          <ul class="divide-y divide-line">
            <li v-for="ent in sortedEnterprises" :key="ent.id"
              class="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors">

              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink truncate">{{ ent.name }}</p>
                <p class="text-[10px] text-ink-subtle font-mono mt-0.5">#{{ ent.id }}</p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <!-- Toggle compact -->
                <div class="inline-flex rounded-md border border-line overflow-hidden text-[11px] font-medium">
                  <button @click="setEnterpriseMode(ent.id, 'units')"
                    class="px-2 py-1 transition-colors"
                    :class="effectiveModeFor(ent.id) === 'units'
                      ? 'bg-accent text-white'
                      : 'bg-surface-raised text-ink-muted hover:bg-surface-hover hover:text-ink'">
                    Un.
                  </button>
                  <button @click="setEnterpriseMode(ent.id, 'vgv')"
                    class="px-2 py-1 border-l border-line transition-colors"
                    :class="effectiveModeFor(ent.id) === 'vgv'
                      ? 'bg-accent text-white'
                      : 'bg-surface-raised text-ink-muted hover:bg-surface-hover hover:text-ink'">
                    VGV
                  </button>
                </div>

                <!-- Limpar override -->
                <button v-if="hasOverride(ent.id)" @click="clearOverride(ent.id)"
                  class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  v-tippy="'Remover exceção (volta ao padrão)'">
                  <i class="fas fa-rotate-left text-[10px]"></i>
                </button>
                <span v-else class="w-7 shrink-0"></span>
              </div>
            </li>
          </ul>
        </div>
      </Surface>

      <!-- Aviso para não-admin -->
      <div v-else
        class="rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm text-ink-muted text-center">
        <i class="fas fa-lock mr-2 text-ink-subtle"></i>
        Somente administradores podem configurar exceções por empreendimento.
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Fechar</Button>
    </template>
  </Modal>
</template>
