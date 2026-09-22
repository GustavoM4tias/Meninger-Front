// composables/useEnterpriseCatalog.js
//
// CATÁLOGO DE EMPREENDIMENTOS DO CV: O ID É A CHAVE, O NOME É O RÓTULO DE HOJE.
//
// O CV renomeia empreendimento ("PARK ALAMEDA" virou "PARK ALAMEDA - SARANDI")
// e toda linha gravada antes guarda o nome da época. Tela que montava o filtro
// a partir dos nomes das linhas mostrava os dois como se fossem dois
// empreendimentos, e quem filtrava por nome perdia metade do histórico.
//
// Regra da casa (22/09/2026):
//   • filtro, agrupamento, URL e estado guardam o `idempreendimento` do CV;
//   • o nome exibido vem SEMPRE daqui (o mais recente), nunca da linha;
//   • listas de empreendimento saem ordenadas por id.
//
// Uma carga por sessão (cache de módulo, compartilhado por todas as telas),
// de GET /org/enterprises/catalog → [{ id, nome, cidade, uf, ativo }].
//
// Uso típico numa tela com facetas `[{ id, nome }]` vindas da API:
//
//   const catalogo = useEnterpriseCatalog();
//   catalogo.load();
//   const opcoes = computed(() => catalogo.opcoes(store.facets.empreendimentos));
//   <MultiSelector :options="opcoes" v-model="filtro.empreendimento" />  // ids
//   {{ catalogo.nome(row.idempreendimento_cv, row.empreendimento) }}     // rótulo

import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';

const itens = ref([]);          // [{ id, nome, cidade, uf, ativo, org_id, erp_id }]
const loaded = ref(false);
const loading = ref(false);
const error = ref(null);
let inflight = null;

const porId = computed(() => {
    const m = new Map();
    for (const e of itens.value) m.set(Number(e.id), e);
    return m;
});

// nome normalizado (sem acento, caixa alta, espaços únicos) → id
const semAcento = (v) => String(v ?? '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
const porNome = computed(() => {
    const m = new Map();
    for (const e of itens.value) {
        const k = semAcento(e.nome);
        if (k && !m.has(k)) m.set(k, Number(e.id));
    }
    return m;
});

async function load(force = false) {
    if (loaded.value && !force) return itens.value;
    if (inflight) return inflight;
    loading.value = true;
    error.value = null;
    inflight = (async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/org/enterprises/catalog`, {
                headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || `Falha ao carregar o catálogo (${res.status})`);
            const arr = Array.isArray(json?.items) ? json.items : [];
            itens.value = arr
                .map(e => ({ ...e, id: Number(e.id) }))
                .filter(e => Number.isFinite(e.id))
                .sort((a, b) => a.id - b.id);
            loaded.value = true;
            return itens.value;
        } catch (e) {
            error.value = e?.message || String(e);
            throw e;
        } finally {
            loading.value = false;
            inflight = null;
        }
    })();
    return inflight;
}

/** Nome ATUAL do empreendimento. `fallback` é o nome gravado na linha (só se o id não resolver). */
function nome(id, fallback = null) {
    const n = Number(id);
    const hit = Number.isFinite(n) ? porId.value.get(n) : null;
    return hit?.nome || fallback || (Number.isFinite(n) && n > 0 ? `#${n}` : '') || '';
}

/** Cidade atual (ou null). */
function cidade(id) {
    const n = Number(id);
    return (Number.isFinite(n) ? porId.value.get(n)?.cidade : null) || null;
}

/** id a partir de um nome (atual). Serve para link antigo `?empreendimento=NOME`. */
function idPorNome(nomeBruto) {
    const k = semAcento(nomeBruto);
    return k ? (porNome.value.get(k) ?? null) : null;
}

/**
 * Opções `{ value: id, label: nome atual }` para o MultiSelector, ordenadas por id.
 * Aceita facetas `[{ id, nome }]` (nome = rótulo de fallback), lista de ids,
 * ou nada (catálogo inteiro). Faceta sem id (linha antiga que o backfill não
 * casou) vira opção com o próprio nome como valor - o back entende os dois.
 */
function opcoes(fonte = null) {
    if (fonte == null) {
        return itens.value.map(e => ({ value: e.id, label: e.nome || `#${e.id}` }));
    }
    const comId = [];
    const semId = [];
    const vistos = new Set();
    for (const f of Array.isArray(fonte) ? fonte : []) {
        const isObj = f !== null && typeof f === 'object';
        const id = Number(isObj ? f.id : f);
        if (Number.isFinite(id) && id > 0) {
            if (vistos.has(id)) continue;
            vistos.add(id);
            comId.push({ value: id, label: nome(id, isObj ? f.nome : null) });
        } else if (isObj && f.nome) {
            const n = String(f.nome).trim();
            if (n && !vistos.has(`n:${n}`)) { vistos.add(`n:${n}`); semId.push({ value: n, label: n }); }
        }
    }
    comId.sort((a, b) => a.value - b.value);
    semId.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    return [...comId, ...semId];
}

/**
 * Normaliza um filtro vindo da URL ou de estado antigo: ids ficam como número,
 * nomes conhecidos viram id, e nome desconhecido fica como texto (o back ainda
 * aceita nome para linha sem id).
 */
function normalizarFiltro(valores) {
    const arr = Array.isArray(valores) ? valores : String(valores ?? '').split(',');
    const out = [];
    for (const v of arr.map(x => String(x ?? '').trim()).filter(Boolean)) {
        if (/^\d+$/.test(v)) { out.push(Number(v)); continue; }
        const id = idPorNome(v);
        out.push(id ?? v);
    }
    return [...new Set(out)];
}

export function useEnterpriseCatalog() {
    return { itens, loaded, loading, error, load, nome, cidade, idPorNome, opcoes, normalizarFiltro };
}

export default useEnterpriseCatalog;
