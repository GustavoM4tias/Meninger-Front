<script setup>
// Credencial do painel do CV (APIs v3) e quem é avisado quando ela cai.
//
// Por que isto existe como tela: a associação imobiliária x empreendimento só
// é legível pela v3, que exige e-mail e senha de um usuário do CV - e o CV
// força troca de senha de tempos em tempos. Com a credencial presa no
// servidor, cada rotação derrubava a leitura até alguém fazer deploy, e em
// silêncio. Aqui a rotação vira um formulário de trinta segundos.
//
// A senha nunca volta do servidor: o formulário só sabe se existe uma
// gravada. Campo em branco ao salvar significa "não mexi nela", nunca
// "apague".

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const store = useRealEstateStore();
const toast = useToast();

const email = ref('');
const senha = ref('');
const painel = ref('gestor');
const avisados = ref([]);      // nomes escolhidos no MultiSelector
const salvando = ref(false);
const testando = ref(false);
const pronto = ref(false);

const PAINEL_OPTIONS = [
    { value: 'gestor', label: 'Gestor (administrativo)' },
    { value: 'corretor', label: 'Corretor' },
    { value: 'imobiliaria', label: 'Imobiliária' },
];

const cfg = computed(() => store.cvPanel);
const userNames = computed(() => store.officeUsers.map(u => u.username));

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-';

async function carregar() {
    senha.value = '';
    await Promise.all([
        store.cvPanel ? Promise.resolve() : store.fetchCvPanel(),
        store.fetchOfficeUsers(),
    ]);
    email.value = cfg.value?.email || '';
    painel.value = cfg.value?.painel || 'gestor';
    const ids = cfg.value?.notify_user_ids || [];
    avisados.value = store.officeUsers.filter(u => ids.includes(u.id)).map(u => u.username);
    pronto.value = true;
}

async function salvar() {
    salvando.value = true;
    try {
        const ids = store.officeUsers.filter(u => avisados.value.includes(u.username)).map(u => u.id);
        const patch = { email: email.value, painel: painel.value, notify_user_ids: ids };
        if (senha.value) patch.senha = senha.value;

        const data = await store.saveCvPanel(patch);
        senha.value = '';
        if (data?.teste?.ok) toast.success(data.teste.mensagem || 'Credencial salva e testada.');
        else toast.error(data?.teste?.mensagem || 'Salvou, mas o login no CV falhou.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao salvar a credencial.');
    } finally {
        salvando.value = false;
    }
}

async function testar() {
    testando.value = true;
    try {
        const data = await store.testCvPanel();
        if (data?.teste?.ok) toast.success('Login no CV funcionou.');
        else toast.error(data?.teste?.mensagem || 'O login no CV falhou.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao testar.');
    } finally {
        testando.value = false;
    }
}

onMounted(() => {
    carregar().catch(err => toast.error(err?.message || 'Não foi possível carregar a credencial.'));
});
</script>

<template>
    <Panel title="Credencial do CV" icon="fas fa-key"
        subtitle="Login usado para ler o que a chave de integração não alcança"
        :loading="!pronto" loading-variant="text">
        <div class="space-y-4">
            <!-- Estado atual -->
            <div class="rounded-xl border border-line bg-surface-sunken p-3.5 space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                    <Badge v-if="cfg?.saudavel" variant="success" size="sm">Funcionando</Badge>
                    <Badge v-else-if="cfg?.configurado" variant="danger" size="sm">Com falha</Badge>
                    <Badge v-else variant="neutral" size="sm">Não configurada</Badge>
                    <span class="text-xs text-ink-muted">Último login bom: {{ fmt(cfg?.last_ok_at) }}</span>
                </div>
                <p v-if="cfg?.last_error" class="text-xs text-data-neg">
                    <i class="fas fa-triangle-exclamation mr-1"></i>
                    {{ cfg.last_error }} <span class="text-ink-subtle">({{ fmt(cfg.last_error_at) }})</span>
                </p>
                <p class="text-xs text-ink-muted">
                    O CV troca a senha deste usuário de tempos em tempos. Quando isso acontecer, a leitura para
                    e quem estiver na lista abaixo é avisado - é só voltar aqui e trocar a senha.
                </p>
            </div>

            <Input v-model="email" label="E-mail do usuário do CV" placeholder="sistema@empresa.com.br"
                hint="Use um usuário dedicado à integração, não o login de uma pessoa." />

            <Input v-model="senha" type="password" label="Senha"
                :placeholder="cfg?.senha_definida ? 'Deixe em branco para manter a atual' : 'Senha do usuário'"
                hint="A senha nunca é devolvida pela tela. Em branco significa manter a que já está gravada." />

            <Select v-model="painel" :options="PAINEL_OPTIONS" label="Painel"
                hint="Gestor é o que enxerga o cadastro de imobiliárias." />

            <div>
                <MultiSelector
                    v-model="avisados"
                    :options="userNames"
                    label="Avisar quem, se a credencial cair"
                    placeholder="Selecione as pessoas"
                />
                <p class="mt-1 text-xs text-ink-muted">
                    Deixando vazio, o aviso vai para todos os administradores. O aviso sai uma vez por
                    episódio, não a cada tentativa.
                </p>
            </div>

            <div class="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="ghost" icon="fas fa-plug-circle-check" :loading="testando"
                    :disabled="!cfg?.configurado" @click="testar">Testar agora</Button>
                <Button variant="primary" icon="fas fa-check" :loading="salvando" @click="salvar">Salvar</Button>
            </div>
        </div>
    </Panel>
</template>
