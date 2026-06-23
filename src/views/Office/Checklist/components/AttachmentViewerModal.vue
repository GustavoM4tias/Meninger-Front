<script setup>
import { computed } from 'vue';

const props = defineProps({ attachment: { type: Object, required: true } });
defineEmits(['close']);

const a = computed(() => props.attachment);
const url = computed(() => a.value.url || '');
const isImage = computed(() => a.value.kind === 'IMAGE' || (a.value.mime_type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i.test(url.value));
const isPdf = computed(() => (a.value.mime_type || '') === 'application/pdf' || /\.pdf($|\?)/i.test(url.value));
const isOffice = computed(() => /\.(docx?|xlsx?|pptx?)($|\?)/i.test(url.value) || /officedocument|ms-excel|msword|ms-powerpoint/.test(a.value.mime_type || ''));
const isLink = computed(() => a.value.kind === 'LINK');

// Transforma o link para uma URL embutível (preview) por provedor.
const embedUrl = computed(() => {
    const u = url.value;
    const gd = u.match(/drive\.google\.com\/file\/d\/([^/]+)/) || (/drive\.google\.com/.test(u) && u.match(/[?&]id=([^&]+)/));
    if (gd && /drive\.google\.com/.test(u)) return `https://drive.google.com/file/d/${gd[1]}/preview`;
    if (/docs\.google\.com/.test(u)) return u.replace(/\/(edit|view|preview)(\?[^#]*)?(#.*)?$/, '/preview');
    if (/sharepoint\.com|onedrive\.live\.com|1drv\.ms/.test(u)) return u + (u.includes('?') ? '&' : '?') + 'action=embedview';
    return u;
});
const officeUrl = computed(() => `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url.value)}`);
// Tipo "embutível por iframe": pdf, office (público), ou link de provedor conhecido.
const canIframe = computed(() => isPdf.value || isOffice.value || isLink.value);
const iframeSrc = computed(() => (isPdf.value ? url.value : isOffice.value ? officeUrl.value : embedUrl.value));
</script>

<template>
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in" @click.self="$emit('close')">
        <div class="bg-surface-overlay border border-line rounded-2xl shadow-overlay w-full max-w-5xl max-h-[94vh] flex flex-col animate-scale-in">
            <div class="flex items-center justify-between p-3 border-b border-line">
                <span class="text-sm font-medium text-ink truncate"><i :class="isImage ? 'fas fa-image' : isLink ? 'fas fa-link' : isPdf ? 'fas fa-file-pdf' : isOffice ? 'fas fa-file-word' : 'fas fa-file'"></i> {{ a.file_name }}</span>
                <div class="flex items-center gap-4">
                    <a :href="url" target="_blank" rel="noopener" class="text-xs text-accent hover:underline"><i class="fas fa-arrow-up-right-from-square"></i> Abrir</a>
                    <button @click="$emit('close')" class="text-ink-subtle hover:text-ink focus-ring rounded"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="flex-1 overflow-auto p-2 flex flex-col items-center justify-center min-h-[340px]">
                <img v-if="isImage" :src="url" class="max-w-full max-h-[80vh] object-contain rounded-lg" />
                <template v-else-if="canIframe">
                    <iframe :src="iframeSrc" class="w-full h-[80vh] rounded-lg border border-line bg-white"></iframe>
                    <p class="text-[11px] text-ink-subtle mt-1">Não carregou? <a :href="url" target="_blank" rel="noopener" class="text-accent hover:underline">Abrir em nova aba</a> (alguns links externos bloqueiam a incorporação).</p>
                </template>
                <div v-else class="text-center p-8">
                    <i class="fas fa-file-arrow-down text-4xl text-ink-subtle mb-3"></i>
                    <p class="text-sm text-ink-muted mb-3">Pré-visualização não disponível para este tipo.</p>
                    <a :href="url" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg"><i class="fas fa-arrow-up-right-from-square"></i> Abrir em nova aba</a>
                </div>
            </div>
        </div>
    </div>
</template>
