// composables/useCan.js
//
// Permissão DENTRO da tela, do jeito padrão.
//
// Antes, cada tela delegada escrevia o seu próprio
// `const isAdmin = computed(() => auth.hasRole('admin'))` e espalhava
// `v-if="isAdmin"`. Três problemas: a regra ficava no componente (o backend
// tinha a dele, e as duas podiam divergir sem ninguém notar), a fonte de
// verdade era o authStore em vez das permissões confirmadas pelo servidor, e
// não dava para responder "o que esta pessoa pode fazer nesta tela".
//
// Agora a regra é declarada UMA vez, no backend (lib/screenCapabilities.js), e
// chega pronta no /permissions/me. Aqui é só consulta:
//
//   const can = useCan('/mural/admin');
//   ...
//   <Button v-if="can('remove')">Excluir</Button>
//   <div v-if="can('manage')"> ... </div>
//
// Sempre fail-closed: enquanto as permissões não carregam, can() é false.
// Esconder o botão é COSMÉTICO — o que vale é o requireCapability na rota da
// API, com a mesma linha da tabela. Nunca dependa só disto.

import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';

/**
 * @param {string} route caminho da tela (mesmo valor do navRegistry)
 * @returns {(action: string) => boolean}
 */
export function useCan(route) {
    const perm = usePermissionStore();
    return (action) => perm.can(route, action);
}

export default useCan;
