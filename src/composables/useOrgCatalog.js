// composables/useOrgCatalog.js
//
// Catálogo de DEPARTAMENTOS e CARGOS + a cascata entre os dois.
//
// Todo cargo pertence a um departamento (positions.department_id). O padrão da
// casa, a partir de 2026-08-27, é: escolheu o departamento, a lista de cargos
// mostra SÓ os daquele departamento. Sem isso a listagem vira um monte de 30+
// cargos de áreas que não têm nada a ver com a pessoa que está sendo cadastrada.
//
// Regras da cascata (valem em qualquer tela):
//   • Departamento vazio = "Todos": a lista traz todos os cargos, com o nome do
//     departamento ao lado para não confundir cargos homônimos.
//   • Ao ABRIR um cadastro que já tem cargo, o departamento é DEDUZIDO do cargo
//     (nunca zera a escolha de quem já está gravado).
//   • Ao TROCAR o departamento, o cargo só é limpo se ele não pertencer mais ao
//     departamento escolhido — trocar para "Todos" não pode apagar o que já
//     estava selecionado.
//
// Duas fontes, mesma cascata:
//   'admin'      → /admin/departments + /admin/positions (telas admin)
//   'organogram' → /organogram/meta (tela do organograma, que é alçada e não
//                  admin: os endpoints /admin/* respondem 403 para quem não é)

import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';

const asArray = (json) => (Array.isArray(json) ? json : (json?.data || json?.results || []));

function authHeaders() {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };
}

async function getJson(path) {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Falha em ${path} (${res.status})`);
    return res.json();
}

/**
 * @param {object}  [opts]
 * @param {'admin'|'organogram'} [opts.source='admin'] de onde ler o catálogo
 * @param {boolean} [opts.onlyInternal=false] só cargos internos (cadastro de colaborador)
 */
export function useOrgCatalog(opts = {}) {
    const source = opts.source || 'admin';
    const onlyInternal = opts.onlyInternal === true;

    const departments = ref([]);   // [{ id, name, code }]
    const positions = ref([]);     // [{ id, name, code, description, department_id }]
    const loading = ref(false);
    const error = ref(null);
    const loaded = ref(false);

    async function load(force = false) {
        if (loading.value || (loaded.value && !force)) return;
        loading.value = true;
        error.value = null;
        try {
            if (source === 'organogram') {
                const json = await getJson('/organogram/meta');
                const data = json?.data || json || {};
                departments.value = asArray(data.departments);
                positions.value = asArray(data.positions);
            } else {
                const [deps, pos] = await Promise.all([
                    getJson('/admin/departments').catch(() => []),
                    getJson('/admin/positions').catch(() => []),
                ]);
                departments.value = asArray(deps).filter(d => d?.active !== false);
                positions.value = asArray(pos)
                    .filter(p => p?.active !== false)
                    // O `department` vem incluído no /admin/positions; normaliza para
                    // department_id, que é o que a cascata usa.
                    .map(p => ({ ...p, department_id: p.department_id ?? p.department?.id ?? null }));
            }
            if (onlyInternal) {
                positions.value = positions.value.filter(p => p?.is_internal !== false);
            }
            loaded.value = true;
        } catch (e) {
            error.value = e?.message || String(e);
            console.error('[useOrgCatalog]', e);
        } finally {
            loading.value = false;
        }
    }

    const departmentById = computed(() => new Map(departments.value.map(d => [Number(d.id), d])));
    const positionByName = computed(() => new Map(positions.value.map(p => [p.name, p])));

    /** Opções de departamento para <Select>. `allLabel` vazio = sem a linha "todos". */
    function departmentOptions(allLabel = 'Todos os departamentos') {
        const opts = departments.value
            .map(d => ({ value: String(d.id), label: d.name }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
        return allLabel ? [{ value: '', label: allLabel }, ...opts] : opts;
    }

    /** Cargos do departamento (vazio = todos, com o departamento no rótulo). */
    function positionsOfDepartment(departmentId) {
        const id = departmentId === '' || departmentId == null ? null : Number(departmentId);
        const list = id == null
            ? positions.value
            : positions.value.filter(p => Number(p.department_id) === id);
        return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }

    /**
     * Opções de cargo para <Select>, já filtradas pelo departamento.
     * @param {string|number|null} departmentId
     * @param {object} [o]
     * @param {'name'|'id'|'code'} [o.valueKey='name'] o que vai no v-model
     * @param {string} [o.allLabel] linha inicial ("Todos" / placeholder)
     */
    function positionOptions(departmentId, o = {}) {
        const valueKey = o.valueKey || 'name';
        const semDepto = departmentId === '' || departmentId == null;
        const opts = positionsOfDepartment(departmentId).map(p => ({
            value: String(p[valueKey]),
            // Sem departamento escolhido, o nome sozinho não diz de que área é.
            label: semDepto && departmentById.value.get(Number(p.department_id))
                ? `${p.name} · ${departmentById.value.get(Number(p.department_id)).name}`
                : p.name,
        }));
        return o.allLabel ? [{ value: '', label: o.allLabel }, ...opts] : opts;
    }

    /** Departamento de um cargo, pelo nome (string legada) ou pelo id. */
    function departmentIdOfPosition(position) {
        if (position == null || position === '') return '';
        const p = typeof position === 'number' || /^\d+$/.test(String(position))
            ? positions.value.find(x => Number(x.id) === Number(position))
            : positionByName.value.get(String(position));
        return p?.department_id ? String(p.department_id) : '';
    }

    /**
     * Cargo continua válido no departamento escolhido? Use para decidir se
     * limpa o campo ao trocar de departamento — trocar para "Todos" nunca limpa.
     */
    function positionFitsDepartment(position, departmentId) {
        if (!position) return true;
        if (departmentId === '' || departmentId == null) return true;
        const dep = departmentIdOfPosition(position);
        return dep === String(departmentId);
    }

    /** Descrição do cargo (usada nos cards de ajuda das telas). */
    const descriptionByPositionName = computed(() =>
        Object.fromEntries(positions.value.map(p => [p.name, p.description || '']))
    );

    return {
        departments, positions, loading, error, loaded, load,
        departmentOptions, positionOptions, positionsOfDepartment,
        departmentIdOfPosition, positionFitsDepartment,
        departmentById, descriptionByPositionName,
    };
}

export default useOrgCatalog;
