<template>
  <div class="space-y-4">

    <!-- ── Tabs dos módulos ──────────────────────────────────────────────── -->

    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="(mod, i) in modules"
        :key="mod.id ?? i"
        @click="activeIdx = i"
        :class="[
          'px-4 py-2 text-xs font-semibold rounded-lg transition border',
          activeIdx === i
            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700'
        ]"
      >
        {{ mod.module_name || `Módulo ${i + 1}` }}
      </button>
    </div>

    <!-- ── Conteúdo do módulo ────────────────────────────────────────────── -->
    <div v-if="activeModule" class="space-y-4">

      <!-- Copiar de outro módulo -->
      <div
        v-if="modules.length > 1"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
          <p class="lbl-section"><i class="fas fa-copy text-blue-500"></i> Copiar Dados de Outro Módulo</p>
        </div>
        <div class="p-5 flex items-center gap-3 flex-wrap">
          <select v-model="copySourceId" class="inp flex-1 min-w-0 max-w-xs">
            <option value="">Selecionar módulo de origem...</option>
            <option v-for="m in otherModules" :key="m.id ?? m.module_name" :value="m.id">
              {{ m.module_name }}
            </option>
          </select>
          <button
            @click="handleCopy"
            :disabled="!copySourceId || copying"
            class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 transition"
          >
            <i class="fas fa-arrows-rotate text-xs"></i>
            {{ copying ? 'Copiando...' : 'Copiar Dados' }}
          </button>
        </div>
      </div>

      <!-- ── Números do Módulo ─────────────────────────────────────────── -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
          <p class="lbl-section"><i class="fas fa-hashtag text-blue-500"></i> Números do Módulo</p>
        </div>
        <div class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="sm:col-span-2 lg:col-span-1">
            <label class="lbl">Nome do Módulo</label>
            <input
              :value="activeModule.module_name"
              @input="patch('module_name', $event.target.value)"
              type="text"
              class="inp"
              placeholder="Ex: Fase 1 — Torre A"
            />
          </div>
          <div>
            <label class="lbl">Total de Unidades</label>
            <input
              :value="activeModule.total_units"
              @input="patchWithMinDemand($event)"
              type="number"
              min="0"
              class="inp"
              placeholder="Ex: 200"
            />
          </div>
          <div>
            <label class="lbl">
              Demanda Mínima
              <span class="text-gray-400 dark:text-gray-500 font-normal normal-case tracking-normal ml-1">(≥ 20%)</span>
            </label>
            <input
              :value="activeModule.min_demand"
              @input="patch('min_demand', numOrNull($event.target.value))"
              type="number"
              min="0"
              class="inp"
              placeholder="Auto"
            />
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <label class="lbl">Obs. Demanda Mínima</label>
            <input
              :value="activeModule.min_demand_note"
              @input="patch('min_demand_note', $event.target.value)"
              type="text"
              class="inp"
              placeholder="Ex: Assinar em demanda fracionada"
            />
          </div>
        </div>
      </div>

      <!-- ── Avaliação MCMV ────────────────────────────────────────────── -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
          <p class="lbl-section"><i class="fas fa-house-chimney text-blue-500"></i> Avaliação MCMV</p>
        </div>
        <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="lbl">Valor de Avaliação</label>
            <div class="relative">
              <span class="pfx">R$</span>
              <input
                :value="activeModule.appraisal_value"
                @input="patch('appraisal_value', numOrNull($event.target.value))"
                type="number"
                step="1000"
                class="inp-pfx"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label class="lbl">Teto da Cidade</label>
            <div class="relative">
              <span class="pfx">R$</span>
              <input
                :value="activeModule.appraisal_ceiling"
                @input="patch('appraisal_ceiling', numOrNull($event.target.value))"
                type="number"
                step="1000"
                class="inp-pfx"
                placeholder="0,00"
              />
            </div>
          </div>
          <div class="sm:col-span-2">
            <label class="lbl">Observação da Avaliação</label>
            <textarea
              :value="activeModule.appraisal_note"
              @input="patch('appraisal_note', $event.target.value)"
              rows="2"
              class="inp resize-none"
              placeholder="Observações adicionais sobre a avaliação..."
            />
          </div>
          <div class="sm:col-span-2">
            <label class="lbl">Arquivo / Laudo Oficial</label>
            <AttachmentPicker
              :model-value="activeModule.appraisal_file_url"
              @update:model-value="patch('appraisal_file_url', $event)"
              :reference-id="activeModule.id"
              upload-context="appraisal_laudo"
              hint="Vincule um arquivo do seu computador, SharePoint ou cole um link direto."
            />
          </div>
        </div>
      </div>

      <!-- Salvar -->
      <div class="flex justify-end">
        <button @click="$emit('save')" :disabled="saving" class="btn-primary">
          <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas text-xs"></i>
          {{ saving ? 'Salvando...' : 'Salvar Módulos' }}
        </button>
      </div>
    </div>

    <!-- Vazio -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
      <i class="fas fa-layer-group text-3xl mb-3"></i>
      <p class="text-sm font-medium">Nenhum módulo encontrado</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AttachmentPicker from './AttachmentPicker.vue';

const props = defineProps({
    modules:     { type: Array,            default: () => [] },
    conditionId: { type: [Number, String], required: true },
    saving:      { type: Boolean,          default: false },
});

const emit = defineEmits(['update:modules', 'save', 'copy']);

const activeIdx    = ref(0);
const copySourceId = ref('');
const copying      = ref(false);

const activeModule = computed(() => props.modules[activeIdx.value] ?? null);
const otherModules = computed(() => props.modules.filter((_, i) => i !== activeIdx.value));

function patch(field, val) {
    const updated = props.modules.map((m, i) =>
        i === activeIdx.value ? { ...m, [field]: val } : m
    );
    emit('update:modules', updated);
}

function patchWithMinDemand(evt) {
    const val = numOrNull(evt.target.value);
    const updated = props.modules.map((m, i) => {
        if (i !== activeIdx.value) return m;
        return { ...m, total_units: val, min_demand: val != null ? Math.ceil(val * 0.2) : m.min_demand };
    });
    emit('update:modules', updated);
}

function numOrNull(v) {
    return v === '' || v == null ? null : Number(v);
}

async function handleCopy() {
    if (!copySourceId.value) return;
    copying.value = true;
    try {
        emit('copy', { targetId: activeModule.value?.id, sourceId: copySourceId.value });
        copySourceId.value = '';
    } finally {
        copying.value = false;
    }
}
</script>

<style scoped>
.lbl-section { @apply text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2; }
.lbl     { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5; }
.inp     { @apply w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.inp-pfx { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.pfx     { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none; }
.btn-primary { @apply flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition; }
</style>
