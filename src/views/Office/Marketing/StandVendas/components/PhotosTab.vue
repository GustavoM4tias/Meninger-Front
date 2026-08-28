<template>
    <div class="flex flex-col gap-5">

        <!-- Barra da galeria: quanto tem, quanto pesa, e como entra foto nova -->
        <Surface variant="raised" padding="sm">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="min-w-0 flex-1">
                    <p class="text-sm text-ink font-medium">
                        {{ images.length }} de {{ max }} fotos
                        <span v-if="pesoTotal" class="text-ink-subtle font-normal font-mono tabular-nums">
                            · {{ tamanhoLegivel(pesoTotal) }}
                        </span>
                    </p>
                    <p class="text-xs text-ink-muted mt-0.5">
                        A primeira foto e a capa do stand na listagem. JPG, PNG, WEBP ou HEIC: a tela reduz e comprime
                        antes de enviar.
                    </p>
                </div>
                <div v-if="canManage" class="flex items-center gap-2 shrink-0">
                    <Button v-if="reordenando" variant="ghost" size="sm" icon="fas fa-xmark" @click="cancelarOrdem">
                        Cancelar
                    </Button>
                    <Button v-if="reordenando" variant="primary" size="sm" icon="fas fa-check" :loading="saving"
                        title="Grava a nova ordem; a primeira foto vira a capa" @click="salvarOrdem">
                        Salvar ordem
                    </Button>
                    <Button v-else-if="images.length > 1" variant="secondary" size="sm" icon="fas fa-arrows-up-down-left-right"
                        title="Mudar a ordem das fotos e escolher a capa" @click="reordenando = true">
                        Reordenar
                    </Button>
                    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="escolher" />
                    <Button variant="primary" size="sm" icon="fas fa-camera" :loading="enviando"
                        :disabled="images.length >= max"
                        :title="images.length >= max ? `Limite de ${max} fotos atingido` : 'Escolher fotos do computador ou do celular'"
                        @click="fileInput?.click()">
                        Adicionar fotos
                    </Button>
                </div>
            </div>

            <!-- Progresso do envio, foto a foto -->
            <div v-if="fila.length" class="mt-3 pt-3 border-t border-line flex flex-col gap-1.5">
                <div v-for="f in fila" :key="f.id" class="flex items-center gap-2.5 text-xs">
                    <i v-if="f.estado === 'ok'" class="fas fa-circle-check text-data-pos"></i>
                    <i v-else-if="f.estado === 'erro'" class="fas fa-circle-exclamation text-data-neg"></i>
                    <Spinner v-else size="sm" />
                    <span class="text-ink-muted truncate flex-1">{{ f.nome }}</span>
                    <span v-if="f.economia" class="font-mono tabular-nums text-ink-subtle shrink-0"
                        :title="`Original ${tamanhoLegivel(f.de)}, enviada ${tamanhoLegivel(f.para)}`">
                        {{ tamanhoLegivel(f.de) }} → {{ tamanhoLegivel(f.para) }}
                    </span>
                    <span v-else-if="f.estado === 'erro'" class="text-data-neg shrink-0 truncate max-w-[16rem]">{{ f.erro }}</span>
                </div>
            </div>
        </Surface>

        <!-- Grade -->
        <div v-if="ordem.length" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            <Surface v-for="(img, i) in ordem" :key="img.id" variant="raised" padding="none"
                class="overflow-hidden flex flex-col group animate-fade-in [animation-fill-mode:backwards]"
                :style="{ animationDelay: Math.min(i, 12) * 25 + 'ms' }">

                <div class="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
                    <img :src="img.thumb_url || img.url" :alt="img.caption || `Foto ${i + 1} do stand`" loading="lazy"
                        class="w-full h-full object-cover transition-transform duration-300"
                        :class="reordenando ? '' : 'cursor-zoom-in group-hover:scale-105'"
                        @click="!reordenando && abrir(i)" />

                    <Badge v-if="i === 0" variant="accent" size="sm" class="absolute top-2 left-2"
                        title="Esta e a foto que aparece no cartao do stand na listagem">
                        <i class="fas fa-thumbtack mr-1 text-micro"></i>capa
                    </Badge>

                    <!-- Reordenando: as setas trocam a foto de lugar -->
                    <div v-if="reordenando" class="absolute inset-0 bg-surface/70 grid place-items-center gap-2">
                        <div class="flex items-center gap-2">
                            <IconButton icon="fas fa-arrow-left" size="sm" variant="secondary" label="Mover para tras"
                                :disabled="i === 0" @click="trocar(i, i - 1)" />
                            <span class="font-mono tabular-nums text-sm text-ink font-semibold w-8 text-center">{{ i + 1 }}</span>
                            <IconButton icon="fas fa-arrow-right" size="sm" variant="secondary" label="Mover para frente"
                                :disabled="i === ordem.length - 1" @click="trocar(i, i + 1)" />
                        </div>
                        <Button v-if="i !== 0" variant="ghost" size="sm" icon="fas fa-thumbtack"
                            title="Manda esta foto para a primeira posicao" @click="paraCapa(i)">
                            Tornar capa
                        </Button>
                    </div>

                    <!-- Parado: as acoes aparecem no hover, sem poluir a grade -->
                    <div v-else
                        class="absolute inset-x-0 bottom-0 p-2 flex items-center justify-end gap-1
                               bg-gradient-to-t from-black/60 to-transparent
                               opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button type="button" class="acao" title="Ver em tela cheia" @click="abrir(i)">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button v-if="canManage" type="button" class="acao" title="Escrever ou mudar a legenda"
                            @click="editarLegenda(img)">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button v-if="canManage" type="button" class="acao acao-perigo" title="Excluir esta foto"
                            @click="excluir(img)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <button type="button" class="px-2.5 py-2 text-left" :disabled="!canManage"
                    :title="canManage ? 'Clique para escrever a legenda' : (img.caption || 'Sem legenda')"
                    @click="canManage && editarLegenda(img)">
                    <p class="text-xs truncate" :class="img.caption ? 'text-ink-muted' : 'text-ink-subtle italic'">
                        {{ img.caption || (canManage ? 'Sem legenda. Clique para escrever.' : 'Sem legenda') }}
                    </p>
                </button>
            </Surface>
        </div>

        <!-- Vazio: a area inteira convida a soltar a foto -->
        <Surface v-else variant="raised" padding="none"
            :class="arrastando ? 'border-accent/50 bg-accent-soft/30' : ''"
            @dragover.prevent="arrastando = true" @dragleave="arrastando = false" @drop.prevent="soltar">
            <EmptyState icon="fas fa-images" title="Nenhuma foto"
                :description="canManage
                    ? 'Arraste as fotos para ca ou use o botao acima. Elas ficam junto do custo e dos itens, no mesmo lugar.'
                    : 'Ninguem subiu foto deste stand ainda.'" />
        </Surface>

        <PhotoLightbox v-model:open="visualizando" :fotos="ordem" :inicial="fotoInicial" :can-manage="canManage"
            @capa="capaDoLightbox" @excluir="excluir" @legenda="editarLegenda" />

        <!-- Legenda -->
        <Modal :open="!!legendaDe" size="sm" title="Legenda da foto"
            subtitle="Ajuda quem abrir a galeria a saber o que esta vendo." @close="legendaDe = null">
            <Input v-model="legendaTexto" label="Legenda" placeholder="Ex.: fachada, sala de reuniao, decorado"
                @keyup.enter="salvarLegenda" />
            <template #footer>
                <div class="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="sm" @click="legendaDe = null">Cancelar</Button>
                    <Button variant="primary" size="sm" icon="fas fa-check" :loading="saving" @click="salvarLegenda">
                        Salvar
                    </Button>
                </div>
            </template>
        </Modal>
    </div>
