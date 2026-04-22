<template>
  <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto" @click="$emit('close')">
    <div class="flex items-center justify-center min-h-screen px-4 pb-20 pt-4 text-center sm:p-0">
      <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

      <div
        class="relative inline-block w-full max-w-2xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl my-8"
        @click.stop>

        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">Configurações de Meta</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Como calcular % atingida por empreendimento</p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          <!-- Global default mode -->
          <div>
            <label class="block text-sm font-semibold mb-2">Modo padrão (todos os empreendimentos)</label>
            <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button
                @click="goalStore.setGlobalMode('units')"
                :class="[
                  'px-4 py-2 text-sm font-medium transition-colors',
                  goalStore.globalMode === 'units'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                ]">
                <i class="fas fa-key mr-1"></i> Unidades
              </button>
              <button
                @click="goalStore.setGlobalMode('vgv')"
                :class="[
                  'px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-600 transition-colors',
                  goalStore.globalMode === 'vgv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                ]">
                <i class="fas fa-money-bill-wave mr-1"></i> VGV
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {{ goalStore.globalMode === 'units'
                ? 'Padrão: % atingida = vendas realizadas ÷ unidades projetadas'
                : 'Padrão: % atingida = VGV realizado ÷ VGV projetado' }}
            </p>
          </div>

          <!-- Per-enterprise overrides (admin only) -->
          <div v-if="isAdmin">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-semibold">Exceções por empreendimento</label>
              <span class="text-xs text-gray-400">Sobreescreve o padrão acima</span>
            </div>

            <div v-if="!enterprises.length" class="text-sm text-gray-400 py-4 text-center">
              Carregando empreendimentos…
            </div>

            <div v-else class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div
                v-for="ent in sortedEnterprises"
                :key="ent.id"
                class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">

                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">{{ ent.name }}</p>
                  <p class="text-xs text-gray-400">#{{ ent.id }}</p>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <div class="inline-flex rounded border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      @click="goalStore.setEnterpriseMode(ent.id, 'units')"
                      :class="[
                        'px-2 py-1 transition-colors',
                        effectiveModeFor(ent.id) === 'units'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                      ]">
                      Un.
                    </button>
                    <button
                      @click="goalStore.setEnterpriseMode(ent.id, 'vgv')"
                      :class="[
                        'px-2 py-1 border-l border-gray-200 dark:border-gray-600 transition-colors',
                        effectiveModeFor(ent.id) === 'vgv'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                      ]">
                      VGV
                    </button>
                  </div>

                  <!-- Remove override button (shows only when override exists) -->
                  <button
                    v-if="hasOverride(ent.id)"
                    @click="goalStore.setEnterpriseMode(ent.id, null)"
                    class="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    v-tippy="'Remover exceção (volta ao padrão)'">
                    <i class="fas fa-rotate-left"></i>
                  </button>
                  <span v-else class="text-xs text-gray-300 dark:text-gray-600 w-5"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Non-admin notice -->
          <div v-else class="text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
            <i class="fas fa-lock mr-2"></i>
            Somente administradores podem configurar exceções por empreendimento.
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

defineEmits(['close'])

const contractsStore = useContractsStore()
const goalStore = useProjectionGoalModeStore()

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin' } catch { return false }
})

const enterprises = computed(() => contractsStore.enterprises || [])

const sortedEnterprises = computed(() =>
  [...enterprises.value].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
)

const effectiveModeFor = (enterpriseId) => goalStore.modeForEnterprise(enterpriseId)

const hasOverride = (enterpriseId) =>
  goalStore.enterpriseOverrides[String(enterpriseId)] !== undefined
</script>
