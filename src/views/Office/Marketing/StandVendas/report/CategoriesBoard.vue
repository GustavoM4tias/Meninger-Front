<script setup>
/**
 * Aba Categorias, no padrão do relatório: a régua (o que entra), a
 * classificação automática (como cada lançamento ganha natureza e fase) e as
 * categorias agrupadas pela fase que dão a cada lançamento.
 */
import { computed, onMounted } from 'vue';
import { FASE, faseLabel, escHtml, loadReportFonts } from './reportModel';
import SourceSettingsCard from '../components/SourceSettingsCard.vue';
import AutoRulesCard from '../components/AutoRulesCard.vue';
import SrTip from './SrTip.vue';
import './standReport.css';

const props = defineProps({
    categories: { type: Array, default: () => [] },
    canConfigure: { type: Boolean, default: false },
});
const emit = defineEmits(['edit', 'new']);
onMounted(loadReportFonts);

const ORDEM = ['construcao', 'esporadica', 'recorrencia'];
const grupos = computed(() => ORDEM.map((k) => ({
    k,
    label: faseLabel(k),
    color: FASE[k].color,
    text: FASE[k].text,
    cats: props.categories.filter((c) => c.kind === k).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
})).filter((g) => g.cats.length));
const totalContas = computed(() => props.categories.reduce((s, c) => s + (c.conta_codes || []).length, 0));

const tipCat = (c) => `<b>${escHtml(c.name)}</b><span class="t">${escHtml(c.description || 'Sem descrição')}. Fase: ${faseLabel(c.kind)}${c.expected_monthly ? '. Vence todo mês: falta dela vira pendência' : ''}.</span>`;
</script>

<template>
    <div class="sr sr-wrap">
        <header class="sr-head">
            <p class="eyebrow">Categorias de gasto</p>
            <h1 class="display">Como o Office lê o gasto de cada stand</h1>
            <p class="lede">Três decisões, de cima para baixo: o que conta como gasto de stand, como cada lançamento ganha natureza e fase sozinho, e quais contas do Sienge caem em cada categoria. Vale para todos os stands.</p>
        </header>

        <SourceSettingsCard :can-configure="canConfigure" />
        <AutoRulesCard :can-configure="canConfigure" />

        <section class="sr-sec">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">As categorias</p>
                    <h2 class="display">{{ categories.length }} categorias, {{ totalContas }} contas do Sienge</h2>
                    <p>Cada conta do Sienge pertence a uma categoria só, e a categoria dá a fase do lançamento. Clique numa categoria para mudar contas, fase ou "vence todo mês".</p>
                </div>
                <button v-if="canConfigure" type="button" class="sr-btn" data-tip="Cria uma categoria e escolhe as contas do Sienge que caem nela" @click="emit('new')">
                    <i class="fas fa-plus"></i>Nova categoria
                </button>
            </div>
            <div class="fases">
                <div v-for="g in grupos" :key="g.k" class="fase">
                    <div class="fh" :style="{ borderTopColor: g.color }" :data-tip="`<b>${g.label}</b><span class='t'>${g.text}</span>`">
                        <span class="eyebrow">{{ g.label }}</span>
                        <span class="n num">{{ g.cats.length }}</span>
                    </div>
                    <p class="ft">{{ g.text }}</p>
                    <ul>
                        <li v-for="(c, idx) in g.cats" :key="c.id" :style="{ animationDelay: idx * 40 + 'ms' }">
                            <button type="button" :class="{ off: c.is_active === false }" :disabled="!canConfigure" :data-tip="tipCat(c)" @click="canConfigure && emit('edit', c)">
                                <span class="ct">
                                    <i class="sw" :style="{ background: g.color }"></i>
                                    <b>{{ c.name }}</b>
                                    <span v-if="c.expected_monthly" class="sr-chip warn" data-tip="Conta que vence todo mês: mês fechado sem pagamento vira pendência no relatório">todo mês</span>
                                    <i v-if="canConfigure" class="fas fa-pen ed"></i>
                                </span>
                                <span v-if="c.description" class="cd">{{ c.description }}</span>
                                <span class="contas">
                                    <span v-for="code in c.conta_codes" :key="code" class="sr-chip mono" :data-tip="`Conta ${code} do plano financeiro do Sienge`">{{ code }}</span>
                                    <span v-if="!c.conta_codes?.length" class="cd">Sem conta: só recebe pelas regras por palavra ou à mão</span>
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
        <SrTip />
    </div>
</template>

<style scoped>
.fases { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; align-items: start; }
.fase { display: grid; gap: 10px; min-width: 0; }
.fh { display: flex; justify-content: space-between; align-items: baseline; border-top: 3px solid; padding-top: 10px; }
.fh .n { font-size: 20px; font-weight: 500; }
.ft { font-size: 13px; color: var(--sr-muted); }
.fase ul { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
.fase li { animation: sr-rise 0.35s ease both; }
.fase li button { width: 100%; display: grid; gap: 6px; text-align: left; padding: 12px 14px; border: 1px solid var(--sr-line); border-radius: 10px; background: var(--sr-paper); font: inherit; color: inherit; cursor: pointer; transition: border-color 0.2s, transform 0.2s; }
.fase li button:disabled { cursor: default; }
.fase li button:hover:not(:disabled) { border-color: var(--sr-muted); transform: translateY(-1px); }
.fase li button.off { opacity: 0.5; }
.ct { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ct b { font-size: 14.5px; }
.ct .ed { margin-left: auto; font-size: 11px; color: var(--sr-muted); opacity: 0; transition: opacity 0.2s; }
.fase li button:hover .ed { opacity: 1; }
.cd { font-size: 12.5px; color: var(--sr-muted); }
.contas { display: flex; flex-wrap: wrap; gap: 4px; }
@media (max-width: 960px) { .fases { grid-template-columns: 1fr; } }
</style>
