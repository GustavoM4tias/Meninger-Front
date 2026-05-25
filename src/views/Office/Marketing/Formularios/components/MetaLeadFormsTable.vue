<script setup>
// Lista os Lead Forms da Meta cacheados localmente. Botão "Sincronizar" busca
// na Graph API e atualiza o cache. Clique numa linha abre o modal de mapping.

import { onMounted, ref, computed } from 'vue';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import MetaFormMappingModal from './MetaFormMappingModal.vue';

const store = useMetaFormsStore();

const modalOpen = ref(false);
const editing = ref(null);

const search = ref('');
const filterStatus = ref('ALL');     // ALL | ACTIVE | OTHER
const filterMapping = ref('ALL');    // ALL | MAPPED | UNMAPPED

function openEdit(f) { editing.value = f; modalOpen.value = true; }

onMounted(() => store.fetchAll());

async function doSync() {
    await store.syncFromMeta();
}

// Lookup rápido pra exibir nome de empreendimento (poderíamos cachear; por ora
// mostra só o id — o modal mostra os nomes via EnterpriseMultiSelect).

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return store.forms.filter(f => {
        if (filterStatus.value === 'ACTIVE' && String(f.status).toUpperCase() !== 'ACTIVE') return false;
        if (filterStatus.value === 'OTHER' && String(f.status).toUpperCase() === 'ACTIVE') return false;

        const hasMapping = f.mapping_active && !!f.midia_slug;
        if (filterMapping.value === 'MAPPED' && !hasMapping) return false;
        if (filterMapping.value === 'UNMAPPED' && hasMapping) return false;

        if (q) {
            const name = String(f.name || '').toLowerCase();
            const id = String(f.id);
            const page = String(f.page_name || '').toLowerCase();
            const midia = String(f.midia_slug || '').toLowerCase();
            if (!name.includes(q) && !id.includes(q) && !page.includes(q) && !midia.includes(q)) return false;
        }
        return true;
    });
});

function statusBadge(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'ACTIVE')   return { label: 'Ativo',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s === 'ARCHIVED') return { label: 'Arquivado', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s === 'DELETED')  return { label: 'Excluído',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s === 'DRAFT')    return { label: 'Rascunho',  cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return '—'; }
}
</script>

<template>
  <div class="space-y-3">

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <input v-model="search" type="text" placeholder="Buscar por nome, mídia ou ID..."
        class="flex-1 min-w-[200px] rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />

      <select v-model="filterStatus" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Todos status</option>
        <option value="ACTIVE">Só ativos</option>
        <option value="OTHER">Não-ativos</option>
      </select>

      <select v-model="filterMapping" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Todos mappings</option>
        <option value="MAPPED">Com vínculo</option>
        <option value="UNMAPPED">Sem vínculo</option>
      </select>

      <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
        Atualizar
      </Button>
      <Button variant="primary" size="sm" icon="fab fa-meta" :loading="store.syncing" @click="doSync">
        Sincronizar com Meta
      </Button>
    </div>

    <!-- Resultado do último sync -->
    <div v-if="store.lastSync"
      class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
      <i class="fas fa-circle-check mr-1.5"></i>
      Sincronizado: <b>{{ store.lastSync.pages_count }}</b> Página(s),
      <b>{{ store.lastSync.forms_total }}</b> formulário(s)
      ({{ store.lastSync.forms_new }} novo(s), {{ store.lastSync.forms_updated }} atualizado(s))
      <span v-if="store.lastSync.errors?.length" class="text-amber-700 dark:text-amber-300">
        · {{ store.lastSync.errors.length }} erro(s)
      </span>
    </div>

    <!-- Erro -->
    <div v-if="store.error"
      class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
      <i class="fas fa-circle-exclamation mt-0.5"></i>
      <div>{{ store.error }}</div>
    </div>

    <!-- Tabela -->
    <Surface variant="raised" padding="none" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-sunken/30 border-b border-line">
            <tr>
              <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Form</th>
              <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Página</th>
              <th class="px-4 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
              <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Vínculo</th>
              <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimentos</th>
              <th class="px-4 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Roteamento</th>
              <th class="px-4 py-2.5 text-left  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Sync</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr v-if="store.loading">
              <td colspan="7" class="px-4 py-10 text-center text-ink-subtle">
                <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
              </td>
            </tr>
            <tr v-else-if="!store.forms.length">
              <td colspan="7" class="px-4 py-10 text-center text-ink-subtle">
                Nenhum formulário sincronizado ainda. Clique em <b>"Sincronizar com Meta"</b>.
              </td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="7" class="px-4 py-10 text-center text-ink-subtle">
                Nenhum formulário corresponde aos filtros.
              </td>
            </tr>
            <tr v-else v-for="f in filtered" :key="f.id"
              @click="openEdit(f)"
              class="hover:bg-surface-hover/40 cursor-pointer transition-colors">

              <!-- Form -->
              <td class="px-4 py-2.5">
                <div class="text-ink font-medium leading-tight">{{ f.name || '(sem nome)' }}</div>
                <div class="text-[11px] font-mono text-ink-subtle">#{{ f.id }}</div>
              </td>

              <!-- Página -->
              <td class="px-4 py-2.5 text-ink-muted">
                {{ f.page_name || '—' }}
                <div class="text-[10px] font-mono text-ink-subtle">{{ f.page_id }}</div>
              </td>

              <!-- Status Meta -->
              <td class="px-4 py-2.5 text-center">
                <span :class="['inline-flex rounded-md border px-2 py-0.5 text-xs font-medium', statusBadge(f.status).cls]">
                  {{ statusBadge(f.status).label }}
                </span>
              </td>

              <!-- Vínculo (mídia + origem) -->
              <td class="px-4 py-2.5">
                <template v-if="f.midia_slug">
                  <div class="font-mono text-xs text-ink">{{ f.midia_slug }}</div>
                  <div class="text-[10px] text-ink-subtle">{{ f.cv_origem || 'FB' }}</div>
                </template>
                <span v-else class="text-xs text-ink-subtle italic">sem vínculo</span>
              </td>

              <!-- Empreendimentos -->
              <td class="px-4 py-2.5 text-ink-muted">
                <span v-if="Array.isArray(f.bound_empreendimentos) && f.bound_empreendimentos.length">
                  <span class="text-xs">{{ f.bound_empreendimentos.length }} empreend.</span>
                  <span class="text-[10px] text-ink-subtle ml-1">#{{ f.bound_empreendimentos.slice(0, 3).join(', #') }}{{ f.bound_empreendimentos.length > 3 ? '…' : '' }}</span>
                </span>
                <span v-else class="text-xs text-ink-subtle italic">—</span>
              </td>

              <!-- Roteamento -->
              <td class="px-4 py-2.5 text-center">
                <span v-if="f.mapping_active && f.midia_slug"
                  class="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium">
                  <i class="fas fa-bolt text-[10px]"></i>Auto
                </span>
                <span v-else
                  class="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 text-xs font-medium">
                  <i class="fas fa-hand text-[10px]"></i>Manual
                </span>
              </td>

              <!-- Sync -->
              <td class="px-4 py-2.5 text-[11px] text-ink-subtle">{{ fmtDate(f.last_synced_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Surface>

    <MetaFormMappingModal
      v-model:open="modalOpen"
      :form="editing"
      @saved="store.fetchAll()" />
  </div>
</template>
