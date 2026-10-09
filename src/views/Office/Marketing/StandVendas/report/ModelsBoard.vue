<script setup>
/**
 * Aba Modelos, no padrão do relatório: as faixas de valor dos modelos num eixo
 * comum (com os stands de cada modelo marcados nelas) e cada modelo numa linha
 * larga, com faixa, metragem, descrição, itens e os stands que o usam.
 */
import { computed, onMounted } from 'vue';
import { fmtBRL } from '../standFormat';
import { fmtValueRange, fmtAreaRange } from '../standFormat';
import { escHtml, loadReportFonts } from './reportModel';
import SrTip from './SrTip.vue';
import './standReport.css';

const props = defineProps({
    models: { type: Array, default: () => [] },
    stands: { type: Array, default: () => [] },
    canConfigure: { type: Boolean, default: false },
});
const emit = defineEmits(['edit', 'new']);
onMounted(loadReportFonts);

const k = (v) => `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
const nomeCurto = (n) => { const i = String(n).indexOf(' - '); return i > 0 ? String(n).slice(i + 3) : n; };

const rows = computed(() => props.models.map((m) => {
    const min = Number(m.avg_value_min) || 0;
    const max = Number(m.avg_value_max) || 0;
    const stands = props.stands.filter((s) => Number(s.model_id) === Number(m.id))
        .map((s) => ({ id: s.id, name: nomeCurto(s.name), full: s.name, v: Number(s.construction_value) || 0 }));
    return { m, min, max, open: !!min && !max, stands };
}));
const hi = computed(() => Math.max(1, ...rows.value.map((r) => Math.max(r.max || r.min * 1.35, ...r.stands.map((s) => s.v)))) * 1.06);
const pct = (v) => `${Math.max(0, Math.min(100, (v / hi.value) * 100)).toFixed(2)}%`;
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, t: f ? k(hi.value * f) : 'R$ 0' })));
const semModelo = computed(() => props.stands.filter((s) => !s.model_id).map((s) => nomeCurto(s.name)));

function situacao(r, v) {
    if (!v) return 'sem implantação apurada';
    if (r.max && v > r.max) return 'acima da faixa';
    if (v < r.min) return 'abaixo da faixa';
    return 'dentro da faixa';
}
const tipFaixa = (r) => `<b>${escHtml(r.m.name)}</b><span class="t">Montar custa ${escHtml(fmtValueRange(r.m) || 'a definir')}${fmtAreaRange(r.m) ? ` · ${escHtml(fmtAreaRange(r.m))}` : ''}</span>`;
const tipStand = (r, s) => `<b>${escHtml(s.full)}</b><span class="t">Implantação ${fmtBRL(s.v)} · ${situacao(r, s.v)}</span>`;
</script>

<template>
    <div class="sr sr-wrap">
        <header class="sr-head">
            <div class="sr-head-row">
                <div class="sr-head">
                    <p class="eyebrow">Modelos de stand</p>
                    <h1 class="display">{{ models.length }} modelos, da sala comercial ao executivo com decorado</h1>
                </div>
                <button v-if="canConfigure" type="button" class="sr-btn" data-tip="Cria um modelo com faixa de valor, metragem e a lista de itens que ele tem"
                    @click="emit('new')"><i class="fas fa-plus"></i>Novo modelo</button>
            </div>
            <p class="lede">Cada modelo diz quanto um stand daquele porte deve custar para montar e o que ele tem. O stand real é comparado com a faixa do modelo dele no relatório.</p>
        </header>

        <section class="sr-sec">
            <div class="sr-head">
                <p class="eyebrow">Faixas de valor</p>
                <h2 class="display">Quanto cada modelo prevê para montar</h2>
                <p>A faixa é o valor previsto; os pontos são os stands daquele modelo, pelo que custou a implantação. Passe o mouse para ver cada um.</p>
            </div>
            <div class="sr-box">
                <div class="ruler">
                    <div v-for="r in rows" :key="r.m.id" class="rl">
                        <button type="button" class="rl-name" :disabled="!canConfigure" :data-tip="tipFaixa(r)" @click="canConfigure && emit('edit', r.m)">
                            <b>{{ r.m.name }}</b><span class="num">{{ fmtValueRange(r.m) || 'a definir' }}</span>
                        </button>
                        <div class="rl-track">
                            <span class="axis"></span>
                            <span v-if="r.min || r.max" class="band" :class="{ open: r.open }" :data-tip="tipFaixa(r)"
                                :style="{ left: pct(r.min), width: `calc(${pct(r.max || r.min * 1.35)} - ${pct(r.min)})` }"></span>
                            <span v-for="(s, i) in r.stands" :key="s.id" class="pin" :class="{ over: r.max && s.v > r.max, none: !s.v }"
                                :style="{ left: pct(s.v), animationDelay: 300 + i * 80 + 'ms' }" :data-tip="tipStand(r, s)" tabindex="0"
                                :aria-label="`${s.full}: ${fmtBRL(s.v)}`"></span>
                        </div>
                    </div>
                    <div class="rl ticks">
                        <span></span>
                        <div class="rl-track"><span v-for="t in ticks" :key="t.f" class="tick" :style="{ left: (t.f * 100) + '%' }">{{ t.t }}</span></div>
                    </div>
                </div>
                <div class="legend">
                    <span><i class="sw band-sw"></i>Faixa prevista do modelo</span>
                    <span><i class="sw dot-sw"></i>Stand dentro ou abaixo da faixa</span>
                    <span><i class="sw dot-sw over"></i>Stand acima da faixa</span>
                </div>
            </div>
        </section>

        <section class="sr-sec">
            <div class="sr-head">
                <p class="eyebrow">Os modelos</p>
                <h2 class="display">O que cada um tem</h2>
                <p v-if="semModelo.length">Sem modelo ainda: {{ semModelo.join(', ') }}. Dá para atribuir no Editar de cada stand.</p>
            </div>
            <div class="list">
                <article v-for="(r, idx) in rows" :key="r.m.id" class="model" :style="{ animationDelay: idx * 60 + 'ms' }">
                    <div class="mh">
                        <div class="mt">
                            <span class="eyebrow">{{ r.stands.length }} stand{{ r.stands.length === 1 ? '' : 's' }} neste modelo</span>
                            <h3 class="display">{{ r.m.name }}</h3>
                        </div>
                        <button v-if="canConfigure" type="button" class="sr-btn ghost" :data-tip="`Edita faixa, metragem, descrição e itens do ${escHtml(r.m.name)}`"
                            @click="emit('edit', r.m)"><i class="fas fa-pen"></i>Editar</button>
                    </div>
                    <div class="mnums">
                        <span data-tip="Quanto um stand deste modelo deve custar para montar (implantação)"><span class="k">Valor previsto</span><span class="v num">{{ fmtValueRange(r.m) || 'a definir' }}</span></span>
                        <span data-tip="Área do stand prevista neste modelo"><span class="k">Metragem</span><span class="v num">{{ fmtAreaRange(r.m) || 'a definir' }}</span></span>
                        <span data-tip="Stands cadastrados com este modelo"><span class="k">Stands</span><span class="v num">{{ r.stands.length }}</span></span>
                    </div>
                    <p v-if="r.m.description" class="desc">{{ r.m.description }}</p>
                    <ul v-if="r.m.items?.length" class="itens">
                        <li v-for="it in r.m.items" :key="it">{{ it }}</li>
                    </ul>
                    <p v-else class="desc muted">Sem itens cadastrados.</p>
                    <div v-if="r.stands.length" class="usam">
                        <span class="k">Usam este modelo</span>
                        <span v-for="s in r.stands" :key="s.id" class="sr-chip" :class="{ warn: r.max && s.v > r.max }"
                            :data-tip="tipStand(r, s)">{{ s.name }} · <b class="num">{{ k(s.v) }}</b></span>
                    </div>
                </article>
            </div>
            <p v-if="!rows.length" class="sr-empty">Nenhum modelo cadastrado. Crie o primeiro para comparar os stands com ele.</p>
        </section>
        <SrTip />
    </div>
</template>

<style scoped>
.muted { color: var(--sr-muted); }
.ruler { display: grid; gap: 6px; }
.rl { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 16px; align-items: center; }
.rl-name { display: grid; gap: 0; text-align: left; border: 0; background: none; padding: 6px 8px; margin-left: -8px; border-radius: 8px; font: inherit; color: inherit; cursor: pointer; }
.rl-name:disabled { cursor: default; }
.rl-name:hover:not(:disabled) { background: var(--sr-hover); }
.rl-name b { font-weight: 600; font-size: 14px; }
.rl-name span { font-size: 12px; color: var(--sr-muted); }
.rl-track { position: relative; height: 30px; }
.rl-track .axis { position: absolute; left: 0; right: 0; top: 14px; height: 2px; background: var(--sr-line); }
.rl-track .band { position: absolute; top: 8px; height: 14px; border-radius: 4px; background: var(--sr-c3); opacity: 0.6; transform-origin: left; animation: sr-widen 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.rl-track .band.open { background: linear-gradient(90deg, var(--sr-c3), transparent); }
.rl-track .pin { position: absolute; top: 7px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--sr-paper); background: var(--sr-c1); box-shadow: 0 0 0 1px var(--sr-c1); transform: translateX(-8px); cursor: default; animation: sr-fade 0.5s ease both; outline: none; }
.rl-track .pin:focus-visible { box-shadow: 0 0 0 3px var(--sr-accent); }
.rl-track .pin.over { background: var(--sr-e1); box-shadow: 0 0 0 1px var(--sr-e1); }
.rl-track .pin.none { background: var(--sr-n1); box-shadow: 0 0 0 1px var(--sr-n1); }
.rl.ticks .rl-track { height: 18px; }
.tick { position: absolute; transform: translateX(-50%); font-size: 11.5px; color: var(--sr-muted); white-space: nowrap; }
.tick:first-child { transform: none; }
.tick:last-child { transform: translateX(-100%); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; color: var(--sr-muted); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.band-sw { width: 16px; background: var(--sr-c3); opacity: 0.6; }
.dot-sw { width: 10px; height: 10px; border-radius: 50%; background: var(--sr-c1); }
.dot-sw.over { background: var(--sr-e1); }

.list { display: grid; border-top: 1px solid var(--sr-line); }
.model { display: grid; gap: 14px; padding: 22px 0; border-bottom: 1px solid var(--sr-line); animation: sr-rise 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.mh { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.mt { display: grid; gap: 2px; }
.mt h3 { margin: 0; font-size: 24px; font-weight: 700; line-height: 1.1; }
.mnums { display: grid; grid-template-columns: repeat(3, minmax(0, 220px)); gap: 16px; border-top: 2px solid var(--sr-ink); padding-top: 12px; max-width: 700px; }
.mnums > span { display: grid; gap: 2px; }
.mnums .k, .usam .k { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sr-muted); font-weight: 600; }
.mnums .v { font-size: 17px; font-weight: 500; }
.desc { color: var(--sr-muted); max-width: 80ch; }
.itens { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 24px; padding: 0; margin: 0; list-style: none; }
.itens li { padding-left: 20px; position: relative; font-size: 14px; }
.itens li::before { content: ""; position: absolute; left: 2px; top: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--sr-ok); }
.usam { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.usam .k { margin-right: 4px; }
.usam b { color: var(--sr-ink); font-weight: 500; }
@media (max-width: 760px) {
    .rl { grid-template-columns: 1fr; gap: 0; }
    .rl.ticks > span { display: none; }
    .itens { grid-template-columns: 1fr; }
    .mnums { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
