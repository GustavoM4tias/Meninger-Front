<script setup>
// Vínculo PADRÃO de uma conta de anúncio da Meta (2026-09-16).
//
// A conta é de um empreendimento; toda campanha dela herda este destino, então
// vincular aqui uma vez substitui o cadastro campanha a campanha. Mídia e
// origem são opcionais: vazios caem no padrão de Configurações. A fila do CV
// do empreendimento fica no mesmo modal porque é a outra metade do vínculo
// (é ela que recebe o lead que volta com interesse novo).

import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import { fieldBase, labelBase } from '@/components/UI/_classes.js';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';

const props = defineProps({
    open: { type: Boolean, default: false },
    account: { type: Object, default: null },     // linha de overview.accounts
    defaults: { type: Object, default: null },    // { midia_slug, cv_origem }
});
const emit = defineEmits(['update:open', 'saved']);

const store = useCampaignsStore();
const toast = useToast();

const form = ref({ mapping_active: true, cv_skip: false, bound_empreendimentos: [], midia_slug: '', cv_origem: '', tags_str: '', notes: '' });
const errorMsg = ref(null);

// Filas do CV + fila atual por empreendimento (uma leitura por abertura).
const queues = ref([]);
const queueByEmp = ref(new Map());
const queueNameByEmp = ref(new Map());
const empName = ref(new Map());
const empCity = ref(new Map());
const filaDraft = ref({});          // idempreendimento -> idfila escolhido no modal
const loadingQueues = ref(false);

async function loadQueues() {
    loadingQueues.value = true;
    try {
        const d = await store.fetchQueues();
        queues.value = (d.filas || []).filter(f => f.presente_no_cv !== false);
        const byEmp = new Map();
        const nameByEmp = new Map();
        const names = new Map();
        const cities = new Map();
        for (const e of d.empreendimentos || []) {
            names.set(Number(e.idempreendimento), e.nome);
            cities.set(Number(e.idempreendimento), e.cidade || null);
            if (e.idfila) { byEmp.set(Number(e.idempreendimento), e.idfila); nameByEmp.set(Number(e.idempreendimento), e.fila_nome); }
        }
        queueByEmp.value = byEmp;
        queueNameByEmp.value = nameByEmp;
        empName.value = names;
        empCity.value = cities;
    } catch (e) {
        queues.value = [];
    } finally {
        loadingQueues.value = false;
    }
}

watch(() => props.open, (v) => {
    if (!v) return;
    const a = props.account || {};
    form.value = {
        mapping_active: a.mapping_active !== false,
        cv_skip: a.cv_skip === true,
        bound_empreendimentos: Array.isArray(a.bound_empreendimentos) ? [...a.bound_empreendimentos] : [],
        midia_slug: a.midia_slug || '',
        cv_origem: a.cv_origem || '',
        tags_str: Array.isArray(a.tags) ? a.tags.join(', ') : '',
        notes: a.notes || '',
    };
    filaDraft.value = {};
    errorMsg.value = null;
    loadQueues();
});

const midiaEfetiva = computed(() => form.value.midia_slug.trim() || props.defaults?.midia_slug || 'Facebook Ads');
const origemEfetiva = computed(() => form.value.cv_origem || props.defaults?.cv_origem || 'FB');
const vaiRotear = computed(() => form.value.mapping_active && form.value.bound_empreendimentos.length > 0);
// Conta externa: o empreendimento nem tem fila no CV (caso London). Lead
// entra como "Fora do CV" e a Central para de cobrar vínculo e de alertar.
const foraDoCv = computed(() => form.value.mapping_active && form.value.cv_skip && !form.value.bound_empreendimentos.length);

// Opções dos seletores (o Select só aceita { value, label }; "" é o placeholder
// dele, então o padrão usa um sentinela).
const ORIGEM_DEFAULT = '__padrao__';
const origemOptions = computed(() => [
    { value: ORIGEM_DEFAULT, label: `Padrão (${props.defaults?.cv_origem || 'FB'})` },
    { value: 'FB', label: 'FB (Facebook)' },
    { value: 'IG', label: 'IG (Instagram)' },
]);
const cvOrigemSel = computed({
    get: () => form.value.cv_origem || ORIGEM_DEFAULT,
    set: (v) => { form.value.cv_origem = v === ORIGEM_DEFAULT ? '' : v; },
});
const SEM_FILA = '__sem_fila__';
const filaOptions = computed(() => [
    { value: SEM_FILA, label: 'Sem fila (retorno não se aplica)' },
    ...queues.value.map(f => ({
        value: String(f.idfila),
        label: `${f.nome} · ${atendeDaFila(f) ? `atende: ${atendeDaFila(f)}` : 'ainda não atende ninguém'}${f.qtd_corretores ? ` · ${f.qtd_corretores} atendente(s)` : ''}`,
    })),
]);
function filaSel(id) { const v = filaDe(id); return v ? String(v) : SEM_FILA; }
function onFilaSel(id, v) { setFila(id, v === SEM_FILA ? null : v); }

