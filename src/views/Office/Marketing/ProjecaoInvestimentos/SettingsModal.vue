<template>
    <Modal :open="open" size="lg" title="Configurar Projeção de Investimentos"
        subtitle="Qual planilha do SharePoint alimenta a tela e a régua do status." @close="fechar">
        <div v-if="!store.settings" class="py-6"><Skeleton variant="text" :lines="4" /></div>
        <form v-else class="flex flex-col gap-5" @submit.prevent="salvar">
            <div>
                <Input v-model="form.file_url" label="Link da planilha no SharePoint" required
                    placeholder="https://constmenin.sharepoint.com/sites/.../PROJEÇÃO X INVESTIMENTO MKT - 2026 - MARKETING.xlsx"
                    hint="Abra a pasta no SharePoint, copie o link do ARQUIVO (não da pasta) e cole aqui. O Office confere se consegue abrir antes de gravar." />
                <p v-if="store.settings.file_name" class="mt-1.5 text-xs text-ink-muted flex items-center gap-1.5 min-w-0">
                    <i class="fas fa-file-excel text-data-pos"></i>
                    <span class="truncate">Lendo hoje: <b class="text-ink">{{ store.settings.file_name }}</b></span>
                    <a v-if="store.settings.file_web_url" :href="store.settings.file_web_url" target="_blank" rel="noopener"
                        class="text-accent hover:underline shrink-0">abrir</a>
                </p>
            </div>

            <Input v-model="form.ignored_sheets" label="Abas que não são empreendimento"
                hint="Separe por ponto e vírgula. Ex.: PLANO DE MÍDIA; RESUMO" />

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input v-model="form.attention_pct" type="number" label="Atenção a partir de (%)" min="1" max="1000" required
                    hint="% da viabilidade consumida que pinta de amarelo" />
                <Input v-model="form.overrun_pct" type="number" label="Estouro a partir de (%)" min="1" max="1000" required
                    hint="% da viabilidade consumida que pinta de vermelho" />
                <Input v-model="form.check_interval_seconds" type="number" label="Reconferir a cada (s)" min="0" max="86400" required
                    hint="Dentro desse tempo a tela reaproveita a última leitura" />
            </div>

            <p v-if="erro" class="text-sm text-data-neg flex items-center gap-2">
                <i class="fas fa-circle-exclamation"></i>{{ erro }}
            </p>
            <p v-else-if="store.settings.last_error" class="text-xs text-data-warn flex items-center gap-2">
                <i class="fas fa-triangle-exclamation"></i>Última falha de leitura: {{ store.settings.last_error }}
            </p>
        </form>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button variant="ghost" size="sm" @click="fechar">Cancelar</Button>
                <Button variant="primary" size="sm" icon="fas fa-check" :loading="store.saving" :disabled="!store.settings" @click="salvar">
                    Salvar e reler a planilha
                </Button>
            </div>
        </template>
    </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useMktProjectionStore } from '@/stores/Marketing/MktProjection/mktProjectionStore';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const store = useMktProjectionStore();
const toast = useToast();
const erro = ref('');
const form = ref({ file_url: '', ignored_sheets: '', attention_pct: 80, overrun_pct: 100, check_interval_seconds: 60 });

function preencher() {
    const s = store.settings;
    if (!s) return;
    form.value = {
        file_url: s.file_url || '',
        ignored_sheets: s.ignored_sheets || '',
        attention_pct: s.attention_pct ?? 80,
        overrun_pct: s.overrun_pct ?? 100,
        check_interval_seconds: s.check_interval_seconds ?? 60,
    };
}

watch(() => props.open, async (aberto) => {
    if (!aberto) return;
    erro.value = '';
    if (!store.settings) await store.fetchSettings();
    preencher();
});

const fechar = () => emit('close');

async function salvar() {
    erro.value = '';
    try {
        await store.saveSettings({
            file_url: form.value.file_url,
            ignored_sheets: form.value.ignored_sheets,
            attention_pct: Number(form.value.attention_pct),
            overrun_pct: Number(form.value.overrun_pct),
            check_interval_seconds: Number(form.value.check_interval_seconds),
        });
        toast.success(`Configuração salva. A tela agora lê "${store.settings?.file_name || 'a planilha'}".`);
        emit('close');
    } catch (e) {
        erro.value = e.message;
    }
}
</script>
