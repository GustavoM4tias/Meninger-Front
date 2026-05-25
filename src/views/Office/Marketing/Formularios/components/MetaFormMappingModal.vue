<script setup>
// Modal de mapping de um Lead Form da Meta — define empreendimento(s), mídia
// e origem (FB/IG) que serão aplicados a leads que entrarem por esse form.
// Quando mapping_active=true + midia_slug preenchidos, leads novos viram
// 'routed' direto (sem precisar roteamento manual).

import { ref, watch, computed } from 'vue';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    form: { type: Object, default: null }, // o meta form do banco (com mapping)
});
const emit = defineEmits(['update:open', 'saved']);

const store = useMetaFormsStore();

// Form state
const bound = ref([]);
const midia = ref('');
const origem = ref('FB');
const tagsRaw = ref('');
const active = ref(true);

const localError = ref(null);

function close() { emit('update:open', false); }

// Carrega quando abre / form muda
watch([() => props.open, () => props.form], ([isOpen, f]) => {
    if (!isOpen) return;
    bound.value = Array.isArray(f?.bound_empreendimentos) ? [...f.bound_empreendimentos] : [];
    midia.value = f?.midia_slug || '';
    origem.value = f?.cv_origem || 'FB';
    tagsRaw.value = Array.isArray(f?.tags) ? f.tags.join(', ') : '';
    active.value = f?.mapping_active !== false;
    localError.value = null;
}, { immediate: true });

