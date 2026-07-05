<script setup>
// Card do formulário da LP - apresentacional, compartilhado entre a página
// pública (Page.vue) e a pré-visualização do editor (LeadFormEditModal).
// Resolve todo o layout configurável do page_config; sem chave = visual padrão.
import { computed } from 'vue';

const props = defineProps({
  pageConfig: { type: Object, default: () => ({}) },
  fields: { type: Array, default: () => [] },
  formName: { type: String, default: '' },
  consentRequired: { type: Boolean, default: false },
  consentText: { type: String, default: '' },
  data: { type: Object, default: () => ({}) },
  submitting: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
});
const emit = defineEmits(['submit']);
const honeypot = defineModel('honeypot', { type: String, default: '' });
const consent = defineModel('consent', { type: Boolean, default: false });

const cfg = computed(() => props.pageConfig || {});
const accent = computed(() => cfg.value.accent_color || '#3b82f6');

const LOGO_SIZES = { sm: 'h-8', md: 'h-10', lg: 'h-20', xl: 'h-32' };
const TEXT_ALIGN = { start: 'text-left', center: 'text-center', end: 'text-right' };
const RADIUS = {
  square:  { card: 'rounded-none', field: 'rounded-none', button: 'rounded-none' },
  rounded: { card: 'rounded-2xl',  field: 'rounded-lg',   button: 'rounded-lg' },
  pill:    { card: 'rounded-3xl',  field: 'rounded-full', button: 'rounded-full' },
};
const SPACING = {
  compact:  { hero: 'px-5 py-4', logo: 'mb-2', form: 'px-5 py-4 space-y-2', footer: 'px-5 py-2' },
  normal:   { hero: 'px-6 py-6', logo: 'mb-4', form: 'px-6 py-5 space-y-3', footer: 'px-6 py-3' },
  spacious: { hero: 'px-8 py-9', logo: 'mb-6', form: 'px-8 py-7 space-y-5', footer: 'px-8 py-4' },
};

const heroAlign = computed(() => TEXT_ALIGN[cfg.value.text_align] || 'text-left');
const logoAlign = computed(() => TEXT_ALIGN[cfg.value.logo_align] || heroAlign.value);
const logoSize = computed(() => LOGO_SIZES[cfg.value.logo_size] || LOGO_SIZES.md);
const radius = computed(() => RADIUS[cfg.value.corner_style] || RADIUS.rounded);
const spacing = computed(() => SPACING[cfg.value.spacing] || SPACING.normal);

const ctaFull = computed(() => (cfg.value.cta_width || 'full') === 'full');
const ctaAlign = computed(() => TEXT_ALIGN[cfg.value.cta_align] || 'text-left');

const showFooter = computed(() => cfg.value.show_powered_by !== false);
const footerText = computed(() => cfg.value.footer_text || 'Captação Menin');

function onSubmit() {
  if (!props.preview) emit('submit');
}
</script>

<template>
  <div :class="['w-full bg-white shadow-2xl overflow-hidden', radius.card]">
    <!-- Hero -->
    <div class="border-b border-slate-200" :class="[heroAlign, spacing.hero]">
      <div v-if="cfg.logo_url" :class="[logoAlign, spacing.logo]">
        <img :src="cfg.logo_url" alt="logo" class="inline-block object-contain max-w-full" :class="logoSize" />
      </div>
      <h1 class="text-slate-900 text-2xl font-bold leading-tight">{{ cfg.title || formName }}</h1>
      <p v-if="cfg.subtitle" class="text-slate-500 text-sm mt-2 leading-relaxed">{{ cfg.subtitle }}</p>
    </div>

    <!-- Form -->
    <form @submit.prevent="onSubmit" :class="spacing.form">
      <!-- honeypot - invisível pra humanos, denuncia bots -->
      <input v-if="!preview" type="text" name="_hp" v-model="honeypot" tabindex="-1" autocomplete="off"
             style="position:absolute;left:-9999px;width:1px;height:1px" aria-hidden="true" />

      <div v-for="f in fields" :key="f.key">
        <label :for="`f-${f.key}`" class="block text-xs font-medium text-slate-700 mb-1">
          {{ f.label }}<span v-if="f.required" class="text-red-500 ml-0.5">*</span>
        </label>
        <input
          :id="`f-${f.key}`"
          :type="f.type"
          v-model="data[f.key]"
          :placeholder="f.placeholder || ''"
          :required="f.required && !preview"
          class="w-full border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none transition-all"
          :class="radius.field" />
      </div>

      <label v-if="consentRequired" class="flex items-start gap-2 text-xs text-slate-600 pt-2 cursor-pointer">
        <input type="checkbox" v-model="consent" :required="!preview" class="mt-0.5 shrink-0" />
        <span>{{ consentText || 'Autorizo o contato sobre este interesse e concordo com a política de privacidade.' }}</span>
      </label>

      <div :class="ctaFull ? '' : ctaAlign">
        <button type="submit" :disabled="submitting"
          :style="{ backgroundColor: accent }"
          class="mt-2 text-white py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          :class="[ctaFull ? 'w-full px-4' : 'inline-block px-8', radius.button]">
          <i v-if="submitting" class="fas fa-circle-notch fa-spin mr-2"></i>
          {{ submitting ? 'Enviando...' : (cfg.cta_button_text || 'Enviar') }}
        </button>
      </div>
    </form>

    <div v-if="showFooter"
      class="border-t border-slate-100 text-center text-[10px] text-slate-400 tracking-wide"
      :class="spacing.footer">
      {{ footerText }}
    </div>
  </div>
</template>
