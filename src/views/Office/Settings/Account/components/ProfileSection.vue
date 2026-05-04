<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { updateMeInfo } from '@/utils/Auth/apiAuth';
import API_URL from '@/config/apiUrl';

import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import FacialAuth from './FacialAuth.vue';

const toast = useToast();
const authStore = useAuthStore();

const isAdmin = computed(() => authStore.user?.role === 'admin');

// ─── Form state ──────────────────────────────────────
const editableUser = ref({
  username: '', email: '', phone: '', city: '', position: '',
  birth_date: '', status: false, face_enabled: false,
});
const originalUser = ref({});
const isDisabled = ref(true);
const profileLoading = ref(false);

function fillEditableUser() {
  if (!authStore.user) return;
  const data = {
    username:     authStore.user.username,
    email:        authStore.user.email,
    phone:        authStore.user.phone || '',
    city:         authStore.user.city,
    position:     authStore.user.position,
    birth_date:   authStore.user.birth_date,
    status:       authStore.user.status,
    face_enabled: authStore.user.face_enabled,
  };
  editableUser.value = { ...data };
  originalUser.value = { ...data };
}

watch(() => authStore.user, fillEditableUser, { immediate: true });

// ─── Positions ───────────────────────────────────────
const positionsOptions = ref([]);
const positionDescMap = ref({});
const selectedPositionDesc = computed(() =>
  editableUser.value.position ? positionDescMap.value[editableUser.value.position] || '' : ''
);

async function loadPositions() {
  try {
    const res = await fetch(`${API_URL}/admin/positions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.data || []);
    const active = list.filter(p => p?.active && p?.is_internal);
    positionsOptions.value = active
      .map(p => ({ label: p.name, value: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    positionDescMap.value = Object.fromEntries(active.map(p => [p.name, p.description || '']));
  } catch { /* silencioso */ }
}

loadPositions();

// ─── Avatar / metadata ───────────────────────────────
const avatarUrl = computed(() => {
  const initials = (authStore.user?.username ?? '').split(' ').slice(0, 2)
    .map(n => n[0]?.toUpperCase()).join(' ');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=128`;
});

const memberSince = computed(() => {
  if (!authStore.user?.created_at) return '—';
  return new Date(authStore.user.created_at).toLocaleDateString('pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' });
});

