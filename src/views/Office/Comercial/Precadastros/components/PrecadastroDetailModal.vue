<script setup>
import { computed, ref, watch } from 'vue'
import API_URL from '@/config/apiUrl'

const props = defineProps({
    precadastro: { type: Object, default: null },
    visivel: { type: Boolean, default: false },
})
const emit = defineEmits(['fechar'])

const detalhe = ref(null)
const loading = ref(false)
const tab = ref('geral') // geral | historico | leads

const authHeaders = () => {
    const token = localStorage.getItem('token')
    return { Authorization: token ? `Bearer ${token}` : '' }
}

async function carregarDetalhe(id) {
    loading.value = true
    try {
        const r = await fetch(`${API_URL}/cv/precadastros/${id}`, { headers: authHeaders() })
        const d = await r.json()
        if (r.ok) detalhe.value = d
    } finally { loading.value = false }
}

watch(() => [props.visivel, props.precadastro?.idprecadastro], ([v, id]) => {
    if (v && id) { detalhe.value = null; tab.value = 'geral'; carregarDetalhe(id) }
})

const historico = computed(() => {
    const h = detalhe.value?.status_historico
    return Array.isArray(h) ? h : []
})
const leads = computed(() => {
    const l = detalhe.value?.leads_associados
    return Array.isArray(l) ? l : []
})

