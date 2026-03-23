<template>
    <Transition name="slide-up">
        <div v-if="visivel" class="fixed inset-0 z-[60] overflow-y-auto" @click="$emit('fechar')">
            <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/70 transition-opacity"></div>

                <div class="relative inline-block w-full max-w-2xl my-8 text-left align-middle transform bg-white dark:bg-gray-900 shadow-2xl rounded-2xl overflow-hidden"
                    @click.stop>

                    <!-- Banner -->
                    <div class="bg-gradient-to-r from-blue-700 to-blue-500 px-6 pt-5 pb-12">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span :class="['px-2.5 py-0.5 rounded-full text-xs font-semibold', statusPill]">
                                        {{ lead.situacao_nome || 'Sem situação' }}
                                    </span>
                                    <span class="text-blue-200 text-xs">#{{ lead.idlead }}</span>
                                </div>
                                <h2 class="mt-1.5 text-xl font-bold text-white leading-snug">{{ lead.nome || '—' }}</h2>
                                <p class="text-blue-200 text-xs mt-0.5">Cadastrado {{ formatDate(lead.data_cad) }}</p>
                            </div>
                            <button @click="$emit('fechar')"
                                class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition shrink-0">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <!-- Quick links -->
                        <div class="mt-3 flex flex-wrap gap-1.5">
                            <a :href="`https://menin.cvcrm.com.br/gestor/comercial/leads/${lead.idlead}/administrar?lido=true`"
                                target="_blank"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-medium transition">
                                <img src="/CVLogo.png" alt="CV" class="h-3.5" />CV CRM
                            </a>
                            <a v-if="lead.link_rdstation" :href="lead.link_rdstation" target="_blank"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-medium transition">
                                <img src="/RDLogo.png" alt="RD" class="h-3.5" />RD Station
                            </a>
                            <a v-if="lead.link_interacoes" :href="lead.link_interacoes" target="_blank"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-medium transition">
                                <i class="fas fa-comments text-[11px]"></i>Interações
                            </a>
                            <a v-if="lead.link_simulacoes" :href="lead.link_simulacoes" target="_blank"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-medium transition">
                                <i class="fas fa-calculator text-[11px]"></i>Simulações
                            </a>
                            <a v-if="lead.link_reservas" :href="lead.link_reservas" target="_blank"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-medium transition">
                                <i class="fas fa-bookmark text-[11px]"></i>Reservas
                            </a>
                        </div>
                    </div>

                    <!-- Body scrollable -->
                    <div class="overflow-y-auto max-h-[58vh] -mt-6">
                        <!-- Contact card (floats over banner) -->
                        <div class="mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <!-- Email -->
                                <div>
                                    <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">E-mail</p>
                                    <a v-if="lead.email" :href="`mailto:${lead.email}`"
                                        class="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate block">
                                        {{ lead.email }}
                                    </a>
                                    <span v-else class="text-sm text-gray-400">—</span>
                                </div>
                                <!-- Telefone -->
                                <div>
                                    <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Telefone</p>
                                    <a v-if="lead.telefone"
                                        :href="`https://wa.me/55${lead.telefone.replace(/\D/g,'')}`"
                                        target="_blank"
                                        class="text-green-600 dark:text-green-400 hover:underline text-sm truncate block">
                                        <i class="fab fa-whatsapp mr-1 text-green-500"></i>{{ lead.telefone }}
                                    </a>
                                    <span v-else class="text-sm text-gray-400">—</span>
                                </div>
                                <!-- Localização -->
                                <div>
                                    <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Localização</p>
                                    <p class="text-sm text-gray-700 dark:text-gray-200 truncate">{{ locationText || '—' }}</p>
                                </div>
                            </div>
                        </div>

                        <div class="px-4 py-4 space-y-4">
                            <!-- Empreendimentos -->
                            <div>
                                <div class="flex items-center gap-1.5 mb-2">
                                    <i class="fas fa-city text-sm text-indigo-500"></i>
                                    <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Empreendimentos</h4>
                                </div>
                                <div v-if="empreendimentos.length" class="flex flex-wrap gap-1.5">
                                    <span v-for="(e, i) in empreendimentos" :key="i"
                                        class="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs font-medium">
                                        {{ e.nome || e }}
                                    </span>
                                </div>
                                <p v-else class="text-sm text-gray-400">—</p>
                            </div>

                            <!-- Responsáveis -->
                            <div>
                                <div class="flex items-center gap-1.5 mb-2">
                                    <i class="fas fa-users text-sm text-orange-500"></i>
                                    <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Responsáveis</h4>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div v-for="r in responsaveis" :key="r.label"
                                        class="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                                        <i :class="`${r.icon} text-gray-400 shrink-0`"></i>
                                        <div class="min-w-0">
                                            <p class="text-[10px] text-gray-400 uppercase tracking-wide leading-none">{{ r.label }}</p>
                                            <p class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate mt-0.5">{{ r.value || '—' }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Captação -->
                            <div>
                                <div class="flex items-center gap-1.5 mb-2">
                                    <i class="fas fa-bullhorn text-sm text-pink-500"></i>
                                    <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Captação</h4>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Mídia</p>
                                        <p class="text-sm text-gray-700 dark:text-gray-200">{{ lead.midia_principal || '—' }}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Origem</p>
                                        <p class="text-sm text-gray-700 dark:text-gray-200">{{ lead.origem || '—' }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Motivo de cancelamento -->
                            <div v-if="cancelInfo"
                                class="rounded-xl border border-red-200 dark:border-red-800/60 overflow-hidden">
                                <div class="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30">
                                    <i class="fas fa-ban text-red-500 text-xs shrink-0"></i>
                                    <p class="text-xs font-bold text-red-700 dark:text-red-400">Motivo de Cancelamento / Descarte</p>
                                </div>
                                <div class="px-3 py-2.5 space-y-1.5">
                                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ cancelInfo.motivo }}</p>
                                    <p v-if="cancelInfo.submotivo" class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ cancelInfo.submotivo }}</p>
                                </div>
                            </div>

                            <!-- Tags -->
                            <div v-if="tags.length">
                                <div class="flex items-center gap-1.5 mb-2">
                                    <i class="fas fa-tags text-sm text-yellow-500"></i>
                                    <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tags</h4>
                                </div>
                                <div class="flex flex-wrap gap-1.5">
                                    <span v-for="(tag, i) in tags" :key="i"
                                        class="px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 text-xs font-medium border border-yellow-200 dark:border-yellow-700">
                                        {{ tagLabel(tag) }}
                                    </span>
                                </div>
                            </div>

                            <!-- Última interação -->
                            <div v-if="lastInteracao">
                                <div class="flex items-center gap-1.5 mb-2">
                                    <i class="fas fa-comment-dots text-sm text-teal-500"></i>
                                    <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Última Interação</h4>
                                </div>
                                <div class="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div class="px-3 py-2 bg-gray-50 dark:bg-gray-700/40 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                        <i class="fas fa-clock text-[10px]"></i>
                                        <span>{{ formatDate(lastInteracao.data_cad) }}</span>
                                        <span v-if="lastInteracao.tipo"
                                            class="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[11px] font-medium">
                                            {{ lastInteracao.tipo }}
                                        </span>
                                        <span v-if="lastInteracao.usuario" class="ml-auto">
                                            <i class="fas fa-user mr-1"></i>{{ lastInteracao.usuario }}
                                        </span>
                                    </div>
                                    <div class="px-3 py-2.5 space-y-2">
                                        <div v-if="lastInteracao.descricao">
                                            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Descrição</p>
                                            <p class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">{{ lastInteracao.descricao }}</p>
                                        </div>
                                        <div v-if="anotacao">
                                            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Anotação</p>
                                            <p class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">{{ anotacao }}</p>
                                        </div>
                                        <p v-if="!lastInteracao.descricao && !anotacao" class="text-sm text-gray-400 italic">Sem conteúdo registrado.</p>
                                    </div>
                                </div>
                                <a v-if="lead.link_interacoes" :href="lead.link_interacoes" target="_blank"
                                    class="mt-1.5 inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline">
                                    <i class="fas fa-external-link-alt text-[10px]"></i>Ver histórico completo no CRM
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex justify-end">
                        <button @click="$emit('fechar')"
                            class="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    lead: { type: Object, required: true },
    visivel: { type: Boolean, required: true },
})
defineEmits(['fechar'])

