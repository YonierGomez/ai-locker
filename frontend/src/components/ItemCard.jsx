import { Star, Copy, Edit2, Trash2, Check, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import SelectableItem from './SelectableItem'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { estimateTokens, formatTokens, getTokenColor } from '../utils/tokens'
import VariableFillModal, { extractVariables } from './VariableFillModal'

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
  selectable = false,
  selected = false,
  onSelect,
}) {
  const [copied, setCopied] = useState(false)
  const [previewMd, setPreviewMd] = useState(false)
  const [showVarModal, setShowVarModal] = useState(false)

  const hasVars = item.content ? extractVariables(item.content).length > 0 : false

  const handleCopy = async (e) => {
    e.stopPropagation()
    if (hasVars) {
      setShowVarModal(true)
      return
    }
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
    <>
      {showVarModal && (
        <VariableFillModal content={item.content} onClose={() => setShowVarModal(false)} />
      )}
      {/*
        SelectableItem wraps the card.
        When selectable=true its transparent overlay (z-index 5) intercepts ALL child
        clicks automatically — action buttons don't need {!selectable && ...} guards.
        The checkbox (z-index 10) sits above the overlay and is still clickable.
      */}
      <SelectableItem
        id={item.id}
        isSelectActive={selectable}
        selected={selected}
        onSelect={onSelect}
        onNormalClick={() => onView ? onView(item) : onEdit?.(item)}
        className="item-card"
        checkboxPosition="top-left"
        highlightSelected
        style={selected ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)' } : undefined}
      >
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
          <div>
            {previewMd && contentHasMd ? (
              <div
                className="md-preview-box"
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

          <div className="item-card-actions" style={{ opacity: 1 }}>
            {extraActions}
            {contentHasMd && (
              <button
                className="btn-icon"
                onClick={handleTogglePreview}
                title={previewMd ? 'Show raw text' : 'Preview markdown'}
                style={{ padding: 6, color: previewMd ? 'var(--blue-light)' : undefined }}
              >
                {previewMd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
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
          {hasVars && (
            <span style={{ fontSize: 10, color: 'var(--orange)', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 4, padding: '0px 5px', fontWeight: 500 }}>
              {extractVariables(item.content).length} var{extractVariables(item.content).length !== 1 ? 's' : ''}
            </span>
          )}
          {timeAgo && (
            <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
              {timeAgo}
            </span>
          )}
        </div>
      </SelectableItem>
    </>
  )
}
