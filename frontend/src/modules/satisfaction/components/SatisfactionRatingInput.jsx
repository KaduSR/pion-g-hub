import React from 'react'

export function SatisfactionRatingInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              width: 48, height: 48, borderRadius: 12,
              border: selected ? '2px solid #1B3A6B' : '1.5px solid #e2e8f0',
              background: selected ? '#1B3A6B' : '#fff',
              color: selected ? '#fff' : '#334155',
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
