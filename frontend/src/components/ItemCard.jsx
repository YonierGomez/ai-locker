import { Star, Copy, Edit2, Trash2, Check, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { estimateTokens, formatTokens, getTokenColor } from '../utils/tokens'

// Detect if content has markdown
function hasMarkdown(text) {
  if (!text) return false
  return /[#*`_\[\]>~\-]{1,}/.test(text)
}

export default function ItemCard({
  item,
  onEdit,
  onView,
  onDelete,
  onToggleFavorite,
  onToggleActive,
  extraActions,
  showStatus = false,
  showPriority = false,
}) {
  const [copied, setCopied] = useState(false)
  const [previewMd, setPreviewMd] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(item.content)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleFavorite = (e) => {
    e.stopPropagation()
    onToggleFavorite?.(item.id)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    onEdit?.(item)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete?.(item.id)
  }

  const handleToggleActive = (e) => {
    e.stopPropagation()
    onToggleActive?.(item.id)
  }

  const handleTogglePreview = (e) => {
    e.stopPropagation()
    setPreviewMd(p => !p)
  }

  const timeAgo = item.updated_at
    ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })
    : ''

  const contentHasMd = hasMarkdown(item.content)
  const tokenCount = item.content ? estimateTokens(item.content) : 0
  const tokenColor = getTokenColor(tokenCount)

  return (
    <div className="item-card" onClick={() => onView ? onView(item) : onEdit?.(item)}>
      <div className="item-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="item-card-title truncate">{item.title}</div>
          {item.description && (
            <div className="item-card-description" style={{ marginTop: 4 }}>
              {item.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {showStatus && (
            <div
              className={`status-dot ${item.is_active ? 'active' : 'inactive'}`}
              title={item.is_active ? 'Active' : 'Inactive'}
              onClick={handleToggleActive}
              style={{ cursor: 'pointer' }}
            />
          )}
          <button
            className={`favorite-btn ${item.is_favorite ? 'active' : ''}`}
            onClick={handleFavorite}
            title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={14} fill={item.is_favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Content preview */}
      {item.content && (
        <div style={{ position: 'relative' }}>
          {previewMd && contentHasMd ? (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                maxHeight: 160,
                overflowY: 'auto',
                fontSize: 12,
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{children}</h3>,
                  p: ({ children }) => <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-tertiary)', marginBottom: 6 }}>{children}</p>,
                  code: ({ inline, children }) => inline
                    ? <code style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 3, padding: '0 4px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#00D4FF' }}>{children}</code>
                    : <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '8px 10px', overflow: 'auto', marginBottom: 6 }}><code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{children}</code></pre>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 6 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 6 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-tertiary)', marginBottom: 2 }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{children}</strong>,
                  blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid rgba(0,122,255,0.4)', paddingLeft: 10, color: 'var(--text-quaternary)', fontStyle: 'italic' }}>{children}</blockquote>,
                }}
              >
                {item.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="item-card-content-preview">
              {item.content.slice(0, 200)}{item.content.length > 200 ? '…' : ''}
            </div>
          )}

          {/* Toggle preview button */}
          {contentHasMd && (
            <button
              onClick={handleTogglePreview}
              title={previewMd ? 'Show raw' : 'Preview markdown'}
              style={{
                position: 'absolute', top: 6, right: 6,
                background: previewMd ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${previewMd ? 'rgba(0,122,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 500,
                color: previewMd ? 'var(--blue-light)' : 'var(--text-tertiary)',
                transition: 'all 0.15s',
              }}
            >
              {previewMd ? <EyeOff size={10} /> : <Eye size={10} />}
              {previewMd ? 'Raw' : 'MD'}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="item-card-footer">
        <div className="item-card-meta">
          {item.category && (
            <span className={`category-badge ${item.category}`}>
              {item.category}
            </span>
          )}
          {item.tags?.slice(0, 2).map(tag => (
            <span key={tag.id} className="tag" style={{ borderColor: tag.color + '40', color: tag.color }}>
              {tag.name}
            </span>
          ))}
          {item.tags?.length > 2 && (
            <span className="tag">+{item.tags.length - 2}</span>
          )}
          {showPriority && item.priority > 0 && (
            <span className="tag" style={{ color: 'var(--orange)', borderColor: 'rgba(255,159,10,0.3)' }}>
              P{item.priority}
            </span>
          )}
        </div>

        <div className="item-card-actions">
          {extraActions}
          <button className="btn-icon" onClick={handleCopy} title="Copy content" style={{ padding: 6 }}>
            {copied ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}
          </button>
          <button className="btn-icon" onClick={handleEdit} title="Edit" style={{ padding: 6 }}>
            <Edit2 size={13} />
          </button>
          <button
            className="btn-icon"
            onClick={handleDelete}
            title="Delete"
            style={{ padding: 6, color: 'var(--pink)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Token count + time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 }}>
        {tokenCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: tokenColor,
            fontFamily: 'var(--font-mono)',
            opacity: 0.8,
          }}>
            {formatTokens(tokenCount)}
          </span>
        )}
        {timeAgo && (
          <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
            {timeAgo}
          </span>
        )}
      </div>
    </div>
  )
}
