<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';

const props = defineProps({
    idempreendimento: { type: [Number, String, null], default: null },
    displayName: { type: String, default: '' },
    costCenter: { type: String, default: '' },
});
const emit = defineEmits(['update:idempreendimento', 'update:displayName', 'update:costCenter']);

const store = useChecklistStore();

// Modo de origem do empreendimento. O bug antigo: `mode` era inicializado uma só
// vez no setup, mas o pai (modal Configurar) só preenche o idempreendimento no
// onMounted dele — depois do filho já ter montado com null — então voltava sempre
// para "manual". O watch com immediate resolve: sempre que chega um id, vira CV.
const mode = ref('manual');
watch(() => props.idempreendimento, (v) => { if (v) mode.value = 'cv'; }, { immediate: true });

const MODES = [
    { value: 'cv', label: 'Empreendimento do CV', icon: 'fas fa-magnifying-glass' },
    { value: 'manual', label: 'Nome manual', icon: 'fas fa-keyboard' },
];

onMounted(() => { if (!store.enterprises.length) store.loadEnterprises(); });

// Rótulo único por empreendimento (nome + cidade) <-> empreendimento.
function labelOf(e) { return e.cidade ? `${e.nome} - ${e.cidade}` : e.nome; }
const cvOptions = computed(() => (store.enterprises || []).map(labelOf));
const labelToEnterprise = computed(() => {
    const m = new Map();
    (store.enterprises || []).forEach((e) => m.set(labelOf(e), e));
    return m;
});
const currentLabel = computed(() => {
    const e = (store.enterprises || []).find((x) => String(x.idempreendimento) === String(props.idempreendimento));
    return e ? labelOf(e) : null;
});
const cvModel = computed(() => (currentLabel.value ? [currentLabel.value] : []));

function onCvChange(arr) {
    const e = arr?.length ? labelToEnterprise.value.get(arr[0]) : null;
    if (e) { emit('update:idempreendimento', e.idempreendimento); emit('update:displayName', e.nome); }
    else { emit('update:idempreendimento', null); }
}
function onManual(v) { emit('update:displayName', v); emit('update:idempreendimento', null); }
</script>

<template>
    <div class="space-y-2.5">
        <SegmentedControl :model-value="mode" :options="MODES" size="sm" @update:model-value="mode = $event" />

        <MultiSelector v-if="mode === 'cv'" single :options="cvOptions" :model-value="cvModel"
            placeholder="Buscar empreendimento no CV..." @change="onCvChange" />
        <Input v-else :model-value="displayName" placeholder="Nome do empreendimento (manual)"
            @update:model-value="onManual" />

        <p v-if="mode === 'cv' && idempreendimento" class="text-[11px] text-ink-subtle -mt-0.5">
            <i class="fas fa-circle-check text-emerald-500"></i>
            {{ displayName }} <span class="text-ink-subtle/70">· #{{ idempreendimento }}</span>
        </p>

        <!-- Centro de custo: disponível em qualquer caso (CV ou manual) p/ puxar dados depois. -->
        <Input :model-value="costCenter" icon-left="fas fa-hashtag"
            placeholder="Centro de custo (opcional)" @update:model-value="emit('update:costCenter', $event)" />
    </div>
</template>