function fmt(v) { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('pt-BR') }
function fmtMoney(v) { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—' }
function corSit(s) {
    if (!s) return 'bg-gray-200 text-gray-700'
    if (/aprovad/i.test(s)) return 'bg-emerald-100 text-emerald-700'
    if (/reprovad/i.test(s)) return 'bg-red-100 text-red-700'
    if (/reserva/i.test(s)) return 'bg-yellow-100 text-yellow-700'
    if (/análise|analise/i.test(s)) return 'bg-purple-100 text-purple-700'
    return 'bg-blue-100 text-blue-700'
}
</script>

<template>
    <Transition name="fade">
        <div v-if="visivel" class="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" @click.self="emit('fechar')">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
                <div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div>
                        <h3 class="text-lg font-semibold">Pré-cadastro #{{ precadastro?.idprecadastro }}</h3>
                        <p class="text-xs text-gray-500">{{ precadastro?.nome_cliente || precadastro?.cliente?.nome || '—' }} • {{ precadastro?.documento || '—' }}</p>
                    </div>
                    <button @click="emit('fechar')" class="text-gray-500 hover:text-red-500">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div class="flex gap-1 px-4 pt-2 border-b dark:border-gray-700">
                    <button v-for="t in [
                        { k: 'geral', label: 'Geral', icon: 'fa-circle-info' },
                        { k: 'historico', label: `Histórico (${historico.length})`, icon: 'fa-clock-rotate-left' },
                        { k: 'leads', label: `Leads (${leads.length})`, icon: 'fa-arrow-right-arrow-left' },
                    ]" :key="t.k" @click="tab = t.k"
                        :class="['px-3 py-2 text-sm rounded-t-lg', tab === t.k ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700']">
                        <i :class="['fas mr-1', t.icon]" />{{ t.label }}
                    </button>
                </div>

                <div class="flex-1 overflow-auto p-4">
                    <div v-if="loading" class="text-center py-12 text-gray-400">
                        <i class="fas fa-spinner fa-spin text-2xl"></i>
                    </div>

                    <div v-else-if="tab === 'geral'">
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div><span class="text-xs text-gray-500">Situação</span><div><span :class="['px-2 py-0.5 rounded text-xs', corSit(precadastro?.situacao_nome)]">{{ precadastro?.situacao_nome || '—' }}</span></div></div>
                            <div><span class="text-xs text-gray-500">Empreendimento</span><div>{{ precadastro?.empreendimento?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Unidade</span><div>{{ precadastro?.unidade?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Imobiliária</span><div>{{ precadastro?.imobiliaria?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Corretor</span><div>{{ precadastro?.corretor?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Empresa</span><div>{{ precadastro?.empresa_correspondente?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Correspondente</span><div>{{ precadastro?.correspondente?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Intenção</span><div>{{ precadastro?.intencao_compra || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Tabela</span><div>{{ precadastro?.tabela || '—' }}</div></div>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
                            <div><span class="text-xs text-gray-500">Avaliação</span><div class="font-bold">{{ fmtMoney(precadastro?.valor_avaliacao) }}</div></div>
                            <div><span class="text-xs text-gray-500">Aprovado</span><div class="font-bold text-emerald-600">{{ fmtMoney(precadastro?.valor_aprovado) }}</div></div>
                            <div><span class="text-xs text-gray-500">FGTS</span><div>{{ fmtMoney(precadastro?.valor_fgts) }}</div></div>
                            <div><span class="text-xs text-gray-500">Subsídio</span><div>{{ fmtMoney(precadastro?.valor_subsidio) }}</div></div>
                            <div><span class="text-xs text-gray-500">Total</span><div class="font-bold">{{ fmtMoney(precadastro?.valor_total) }}</div></div>
                            <div><span class="text-xs text-gray-500">Prestação</span><div>{{ fmtMoney(precadastro?.valor_prestacao) }}</div></div>
                            <div><span class="text-xs text-gray-500">Saldo Devedor</span><div>{{ fmtMoney(precadastro?.saldo_devedor) }}</div></div>
                            <div><span class="text-xs text-gray-500">Renda Total</span><div>{{ fmtMoney(precadastro?.renda_total) }}</div></div>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-4">
                            <div><span class="text-xs text-gray-500">Cadastro</span><div>{{ fmt(precadastro?.data_cad) }}</div></div>
                            <div><span class="text-xs text-gray-500">Finalização</span><div>{{ fmt(precadastro?.data_fim) }}</div></div>
                            <div><span class="text-xs text-gray-500">Cancelamento</span><div>{{ fmt(precadastro?.data_cancelamento) }}</div></div>
                            <div><span class="text-xs text-gray-500">Dias em análise</span><div class="font-bold">{{ Number(precadastro?.dias_em_analise || 0).toFixed(1) }}</div></div>
                            <div><span class="text-xs text-gray-500">Vencimento aprovação</span><div>{{ precadastro?.vencimento_aprovacao || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Aprovado por</span><div>{{ precadastro?.usuario_aprovou?.nome || '—' }}</div></div>
                        </div>
                        <a v-if="precadastro?.link" :href="precadastro.link" target="_blank" rel="noopener"
                            class="inline-flex items-center gap-1 mt-4 text-purple-600 hover:underline text-sm">
                            <i class="fas fa-arrow-up-right-from-square"></i> Abrir no CV
                        </a>
                    </div>

                    <div v-else-if="tab === 'historico'">
                        <div v-if="!historico.length" class="text-center py-8 text-gray-400">Nenhum snapshot ainda.</div>
                        <ol v-else class="relative border-l border-gray-300 dark:border-gray-700 ml-3 space-y-4">
                            <li v-for="(s, i) in historico" :key="i" class="ml-4">
                                <div class="absolute -left-1.5 mt-1 w-3 h-3 bg-purple-500 rounded-full"></div>
                                <div class="text-xs text-gray-500">{{ fmt(s.captured_at) }}</div>
                                <div class="text-sm"><span :class="['px-2 py-0.5 rounded text-xs', corSit(s.situacao_nome)]">{{ s.situacao_nome || '—' }}</span> • {{ fmtMoney(s.valor_aprovado) }}</div>
                            </li>
                        </ol>
                    </div>

                    <div v-else-if="tab === 'leads'">
                        <div v-if="!leads.length" class="text-center py-8 text-gray-400">Sem leads associados.</div>
                        <table v-else class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-700/60">
                                <tr class="text-xs uppercase">
                                    <th class="px-3 py-2 text-left">ID Lead</th>
                                    <th class="px-3 py-2 text-left">Situação</th>
                                    <th class="px-3 py-2 text-left">Cadastro</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                                <tr v-for="l in leads" :key="l.idlead">
                                    <td class="px-3 py-2 font-mono">{{ l.idlead }}</td>
                                    <td class="px-3 py-2 text-xs">{{ l.idsituacao }}</td>
                                    <td class="px-3 py-2 text-xs">{{ fmt(l.data_cad) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
