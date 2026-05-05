<template>
  <div v-if="dataUrl" class="inline-flex flex-col items-center gap-1">
    <img :src="dataUrl" :alt="`QR para ${url}`" :width="size" :height="size"
      class="rounded border border-line bg-white p-1" />
    <span v-if="caption" class="text-[9px] text-ink-subtle text-center max-w-[120px] leading-tight">{{ caption }}</span>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
    url: { type: String, default: '' },
    size: { type: Number, default: 120 },
    caption: { type: String, default: '' },
});

const dataUrl = ref('');

async function regen() {
    if (!props.url) { dataUrl.value = ''; return; }
    try {
        dataUrl.value = await QRCode.toDataURL(props.url, {
            width: props.size * 2,
            margin: 1,
            errorCorrectionLevel: 'M',
        });
    } catch (e) {
        console.warn('[AppraisalQrCode] failed to generate QR:', e.message);
        dataUrl.value = '';
    }
}

watch(() => props.url, regen);
onMounted(regen);
</script>
