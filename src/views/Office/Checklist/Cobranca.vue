<script setup>
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useCobrancaStore } from '@/stores/Checklist/cobrancaStore.js';
import RuleEditor from './components/RuleEditor.vue';

const store = useCobrancaStore();
const router = useRouter();
const toast = useToast();

onMounted(() => store.load());

async function saveSettings() { try { await store.saveSettings(); toast.success('Parâmetros salvos.'); } catch (e) { toast.error(e.message); } }
async function addRule() { try { await store.addRule(); toast.success('Regra adicionada. Ajuste e salve.'); } catch (e) { toast.error(e.message); } }
async function saveRule(r) { try { await store.saveRule(r); toast.success('Regra salva.'); } catch (e) { toast.error(e.message); } }
async function delRule(r) { if (!confirm(`Excluir a regra "${r.name}"?`)) return; try { await store.deleteRule(r.id); toast.success('Regra excluída.'); } catch (e) { toast.error(e.message); } }
async function simulate() { try { const res = await store.runNow(true); toast.info(`Simulação: ${res.fired} lembrete(s) seriam enviados.`); } catch (e) { toast.error(e.message); } }
async function fireNow() { if (!confirm('Disparar a cobrança AGORA de verdade (envia notificações)?')) return; try { const res = await store.runNow(false); toast.success(`Disparados ${res.fired} lembrete(s).`); } catch (e) { toast.error(e.message); } }

const STATE_CLASSES = [{ v: 'TODO', l: 'A fazer' }, { v: 'IN_PROGRESS', l: 'Em andamento' }, { v: 'BLOCKED', l: 'Bloqueada' }, { v: 'DONE', l: 'Concluída' }, { v: 'CANCELLED', l: 'Cancelada / N-A' }];
async function addStatus() { try { await store.addStatus(); } catch (e) { toast.error(e.message); } }
async function saveStatus(s) { try { await store.saveStatus(s); toast.success('Status salvo.'); } catch (e) { toast.error(e.message); } }
async function delStatus(s) { if (!confirm(`Desativar o status "${s.label}"?`)) return; try { await store.deleteStatus(s.id); toast.success('Status removido.'); } catch (e) { toast.error(e.message); } }

const lastRun = computed(() => store.lastRun);
const inputCls = 'rounded-lg border border-line bg-surface text-ink px-2 py-1.5 text-sm focus-ring';
const btnPrimary = 'px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg focus-ring disabled:opacity-60';
const btnGhost = 'px-3 py-1.5 text-sm border border-line rounded-lg text-ink-muted hover:bg-surface-sunken focus-ring disabled:opacity-60';
</script>

