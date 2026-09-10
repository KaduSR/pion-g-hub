import React, { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '../../../shared/components/FormField'

export function SatisfactionLinkBox({ publicToken }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/pesquisa/${publicToken}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      // clipboard indisponível — o campo readOnly abaixo permite copiar manualmente
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px',
    }}>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        style={{ flex: 1, minWidth: 160, border: 'none', background: 'transparent', fontSize: 13, color: '#334155', outline: 'none' }}
      />
      <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Copiar'}
      </Button>
      <a href={url} target="_blank" rel="noreferrer" title="Abrir pesquisa pública" style={{ display: 'flex', color: '#64748b' }}>
        <ExternalLink size={16} />
      </a>
    </div>
  )
}
