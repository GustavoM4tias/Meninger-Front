<template>
    <!-- O painel fica PRETO de proposito: e visualizador de foto, e o preto e o
         que faz a imagem ler sem o fundo competir. Do primitivo vem o resto:
         teleport, Escape e trava de rolagem. -->
    <Modal :open="open" size="screen" :padded="false" hide-close @close="fechar">
        <div v-if="foto" class="h-full bg-black flex flex-col select-none">

            <!-- Cabecalho: onde estou, o que e, e o que da para fazer -->
            <header class="flex items-center gap-3 px-4 sm:px-5 py-3 text-white shrink-0">
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium leading-tight truncate">
                        {{ foto.caption || `Foto ${indice + 1}` }}
                    </p>
                    <p class="text-micro text-white/50 mt-0.5 font-mono tabular-nums">
                        {{ indice + 1 }} de {{ fotos.length }}
                        <span v-if="foto.width"> · {{ foto.width }}x{{ foto.height }}</span>
                        <span v-if="foto.size_bytes"> · {{ tamanhoLegivel(foto.size_bytes) }}</span>
                        <span v-if="indice === 0"> · capa do stand</span>
                    </p>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                    <button v-if="canManage && indice !== 0" type="button" class="ferramenta"
                        title="Usar esta foto como capa do stand" @click="$emit('capa', foto)">
                        <i class="fas fa-thumbtack"></i>
                        <span class="hidden sm:inline">Capa</span>
                    </button>
                    <button v-if="canManage" type="button" class="ferramenta"
                        title="Escrever ou mudar a legenda desta foto" @click="abrirLegenda">
                        <i class="fas fa-pen"></i>
                        <span class="hidden sm:inline">Legenda</span>
                    </button>
                    <a :href="foto.url" target="_blank" rel="noopener" class="ferramenta"
                        title="Abrir a imagem original em outra aba">
                        <i class="fas fa-up-right-from-square"></i>
                        <span class="hidden sm:inline">Original</span>
                    </a>
                    <button type="button" class="ferramenta" :title="zoom ? 'Voltar ao tamanho da tela' : 'Ampliar a foto'"
                        @click="zoom = !zoom">
                        <i :class="zoom ? 'fas fa-magnifying-glass-minus' : 'fas fa-magnifying-glass-plus'"></i>
                    </button>
                    <button v-if="canManage" type="button" class="ferramenta ferramenta-perigo"
                        title="Excluir esta foto" @click="$emit('excluir', foto)">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" class="ferramenta" title="Fechar (Esc)" @click="fechar">
                        <i class="fas fa-xmark text-lg"></i>
                    </button>
                </div>
            </header>

            <!-- Palco -->
            <div class="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
                @click.self="fechar">
                <button v-if="fotos.length > 1" type="button" class="seta left-2 sm:left-4"
                    title="Foto anterior (seta esquerda)" @click.stop="mover(-1)">
                    <i class="fas fa-chevron-left"></i>
                </button>

                <div class="w-full h-full flex items-center justify-center"
                    :class="zoom ? 'overflow-auto cursor-zoom-out p-4' : 'overflow-hidden cursor-zoom-in p-2 sm:p-6'"
                    @click.self="zoom = !zoom">
                    <img :key="foto.id" :src="foto.url" :alt="foto.caption || 'Foto do stand'"
                        class="animate-fade-in"
                        :class="zoom ? 'max-w-none w-auto h-auto' : 'max-w-full max-h-full object-contain'"
                        @click="zoom = !zoom" />
                </div>

                <button v-if="fotos.length > 1" type="button" class="seta right-2 sm:right-4"
                    title="Proxima foto (seta direita)" @click.stop="mover(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <!-- Tira de miniaturas: navegar sem sair da foto -->
            <footer v-if="fotos.length > 1" class="shrink-0 px-3 py-3 overflow-x-auto no-scrollbar">
                <div class="flex items-center gap-2 w-max mx-auto">
                    <button v-for="(f, i) in fotos" :key="f.id" type="button"
                        class="relative h-14 w-20 rounded-md overflow-hidden shrink-0 transition-all duration-200"
                        :class="i === indice ? 'ring-2 ring-white scale-105' : 'opacity-50 hover:opacity-90'"
                        :title="f.caption || `Foto ${i + 1}`" @click="indice = i">
                        <img :src="f.thumb_url || f.url" :alt="f.caption || `Foto ${i + 1}`" loading="lazy"
                            class="w-full h-full object-cover" />
                        <span v-if="i === 0"
                            class="absolute bottom-0 inset-x-0 bg-black/70 text-white text-micro leading-tight py-0.5">
                            capa
                        </span>
                    </button>
                </div>
            </footer>
        </div>
    </Modal>
</template>

<script setup>
// Visualizador de foto do stand em tela cheia: setas do teclado, zoom, tira de
// miniaturas, e as acoes que so fazem sentido olhando a foto grande (definir
// como capa, escrever legenda, excluir).
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import { tamanhoLegivel } from '@/utils/imagem';

const props = defineProps({
    open: { type: Boolean, default: false },
    fotos: { type: Array, default: () => [] },
    inicial: { type: Number, default: 0 },
    canManage: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open', 'capa', 'excluir', 'legenda']);

const indice = ref(0);
const zoom = ref(false);

const foto = computed(() => props.fotos[indice.value] || null);

function fechar() {
    emit('update:open', false);
}

function mover(passo) {
    if (!props.fotos.length) return;
    zoom.value = false;
    indice.value = (indice.value + passo + props.fotos.length) % props.fotos.length;
}

function abrirLegenda() {
    if (foto.value) emit('legenda', foto.value);
}

function aoTeclar(e) {
    if (!props.open) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
    else if (e.key === ' ') { e.preventDefault(); zoom.value = !zoom.value; }
    // Esc fica com o Modal, que ja sabe fechar.
}

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    indice.value = Math.min(Math.max(0, props.inicial), Math.max(0, props.fotos.length - 1));
    zoom.value = false;
});

// A foto aberta sumiu (excluida): fica na mesma posicao, que agora e a
// seguinte; se era a ultima, volta uma. Sem fotos, fecha.
watch(() => props.fotos.length, (n) => {
    if (!props.open) return;
    if (!n) return fechar();
    if (indice.value > n - 1) indice.value = n - 1;
});

onMounted(() => window.addEventListener('keydown', aoTeclar));
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar));
</script>

<style scoped>
/* Ferramentas do cabecalho: fundo preto do visualizador, entao a cor sai da
   escala do branco em vez dos tokens de superficie. */
.ferramenta {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.75);
    transition: background-color 150ms ease, color 150ms ease;
}
.ferramenta:hover {
    background-color: rgb(255 255 255 / 0.12);
    color: rgb(255 255 255);
}
.ferramenta-perigo:hover {
    background-color: rgb(239 68 68 / 0.25);
    color: rgb(254 202 202);
}

.seta {
    position: absolute;
    z-index: 10;
    display: grid;
    place-items: center;
    height: 2.75rem;
    width: 2.75rem;
    border-radius: 9999px;
    background-color: rgb(255 255 255 / 0.1);
    color: rgb(255 255 255 / 0.85);
    backdrop-filter: blur(4px);
    transition: background-color 150ms ease, color 150ms ease;
}
.seta:hover {
    background-color: rgb(255 255 255 / 0.2);
    color: rgb(255 255 255);
}

.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
