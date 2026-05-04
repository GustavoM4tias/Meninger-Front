// Composable: máscara de CEP + lookup automático no ViaCEP/correios.

import { computed, ref, watch } from 'vue';
import { getAddress } from '@/utils/Config/apiExternalBuilding';

export function useCepLookup(addressRef) {
  const loading = ref(false);

  const masked = computed({
    get() {
      const raw = (addressRef.value.zip_code || '').replace(/\D/g, '').slice(0, 8);
      return raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    },
    set(val) {
      addressRef.value.zip_code = (val || '').replace(/\D/g, '').slice(0, 8);
    },
  });

  watch(() => addressRef.value.zip_code, async (cep) => {
    const clean = (cep || '').replace(/\D/g, '');
    if (clean.length !== 8) return;

    loading.value = true;
    try {
      const data = await getAddress(clean);
      Object.assign(addressRef.value, {
        street:       data.logradouro || addressRef.value.street       || '',
        neighborhood: data.bairro     || addressRef.value.neighborhood || '',
        city:         data.localidade || addressRef.value.city         || '',
        state:        data.uf         || addressRef.value.state        || '',
      });
    } catch { /* silent */ }
    finally { loading.value = false; }
  });

  return { masked, loading };
}
