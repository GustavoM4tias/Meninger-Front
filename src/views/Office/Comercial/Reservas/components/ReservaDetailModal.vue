<script setup>
import { computed, ref, watch } from 'vue'
import API_URL from '@/config/apiUrl'
import { iconForStage, clsForStage } from '../stages.js'

const props = defineProps({
    reserva: { type: Object, default: null },
    visivel: { type: Boolean, default: false },
})
const emit = defineEmits(['fechar'])

const detalhe = ref(null)
const loading = ref(false)
const tab = ref('geral') // geral | historico | leads | mensagens | contratos

const authHeaders = () => {
    const token = localStorage.getItem('token')
    return { Authorization: token ? `Bearer ${token}` : '' }
}

async function carregarDetalhe(id) {
    loading.value = true
    try {
        const r = await fetch(`${API_URL}/cv/reservas/report/${id}`, { headers: authHeaders() })
        const d = await r.json()
        if (r.ok) detalhe.value = d
    } finally { loading.value = false }
}

watch(() => [props.visivel, props.reserva?.idreserva], ([v, id]) => {
    if (v && id) { detalhe.value = null; tab.value = 'geral'; carregarDetalhe(id) }
})

const historico = computed(() => {
    const h = detalhe.value?.status
    return Array.isArray(h) ? h : []
})
const leads = computed(() => {
    const l = detalhe.value?.leads_associados
    return Array.isArray(l) ? l : []
})
const mensagens = computed(() => {
    const m = detalhe.value?.mensagens
    return Array.isArray(m) ? m : []
})
const contratos = computed(() => {
    const c = detalhe.value?.contratos
    return Array.isArray(c) ? c : []
})

function fmt(v) { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('pt-BR') }
</script>