const empreendimentos = computed(() => {
    const arr = Array.isArray(props.lead?.empreendimento) ? props.lead.empreendimento : []
    return arr.filter(Boolean)
})

const responsaveis = computed(() => [
    { label: 'Imobiliária', icon: 'fas fa-building', value: props.lead?.imobiliaria?.nome },
    { label: 'Corretor', icon: 'fas fa-user-tie', value: props.lead?.corretor?.nome },
    { label: 'Gestor', icon: 'fas fa-user-shield', value: props.lead?.gestor?.nome },
])

const tagLabel = (tag) => {
    if (typeof tag === 'string') return tag
    return tag?.nome ?? tag?.name ?? tag?.label ?? String(tag)
}

const allTags = computed(() => {
    const t = props.lead?.tags
    return Array.isArray(t) ? t.filter(Boolean) : []
})

// Motivo/submotivo: lê dos campos dedicados gravados no banco (via sync CV)
const cancelInfo = computed(() => {
    const m = props.lead?.motivo_cancelamento
    if (m) return { motivo: m, submotivo: props.lead?.submotivo_cancelamento || null }
    return null
})

const tags = computed(() => allTags.value)

// interacao é array — pega o último item
const lastInteracao = computed(() => {
    const i = props.lead?.interacao
    if (!i) return null
    if (Array.isArray(i)) return i.length ? i[i.length - 1] : null
    return i // compatibilidade com formato antigo (objeto)
})

// Anotação: anotacao do objeto, ou null (array não tem esse campo)
const anotacao = computed(() => lastInteracao.value?.anotacao || null)

const locationText = computed(() => {
    const parts = [props.lead?.cidade, props.lead?.estado, props.lead?.cep].filter(Boolean)
    return parts.join(', ') || null
})

const STATUS_COLORS = {
    'Novo': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'Em atendimento': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Reservado': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    'Vendido': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    'Cancelado': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    'Descartado': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}
const statusPill = computed(() =>
    STATUS_COLORS[props.lead?.situacao_nome] ?? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
)

const formatDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    if (isNaN(dt)) return d
    return dt.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
}
</style>
