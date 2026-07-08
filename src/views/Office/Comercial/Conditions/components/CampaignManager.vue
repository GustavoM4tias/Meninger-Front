<template>
  <div class="space-y-4">

    <!-- ── Header ───────────────────────────────────────────────────────── -->
    <div class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-line bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <p class="lbl-section"><i class="fas fa-bullhorn text-blue-500"></i> Campanhas</p>
          <span class="px-2 py-0.5 rounded-full bg-accent-soft text-accent text-xs font-semibold">
            {{ campaigns.length }}
          </span>
        </div>
        <div v-if="!readonly" class="flex items-center gap-2">
          <button
            @click="toggleLibrary"
            class="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-accent bg-accent-soft border border-accent/20 rounded-lg hover:bg-accent-soft/70 transition"
          >
            <i class="fas fa-book-open text-xs"></i> Biblioteca
          </button>
          <button
            @click="addCampaign"
            class="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-accent-hover transition"
          >
            <i class="fas fa-plus text-xs"></i> Nova Campanha
          </button>
        </div>
      </div>

      <!-- Biblioteca: campanhas reutilizáveis entre empreendimentos -->
      <div v-if="showLibrary && !readonly" class="px-5 py-4 border-b border-line bg-accent-soft/20">
        <p class="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2">Usar campanha da biblioteca</p>
        <div v-if="loadingLibrary" class="text-xs text-ink-subtle py-2"><i class="fas fa-spinner fa-spin mr-1"></i> Carregando...</div>
        <div v-else-if="availableTemplates.length" class="space-y-1.5 max-h-56 overflow-y-auto">
          <button v-for="t in availableTemplates" :key="t.id" @click="addFromTemplate(t)"
            class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left bg-surface-raised border border-line rounded-lg hover:border-accent/40 hover:bg-accent-soft/40 transition">
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-ink truncate">{{ t.title }}</span>
              <span v-if="t.description" class="block text-xs text-ink-subtle truncate">{{ t.description }}</span>
            </span>
            <span class="flex items-center gap-2 flex-shrink-0 text-xs">
              <span v-if="t.value" class="font-semibold text-accent">{{ formatCurrency(t.value) }}</span>
              <span class="text-ink-subtle">{{ t.usage_count }} uso(s)</span>
              <i class="fas fa-plus text-accent"></i>
            </span>
          </button>
        </div>
        <p v-else class="text-xs text-ink-subtle italic py-2">
          Nenhum modelo na biblioteca ainda. Abra uma campanha existente e use "Salvar como modelo" para começar.
        </p>
      </div>

      <!-- Lista de campanhas -->
      <div v-if="campaigns.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="(camp, i) in campaigns" :key="camp.id ?? i">

          <!-- Cabeçalho da campanha (clicável) -->
          <div
            class="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-surface-hover/50 transition select-none"
            @click="toggleExpanded(i)"
          >
            <span
              :class="camp.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
              class="w-2 h-2 rounded-full flex-shrink-0"
            ></span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-ink truncate">
                {{ camp.title || 'Nova Campanha' }}
              </p>
              <p v-if="camp.start_date" class="text-xs text-ink-subtle mt-0.5">
                {{ formatDateRange(camp.start_date, camp.end_date) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span v-if="camp.template_id" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 flex items-center gap-1" title="Campanha vinculada à biblioteca">
                <i class="fas fa-link text-[9px]"></i> Vinculada
              </span>
              <span v-if="camp.value" class="text-xs font-semibold text-accent">
                {{ formatCurrency(camp.value) }}
              </span>
              <span
                :class="camp.is_active
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-surface-sunken text-ink-muted'"
                class="px-2 py-0.5 rounded-full text-xs font-semibold"
              >
                {{ camp.is_active ? 'Ativa' : 'Inativa' }}
              </span>
              <button
                @click.stop="removeCampaign(i)"
                class="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <i class="fas fa-trash text-xs"></i>
              </button>
              <i
                :class="expanded.has(i) ? 'fa-chevron-up' : 'fa-chevron-down'"
                class="fas text-ink-subtle text-xs w-4"
              ></i>
            </div>
          </div>

          <!-- Corpo da campanha -->
          <div v-show="expanded.has(i)" class="px-5 pb-5 pt-4 bg-gray-50/40 dark:bg-gray-800/20 border-t border-line">

            <!-- Vinculada: editar em todos ou desvincular -->
            <div v-if="camp.template_id && !readonly" class="flex items-center justify-between gap-3 flex-wrap mb-4 px-3.5 py-2.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
              <p class="text-xs text-teal-800 dark:text-teal-300">
                <i class="fas fa-link mr-1"></i>
                Campanha <strong>vinculada à biblioteca</strong> — escolha como editar.
              </p>
              <div class="flex items-center gap-2">
                <button @click="openTemplateEditor(camp)" class="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition">
                  <i class="fas fa-pen text-[10px] mr-1"></i> Editar em todos
                </button>
                <button @click="unlinkCampaign(i)" class="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition">
                  <i class="fas fa-link-slash text-[10px] mr-1"></i> Editar só aqui
                </button>
              </div>
            </div>

            <!-- Não vinculada: salvar na biblioteca p/ reusar em outros empreendimentos -->
            <div v-else-if="!camp.template_id && !readonly && camp.title" class="flex justify-end mb-3">
              <button @click="saveAsTemplate(i)" :disabled="savingTemplate" class="px-3 py-1.5 text-xs font-semibold text-accent bg-accent-soft border border-accent/20 rounded-lg hover:bg-accent-soft/70 disabled:opacity-50 transition">
                <i :class="savingTemplate ? 'fa-spinner fa-spin' : 'fa-book-bookmark'" class="fas text-[10px] mr-1"></i> Salvar como modelo
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" :class="camp.template_id ? 'opacity-60 pointer-events-none select-none' : ''">

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
                <label class="lbl">Pago por</label>
                <select
                  :value="camp.paid_by || ''"
                  @change="patchCamp(i, 'paid_by', $event.target.value || null)"
                  class="inp"
                >
                  <option value="">Não se aplica</option>
                  <option value="menin">Menin</option>
                  <option value="client">Cliente</option>
                </select>
              </div>

              <div>
                <label class="lbl">Status da Campanha</label>
                <div class="flex gap-2 mt-1">
                  <label
                    class="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
                    :class="camp.is_active === true
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 shadow-sm'
                      : 'border-line text-ink-muted bg-surface-raised/60 hover:border-gray-300 dark:hover:border-gray-600'"
                  >
                    <input type="radio" :checked="camp.is_active === true" @change="patchCamp(i, 'is_active', true)" class="sr-only" />
                    <span
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      :class="camp.is_active === true ? 'border-green-500 bg-green-500' : 'border-line'"
                    >
                      <span v-if="camp.is_active === true" class="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </span>
                    Ativa
                  </label>
                  <label
                    class="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
                    :class="camp.is_active !== true
                      ? 'border-gray-500 bg-surface-sunken/60 text-ink-muted shadow-sm'
                      : 'border-line text-ink-muted bg-surface-raised/60 hover:border-gray-300 dark:hover:border-gray-600'"
                  >
                    <input type="radio" :checked="camp.is_active !== true" @change="patchCamp(i, 'is_active', false)" class="sr-only" />
                    <span
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      :class="camp.is_active !== true ? 'border-gray-500 bg-gray-500' : 'border-line'"
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
      <div v-else class="flex flex-col items-center justify-center py-14 text-ink-subtle">
        <i class="fas fa-bullhorn text-3xl mb-3"></i>
        <p class="text-sm font-medium">Nenhuma campanha cadastrada</p>
        <p class="text-xs mt-1">Clique em "Nova Campanha" para começar</p>
      </div>

      <!-- Campanhas salvam junto com o módulo (botão único de Salvar no rodapé do módulo). -->
    </div>

    <!-- Modal: editar modelo em TODOS os empreendimentos vinculados -->
    <div v-if="tplModal.open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="tplModal.open = false">
      <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-lg border border-line max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-line">
          <div class="flex items-center gap-2">
            <i class="fas fa-pen text-teal-500"></i>
            <h2 class="text-base font-bold text-ink">Editar campanha em todos</h2>
          </div>
          <button @click="tplModal.open = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>
        <div class="px-6 py-5 space-y-4 overflow-y-auto">
          <div class="flex items-start gap-3 p-3.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-800 dark:text-teal-300 text-xs">
            <i class="fas fa-circle-info flex-shrink-0 mt-0.5"></i>
            <div v-if="tplModal.usage" class="space-y-1">
              <p>Usado em <strong>{{ tplModal.usage.total }}</strong> campanha(s), em <strong>{{ tplModal.usage.rows.length }}</strong> ficha(s). Ao aplicar:</p>
              <p>· o <strong>modelo da biblioteca</strong> é atualizado (novos usos já vêm com a versão nova);</p>
              <p>· <strong>{{ tplModal.usage.editable }}</strong> ficha(s) em rascunho atualizam agora;</p>
              <p v-if="tplLockedCount">· <strong>{{ tplLockedCount }}</strong> autorizada(s)/encerrada(s) não mudam (histórico preservado) — recebem a versão nova quando forem desbloqueadas e salvas.</p>
              <p v-if="conditionStatus === 'approved'" class="font-semibold">· Esta ficha está autorizada: a campanha daqui atualiza na tela — confirme com "Salvar Tudo" (a ficha volta a rascunho para reautorizar).</p>
            </div>
            <p v-else>Carregando onde este modelo é usado...</p>
          </div>
          <div>
            <label class="lbl">Título</label>
            <input v-model="tplModal.fields.title" type="text" class="inp" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="lbl">Início da Vigência</label>
              <input v-model="tplModal.fields.start_date" type="date" class="inp" />
            </div>
            <div>
              <label class="lbl">Fim da Vigência</label>
              <input v-model="tplModal.fields.end_date" type="date" class="inp" />
            </div>
            <div>
              <label class="lbl">Valor (se aplicável)</label>
              <div class="relative">
                <span class="pfx">R$</span>
                <input v-model.number="tplModal.fields.value" type="number" step="100" class="inp-pfx" placeholder="0,00" />
              </div>
            </div>
            <div>
              <label class="lbl">Pago por</label>
              <select v-model="tplModal.fields.paid_by" class="inp">
                <option :value="null">Não se aplica</option>
                <option value="menin">Menin</option>
                <option value="client">Cliente</option>
              </select>
            </div>
          </div>
          <div>
            <label class="lbl">Descrição</label>
            <textarea v-model="tplModal.fields.description" rows="2" class="inp resize-none" />
          </div>
          <div>
            <label class="lbl">Regulamento / Regras</label>
            <textarea v-model="tplModal.fields.rules" rows="3" class="inp resize-none" />
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-line">
          <button @click="tplModal.open = false" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
            Cancelar
          </button>
          <button @click="saveTemplateForAll" :disabled="tplModal.saving || !tplModal.fields.title"
            class="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition">
            <i :class="tplModal.saving ? 'fa-spinner fa-spin' : 'fa-check'" class="fas text-xs"></i>
            {{ tplModal.saving ? 'Aplicando...' : 'Aplicar' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

const props = defineProps({
    campaigns: { type: Array,   default: () => [] },
    saving:    { type: Boolean, default: false },
    readonly:  { type: Boolean, default: false },
    conditionStatus: { type: String, default: '' },
});
const emit = defineEmits(['update:campaigns', 'save', 'template-propagated']);

const store = useConditionsStore();

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
    return end ? `${fmt(start)} a ${fmt(end)}` : `a partir de ${fmt(start)}`;
}

// ── Biblioteca de campanhas (reuso entre empreendimentos) ─────────────────────

const showLibrary = ref(false);
const loadingLibrary = ref(false);
const savingTemplate = ref(false);

// Esconde modelos já vinculados a alguma campanha deste módulo.
const availableTemplates = computed(() => {
    const used = new Set(props.campaigns.map(c => c.template_id).filter(Boolean));
    return (store.campaignTemplates ?? []).filter(t => !used.has(t.id));
});

async function toggleLibrary() {
    showLibrary.value = !showLibrary.value;
    if (showLibrary.value && !store.campaignTemplates.length) {
        loadingLibrary.value = true;
        await store.fetchCampaignTemplates();
        loadingLibrary.value = false;
    }
}

function addFromTemplate(t) {
    const updated = [...props.campaigns, {
        template_id: t.id,
        title: t.title,
        description: t.description,
        rules: t.rules,
        start_date: t.start_date,
        end_date: t.end_date,
        value: t.value,
        paid_by: t.paid_by ?? null,
        is_active: true,
        sort_order: props.campaigns.length,
    }];
    emit('update:campaigns', updated);
    showLibrary.value = false;
    const s = new Set(expanded.value);
    s.add(updated.length - 1);
    expanded.value = s;
}

function unlinkCampaign(i) {
    patchCamp(i, 'template_id', null);
    store.notify('Campanha desvinculada do modelo — edições agora valem só nesta ficha. Para voltar, adicione de novo pela Biblioteca.');
}

// Promove uma campanha local a modelo da biblioteca (e vincula a origem).
async function saveAsTemplate(i) {
    const camp = props.campaigns[i];
    if (!camp?.title) return;
    savingTemplate.value = true;
    try {
        const t = await store.createCampaignTemplate({
            title: camp.title,
            description: camp.description,
            rules: camp.rules,
            start_date: camp.start_date,
            end_date: camp.end_date,
            value: camp.value,
            paid_by: camp.paid_by ?? null,
            from_campaign_id: camp.id ?? null,
        });
        patchCamp(i, 'template_id', t.id);
        store.notify(`Modelo "${camp.title}" salvo na biblioteca — disponível para os outros empreendimentos.`);
    } catch (e) {
        store.notify(e.message || 'Erro ao salvar modelo.', 'error');
    } finally {
        savingTemplate.value = false;
    }
}

// ── Modal: editar o modelo em TODOS os vinculados (só fichas rascunho) ────────

const tplModal = ref({ open: false, id: null, fields: {}, usage: null, saving: false });

// Fichas autorizadas/encerradas que usam o modelo (não mudam agora).
const tplLockedCount = computed(() =>
    tplModal.value.usage ? tplModal.value.usage.rows.filter(r => r.status !== 'draft').length : 0);

async function openTemplateEditor(camp) {
    tplModal.value = {
        open: true,
        id: camp.template_id,
        saving: false,
        usage: null,
        fields: {
            title: camp.title,
            description: camp.description,
            rules: camp.rules,
            start_date: camp.start_date,
            end_date: camp.end_date,
            value: camp.value,
            paid_by: camp.paid_by ?? null,
        },
    };
    try { tplModal.value.usage = await store.fetchCampaignTemplateUsage(camp.template_id); }
    catch (e) { console.warn('[CampaignManager] usage:', e.message); }
}

async function saveTemplateForAll() {
    const m = tplModal.value;
    if (!m.id || !m.fields.title) return;
    m.saving = true;
    try {
        await store.updateCampaignTemplate(m.id, { ...m.fields, propagate: true });
        // O backend já persistiu nas fichas rascunho (incluindo esta); o Detail
        // sincroniza as cópias locais de TODOS os módulos sem marcar isDirty.
        emit('template-propagated', { templateId: m.id, fields: { ...m.fields } });
        tplModal.value = { open: false, id: null, fields: {}, usage: null, saving: false };
    } catch (e) {
        store.notify(e.message || 'Erro ao atualizar o modelo.', 'error');
        m.saving = false;
    }
}
</script>

<style scoped>
.lbl-section { @apply text-xs font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-2; }
.lbl     { @apply block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5; }
.inp     { @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.inp-pfx { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.pfx     { @apply absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none; }
.btn-primary { @apply flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50 transition; }
</style>
