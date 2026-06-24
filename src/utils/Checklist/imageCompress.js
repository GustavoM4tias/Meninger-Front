// utils/Checklist/imageCompress.js
// Compressão client-side de imagens (canvas) antes do upload ao Supabase: limita a
// dimensão máxima e reexporta em qualidade reduzida. Evita sobrecarregar o storage.

async function loadBitmap(blob) {
    if (typeof createImageBitmap === 'function') {
        try { return await createImageBitmap(blob); } catch { /* fallback abaixo */ }
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}

// Comprime um File/Blob de imagem. Retorna um File novo (ou o original se não compensar
// ou se for tipo que não vale a pena reencodar — gif/svg).
export async function compressImage(input, { maxDim = 1920, quality = 0.8, type = 'image/webp', fileName } = {}) {
    try {
        if (!(input instanceof Blob)) return input;
        const mime = String(input.type || '');
        if (!mime.startsWith('image/') || mime === 'image/gif' || mime === 'image/svg+xml') return input;

        const bmp = await loadBitmap(input);
        const w0 = bmp.width || bmp.naturalWidth;
        const h0 = bmp.height || bmp.naturalHeight;
        if (!w0 || !h0) return input;

        const scale = Math.min(1, maxDim / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale));
        const h = Math.max(1, Math.round(h0 * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
        if (!blob) return input;
        const out = blob.size < input.size ? blob : input; // se não reduziu, mantém o original
        const ext = (out.type || type).split('/')[1] || 'webp';
        const base = (fileName || input.name || 'imagem').replace(/\.[^.]+$/, '');
        return new File([out], `${base}.${ext}`, { type: out.type || type });
    } catch {
        return input; // qualquer falha → usa o original (nunca bloqueia o upload)
    }
}

// Exporta um <canvas> já desenhado como File comprimido (usado pela marcação/proofing).
export async function canvasToCompressedFile(canvas, { quality = 0.85, type = 'image/webp', fileName = 'marcacao.webp' } = {}) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) throw new Error('Não foi possível exportar a imagem marcada.');
    const ext = (blob.type || type).split('/')[1] || 'webp';
    const base = fileName.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.${ext}`, { type: blob.type || type });
}
