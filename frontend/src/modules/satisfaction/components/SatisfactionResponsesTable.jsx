import React from 'react'
import { formatDateTime } from '../../../shared/utils/helpers'

export function SatisfactionResponsesTable({ responses, loading }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Nome</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Empresa</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>E-mail</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando respostas...</td></tr>
            ) : responses.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma resposta ainda.</td></tr>
            ) : (
              responses.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{r.respondente_nome || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{r.respondente_empresa || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{r.respondente_email || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{formatDateTime(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
