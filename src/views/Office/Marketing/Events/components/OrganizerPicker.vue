<script setup>
import { ref, computed } from 'vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const query = ref('');
const externalName = ref('');
const externalEmail = ref('');
const externalPosition = ref('');

const normalizeText = (v) =>
  String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const filteredUsers = computed(() => {
  const q = normalizeText(query.value);
  const selectedIds = new Set(props.modelValue.filter(o => o.type === 'user').map(o => o.id));
  const base = !q
    ? props.users
    : props.users.filter(u => {
        const haystack = normalizeText([u.username, u.email, u.position].filter(Boolean).join(' '));
        return haystack.includes(q);
      });
  return base.filter(u => !selectedIds.has(u.id)).slice(0, 8);
});

function addUser(u) {
  if (props.modelValue.some(o => o.type === 'user' && o.id === u.id)) return;
  emit('update:modelValue', [
    ...props.modelValue,
    { type: 'user', id: u.id, name: u.username, email: u.email, position: u.position || undefined },
  ]);
  query.value = '';
}

function addExternal() {
  const name = externalName.value.trim();
  if (!name) return;
  emit('update:modelValue', [
    ...props.modelValue,
    {
      type: 'external',
      name,
      email: externalEmail.value.trim() || undefined,
      position: externalPosition.value.trim() || undefined,
    },
  ]);
  externalName.value = ''; externalEmail.value = ''; externalPosition.value = '';
}

function removeAt(idx) {
  const next = [...props.modelValue];
  next.splice(idx, 1);
  emit('update:modelValue', next);
}

const resolveUser = (id) => props.users.find(u => u.id === id);
const displayPosition = (o) => o.type === 'user' ? (resolveUser(o.id)?.position || o.position) : o.position;
const displayEmail = (o) => o.type === 'user' ? (resolveUser(o.id)?.email || o.email) : o.email;
</script>

<template>
  <div class="space-y-5">
    <!-- Selecionados -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-1.5">
      <span v-for="(o, i) in modelValue" :key="i"
        class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs rounded-md
               bg-accent-soft text-accent border border-accent/20">
        <i :class="o.type === 'user' ? 'fas fa-user' : 'fas fa-user-plus'" class="text-[9px]"></i>
        <span class="truncate max-w-64">
          {{ o.name }}
          <span v-if="displayPosition(o)" class="opacity-70"> · {{ displayPosition(o) }}</span>
          <span v-else-if="displayEmail(o)" class="opacity-70"> ({{ displayEmail(o) }})</span>
        </span>
        <button type="button" @click="removeAt(i)"
          class="h-4 w-4 grid place-items-center rounded hover:bg-accent/20 transition-colors leading-none">
          <i class="fas fa-xmark text-[9px]"></i>
        </button>
      </span>
    </div>

    <!-- Buscar usuários -->
    <div class="space-y-2">
      <Input v-model="query" label="Usuários internos"
        placeholder="Buscar por nome, e-mail ou cargo"
        iconLeft="fas fa-magnifying-glass" />

      <div v-if="query && filteredUsers.length"
        class="rounded-lg border border-line bg-surface-overlay shadow-elevated overflow-hidden">
        <div class="max-h-56 overflow-y-auto divide-y divide-line">
          <button v-for="u in filteredUsers" :key="u.id" type="button" @mousedown.prevent="addUser(u)"
            class="w-full px-3 py-2.5 text-left hover:bg-accent-soft/40 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink truncate">{{ u.username }}</p>
                <p class="text-xs text-ink-muted truncate">{{ u.email || 'Sem e-mail' }}</p>
              </div>
              <Badge v-if="u.position" variant="accent" size="sm">{{ u.position }}</Badge>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Externo -->
    <div class="space-y-2">
      <p class="text-xs font-medium text-ink-muted">Adicionar externo</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input v-model="externalName" placeholder="Nome" />
        <Input v-model="externalEmail" type="email" placeholder="E-mail (opcional)" />
        <Input v-model="externalPosition" placeholder="Cargo (opcional)" />
      </div>
      <div class="flex justify-end">
        <Button variant="secondary" size="sm" icon="fas fa-plus"
          @click="addExternal" :disabled="!externalName.trim()">
          Adicionar externo
        </Button>
      </div>
    </div>
  </div>
</template>
