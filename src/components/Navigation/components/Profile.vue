<script setup>
import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useSignatureStore } from '@/stores/Signature/signatureStore';
import Dropdown from '@/components/UI/Dropdown.vue';
import Switch from '@/components/UI/Switch.vue';

const authStore = useAuthStore();
const sigStore  = useSignatureStore();

const darkMode = ref(false);

function toggleTheme(value) {
  darkMode.value = value;
  if (value) document.documentElement.classList.add('dark');
  else       document.documentElement.classList.remove('dark');
  localStorage.setItem('theme', value ? 'dark' : 'light');
}

const initials = computed(() =>
  (authStore.user?.username ?? '')
    .split(' ').slice(0, 2)
    .map(n => n[0]?.toUpperCase()).join(' ')
);

const avatarUrl = computed(() =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(initials.value)}&background=random`
);

onMounted(async () => {
  darkMode.value = document.documentElement.classList.contains('dark');
  await sigStore.fetchPendingCount();
});

const logout = () => authStore.logout();
</script>

<template>
  <Dropdown align="right" :offset="10">
    <template #trigger>
      <button type="button"
        class="relative flex items-center justify-center h-9 w-9 rounded-full
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
               transition-transform hover:scale-105">
        <span class="sr-only">Abrir menu de usuário</span>
        <img :src="avatarUrl" alt="foto do usuário"
          class="w-8 h-8 rounded-full ring-2 ring-line" />

        <span v-if="sigStore.pendingCount > 0"
          class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full
                 bg-accent text-[10px] font-bold text-white ring-2 ring-surface pointer-events-none
                 animate-pulse-soft">
          {{ sigStore.pendingCount > 9 ? '9+' : sigStore.pendingCount }}
        </span>
      </button>
    </template>

    <div class="w-64 bg-surface-overlay border border-line rounded-xl shadow-overlay overflow-hidden">

      <!-- Avatar + info -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-line bg-gradient-to-br from-surface-raised to-surface-sunken">
        <img :src="avatarUrl" alt="" class="w-10 h-10 rounded-full ring-2 ring-line shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink truncate">{{ authStore.user?.username }}</p>
          <p class="text-xs text-ink-muted truncate">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <!-- Theme switch -->
      <div class="px-4 py-3 border-b border-line">
        <Switch :model-value="darkMode" @update:model-value="toggleTheme"
          label="Tema escuro" iconOn="fas fa-moon" iconOff="fas fa-sun" />
      </div>

      <!-- Menu items -->
      <ul class="py-1">
        <li>
          <RouterLink to="/" data-dropdown-item
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-sunken hover:text-accent transition-colors group">
            <i class="fas fa-house w-4 text-ink-muted group-hover:text-accent transition-colors"></i>
            Dashboard
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/settings/Account" data-dropdown-item
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-sunken hover:text-accent transition-colors group">
            <i class="fas fa-user-cog w-4 text-ink-muted group-hover:text-accent transition-colors"></i>
            Minha Conta
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/tools/signature" data-dropdown-item
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-sunken hover:text-accent transition-colors group">
            <i class="fas fa-pen-nib w-4 text-ink-muted group-hover:text-accent transition-colors"></i>
            <span class="flex-1">Assinaturas</span>
            <span v-if="sigStore.pendingCount > 0"
              class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
              {{ sigStore.pendingCount > 9 ? '9+' : sigStore.pendingCount }}
            </span>
          </RouterLink>
        </li>
        <li class="border-t border-line mt-1 pt-1">
          <button type="button" @click="logout()" data-dropdown-item
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-red-500/10 hover:text-red-500 transition-colors group">
            <i class="fas fa-arrow-right-from-bracket w-4 text-ink-muted group-hover:text-red-500 transition-colors"></i>
            Sair
          </button>
        </li>
      </ul>
    </div>
  </Dropdown>
</template>