const daysInSystem = computed(() => {
  if (!authStore.user?.created_at) return 'N/A';
  const diff = Math.abs(new Date() - new Date(authStore.user.created_at));
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ─── Actions ─────────────────────────────────────────
function toggleEdit() { isDisabled.value = !isDisabled.value; }

function cancelEdit() {
  editableUser.value = { ...originalUser.value };
  isDisabled.value = true;
}

async function updateUser() {
  profileLoading.value = true;
  try {
    await updateMeInfo(
      editableUser.value.username, editableUser.value.email,
      editableUser.value.position, editableUser.value.city,
      editableUser.value.birth_date, editableUser.value.status,
      editableUser.value.face_enabled, editableUser.value.phone || null,
    );
    await authStore.fetchUserInfo();
    fillEditableUser();
    isDisabled.value = true;
    toast.success('Perfil atualizado com sucesso!');
  } catch (error) {
    toast.error(error?.message || 'Erro ao atualizar informações.');
  } finally {
    profileLoading.value = false;
  }
}
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient overflow-hidden">

    <!-- Hero -->
    <div class="relative px-4 sm:px-5 pt-5 pb-4 bg-gradient-to-br from-accent-soft/40 to-transparent">
      <div class="flex items-start gap-3 sm:gap-4">
        <!-- Avatar -->
        <div class="relative shrink-0">
          <img :src="avatarUrl" alt="avatar"
            class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-line shadow-soft" />
          <div v-tippy="authStore.user?.face_enabled
              ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'"
            class="absolute -bottom-1 -right-1 h-5 w-5 grid place-items-center rounded-full ring-2 ring-surface-raised"
            :class="authStore.user?.face_enabled ? 'bg-emerald-500' : 'bg-ink-subtle'">
            <i class="fas fa-users-viewfinder text-white text-[8px]"></i>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h2 class="text-base sm:text-lg font-semibold text-ink truncate">{{ authStore.user?.username }}</h2>
          <p class="text-sm text-ink-muted truncate">{{ authStore.user?.position || 'Cargo não definido' }}</p>
          <p class="text-xs text-ink-subtle font-mono truncate mt-0.5">
            <i class="fas fa-location-dot text-[9px] mr-1"></i>{{ authStore.user?.city || 'Cidade não informada' }}
          </p>
        </div>

        <!-- Toggle edit -->
        <Button :variant="isDisabled ? 'secondary' : 'ghost'" size="sm"
          :icon="isDisabled ? 'fas fa-pen' : 'fas fa-xmark'"
          @click="toggleEdit">
          <span class="hidden sm:inline">{{ isDisabled ? 'Editar' : 'Cancelar' }}</span>
        </Button>
      </div>

      <!-- Meta -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-line/50 text-xs text-ink-muted">
        <span class="inline-flex items-center gap-1.5 font-mono">
          <i class="far fa-calendar text-ink-subtle text-[10px]"></i>
          Membro desde {{ memberSince }}
        </span>
        <span class="inline-flex items-center gap-1.5 font-mono">
          <i class="far fa-clock text-ink-subtle text-[10px]"></i>
          {{ daysInSystem }} dia(s) no sistema
        </span>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="updateUser" class="p-4 sm:p-5 border-t border-line">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

        <Input v-model="editableUser.username" :disabled="isDisabled"
          label="Nome completo" placeholder="Seu nome completo" required class="md:col-span-2" />

        <Input v-model="editableUser.email" :disabled="isDisabled" type="email"
          label="E-mail" placeholder="seu@email.com" required iconLeft="fas fa-envelope" />

        <Input v-model="editableUser.phone" :disabled="isDisabled" type="tel"
          label="Telefone (com DDD)" placeholder="(11) 99999-9999" iconLeft="fas fa-phone" />

        <Input v-model="editableUser.birth_date" :disabled="isDisabled" type="date"
          label="Data de nascimento" required />

        <!-- Cidade — só admin pode alterar via outro lugar -->
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Cidade</label>
          <div class="relative">
            <Input v-model="editableUser.city" disabled placeholder="Cidade não informada" />
            <span v-tippy="'Editável somente pelo administrador'"
              class="absolute inset-y-0 right-3 flex items-center text-ink-subtle pointer-events-none">
              <i class="fas fa-lock text-xs"></i>
            </span>
          </div>
        </div>

        <!-- Cargo (admin only) -->
        <div v-if="isAdmin" class="md:col-span-2 space-y-1.5">
          <UiSelect v-if="!isDisabled" v-model="editableUser.position" :options="positionsOptions"
            label="Cargo" placeholder="Selecione o cargo" required />
          <Input v-else v-model="editableUser.position" disabled label="Cargo" placeholder="Seu cargo" />

          <transition name="fade">
            <div v-if="selectedPositionDesc && !isDisabled"
              class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2 flex items-start gap-2">
              <i class="fas fa-circle-info text-accent text-xs mt-0.5 shrink-0"></i>
              <p class="text-xs text-accent leading-relaxed">{{ selectedPositionDesc }}</p>
            </div>
          </transition>
        </div>

        <!-- Face ID -->
        <transition name="fade">
          <div v-if="!isDisabled"
            class="md:col-span-2 flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-sunken border border-line">
            <div class="flex items-center gap-3 min-w-0">
              <div class="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                :class="editableUser.face_enabled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-surface text-ink-subtle border border-line'">
                <i class="fas fa-users-viewfinder text-sm"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">Reconhecimento facial</p>
                <p class="text-xs text-ink-muted truncate">
                  {{ editableUser.face_enabled
                    ? 'Ativo — login por câmera habilitado' : 'Inativo' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <FacialAuth>
                {{ authStore.user?.face_enabled ? 'Recadastrar' : 'Cadastrar' }}
              </FacialAuth>
              <Switch v-model="editableUser.face_enabled" size="sm" />
            </div>
          </div>
        </transition>
      </div>

      <!-- Actions -->
      <transition name="fade">
        <div v-if="!isDisabled"
          class="flex flex-wrap gap-2 mt-5 pt-5 border-t border-line">
          <Button type="submit" :loading="profileLoading" icon="fas fa-check">
            {{ profileLoading ? 'Salvando...' : 'Salvar alterações' }}
          </Button>
          <Button type="button" variant="ghost" @click="cancelEdit">Cancelar</Button>
        </div>
      </transition>
    </form>
  </section>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