const tagsArray = computed(() => {
    return String(tagsRaw.value || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
});

const willRoute = computed(() => active.value && !!midia.value.trim());

async function save() {
    localError.value = null;
    if (active.value && !midia.value.trim()) {
        localError.value = 'Mídia é obrigatória para ativar o roteamento automático. Desative o mapping ou informe a mídia.';
        return;
    }
    const patch = {
        bound_empreendimentos: bound.value,
        midia_slug: midia.value.trim() || null,
        cv_origem: origem.value || 'FB',
        tags: tagsArray.value.length ? tagsArray.value : null,
        mapping_active: active.value,
    };
    const updated = await store.updateMapping(props.form.id, patch);
    if (updated) {
        emit('saved', updated);
        close();
    } else {
        localError.value = store.error || 'Erro ao salvar.';
    }
}

const statusBadge = computed(() => {
    const s = String(props.form?.status || '').toUpperCase();
    if (s === 'ACTIVE')   return { label: 'Ativo na Meta',  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s === 'ARCHIVED') return { label: 'Arquivado',      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s === 'DELETED')  return { label: 'Excluído',       cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s === 'DRAFT')    return { label: 'Rascunho',       cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <div class="bg-surface text-ink w-full max-w-2xl rounded-xl shadow-xl border border-line max-h-[90vh] overflow-y-auto">

      <!-- Header -->
      <header class="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-line">
        <div class="shrink-0 w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          <i class="fab fa-meta text-lg"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-ink leading-tight">Mapeamento — {{ form?.name || 'Formulário Meta' }}</h3>
          <p class="text-xs text-ink-subtle mt-0.5">
            <span class="font-mono">#{{ form?.id }}</span>
            <span v-if="form?.page_name"> · {{ form.page_name }}</span>
          </p>
        </div>
        <span :class="['inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium', statusBadge.cls]">
          {{ statusBadge.label }}
        </span>
        <button @click="close" class="shrink-0 text-ink-subtle hover:text-ink p-1">
          <i class="fas fa-times"></i>
        </button>
      </header>

      <!-- Body -->
      <div class="p-5 space-y-5">

        <!-- Info do form (read-only) -->
        <section class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div><span class="text-ink-subtle">Página:</span> <span class="text-ink">{{ form?.page_name || '—' }}</span></div>
            <div><span class="text-ink-subtle">Locale:</span> <span class="text-ink">{{ form?.locale || '—' }}</span></div>
            <div class="col-span-2"><span class="text-ink-subtle">Criado em:</span> <span class="text-ink">{{ form?.created_time ? new Date(form.created_time).toLocaleString('pt-BR') : '—' }}</span></div>
            <div class="col-span-2"><span class="text-ink-subtle">Última sync:</span> <span class="text-ink">{{ form?.last_synced_at ? new Date(form.last_synced_at).toLocaleString('pt-BR') : '—' }}</span></div>
          </div>
          <div v-if="Array.isArray(form?.questions) && form.questions.length" class="mt-2 pt-2 border-t border-line/60">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Campos do form</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="q in form.questions" :key="q.key" class="inline-flex rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-muted border border-line/60 font-mono">
                {{ q.key }}<span v-if="q.label && q.label !== q.key" class="text-ink-subtle"> · {{ q.label }}</span>
              </span>
            </div>
          </div>
        </section>

        <!-- Toggle: ativo -->
        <section>
          <label class="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" v-model="active" class="h-4 w-4 rounded border-line accent-emerald-500" />
            <span class="text-sm text-ink font-medium">Roteamento automático ativo</span>
          </label>
          <p class="text-xs text-ink-subtle mt-1 ml-6">
            Quando ativo + mídia configurada, leads desse formulário são roteados direto ao CV.
            Quando inativo, ficam em <span class="font-mono">held</span> aguardando roteamento manual.
          </p>
        </section>

        <!-- Empreendimentos -->
        <section>
          <label class="text-sm font-medium text-ink block mb-1.5">Empreendimentos vinculados</label>
          <p class="text-xs text-ink-subtle mb-2">
            Leads desse formulário serão associados a esses empreendimentos no CV. Deixe vazio se for genérico (lead vai sem vínculo de empreendimento).
          </p>
          <EnterpriseMultiSelect v-model="bound" />
        </section>

        <!-- Mídia + origem -->
        <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label class="text-sm font-medium text-ink block mb-1.5">Mídia (midia_slug)</label>
            <input v-model="midia" type="text" placeholder="ex: meta-lancamento-wish"
              class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 font-mono" />
            <p class="text-[11px] text-ink-subtle mt-1">Slug que aparece como "mídia" no CV. Use kebab-case.</p>
          </div>
          <div>
            <label class="text-sm font-medium text-ink block mb-1.5">Origem CV</label>
            <select v-model="origem" class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40">
              <option value="FB">FB (Facebook)</option>
              <option value="IG">IG (Instagram)</option>
            </select>
            <p class="text-[11px] text-ink-subtle mt-1">Origem (2 letras, enum CV).</p>
          </div>
        </section>

        <!-- Tags -->
        <section>
          <label class="text-sm font-medium text-ink block mb-1.5">Tags <span class="text-ink-subtle font-normal">(opcional)</span></label>
          <input v-model="tagsRaw" type="text" placeholder="lancamento, vip, sp"
            class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />
          <p class="text-[11px] text-ink-subtle mt-1">Separe por vírgula. Vão no lead pra facilitar filtros.</p>
        </section>

        <!-- Preview do comportamento -->
        <section class="rounded-lg border px-3 py-2.5"
          :class="willRoute ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'">
          <div class="text-xs font-medium" :class="willRoute ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">
            <i :class="willRoute ? 'fas fa-bolt' : 'fas fa-hand'" class="mr-1.5"></i>
            <template v-if="willRoute">
              Novo lead vai direto pra <span class="font-mono">routed</span> e despacha pro CV.
            </template>
            <template v-else>
              Novo lead fica em <span class="font-mono">held</span> aguardando roteamento manual.
            </template>
          </div>
        </section>

        <div v-if="localError" class="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          <i class="fas fa-circle-exclamation mr-1.5"></i>{{ localError }}
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-line flex items-center justify-end gap-2 bg-surface-sunken/30">
        <Button variant="secondary" size="sm" @click="close" :disabled="store.saving">Cancelar</Button>
        <Button variant="primary" size="sm" icon="fas fa-save" :loading="store.saving" @click="save">Salvar mapping</Button>
      </footer>
    </div>
  </div>
</template>
