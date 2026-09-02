<script setup>
/* A conferência de rosto na retirada.
 *
 * A pergunta que ela responde: quem está com a chave na mão é mesmo quem está
 * logado? Sessão aberta num celular emprestado, ou alguém retirando no lugar de
 * outro, deixava o registro apontando para a pessoa errada - e é esse registro
 * que responde por multa, avaria e combustível depois.
 *
 * QUEM NÃO TEM ROSTO CADASTRADO NÃO LEVA UM "NÃO"
 *
 * Ele cadastra aqui mesmo, na hora, e segue. Barrar sem caminho de saída é o
 * que faz a operação largar o sistema e voltar para o grupo do Teams.
 *
 * O DESCRITOR NÃO É FOTO
 *
 * Sai daqui um vetor de números, o mesmo que o login por face já usa. Nenhuma
 * imagem do rosto é enviada nem guardada; a comparação é feita no servidor
 * contra o template da própria pessoa, com a mesma regra do login.
 */
import { ref, onBeforeUnmount, nextTick } from 'vue';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    /* Se a conta já tem rosto cadastrado. Vindo falso, a tela entra em modo de
       cadastro antes de deixar continuar. */
    cadastrado: { type: Boolean, default: false },
});

const emit = defineEmits(['confirmado', 'cadastrou']);

const face = useFaceStore();

const videoRef = ref(null);
const streamRef = ref(null);

const ligada = ref(false);
const ocupado = ref(false);
const erro = ref('');
const etapa = ref('');
const confirmado = ref(false);
const coletados = ref(0);

const ALVO_CADASTRO = 15;

onBeforeUnmount(desligarCamera);

async function prepararVideo() {
    await nextTick();
    const v = videoRef.value;
    if (!v) throw new Error('Câmera não disponível nesta tela.');
    if (v.readyState >= 2 && v.videoWidth) return;
    await new Promise((resolve) => { v.onloadedmetadata = () => resolve(); });
}

async function ligarCamera() {
    erro.value = '';
    ocupado.value = true;
    etapa.value = 'Abrindo a câmera...';
    try {
        await face.loadModelsOnce();
        streamRef.value = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
        });
        ligada.value = true;
        await prepararVideo();
        videoRef.value.srcObject = streamRef.value;
        await prepararVideo();
        etapa.value = '';
    } catch (e) {
        erro.value = e?.name === 'NotAllowedError'
            ? 'Permita o acesso à câmera para registrar a retirada.'
            : (e?.message || 'Não consegui abrir a câmera.');
        ligada.value = false;
    } finally {
        ocupado.value = false;
    }
}

function desligarCamera() {
    if (streamRef.value) streamRef.value.getTracks().forEach(t => t.stop());
    streamRef.value = null;
    ligada.value = false;
}

/** Confere: captura um rosto bom e devolve o descritor para o formulário. */
async function conferir() {
    ocupado.value = true;
    erro.value = '';
    etapa.value = 'Olhe para a câmera...';
    try {
        // Média de alguns quadros, e não um só: um frame isolado com sombra ou
        // movimento reprova quem é a pessoa certa.
        const embedding = await face.getAveragedEmbedding(videoRef.value, 5);
        if (!embedding) {
            erro.value = 'Não encontrei um rosto. Aproxime, procure mais luz e tente de novo.';
            return;
        }
        confirmado.value = true;
        desligarCamera();
        emit('confirmado', Array.from(embedding));
    } catch (e) {
        erro.value = e?.message || 'Não consegui conferir o rosto.';
    } finally {
        ocupado.value = false;
        etapa.value = '';
    }
}

/** Cadastro na hora, para quem ainda não tem rosto na conta. */
async function cadastrar() {
    ocupado.value = true;
    erro.value = '';
    coletados.value = 0;
    try {
        const amostras = [];
        while (amostras.length < ALVO_CADASTRO) {
            etapa.value = `Vire o rosto devagar... ${amostras.length}/${ALVO_CADASTRO}`;
            const e = await face.getOneGoodEmbedding(videoRef.value);
            if (e) { amostras.push(Array.from(e)); coletados.value = amostras.length; }
            await new Promise(r => setTimeout(r, 120));
        }
        await face.enroll(amostras);
        emit('cadastrou');
        etapa.value = 'Rosto cadastrado. Agora é só confirmar.';
    } catch (e) {
        erro.value = e?.message || 'Não consegui cadastrar seu rosto. Tente de novo.';
    } finally {
        ocupado.value = false;
    }
}
</script>

<template>
  <div class="rounded-lg border px-3 py-3"
       :class="confirmado ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-line bg-surface-sunken'">

    <div class="flex items-start gap-3">
      <i class="fas fa-user-shield mt-0.5"
         :class="confirmado ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-subtle'"></i>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-ink">
          {{ confirmado ? 'Rosto confirmado' : 'Confirme que é você' }}
          <span v-if="!confirmado" class="text-red-500">*</span>
        </p>
        <p class="text-micro text-ink-subtle">
          <template v-if="confirmado">
            A retirada será registrada no seu nome.
          </template>
          <template v-else-if="!cadastrado">
            Sua conta ainda não tem rosto cadastrado. Dá para cadastrar agora, aqui mesmo.
          </template>
          <template v-else>
            É o que amarra a retirada a você. Nenhuma foto é guardada: sai daqui só o código do rosto.
          </template>
        </p>
      </div>
    </div>

    <div v-if="!confirmado" class="mt-3">
      <div v-show="ligada" class="overflow-hidden rounded-lg border border-line bg-surface-sunken">
        <video ref="videoRef" autoplay playsinline muted class="h-44 w-full object-cover"></video>
      </div>

      <p v-if="etapa" class="mt-2 text-sm text-ink-muted">
        <i class="fas fa-circle-notch fa-spin"></i> {{ etapa }}
      </p>

      <div class="mt-2 flex flex-wrap gap-2">
        <Button v-if="!ligada" size="sm" variant="secondary" icon="fas fa-camera"
                :loading="ocupado" class="min-h-[40px]" @click="ligarCamera">
          Abrir a câmera
        </Button>

        <template v-else>
          <Button v-if="!cadastrado" size="sm" variant="primary" icon="fas fa-user-plus"
                  :loading="ocupado" class="min-h-[40px]" @click="cadastrar">
            Cadastrar meu rosto
          </Button>
          <Button v-else size="sm" variant="primary" icon="fas fa-check"
                  :loading="ocupado" class="min-h-[40px]" @click="conferir">
            Confirmar que sou eu
          </Button>
        </template>
      </div>
    </div>

    <p v-if="erro" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
  </div>
</template>