// Fila escolhida para um empreendimento: o rascunho do modal, senão a atual.
function filaDe(id) {
    const n = Number(id);
    if (Object.prototype.hasOwnProperty.call(filaDraft.value, n)) return filaDraft.value[n];
    return queueByEmp.value.get(n) ?? null;
}
function setFila(id, idfila) {
    filaDraft.value = { ...filaDraft.value, [Number(id)]: idfila ? Number(idfila) : null };
}
function nomeEmp(id) {
    return empName.value.get(Number(id)) || `#${id}`;
}
// Quem a fila já atende, para o rótulo da opção. Sem isso "Fila Residencial
// Esmeralda - Avaré" parecia servir para Três Marias (Ibitinga).
function atendeDaFila(f) {
    const emps = f.empreendimentos || [];
    return emps.length ? emps.map(e => e.cidade ? `${e.nome} (${e.cidade})` : e.nome).join(', ') : null;
}
// Fila escolhida atende outra praça e não a deste empreendimento.
function filaForaDaPraca(id) {
    const idfila = filaDe(id);
    if (!idfila) return null;
    const f = queues.value.find(q => q.idfila === Number(idfila));
    const cidade = empCity.value.get(Number(id));
    const cidades = f?.cidades || [];
    if (!f || !cidade || !cidades.length || cidades.includes(cidade)) return null;
    return { cidades, cidade };
}

const saving = ref(false);
async function save() {
    errorMsg.value = null;
    if (form.value.mapping_active && !form.value.cv_skip && !form.value.bound_empreendimentos.length) {
        errorMsg.value = 'Escolha o empreendimento da conta, marque "fora do CV" ou desative o vínculo padrão.';
        return;
    }
    saving.value = true;
    try {
        const tags = form.value.tags_str.split(',').map(t => t.trim()).filter(Boolean);
        const binding = await store.setAccountBinding(props.account.account_id, {
            mapping_active: form.value.mapping_active,
            cv_skip: form.value.cv_skip,
            bound_empreendimentos: form.value.bound_empreendimentos,
            midia_slug: form.value.midia_slug.trim() || null,
            cv_origem: form.value.cv_origem || null,
            tags,
            notes: form.value.notes.trim() || null,
        });
        if (!binding) {
            errorMsg.value = store.error || 'Não foi possível salvar o vínculo da conta.';
            return;
        }
        // Filas alteradas no modal: uma chamada por empreendimento mexido.
        let filasOk = 0, filasErro = 0;
        for (const [id, idfila] of Object.entries(filaDraft.value)) {
            const atual = queueByEmp.value.get(Number(id)) ?? null;
            if ((idfila ?? null) === atual) continue;
            try { await store.bindQueue(id, idfila); filasOk++; }
            catch (e) { filasErro++; toast.error(`Fila de ${nomeEmp(id)}: ${e.message}`); }
        }
        toast.success(vaiRotear.value
            ? `Vínculo da conta salvo: ${form.value.bound_empreendimentos.length} empreendimento(s), mídia "${midiaEfetiva.value}".`
                + (filasOk ? ` ${filasOk} fila(s) atualizada(s).` : '')
            : foraDoCv.value
                ? 'Conta marcada como fora do CV: os leads dela ficam no Office e os represados saíram da cobrança.'
                : 'Conta sem vínculo padrão: as campanhas dela dependem do vínculo próprio.');
        emit('saved', binding);
        if (!filasErro) emit('update:open', false);
    } finally {
        saving.value = false;
    }
}
</script>