<template>
    <Transition name="fade">
        <div v-if="visivel" class="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" @click.self="emit('fechar')">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
                <div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div>
                        <h3 class="text-lg font-semibold">Reserva #{{ reserva?.idreserva }}</h3>
                        <p class="text-xs text-gray-500">{{ reserva?.titular?.nome || '—' }} • {{ reserva?.documento || '—' }}</p>
                    </div>
                    <button @click="emit('fechar')" class="text-gray-500 hover:text-red-500">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div class="flex gap-1 px-4 pt-2 border-b dark:border-gray-700 overflow-x-auto">
                    <button v-for="t in [
                        { k: 'geral', label: 'Geral', icon: 'fa-circle-info' },
                        { k: 'contratos', label: `Contratos (${contratos.length})`, icon: 'fa-file-contract' },
                        { k: 'historico', label: `Histórico (${historico.length})`, icon: 'fa-clock-rotate-left' },
                        { k: 'leads', label: `Leads (${leads.length})`, icon: 'fa-arrow-right-arrow-left' },
                        { k: 'mensagens', label: `Mensagens (${mensagens.length})`, icon: 'fa-envelope' },
                    ]" :key="t.k" @click="tab = t.k"
                        :class="['px-3 py-2 text-sm rounded-t-lg whitespace-nowrap', tab === t.k ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700']">
                        <i :class="['fas mr-1', t.icon]" />{{ t.label }}
                    </button>
                </div>

                <div class="flex-1 overflow-auto p-4">
                    <div v-if="loading" class="text-center py-12 text-gray-400">
                        <i class="fas fa-spinner fa-spin text-2xl"></i>
                    </div>

                    <div v-else-if="tab === 'geral'">
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div><span class="text-xs text-gray-500">Situação</span><div><span :class="['px-2 py-0.5 rounded text-xs inline-flex items-center gap-1', clsForStage(reserva?.situacao?.nome)]"><i :class="iconForStage(reserva?.situacao?.nome)"></i>{{ reserva?.situacao?.nome || '—' }}</span></div></div>
                            <div><span class="text-xs text-gray-500">Status Repasse</span><div>{{ reserva?.status_repasse || '—' }}</div></div>
                            <div v-tippy="'Etapa do CRM marcada como Vendida — não significa venda concretizada (ver Faturamento)'">
                                <span class="text-xs text-gray-500">Etapa Vendida (CRM)</span>
                                <div :class="reserva?.vendida === 'S' ? 'text-emerald-600 font-bold' : ''">{{ reserva?.vendida === 'S' ? 'Sim' : 'Não' }}</div>
                            </div>
                            <div><span class="text-xs text-gray-500">Empreendimento</span><div>{{ reserva?.empreendimento || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Etapa / Bloco / Unidade</span><div>{{ [reserva?.etapa, reserva?.bloco, reserva?.unidade].filter(Boolean).join(' / ') || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Tipo Venda</span><div>{{ reserva?.tipovenda || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Imobiliária</span><div>{{ reserva?.imobiliaria?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Corretor</span><div>{{ reserva?.corretor?.nome || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Empresa Correspondente</span><div>{{ reserva?.empresa_correspondente?.nome || '—' }}</div></div>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
                            <div><span class="text-xs text-gray-500">Cadastro da Reserva</span><div>{{ fmt(reserva?.data_reserva) }}</div></div>
                            <div><span class="text-xs text-gray-500">Data Contrato</span><div>{{ fmt(reserva?.data_contrato) }}</div></div>
                            <div v-tippy="'Data em que a etapa Vendida foi marcada no CRM'">
                                <span class="text-xs text-gray-500">Data Etapa Vendida</span>
                                <div :class="reserva?.data_venda ? 'text-emerald-600 font-bold' : ''">{{ fmt(reserva?.data_venda) }}</div>
                            </div>
                            <div><span class="text-xs text-gray-500">Dias em Reserva</span><div class="font-bold">{{ Number(reserva?.dias_em_reserva || 0).toFixed(1) }}</div></div>
                            <div><span class="text-xs text-gray-500">Pré-cadastro #</span><div>{{ reserva?.idprecadastro || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Proposta CV</span><div>{{ reserva?.idproposta_cv || '—' }}</div></div>
                            <div><span class="text-xs text-gray-500">Proposta Interna</span><div>{{ reserva?.idproposta_int || '—' }}</div></div>
                        </div>
                        <div v-if="reserva?.observacoes" class="mt-4">
                            <span class="text-xs text-gray-500">Observações</span>
                            <div class="mt-1 p-3 bg-gray-50 dark:bg-gray-900/40 rounded text-sm whitespace-pre-line">{{ reserva.observacoes }}</div>
                        </div>
                    </div>

                    <div v-else-if="tab === 'contratos'">
                        <div v-if="!contratos.length" class="text-center py-8 text-gray-400">Sem contratos.</div>
                        <div v-else class="space-y-3">
                            <div v-for="(c, i) in contratos" :key="i" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-emerald-400">
                                <div class="text-sm font-semibold mb-2">Contrato #{{ c.idcontrato || c.numero_contrato || (i+1) }}</div>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                    <div><span class="text-gray-500">Data:</span> {{ fmt(c.data_contrato || c.data) }}</div>
                                    <div><span class="text-gray-500">Situação:</span> {{ c.situacao || c.status || '—' }}</div>
                                    <div><span class="text-gray-500">Tipo:</span> {{ c.tipo || '—' }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="tab === 'historico'">
                        <div v-if="!historico.length" class="text-center py-8 text-gray-400">Nenhum snapshot ainda.</div>
                        <ol v-else class="relative border-l border-gray-300 dark:border-gray-700 ml-3 space-y-4">
                            <li v-for="(s, i) in historico" :key="i" class="ml-4">
                                <div class="absolute -left-1.5 mt-1 w-3 h-3 bg-purple-500 rounded-full"></div>
                                <div class="text-xs text-gray-500">{{ fmt(s.captured_at) }}</div>
                                <div class="text-sm">
                                    <span :class="['px-2 py-0.5 rounded text-xs', clsForStage(s.status_reserva)]">{{ s.status_reserva || '—' }}</span>
                                    <span v-if="s.status_repasse" class="ml-2 text-xs text-gray-500">Repasse: {{ s.status_repasse }}</span>
                                </div>
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

                    <div v-else-if="tab === 'mensagens'">
                        <div v-if="!mensagens.length" class="text-center py-8 text-gray-400">Sem mensagens.</div>
                        <div v-else class="space-y-2">
                            <div v-for="(m, i) in mensagens" :key="i" class="bg-gray-50 dark:bg-gray-900/40 rounded p-3">
                                <div class="text-xs text-gray-500 mb-1">{{ fmt(m.data_cad || m.data) }}</div>
                                <div class="text-sm whitespace-pre-line">{{ m.mensagem || m.texto || '—' }}</div>
                            </div>
                        </div>
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
