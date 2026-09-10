import React, { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, Copy, RotateCcw, X, ShieldAlert, VideoOff } from 'lucide-react'
import { Button } from '../../../shared/components/FormField'
import { FEATURES } from '../../../shared/config/features'
import { parseCredentialContent } from '../services/credentialParserService'

/**
 * Modo diagnóstico (etapa atual): pede a câmera, lê o QR Code e mostra o
 * conteúdo bruto. NÃO cadastra nada sozinho — "Utilizar dados" só fica
 * habilitado se FEATURES.qrCredentialAutoFill estiver ligado E o parser
 * reconhecer o conteúdo (ver credentialParserService.js). Enquanto o
 * formato oficial da credencial não é homologado, o botão fica
 * desabilitado mesmo com uma leitura bem-sucedida.
 *
 * Separação de responsabilidades: este componente só sabe operar a câmera
 * e mostrar o texto bruto. Interpretar esse texto é 100% responsabilidade
 * de credentialParserService.
 */
export function CredentialScanner({ onClose, onUseData }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  const [status, setStatus] = useState('requesting') // requesting | scanning | found | permission_denied | no_camera | error
  const [rawText, setRawText] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copiar conteúdo')

  if (!canvasRef.current && typeof document !== 'undefined') {
    canvasRef.current = document.createElement('canvas')
  }

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code?.data) {
      setRawText(code.data)
      setStatus('found')
      stopCamera()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setRawText('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      stopCamera()
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStatus('permission_denied')
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setStatus('no_camera')
      } else {
        setStatus('error')
      }
    }
  }, [tick, stopCamera])

  useEffect(() => {
    startCamera()
    return stopCamera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText)
      setCopyLabel('Copiado!')
      setTimeout(() => setCopyLabel('Copiar conteúdo'), 1500)
    } catch (_) {
      setCopyLabel('Não foi possível copiar')
    }
  }

  const parsed = status === 'found' ? parseCredentialContent(rawText) : null
  const canUseData = FEATURES.qrCredentialAutoFill && !!parsed

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 480, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Ler credencial
          </h2>
          <button onClick={() => { stopCamera(); onClose() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={22} />
          </button>
        </div>

        {(status === 'requesting' || status === 'scanning') && (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0f172a', aspectRatio: '4 / 3' }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {status === 'requesting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Camera size={32} />
                <p style={{ marginTop: 8, fontSize: 14 }}>Solicitando acesso à câmera…</p>
              </div>
            )}
            {status === 'scanning' && (
              <div style={{
                position: 'absolute', inset: 24, border: '3px solid #22c55e', borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(15,23,42,0.35)',
              }} />
            )}
          </div>
        )}

        {status === 'permission_denied' && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <ShieldAlert size={40} color="#dc2626" style={{ marginBottom: 12 }} />
            <p style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 6px' }}>Permissão de câmera negada</p>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              Habilite o acesso à câmera nas configurações do navegador/tablet e tente novamente.
            </p>
          </div>
        )}

        {status === 'no_camera' && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <VideoOff size={40} color="#dc2626" style={{ marginBottom: 12 }} />
            <p style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 6px' }}>Nenhuma câmera encontrada</p>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Verifique se o dispositivo tem câmera disponível.</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <ShieldAlert size={40} color="#dc2626" style={{ marginBottom: 12 }} />
            <p style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 6px' }}>Não foi possível abrir a câmera</p>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Tente novamente ou use outro dispositivo.</p>
          </div>
        )}

        {status === 'found' && (
          <div>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <p style={{ margin: 0, color: '#059669', fontSize: 13, fontWeight: 600 }}>QR Code lido com sucesso.</p>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Conteúdo encontrado:</p>
            <pre style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
              fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
              maxHeight: 160, overflowY: 'auto',
            }}>
              {rawText}
            </pre>
            {!canUseData && (
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                {FEATURES.qrCredentialAutoFill
                  ? 'Formato não reconhecido — não é possível preencher o formulário automaticamente.'
                  : 'Preenchimento automático ainda em homologação — use os dados manualmente por enquanto.'}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {status === 'found' ? (
            <>
              <Button variant="secondary" size="md" onClick={handleCopy}>
                <Copy size={14} /> {copyLabel}
              </Button>
              <Button variant="secondary" size="md" onClick={startCamera}>
                <RotateCcw size={14} /> Ler novamente
              </Button>
              <Button
                size="md"
                disabled={!canUseData}
                title={canUseData ? undefined : 'Em homologação — preenchimento automático ainda não disponível'}
                onClick={() => canUseData && onUseData?.(parsed)}
              >
                Utilizar dados
              </Button>
            </>
          ) : (status === 'permission_denied' || status === 'no_camera' || status === 'error') ? (
            <>
              <Button variant="secondary" size="md" onClick={() => { stopCamera(); onClose() }}>Cancelar</Button>
              <Button size="md" onClick={startCamera}>
                <RotateCcw size={14} /> Tentar novamente
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="md" onClick={() => { stopCamera(); onClose() }}>Cancelar</Button>
          )}
        </div>
      </div>
    </div>
  )
}
