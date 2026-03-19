import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commandsApi } from '../utils/api'
import DetailModal from '../components/DetailModal'
import toast from 'react-hot-toast'
import {
  TerminalSquare, Plus, Search, Copy, Check, Star, Trash2,
  X, ChevronDown, Filter, Edit3, RotateCcw, Maximize2, Minimize2
} from 'lucide-react'

// ── Shell/Platform config ─────────────────────────────────────
const SHELLS = ['bash', 'zsh', 'sh', 'fish', 'powershell', 'cmd', 'python', 'ruby', 'node']
const PLATFORMS = ['all', 'linux', 'macos', 'windows']
const SHELL_COLORS = {
  bash: '#30D158', zsh: '#007AFF', sh: '#5AC8FA', fish: '#FF9500',
  powershell: '#BF5AF2', cmd: '#8E8E93', python: '#FFD60A', ruby: '#FF375F', node: '#30D158',
}
const PLATFORM_ICONS = { all: '🌐', linux: '🐧', macos: '', windows: '🪟' }

// ── Command Card ──────────────────────────────────────────────
function CommandCard({ cmd, onCopy, onFavorite, onEdit, onDelete, onView }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(cmd.command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      onCopy?.(cmd.id)
    })
  }

  const shellColor = SHELL_COLORS[cmd.shell] || '#8E8E93'

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      onClick={() => onView?.(cmd)}>

      {/* Header */}
      <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{cmd.title}</span>
            {cmd.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
          </div>
          {cmd.description && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>{cmd.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={(e) => { e.stopPropagation(); onFavorite(cmd.id) }} title="Favorite">
            <Star size={12} color={cmd.is_favorite ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'} fill={cmd.is_favorite ? 'var(--yellow)' : 'none'} />
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={(e) => { e.stopPropagation(); onEdit(cmd) }} title="Edit">
            <Edit3 size={12} color="rgba(255,255,255,0.3)" />
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={(e) => { e.stopPropagation(); onDelete(cmd.id) }} title="Delete">
            <Trash2 size={12} color="rgba(255,55,95,0.5)" />
          </button>
        </div>
      </div>

      {/* Terminal block */}
      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px 14px', position: 'relative' }}>
        {/* Shell prompt bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>
            {cmd.shell} {PLATFORM_ICONS[cmd.platform] || ''} {cmd.platform !== 'all' ? cmd.platform : ''}
          </span>
        </div>
        {/* Command text */}
        <pre style={{
          margin: 0, fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', monospace",
          fontSize: 12.5, lineHeight: 1.6, color: shellColor, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          maxHeight: 120, overflowY: 'auto',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', userSelect: 'none' }}>$ </span>{cmd.command}
        </pre>

        {/* Copy button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy() }}
          style={{
            position: 'absolute', right: 10, bottom: 10,
            background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${copied ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: copied ? '#30D158' : 'rgba(255,255,255,0.6)',
            transition: 'all 0.2s',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Footer meta */}
      <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.015)' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: shellColor, background: `${shellColor}18`, padding: '2px 7px', borderRadius: 4 }}>
          {cmd.shell}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 4 }}>
          {cmd.category}
        </span>
        {cmd.use_count > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
            used {cmd.use_count}×
          </span>
        )}
      </div>
    </div>
  )
}

