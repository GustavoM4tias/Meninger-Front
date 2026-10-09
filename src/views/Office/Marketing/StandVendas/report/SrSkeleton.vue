<script setup>
/**
 * Carregamento das telas do Stand de Vendas, no desenho do relatório: o
 * esqueleto tem a forma da tela que vai chegar (capa, faixa de números,
 * gráfico, linhas), para nada pular de lugar quando o dado aparece.
 *
 *   variant: overview | report | models | categories | audit | rows
 */
import './standReport.css';

defineProps({
    variant: { type: String, default: 'rows' },
    rows: { type: Number, default: 6 },
    label: { type: String, default: 'Carregando os dados do Sienge…' },
});
</script>

<template>
    <div class="sr sk" :class="variant === 'rows' ? 'sk-inline' : 'sk-page'" role="status" aria-live="polite" :aria-label="label">
        <!-- Cabeçalho comum: sobrancelha, título em duas linhas e linha de apoio -->
        <template v-if="variant !== 'rows'">
            <div v-if="variant === 'report'" class="cover">
                <div class="col">
                    <i class="b w30 h12"></i>
                    <i class="b w80 h40"></i>
                    <i class="b w55 h40"></i>
                    <i class="b w70 h14"></i>
                    <i class="b w60 h14"></i>
                    <div class="chips"><i class="b pill"></i><i class="b pill w"></i></div>
                </div>
                <i class="b photo"></i>
            </div>
            <div v-else class="col head">
                <i class="b w30 h12"></i>
                <i class="b w55 h44"></i>
                <i class="b w40 h44"></i>
                <i class="b w70 h14"></i>
            </div>

            <div v-if="variant !== 'models' && variant !== 'categories'" class="kpis" :style="{ '--n': variant === 'audit' ? 3 : 4 }">
                <div v-for="n in (variant === 'audit' ? 3 : 4)" :key="n" class="kpi">
                    <i class="b w40 h11"></i><i class="b w70 h28"></i><i class="b w55 h12"></i>
                </div>
            </div>
        </template>

        <!-- Tela inicial: ranking e linhas com foto -->
        <template v-if="variant === 'overview'">
            <div class="box">
                <div v-for="n in 5" :key="n" class="rank"><i class="b h14 w100"></i><i class="b h14" :style="{ width: (92 - n * 14) + '%' }"></i><i class="b h14 w100"></i></div>
            </div>
            <div class="list">
                <div v-for="n in 3" :key="n" class="stand">
                    <i class="b thumb"></i>
                    <div class="col"><i class="b w30 h11"></i><i class="b w60 h20"></i><i class="b w80 h14"></i><i class="b w100 h6"></i></div>
                    <i class="b spark"></i>
                </div>
            </div>
        </template>

        <!-- Relatório: gráfico de barras e dois painéis -->
        <template v-else-if="variant === 'report'">
            <div class="box chart">
                <i v-for="n in 6" :key="n" class="b bar" :style="{ height: [38, 92, 22, 14, 18, 8][n - 1] + '%' }"></i>
            </div>
            <div class="two"><i class="b panel"></i><i class="b panel"></i></div>
        </template>

        <!-- Modelos: régua de faixas -->
        <template v-else-if="variant === 'models'">
            <div class="box">
                <div v-for="n in 4" :key="n" class="rank"><i class="b h14 w100"></i><i class="b h12" :style="{ width: 22 + n * 8 + '%', marginLeft: n * 14 + '%' }"></i><span></span></div>
            </div>
        </template>

        <!-- Categorias: blocos -->
        <template v-else-if="variant === 'categories'">
            <i class="b panel low"></i>
            <div class="three"><i v-for="n in 3" :key="n" class="b panel"></i></div>
        </template>

        <!-- Linhas de tabela (conferência e listas) -->
        <div v-if="variant === 'audit' || variant === 'rows'" class="box rows">
            <div v-for="n in rows" :key="n" class="row" :style="{ '--d': n }">
                <i class="b h12 w100"></i><i class="b h12 w100"></i><i class="b h12 w100"></i><i class="b h12 w60 r"></i>
            </div>
        </div>

        <p class="msg"><span class="dot"></span>{{ label }}</p>
    </div>
