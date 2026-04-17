import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vaultApi } from '../utils/api'
import Modal from '../components/Modal'
import { KeyRound, Plus, Search, Star, Eye, EyeOff, Copy, Trash2, Edit2, MousePointer, Check, Lock, RefreshCw, LayoutGrid, List, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { copyToClipboard } from '../utils/clipboard'
import { formatDistanceToNow } from 'date-fns'

const TYPES = [
  { value: 'secret',      label: 'Secret',       color: '#FF375F' },
  { value: 'api_key',     label: 'API Key',      color: '#007AFF' },
  { value: 'token',       label: 'Token',        color: '#5AC8FA' },
  { value: 'password',    label: 'Password',     color: '#BF5AF2' },
  { value: 'private_key', label: 'Private Key',  color: '#FF9F0A' },
  { value: 'public_key',  label: 'Public Key',   color: '#30D158' },
  { value: 'certificate', label: 'Certificate',  color: '#5E5CE6' },
  { value: 'variable',    label: 'Variable',     color: '#8E8E93' },
]

const typeColor = (t) => TYPES.find(x => x.value === t)?.color || '#8E8E93'
const typeLabel = (t) => TYPES.find(x => x.value === t)?.label || t

const defaultForm = { label: '', name: '', value: '', description: '', type: 'secret' }

function TypeBadge({ type }) {
  const color = typeColor(type)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '2px 8px', fontSize: 11, color, fontWeight: 500,
    }}>
      <Lock size={9} />
      {typeLabel(type)}
    </span>
  )
}