<template>
    <div class="p-4 md:p-6 max-w-5xl mx-auto">
        <button @click="router.push('/checklists')" class="text-sm text-ink-muted hover:text-ink mb-2"><i class="fas fa-arrow-left"></i> Checklists</button>
        <h1 class="text-xl md:text-2xl font-bold text-ink flex items-center gap-2 mb-1"><i class="fas fa-bell text-amber-500"></i> Cobrança - régua configurável</h1>
        <p class="text-sm text-ink-muted mb-5">Defina quando, para quem e por quais canais o sistema cobra as entregas. Tudo editável.</p>

        <div v-if="store.loading" class="text-center text-ink-subtle py-16"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>

        <template v-else>
            <!-- Parâmetros do motor -->
            <div v-if="store.settings" class="surface-card p-4 mb-5">
                <h2 class="font-semibold text-ink mb-3">Parâmetros do motor</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label class="flex items-center gap-2 text-sm text-ink"><input type="checkbox" v-model="store.settings.cobranca_enabled" /> Cobrança ativa</label>
                    <label class="text-sm text-ink">Hora do disparo<input type="number" min="0" max="23" v-model.number="store.settings.run_hour" :class="inputCls + ' w-full mt-1'" /></label>
                    <label class="text-sm text-ink">Fuso horário<input type="text" v-model="store.settings.timezone" :class="inputCls + ' w-full mt-1'" /></label>
                    <label class="flex items-center gap-2 text-sm text-ink"><input type="checkbox" v-model="store.settings.include_weekends" /> Inclui fins de semana</label>
                    <label class="flex items-center gap-2 text-sm text-ink"><input type="checkbox" v-model="store.settings.respect_user_prefs" /> Respeita preferências de canal do usuário</label>
                </div>
                <div class="flex items-center gap-2 mt-4">
                    <button @click="saveSettings" :disabled="store.saving" :class="btnPrimary">Salvar parâmetros</button>
                    <span class="text-xs text-ink-subtle">O motor roda 1x/dia, na hora configurada (fuso acima).</span>
                </div>
            </div>

            <!-- Status e cores -->
            <div class="surface-card p-4 mb-5">
                <div class="flex items-center justify-between mb-3">
                    <h2 class="font-semibold text-ink">Status e cores</h2>
                    <button @click="addStatus" :class="btnPrimary"><i class="fas fa-plus"></i> Novo status</button>
                </div>
                <div class="space-y-2">
                    <div v-for="s in store.statuses" :key="s.id" class="flex items-center gap-2 flex-wrap">
                        <input type="color" :value="s.color || '#94a3b8'" @input="s.color = $event.target.value" class="w-9 h-9 rounded-lg border border-line bg-surface p-0.5 cursor-pointer" title="Cor padrão do status" />
                        <input v-model="s.label" class="flex-1 min-w-[140px] rounded-lg border border-line bg-surface text-ink px-2 py-1.5 text-sm focus-ring" />
                        <select v-model="s.state_class" class="rounded-lg border border-line bg-surface text-ink px-2 py-1.5 text-sm focus-ring">
                            <option v-for="c in STATE_CLASSES" :key="c.v" :value="c.v">{{ c.l }}</option>
                        </select>
                        <label class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" v-model="s.is_active" /> ativo</label>
                        <button @click="saveStatus(s)" class="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg focus-ring">Salvar</button>
                        <button @click="delStatus(s)" class="text-xs text-red-500 hover:text-red-400 px-1"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <p class="text-[11px] text-ink-subtle mt-2">A cor aparece no Quadro, na Tabela e na linha do tempo. "Classe" define o cálculo de progresso/atraso (Cancelada/N-A fica fora da conta).</p>
            </div>

            <!-- Simulação -->
            <div class="surface-card p-4 mb-5">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <h2 class="font-semibold text-ink">Testar agora</h2>
                    <div class="flex gap-2">
                        <button @click="simulate" :disabled="store.running" :class="btnGhost"><i class="fas fa-flask"></i> Simular (sem enviar)</button>
                        <button @click="fireNow" :disabled="store.running" class="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg focus-ring disabled:opacity-60"><i class="fas fa-paper-plane"></i> Disparar agora</button>
                    </div>
                </div>
                <div v-if="lastRun" class="mt-3 text-sm">
                    <p class="text-ink-muted mb-2">Avaliadas {{ lastRun.evaluated }} combinações - {{ lastRun.fired }} lembrete(s) {{ lastRun.dryRun ? 'seriam enviados' : 'enviados' }} ({{ lastRun.today }}).</p>
                    <div v-if="lastRun.sent?.length" class="space-y-1 max-h-60 overflow-y-auto">
                        <div v-for="(s, i) in lastRun.sent" :key="i" class="flex items-center justify-between bg-surface-sunken rounded px-2 py-1">
                            <span class="text-ink truncate">{{ s.taskTitle }} <span class="text-ink-subtle">- {{ s.ruleName }}</span></span>
                            <span class="text-xs text-ink-subtle whitespace-nowrap ml-2">{{ s.recipients.users.length }} dest.</span>
                        </div>
                    </div>
                    <p v-else class="text-ink-subtle">Nenhum lembrete para hoje com a régua atual.</p>
                </div>
            </div>

            <!-- Régua -->
            <div class="flex items-center justify-between mb-3">
                <h2 class="font-semibold text-ink">Régua global ({{ store.rules.length }} regras)</h2>
                <button @click="addRule" :class="btnPrimary"><i class="fas fa-plus"></i> Adicionar regra</button>
            </div>

            <div class="space-y-4">
                <div v-for="r in store.rules" :key="r.id" class="surface-card p-4">
                    <RuleEditor :rule="r" @remove="delRule(r)" />
                    <div class="flex items-center gap-2 mt-3">
                        <button @click="saveRule(r)" :disabled="store.saving" :class="btnPrimary">Salvar</button>
                        <span class="text-xs text-ink-subtle ml-auto">Escopo: {{ r.scope }}</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
