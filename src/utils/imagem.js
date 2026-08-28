// utils/imagem.js
//
// Prepara a foto ANTES de subir: reduz, comprime e gera a miniatura.
//
// Por que no navegador e não no servidor: a foto sai do celular com 3 a 5 MB, o
// bucket do Office recusa objeto acima de 2 MB, e subir 5 MB por um 4G de stand
// é o passo mais lento do fluxo. Tratando aqui, o que viaja são algumas
// centenas de KB e o upload deixa de falhar.
//
// A miniatura existe porque a galeria mostra dezenas de fotos de uma vez: sem
// ela, abrir a aba baixaria a imagem cheia de cada quadradinho de 300px.

// Lado maior da imagem guardada. 2000px cobre tela cheia em monitor grande e
// ainda permite zoom sem virar borrão.
const LADO_MAXIMO = 2000;
const LADO_MINIATURA = 480;
const QUALIDADE = 0.82;
const QUALIDADE_MINIATURA = 0.72;

/** O navegador sabe gravar WebP? (todos os atuais sabem; o fallback é JPEG.) */
let _suporteWebp = null;
function suportaWebp() {
    if (_suporteWebp !== null) return _suporteWebp;
    try {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        _suporteWebp = c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
        _suporteWebp = false;
    }
    return _suporteWebp;
}

/**
 * Decodifica o arquivo. `createImageBitmap` respeita a orientação do EXIF, que
 * é o que impede a foto tirada em pé de subir deitada.
 */
async function decodificar(file) {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            // Formato que o navegador não decodifica (HEIC do iPhone, por
            // exemplo) cai no caminho do <img>, e se ele também falhar o
            // chamador sobe o arquivo original.
        }
    }
    const url = URL.createObjectURL(file);
    try {
        return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('nao decodificou'));
            img.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

function desenhar(fonte, lado, qualidade, tipo) {
    const largura = fonte.width || fonte.naturalWidth;
    const altura = fonte.height || fonte.naturalHeight;
    const escala = Math.min(1, lado / Math.max(largura, altura));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve({ blob, width: canvas.width, height: canvas.height }), tipo, qualidade);
    });
}

/**
 * @param {File} file arquivo escolhido pela pessoa
 * @returns {Promise<{full: Blob|File, thumb: Blob|null, width: number, height: number,
 *                    originalSize: number, size: number, tratada: boolean, ext: string}>}
 */
export async function prepararImagem(file) {
    const bruto = {
        full: file,
        thumb: null,
        width: 0,
        height: 0,
        originalSize: file.size,
        size: file.size,
        tratada: false,
        ext: (file.type || '').includes('webp') ? 'webp' : 'jpg',
    };

    let fonte;
    try {
        fonte = await decodificar(file);
    } catch {
        // Não deu para abrir a imagem aqui: sobe como veio e deixa o servidor
        // responder se cabe ou não. Melhor um erro explicado do que engolir.
        return bruto;
    }

    const tipo = suportaWebp() ? 'image/webp' : 'image/jpeg';
    const ext = tipo === 'image/webp' ? 'webp' : 'jpg';

    try {
        const [grande, mini] = await Promise.all([
            desenhar(fonte, LADO_MAXIMO, QUALIDADE, tipo),
            desenhar(fonte, LADO_MINIATURA, QUALIDADE_MINIATURA, tipo),
        ]);
        if (fonte.close) fonte.close();
        if (!grande?.blob) return bruto;

        // Imagem já pequena e bem comprimida pode ficar MAIOR depois do
        // recomprimido. Nesse caso o original vence.
        const usarOriginal = grande.blob.size >= file.size && file.size <= 1.5 * 1024 * 1024;

        return {
            full: usarOriginal ? file : grande.blob,
            thumb: mini?.blob || null,
            width: grande.width,
            height: grande.height,
            originalSize: file.size,
            size: usarOriginal ? file.size : grande.blob.size,
            tratada: !usarOriginal,
            ext: usarOriginal ? bruto.ext : ext,
        };
    } catch {
        return bruto;
    }
}

/** "3,4 MB", "820 KB" */
export function tamanhoLegivel(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
    if (n >= 1024) return `${Math.round(n / 1024)} KB`;
    return `${n} B`;
}

export default { prepararImagem, tamanhoLegivel };
