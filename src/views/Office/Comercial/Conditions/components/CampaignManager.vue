<template>
  <div class="space-y-4">

    <!-- ── Header ───────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <p class="lbl-section"><i class="fas fa-bullhorn text-blue-500"></i> Campanhas</p>
          <span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            {{ campaigns.length }}
          </span>
        </div>
        <button
          @click="addCampaign"
          class="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <i class="fas fa-plus text-xs"></i> Nova Campanha
        </button>
      </div>

      <!-- Lista de campanhas -->
      <div v-if="campaigns.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="(camp, i) in campaigns" :key="camp.id ?? i">

          <!-- Cabeçalho da campanha (clicável) -->
          <div
            class="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition select-none"
            @click="toggleExpanded(i)"
          >
            <span
              :class="camp.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
              class="w-2 h-2 rounded-full flex-shrink-0"
            ></span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {{ camp.title || 'Nova Campanha' }}
              </p>
              <p v-if="camp.start_date" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {{ formatDateRange(camp.start_date, camp.end_date) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span v-if="camp.value" class="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {{ formatCurrency(camp.value) }}
              </span>
              <span
                :class="camp.is_active
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
                class="px-2 py-0.5 rounded-full text-xs font-semibold"
              >
                {{ camp.is_active ? 'Ativa' : 'Inativa' }}
              </span>
              <button
                @click.stop="removeCampaign(i)"
                class="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <i class="fas fa-trash text-xs"></i>
              </button>
              <i
                :class="expanded.has(i) ? 'fa-chevron-up' : 'fa-chevron-down'"
                class="fas text-gray-400 dark:text-gray-500 text-xs w-4"
              ></i>
            </div>
          </div>

          <!-- Corpo da campanha -->
          <div v-show="expanded.has(i)" class="px-5 pb-5 pt-4 bg-gray-50/40 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div class="sm:col-span-2">
                <label class="lbl">Título da Campanha</label>
                <input
                  :value="camp.title"
                  @input="patchCamp(i, 'title', $event.target.value)"
                  type="text"
                  class="inp"
                  placeholder="Ex: Doc Grátis + Taxa Caixa"
                />
              </div>

              <div>
                <label class="lbl">Início da Vigência</label>
                <input
                  :value="camp.start_date"
                  @input="patchCamp(i, 'start_date', $event.target.value)"
                  type="date"
                  class="inp"
                />
              </div>

              <div>
                <label class="lbl">Fim da Vigência</label>
                <input
                  :value="camp.end_date"
                  @input="patchCamp(i, 'end_date', $event.target.value)"
                  type="date"
                  class="inp"
                />
              </div>

              <div>
                <label class="lbl">Valor (se aplicável)</label>
                <div class="relative">
                  <span class="pfx">R$</span>
                  <input
                    :value="camp.value"
                    @input="patchCamp(i, 'value', numOrNull($event.target.value))"
                    type="number"
                    step="100"
                    class="inp-pfx"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label class="lbl">Status da Campanha</label>
                <div class="flex gap-2 mt-1">
                  <label
                    class="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
                    :class="camp.is_active === true
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600'"
                  >
                    <input type="radio" :checked="camp.is_active === true" @change="patchCamp(i, 'is_active', true)" class="sr-only" />
                    <span
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      :class="camp.is_active === true ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'"
                    >
                      <span v-if="camp.is_active === true" class="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </span>
                    Ativa
                  </label>
                  <label
                    class="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
                    :class="camp.is_active !== true
                      ? 'border-gray-500 bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600'"
                  >
                    <input type="radio" :checked="camp.is_active !== true" @change="patchCamp(i, 'is_active', false)" class="sr-only" />
                    <span
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      :class="camp.is_active !== true ? 'border-gray-500 bg-gray-500' : 'border-gray-300 dark:border-gray-600'"
                    >
                      <span v-if="camp.is_active !== true" class="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </span>
                    Inativa
                  </label>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label class="lbl">Descrição</label>
                <textarea
                  :value="camp.description"
                  @input="patchCamp(i, 'description', $event.target.value)"
                  rows="2"
                  class="inp resize-none"
                  placeholder="Resumo da campanha..."
                />
              </div>

              <div class="sm:col-span-2">
                <label class="lbl">Regulamento / Regras</label>
                <textarea
                  :value="camp.rules"
                  @input="patchCamp(i, 'rules', $event.target.value)"
                  rows="3"
                  class="inp resize-none"
                  placeholder="Regras detalhadas, critérios, condições..."
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Vazio -->
      <div v-else class="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-600">
        <i class="fas fa-bullhorn text-3xl mb-3"></i>
        <p class="text-sm font-medium">Nenhuma campanha cadastrada</p>
        <p class="text-xs mt-1">Clique em "Nova Campanha" para começar</p>
      </div>

      <!-- Footer -->
      <div class="flex justify-end px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <button @click="$emit('save')" :disabled="saving" class="btn-primary">
          <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas text-xs"></i>
          {{ saving ? 'Salvando...' : 'Salvar Campanhas' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    campaigns: { type: Array,   default: () => [] },
    saving:    { type: Boolean, default: false },
});
const emit = defineEmits(['update:campaigns', 'save']);

const expanded = ref(new Set());

function toggleExpanded(i) {
    const s = new Set(expanded.value);
    s.has(i) ? s.delete(i) : s.add(i);
    expanded.value = s;
}

function patchCamp(i, field, val) {
    const updated = props.campaigns.map((c, idx) =>
        idx === i ? { ...c, [field]: val } : c
    );
    emit('update:campaigns', updated);
}

function addCampaign() {
    const updated = [
        ...props.campaigns,
        { title: '', description: '', rules: '', start_date: null, end_date: null, is_active: true, value: null, sort_order: props.campaigns.length },
    ];
    emit('update:campaigns', updated);
    const newSet = new Set(expanded.value);
    newSet.add(updated.length - 1);
    expanded.value = newSet;
}

function removeCampaign(i) {
    const updated = props.campaigns.filter((_, idx) => idx !== i);
    emit('update:campaigns', updated);
}

function numOrNull(v) {
    return v === '' || v == null ? null : Number(v);
}

function formatCurrency(val) {
    if (val == null) return '';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateRange(start, end) {
    if (!start) return '';
    const fmt = (d) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
    return end ? `${fmt(start)} – ${fmt(end)}` : `a partir de ${fmt(start)}`;
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
