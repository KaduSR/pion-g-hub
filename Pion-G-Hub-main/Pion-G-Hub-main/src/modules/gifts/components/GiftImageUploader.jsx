import React, { useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
import { giftsService } from '../services/giftsService'
import { Button } from '../../../shared/components/FormField'

/**
 * Uploader de imagem do brinde. Faz upload assim que o arquivo é escolhido
 * (não espera o submit do formulário) e só remove a imagem anterior do
 * storage depois que o novo upload for concluído com sucesso — nunca antes.
 */
export function GiftImageUploader({ value, onChange, entityId }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handlePick = () => {
    if (uploading) return
    inputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo novamente depois, se necessário

    if (!file || uploading) return

    setError('')
    setUploading(true)
    const previousUrl = value

    try {
      const newUrl = await giftsService.uploadImage(file, entityId)
      onChange(newUrl)
      if (previousUrl) {
        // best-effort: não bloqueia a UI nem falha o fluxo se a remoção do
        // arquivo antigo der erro (mesmo padrão de settingsService.deleteLogo)
        giftsService.removeImage(previousUrl)
      }
    } catch (err) {
      setError(err.message || 'Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    if (uploading || !value) return
    const previousUrl = value
    onChange(null)
    giftsService.removeImage(previousUrl)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{
          width: 120, height: 120, borderRadius: 12, background: '#f8fafc',
          border: '1.5px dashed #e2e8f0', display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
        }}>
          {value ? (
            <img
              src={value}
              alt="Pré-visualização do brinde"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={32} color="#cbd5e1" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" size="sm" onClick={handlePick} disabled={uploading}>
              <Upload size={14} /> {value ? 'Trocar imagem' : 'Escolher imagem'}
            </Button>
            {value && (
              <Button type="button" variant="danger" size="sm" onClick={handleRemove} disabled={uploading}>
                <Trash2 size={14} /> Remover
              </Button>
            )}
          </div>

          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
            PNG, JPG ou WebP — máximo 2 MB
          </p>

          {uploading && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#1B3A6B', fontWeight: 600 }}>
              Enviando imagem...
            </p>
          )}

          {error && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
