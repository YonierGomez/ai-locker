import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commandsApi } from '../utils/api'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import toast from 'react-hot-toast'
import {
  TerminalSquare, Plus, Search, Copy, Check, Star, Trash2,
  X, Edit3, RotateCcw,
  LayoutGrid, AlignJustify, Code2, Monitor, Columns2, Zap,
} from 'lucide-react'

// ── Shell/Platform config ─────────────────────────────────────
const SHELLS = ['bash', 'zsh', 'sh', 'fish', 'powershell', 'cmd', 'python', 'ruby', 'node']
const PLATFORMS = ['all', 'linux', 'macos', 'windows']
const SHELL_COLORS = {
  bash: '#30D158', zsh: '#007AFF', sh: '#5AC8FA', fish: '#FF9500',
  powershell: '#BF5AF2', cmd: '#8E8E93', python: '#FFD60A', ruby: '#FF375F', node: '#30D158',
}
const PLATFORM_ICONS = { all: '🌐', linux: '🐧', macos: '', windows: '🪟' }

// ── View modes ────────────────────────────────────────────────
const VIEW_MODES = [
  { id: 'grid',      icon: LayoutGrid,   label: 'Grid' },
  { id: 'compact',   icon: AlignJustify, label: 'Compact' },
  { id: 'code',      icon: Code2,        label: 'Code' },
  { id: 'terminal',  icon: Monitor,      label: 'Terminal' },
  { id: 'kanban',    icon: Columns2,     label: 'Kanban' },
  { id: 'spotlight', icon: Zap,          label: 'Spotlight' },
]

// ── Copy hook ─────────────────────────────────────────────────
function useCopy(text, onCopy) {
  const [copied, setCopied] = useState(false)
  const handle = (e) => {
    e?.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      onCopy?.()
    })
  }
  return { copied, handle }
}

