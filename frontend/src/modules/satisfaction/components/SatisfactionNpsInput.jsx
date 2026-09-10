import React from 'react'

const SCORES = Array.from({ length: 11 }, (_, i) => i)

export function SatisfactionNpsInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {SCORES.map((n) => {
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: selected ? '2px solid #1B3A6B' : '1.5px solid #e2e8f0',
              background: selected ? '#1B3A6B' : '#fff',
              color: selected ? '#fff' : '#334155',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
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
