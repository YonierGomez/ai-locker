import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, Edit3, Columns } from 'lucide-react'
import { estimateTokens, formatTokens, getTokenColor } from '../utils/tokens'

const MODES = [
  { id: 'edit', icon: Edit3, label: 'Edit' },
  { id: 'split', icon: Columns, label: 'Split' },
  { id: 'preview', icon: Eye, label: 'Preview' },
]

export default function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Write in Markdown…',
  minHeight = 200,
  label,
}) {
  const [mode, setMode] = useState('edit')
  const tokenCount = estimateTokens(value)
  const tokenColor = getTokenColor(tokenCount)
  const tokenLabel = formatTokens(tokenCount)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderBottom: 'none',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {label && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {label}
            </span>
          )}
          {/* Token counter */}
          {value && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: tokenColor,
              background: `${tokenColor}18`,
              border: `1px solid ${tokenColor}30`,
              borderRadius: 6,
              padding: '1px 7px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.2,
            }}>
              {tokenLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {MODES.map(({ id, icon: Icon, label: modeLabel }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              title={modeLabel}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                background: mode === id ? 'rgba(0,122,255,0.2)' : 'transparent',
                color: mode === id ? 'var(--blue-light)' : 'var(--text-tertiary)',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={12} />
              {modeLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / Preview */}
      <div style={{
        display: 'flex',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        overflow: 'hidden',
        minHeight,
      }}>
        {/* Editor pane */}
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: 'none',
              borderRight: mode === 'split' ? '1px solid rgba(255,255,255,0.07)' : 'none',
              outline: 'none',
              padding: '14px 16px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.7,
              resize: 'vertical',
              minHeight,
            }}
          />
        )}

        {/* Preview pane */}
        {(mode === 'preview' || mode === 'split') && (
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.02)',
            padding: '14px 16px',
            overflowY: 'auto',
            minHeight,
          }}>
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, marginTop: 16, color: 'var(--text-primary)' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, marginTop: 12, color: 'var(--text-primary)' }}>{children}</h3>,
                  p: ({ children }) => <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: 'var(--text-secondary)' }}>{children}</p>,
                  code: ({ inline, children }) => inline
                    ? <code style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#00D4FF' }}>{children}</code>
                    : <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 14px', overflow: 'auto', marginBottom: 12 }}><code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</code></pre>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 4 }}>{children}</li>,
                  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid rgba(0,122,255,0.5)', paddingLeft: 14, margin: '10px 0', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{children}</blockquote>,
                  strong: ({ children }) => <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>,
                  em: ({ children }) => <em style={{ color: 'var(--text-secondary)' }}>{children}</em>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue-light)', textDecoration: 'none' }}>{children}</a>,
                  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />,
                  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 13 }}>{children}</table>,
                  th: ({ children }) => <th style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'left' }}>{children}</th>,
                  td: ({ children }) => <td style={{ padding: '6px 10px', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>{children}</td>,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <div style={{ color: 'var(--text-quaternary)', fontSize: 13, fontStyle: 'italic' }}>
                Nothing to preview yet…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Markdown hint */}
      <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
        Supports **bold**, *italic*, `code`, # headings, - lists, &gt; quotes, ```code blocks```
      </div>
    </div>
  )
}
