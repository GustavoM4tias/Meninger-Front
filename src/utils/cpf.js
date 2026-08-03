// utils/cpf.js
//
// Conferência de CPF no cliente. Existe para o cadastro de correspondente
// avisar na hora, antes de mandar ao CV: lá não há edição nem exclusão por
// integração, então CPF errado só se conserta excluindo na tela do CV e
// cadastrando de novo. O servidor confere de novo - isto aqui é conveniência,
// não a barreira.

export const soDigitosCpf = (valor) => String(valor || '').replace(/\D/g, '');

/** Valida os dois dígitos verificadores. Repetidos (111...) não passam. */
export function cpfValido(valor) {
    const d = soDigitosCpf(valor);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

    const digito = (len) => {
        let soma = 0;
        for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
        const r = (soma * 10) % 11;
        return r === 10 ? 0 : r;
    };
    return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

/** 12345678909 -> 123.456.789-09. Devolve o original se não tiver 11 dígitos. */
export function formatarCpf(valor) {
    const d = soDigitosCpf(valor);
    return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : valor;
}

export default { cpfValido, formatarCpf, soDigitosCpf };
