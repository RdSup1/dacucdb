import { api } from "./api";

export const SUPABASE_BUCKET = process.env.REACT_APP_SUPABASE_BUCKET || "imagens";

/**
 * Upload de imagem via backend (que usa service_role para gravar no bucket).
 * Retorna { publicUrl, path }.
 */
export async function uploadImage(file, folder = "equipment") {
    if (!file) throw new Error("Nenhum arquivo selecionado");
    if (!file.type.startsWith("image/")) throw new Error("Apenas imagens são permitidas");
    if (file.size > 5 * 1024 * 1024) throw new Error("Imagem deve ter no máximo 5MB");

    const form = new FormData();
    form.append("file", file);

    const { data } = await api.post(
        `/uploads/image?folder=${encodeURIComponent(folder)}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return { publicUrl: data.public_url, path: data.path };
}
