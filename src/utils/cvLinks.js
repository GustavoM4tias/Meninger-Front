// utils/cvLinks.js
//
// Links para as listagens do painel do CV. Existem porque o módulo de
// correspondentes não fecha só pela API: o GET de empresas está fora do ar e
// não há update nem delete, então corrigir cadastro e descobrir o `idempresa`
// passam obrigatoriamente pela tela do CV. Melhor levar o usuário direto para
// a listagem já filtrada do que mandar ele procurar.

const GESTOR = 'https://menin.cvcrm.com.br/gestor/cadastros';

const qs = (pares) =>
    Object.entries(pares)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
        .join('&');

/** Listagem de usuários correspondentes, opcionalmente filtrada por nome. */
export function cvUsuariosUrl(nome = '') {
    return `${GESTOR}/correspondentesusuarios?${qs({
        'q[1|u.idusuario]': '',
        'q[2|u.nome]': nome,
        'q[2|e.nome]': '',
        'q[ev|ev.verificado]': '',
        'q[1|u.gerente]': '',
        'q[1|u.ativo_login]': '',
        bl: 'listagem',
    })}`;
}

/**
 * Listagem de empresas correspondentes, opcionalmente filtrada por nome.
 * O caminho tem um typo do próprio CV ("correpondentes", sem o segundo "s") -
 * está correto assim, não normalizar.
 */
export function cvEmpresasUrl(nome = '') {
    return `${GESTOR}/correpondentesempresas?${qs({
        'q[1|c.idempresa]': '',
        'q[2|c.nome]': nome,
        'q[1|r.nome]': '',
        'q[2|c.telefone]': '',
        'q[2|c.gerente_nome]': '',
        'q[2|c.gerente_telefone]': '',
        'q[1|c.ativo_painel]': '',
    })}`;
}

export default { cvUsuariosUrl, cvEmpresasUrl };
