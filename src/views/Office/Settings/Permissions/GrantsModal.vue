<script setup>
// Modal de liberação de EMPREENDIMENTOS (dados) para um sujeito:
//   subject-type="user"    → liberação individual
//   subject-type="profile" → liberação do perfil vivo (propaga p/ vinculados)
//
// Árvore Empresa → Empreendimentos com atalhos "empresa inteira" e por cidade.
// Os atalhos EXPANDEM para ids explícitos — a liberação é sempre por
// empreendimento (auditável; empreendimento novo não entra sozinho).

import { ref, computed, watch } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  subjectType: { type: String, default: 'user' },   // 'user' | 'profile'
  subjectId: { type: [Number, String], default: null },
  subjectName: { type: String, default: '' },
});
const emit = defineEmits(['close', 'saved']);

const options = ref([]);       // [{ id, name, city, uf, companyId, companyName, pairStatus }]
const selected = ref(new Set());
const original = ref(new Set());
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const search = ref('');

const dirty = computed(() => {
  if (selected.value.size !== original.value.size) return true;
  for (const id of selected.value) if (!original.value.has(id)) return true;
  return false;
});

async function load() {
  if (!props.subjectId) return;
  loading.value = true;
  error.value = '';
  try {
    const [opts, grants] = await Promise.all([
      requestWithAuth('/permissions/enterprise-options'),
      requestWithAuth(`/permissions/grants/${props.subjectType}/${props.subjectId}`),
    ]);
    options.value = Array.isArray(opts) ? opts : [];
    selected.value = new Set((grants?.enterpriseIds || []).map(Number));
    original.value = new Set(selected.value);
  } catch (e) {
    error.value = e.message || 'Erro ao carregar liberações.';
  } finally {
    loading.value = false;
  }
}

watch(() => [props.open, props.subjectId], ([open]) => { if (open) load(); }, { immediate: true });

// ── Agrupamentos ─────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return options.value;
  return options.value.filter(o =>
    String(o.name || '').toLowerCase().includes(q) ||
    String(o.city || '').toLowerCase().includes(q) ||
    String(o.companyName || '').toLowerCase().includes(q));
});

const byCompany = computed(() => {
  const map = new Map();
  for (const o of filtered.value) {
    const key = o.companyId || 0;
    if (!map.has(key)) map.set(key, { companyId: o.companyId, companyName: o.companyName || 'Sem empresa vinculada', items: [] });
    map.get(key).items.push(o);
  }
  return [...map.values()].sort((a, b) => String(a.companyName).localeCompare(String(b.companyName), 'pt-BR'));
});

