import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '../utils/api'
import DetailModal from '../components/DetailModal'
import MarkdownEditor from '../components/MarkdownEditor'
import CategorySelector from '../components/CategorySelector'
import toast from 'react-hot-toast'
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'
import {
  StickyNote, Plus, Search, Star, Trash2, Edit3, X,
  LayoutGrid, List, Pin, Maximize2, Minimize2, Kanban, Clock, Columns2,
} from 'lucide-react'

// ── Color presets ──────────────────────────────────────────────
const NOTE_COLORS = [
  { value: '#FFD60A', label: 'Yellow' },
  { value: '#007AFF', label: 'Blue' },
  { value: '#30D158', label: 'Green' },
  { value: '#BF5AF2', label: 'Purple' },
  { value: '#FF9F0A', label: 'Orange' },
  { value: '#FF375F', label: 'Pink' },
  { value: '#5AC8FA', label: 'Teal' },
  { value: '#8E8E93', label: 'Gray' },
]

// ── Strip markdown for card preview ───────────────────────────
function stripMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/>\s*/g, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

// ── Note Card (grid view) ──────────────────────────────────────
function NoteCard({ note, onFavorite, onPin, onEdit, onDelete, onView }) {
  const color = note.color || '#FFD60A'
  const preview = stripMarkdown(note.content)
  const timeAgo = note.updated_at ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }) : ''
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="glass-card"
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        borderTop: `3px solid ${color}`,
      }}
      onMouseEnter={e => {
        setHovered(true)
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}30`
      }}
      onMouseLeave={e => {
        setHovered(false)
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = ''
      }}
      onClick={() => onView?.(note)}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {note.is_pinned && (
              <Pin size={10} color={color} fill={color} style={{ flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word' }}>
              {note.title}
            </span>
            {note.is_favorite && (
              <Star size={11} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0 }} />
            )}
          </div>
          {note.description && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
              {note.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button
            className="btn-icon" style={{ width: 28, height: 28 }}
            onClick={e => { e.stopPropagation(); onPin(note.id) }}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={14} color={note.is_pinned ? color : 'rgba(255,255,255,0.6)'} fill={note.is_pinned ? color : 'none'} />
          </button>
          <button
            className="btn-icon" style={{ width: 28, height: 28 }}
            onClick={e => { e.stopPropagation(); onFavorite(note.id) }}
            title="Favorite"
          >
            <Star size={14} color={note.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.6)'} fill={note.is_favorite ? 'var(--yellow)' : 'none'} />
          </button>
          <button
            className="btn-icon" style={{ width: 28, height: 28 }}
            onClick={e => { e.stopPropagation(); onEdit(note) }}
            title="Edit"
          >
            <Edit3 size={14} color="rgba(255,255,255,0.6)" />
          </button>
          <button
            className="btn-icon" style={{ width: 28, height: 28 }}
            onClick={e => { e.stopPropagation(); onDelete(note.id) }}
            title="Delete"
          >
            <Trash2 size={14} color="rgba(255,55,95,0.8)" />
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ padding: '0 14px 10px' }}>
          <p style={{
            fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}>
            {preview}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4,
        }}>
          {note.category || 'general'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>{timeAgo}</span>
      </div>
    </div>
  )
}

// ── Sticky note rotation (deterministic from id) ──────────────
function noteRotation(id) {
  const sum = (id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return ((sum % 9) - 4) * 0.65 // -2.6 to 2.6 degrees
}

// ── Board Card (sticky note style) ────────────────────────────
function NoteBoardCard({ note, onFavorite, onPin, onEdit, onDelete, onView }) {
  const color = note.color || '#FFD60A'
  const preview = stripMarkdown(note.content)
  const rotation = noteRotation(note.id)
  const timeAgo = note.updated_at ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }) : ''
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderTop: `4px solid ${color}`,
        borderRadius: 10,
        padding: '14px 14px 12px',
        cursor: 'pointer',
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: `0 4px 18px rgba(0,0,0,0.35), 0 0 0 1px ${color}20`,
        breakInside: 'avoid',
        marginBottom: 16,
        display: 'inline-block',
        width: '100%',
      }}
      onMouseEnter={e => {
        setHovered(true)
        e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)'
        e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}50`
        e.currentTarget.style.zIndex = 10
      }}
      onMouseLeave={e => {
        setHovered(false)
        e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1)`
        e.currentTarget.style.boxShadow = `0 4px 18px rgba(0,0,0,0.35), 0 0 0 1px ${color}20`
        e.currentTarget.style.zIndex = 1
      }}
      onClick={() => onView?.(note)}
    >
      {/* Pin icon if pinned */}
      {note.is_pinned && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <Pin size={14} color={color} fill={color} style={{ opacity: 0.9 }} />
        </div>
      )}

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: preview ? 8 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, flex: 1, color: 'var(--text-primary)' }}>
          {note.title}
        </span>
        {note.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />}
      </div>

      {/* Preview */}
      {preview && (
        <p style={{
          fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
          margin: 0,
        }}>
          {preview}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6 }}>
        <span style={{ fontSize: 10, color: `${color}cc`, fontWeight: 500 }}>{note.category || 'general'}</span>
        <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
          <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onPin(note.id)}>
            <Pin size={14} color={note.is_pinned ? color : 'rgba(255,255,255,0.65)'} fill={note.is_pinned ? color : 'none'} />
          </button>
          <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onFavorite(note.id)}>
            <Star size={14} color={note.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.65)'} fill={note.is_favorite ? 'var(--yellow)' : 'none'} />
          </button>
          <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onEdit(note)}>
            <Edit3 size={14} color="rgba(255,255,255,0.65)" />
          </button>
          <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onDelete(note.id)}>
            <Trash2 size={14} color="rgba(255,55,95,0.8)" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post-it Wall card ────────────────────────────────────────
function NotePostItCard({ note, onFavorite, onPin, onEdit, onDelete, onView }) {
  const color = note.color || '#FFD60A'
  const preview = stripMarkdown(note.content)
  const rotation = noteRotation(note.id) * 0.5
  const timeAgo = note.updated_at ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }) : ''
  const ink = 'rgba(0,0,0,0.82)'
  const inkLight = 'rgba(0,0,0,0.45)'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ position: 'relative', paddingTop: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Push pin */}
      <div style={{
        position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
        zIndex: 3, width: 18, height: 18, borderRadius: '50%',
        background: `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.85) 0%, ${color} 40%, rgba(0,0,0,0.55) 100%)`,
        boxShadow: '0 3px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)',
        border: '1px solid rgba(0,0,0,0.25)',
      }} />

      {/* Note body */}
      <div
        style={{
          position: 'relative',
          background: color,
          borderRadius: 3,
          padding: '18px 14px 14px',
          cursor: 'pointer',
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          boxShadow: '3px 5px 18px rgba(0,0,0,0.5), 1px 1px 4px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = `rotate(0deg) translateY(-5px)`
          e.currentTarget.style.boxShadow = '6px 16px 40px rgba(0,0,0,0.65), 2px 3px 8px rgba(0,0,0,0.35)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = `rotate(${rotation}deg) translateY(0)`
          e.currentTarget.style.boxShadow = '3px 5px 18px rgba(0,0,0,0.5), 1px 1px 4px rgba(0,0,0,0.25)'
        }}
        onClick={() => onView?.(note)}
      >
        {/* Folded corner */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 0, height: 0,
          borderStyle: 'solid',
          borderWidth: '0 0 22px 22px',
          borderColor: `transparent transparent rgba(0,0,0,0.22) transparent`,
        }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: preview ? 8 : 4 }}>
          {note.is_pinned && <Pin size={10} color={ink} fill={ink} style={{ flexShrink: 0, marginTop: 2 }} />}
          <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: ink, flex: 1, wordBreak: 'break-word' }}>
            {note.title}
          </span>
          {note.is_favorite && <Star size={10} color="rgba(160,80,0,0.9)" fill="rgba(160,80,0,0.9)" style={{ flexShrink: 0 }} />}
        </div>

        {/* Preview */}
        {preview && (
          <p style={{
            fontSize: 11.5, lineHeight: 1.65, color: inkLight, margin: '0 0 10px',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
          }}>
            {preview}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: inkLight, fontWeight: 500 }}>{note.category || 'general'}</span>
            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', marginLeft: 6 }}>{timeAgo}</span>
          </div>
          <div
            style={{ display: 'flex', gap: 1, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: hovered ? 'auto' : 'none' }}
            onClick={e => e.stopPropagation()}
          >
            {[
              { onClick: () => onPin(note.id), icon: <Pin size={14} color={note.is_pinned ? ink : 'rgba(0,0,0,0.45)'} fill={note.is_pinned ? ink : 'none'} /> },
              { onClick: () => onFavorite(note.id), icon: <Star size={14} color={note.is_favorite ? 'rgba(140,70,0,0.9)' : 'rgba(0,0,0,0.45)'} fill={note.is_favorite ? 'rgba(140,70,0,0.9)' : 'none'} /> },
              { onClick: () => onEdit(note), icon: <Edit3 size={14} color="rgba(0,0,0,0.45)" /> },
              { onClick: () => onDelete(note.id), icon: <Trash2 size={14} color="rgba(140,0,25,0.7)" /> },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none',
                  background: 'rgba(0,0,0,0.1)', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Timeline helpers ─────────────────────────────────────────
function timelineLabel(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isThisWeek(d)) return format(d, 'EEEE') // e.g. "Monday"
  if (isThisMonth(d)) return format(d, 'MMMM d')
  return format(d, 'MMMM d, yyyy')
}

function groupByDate(notes) {
  const groups = []
  const seen = {}
  for (const note of notes) {
    const key = note.updated_at ? format(new Date(note.updated_at), 'yyyy-MM-dd') : 'unknown'
    if (!seen[key]) {
      seen[key] = { label: timelineLabel(note.updated_at || new Date()), notes: [] }
      groups.push(seen[key])
    }
    seen[key].notes.push(note)
  }
  return groups
}

// ── Timeline Note Item ────────────────────────────────────────
function NoteTimelineItem({ note, onFavorite, onPin, onEdit, onDelete, onView }) {
  const color = note.color || '#FFD60A'
  const preview = stripMarkdown(note.content)
  const timeAgo = note.updated_at ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }) : ''
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: color,
          border: `2px solid ${color}`,
          boxShadow: `0 0 8px ${color}80`,
          flexShrink: 0, marginTop: 14, zIndex: 1,
        }} />
        <div style={{ flex: 1, width: 2, background: `linear-gradient(to bottom, ${color}40, transparent)`, minHeight: 20 }} />
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1, marginBottom: 12,
          background: 'var(--glass-bg)',
          border: `1px solid ${color}30`,
          borderRadius: 12, padding: '12px 14px',
          cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          setHovered(true)
          e.currentTarget.style.background = 'var(--glass-bg-hover)'
          e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${color}40`
        }}
        onMouseLeave={e => {
          setHovered(false)
          e.currentTarget.style.background = 'var(--glass-bg)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        onClick={() => onView?.(note)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: preview ? 6 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {note.is_pinned && <Pin size={10} color={color} fill={color} style={{ flexShrink: 0 }} />}
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)' }}>{note.title}</span>
            {note.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0 }} />}
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onPin(note.id)}>
              <Pin size={14} color={note.is_pinned ? color : 'rgba(255,255,255,0.65)'} fill={note.is_pinned ? color : 'none'} />
            </button>
            <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onFavorite(note.id)}>
              <Star size={14} color={note.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.65)'} fill={note.is_favorite ? 'var(--yellow)' : 'none'} />
            </button>
            <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onEdit(note)}>
              <Edit3 size={14} color="rgba(255,255,255,0.65)" />
            </button>
            <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onDelete(note.id)}>
              <Trash2 size={14} color="rgba(255,55,95,0.8)" />
            </button>
          </div>
        </div>
        {preview && (
          <p style={{
            fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0,
          }}>
            {preview}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{
            fontSize: 10, color, fontWeight: 600,
            background: `${color}15`, border: `1px solid ${color}25`,
            padding: '1px 6px', borderRadius: 4,
          }}>{note.category || 'general'}</span>
          <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

// ── Note Row (list view) ───────────────────────────────────────
function NoteListRow({ note, onFavorite, onPin, onEdit, onDelete, onView }) {
  const color = note.color || '#FFD60A'
  const timeAgo = note.updated_at ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }) : ''

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderRadius: 10,
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderLeft: `3px solid ${color}`,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
      onClick={() => onView?.(note)}
    >
      {note.is_pinned && <Pin size={10} color={color} fill={color} style={{ flexShrink: 0 }} />}
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {note.title}
      </span>
      {note.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0 }} />}
      <span style={{
        fontSize: 11, color: 'rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, flexShrink: 0,
      }}>
        {note.category || 'general'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-quaternary)', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
        {timeAgo}
      </span>
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); onPin(note.id) }}>
          <Pin size={14} color={note.is_pinned ? color : 'rgba(255,255,255,0.65)'} fill={note.is_pinned ? color : 'none'} />
        </button>
        <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); onFavorite(note.id) }}>
          <Star size={14} color={note.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.65)'} fill={note.is_favorite ? 'var(--yellow)' : 'none'} />
        </button>
        <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); onEdit(note) }}>
          <Edit3 size={14} color="rgba(255,255,255,0.65)" />
        </button>
        <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); onDelete(note.id) }}>
          <Trash2 size={14} color="rgba(255,55,95,0.75)" />
        </button>
      </div>
    </div>
  )
}

