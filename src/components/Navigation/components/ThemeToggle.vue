<script setup>
// Alternador rápido de tema (claro/escuro) na top bar. Mesma fonte de verdade do
// switch dentro do menu de perfil: classe `dark` no <html> + localStorage 'theme'.
import { ref, onMounted } from 'vue';

const isDark = ref(false);

function apply(dark) {
  isDark.value = dark;
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

function toggle() { apply(!isDark.value); }

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
});
</script>

<template>
  <button type="button"
    @click="toggle"
    :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
    :title="isDark ? 'Tema claro' : 'Tema escuro'"
    class="relative h-9 w-9 grid place-items-center rounded-lg border border-line
           text-ink-muted hover:text-ink hover:bg-surface-sunken hover:border-accent/40
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
           transition-colors">
    <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'" class="text-base"></i>
  </button>
</template>