</template>

<style scoped>
.sk { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; color: var(--sr-muted); }
.sk-page { max-width: 1120px; margin: 0 auto; padding-block: 8px 48px; }
.sk-inline { gap: 12px; }
.col { display: grid; gap: 10px; min-width: 0; }
.head { gap: 12px; }
.b {
    display: block; border-radius: 6px;
    background: linear-gradient(90deg, var(--sr-line) 0%, var(--sr-sunken) 40%, var(--sr-line) 80%);
    background-size: 220% 100%;
    animation: sk-shine 1.4s ease-in-out infinite;
}
@keyframes sk-shine { from { background-position: 120% 0; } to { background-position: -120% 0; } }
.w30 { width: 30%; } .w40 { width: 40%; } .w55 { width: 55%; } .w60 { width: 60%; } .w70 { width: 70%; } .w80 { width: 80%; } .w100 { width: 100%; }
.h6 { height: 6px; } .h11 { height: 11px; } .h12 { height: 12px; } .h14 { height: 14px; } .h20 { height: 20px; } .h28 { height: 28px; } .h40 { height: 40px; } .h44 { height: 44px; }
.cover { display: grid; grid-template-columns: 1.05fr 1fr; gap: 28px; align-items: end; }
.photo { aspect-ratio: 16 / 10; width: 100%; border-radius: 8px; }
.chips { display: flex; gap: 6px; }
.pill { width: 90px; height: 24px; border-radius: 999px; }
.pill.w { width: 180px; }
.kpis { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); border-top: 2px solid var(--sr-line); border-bottom: 1px solid var(--sr-line); }
.kpi { display: grid; gap: 8px; padding: 16px 16px 18px; }
.kpi:first-child { padding-left: 0; }
.kpi + .kpi { border-left: 1px solid var(--sr-line); }
.box { border: 1px solid var(--sr-line); border-radius: 10px; padding: 20px; display: grid; gap: 14px; background: var(--sr-paper); }
.rank { display: grid; grid-template-columns: 180px minmax(0, 1fr) 90px; gap: 14px; align-items: center; }
.list { display: grid; gap: 0; border-top: 1px solid var(--sr-line); }
.stand { display: grid; grid-template-columns: 220px minmax(0, 1fr) 160px; gap: 24px; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--sr-line); }
.thumb { aspect-ratio: 16 / 10; width: 100%; border-radius: 8px; }
.spark { height: 44px; width: 100%; }
.chart { height: 260px; display: flex; align-items: flex-end; gap: 6%; padding: 24px 40px; }
.chart .bar { flex: 1; border-radius: 4px 4px 0 0; }
.two { display: grid; grid-template-columns: 1fr 1.35fr; gap: 16px; }
.three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.panel { height: 220px; border-radius: 10px; }
.panel.low { height: 140px; }
.rows { gap: 0; padding: 6px 16px; }
.row { display: grid; grid-template-columns: 110px 1.4fr 1fr 110px; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--sr-line); }
.row:last-child { border-bottom: 0; }
.row .b { animation-delay: calc(var(--d) * 80ms); }
.row .r { justify-self: end; }
.msg { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; margin: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sr-accent); animation: sk-pulse 1s ease-in-out infinite alternate; }
@keyframes sk-pulse { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
@media (max-width: 760px) {
    .cover, .two, .three { grid-template-columns: 1fr; }
    .cover .photo { order: -1; }
    .kpis { grid-template-columns: 1fr 1fr; }
    .kpi:nth-child(3) { padding-left: 0; border-left: 0; }
    .kpi:nth-child(n+3) { border-top: 1px solid var(--sr-line); }
    .stand { grid-template-columns: 1fr; gap: 12px; }
    .rank { grid-template-columns: 1fr 70px; }
    .rank > :nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
    .row { grid-template-columns: 1fr 90px; }
    .row > :nth-child(2), .row > :nth-child(3) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
    .b, .dot { animation: none !important; }
}
</style>
