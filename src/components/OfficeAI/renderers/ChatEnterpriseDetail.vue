<script setup>
import { computed } from 'vue'

const props = defineProps({
  action: { type: Object, required: true },
})

const loc      = computed(() => props.action?.localizacao || {})
const unidades = computed(() => props.action?.unidades   || {})
const focus    = computed(() => props.action?.focus      || 'geral')

const hasCoords = computed(() => !!(loc.value.latitude && loc.value.longitude))

const mapEmbedUrl = computed(() => {
  if (!hasCoords.value) return null
  return `https://www.google.com/maps?q=${loc.value.latitude},${loc.value.longitude}&output=embed`
})

const routeUrl = computed(() => {
  if (hasCoords.value)
    return `https://www.google.com/maps/dir/?api=1&destination=${loc.value.latitude},${loc.value.longitude}`
  const parts = [loc.value.endereco, loc.value.numero, loc.value.bairro, loc.value.cidade, loc.value.estado].filter(Boolean)
  return parts.length ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(', '))}` : null
})

const cvMapUrl = computed(() => `https://menin.cvcrm.com.br/gestor/comercial/mapadisponibilidade/${props.action.id}`)
const crmUrl   = computed(() => props.action?.crm_url || null)

const unitStats = computed(() => [
  { label: 'Disponíveis', value: unidades.value.disponiveis ?? 0, color: 'emerald' },
  { label: 'Vendidas',    value: unidades.value.vendidas    ?? 0, color: 'red'     },
  { label: 'Reservadas',  value: unidades.value.reservadas  ?? 0, color: 'amber'   },
  { label: 'Bloqueadas',  value: unidades.value.bloqueadas  ?? 0, color: 'slate'   },
])

const colorMap = {
  emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  red:     'bg-red-500/10 text-red-400 ring-red-500/20',
  amber:   'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  slate:   'bg-slate-500/10 text-slate-400 ring-slate-500/20',
}

// Mapa: só em localizacao
const showMap = computed(() => !!mapEmbedUrl.value && focus.value === 'localizacao')

// Breakdown completo: só quando explicitamente pedido
const showUnitsBreakdown = computed(() => unidades.value.total > 0 && focus.value === 'unidades')

// Total simples: em geral e sienge (linha discreta, sem breakdown)
const showUnitTotal = computed(() => unidades.value.total > 0 && (focus.value === 'geral' || focus.value === 'sienge'))
</script>

<template>
  <div class="mt-2 space-y-2">

    <!-- Mapa de localização -->
    <div v-if="showMap" class="rounded-2xl overflow-hidden border border-white/5 relative">
      <iframe
        :src="mapEmbedUrl"
        class="w-full h-48"
        style="border:0"
        allowfullscreen
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      />
      <a
        v-if="routeUrl"
        :href="routeUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/90 text-white hover:bg-slate-800 backdrop-blur-sm transition shadow-lg"
      >
        <i class="fas fa-route text-[10px]" />
        Traçar Rota
      </a>
    </div>

    <!-- Unidades completo (breakdown por status) -->
    <div v-if="showUnitsBreakdown" class="rounded-2xl bg-white/[.02] border border-white/5 p-3">
      <div class="flex items-center justify-between mb-2.5">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
          Unidades · {{ unidades.total }} total
        </span>
        <a
          :href="cvMapUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/20 transition"
        >
          <i class="fas fa-map text-[10px]" />
          Mapa de Disponibilidade
        </a>
      </div>
      <div class="grid grid-cols-4 gap-1.5">
        <div
          v-for="stat in unitStats"
          :key="stat.label"
          class="flex flex-col items-center rounded-xl py-2 px-1 ring-1"
          :class="colorMap[stat.color]"
        >
          <span class="text-base font-semibold leading-none">{{ stat.value }}</span>
          <span class="text-[10px] mt-1 opacity-70">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Total simples de unidades (geral/sienge) + link cadastro simplificado -->
    <div v-if="showUnitTotal" class="flex items-center gap-3">
      <span class="text-xs text-slate-500">
        <i class="fas fa-building mr-1 text-[10px]" />
        {{ unidades.total }} unidades no total
      </span>
      <a
        v-if="crmUrl"
        :href="crmUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-slate-300 ring-1 ring-slate-500/20 transition"
      >
        <i class="fas fa-arrow-up-right-from-square text-[10px]" />
        Cadastro no CRM
      </a>
    </div>

    <!-- Link CRM isolado (localizacao/sienge sem unit total, nunca em unidades) -->
    <div v-if="!showUnitTotal && !showUnitsBreakdown && crmUrl" class="flex items-center">
      <a
        :href="crmUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-slate-300 ring-1 ring-slate-500/20 transition"
      >
        <i class="fas fa-arrow-up-right-from-square text-[10px]" />
        Cadastro no CRM
      </a>
    </div>

  </div>
</template>