const cities = computed(() => {
  const set = new Set(options.value.map(o => (o.city || '').trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

// ── Toggles ──────────────────────────────────────────────────────────────────
function toggleOne(id) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  selected.value = s;
}
function companyAllSelected(group) {
  return group.items.every(o => selected.value.has(o.id));
}
function toggleCompany(group, grant) {
  const s = new Set(selected.value);
  for (const o of group.items) grant ? s.add(o.id) : s.delete(o.id);
  selected.value = s;
}
function cityCount(city) {
  return options.value.filter(o => (o.city || '').trim() === city && selected.value.has(o.id)).length;
}
function cityTotal(city) {
  return options.value.filter(o => (o.city || '').trim() === city).length;
}
function toggleCity(city) {
  const items = options.value.filter(o => (o.city || '').trim() === city);
  const all = items.every(o => selected.value.has(o.id));
  const s = new Set(selected.value);
  for (const o of items) all ? s.delete(o.id) : s.add(o.id);
  selected.value = s;
}
function clearAll() { selected.value = new Set(); }
function selectAll() { selected.value = new Set(options.value.map(o => o.id)); }

async function save() {
  if (!props.subjectId || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await requestWithAuth(`/permissions/grants/${props.subjectType}/${props.subjectId}`, {
      method: 'PUT',
      body: JSON.stringify({ enterpriseIds: [...selected.value] }),
    });
    original.value = new Set(selected.value);
    emit('saved', selected.value.size);
    emit('close');
  } catch (e) {
    error.value = e.message || 'Erro ao salvar liberações.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal :open="open" size="lg" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-building-lock text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink">Empreendimentos liberados</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate">
            {{ subjectType === 'profile' ? 'Perfil' : 'Usuário' }}: {{ subjectName }}
            · <span class="font-mono">{{ selected.size }}</span> liberado(s)
            <span v-if="subjectType === 'profile'" class="text-amber-600 dark:text-amber-400">
              · propaga para todos os usuários do perfil
            </span>
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div v-if="error"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ error }}
      </div>

      <div v-if="loading" class="animate-pulse space-y-2">
        <div class="h-9 bg-surface-sunken rounded-lg"></div>
        <div v-for="i in 5" :key="i" class="h-10 bg-surface-sunken/60 rounded-lg"></div>
      </div>

      <template v-else>
        <EmptyState v-if="!options.length" icon="far fa-building" title="Nenhum empreendimento no registro"
          description="Rode a Sincronização de empresas (Settings > Empresas) primeiro." />

        <template v-else>
          <Input v-model="search" placeholder="Buscar empreendimento, cidade ou empresa…"
            iconLeft="fas fa-magnifying-glass" />

          <!-- Atalhos por cidade -->
          <div v-if="cities.length" class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] text-ink-subtle mr-1"><i class="fas fa-city mr-1"></i>Cidades:</span>
            <button v-for="c in cities" :key="c" @click="toggleCity(c)"
              class="px-2 py-1 text-[11px] rounded-lg border transition-colors"
              :class="cityCount(c) === cityTotal(c) && cityTotal(c) > 0
                ? 'bg-accent text-white border-accent'
                : cityCount(c) > 0
                  ? 'border-accent/40 text-accent bg-accent-soft/40'
                  : 'border-line text-ink-muted hover:bg-surface-hover'">
              {{ c }} <span class="font-mono">{{ cityCount(c) }}/{{ cityTotal(c) }}</span>
            </button>
          </div>

          <div class="flex gap-3 px-0.5">
            <button @click="selectAll" class="text-xs text-accent hover:underline">
              <i class="fas fa-check-double mr-1"></i>Liberar tudo
            </button>
            <span class="text-line">|</span>
            <button @click="clearAll" class="text-xs text-red-500 hover:underline">
              <i class="fas fa-ban mr-1"></i>Limpar tudo
            </button>
          </div>

          <!-- Árvore Empresa → Empreendimentos -->
          <div class="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
            <div v-for="group in byCompany" :key="group.companyId || 'none'"
              class="border border-line rounded-lg overflow-hidden bg-surface-raised">
              <div class="flex items-center justify-between gap-3 px-3 py-2 bg-surface-sunken/40">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-building text-ink-subtle text-xs"></i>
                  <span class="text-xs font-medium text-ink truncate">{{ group.companyName }}</span>
                  <span class="text-[10px] text-ink-subtle font-mono">
                    {{ group.items.filter(o => selected.has(o.id)).length }}/{{ group.items.length }}
                  </span>
                </div>
                <Switch :model-value="companyAllSelected(group)" size="sm"
                  @update:model-value="(v) => toggleCompany(group, v)" />
              </div>
              <div class="divide-y divide-line">
                <div v-for="o in group.items" :key="o.id"
                  class="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-sunken/30 transition-colors">
                  <div class="min-w-0 flex items-center gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-ink truncate">{{ o.name || '—' }}</p>
                      <p class="text-[10px] font-mono text-ink-subtle">
                        {{ o.city || 'sem cidade' }}<span v-if="o.uf">/{{ o.uf }}</span>
                      </p>
                    </div>
                    <Badge v-if="o.pairStatus !== 'paired'" variant="warning" size="sm">
                      {{ o.pairStatus === 'cv_only' ? 'só CV' : 'só Sienge' }}
                    </Badge>
                  </div>
                  <Switch :model-value="selected.has(o.id)" size="sm"
                    @update:model-value="() => toggleOne(o.id)" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>
      <Button :loading="saving" :disabled="!dirty" icon="fas fa-floppy-disk" @click="save">
        {{ saving ? 'Salvando...' : 'Salvar liberações' }}
      </Button>
    </template>
  </Modal>
</template>
