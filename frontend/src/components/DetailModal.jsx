import { useEffect, useState } from 'react'
import { X, Copy, Edit2, Trash2, Star, Check, Eye, EyeOff, Tag, Clock, Hash, Cpu, Zap, Calendar, Server, Wifi, Monitor, Terminal, Maximize2, Minimize2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const jsonStyle = {
  ...oneDark,
  'pre[class*="language-"]': { ...oneDark['pre[class*="language-"]'], background: 'transparent', margin: 0 },
  'code[class*="language-"]': { ...oneDark['code[class*="language-"]'], background: 'transparent' },
}
import toast from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'
import { estimateTokens, formatTokens, getTokenColor } from '../utils/tokens'

function hasMarkdown(text) {
  if (!text) return false
  return /[#*`_\[\]>~\-]{1,}/.test(text)
}

export default function DetailModal({ item, onClose, onEdit, onDelete, onToggleFavorite, typeLabel, typeColor, typeIcon: TypeIcon, maxWidth, showTokens = true }) {
  const [copied, setCopied] = useState(false)
  const [renderMd, setRenderMd] = useState(true)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!item) return null

  const displayContent = item.content || item.command || (item.config ? JSON.stringify(item.config, null, 2) : null)
  const isJsonContent = !item.content && !item.command && !!item.config
  const contentHasMd = !isJsonContent && hasMarkdown(item.content)
  const tokenCount = item.content ? estimateTokens(item.content) : 0
  const tokenColor = getTokenColor(tokenCount)
  const updatedAgo = item.updated_at ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true }) : ''
  const createdAt = item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : ''

  const handleCopy = async () => {
    // For MCP configs, copy the wrapped { server_name: config } format
    const text = item.config && item.server_name
      ? JSON.stringify({ [item.server_name]: item.config }, null, 2)
      : displayContent || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const mdComponents = {
    h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px', letterSpacing: -0.3 }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '14px 0 6px' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '12px 0 4px' }}>{children}</h3>,
    p: ({ children }) => <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)', marginBottom: 10 }}>{children}</p>,
    code({ inline, className, children }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
          customStyle={{ borderRadius: 8, fontSize: 13, margin: '10px 0' }}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code style={{ background: 'var(--glass-bg-active)', borderRadius: 4, padding: '1px 6px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{children}</code>
      )
    },
    ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
    li: ({ children }) => <li style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 3 }}>{children}</li>,
    strong: ({ children }) => <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{children}</em>,
    blockquote: ({ children }) => (
      <blockquote style={{ borderLeft: '3px solid rgba(0,122,255,0.5)', paddingLeft: 14, margin: '10px 0', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{children}</blockquote>
    ),
    hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '16px 0' }} />,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline', textDecorationColor: 'rgba(0,122,255,0.4)' }}>{children}</a>,
    table: ({ children }) => <div style={{ overflowX: 'auto', marginBottom: 10 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table></div>,
    th: ({ children }) => <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>{children}</th>,
    td: ({ children }) => <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-tertiary)' }}>{children}</td>,
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ alignItems: 'center' }}
    >
      <div className="detail-modal-container" style={{
        borderRadius: maximized ? 0 : 'var(--radius-2xl)',
        width: maximized ? '100vw' : '100%',
        maxWidth: maximized ? '100vw' : (maxWidth || 780),
        height: maximized ? '100vh' : undefined,
        maxHeight: maximized ? '100vh' : '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-radius 0.2s, box-shadow 0.2s',
      }}>
        {/* Top gradient line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${typeColor || 'rgba(0,122,255,0.6)'}, transparent)` }} />

        {/* Header */}
        <div className="detail-modal-header" style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          {TypeIcon && (
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${typeColor || '#007AFF'}18`,
              border: `1px solid ${typeColor || '#007AFF'}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TypeIcon size={18} color={typeColor || '#007AFF'} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {typeLabel && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                  color: typeColor || '#007AFF',
                  background: `${typeColor || '#007AFF'}15`,
                  border: `1px solid ${typeColor || '#007AFF'}30`,
                  borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase',
                }}>
                  {typeLabel}
                </span>
              )}
              {item.category && (
                <span className={`category-badge ${item.category}`}>{item.category}</span>
              )}
              {item.is_active === false && (
                <span style={{ fontSize: 10, color: 'var(--text-quaternary)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '2px 8px' }}>
                  Inactive
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: 'var(--text-primary)', marginBottom: item.description ? 4 : 0 }}>
              {item.title}
            </h2>
            {item.description && (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{item.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onToggleFavorite?.(item.id)}
              style={{
                background: item.is_favorite ? 'rgba(255,214,10,0.12)' : 'var(--glass-bg)',
                border: `1px solid ${item.is_favorite ? 'rgba(255,214,10,0.3)' : 'var(--glass-border)'}`,
                borderRadius: 8, padding: '7px', cursor: 'pointer',
                color: item.is_favorite ? '#FFD60A' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={15} fill={item.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              className="btn-icon"
              onClick={() => setMaximized(m => !m)}
              style={{ padding: 7 }}
              title={maximized ? 'Restore' : 'Maximize'}
            >
              {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button className="btn-icon" onClick={onClose} style={{ padding: 7 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Content */}
          {displayContent && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isJsonContent ? 'Config' : 'Content'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showTokens && tokenCount > 0 && (
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: tokenColor, fontWeight: 600 }}>
                      {formatTokens(tokenCount)}
                    </span>
                  )}
                  {contentHasMd && (
                    <button
                      onClick={() => setRenderMd(p => !p)}
                      style={{
                        background: renderMd ? 'rgba(0,122,255,0.15)' : 'var(--glass-bg)',
                        border: `1px solid ${renderMd ? 'rgba(0,122,255,0.3)' : 'var(--glass-border)'}`,
                        borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                        fontSize: 11, fontWeight: 500,
                        color: renderMd ? 'var(--blue)' : 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}
                    >
                      {renderMd ? <Eye size={11} /> : <EyeOff size={11} />}
                      {renderMd ? 'Rendered' : 'Raw'}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ overflow: 'hidden' }}>
                {isJsonContent ? (
                  <SyntaxHighlighter
                    style={jsonStyle}
                    language="json"
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: 13,
                      lineHeight: 1.65,
                      background: 'transparent',
                      padding: '16px 18px',
                    }}
                  >
                    {displayContent}
                  </SyntaxHighlighter>
                ) : renderMd && contentHasMd ? (
                  <div style={{ padding: '16px 18px', lineHeight: 1.6 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {item.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre style={{
                    fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)',
                    fontFamily: (item.command || item.config) ? 'var(--font-mono)' : 'var(--font-sans)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: '16px 18px',
                  }}>
                    {displayContent}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Metadata grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {item.model && (
              <MetaChip icon={Cpu} label="Model" value={item.model} />
            )}
            {showTokens && tokenCount > 0 && (
              <MetaChip icon={Hash} label="Tokens" value={formatTokens(tokenCount)} valueColor={tokenColor} />
            )}
            {item.use_count > 0 && (
              <MetaChip icon={Zap} label="Uses" value={`${item.use_count} time${item.use_count !== 1 ? 's' : ''}`} />
            )}
            {item.server_name && (
              <MetaChip icon={Server} label="Server name" value={item.server_name} />
            )}
            {item.transport && (
              <MetaChip icon={Wifi} label="Transport" value={item.transport} />
            )}
            {item.shell && (
              <MetaChip icon={Terminal} label="Shell" value={item.shell} />
            )}
            {item.platform && item.platform !== 'all' && (
              <MetaChip icon={Monitor} label="Platform" value={item.platform} />
            )}
            {item.scope && (
              <MetaChip icon={Hash} label="Scope" value={item.scope} />
            )}
            {createdAt && (
              <MetaChip icon={Calendar} label="Created" value={createdAt} />
            )}
            {updatedAgo && (
              <MetaChip icon={Clock} label="Updated" value={updatedAgo} />
            )}
            {item.temperature != null && item.temperature !== '' && (
              <MetaChip icon={Zap} label="Temperature" value={String(item.temperature)} />
            )}
            {item.max_tokens > 0 && (
              <MetaChip icon={Hash} label="Max tokens" value={String(item.max_tokens)} />
            )}
            {item.priority > 0 && (
              <MetaChip icon={Star} label="Priority" value={`P${item.priority}`} />
            )}
          </div>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Tag size={12} color="var(--text-quaternary)" />
              {item.tags.map(tag => (
                <span key={tag.id} className="tag" style={{ borderColor: tag.color + '40', color: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="detail-modal-footer" style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          flexWrap: 'wrap',
        }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { onDelete?.(item.id); onClose?.() }}
            style={{ gap: 6 }}
          >
            <Trash2 size={13} /> Delete
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-glass" onClick={handleCopy} style={{ gap: 7 }}>
              {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-primary" onClick={() => { onEdit?.(item, maximized); onClose?.() }} style={{ gap: 7 }}>
              <Edit2 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaChip({ icon: Icon, label, value, valueColor }) {
  return (
    <div className="meta-chip" style={{
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={11} color="var(--text-quaternary)" />
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
