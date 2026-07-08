<script setup>
// Galeria de ANÚNCIOS (artes) — o relatório de criativos. Grid de cards com a
// arte em destaque + métricas do período no rodapé. Clique na arte = lightbox.
//
// É o nível mais granular do drill: Conta → Campanha → Conjunto → Anúncio.

import { ref, computed } from 'vue';
import CreativeLightbox from './CreativeLightbox.vue';

const props = defineProps({
    ads:      { type: Array, default: () => [] },
    loading:  { type: Boolean, default: false },
    currency: { type: String, default: 'BRL' },
    showCampaign: { type: Boolean, default: true },
});

// ── Ordenação local da galeria ─────────────────────────────────────────────
const sortBy = ref('spend');   // spend | leads | cac | ctr
const SORTS = [
    { key: 'spend', label: 'Investido' },
    { key: 'leads', label: 'Leads' },
    { key: 'cac',   label: 'Menor CAC' },
    { key: 'ctr',   label: 'CTR' },
];

const sorted = computed(() => {
    const arr = [...props.ads];
    if (sortBy.value === 'spend') arr.sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
    else if (sortBy.value === 'leads') arr.sort((a, b) => (Number(b.meta_leads_total) || 0) - (Number(a.meta_leads_total) || 0));
    else if (sortBy.value === 'cac') arr.sort((a, b) => (Number(a.cac) || Infinity) - (Number(b.cac) || Infinity));
    else if (sortBy.value === 'ctr') arr.sort((a, b) => (Number(b.ctr) || 0) - (Number(a.ctr) || 0));
    return arr;
});

function fmtMoney(v) {
    if (v == null) return '—';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: props.currency, maximumFractionDigits: 2 }).format(Number(v)); }
    catch { return `R$ ${v}`; }
}
function fmtInt(v) { return v == null ? '—' : new Intl.NumberFormat('pt-BR').format(Number(v)); }
function fmtPct(v) { return v == null ? '—' : `${Number(v).toFixed(2)}%`; }

function isActive(ad) {
    return String(ad.effective_status || ad.status || '').toUpperCase().includes('ACTIVE');
}
function isVideo(ad) { return !!(ad.creative_video_id || ad.creative_video_url); }
function thumb(ad) { return ad.creative_image_url || ad.creative_thumbnail || null; }

// ── Lightbox ───────────────────────────────────────────────────────────────
const lightboxOpen = ref(false);
const lightboxAd = ref(null);

function openLightbox(ad) {
    lightboxAd.value = ad;
    lightboxOpen.value = true;
}
</script>

<template>
  <div>
    <!-- Toolbar: ordenação -->
    <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
      <div class="text-[11px] text-ink-subtle">
        <b>{{ ads.length }}</b> anúncio(s) com veiculação no período
      </div>
      <div class="inline-flex rounded-lg border border-line bg-surface p-0.5">
        <button v-for="s in SORTS" :key="s.key" @click="sortBy = s.key"
          :class="['px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
            sortBy === s.key ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- Loading / vazio -->
    <div v-if="loading" class="py-16 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando anúncios...
    </div>
    <div v-else-if="!ads.length" class="py-16 text-center text-ink-subtle">
      <i class="fas fa-image text-3xl mb-2 block opacity-50"></i>
      Nenhum anúncio com veiculação no período.
    </div>

    <!-- Grid de artes -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      <div v-for="ad in sorted" :key="ad.id"
        class="group rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden
               hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
               transition-all duration-200 ease-out-expo flex flex-col">

        <!-- Arte -->
        <button class="relative aspect-square bg-surface-sunken/60 overflow-hidden" @click="openLightbox(ad)">
          <img v-if="thumb(ad)" :src="thumb(ad)" loading="lazy"
            class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            :alt="ad.name || 'criativo'" />
          <div v-else class="w-full h-full flex items-center justify-center text-ink-subtle text-3xl">
            <i :class="isVideo(ad) ? 'fas fa-video' : 'fas fa-image'"></i>
          </div>

          <!-- Badges sobre a arte -->
          <div class="absolute top-1.5 left-1.5 flex gap-1">
            <span v-if="isVideo(ad)"
              class="inline-flex items-center gap-1 rounded-md bg-black/60 text-white text-[9px] px-1.5 py-0.5 backdrop-blur-sm">
              <i class="fas fa-play text-[7px]"></i>Vídeo
            </span>
          </div>
          <span :class="['absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-black/20',
            isActive(ad) ? 'bg-emerald-400' : 'bg-slate-400']"
            :title="isActive(ad) ? 'Ativo' : 'Inativo'"></span>

          <!-- Zoom hint -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <i class="fas fa-magnifying-glass-plus text-white/0 group-hover:text-white/90 text-lg transition-colors"></i>
          </div>
        </button>

        <!-- Nome + contexto -->
        <div class="px-2.5 pt-2 flex-1 min-w-0">
          <div class="text-xs font-medium text-ink leading-tight line-clamp-2" :title="ad.name || ad.id">
            {{ ad.name || '(não sincronizado)' }}
          </div>
          <div v-if="showCampaign && ad.campaign?.name" class="text-[10px] text-ink-subtle truncate mt-0.5" :title="ad.campaign.name">
            <i class="fas fa-bullhorn text-[8px] mr-1"></i>{{ ad.campaign.name }}
          </div>
          <div v-else-if="ad.adset_name" class="text-[10px] text-ink-subtle truncate mt-0.5" :title="ad.adset_name">
            <i class="fas fa-layer-group text-[8px] mr-1"></i>{{ ad.adset_name }}
          </div>
        </div>

        <!-- Métricas do período -->
        <div class="px-2.5 py-2 mt-1.5 border-t border-line/60 grid grid-cols-2 gap-x-2 gap-y-1">
          <div>
            <div class="text-[9px] uppercase tracking-wider font-mono text-ink-subtle">Investido</div>
            <div class="text-xs font-semibold text-ink tabular-nums">{{ fmtMoney(ad.spend) }}</div>
          </div>
          <div class="text-right">
            <div class="text-[9px] uppercase tracking-wider font-mono text-ink-subtle">Leads</div>
            <div class="text-xs font-semibold text-ink tabular-nums">{{ fmtInt(ad.meta_leads_total) }}</div>
          </div>
          <div>
            <div class="text-[9px] uppercase tracking-wider font-mono text-ink-subtle">CAC</div>
            <div class="text-xs font-medium text-ink tabular-nums">{{ ad.cac != null ? fmtMoney(ad.cac) : '—' }}</div>
          </div>
          <div class="text-right">
            <div class="text-[9px] uppercase tracking-wider font-mono text-ink-subtle">CTR</div>
            <div class="text-xs font-medium text-ink tabular-nums">{{ fmtPct(ad.ctr) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox do criativo -->
    <CreativeLightbox
      v-model:open="lightboxOpen"
      :image-url="lightboxAd?.creative_image_url || lightboxAd?.creative_thumbnail"
      :video-url="lightboxAd?.creative_video_url"
      :video-id="lightboxAd?.creative_video_id"
      :video-permalink="lightboxAd?.creative_video_permalink"
      :title="lightboxAd?.name"
      :subtitle="lightboxAd?.campaign?.name" />
  </div>
</template>