</template>

<script setup>
// Aba Fotos: como o stand ficou.
//
// A foto e tratada no navegador antes de subir (utils/imagem.js) por dois
// motivos medidos: o bucket do Office recusa objeto acima de 2 MB, e foto de
// celular sai com 3 a 5 MB. Sobe a imagem reduzida e uma miniatura, e a grade
// carrega a miniatura - senao abrir a aba baixaria dezenas de megabytes para
// mostrar quadradinhos.
//
// A primeira foto e a capa do stand na listagem, entao reordenar e a mesma
// acao que escolher a capa.
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { prepararImagem, tamanhoLegivel } from '@/utils/imagem';

import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Modal from '@/components/UI/Modal.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import PhotoLightbox from './PhotoLightbox.vue';

const props = defineProps({
    images: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    max: { type: Number, default: 24 },
});
const emit = defineEmits(['upload', 'remove', 'caption', 'reorder']);

const toast = useToast();
const fileInput = ref(null);
const enviando = ref(false);
const arrastando = ref(false);
const visualizando = ref(false);
const fotoInicial = ref(0);
const reordenando = ref(false);
const rascunhoOrdem = ref([]);
const legendaDe = ref(null);
const legendaTexto = ref('');
const fila = ref([]);

// Enquanto reordena, a grade mostra o rascunho; parado, mostra o que veio do
// servidor. Assim a pessoa ve o resultado antes de gravar.
const ordem = computed(() => (reordenando.value ? rascunhoOrdem.value : props.images));
const pesoTotal = computed(() => props.images.reduce((s, i) => s + Number(i.size_bytes || 0), 0));

