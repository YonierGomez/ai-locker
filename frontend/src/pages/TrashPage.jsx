import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trashApi } from '../utils/api'
import { Trash2, RotateCcw, AlertTriangle, MessageSquare, Zap, Navigation, Server, TerminalSquare } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'

const TYPE_LABELS = {
  prompts: { label: 'Prompt', icon: MessageSquare, color: 'var(--blue)' },
  skills: { label: 'Skill', icon: Zap, color: 'var(--orange)' },
  steering: { label: 'Steering', icon: Navigation, color: 'var(--purple)' },
  mcp_configs: { label: 'MCP Config', icon: Server, color: 'var(--teal)' },
  commands: { label: 'Command', icon: TerminalSquare, color: '#5AC8FA' },
}

function DaysBar({ daysLeft, total = 5 }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / total) * 100))
  const color = daysLeft <= 1 ? 'var(--pink)' : daysLeft <= 2 ? 'var(--orange)' : 'var(--green)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {daysLeft}d left
      </span>
    </div>
  )
}

export default function TrashPage() {
  const qc = useQueryClient()
  const [emptyConfirm, setEmptyConfirm] = useState(false)
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => trashApi.list(),
    staleTime: 0,
    refetchInterval: 30000,
  })

  // mcp_configs table → query key is 'mcp' in McpPage
  const typeToQueryKey = (type) => type === 'mcp_configs' ? 'mcp' : type

  const invalidateAll = (type) => {
    qc.invalidateQueries({ queryKey: ['trash'] })
    qc.invalidateQueries({ queryKey: ['trash-count'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
    if (type) qc.invalidateQueries({ queryKey: [typeToQueryKey(type)] })
  }

  const restoreMutation = useMutation({
    mutationFn: ({ type, id }) => trashApi.restore(type, id),
    onSuccess: (_, { type }) => {
      invalidateAll(type)
      toast.success('Item restored!')
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }) => trashApi.deletePermanent(type, id),
    onSuccess: (_, { type }) => {
      invalidateAll(type)
      toast.success('Permanently deleted')
    },
    onError: (e) => toast.error(e.message),
  })

  const emptyMutation = useMutation({
    mutationFn: () => trashApi.empty(),
    onSuccess: (r) => {
      // Invalidate all library queries since we don't know what was emptied
      invalidateAll(null)
      ;['prompts', 'skills', 'steering', 'mcp', 'commands'].forEach(k =>
        qc.invalidateQueries({ queryKey: [k] })
      )
      toast.success(`Trash emptied — ${r.deleted} items deleted`)
      setEmptyConfirm(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const items = data?.data || []
  const filtered = filter ? items.filter(i => i.item_type === filter) : items

  const typeCounts = items.reduce((acc, i) => {
    acc[i.item_type] = (acc[i.item_type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {items.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''} · Auto-purge after 5 days
            </div>
          )}
        </div>
        {items.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={() => setEmptyConfirm(true)}>
            <Trash2 size={13} /> Empty Trash
          </button>
        )}
      </div>

      {/* Type filters */}
      {items.length > 0 && (
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          <button className={`filter-chip ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>
            All ({items.length})
          </button>
          {Object.entries(TYPE_LABELS).map(([type, { label, color }]) => (
            typeCounts[type] ? (
              <button key={type} className={`filter-chip ${filter === type ? 'active' : ''}`}
                onClick={() => setFilter(filter === type ? '' : type)}
                style={filter === type ? { color, borderColor: `${color}50`, background: `${color}15` } : {}}>
                {label}s ({typeCounts[type]})
              </button>
            ) : null
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Trash2 size={28} color="var(--text-tertiary)" />
          </div>
          <div className="empty-state-title">Trash is empty</div>
          <div className="empty-state-desc">
            Deleted items appear here for 5 days before being permanently removed.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(item => {
            const typeInfo = TYPE_LABELS[item.item_type] || { label: item.item_type, icon: Trash2, color: 'var(--text-tertiary)' }
            const Icon = typeInfo.icon
            const deletedAgo = item.deleted_at ? formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true }) : ''
            const daysLeft = item.days_until_purge ?? 5

            return (
              <div key={`${item.item_type}-${item.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                {/* Type icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={typeInfo.color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || item.server_name || 'Untitled'}
                    </span>
                    <span style={{ fontSize: 10, color: typeInfo.color, background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`, borderRadius: 6, padding: '1px 7px', fontWeight: 500, flexShrink: 0 }}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>Deleted {deletedAgo}</span>
                    <div style={{ flex: 1, maxWidth: 120 }}>
                      <DaysBar daysLeft={daysLeft} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-glass btn-sm"
                    onClick={() => restoreMutation.mutate({ type: item.item_type, id: item.id })}
                    disabled={restoreMutation.isPending}
                    title="Restore"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteMutation.mutate({ type: item.item_type, id: item.id })}
                    disabled={deleteMutation.isPending}
                    title="Delete permanently"
                    style={{ padding: '5px 10px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty trash confirm */}
      <Modal isOpen={emptyConfirm} onClose={() => setEmptyConfirm(false)} title="Empty Trash" size="sm"
        footer={<>
          <button className="btn btn-glass" onClick={() => setEmptyConfirm(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => emptyMutation.mutate()} disabled={emptyMutation.isPending}>
            {emptyMutation.isPending ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Trash2 size={13} />}
            Delete All Permanently
          </button>
        </>}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle size={20} color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              This will permanently delete all <strong style={{ color: 'var(--text-primary)' }}>{items.length} items</strong> in the trash. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
