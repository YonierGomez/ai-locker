import { useState, useEffect } from 'react'
import { Copy, X } from 'lucide-react'
import toast from 'react-hot-toast'

// Extract unique {{variable}} names from content
export function extractVariables(content) {
  if (!content) return []
  const matches = [...content.matchAll(/\{\{([^}]+)\}\}/g)]
  const seen = new Set()
  return matches
    .map(m => m[1].trim())
    .filter(name => { if (seen.has(name)) return false; seen.add(name); return true })
}

// Replace all {{var}} with their values
export function fillVariables(content, values) {
  return content.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
    const key = name.trim()
    return values[key] !== undefined ? values[key] : match
  })
}

export default function VariableFillModal({ content, onClose }) {
  const variables = extractVariables(content)
  const [values, setValues] = useState(() => Object.fromEntries(variables.map(v => [v, ''])))

  useEffect(() => {
    setValues(Object.fromEntries(variables.map(v => [v, ''])))
  }, [content])

  const allFilled = variables.every(v => values[v]?.trim())

  const handleCopy = async () => {
    const filled = fillVariables(content, values)
    try {
      await navigator.clipboard.writeText(filled)
      toast.success('Copied with variables filled!')
      onClose()
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: 'rgba(22,22,26,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'paletteIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Fill in variables</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {variables.length} variable{variables.length !== 1 ? 's' : ''} detected
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Variable inputs */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {variables.map(varName => (
            <div key={varName} className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <code style={{ fontSize: 11, color: 'var(--blue-light)', background: 'color-mix(in srgb, var(--blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 5, padding: '1px 6px', fontFamily: 'var(--font-mono)' }}>
                  {`{{${varName}}}`}
                </code>
              </label>
              <input
                className="form-input"
                placeholder={`Value for ${varName}…`}
                value={values[varName] || ''}
                onChange={e => setValues(v => ({ ...v, [varName]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && allFilled) handleCopy() }}
                autoFocus={variables.indexOf(varName) === 0}
                style={{ marginTop: 6 }}
              />
            </div>
          ))}

          {/* Preview */}
          {allFilled && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Preview</div>
              <div style={{
                fontSize: 12, color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 12px',
                maxHeight: 120, overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {fillVariables(content, values).slice(0, 300)}{fillVariables(content, values).length > 300 ? '…' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button className="btn btn-glass btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleCopy} disabled={!allFilled} style={{ gap: 6 }}>
            <Copy size={13} /> Copy with values
          </button>
        </div>
      </div>
    </div>
  )
}
