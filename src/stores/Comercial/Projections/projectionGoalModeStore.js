// stores/Comercial/Projections/projectionGoalModeStore.js
// Persists goal-mode settings (units vs VGV) per enterprise in localStorage.
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'proj_goal_mode_v1'

export const useProjectionGoalModeStore = defineStore('projectionGoalMode', () => {
    const globalMode = ref('units')          // 'units' | 'vgv'
    const enterpriseOverrides = ref({})      // { [enterprise_id_str]: 'units' | 'vgv' }
    let _loaded = false

    function load() {
        if (_loaded) return
        _loaded = true
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            if (parsed.globalMode === 'vgv' || parsed.globalMode === 'units') {
                globalMode.value = parsed.globalMode
            }
            if (parsed.enterpriseOverrides && typeof parsed.enterpriseOverrides === 'object') {
                enterpriseOverrides.value = { ...parsed.enterpriseOverrides }
            }
        } catch { /* ignore */ }
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                globalMode: globalMode.value,
                enterpriseOverrides: enterpriseOverrides.value,
            }))
        } catch { /* ignore */ }
    }

    function setGlobalMode(mode) {
        globalMode.value = mode === 'vgv' ? 'vgv' : 'units'
        _save()
    }

    /** Pass mode = null to remove the enterprise override and fall back to global. */
    function setEnterpriseMode(enterpriseId, mode) {
        if (mode === null || mode === undefined) {
            const next = { ...enterpriseOverrides.value }
            delete next[String(enterpriseId)]
            enterpriseOverrides.value = next
        } else {
            enterpriseOverrides.value = {
                ...enterpriseOverrides.value,
                [String(enterpriseId)]: mode === 'vgv' ? 'vgv' : 'units',
            }
        }
        _save()
    }

    /** Returns the effective mode for the given enterprise_id (override or global). */
    function modeForEnterprise(enterpriseId) {
        const key = String(enterpriseId ?? '')
        return enterpriseOverrides.value[key] ?? globalMode.value
    }

    return {
        globalMode,
        enterpriseOverrides,
        load,
        setGlobalMode,
        setEnterpriseMode,
        modeForEnterprise,
    }
})
