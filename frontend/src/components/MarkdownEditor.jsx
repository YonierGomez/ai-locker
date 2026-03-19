import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, Edit3, Columns, Sparkles, History, RotateCcw, Check, X, ChevronDown, RefreshCw } from 'lucide-react'
import { estimateTokens, formatTokens, getTokenColor } from '../utils/tokens'
import { aiApi, versionsApi } from '../utils/api'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const MODES = [
  { id: 'edit', icon: Edit3, label: 'Edit' },
  { id: 'split', icon: Columns, label: 'Split' },
  { id: 'preview', icon: Eye, label: 'Preview' },
]

// ── Version History Panel (inline, no overflow issue) ───────────
function VersionPanel({ itemId, itemType, onRestore, onClose }) {
  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions', itemType, itemId],
    queryFn: () => versionsApi.list(itemType, itemId),
    enabled: !!itemId && !!itemType,
    staleTime: 0,
  })
  const [restoring, setRestoring] = useState(null)

  const handleRestore = async (versionId, snap) => {
    setRestoring(versionId)
    try {
      await versionsApi.restore(itemType, itemId, versionId)
      onRestore(snap.content, snap)
      toast.success('Version restored!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.09)',
      borderTop: 'none',
      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
      background: 'rgba(255,255,255,0.02)',
      maxHeight: 280, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Version history</span>
        <button className="btn-icon" onClick={onClose} style={{ padding: 3 }}><X size={12} /></button>
      </div>
      {isLoading && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>Loading…</div>}
      {!isLoading && (!versions || versions.length === 0) && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
          No versions yet — saved automatically on every edit.
        </div>
      )}
      {versions?.map(v => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.snapshot?.title || 'Untitled'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 1 }}>
              {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
            </div>
          </div>
          <button
            className="btn btn-glass btn-sm"
            onClick={() => handleRestore(v.id, v.snapshot)}
            disabled={restoring === v.id}
            style={{ fontSize: 10, padding: '2px 8px', gap: 3, flexShrink: 0 }}
          >
            {restoring === v.id ? <RefreshCw size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={9} />}
            Restore
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Improve with AI panel (inline) ───────────────────────────────
function ImprovePanel({ value, onChange, onClose }) {
  const [improving, setImproving] = useState(false)
  const [result, setResult] = useState(null)

  const handleImprove = async () => {
    setImproving(true)
    setResult(null)
    try {
      const res = await aiApi.generate(
        `Improve this prompt/content. Make it clearer, more professional, and more effective:\n\n${value}`,
        []
      )
      if (res.action === 'improve' && res.content) {
        setResult(res)
      } else {
        setResult({ content: value, message: res.message || 'No improvements suggested.' })
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImproving(false)
    }
  }

  const handleAccept = () => {
    if (result?.content) onChange(result.content)
    toast.success('Content updated!')
    onClose()
  }

  return (
    <div style={{
      border: '1px solid rgba(48,209,88,0.2)',
      borderTop: 'none',
      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
      background: 'rgba(48,209,88,0.04)',
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={12} color="#30D158" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#30D158' }}>Improve with AI</span>
        </div>
        <button className="btn-icon" onClick={onClose} style={{ padding: 3 }}><X size={12} /></button>
      </div>

      {!result ? (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.6 }}>
            AI will analyze and suggest a clearer, more professional version.
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleImprove} disabled={improving || !value?.trim()} style={{ gap: 6 }}>
            {improving ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
            {improving ? 'Improving…' : 'Improve content'}
          </button>
        </>
      ) : (
        <>
          {result.changes?.length > 0 && (
            <ul style={{ paddingLeft: 16, marginBottom: 10 }}>
              {result.changes.map((c, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2, lineHeight: 1.5 }}>{c}</li>
              ))}
            </ul>
          )}
          <div style={{
            fontSize: 12, fontFamily: 'var(--font-mono)',
            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '8px 10px',
            maxHeight: 140, overflowY: 'auto',
            color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            lineHeight: 1.6, marginBottom: 10,
          }}>
            {result.content?.slice(0, 400)}{result.content?.length > 400 ? '…' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAccept} style={{ gap: 5 }}>
              <Check size={12} /> Accept
            </button>
            <button className="btn btn-glass btn-sm" onClick={() => setResult(null)} style={{ gap: 5 }}>
              <RotateCcw size={12} /> Try again
            </button>
            <button className="btn btn-glass btn-sm" onClick={onClose}>Discard</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main MarkdownEditor ──────────────────────────────────────────
export default function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Write in Markdown…',
  minHeight = 200,
  label,
  itemId,
  itemType,
  onRestoreVersion,
}) {
  const [mode, setMode] = useState('edit')
  const [showVersions, setShowVersions] = useState(false)
  const [showImprove, setShowImprove] = useState(false)
  const tokenCount = estimateTokens(value)
  const tokenColor = getTokenColor(tokenCount)
  const tokenLabel = formatTokens(tokenCount)

  const handleRestoreVersion = (content, snap) => {
    onChange(content)
    if (onRestoreVersion) onRestoreVersion(snap)
  }

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
          {value && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: tokenColor,
              background: `${tokenColor}18`, border: `1px solid ${tokenColor}30`,
              borderRadius: 6, padding: '1px 7px', fontFamily: 'var(--font-mono)', letterSpacing: 0.2,
            }}>
              {tokenLabel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* AI Improve */}
          <button
            onClick={() => { setShowImprove(p => !p); setShowVersions(false) }}
            title="Improve with AI"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)',
              background: showImprove ? 'rgba(48,209,88,0.15)' : 'transparent',
              color: showImprove ? '#30D158' : 'var(--text-tertiary)',
              transition: 'all 0.15s',
            }}
          >
            <Sparkles size={12} />
            Improve
          </button>

          {/* Version history (only when editing existing item) */}
          {itemId && itemType && (
            <button
              onClick={() => { setShowVersions(p => !p); setShowImprove(false) }}
              title="Version history"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)',
                background: showVersions ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: showVersions ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'all 0.15s',
              }}
            >
              <History size={12} />
              History
            </button>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

          {/* Mode toggle */}
          {MODES.map(({ id, icon: Icon, label: modeLabel }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              title={modeLabel}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)',
                background: mode === id ? 'color-mix(in srgb, var(--blue) 20%, transparent)' : 'transparent',
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

      {/* Inline panels — rendered between toolbar and editor, no overflow issue */}
      {showImprove && (
        <ImprovePanel value={value} onChange={onChange} onClose={() => setShowImprove(false)} />
      )}
      {showVersions && itemId && itemType && (
        <VersionPanel
          itemId={itemId}
          itemType={itemType}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}

      {/* Editor / Preview */}
      <div style={{
        display: 'flex',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: showImprove || showVersions ? '0' : '0 0 var(--radius-md) var(--radius-md)',
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
                  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid color-mix(in srgb, var(--blue) 50%, transparent)', paddingLeft: 14, margin: '10px 0', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{children}</blockquote>,
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

      {/* Bottom radius cap when panels are open */}
      {(showImprove || (showVersions && itemId && itemType)) && (
        <div style={{ height: 0, border: '1px solid rgba(255,255,255,0.09)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }} />
      )}

      {/* Markdown hint */}
      <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
        Supports **bold**, *italic*, `code`, # headings, - lists, &gt; quotes, ```code blocks``` · Use {'{{variable}}'} for dynamic placeholders
      </div>
    </div>
  )
}
