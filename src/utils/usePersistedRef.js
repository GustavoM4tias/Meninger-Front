// Composable: ref que sincroniza com localStorage automaticamente.
// Útil para preservar formulários quando o usuário fecha algo sem querer.
//
// Uso:
//   const email = usePersistedRef('login:email', '');
//   email.value = 'foo@bar';   // grava em localStorage
//   email.value = '';          // remove a chave
//
// Opções:
//   - serializer: { read, write } (padrão JSON)
//   - storage: 'local' | 'session' (padrão local)

import { ref, watch } from 'vue';

const defaultSerializer = {
  read: (raw) => { try { return JSON.parse(raw); } catch { return raw; } },
  write: (val) => JSON.stringify(val),
};

export function usePersistedRef(key, defaultValue, options = {}) {
  const serializer = options.serializer || defaultSerializer;
  const storage = options.storage === 'session' ? sessionStorage : localStorage;

  let initial = defaultValue;
  try {
    const raw = storage.getItem(key);
    if (raw !== null) initial = serializer.read(raw);
  } catch { /* noop */ }

  const r = ref(initial);

  watch(r, (val) => {
    try {
      const isEmpty = val == null || val === '' || (typeof val === 'object' && Object.keys(val || {}).length === 0);
      if (isEmpty) storage.removeItem(key);
      else         storage.setItem(key, serializer.write(val));
    } catch { /* noop */ }
  }, { deep: true });

  return r;
}

// Helper: limpa uma chave (útil após login bem-sucedido, por ex.)
export function clearPersisted(key, storage = 'local') {
  const s = storage === 'session' ? sessionStorage : localStorage;
  try { s.removeItem(key); } catch { /* noop */ }
}
