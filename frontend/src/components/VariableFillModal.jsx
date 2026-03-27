import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Copy, X, Eye } from 'lucide-react'
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
    return values[key] !== undefined && values[key] !== '' ? values[key] : match
  })
}

// Render preview with highlighted filled/unfilled variables
function PreviewContent({ content, values }) {
  const parts = []
  let lastIdx = 0
  const regex = /\{\{([^}]+)\}\}/g
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', value: content.slice(lastIdx, match.index) })
    }
    const key = match[1].trim()
    const filled = values[key] && values[key].trim()
    parts.push({ type: 'var', key, value: filled || null })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIdx) })
  }

  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.value}</span>
        if (part.value) {
          return (
            <mark key={i} style={{
              background: 'rgba(48,209,88,0.15)',
              color: '#30D158',
              borderRadius: 4,
              padding: '0 3px',
              fontWeight: 600,
            }}>
              {part.value}
            </mark>
          )
        }
        return (
          <mark key={i} style={{
            background: 'rgba(255,159,10,0.15)',
            color: '#FF9500',
            borderRadius: 4,
            padding: '0 3px',
            fontStyle: 'italic',
          }}>
            {`{{${part.key}}}`}
          </mark>
        )
      })}
    </span>
  )
}

export default function VariableFillModal({ content, onClose }) {
  const variables = extractVariables(content)
  const [values, setValues] = useState(() => Object.fromEntries(variables.map(v => [v, ''])))
  const [showPreview, setShowPreview] = useState(true)
  const firstInputRef = useRef(null)

  useEffect(() => {
    setValues(Object.fromEntries(variables.map(v => [v, ''])))
  }, [content])

  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [])

  const allFilled = variables.every(v => values[v]?.trim())
  const anyFilled = variables.some(v => values[v]?.trim())

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

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 560,
          background: 'rgba(22,22,26,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'paletteIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Fill in variables</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {variables.length} variable{variables.length !== 1 ? 's' : ''} detected
              {anyFilled && !allFilled && (
                <span style={{ color: '#FF9500', marginLeft: 8 }}>
                  · {variables.filter(v => !values[v]?.trim()).length} remaining
                </span>
              )}
              {allFilled && (
                <span style={{ color: '#30D158', marginLeft: 8 }}>· All filled ✓</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn-icon"
              onClick={() => setShowPreview(p => !p)}
              title={showPreview ? 'Hide preview' : 'Show preview'}
              style={{ color: showPreview ? 'var(--blue)' : 'var(--text-tertiary)' }}
            >
              <Eye size={15} />
            </button>
            <button className="btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Variable inputs */}
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            {variables.map((varName, i) => {
              const isFilled = !!values[varName]?.trim()
              return (
                <div key={varName} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{
                      fontSize: 11,
                      color: isFilled ? '#30D158' : 'var(--blue-light)',
                      background: isFilled ? 'rgba(48,209,88,0.12)' : 'color-mix(in srgb, var(--blue) 12%, transparent)',
                      border: `1px solid ${isFilled ? 'rgba(48,209,88,0.25)' : 'color-mix(in srgb, var(--blue) 25%, transparent)'}`,
                      borderRadius: 5, padding: '1px 6px',
                      fontFamily: 'var(--font-mono)',
                      transition: 'all 0.2s',
                    }}>
                      {`{{${varName}}}`}
                    </code>
                    {isFilled && <span style={{ fontSize: 10, color: '#30D158' }}>✓</span>}
                  </label>
                  <input
                    ref={i === 0 ? firstInputRef : null}
                    className="form-input"
                    placeholder={`Value for ${varName}…`}
                    value={values[varName] || ''}
                    onChange={e => setValues(v => ({ ...v, [varName]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (i < variables.length - 1) {
                          const inputs = document.querySelectorAll('.var-fill-input')
                          inputs[i + 1]?.focus()
                        } else if (allFilled) {
                          handleCopy()
                        }
                      }
                    }}
                    style={{ marginTop: 6 }}
                  />
                </div>
              )
            })}
          </div>

          {/* Live preview panel */}
          {showPreview && (
            <div style={{
              width: 240,
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}>
              <div style={{
                padding: '10px 14px',
                fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
                letterSpacing: 0.8, textTransform: 'uppercase',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}>
                Live Preview
              </div>
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '12px 14px',
                fontSize: 12, lineHeight: 1.65,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}>
                <PreviewContent content={content} values={values} />
              </div>
              <div style={{
                padding: '8px 14px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#30D158' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(48,209,88,0.3)' }} />
                    filled
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#FF9500' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,159,10,0.3)' }} />
                    pending
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            <kbd style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>↵</kbd> next field
            {allFilled && <span style={{ marginLeft: 8 }}>· last field copies</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-glass btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCopy}
              disabled={!allFilled}
              style={{ gap: 6, opacity: allFilled ? 1 : 0.5 }}
            >
              <Copy size={13} /> Copy with values
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