watch(reordenando, (v) => {
    if (v) rascunhoOrdem.value = [...props.images];
});

function abrir(i) {
    fotoInicial.value = i;
    visualizando.value = true;
}

// ── Envio ────────────────────────────────────────────────────────────────────

function escolher(e) {
    const arquivos = [...(e.target.files || [])];
    e.target.value = '';
    enviar(arquivos);
}

function soltar(e) {
    arrastando.value = false;
    if (!props.canManage) return;
    enviar([...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/')));
}

async function enviar(arquivos) {
    if (!arquivos.length) return;
    const cabem = props.max - props.images.length;
    if (arquivos.length > cabem) {
        toast.info(`Cabem mais ${cabem} foto${cabem === 1 ? '' : 's'} neste stand. As demais foram ignoradas.`);
    }
    const lista = arquivos.slice(0, Math.max(0, cabem));
    if (!lista.length) return;

    enviando.value = true;
    fila.value = lista.map((f, i) => ({ id: `${i}-${f.name}`, nome: f.name, estado: 'preparando' }));
    try {
        for (const [i, file] of lista.entries()) {
            const item = fila.value[i];
            try {
                const pronta = await prepararImagem(file);
                item.estado = 'enviando';
                item.de = pronta.originalSize;
                item.para = pronta.size;
                item.economia = pronta.tratada && pronta.size < pronta.originalSize;
                await new Promise((resolve, reject) => {
                    emit('upload', { file, pronta, resolve, reject });
                });
                item.estado = 'ok';
            } catch (err) {
                item.estado = 'erro';
                item.erro = err?.message || 'falhou';
            }
        }
        const erros = fila.value.filter((f) => f.estado === 'erro').length;
        if (erros) toast.error(`${erros} foto${erros === 1 ? '' : 's'} não subiu. Veja o motivo na lista.`);
    } finally {
        enviando.value = false;
        // A lista some sozinha quando deu tudo certo; com erro ela fica para a
        // pessoa ler o motivo.
        if (!fila.value.some((f) => f.estado === 'erro')) {
            setTimeout(() => { fila.value = []; }, 2500);
        }
    }
}

// ── Ordem e capa ─────────────────────────────────────────────────────────────

function trocar(de, para) {
    const lista = [...rascunhoOrdem.value];
    const [item] = lista.splice(de, 1);
    lista.splice(para, 0, item);
    rascunhoOrdem.value = lista;
}

function paraCapa(i) {
    trocar(i, 0);
}

function cancelarOrdem() {
    reordenando.value = false;
    rascunhoOrdem.value = [];
}

function salvarOrdem() {
    emit('reorder', rascunhoOrdem.value.map((f) => f.id));
    reordenando.value = false;
}

// Do visualizador: manda a foto para a primeira posicao e grava na hora.
function capaDoLightbox(foto) {
    const ids = [foto.id, ...props.images.filter((f) => f.id !== foto.id).map((f) => f.id)];
    emit('reorder', ids);
    toast.success('Esta foto virou a capa do stand.');
}

// ── Legenda ──────────────────────────────────────────────────────────────────

function editarLegenda(img) {
    legendaDe.value = img;
    legendaTexto.value = img.caption || '';
}

function salvarLegenda() {
    if (!legendaDe.value) return;
    emit('caption', { id: legendaDe.value.id, caption: legendaTexto.value });
    legendaDe.value = null;
}

// ── Exclusao ─────────────────────────────────────────────────────────────────

async function excluir(img) {
    if (!await pedirConfirmacao({
        title: 'Excluir esta foto?',
        consequence: 'A foto sai da tela e o arquivo é apagado do armazenamento. Não há como recuperar depois.'
            + (props.images[0]?.id === img.id && props.images.length > 1
                ? ' Como ela é a capa, a próxima foto passa a aparecer no cartão do stand.' : ''),
        confirmLabel: 'Excluir foto',
    })) return;
    emit('remove', img);
}
</script>

<style scoped>
/* Acoes sobre a foto: fundo escuro do gradiente, entao a cor sai da escala do
   branco em vez dos tokens de superficie. */
.acao {
    display: grid;
    place-items: center;
    height: 1.75rem;
    width: 1.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.85);
    background-color: rgb(0 0 0 / 0.35);
    backdrop-filter: blur(4px);
    transition: background-color 150ms ease, color 150ms ease;
}
.acao:hover {
    background-color: rgb(255 255 255 / 0.25);
    color: rgb(255 255 255);
}
.acao-perigo:hover {
    background-color: rgb(239 68 68 / 0.45);
}
</style>