// ── Kanban View ───────────────────────────────────────────────
// Columns by category, note cards stacked vertically
function NoteKanbanView({ notes, onFavorite, onPin, onEdit, onDelete, onView }) {
  const grouped = notes.reduce((acc, note) => {
    const cat = note.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(note)
    return acc
  }, {})

  const COL_COLORS = ['#FFD60A','#007AFF','#30D158','#BF5AF2','#FF9500','#FF375F','#5AC8FA','#FF6B35']

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {Object.entries(grouped).map(([category, catNotes], colIdx) => {
        const colColor = COL_COLORS[colIdx % COL_COLORS.length]
        return (
          <div key={category} style={{ minWidth: 260, maxWidth: 300, flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${colColor}12`, border: `1px solid ${colColor}25`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: colColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: colColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{category}</span>
              <span style={{ fontSize: 11, color: `${colColor}80`, marginLeft: 'auto', background: `${colColor}18`, padding: '1px 7px', borderRadius: 10 }}>{catNotes.length}</span>
            </div>
            {/* Cards */}
            {catNotes.map(note => {
              const noteColor = note.color || colColor
              const preview = stripMarkdown(note.content)
              const timeAgo = note.updated_at ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }) : ''
              return (
                <div key={note.id} className="glass-card"
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.12s', borderLeft: `3px solid ${noteColor}` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${noteColor}20` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  onClick={() => onView?.(note)}>
                  <div style={{ padding: '10px 12px' }}>
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: preview ? 7 : 0 }}>
                      {note.is_pinned && <Pin size={9} color={noteColor} fill={noteColor} style={{ flexShrink: 0, marginTop: 3 }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{note.title}</span>
                      {note.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />}
                    </div>
                    {/* Preview */}
                    {preview && (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 8px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {preview}
                      </p>
                    )}
                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: noteColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: 'var(--text-quaternary)', flex: 1 }}>{timeAgo}</span>
                      <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onPin(note.id)}>
                        <Pin size={10} color={note.is_pinned ? noteColor : 'rgba(255,255,255,0.3)'} fill={note.is_pinned ? noteColor : 'none'} />
                      </button>
                      <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onFavorite(note.id)}>
                        <Star size={10} color={note.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'} fill={note.is_favorite ? 'var(--yellow)' : 'none'} />
                      </button>
                      <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onEdit(note)}>
                        <Edit3 size={10} color="rgba(255,255,255,0.3)" />
                      </button>
                      <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onDelete(note.id)}>
                        <Trash2 size={10} color="rgba(255,55,95,0.5)" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Note Modal (create / edit) ─────────────────────────────────
function NoteModal({ note, onClose, onSave }) {
  const isEdit = !!note?.id
  const [maximized, setMaximized] = useState(false)
  const [form, setForm] = useState({
    title: note?.title || '',
    content: note?.content || '',
    description: note?.description || '',
    category: note?.category || 'general',
    color: note?.color || '#FFD60A',
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    onSave(form)
  }

  const color = form.color || '#FFD60A'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex',
        alignItems: maximized ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: maximized ? 0 : 20,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderTop: `3px solid ${color}`,
        borderRadius: maximized ? 0 : 16,
        width: '100%', maxWidth: maximized ? '100vw' : 620,
        boxShadow: maximized ? 'none' : '0 32px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: maximized ? '100vh' : '90vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${color}22`, border: `1px solid ${color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StickyNote size={16} color={color} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? 'Edit note' : 'New note'}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-icon" onClick={() => setMaximized(m => !m)} title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button className="btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}
        >
          {/* Title */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>TITLE</label>
            <input
              className="form-input"
              placeholder="Note title…"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
          </div>

          {/* Color + Category */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>COLOR</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set('color', c.value)}
                    title={c.label}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: c.value,
                      border: form.color === c.value ? '2px solid rgba(255,255,255,0.9)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.12s',
                      transform: form.color === c.value ? 'scale(1.25)' : 'scale(1)',
                      outline: 'none',
                    }}
                  />
                ))}
                {/* Custom color picker */}
                <label
                  title="Custom color"
                  style={{
                    width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                    background: !NOTE_COLORS.find(c => c.value === form.color)
                      ? form.color
                      : 'linear-gradient(135deg, #FF375F 0%, #BF5AF2 40%, #0A84FF 70%, #30D158 100%)',
                    border: !NOTE_COLORS.find(c => c.value === form.color) ? '2px solid rgba(255,255,255,0.9)' : '2px solid transparent',
                    transform: !NOTE_COLORS.find(c => c.value === form.color) ? 'scale(1.25)' : 'scale(1)',
                    transition: 'transform 0.12s',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => set('color', e.target.value)}
                    style={{
                      position: 'absolute', inset: 0,
                      opacity: 0, width: '100%', height: '100%',
                      cursor: 'pointer', border: 'none', padding: 0,
                    }}
                  />
                </label>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>CATEGORY</label>
              <CategorySelector value={form.category} onChange={v => set('category', v)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
              DESCRIPTION <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              className="form-input"
              placeholder="Brief description…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>CONTENT</label>
            <MarkdownEditor
              value={form.content}
              onChange={v => set('content', v)}
              minHeight={maximized ? 400 : 220}
              showTokens={false}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save changes' : 'Create note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirm dialog ──────────────────────────────────────
function DeleteDialog({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    }}>
      <div className="glass-card" style={{ maxWidth: 380, width: '100%', padding: 24 }}>
        <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>Move to Trash?</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          This note will be moved to trash and can be restored within 5 days.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: 'var(--error)', color: '#fff', borderColor: 'transparent' }}
            onClick={onConfirm}
          >
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function NotesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('notes_view')
    return (saved === 'bento' ? 'postit' : saved) || 'postit'
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const setView = (m) => { setViewMode(m); localStorage.setItem('notes_view', m) }

  const { data, isLoading } = useQuery({
    queryKey: ['notes', search, showFavorites],
    queryFn: () => notesApi.list({ search, favorite: showFavorites ? 'true' : undefined }),
    staleTime: 5000,
  })

  const createMut = useMutation({
    mutationFn: (data) => notesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setModalOpen(false)
      toast.success('Note created')
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => notesApi.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setEditItem(null)
      setModalOpen(false)
      if (viewItem?.id === updated.id) setViewItem(updated)
      toast.success('Note updated')
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => notesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trash-count'] })
      setDeleteConfirm(null)
      toast.success('Note moved to trash')
    },
    onError: (e) => toast.error(e.message),
  })

  const favMut = useMutation({
    mutationFn: (id) => notesApi.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  const pinMut = useMutation({
    mutationFn: (id) => notesApi.togglePin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  const handleSave = (form) => {
    if (editItem?.id) updateMut.mutate({ id: editItem.id, data: form })
    else createMut.mutate(form)
  }

  const openEdit = (note) => { setEditItem(note); setModalOpen(true) }
  const openNew = () => { setEditItem(null); setModalOpen(true) }

  const notes = data?.data || []
  const total = data?.total ?? 0

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <StickyNote size={20} color="#FFD60A" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1 }}>Notes</h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{total} note{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ gap: 7 }}>
          <Plus size={14} /> New note
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Search size={15} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          placeholder="Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 0, flexShrink: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <button
          onClick={() => setShowFavorites(f => !f)}
          className={`filter-chip${showFavorites ? ' active' : ''}`}
          style={showFavorites ? { background: 'rgba(255,214,10,0.12)', borderColor: 'rgba(255,214,10,0.3)', color: '#FFD60A' } : {}}
        >
          <Star size={11} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: 2 }}>
          <button
            className={`btn-icon${viewMode === 'postit' ? ' active' : ''}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            onClick={() => setView('postit')}
            title="Post-it Wall"
          >
            <StickyNote size={13} />
          </button>
          <button
            className={`btn-icon${viewMode === 'board' ? ' active' : ''}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            onClick={() => setView('board')}
            title="Board view"
          >
            <Kanban size={13} />
          </button>
          <button
            className={`btn-icon${viewMode === 'grid' ? ' active' : ''}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            onClick={() => setView('grid')}
            title="Grid view"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            className={`btn-icon${viewMode === 'timeline' ? ' active' : ''}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            onClick={() => setView('timeline')}
            title="Timeline view"
          >
            <Clock size={13} />
          </button>
          <button
            className={`btn-icon${viewMode === 'list' ? ' active' : ''}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            onClick={() => setView('list')}
            title="List view"
          >
            <List size={13} />
          </button>
          <button
            className={`btn-icon${viewMode === 'kanban' ? ' active' : ''}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            onClick={() => setView('kanban')}
            title="Kanban view"
          >
            <Columns2 size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : notes.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 20, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StickyNote size={32} color="rgba(255,214,10,0.5)" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              {search || showFavorites ? 'No results' : 'No notes yet'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 300, lineHeight: 1.6 }}>
              {search || showFavorites
                ? 'Try a different search term or clear the filters.'
                : 'Create your first note to keep ideas, references, and docs organized.'}
            </div>
          </div>
          {!search && !showFavorites && (
            <button className="btn btn-primary" onClick={openNew} style={{ gap: 7 }}>
              <Plus size={14} /> Create first note
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="cards-grid">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onFavorite={id => favMut.mutate(id)}
              onPin={id => pinMut.mutate(id)}
              onEdit={openEdit}
              onDelete={id => setDeleteConfirm(id)}
              onView={n => setViewItem(n)}
            />
          ))}
        </div>
      ) : viewMode === 'board' ? (
        <div style={{
          columnCount: 3, columnGap: 16,
          '@media(max-width:900px)': { columnCount: 2 },
        }}>
          {notes.map(note => (
            <NoteBoardCard
              key={note.id}
              note={note}
              onFavorite={id => favMut.mutate(id)}
              onPin={id => pinMut.mutate(id)}
              onEdit={openEdit}
              onDelete={id => setDeleteConfirm(id)}
              onView={n => setViewItem(n)}
            />
          ))}
        </div>
      ) : viewMode === 'postit' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 28,
          padding: '8px 4px 24px',
        }}>
          {notes.map(note => (
            <NotePostItCard
              key={note.id}
              note={note}
              onFavorite={id => favMut.mutate(id)}
              onPin={id => pinMut.mutate(id)}
              onEdit={openEdit}
              onDelete={id => setDeleteConfirm(id)}
              onView={n => setViewItem(n)}
            />
          ))}
        </div>
      ) : viewMode === 'timeline' ? (
        <div style={{ paddingLeft: 4 }}>
          {groupByDate(notes).map(group => (
            <div key={group.label} style={{ marginBottom: 8 }}>
              {/* Date label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, paddingLeft: 0 }}>
                <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: 2, height: 16,
                    background: 'rgba(255,255,255,0.1)',
                  }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                  color: 'var(--text-tertiary)', textTransform: 'uppercase',
                }}>
                  {group.label}
                </span>
              </div>
              {group.notes.map(note => (
                <NoteTimelineItem
                  key={note.id}
                  note={note}
                  onFavorite={id => favMut.mutate(id)}
                  onPin={id => pinMut.mutate(id)}
                  onEdit={openEdit}
                  onDelete={id => setDeleteConfirm(id)}
                  onView={n => setViewItem(n)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <NoteKanbanView
          notes={notes}
          onFavorite={id => favMut.mutate(id)}
          onPin={id => pinMut.mutate(id)}
          onEdit={openEdit}
          onDelete={id => setDeleteConfirm(id)}
          onView={n => setViewItem(n)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {notes.map(note => (
            <NoteListRow
              key={note.id}
              note={note}
              onFavorite={id => favMut.mutate(id)}
              onPin={id => pinMut.mutate(id)}
              onEdit={openEdit}
              onDelete={id => setDeleteConfirm(id)}
              onView={n => setViewItem(n)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <NoteModal
          note={editItem}
          onClose={() => { setModalOpen(false); setEditItem(null) }}
          onSave={handleSave}
        />
      )}

      {/* Detail modal */}
      {viewItem && (
        <DetailModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={() => { openEdit(viewItem); setViewItem(null) }}
          onDelete={() => { setDeleteConfirm(viewItem.id); setViewItem(null) }}
          onToggleFavorite={id => { favMut.mutate(id); setViewItem(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
          typeLabel="Note"
          typeColor="#FFD60A"
          typeIcon={StickyNote}
          showTokens={false}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <DeleteDialog
          onConfirm={() => deleteMut.mutate(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