function RevealValue({ id }) {
  const [revealed, setRevealed] = useState(false)
  const [value, setValue] = useState(null)
  const [copied, setCopied] = useState(false)

  const { isFetching, refetch } = useQuery({
    queryKey: ['vault-reveal', id],
    queryFn: () => vaultApi.reveal(id),
    enabled: false,
    onSuccess: (data) => setValue(data.value),
  })

  const handleReveal = async () => {
    if (!revealed) {
      const res = await refetch()
      if (res.data?.value !== undefined) {
        setValue(res.data.value)
        setRevealed(true)
      }
    } else {
      setRevealed(false)
    }
  }

  const handleCopy = async () => {
    let val = value
    if (!val) {
      const res = await refetch()
      val = res.data?.value
    }
    if (val) {
      await copyToClipboard(val)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <div style={{
        flex: 1, fontFamily: 'monospace', fontSize: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6, padding: '5px 10px', color: revealed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
        letterSpacing: revealed ? 'normal' : 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {isFetching ? '…' : revealed && value ? value : '••••••••••••'}
      </div>
      <button className="btn-icon" onClick={handleReveal} title={revealed ? 'Hide' : 'Reveal'}>
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button className="btn-icon" onClick={handleCopy} title="Copy value" style={{ color: copied ? '#30D158' : undefined }}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export default function VaultPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [showValue, setShowValue] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('vault_view') || 'cards')
  const setView = (m) => { setViewMode(m); localStorage.setItem('vault_view', m) }
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const { data, isLoading } = useQuery({
    queryKey: ['vault', search, filterType, showFavorites],
    queryFn: () => vaultApi.list({ search: search || undefined, type: filterType || undefined, favorite: showFavorites ? 'true' : undefined }),
    staleTime: 0,
  })
  const entries = data?.data || []

  const createMutation = useMutation({
    mutationFn: (d) => vaultApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); qc.invalidateQueries({ queryKey: ['stats'] }); toast.success('Entry created'); closeModal() },
    onError: (e) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vaultApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); toast.success('Entry updated'); closeModal() },
    onError: (e) => toast.error(e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => vaultApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); qc.invalidateQueries({ queryKey: ['stats'] }); toast.success('Entry deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })
  const toggleFavMutation = useMutation({
    mutationFn: (id) => vaultApi.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => vaultApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['vault'] }); qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success(`${selectedIds.size} entr${selectedIds.size !== 1 ? 'ies' : 'y'} deleted`)
      clearSelection()
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setShowValue(true); setModalOpen(true) }
  const openEdit = (e) => {
    setEditItem(e)
    setForm({ label: e.label, name: e.name, value: '', description: e.description || '', type: e.type })
    setShowValue(false)
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm); setShowValue(false) }

  const handleSubmit = () => {
    if (!form.label.trim()) return toast.error('Label is required')
    if (!editItem && !form.value.trim()) return toast.error('Value is required')
    const payload = {
      label: form.label.trim(),
      name: form.name.trim() || form.label.trim(),
      description: form.description.trim(),
      type: form.type,
      ...(form.value.trim() ? { value: form.value } : {}),
    }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload })
    else createMutation.mutate(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending
  const isSelectActive = selectMode || selectedIds.size > 0

  // Auto-generate name from label
  const handleLabelChange = (val) => {
    setForm(f => ({
      ...f,
      label: val,
      name: f.name === '' || f.name === (f.label.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
        ? val.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
        : f.name,
    }))
  }

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search vault…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(v => !v)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <button
          className={`btn btn-glass btn-sm ${isSelectActive ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (isSelectActive) clearSelection() }}
          style={isSelectActive ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)' } : {}}
        >
          <MousePointer size={13} /> Select
        </button>
        <div style={{ display: 'flex', background: 'var(--c-surface)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[['cards', LayoutGrid], ['list', List], ['table', Table2]].map(([id, Icon]) => (
            <button key={id} onClick={() => setView(id)} title={`${id} view`}
              style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Entry</button>      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 12, flexWrap: 'wrap' }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>{selectedIds.size} selected</span>
          <button className="btn btn-glass btn-sm" onClick={() => setSelectedIds(new Set(entries.map(e => e.id)))}>Select all {entries.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting} style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}>
            <Trash2 size={12} /> Delete selected
          </button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto' }}>Cancel</button>
        </div>
      )}

      {/* Type filter chips */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${!filterType ? 'active' : ''}`} onClick={() => setFilterType('')}>All</button>
        {TYPES.map(t => (
          <button key={t.value} className={`filter-chip ${filterType === t.value ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
            style={filterType === t.value ? { background: `${t.color}20`, borderColor: `${t.color}50`, color: t.color } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><KeyRound size={28} /></div>
          <div className="empty-state-title">{search || filterType ? 'No entries found' : 'Vault is empty'}</div>
          <div className="empty-state-desc">{search || filterType ? 'Try adjusting your filters' : 'Store API keys, tokens, secrets and variables securely'}</div>
          {!search && !filterType && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Add Entry</button>}
        </div>

      ) : viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(entry => {
            const isSelected = selectedIds.has(entry.id)
            const color = typeColor(entry.type)
            return (
              <div key={entry.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: isSelected ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : 'var(--glass-bg)', border: isSelected ? '1px solid color-mix(in srgb, var(--blue) 40%, transparent)' : '1px solid var(--glass-border)', borderLeft: `3px solid ${isSelected ? 'var(--blue)' : color}`, cursor: isSelectActive ? 'pointer' : 'default', transition: 'background 0.12s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--glass-bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : 'var(--glass-bg)' }}
                onClick={() => isSelectActive && toggleSelect(entry.id)}
              >
                {isSelectActive && (
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
                )}
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <KeyRound size={12} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{entry.label}</span>
                  {entry.description && <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 8 }}>{entry.description}</span>}
                </div>
                <code style={{ fontSize: 11, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>{`{{${entry.name}}}`}</code>
                <TypeBadge type={entry.type} />
                {!isSelectActive && (
                  <div style={{ flexShrink: 0, minWidth: 180 }} onClick={e => e.stopPropagation()}>
                    <RevealValue id={entry.id} />
                  </div>
                )}
                {entry.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
                <span style={{ fontSize: 11, color: 'var(--text-quaternary)', flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
                  {entry.updated_at ? formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true }) : ''}
                </span>
                {!isSelectActive && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); toggleFavMutation.mutate(entry.id) }}><Star size={13} fill={entry.is_favorite ? 'currentColor' : 'none'} style={{ color: entry.is_favorite ? '#FFD60A' : undefined }} /></button>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(entry) }}><Edit2 size={13} /></button>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); setDeleteConfirm(entry) }}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      ) : viewMode === 'table' ? (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {isSelectActive && <th style={{ width: 40, padding: '10px 14px' }} />}
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Label</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Variable</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Value</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Updated</th>
                <th style={{ width: 90, padding: '10px 14px' }} />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const isSelected = selectedIds.has(entry.id)
                const color = typeColor(entry.type)
                return (
                  <tr key={entry.id}
                    style={{ borderBottom: idx < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: isSelected ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : 'transparent', cursor: isSelectActive ? 'pointer' : 'default', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : 'transparent' }}
                    onClick={() => isSelectActive && toggleSelect(entry.id)}
                  >
                    {isSelectActive && (
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                        </div>
                      </td>
                    )}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <KeyRound size={11} color={color} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{entry.label}</span>
                        {entry.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" />}
                      </div>
                      {entry.description && <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 2, paddingLeft: 32 }}>{entry.description}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <code style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--c-surface)', padding: '2px 7px', borderRadius: 4 }}>{`{{${entry.name}}}`}</code>
                    </td>
                    <td style={{ padding: '10px 14px' }}><TypeBadge type={entry.type} /></td>
                    <td style={{ padding: '10px 14px', minWidth: 200 }}><RevealValue id={entry.id} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-quaternary)', whiteSpace: 'nowrap' }}>
                      {entry.updated_at ? formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true }) : ''}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {!isSelectActive && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button className="btn-icon" onClick={e => { e.stopPropagation(); toggleFavMutation.mutate(entry.id) }}><Star size={13} fill={entry.is_favorite ? 'currentColor' : 'none'} style={{ color: entry.is_favorite ? '#FFD60A' : undefined }} /></button>
                          <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(entry) }}><Edit2 size={13} /></button>
                          <button className="btn-icon" onClick={e => { e.stopPropagation(); setDeleteConfirm(entry) }}><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      ) : (
        /* Cards view */
        <div className="cards-grid">
          {entries.map(entry => {
            const isSelected = selectedIds.has(entry.id)
            const color = typeColor(entry.type)
            return (
              <div key={entry.id} className="glass-card"
                onClick={() => isSelectActive && toggleSelect(entry.id)}
                style={{ padding: '14px 16px', cursor: isSelectActive ? 'pointer' : 'default', borderLeft: `3px solid ${color}60`, outline: isSelected ? '2px solid var(--blue)' : 'none', outlineOffset: -2, background: isSelected ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {isSelectActive && (
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2, background: isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.1)', border: `2px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <Check size={10} color="white" />}
                    </div>
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KeyRound size={14} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontFamily: 'monospace', marginTop: 1 }}>{`{{${entry.name}}}`}</div>
                  </div>
                  {!isSelectActive && (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); toggleFavMutation.mutate(entry.id) }}>
                        <Star size={13} fill={entry.is_favorite ? 'currentColor' : 'none'} style={{ color: entry.is_favorite ? '#FFD60A' : undefined }} />
                      </button>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(entry) }}><Edit2 size={13} /></button>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); setDeleteConfirm(entry) }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {entry.description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</div>}
                <div style={{ marginTop: 8 }}><TypeBadge type={entry.type} /></div>
                {!isSelectActive && <RevealValue id={entry.id} />}
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
                    {entry.updated_at ? formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true }) : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit Entry' : 'New Vault Entry'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Label *</label>
              <input className="form-input" placeholder="e.g. OpenAI API Key" value={form.label} onChange={e => handleLabelChange(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Variable name <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>— use as {`{{NAME}}`} in prompts</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                placeholder="OPENAI_API_KEY"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
                style={{ fontFamily: 'monospace', paddingRight: 36 }}
              />
              <button
                title="Auto-generate from label"
                onClick={() => setForm(f => ({ ...f, name: f.label.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-quaternary)', padding: 2 }}
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {editItem ? 'New value' : 'Value *'}
              {editItem && <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}> — leave blank to keep current</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showValue ? 'text' : 'password'}
                placeholder={editItem ? '(unchanged)' : 'sk-...'}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                style={{ fontFamily: 'monospace', paddingRight: 36 }}
                autoComplete="off"
              />
              <button
                onClick={() => setShowValue(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-quaternary)', padding: 2 }}
              >
                {showValue ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="What is this for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
              {isBusy ? 'Saving…' : editItem ? 'Save Changes' : 'Add to Vault'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Entry" size="sm">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.label}</strong>? This can't be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
