import { supabase } from '../../../lib/supabase'

const TABLE = 'configuracoes'
const ROW_ID = 1          // tabela singleton: sempre linha id = 1
const BUCKET = 'assets'

export const settingsService = {
    /** Retorna as configurações salvas (único registro). */
    async get() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', ROW_ID)
            .maybeSingle()
        if (error) throw error
        return data  // null se ainda não existir
    },

    /**
     * Salva (upsert) as configurações.
     * @param {object} payload - { nome_sistema, subtitulo, cor_primaria, logo_url }
     */
    async save(payload) {
        const { data, error } = await supabase
            .from(TABLE)
            .upsert({ id: ROW_ID, ...payload, updated_at: new Date().toISOString() })
            .select()
            .single()
        if (error) throw error
        return data
    },

    /**
     * Faz upload de logo para o bucket e retorna a URL pública.
     * @param {File} file
     */
    async uploadLogo(file) {
        const ext = file.name.split('.').pop()
        const path = `logo-${Date.now()}.${ext}`

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                upsert: true,
                contentType: file.type,
            })

        console.log("UPLOAD DATA:", data)
        console.log("UPLOAD ERROR:", error)

        if (error) throw error

        const { data: publicData } =
            supabase.storage
                .from(BUCKET)
                .getPublicUrl(path)

        console.log("PUBLIC URL:", publicData)

        return publicData.publicUrl
    },

    /** Remove o arquivo de logo do bucket pelo caminho (path relativo). */
    async deleteLogo(publicUrl) {
        if (!publicUrl) return
        try {
            // extrai o path relativo a partir da URL pública
            const path = publicUrl.split(`/${BUCKET}/`)[1]
            if (path) await supabase.storage.from(BUCKET).remove([path])
        } catch (_) {
            // silencia erro de remoção — não crítico
        }
    },
}