// ── 1. Grid Card ──────────────────────────────────────────────
function CommandCardGrid({ cmd, onCopy, onFavorite, onEdit, onDelete, onView }) {
  const { copied, handle: handleCopy } = useCopy(cmd.command, () => onCopy?.(cmd.id))
  const shellColor = SHELL_COLORS[cmd.shell] || '#8E8E93'

  return (
    <div className="glass-card" data-item-id={cmd.id} style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      onClick={() => onView?.(cmd)}>
      <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: '1px solid var(--c-divider)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{cmd.title}</span>
            {cmd.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
          </div>
          {cmd.description && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>{cmd.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} data-no-select="true">
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={e => { e.stopPropagation(); onFavorite(cmd.id) }}>
            <Star size={12} color={cmd.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'} fill={cmd.is_favorite ? 'var(--yellow)' : 'none'} />
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={e => { e.stopPropagation(); onEdit(cmd) }}>
            <Edit3 size={12} color="rgba(255,255,255,0.3)" />
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={e => { e.stopPropagation(); onDelete(cmd.id) }}>
            <Trash2 size={12} color="rgba(255,55,95,0.5)" />
          </button>
        </div>
      </div>
      <div style={{ background: 'var(--c-code-bg)', padding: '10px 14px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: 'var(--c-icon-sm)', marginLeft: 4 }}>
            {cmd.shell} {PLATFORM_ICONS[cmd.platform] || ''} {cmd.platform !== 'all' ? cmd.platform : ''}
          </span>
        </div>
        <pre style={{ margin: 0, fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code','SF Mono',monospace", fontSize: 12.5, lineHeight: 1.6, color: shellColor, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 120, overflowY: 'auto' }}>
          <span style={{ color: 'var(--c-icon-sm)', userSelect: 'none' }}>$ </span>{cmd.command}
        </pre>
        <button onClick={handleCopy} style={{ position: 'absolute', right: 10, bottom: 10, background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${copied ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: copied ? '#30D158' : 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.015)' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: shellColor, background: `${shellColor}18`, padding: '2px 7px', borderRadius: 4 }}>{cmd.shell}</span>
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '2px 7px', borderRadius: 4 }}>{cmd.category}</span>
        {cmd.use_count > 0 && <span style={{ fontSize: 10, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>used {cmd.use_count}×</span>}
      </div>
    </div>
  )
}

// ── 2. Compact View ───────────────────────────────────────────
// Dense cards: 2-3 columns, minimal height, command prominent
function CommandCardCompact({ cmd, onCopy, onFavorite, onEdit, onDelete, onView }) {
  const { copied, handle: handleCopy } = useCopy(cmd.command, () => onCopy?.(cmd.id))
  const shellColor = SHELL_COLORS[cmd.shell] || '#8E8E93'

  return (
    <div className="glass-card" data-item-id={cmd.id} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 1px ${shellColor}30`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      onClick={() => onView?.(cmd)}>
      {/* Color accent top bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${shellColor}, ${shellColor}40)` }} />
      <div style={{ padding: '10px 12px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.title}</span>
          {cmd.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0 }} />}
        </div>
        {/* Command */}
        <div style={{ background: 'var(--c-code-bg)', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
          <code style={{ fontSize: 11, color: shellColor, fontFamily: "'JetBrains Mono','Fira Code',monospace", display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--text-quaternary)', userSelect: 'none' }}>$ </span>{cmd.command}
          </code>
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: shellColor, background: `${shellColor}18`, padding: '1px 5px', borderRadius: 3 }}>{cmd.shell}</span>
          {cmd.category && <span style={{ fontSize: 9, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '1px 5px', borderRadius: 3 }}>{cmd.category}</span>}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 1 }} data-no-select="true" onClick={e => e.stopPropagation()}>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={handleCopy}>
              {copied ? <Check size={10} color="#30D158" /> : <Copy size={10} color="rgba(255,255,255,0.3)" />}
            </button>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onFavorite(cmd.id)}>
              <Star size={10} color={cmd.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'} fill={cmd.is_favorite ? 'var(--yellow)' : 'none'} />
            </button>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onEdit(cmd)}>
              <Edit3 size={10} color="rgba(255,255,255,0.3)" />
            </button>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onDelete(cmd.id)}>
              <Trash2 size={10} color="rgba(255,55,95,0.5)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 3. Code View ──────────────────────────────────────────────
// Grouped by category, terminal-style lines
function CommandCodeView({ commands, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const grouped = commands.reduce((acc, cmd) => {
    const cat = cmd.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(cmd)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(grouped).map(([category, cmds]) => (
        <div key={category}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 1, flex: 1, background: 'var(--c-divider)' }} />
            {category}
            <div style={{ height: 1, flex: 1, background: 'var(--c-divider)' }} />
          </div>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {cmds.map((cmd, idx) => (
              <CodeRow key={cmd.id} cmd={cmd} isLast={idx === cmds.length - 1}
                onCopy={onCopy} onFavorite={onFavorite} onEdit={onEdit} onDelete={onDelete} onView={onView}
                selectMode={selectMode} selectedIds={selectedIds} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CodeRow({ cmd, isLast, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const { copied, handle: handleCopy } = useCopy(cmd.command, () => onCopy?.(cmd.id))
  const shellColor = SHELL_COLORS[cmd.shell] || '#8E8E93'
  const isSelected = selectedIds?.has(cmd.id)
  const isSelectActive = selectMode || (selectedIds?.size > 0)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)', background: isSelected ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: isSelected ? 'transparent' : 'var(--c-code-bg)', cursor: 'pointer', outline: isSelected ? '2px solid var(--blue)' : 'none', outlineOffset: -2 }}
        onClick={() => isSelectActive ? onSelect?.(cmd.id) : onView?.(cmd)}>
        {isSelectActive && (
          <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 12px' }}>
            {isSelected && <Check size={10} color="white" strokeWidth={3} />}
          </div>
        )}
        <div style={{ width: 4, alignSelf: 'stretch', background: shellColor, opacity: 0.6, flexShrink: 0 }} />
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-quaternary)', fontFamily: 'monospace', userSelect: 'none', flexShrink: 0, marginTop: 1 }}>$</span>
          <pre style={{ margin: 0, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12.5, color: shellColor, whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1, lineHeight: 1.5 }}>
            {cmd.command}
          </pre>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {cmd.title && <span style={{ fontSize: 10, color: 'var(--c-tick)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.title}</span>}
          <span style={{ fontSize: 10, color: shellColor, background: `${shellColor}15`, padding: '1px 6px', borderRadius: 4 }}>{cmd.shell}</span>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={handleCopy}>
            {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} color="rgba(255,255,255,0.3)" />}
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onFavorite(cmd.id)}>
            <Star size={11} color={cmd.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'} fill={cmd.is_favorite ? 'var(--yellow)' : 'none'} />
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onEdit(cmd)}>
            <Edit3 size={11} color="rgba(255,255,255,0.3)" />
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onDelete(cmd.id)}>
            <Trash2 size={11} color="rgba(255,55,95,0.5)" />
          </button>
        </div>
      </div>
      {cmd.description && (
        <div style={{ padding: '4px 14px 4px 26px', fontSize: 11, color: 'var(--text-quaternary)', background: 'var(--c-surface)', fontStyle: 'italic' }}>
          # {cmd.description}
        </div>
      )}
    </div>
  )
}

// ── 4. Terminal View ──────────────────────────────────────────
// Full terminal window simulation — all commands in one session
function CommandTerminalView({ commands, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const [activeShell, setActiveShell] = useState(null)
  const shells = [...new Set(commands.map(c => c.shell))].filter(Boolean)
  const filtered = activeShell ? commands.filter(c => c.shell === activeShell) : commands

  return (
    <div>
      {/* Terminal window */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', background: 'rgba(10,10,12,0.95)' }}>
        {/* Title bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--c-surface-hover)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-surface)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--c-icon)', flex: 1, textAlign: 'center', fontFamily: 'monospace' }}>
            terminal — {filtered.length} command{filtered.length !== 1 ? 's' : ''}
          </span>
          {/* Shell tabs */}
          {shells.length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setActiveShell(null)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: !activeShell ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', color: !activeShell ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>all</button>
              {shells.map(s => {
                const color = SHELL_COLORS[s] || '#8E8E93'
                return (
                  <button key={s} onClick={() => setActiveShell(activeShell === s ? null : s)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: activeShell === s ? `${color}25` : 'rgba(255,255,255,0.04)', color: activeShell === s ? color : 'rgba(255,255,255,0.35)' }}>{s}</button>
                )
              })}
            </div>
          )}
        </div>

        {/* Terminal body */}
        <div style={{ padding: '16px 20px', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 13, lineHeight: 1.8 }}>
          {/* Welcome line */}
          <div style={{ color: 'var(--text-quaternary)', marginBottom: 12, fontSize: 11 }}>
            Last login: {new Date().toDateString()} — AI Locker Command Library
          </div>

          {filtered.map((cmd, idx) => (
            <TerminalLine key={cmd.id} cmd={cmd} idx={idx}
              onCopy={onCopy} onFavorite={onFavorite} onEdit={onEdit} onDelete={onDelete} onView={onView}
              selectMode={selectMode} selectedIds={selectedIds} onSelect={onSelect} />
          ))}

          {/* Blinking cursor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: '#30D158', fontSize: 13 }}>❯</span>
            <span style={{ display: 'inline-block', width: 8, height: 16, background: 'rgba(255,255,255,0.6)', animation: 'blink 1s step-end infinite', borderRadius: 1 }} />
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}

function TerminalLine({ cmd, idx, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const { copied, handle: handleCopy } = useCopy(cmd.command, () => onCopy?.(cmd.id))
  const shellColor = SHELL_COLORS[cmd.shell] || '#30D158'
  const [hovered, setHovered] = useState(false)
  const isSelected = selectedIds?.has(cmd.id)
  const isSelectActive = selectMode || (selectedIds?.size > 0)

  return (
    <div style={{ marginBottom: 2, background: isSelected ? 'rgba(0,122,255,0.08)' : undefined, borderRadius: 4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {/* Comment / title line */}
      {cmd.title && (
        <div style={{ color: 'var(--c-icon-sm)', fontSize: 11, marginBottom: 1 }}>
          # {cmd.title}{cmd.description ? ` — ${cmd.description}` : ''}
        </div>
      )}
      {/* Command line */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', borderRadius: 4, padding: '2px 4px', margin: '0 -4px', background: hovered && !isSelected ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.1s', outline: isSelected ? '1px solid var(--blue)' : 'none', outlineOffset: 1 }}
        onClick={() => isSelectActive ? onSelect?.(cmd.id) : onView?.(cmd)}>
        {isSelectActive && (
          <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.3)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
            {isSelected && <Check size={9} color="white" strokeWidth={3} />}
          </div>
        )}
        <span style={{ color: shellColor, userSelect: 'none', flexShrink: 0 }}>❯</span>
        <pre style={{ margin: 0, color: shellColor, whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1, fontSize: 13, lineHeight: 1.6 }}>
          {cmd.command}
        </pre>
        {/* Inline actions on hover */}
        {hovered && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={handleCopy}>
              {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} color="rgba(255,255,255,0.4)" />}
            </button>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => onFavorite(cmd.id)}>
              <Star size={11} color={cmd.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.4)'} fill={cmd.is_favorite ? 'var(--yellow)' : 'none'} />
            </button>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => onEdit(cmd)}>
              <Edit3 size={11} color="rgba(255,255,255,0.4)" />
            </button>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => onDelete(cmd.id)}>
              <Trash2 size={11} color="rgba(255,55,95,0.5)" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 5. Kanban View ────────────────────────────────────────────
// Columns by category, cards stacked vertically
function CommandKanbanView({ commands, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const grouped = commands.reduce((acc, cmd) => {
    const cat = cmd.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(cmd)
    return acc
  }, {})

  const CAT_COLORS = ['#007AFF','#BF5AF2','#FF9500','#30D158','#FF375F','#5AC8FA','#FFD60A','#FF6B35']

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {Object.entries(grouped).map(([category, cmds], colIdx) => {
        const colColor = CAT_COLORS[colIdx % CAT_COLORS.length]
        return (
          <div key={category} style={{ minWidth: 280, maxWidth: 320, flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${colColor}12`, border: `1px solid ${colColor}25`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: colColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: colColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{category}</span>
              <span style={{ fontSize: 11, color: `${colColor}80`, marginLeft: 'auto', background: `${colColor}18`, padding: '1px 7px', borderRadius: 10 }}>{cmds.length}</span>
            </div>
            {/* Cards */}
            {cmds.map(cmd => (
              <KanbanCard key={cmd.id} cmd={cmd} colColor={colColor}
                onCopy={onCopy} onFavorite={onFavorite} onEdit={onEdit} onDelete={onDelete} onView={onView}
                selectMode={selectMode} selectedIds={selectedIds} onSelect={onSelect} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ cmd, colColor, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const { copied, handle: handleCopy } = useCopy(cmd.command, () => onCopy?.(cmd.id))
  const shellColor = SHELL_COLORS[cmd.shell] || '#8E8E93'
  const isSelected = selectedIds?.has(cmd.id)
  const isSelectActive = selectMode || (selectedIds?.size > 0)

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.12s', outline: isSelected ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: isSelected ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${colColor}20` } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' } }}
      onClick={() => isSelectActive ? onSelect?.(cmd.id) : onView?.(cmd)}>
          {/* Left accent */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: 3, background: isSelected ? 'var(--blue)' : colColor, opacity: isSelected ? 1 : 0.7, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '10px 12px' }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{cmd.title}</span>
            {cmd.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />}
          </div>
          {/* Command preview */}
          <div style={{ background: 'var(--c-code-bg)', borderRadius: 5, padding: '5px 8px', marginBottom: 8 }}>
            <code style={{ fontSize: 10.5, color: shellColor, fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              $ {cmd.command}
            </code>
          </div>
          {cmd.description && (
            <p style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 8, lineHeight: 1.4 }}>{cmd.description}</p>
          )}
          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 9, color: shellColor, background: `${shellColor}15`, padding: '1px 5px', borderRadius: 3 }}>{cmd.shell}</span>
            {cmd.use_count > 0 && <span style={{ fontSize: 9, color: 'var(--text-quaternary)' }}>{cmd.use_count}×</span>}
            <div style={{ flex: 1 }} />
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={handleCopy}>
              {copied ? <Check size={10} color="#30D158" /> : <Copy size={10} color="rgba(255,255,255,0.3)" />}
            </button>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onFavorite(cmd.id)}>
              <Star size={10} color={cmd.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'} fill={cmd.is_favorite ? 'var(--yellow)' : 'none'} />
            </button>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onEdit(cmd)}>
              <Edit3 size={10} color="rgba(255,255,255,0.3)" />
            </button>
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onDelete(cmd.id)}>
              <Trash2 size={10} color="rgba(255,55,95,0.5)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 6. Spotlight View ─────────────────────────────────────────
// macOS Spotlight-style: list on left, large preview on right
function CommandSpotlightView({ commands, onCopy, onFavorite, onEdit, onDelete, onView, selectMode, selectedIds, onSelect }) {
  const [selected, setSelected] = useState(commands[0] || null)
  const [spotSearch, setSpotSearch] = useState('')
  const inputRef = useRef(null)
  const shellColor = selected ? (SHELL_COLORS[selected.shell] || '#30D158') : '#30D158'

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = spotSearch
    ? commands.filter(c =>
        c.title?.toLowerCase().includes(spotSearch.toLowerCase()) ||
        c.command?.toLowerCase().includes(spotSearch.toLowerCase()) ||
        c.category?.toLowerCase().includes(spotSearch.toLowerCase())
      )
    : commands

  useEffect(() => {
    if (filtered.length > 0 && (!selected || !filtered.find(c => c.id === selected?.id))) {
      setSelected(filtered[0])
    }
  }, [spotSearch])

  const { copied, handle: handleCopy } = useCopy(selected?.command || '', () => onCopy?.(selected?.id))

  const handleKey = (e) => {
    if (!filtered.length) return
    const idx = filtered.findIndex(c => c.id === selected?.id)
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(filtered[Math.min(idx + 1, filtered.length - 1)]) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(filtered[Math.max(idx - 1, 0)]) }
    if (e.key === 'Enter' && selected) { onView?.(selected) }
  }

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 500 }}>
      {/* Search bar */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-surface-hover)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-surface)' }}>
        <Search size={16} color="rgba(255,255,255,0.4)" />
        <input
          ref={inputRef}
          value={spotSearch}
          onChange={e => setSpotSearch(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search commands…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', fontFamily: 'inherit' }}
        />
        {spotSearch && (
          <button onClick={() => setSpotSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-tick)', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', background: 'var(--c-divider)', padding: '2px 7px', borderRadius: 5 }}>{filtered.length}</span>
      </div>

      {/* Body: list + preview — stacks vertically on mobile */}
      <style>{`
        .spotlight-body { display: flex; flex: 1; min-height: 0; }
        .spotlight-list { width: 260px; border-right: 1px solid rgba(255,255,255,0.06); overflow-y: auto; flex-shrink: 0; }
        .spotlight-preview { flex: 1; padding: 24px 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        @media (max-width: 640px) {
          .spotlight-body { flex-direction: column; }
          .spotlight-list { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); max-height: 220px; }
          .spotlight-preview { padding: 16px; }
        }
      `}</style>
      <div className="spotlight-body">
        {/* Left: results list */}
        <div className="spotlight-list">
          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-quaternary)', fontSize: 12 }}>No results</div>
          )}
          {filtered.map(cmd => {
            const isActive = selected?.id === cmd.id
            const sc = SHELL_COLORS[cmd.shell] || '#8E8E93'
            return (
              <div key={cmd.id}
                onClick={() => (selectMode || selectedIds?.size > 0) ? onSelect?.(cmd.id) : setSelected(cmd)}
                style={{ padding: '9px 14px', cursor: 'pointer', background: selectedIds?.has(cmd.id) ? 'color-mix(in srgb, var(--blue) 12%, transparent)' : isActive ? 'rgba(0,122,255,0.12)' : 'transparent', borderLeft: selectedIds?.has(cmd.id) ? '2px solid var(--blue)' : isActive ? '2px solid #007AFF' : '2px solid transparent', transition: 'background 0.1s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(selectMode || selectedIds?.size > 0) && (
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selectedIds?.has(cmd.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds?.has(cmd.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selectedIds?.has(cmd.id) && <Check size={9} color="white" strokeWidth={3} />}
                      </div>
                    )}
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)' }}>{cmd.title}</span>
                    {cmd.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
                  </div>
                <div style={{ fontSize: 10, color: 'var(--c-tick)', fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                  {cmd.command}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: preview */}
        {selected ? (
          <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title + actions */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, margin: 0 }}>{selected.title}</h2>
                  {selected.is_favorite && <Star size={14} color="var(--yellow)" fill="var(--yellow)" />}
                </div>
                {selected.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>{selected.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-glass btn-sm" onClick={() => onFavorite(selected.id)} style={{ gap: 5 }}>
                  <Star size={12} color={selected.is_favorite ? 'var(--yellow)' : undefined} fill={selected.is_favorite ? 'var(--yellow)' : 'none'} />
                </button>
                <button className="btn btn-glass btn-sm" onClick={() => onEdit(selected)} style={{ gap: 5 }}>
                  <Edit3 size={12} /> Edit
                </button>
                <button className="btn btn-glass btn-sm" onClick={() => onDelete(selected.id)} style={{ gap: 5, color: '#FF375F' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Command block */}
            <div style={{ background: 'var(--c-code-bg-deep)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${shellColor}20` }}>
              <div style={{ padding: '8px 14px', borderBottom: `1px solid ${shellColor}15`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
                </div>
                <span style={{ fontSize: 11, color: 'var(--c-tick)', fontFamily: 'monospace', flex: 1 }}>{selected.shell} — {selected.platform !== 'all' ? selected.platform : 'all platforms'}</span>
                <button onClick={handleCopy} style={{ background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${copied ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: copied ? '#30D158' : 'rgba(255,255,255,0.6)' }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <pre style={{ margin: 0, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 14, color: shellColor, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
                  <span style={{ color: 'var(--text-quaternary)', userSelect: 'none' }}>$ </span>{selected.command}
                </pre>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--c-surface)', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 3 }}>SHELL</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: shellColor }}>{selected.shell}</span>
              </div>
              <div style={{ background: 'var(--c-surface)', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 3 }}>CATEGORY</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.category || '—'}</span>
              </div>
              <div style={{ background: 'var(--c-surface)', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 3 }}>PLATFORM</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{PLATFORM_ICONS[selected.platform]} {selected.platform}</span>
              </div>
              {selected.use_count > 0 && (
                <div style={{ background: 'var(--c-surface)', borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 3 }}>USED</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.use_count}×</span>
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            <div style={{ fontSize: 10, color: 'var(--text-quaternary)', display: 'flex', gap: 12 }}>
              <span>↑↓ navigate</span>
              <span>↵ open detail</span>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quaternary)', fontSize: 13 }}>
            Select a command to preview
          </div>
        )}
      </div>
    </div>
  )
}

// ── Command Modal ─────────────────────────────────────────────
function CommandModal({ cmd, onClose, onSave, fullscreen: initialFullscreen = false }) {
  const isEdit = !!cmd?.id
  const [form, setForm] = useState({
    title: cmd?.title || '',
    command: cmd?.command || '',
    description: cmd?.description || '',
    shell: cmd?.shell || 'bash',
    platform: cmd?.platform || 'all',
    category: cmd?.category || 'general',
  })
  const cmdRef = useRef(null)

  useEffect(() => { cmdRef.current?.focus() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.command.trim()) {
      toast.error('Title and command are required')
      return
    }
    onSave(form)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit command' : 'New command'}
      fullscreen={initialFullscreen}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" form="command-modal-form" style={{ gap: 7 }}>
            <TerminalSquare size={13} />
            {isEdit ? 'Save changes' : 'Create command'}
          </button>
        </>
      }
    >
        <form id="command-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowX: 'hidden' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>TITLE</label>
            <input className="form-input" placeholder="E.g.: List processes on port…" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>COMMAND</label>
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--c-border-md)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--c-divider)', display: 'flex', gap: 5 }}>
                {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                <span style={{ fontSize: 10, color: 'var(--text-quaternary)', marginLeft: 6 }}>{form.shell}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 12px', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--c-icon-sm)', fontFamily: 'monospace', marginTop: 1, userSelect: 'none' }}>$</span>
                <textarea
                  className="cmd-command-textarea"
                  ref={cmdRef}
                  placeholder="lsof -i :3000 | grep LISTEN"
                  value={form.command}
                  onChange={e => set('command', e.target.value)}
                  rows={3}
                  style={{ background: 'transparent', border: 'none', outline: 'none', padding: 0, resize: 'vertical', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12.5, color: SHELL_COLORS[form.shell] || '#30D158', flex: 1, width: '100%', minWidth: 0 }}
                />
              </div>
            </div>
          </div>
          <div className="form-grid-2col" style={{ gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>SHELL</label>
              <select className="form-select" value={form.shell} onChange={e => set('shell', e.target.value)}>
                {SHELLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>PLATFORM</label>
              <select className="form-select" value={form.platform} onChange={e => set('platform', e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>CATEGORY</label>
            <input className="form-input" placeholder="git, docker, npm, kubernetes…" value={form.category} onChange={e => set('category', e.target.value.toLowerCase().trim())} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>DESCRIPTION <span style={{ color: 'var(--text-quaternary)' }}>(optional)</span></label>
            <input className="form-input" placeholder="What does this command do?" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function CommandsPage() {
  const qc = useQueryClient()
  const searchRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filterShell, setFilterShell] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('commands-view') || 'grid')
  const [modal, setModal] = useState(null)
  const [viewCmd, setViewCmd] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const setView = (mode) => {
    setViewMode(mode)
    localStorage.setItem('commands-view', mode)
    setSelectedIds(new Set())
    setSelectMode(false)
  }
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelectedIds(new Set(commands.map(c => c.id)))
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => commandsApi.delete(id)))
      invalidate(); qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success(`${selectedIds.size} command${selectedIds.size !== 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }
  const handleBulkFavorite = async () => {
    try {
      await Promise.all([...selectedIds].map(id => commandsApi.toggleFavorite(id)))
      invalidate()
      toast.success(`Updated ${selectedIds.size}`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) }
  }

  useEffect(() => {
    const handler = e => {
      if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault(); searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['commands', { search, shell: filterShell, platform: filterPlatform, category: filterCategory, favorite: showFavOnly }],
    queryFn: () => commandsApi.list({
      search: search || undefined,
      shell: filterShell || undefined,
      platform: filterPlatform || undefined,
      category: filterCategory || undefined,
      favorite: showFavOnly ? 'true' : undefined,
    }),
    staleTime: 10000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['commands'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }

  const createMut = useMutation({ mutationFn: commandsApi.create, onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['trash'] }); setModal(null); toast.success('Command created') } })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => commandsApi.update(id, data), onSuccess: () => { invalidate(); setModal(null); toast.success('Command updated') } })
  const favMut = useMutation({
    mutationFn: commandsApi.toggleFavorite,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['commands'] })
      const prev = qc.getQueriesData({ queryKey: ['commands'] })
      qc.setQueriesData({ queryKey: ['commands'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(c => c.id === id ? { ...c, is_favorite: !c.is_favorite } : c) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => { if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val)) },
    onSettled: invalidate,
  })
  const useMut = useMutation({
    mutationFn: commandsApi.incrementUse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commands'] }),
  })
  const deleteMut = useMutation({
    mutationFn: commandsApi.delete,
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['trash'] })
      qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success('Moved to trash')
    },
  })

  const handleSave = useCallback((form) => {
    if (modal?.cmd?.id) updateMut.mutate({ id: modal.cmd.id, data: form })
    else createMut.mutate(form)
  }, [modal])

  const commands = data?.data || []
  const total = data?.total || 0

  const { data: allData } = useQuery({ queryKey: ['commands', {}], queryFn: () => commandsApi.list({}), staleTime: 30000 })
  const allCategories = [...new Set((allData?.data || []).map(c => c.category))].filter(Boolean).sort()
  const allShells = [...new Set((allData?.data || []).map(c => c.shell))].filter(Boolean).sort()

  const isSelectActive = selectMode || selectedIds.size > 0

  const commonProps = {
    onCopy: id => useMut.mutate(id),
    onFavorite: id => favMut.mutate(id),
    onEdit: cmd => setModal({ cmd }),
    onDelete: id => deleteMut.mutate(id),
    // Disable onView when select mode is active so cards don't open detail modal
    onView: isSelectActive ? undefined : setViewCmd,
  }

  return (
    <div className="page-content">
      {/* ── Toolbar (single row, like Skills) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input ref={searchRef} placeholder="Search commands… (press / to focus)" value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-tick)', display: 'flex', padding: 0, flexShrink: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
        {/* View mode toggle */}
        <div style={{ display: 'flex', background: 'var(--c-surface)', borderRadius: 10, padding: 3, gap: 2 }}>
          {VIEW_MODES.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id)} title={label}
              style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button className={`btn btn-glass btn-sm ${isSelectActive ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (isSelectActive) clearSelection() }}
          style={isSelectActive ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)', gap: 5 } : { gap: 5 }}>
          <Check size={13} /> Select
        </button>
        <button className="btn btn-primary" onClick={() => setModal({})} style={{ gap: 7 }}>
          <Plus size={14} /> New command
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 12, flexWrap: 'wrap' }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>{selectedIds.size} selected</span>
          <button className="btn btn-glass btn-sm" onClick={selectAll} style={{ gap: 5 }}>Select all {commands.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-glass btn-sm" onClick={handleBulkFavorite} style={{ gap: 5 }}><Star size={12} /> Toggle favorite</button>
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting} style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}><Trash2 size={12} /> Delete selected</button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto', gap: 5 }}>Cancel</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <button onClick={() => setShowFavOnly(v => !v)} className={`filter-chip${showFavOnly ? ' active' : ''}`}
          style={showFavOnly ? { background: 'rgba(255,214,10,0.12)', borderColor: 'rgba(255,214,10,0.3)', color: '#FFD60A' } : {}}>
          <Star size={11} fill={showFavOnly ? 'currentColor' : 'none'} /> Favorites
        </button>
        {allShells.length > 1 && allShells.map(s => {
          const active = filterShell === s
          const color = SHELL_COLORS[s] || '#8E8E93'
          return (
            <button key={s} onClick={() => setFilterShell(active ? '' : s)} className={`filter-chip${active ? ' active' : ''}`}
              style={active ? { background: `${color}18`, borderColor: `${color}50`, color } : {}}>{s}</button>
          )
        })}
        {allShells.length > 1 && <div style={{ width: 1, height: 16, background: 'var(--c-border)', margin: '0 2px' }} />}
        {['linux', 'macos', 'windows'].map(p => (
          <button key={p} onClick={() => setFilterPlatform(filterPlatform === p ? '' : p)} className={`filter-chip${filterPlatform === p ? ' active' : ''}`}>
            {PLATFORM_ICONS[p]} {p}
          </button>
        ))}
        {allCategories.length > 0 && <div style={{ width: 1, height: 16, background: 'var(--c-border)', margin: '0 2px' }} />}
        {allCategories.map(cat => (
          <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)} className={`filter-chip${filterCategory === cat ? ' active' : ''}`}
            style={filterCategory === cat ? { background: 'rgba(191,90,242,0.12)', borderColor: 'rgba(191,90,242,0.35)', color: '#BF5AF2' } : {}}>{cat}</button>
        ))}
        {(filterShell || filterPlatform || filterCategory || showFavOnly) && (
          <button className="btn btn-glass btn-sm" onClick={() => { setFilterShell(''); setFilterPlatform(''); setFilterCategory(''); setShowFavOnly(false) }} style={{ gap: 5, marginLeft: 'auto' }}>
            <RotateCcw size={11} /> Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && commands.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 20, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TerminalSquare size={32} color="rgba(48,209,88,0.5)" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              {search || filterShell || filterPlatform || filterCategory ? 'No results' : 'No commands yet'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 300, lineHeight: 1.6 }}>
              {search || filterShell || filterPlatform || filterCategory
                ? 'Try a different term or clear the filters.'
                : 'Save your favorite terminal commands to have them always at hand.'}
            </div>
          </div>
          {!search && !filterShell && !filterPlatform && !filterCategory && (
            <button className="btn btn-primary" onClick={() => setModal({})} style={{ gap: 7 }}>
              <Plus size={14} /> Save first command
            </button>
          )}
        </div>
      )}

      {/* All views wrapped with SelectOverlay for universal select support */}
      {commands.length > 0 && (
        <div style={{ position: 'relative' }}>
          {viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))', gap: 14 }}>
              {commands.map(cmd => (
                <CommandCardGrid key={cmd.id} cmd={cmd} {...commonProps} />
              ))}
            </div>
          )}

          {viewMode === 'compact' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 8 }}>
              {commands.map(cmd => (
                <CommandCardCompact key={cmd.id} cmd={cmd} {...commonProps} />
              ))}
            </div>
          )}

          {viewMode === 'code' && (
            <CommandCodeView commands={commands} {...commonProps} selectMode={selectMode} selectedIds={selectedIds} onSelect={(id) => { toggleSelect(id); setSelectMode(true) }} />
          )}

          {viewMode === 'terminal' && (
            <CommandTerminalView commands={commands} {...commonProps} selectMode={selectMode} selectedIds={selectedIds} onSelect={(id) => { toggleSelect(id); setSelectMode(true) }} />
          )}

          {viewMode === 'kanban' && (
            <CommandKanbanView commands={commands} {...commonProps} selectMode={selectMode} selectedIds={selectedIds} onSelect={(id) => { toggleSelect(id); setSelectMode(true) }} />
          )}

          {viewMode === 'spotlight' && (
            <CommandSpotlightView commands={commands} {...commonProps} selectMode={selectMode} selectedIds={selectedIds} onSelect={(id) => { toggleSelect(id); setSelectMode(true) }} />
          )}
        </div>
      )}

      {/* Edit Modal */}
      {modal !== null && (
        <CommandModal cmd={modal.cmd} onClose={() => setModal(null)} onSave={handleSave} fullscreen={modal.fullscreen} />
      )}

      {/* Detail view */}
      {viewCmd && (
        <DetailModal
          item={viewCmd}
          typeLabel="Command"
          typeColor="#5AC8FA"
          typeIcon={TerminalSquare}
          onClose={() => setViewCmd(null)}
          onEdit={(cmd, fullscreen) => { setViewCmd(null); setModal({ cmd, fullscreen }) }}
          onDelete={(id) => { setViewCmd(null); deleteMut.mutate(id) }}
          onToggleFavorite={(id) => { favMut.mutate(id); setViewCmd(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
        />
      )}
    </div>
  )
}
