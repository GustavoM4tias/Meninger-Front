<script setup>
// Sessão do robô no painel do CV - a terceira credencial do CV, ao lado da
// chave de integração e do login da API v3.
//
// Por que não é o mesmo login da credencial: aprovar reserva só existe no
// formulário do PAINEL, e o login do painel tem CAPTCHA (Cloudflare
// Turnstile). E-mail e senha não passam por ele, nem o token da v3 abre o
// painel. Então uma pessoa entra no CV com o usuário do robô e cola aqui o
// cookie da sessão; o Office a mantém viva. A regra, a frequência e o
// histórico do que o robô faz com ela ficam na tela Robô de aprovação.
//
// O cookie nunca volta do servidor: a tela só sabe se há sessão e se está viva.

import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';

const store = useRealEstateStore();
const toast = useToast();

const sessao = computed(() => store.cvRobo?.sessao || {});
const cookie = ref('');
const conectando = ref(false);
const removendo = ref(false);

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-';

const duracao = computed(() => {
    const m = sessao.value.duracao_min;
    if (m === null || m === undefined) return '-';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return h < 48 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} dias e ${h % 24} h`;
});

async function conectar() {
    if (!cookie.value.trim()) { toast.error('Cole o valor do cookie CVid.'); return; }
    conectando.value = true;
    try {
        const data = await store.conectarCvRobo(cookie.value.trim());
        cookie.value = '';
        if (data?.teste?.ok) toast.success(data.teste.mensagem);
        else toast.error(data?.teste?.mensagem || 'O CV não aceitou a sessão.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao conectar a sessão.');
    } finally {
        conectando.value = false;
    }
}

async function remover() {
    if (!await pedirConfirmacao({
        title: 'Remover a sessão do robô?',
        consequence: 'O Office para de manter a sessão viva e a reaprovação automática para. Para voltar, alguém precisa entrar no CV com o usuário do robô e colar a sessão de novo.',
        confirmLabel: 'Remover sessão',
    })) return;
    removendo.value = true;
    try {
        const data = await store.desconectarCvRobo();
        toast.success(data?.teste?.mensagem || 'Sessão removida.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao remover a sessão.');
    } finally {
        removendo.value = false;
    }
}

onMounted(() => {
    if (!store.cvRobo) store.fetchCvRobo().catch(err => toast.error(err?.message || 'Não foi possível ler a sessão do robô.'));
});
</script>

<template>
    <Panel title="Sessão do robô no painel" icon="fas fa-robot"
        subtitle="O acesso que o robô usa para aprovar reservas no CV"
        :loading="store.cvRoboLoading && !store.cvRobo" loading-variant="text">
        <div class="space-y-3">
            <div class="rounded-xl border border-line bg-surface-sunken p-3.5 space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                    <Badge v-if="sessao.viva" variant="success" size="sm">Sessão viva</Badge>
                    <Badge v-else-if="sessao.conectada" variant="danger" size="sm">Sessão caiu</Badge>
                    <Badge v-else variant="neutral" size="sm">Sem sessão</Badge>
                    <span v-if="sessao.conectada" class="text-xs text-ink-muted">
                        Conectada por {{ sessao.definida_por_nome || '-' }} em {{ fmt(sessao.definida_em) }}
                    </span>
                </div>
                <p v-if="sessao.conectada" class="text-xs text-ink-muted">
                    Último sinal: {{ fmt(sessao.ultimo_ok_em) }} · {{ sessao.pings_ok }} sinais · durou {{ duracao }}
                </p>
                <p v-if="sessao.perdida_em" class="text-xs text-data-neg">
                    <i class="fas fa-triangle-exclamation mr-1"></i>
                    Caiu em {{ fmt(sessao.perdida_em) }}: {{ sessao.perdida_motivo }}
                </p>
                <p class="text-xs text-ink-muted">
                    Não dá para usar o login da credencial ao lado: o painel do CV pede CAPTCHA no login, e só uma
                    pessoa passa por ele. Por isso a sessão é colada aqui.
                </p>
            </div>

            <ol class="text-xs text-ink-muted space-y-1 list-decimal pl-4">
                <li>Abra uma janela anônima e entre no CV com o usuário do robô (sistema@menin.com.br).</li>
                <li>Aperte F12 &gt; Aplicativo &gt; Cookies &gt; menin.cvcrm.com.br e copie o valor de <strong class="text-ink">CVid</strong>.</li>
                <li>Cole abaixo e conecte. Depois feche a janela <strong class="text-ink">sem clicar em Sair</strong> - sair encerra a sessão.</li>
            </ol>

            <Input v-model="cookie" type="password" label="Sessão do robô (cookie CVid)"
                placeholder="Cole aqui o valor do CVid"
                hint="O Office testa no CV antes de gravar e guarda criptografado. Não use este usuário em outro lugar: entrar com ele de novo pode derrubar a sessão do robô." />

            <div class="flex flex-wrap items-center justify-between gap-2">
                <RouterLink to="/crm/robo" class="text-xs text-accent hover:underline">
                    <i class="fas fa-arrow-right mr-1"></i>Regra, frequência e histórico do robô
                </RouterLink>
                <div class="flex flex-wrap gap-2">
                    <Button v-if="sessao.conectada" variant="ghost" icon="fas fa-link-slash" :loading="removendo"
                        @click="remover">Remover sessão</Button>
                    <Button variant="primary" icon="fas fa-plug" :loading="conectando" @click="conectar">
                        {{ sessao.conectada ? 'Trocar sessão' : 'Conectar sessão' }}
                    </Button>
                </div>
            </div>
        </div>
    </Panel>
</template>