<template>
  <Modal :open="open" size="lg" :title="account?.account_name || 'Conta de anúncio'"
    subtitle="Vínculo padrão: toda campanha desta conta herda este destino"
    @update:open="v => emit('update:open', v)">

    <div class="space-y-4">
      <!-- Ativo -->
      <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5 flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-ink">Vínculo padrão ativo</div>
          <p class="text-micro text-ink-subtle mt-0.5">
            Desligado, a conta não decide nada: cada campanha precisa do vínculo próprio ou o lead fica represado.
          </p>
        </div>
        <Switch v-model="form.mapping_active" size="sm" class="shrink-0" />
      </div>

      <!-- Conta externa: nada vai ao CV -->
      <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5 flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-ink">Conta fora do CV (externa)</div>
          <p class="text-micro text-ink-subtle mt-0.5">
            Para conta cujo empreendimento não tem fila no CV: os leads ficam no Office como "Fora do CV",
            não represam e não disparam alerta. Os que já estavam represados saem da cobrança ao salvar.
            Se você escolher um empreendimento abaixo, ele vale e esta opção fica sem efeito.
          </p>
        </div>
        <Switch v-model="form.cv_skip" size="sm" class="shrink-0" :disabled="!form.mapping_active" />
      </div>

      <!-- Empreendimento -->
      <div>
        <label class="text-sm font-medium text-ink block mb-1">Empreendimento da conta <span v-if="!form.cv_skip" class="text-data-neg">*</span></label>
        <p class="text-xs text-ink-subtle mb-2">
          É o destino do lead no CV. Campanha desta conta que for de OUTRO produto recebe vínculo próprio no modal dela.
        </p>
        <EnterpriseMultiSelect v-model="form.bound_empreendimentos" />
      </div>

      <!-- Fila do CV por empreendimento -->
      <div v-if="form.bound_empreendimentos.length" class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
        <div class="text-xs font-medium text-ink mb-0.5"><i class="fas fa-people-group text-accent mr-1.5"></i>Fila do CV do empreendimento</div>
        <p class="text-micro text-ink-subtle mb-2">
          Quem recebe o lead que volta com interesse novo. Sem fila, o retorno automático não acontece para este empreendimento.
        </p>
        <div v-if="loadingQueues" class="text-micro text-ink-subtle"><i class="fas fa-circle-notch fa-spin mr-1"></i>Lendo filas...</div>
        <div v-else class="space-y-2">
          <div v-for="id in form.bound_empreendimentos" :key="id" class="flex flex-col gap-1">
            <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <span class="text-xs text-ink sm:w-56 truncate" :title="nomeEmp(id)">
                {{ nomeEmp(id) }}<span v-if="empCity.get(Number(id))" class="text-ink-subtle"> ({{ empCity.get(Number(id)) }})</span>
              </span>
              <Select :model-value="filaSel(id)" @update:model-value="v => onFilaSel(id, v)" :options="filaOptions"
                size="sm" placeholder="" class="flex-1" :classes="filaForaDaPraca(id) ? 'border-data-neg' : ''" />
            </div>
            <p v-if="filaForaDaPraca(id)" class="text-micro text-data-neg sm:pl-[15rem]">
              <i class="fas fa-triangle-exclamation mr-1"></i>
              Esta fila atende {{ filaForaDaPraca(id).cidades.join(', ') }}, não {{ filaForaDaPraca(id).cidade }}: o lead que volta cairia com corretor de outra praça.
            </p>
          </div>
        </div>
      </div>

      <!-- Mídia + origem -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input v-model="form.midia_slug" label="Mídia (CV)" class="sm:col-span-2"
          :placeholder="defaults?.midia_slug || 'Facebook Ads'"
          :hint="`Vazio = padrão de Configurações (${defaults?.midia_slug || 'Facebook Ads'}).`" />
        <Select v-model="cvOrigemSel" label="Origem CV" :options="origemOptions" placeholder="" />
      </div>

      <Collapsible title="Tags e observação" icon="fas fa-tag" hint="opcional">
        <div class="mt-2 space-y-3">
          <Input v-model="form.tags_str" label="Tags" placeholder="lancamento, vip" hint="Separadas por vírgula." />
          <div>
            <label :class="labelBase">Observação interna</label>
            <textarea v-model="form.notes" rows="2" :class="[fieldBase, 'rounded-lg px-3 py-2 text-sm resize-y']" />
          </div>
        </div>
      </Collapsible>

      <!-- Preview -->
      <div class="rounded-lg border px-3 py-2.5"
        :class="vaiRotear ? 'border-data-pos/30 bg-data-pos/5' : (foraDoCv ? 'border-line bg-surface-sunken/30' : 'border-data-warn/30 bg-data-warn/5')">
        <div class="text-xs font-medium" :class="vaiRotear ? 'text-data-pos' : (foraDoCv ? 'text-ink-muted' : 'text-data-warn')">
          <i :class="vaiRotear ? 'fas fa-bolt' : (foraDoCv ? 'fas fa-arrow-right-from-bracket' : 'fas fa-hand')" class="mr-1.5"></i>
          <template v-if="vaiRotear">
            Campanha nova desta conta já nasce vinculada: lead sai com mídia "{{ midiaEfetiva }}", origem {{ origemEfetiva }}.
          </template>
          <template v-else-if="foraDoCv">
            Fora do CV: lead desta conta fica no Office (Captação, status "Fora do CV") e não vai ao CRM.
          </template>
          <template v-else>
            Sem vínculo padrão: campanha desta conta sem vínculo próprio represa o lead.
          </template>
        </div>
      </div>

      <div v-if="errorMsg" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-xs text-data-neg">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ errorMsg }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="secondary" size="sm" @click="emit('update:open', false)">Cancelar</Button>
        <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="saving" @click="save">Salvar vínculo da conta</Button>
      </div>
    </template>
  </Modal>
</template>