// ── Command Modal ─────────────────────────────────────────────
function CommandModal({ cmd, onClose, onSave, fullscreen: initialFullscreen = false }) {
  const isEdit = !!cmd?.id
  const [maximized, setMaximized] = useState(initialFullscreen)
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: maximized ? 'stretch' : 'center', justifyContent: 'center', padding: maximized ? 0 : 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: maximized ? 0 : 16, width: '100%', maxWidth: maximized ? '100vw' : 560, boxShadow: maximized ? 'none' : '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TerminalSquare size={16} color="#30D158" />
            </div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? 'Edit command' : 'New command'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="btn-icon" onClick={() => setMaximized(m => !m)} title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button className="btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>TITLE</label>
            <input className="form-input" placeholder="E.g.: List processes on port…" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* Command */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>COMMAND</label>
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 5 }}>
                {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>{form.shell}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 12px', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 1, userSelect: 'none' }}>$</span>
                <textarea
                  ref={cmdRef}
                  placeholder="lsof -i :3000 | grep LISTEN"
                  value={form.command}
                  onChange={e => set('command', e.target.value)}
                  rows={3}
                  style={{ background: 'transparent', border: 'none', outline: 'none', padding: 0, resize: 'vertical', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12.5, color: SHELL_COLORS[form.shell] || '#30D158', flex: 1, width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Shell + Platform */}
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

          {/* Category + Description */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>CATEGORY</label>
            <input className="form-input" placeholder="git, docker, npm, kubernetes…" value={form.category} onChange={e => set('category', e.target.value.toLowerCase().trim())} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>DESCRIPTION <span style={{ color: 'var(--text-quaternary)' }}>(optional)</span></label>
            <input className="form-input" placeholder="What does this command do?" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ gap: 7 }}>
              <TerminalSquare size={13} />
              {isEdit ? 'Save changes' : 'Create command'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const [modal, setModal] = useState(null) // null | { cmd?, fullscreen? }
  const [viewCmd, setViewCmd] = useState(null)

  // Focus search on /
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
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
    },
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

  // Derive unique categories from current results for filter chips
  const { data: allData } = useQuery({ queryKey: ['commands', {}], queryFn: () => commandsApi.list({}), staleTime: 30000 })
  const allCategories = [...new Set((allData?.data || []).map(c => c.category))].filter(Boolean).sort()
  const allShells = [...new Set((allData?.data || []).map(c => c.shell))].filter(Boolean).sort()

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TerminalSquare size={20} color="#30D158" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1 }}>Commands</h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{total} command{total !== 1 ? 's' : ''} saved</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})} style={{ gap: 7 }}>
          <Plus size={14} /> New command
        </button>
      </div>

      {/* Search bar */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Search size={15} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          ref={searchRef}
          placeholder="Search commands… (press / to focus)"
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
        {/* Favorite toggle */}
        <button
          onClick={() => setShowFavOnly(v => !v)}
          className={`filter-chip${showFavOnly ? ' active' : ''}`}
          style={showFavOnly ? { background: 'rgba(255,214,10,0.12)', borderColor: 'rgba(255,214,10,0.3)', color: '#FFD60A' } : {}}
        >
          <Star size={11} fill={showFavOnly ? 'currentColor' : 'none'} /> Favorites
        </button>

        {/* Shell filter */}
        {allShells.length > 1 && allShells.map(s => {
          const active = filterShell === s
          const color = SHELL_COLORS[s] || '#8E8E93'
          return (
            <button key={s} onClick={() => setFilterShell(active ? '' : s)}
              className={`filter-chip${active ? ' active' : ''}`}
              style={active ? { background: `${color}18`, borderColor: `${color}50`, color } : {}}>
              {s}
            </button>
          )
        })}

        {/* Separator if both shells and platforms */}
        {allShells.length > 1 && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />}

        {/* Platform filter */}
        {['linux', 'macos', 'windows'].map(p => (
          <button key={p} onClick={() => setFilterPlatform(filterPlatform === p ? '' : p)}
            className={`filter-chip${filterPlatform === p ? ' active' : ''}`}>
            {PLATFORM_ICONS[p]} {p}
          </button>
        ))}

        {/* Category chips */}
        {allCategories.length > 0 && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />}
        {allCategories.map(cat => (
          <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
            className={`filter-chip${filterCategory === cat ? ' active' : ''}`}
            style={filterCategory === cat ? { background: 'rgba(191,90,242,0.12)', borderColor: 'rgba(191,90,242,0.35)', color: '#BF5AF2' } : {}}>
            {cat}
          </button>
        ))}

        {/* Clear filters */}
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

      {/* Commands grid */}
      {commands.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))', gap: 14 }}>
          {commands.map(cmd => (
            <CommandCard
              key={cmd.id}
              cmd={cmd}
              onCopy={id => useMut.mutate(id)}
              onFavorite={id => favMut.mutate(id)}
              onEdit={cmd => setModal({ cmd })}
              onDelete={id => deleteMut.mutate(id)}
              onView={setViewCmd}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {modal !== null && (
        <CommandModal
          cmd={modal.cmd}
          onClose={() => setModal(null)}
          onSave={handleSave}
          fullscreen={modal.fullscreen}
        />
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
