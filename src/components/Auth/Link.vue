<script setup>
const socials = [
  { icon: 'fab fa-youtube', href: 'https://www.youtube.com/@meninengenharia', label: 'YouTube' },
  { icon: 'fab fa-linkedin-in', href: 'https://www.linkedin.com/company/menin-engenharia', label: 'LinkedIn' },
  { icon: 'fab fa-instagram', href: 'https://www.instagram.com/meninengenharia/', label: 'Instagram' },
];

// Versão injetada pelo Vite a partir do package.json (Office)
const APP_VERSION = __APP_VERSION_OFFICE__;
</script>

<template>
  <div class="absolute bottom-0 left-0 right-0 px-6 sm:px-8 py-5 flex items-center justify-between gap-4">
    <div class="flex items-center gap-1.5">
      <a v-for="s in socials" :key="s.icon"
         :href="s.href" target="_blank" rel="noopener noreferrer"
         :aria-label="s.label"
         class="h-8 w-8 grid place-items-center rounded-lg
                text-ink-muted hover:text-accent hover:bg-accent-soft
                transition-colors">
        <i :class="s.icon" class="text-sm"></i>
      </a>
    </div>

    <span class="font-mono text-[11px] uppercase tracking-wider text-ink-subtle px-2.5 py-1 rounded-md border border-line bg-surface-raised">
      v{{ APP_VERSION }}
    </span>
  </div>
</template>
