import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { settingsApi, promptsApi, commandsApi, notesApi, skillsApi, steeringApi, mcpApi } from '../utils/api'
import {
  MessageSquare, Zap, Navigation, Star, TrendingUp, BarChart2, Plus, Cpu, TerminalSquare,
  StickyNote, Heart, Trophy, Calendar, Grid, FileText, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, Minus, Flame,
} from 'lucide-react'
import { getTokenColor } from '../utils/tokens'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark')
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark')
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

function McpIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 195 195" fill="none" style={{ color }}>
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  )
}

// ── Chart tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip" style={{
      background: 'rgba(13,17,23,0.96)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{p.name}</span>
          <span style={{ color: '#fff', fontWeight: 600, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Build activity data ──────────────────────────────────────
function buildActivityData(rawActivity, days = 30) {
  const map = {}
  rawActivity?.forEach(r => {
    map[r.day] = {
      prompts: r.prompts || 0, skills: r.skills || 0, steering: r.steering || 0,
      mcp: r.mcp || 0, commands: r.commands || 0, notes: r.notes || 0,
    }
  })
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    return { day: label, ...(map[iso] || { prompts: 0, skills: 0, steering: 0, mcp: 0, commands: 0, notes: 0 }) }
  })
}

const CHART_COLORS = {
  prompts: '#007AFF', skills: '#FF9500', steering: '#BF5AF2',
  mcp: '#30D158', commands: '#5AC8FA', notes: '#FFD60A',
}
const CAT_COLORS = ['#007AFF', '#BF5AF2', '#FF9500', '#30D158', '#FF375F', '#00D4FF', '#FFD60A', '#FF6B35']

// ── Empty state ──────────────────────────────────────────────
function EmptyDashboard({ navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', gap: 24 }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(145deg, rgba(0,122,255,0.15), rgba(191,90,242,0.1))', border: '1px solid rgba(0,122,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BarChart2 size={36} color="rgba(0,122,255,0.7)" />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>Your library is empty</div>
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 320, lineHeight: 1.6 }}>Create prompts, skills and more to see your metrics and activity here.</div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/prompts')} style={{ gap: 7 }}><Plus size={14} /> Create first prompt</button>
        <button className="btn btn-glass" onClick={() => navigate('/skills')} style={{ gap: 7 }}><Zap size={14} color="var(--orange)" /> Create skill</button>
      </div>
    </div>
  )
}

// ── Analytics nudge ──────────────────────────────────────────
function AnalyticsNudge({ total, navigate }) {
  const TARGET = 5
  const pct = Math.min((total / TARGET) * 100, 100)
  return (
    <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BarChart2 size={20} color="#007AFF" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Analytics available with {TARGET} items</div>
        <div style={{ height: 4, background: 'var(--glass-border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#007AFF', borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{total} of {TARGET} items — add {TARGET - total} more to unlock charts</div>
      </div>
      <button className="btn btn-glass btn-sm" onClick={() => navigate('/prompts')} style={{ flexShrink: 0, gap: 6 }}><Plus size={12} /> Add</button>
    </div>
  )
}

// ── Activity Heatmap ─────────────────────────────────────────
function ActivityHeatmap({ heatmap }) {
  const theme = useTheme()
  const isLight = theme === 'light'
  const WEEKS = 52
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDay = new Date(today)
  startDay.setDate(startDay.getDate() - (WEEKS * 7 - 1))
  const dow = (startDay.getDay() + 6) % 7
  startDay.setDate(startDay.getDate() - dow)
  const weeks = []
  for (let w = 0; w < WEEKS; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay)
      date.setDate(startDay.getDate() + w * 7 + d)
      const iso = date.toISOString().split('T')[0]
      days.push({ iso, count: heatmap[iso] || 0, future: date > today })
    }
    weeks.push(days)
  }
  const maxCount = Math.max(...Object.values(heatmap), 1)
  const getColor = count => {
    if (count === 0) return isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity < 0.25) return 'rgba(0,122,255,0.25)'
    if (intensity < 0.5) return 'rgba(0,122,255,0.50)'
    if (intensity < 0.75) return 'rgba(0,122,255,0.75)'
    return '#007AFF'
  }
  const DAY_LABELS = ['L', '', 'X', '', 'V', '', '']
  const totalItems = Object.values(heatmap).reduce((s, v) => s + v, 0)
  const activeDays = Object.keys(heatmap).length
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} color="#007AFF" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Activity — last year</span>
        </div>
        <span style={{ fontSize: 11, color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.30)' }}>{totalItems} items across {activeDays} day{activeDays !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, flexShrink: 0 }}>
          {DAY_LABELS.map((l, i) => <div key={i} style={{ width: 10, height: 10, fontSize: 8, color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {week.map(day => (
              <div key={day.iso} title={day.future ? '' : `${day.iso}: ${day.count}`}
                style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: day.future ? 'transparent' : getColor(day.count), transition: 'background 0.2s' }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', marginRight: 4 }}>Less</span>
        {[isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)', 'rgba(0,122,255,0.25)', 'rgba(0,122,255,0.5)', 'rgba(0,122,255,0.75)', '#007AFF'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', marginLeft: 4 }}>More</span>
      </div>
    </div>
  )
}

// ── Charts section ───────────────────────────────────────────
function ChartsSection({ stats }) {
  const theme = useTheme()
  const isLight = theme === 'light'
  const tickColor    = isLight ? 'rgba(0,0,0,0.38)'  : 'rgba(255,255,255,0.30)'
  const tickColorAlt = isLight ? 'rgba(0,0,0,0.50)'  : 'rgba(255,255,255,0.45)'
  const gridColor    = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'
  const cursorFill   = isLight ? 'rgba(0,0,0,0.04)'  : 'rgba(255,255,255,0.04)'
  const cursorStroke = isLight ? 'rgba(0,0,0,0.10)'  : 'rgba(255,255,255,0.10)'
  const barBg        = isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.07)'
  const mutedText    = isLight ? 'rgba(0,0,0,0.45)'  : 'rgba(255,255,255,0.45)'
  const dimText      = isLight ? 'rgba(0,0,0,0.38)'  : 'rgba(255,255,255,0.40)'
  const labelFill    = isLight ? 'rgba(0,0,0,0.40)'  : 'rgba(255,255,255,0.40)'
  const subText      = isLight ? 'rgba(0,0,0,0.38)'  : 'rgba(255,255,255,0.30)'

  const activityData = buildActivityData(stats?.activity)
  const hasActivity = activityData.some(d => d.prompts + d.skills + d.steering + d.mcp + d.commands + d.notes > 0)
  const hasTopUsed = stats?.top_used?.length > 0
  const hasByCategory = stats?.by_category?.length > 0
  const tickFormatter = (val, idx) => idx % 5 === 0 ? val : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {hasActivity && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={15} color="var(--blue)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Activity — last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                {Object.entries(CHART_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
              <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: cursorStroke, strokeWidth: 1 }} animationDuration={0} isAnimationActive={false} />
              {Object.entries(CHART_COLORS).map(([key, color]) => (
                <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} fill={`url(#grad-${key})`} dot={false} activeDot={{ r: 3, fill: color }} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {Object.entries(CHART_COLORS).map(([key, color]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 11, color: mutedText, textTransform: 'capitalize' }}>{key}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(stats?.total_tokens?.prompts > 0 || stats?.total_tokens?.skills > 0 || stats?.total_tokens?.steering > 0) && (() => {
        const tt = stats.total_tokens
        const total = tt.prompts + tt.skills + tt.steering
        const fmt = n => n >= 1000 ? `~${(n/1000).toFixed(1)}k` : `~${n}`
        const pieData = [
          { name: 'Prompts', value: tt.prompts, color: '#007AFF' },
          { name: 'Skills', value: tt.skills, color: '#FF9500' },
          { name: 'Steering', value: tt.steering, color: '#BF5AF2' },
        ].filter(d => d.value > 0)
        return (
          <div className={stats?.top_tokens?.length > 0 ? 'dash-grid-2col' : undefined} style={{ display: 'grid', gap: 16 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Cpu size={15} color="#007AFF" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Tokens by type</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                        {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} animationDuration={0} isAnimationActive={false} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5 }}>{fmt(total)}</div>
                    <div style={{ fontSize: 9, color: dimText }}>total</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {pieData.map(d => (
                    <div key={d.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
                          <span style={{ fontSize: 11, color: mutedText }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{fmt(d.value)}</span>
                      </div>
                      <div style={{ height: 3, background: barBg, borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${Math.round((d.value / total) * 100)}%`, background: d.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {stats?.top_tokens?.length > 0 && (
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Cpu size={15} color="#FF9500" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Top prompts by tokens</span>
                  <span style={{ fontSize: 11, color: subText, marginLeft: 2 }}>~4 chars/token</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(140, stats.top_tokens.length * 26)}>
                  <BarChart data={stats.top_tokens} layout="vertical" margin={{ top: 0, right: 52, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: tickColorAlt }} tickLine={false} axisLine={false} width={100} tickFormatter={v => v.length > 15 ? v.slice(0, 14) + '…' : v} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill }} animationDuration={0} isAnimationActive={false} />
                    <Bar dataKey="tokens" name="tokens" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}
                      label={{ position: 'right', fontSize: 10, fill: labelFill, formatter: v => v >= 1000 ? `~${(v/1000).toFixed(1)}k` : `~${v}` }}>
                      {stats.top_tokens.map(row => {
                        const c = getTokenColor(row.tokens).replace('var(--green)', '#30D158').replace('var(--teal)', '#5AC8FA').replace('var(--orange)', '#FF9500').replace('var(--pink)', '#FF375F')
                        return <Cell key={row.title} fill={c} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                  {[['< 500', '#30D158'], ['500–2k', '#5AC8FA'], ['2k–8k', '#FF9500'], ['> 8k', '#FF375F']].map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 10, color: dimText }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <div className={hasTopUsed && hasByCategory ? 'dash-grid-2col' : undefined} style={{ display: 'grid', gap: 16 }}>
        {hasTopUsed && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Most used prompts</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.top_used} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: tickColorAlt }} tickLine={false} axisLine={false} width={90} tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill }} animationDuration={0} isAnimationActive={false} />
                <Bar dataKey="use_count" name="usos" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                  {stats.top_used.map((_, i) => <Cell key={i} fill={`rgba(0,122,255,${1 - i * 0.13})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {hasByCategory && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Prompts by category</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.by_category} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={v => v.length > 8 ? v.slice(0, 7) + '…' : v} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill }} animationDuration={0} isAnimationActive={false} />
                <Bar dataKey="count" name="prompts" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                  {stats.by_category.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {(() => {
        const hasModels = stats?.model_distribution?.length > 0
        const hasFavs = stats?.favorites_by_type?.some(f => f.count > 0)
        if (!hasModels && !hasFavs) return null
        return (
          <div className={hasModels && hasFavs ? 'dash-grid-2col' : undefined} style={{ display: 'grid', gap: 16 }}>
            {hasModels && (() => {
              const total = stats.model_distribution.reduce((s, r) => s + r.count, 0)
              const MODEL_COLORS = ['#007AFF','#BF5AF2','#FF9500','#30D158','#FF375F','#5AC8FA','#FFD60A','#FF6B35']
              return (
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BF5AF2" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Models assigned</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ flexShrink: 0 }}>
                      <ResponsiveContainer width={110} height={110}>
                        <PieChart>
                          <Pie data={stats.model_distribution} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="count" nameKey="model" paddingAngle={3} isAnimationActive={false}>
                            {stats.model_distribution.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} animationDuration={0} isAnimationActive={false} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {stats.model_distribution.map((r, i) => (
                        <div key={r.model}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: mutedText, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.model}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: MODEL_COLORS[i % MODEL_COLORS.length] }}>{r.count}</span>
                          </div>
                          <div style={{ height: 3, background: barBg, borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${Math.round((r.count / total) * 100)}%`, background: MODEL_COLORS[i % MODEL_COLORS.length], borderRadius: 99 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
            {hasFavs && (
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Star size={15} color="var(--yellow)" fill="var(--yellow)" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Favorites by type</span>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={stats.favorites_by_type} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="type" tick={{ fontSize: 11, fill: tickColorAlt }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill }} animationDuration={0} isAnimationActive={false} />
                    <Bar dataKey="count" name="favoritos" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                      {stats.favorites_by_type.map(r => <Cell key={r.type} fill={r.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )
      })()}

      {stats?.activity_heatmap && Object.keys(stats.activity_heatmap).length > 0 && (
        <ActivityHeatmap heatmap={stats.activity_heatmap} />
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => settingsApi.stats(),
    staleTime: 30000,
  })

  const { data: recentPrompts } = useQuery({ queryKey: ['prompts', { limit: 4, sort: 'updated_at' }], queryFn: () => promptsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }) })
  const { data: recentSkills } = useQuery({ queryKey: ['skills', { limit: 4, sort: 'updated_at' }], queryFn: () => skillsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000 })
  const { data: recentSteering } = useQuery({ queryKey: ['steering', { limit: 4, sort: 'updated_at' }], queryFn: () => steeringApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000 })
  const { data: recentMcp } = useQuery({ queryKey: ['mcp', { limit: 4, sort: 'updated_at' }], queryFn: () => mcpApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000 })
  const { data: recentCommands } = useQuery({ queryKey: ['commands', { limit: 4, sort: 'updated_at' }], queryFn: () => commandsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000 })
  const { data: recentNotes } = useQuery({ queryKey: ['notes', { limit: 4, sort: 'updated_at' }], queryFn: () => notesApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000 })

  const { data: favoritePrompts } = useQuery({ queryKey: ['prompts', { favorite: true, limit: 4 }], queryFn: () => promptsApi.list({ favorite: 'true', limit: 4 }) })
  const { data: favoriteSkills } = useQuery({ queryKey: ['skills', { favorite: true, limit: 4 }], queryFn: () => skillsApi.list({ favorite: 'true', limit: 4 }), staleTime: 30000 })
  const { data: favoriteSteering } = useQuery({ queryKey: ['steering', { favorite: true, limit: 4 }], queryFn: () => steeringApi.list({ favorite: 'true', limit: 4 }), staleTime: 30000 })
  const { data: favoriteMcp } = useQuery({ queryKey: ['mcp', { favorite: true, limit: 4 }], queryFn: () => mcpApi.list({ favorite: 'true', limit: 4 }), staleTime: 30000 })
  const { data: favoriteCommands } = useQuery({ queryKey: ['commands', { favorite: true, limit: 4 }], queryFn: () => commandsApi.list({ favorite: 'true', limit: 4 }), staleTime: 30000 })
  const { data: favoriteNotes } = useQuery({ queryKey: ['notes', { favorite: true, limit: 4 }], queryFn: () => notesApi.list({ favorite: 'true', limit: 4 }), staleTime: 30000 })

  const total = (stats?.prompts ?? 0) + (stats?.skills ?? 0) + (stats?.steering ?? 0) + (stats?.mcp_configs ?? 0) + (stats?.commands ?? 0) + (stats?.notes ?? 0)
  const hasEnoughForCharts = total >= 5

  const statCards = [
    { label: 'Prompts', value: stats?.prompts ?? 0, icon: MessageSquare, color: '#007AFF', path: '/prompts' },
    { label: 'Skills', value: stats?.skills ?? 0, icon: Zap, color: '#FF9500', path: '/skills' },
    { label: 'Steering', value: stats?.steering ?? 0, icon: Navigation, color: '#BF5AF2', path: '/steering' },
    { label: 'MCP Configs', value: stats?.mcp_configs ?? 0, icon: McpIcon, color: '#30D158', path: '/mcp' },
    { label: 'Commands', value: stats?.commands ?? 0, icon: TerminalSquare, color: '#5AC8FA', path: '/commands' },
    { label: 'Notes', value: stats?.notes ?? 0, icon: StickyNote, color: '#FFD60A', path: '/notes' },
  ]

  const quickActions = [
    { label: 'Prompt', icon: MessageSquare, path: '/prompts', color: '#007AFF' },
    { label: 'Skill', icon: Zap, path: '/skills', color: '#FF9500' },
    { label: 'Steering', icon: Navigation, path: '/steering', color: '#BF5AF2' },
    { label: 'MCP', icon: McpIcon, path: '/mcp', color: '#30D158' },
    { label: 'Command', icon: TerminalSquare, path: '/commands', color: '#5AC8FA' },
    { label: 'Note', icon: StickyNote, path: '/notes', color: '#FFD60A' },
  ]

  // Merged recent items
  const recentItems = [
    ...(recentPrompts?.data || []).map(p => ({ ...p, _type: 'prompt' })),
    ...(recentSkills?.data || []).map(s => ({ ...s, _type: 'skill' })),
    ...(recentSteering?.data || []).map(s => ({ ...s, _type: 'steering' })),
    ...(recentMcp?.data || []).map(m => ({ ...m, _type: 'mcp' })),
    ...(recentCommands?.data || []).map(c => ({ ...c, _type: 'command' })),
    ...(recentNotes?.data || []).map(n => ({ ...n, _type: 'note' })),
  ].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 6)

  const favTotal = (stats?.favorites?.prompts || 0) + (stats?.favorites?.skills || 0) + (stats?.favorites?.steering || 0) + (stats?.favorites?.mcp_configs || 0) + (stats?.favorites?.commands || 0) + (stats?.favorites?.notes || 0)
  const noFavorites = (favoritePrompts?.data?.length ?? 0) === 0 && (favoriteSkills?.data?.length ?? 0) === 0 && (favoriteSteering?.data?.length ?? 0) === 0 && (favoriteMcp?.data?.length ?? 0) === 0 && (favoriteCommands?.data?.length ?? 0) === 0 && (favoriteNotes?.data?.length ?? 0) === 0

  const renderRecentItem = (item) => {
    const configs = {
      prompt:   { icon: <MessageSquare size={11} color="#007AFF" />, label: 'Prompt',   labelColor: 'rgba(0,122,255,0.5)',   labelBg: 'rgba(0,122,255,0.08)',   path: '/prompts',  preview: item.content },
      skill:    { icon: <Zap size={11} color="#FF9500" />,           label: 'Skill',    labelColor: 'rgba(255,149,0,0.5)',   labelBg: 'rgba(255,149,0,0.08)',   path: '/skills',   preview: item.content },
      steering: { icon: <Navigation size={11} color="#BF5AF2" />,    label: 'Steering', labelColor: 'rgba(191,90,242,0.5)',  labelBg: 'rgba(191,90,242,0.08)',  path: '/steering', preview: item.content },
      mcp:      { icon: <McpIcon size={11} color="#30D158" />,       label: 'MCP',      labelColor: 'rgba(48,209,88,0.5)',   labelBg: 'rgba(48,209,88,0.08)',   path: '/mcp',      preview: null },
      command:  { icon: <TerminalSquare size={11} color="#5AC8FA" />,label: 'Command',  labelColor: 'rgba(91,200,250,0.5)',  labelBg: 'rgba(91,200,250,0.08)',  path: '/commands', preview: item.command },
      note:     { icon: <StickyNote size={11} color="#FFD60A" />,    label: 'Note',     labelColor: 'rgba(255,214,10,0.5)', labelBg: 'rgba(255,214,10,0.08)', path: '/notes',    preview: item.content },
    }
    const cfg = configs[item._type]
    if (!cfg) return null
    return (
      <div key={item.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => navigate(cfg.path)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {cfg.icon}
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.name}</span>
          <span style={{ fontSize: 10, color: cfg.labelColor, background: cfg.labelBg, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>{cfg.label}</span>
        </div>
        {cfg.preview && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cfg.preview.slice(0, 55)}{cfg.preview.length > 55 ? '…' : ''}
          </div>
        )}
        {item._type === 'prompt' && item.use_count > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 17 }}>{item.use_count} uses</div>
        )}
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Welcome banner */}
      <div style={{ marginBottom: 24 }} className="animate-fade-in-up">
        <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #0f0f12 0%, #0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--radius-2xl)', padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div className="welcome-banner-line" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              <div className="welcome-banner-icon" style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(145deg, #0a0a0a 0%, #0f0f12 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="4" stroke="#00D4FF" strokeWidth="1.2" strokeOpacity="0.7"/>
                  <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.85"/>
                  <rect x="11" y="5.5" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.5"/>
                  <rect x="5.5" y="11" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.5"/>
                  <path d="M13.5 11.5L12.5 13.5L14.5 13L13 15" stroke="#00D4FF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 2 }}>Welcome to AI Locker</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Your AI prompts, skills, and configurations — all in one place.</p>
              </div>
            </div>
            <div className="quick-actions">
              {quickActions.map(({ label, icon: Icon, path, color }) => (
                <button key={label} className="btn btn-glass btn-sm" onClick={() => navigate(path)} style={{ gap: 6 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize: 12 }}>+ {label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid stagger-children" style={{ opacity: statsLoading ? 0.4 : 1, transition: 'opacity 0.3s' }}>
        {statCards.map(({ label, value, icon: Icon, color, path }) => (
          <div key={label} className="stat-card" style={{ cursor: 'pointer', '--card-color': color }} onClick={() => navigate(path)}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
            <div className="stat-icon"><Icon size={40} color={color} /></div>
          </div>
        ))}
      </div>

      {/* ── Activity — last 30 days ── */}
      {!statsLoading && hasEnoughForCharts && (() => {
        const activityData = buildActivityData(stats?.activity)
        const hasActivity = activityData.some(d => d.prompts + d.skills + d.steering + d.mcp + d.commands + d.notes > 0)
        if (!hasActivity) return null
        const mutedText = 'rgba(255,255,255,0.45)'
        const tickFormatter = (val, idx) => idx % 5 === 0 ? val : ''
        return (
          <div style={{ marginTop: 20 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <TrendingUp size={15} color="var(--blue)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Activity — last 30 days</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    {Object.entries(CHART_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`top-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.30)' }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.30)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.10)', strokeWidth: 1 }} animationDuration={0} isAnimationActive={false} />
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} fill={`url(#top-grad-${key})`} dot={false} activeDot={{ r: 3, fill: color }} isAnimationActive={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {Object.entries(CHART_COLORS).map(([key, color]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 11, color: mutedText, textTransform: 'capitalize' }}>{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dashboard 3: Weekly Summary ── */}
      {!statsLoading && stats?.weekly_summary && (() => {
        const ws = stats.weekly_summary
        if (ws.this_week === 0 && ws.prev_week === 0 && ws.streak_days === 0) return null
        const changePct = ws.change_pct
        const changeColor = changePct > 0 ? '#30D158' : changePct < 0 ? '#FF375F' : '#8E8E93'
        const ChangeIcon = changePct > 0 ? ArrowUp : changePct < 0 ? ArrowDown : Minus

        // Build chart data for grouped bar chart
        const chartData = ws.by_type?.length > 0
          ? ws.by_type.map(t => ({ name: t.type, 'This week': t.this_week, 'Last week': t.prev_week, color: t.color }))
          : []

        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calendar size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Weekly Summary</span>
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* KPIs column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 140 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>This week</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 38, fontWeight: 800, color: '#007AFF', letterSpacing: -2, lineHeight: 1 }}>{ws.this_week}</span>
                      {changePct !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${changeColor}15`, border: `1px solid ${changeColor}25`, borderRadius: 6, padding: '3px 7px' }}>
                          <ChangeIcon size={10} color={changeColor} />
                          <span style={{ fontSize: 11, color: changeColor, fontWeight: 700 }}>{Math.abs(changePct)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Last week</div>
                    <span style={{ fontSize: 38, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: -2, lineHeight: 1 }}>{ws.prev_week}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Streak</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 38, fontWeight: 800, color: ws.streak_days > 0 ? '#FF9500' : 'rgba(255,255,255,0.2)', letterSpacing: -2, lineHeight: 1 }}>{ws.streak_days}</span>
                      <Flame size={18} color={ws.streak_days > 0 ? '#FF9500' : 'rgba(255,255,255,0.15)'} fill={ws.streak_days > 0 ? '#FF9500' : 'none'} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 2 }}>
                      {ws.streak_days === 0 ? 'no streak' : `day${ws.streak_days !== 1 ? 's' : ''} in a row`}
                    </div>
                  </div>
                </div>

                {/* Grouped bar chart */}
                {chartData.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>By type</div>
                    <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 32)}>
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} tickLine={false} axisLine={false} width={62} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} animationDuration={0} isAnimationActive={false} />
                        <Bar dataKey="This week" radius={[0, 3, 3, 0]} maxBarSize={10} isAnimationActive={false}
                          label={{ position: 'right', fontSize: 10, fill: 'rgba(255,255,255,0.4)', formatter: v => v > 0 ? v : '' }}>
                          {chartData.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Bar>
                        <Bar dataKey="Last week" radius={[0, 3, 3, 0]} maxBarSize={10} isAnimationActive={false}>
                          {chartData.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.25} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 12, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.5)' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>this week</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 12, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>last week</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dashboard 1: Library Health ── */}
      {!statsLoading && stats?.health && stats.health.total_items > 0 && (() => {
        const h = stats.health
        const descPct = h.total_items > 0 ? Math.round((h.items_with_description / h.total_items) * 100) : 0
        const issues = [
          h.prompts_never_used > 0 && { label: `${h.prompts_never_used} prompts never used`, color: '#FF9500', path: '/prompts' },
          h.prompts_no_description > 0 && { label: `${h.prompts_no_description} prompts without description`, color: '#FF9500', path: '/prompts' },
          h.skills_inactive > 0 && { label: `${h.skills_inactive} inactive skills`, color: '#BF5AF2', path: '/skills' },
          h.steering_inactive > 0 && { label: `${h.steering_inactive} inactive steering`, color: '#BF5AF2', path: '/steering' },
          h.commands_never_used > 0 && { label: `${h.commands_never_used} commands never used`, color: '#5AC8FA', path: '/commands' },
          h.notes_no_content > 0 && { label: `${h.notes_no_content} empty notes`, color: '#FFD60A', path: '/notes' },
          h.mcp_inactive > 0 && { label: `${h.mcp_inactive} inactive MCP configs`, color: '#30D158', path: '/mcp' },
        ].filter(Boolean)
        const score = Math.max(0, 100 - issues.length * 12)
        const scoreColor = score >= 80 ? '#30D158' : score >= 50 ? '#FF9500' : '#FF375F'
        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Heart size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Library Health</span>
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 100, gap: 4 }}>
                  <div style={{ fontSize: 42, fontWeight: 800, color: scoreColor, letterSpacing: -2, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>health score</div>
                  <div style={{ fontSize: 10, color: scoreColor, fontWeight: 600 }}>{score >= 80 ? '✓ Great' : score >= 50 ? '⚠ Fair' : '✗ Needs work'}</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Description coverage</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${descPct}%`, background: descPct >= 70 ? '#30D158' : descPct >= 40 ? '#FF9500' : '#FF375F', borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: descPct >= 70 ? '#30D158' : descPct >= 40 ? '#FF9500' : '#FF375F', minWidth: 36 }}>{descPct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4 }}>{h.items_with_description} of {h.total_items} items have descriptions</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                <div style={{ flex: 2, minWidth: 200 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{issues.length === 0 ? '✓ No issues found' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} found`}</div>
                  {issues.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={14} color="#30D158" />
                      <span style={{ fontSize: 12, color: '#30D158' }}>Your library is in great shape!</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {issues.slice(0, 5).map((issue, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => navigate(issue.path)}>
                          <AlertCircle size={11} color={issue.color} />
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{issue.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dashboard 2: Top Performers ── */}
      {!statsLoading && total > 0 && (() => {
        const hasTopPrompts = stats?.top_used?.length > 0
        const hasTopCmds = stats?.top_commands_used?.length > 0
        const hasMcpActive = stats?.mcp_active_list?.length > 0
        const hasSkillsRecent = stats?.top_skills_recent?.length > 0
        if (!hasTopPrompts && !hasTopCmds && !hasMcpActive && !hasSkillsRecent) return null

        const MEDAL = ['🥇', '🥈', '🥉', '4', '5']

        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Trophy size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Top Performers</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: 14 }}>

              {/* Most used prompts */}
              {hasTopPrompts && (() => {
                const maxUse = Math.max(...stats.top_used.map(p => p.use_count), 1)
                return (
                  <div className="glass-card" style={{ padding: 18, borderTop: '2px solid rgba(0,122,255,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,122,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={14} color="#007AFF" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Most used prompts</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stats.top_used.slice(0, 5).map((p, i) => (
                        <div key={p.title} onClick={() => navigate('/prompts')} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, minWidth: 20, textAlign: 'center', flexShrink: 0 }}>{MEDAL[i]}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#007AFF', flexShrink: 0, background: 'rgba(0,122,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>{p.use_count}×</span>
                          </div>
                          <div style={{ marginLeft: 28, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round((p.use_count / maxUse) * 100)}%`, background: `rgba(0,122,255,${0.9 - i * 0.15})`, borderRadius: 99 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Most used commands */}
              {hasTopCmds && (() => {
                const maxUse = Math.max(...stats.top_commands_used.map(c => c.use_count), 1)
                return (
                  <div className="glass-card" style={{ padding: 18, borderTop: '2px solid rgba(90,200,250,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(90,200,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TerminalSquare size={14} color="#5AC8FA" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Most used commands</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stats.top_commands_used.map((c, i) => (
                        <div key={c.title} onClick={() => navigate('/commands')} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, minWidth: 20, textAlign: 'center', flexShrink: 0 }}>{MEDAL[i]}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                            <span style={{ fontSize: 10, color: '#5AC8FA', background: 'rgba(90,200,250,0.1)', padding: '1px 6px', borderRadius: 4, flexShrink: 0, fontFamily: 'monospace' }}>{c.shell}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#5AC8FA', flexShrink: 0, background: 'rgba(90,200,250,0.1)', padding: '2px 8px', borderRadius: 6 }}>{c.use_count}×</span>
                          </div>
                          <div style={{ marginLeft: 28, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round((c.use_count / maxUse) * 100)}%`, background: `rgba(90,200,250,${0.9 - i * 0.15})`, borderRadius: 99 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Active MCP servers */}
              {hasMcpActive && (
                <div className="glass-card" style={{ padding: 18, borderTop: '2px solid rgba(48,209,88,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <McpIcon size={14} color="#30D158" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Active MCP servers</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#30D158', background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.2)', padding: '2px 8px', borderRadius: 6 }}>{stats.mcp_active_list.length} online</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.mcp_active_list.map(m => (
                      <div key={m.title} onClick={() => navigate('/mcp')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(48,209,88,0.04)', border: '1px solid rgba(48,209,88,0.1)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(48,209,88,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(48,209,88,0.04)'}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158', boxShadow: '0 0 6px rgba(48,209,88,0.6)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                        <span style={{ fontSize: 10, color: 'rgba(90,200,250,0.7)', background: 'rgba(90,200,250,0.08)', padding: '2px 7px', borderRadius: 5, flexShrink: 0, fontFamily: 'monospace' }}>{m.transport}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent skills */}
              {hasSkillsRecent && (
                <div className="glass-card" style={{ padding: 18, borderTop: '2px solid rgba(255,149,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,149,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={14} color="#FF9500" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Recent skills</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.top_skills_recent.map(s => (
                      <div key={s.title} onClick={() => navigate('/skills')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.is_active ? '#30D158' : 'rgba(255,255,255,0.2)', boxShadow: s.is_active ? '0 0 6px rgba(48,209,88,0.5)' : 'none', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                        <span style={{ fontSize: 10, color: s.is_active ? '#30D158' : 'rgba(255,255,255,0.25)', background: s.is_active ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>
                          {s.is_active ? 'active' : 'inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Analytics */}
      <div style={{ marginTop: 20 }}>
        <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BarChart2 size={14} color="rgba(255,255,255,0.3)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Analytics</span>
        </div>
        {statsLoading ? (
          <div className="glass-card" style={{ padding: '48px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
          </div>
        ) : total === 0 ? (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}><EmptyDashboard navigate={navigate} /></div>
        ) : !hasEnoughForCharts ? (
          <AnalyticsNudge total={total} navigate={navigate} />
        ) : (
          <ChartsSection stats={stats} />
        )}
      </div>

      {/* Library */}
      {!statsLoading && total > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Library</span>
          </div>
          <div className="dash-grid-2col">
            {/* Recent */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={14} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Recent</span>
              </div>
              <div style={{ padding: '6px 0' }}>
                {recentItems.length === 0 ? (
                  <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No items yet</div>
                ) : recentItems.map(renderRecentItem)}
              </div>
            </div>

            {/* Favorites */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={14} color="var(--yellow)" fill="var(--yellow)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Favoritos</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{favTotal} total</div>
              </div>
              <div style={{ padding: '6px 0' }}>
                {noFavorites && (
                  <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>Mark items with ★ to see them here</div>
                )}
                {favoriteSkills?.data?.map(s => (
                  <div key={s.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/skills')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} color="var(--yellow)" fill="var(--yellow)" /><Zap size={11} color="#FF9500" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,149,0,0.5)', background: 'rgba(255,149,0,0.08)', padding: '1px 6px', borderRadius: 4 }}>Skill</span>
                    </div>
                  </div>
                ))}
                {favoriteSteering?.data?.map(s => (
                  <div key={s.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/steering')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} color="var(--yellow)" fill="var(--yellow)" /><Navigation size={11} color="#BF5AF2" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(191,90,242,0.5)', background: 'rgba(191,90,242,0.08)', padding: '1px 6px', borderRadius: 4 }}>Steering</span>
                    </div>
                  </div>
                ))}
                {favoriteMcp?.data?.map(m => (
                  <div key={m.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/mcp')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} color="var(--yellow)" fill="var(--yellow)" /><McpIcon size={11} color="#30D158" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(48,209,88,0.5)', background: 'rgba(48,209,88,0.08)', padding: '1px 6px', borderRadius: 4 }}>MCP</span>
                    </div>
                  </div>
                ))}
                {favoritePrompts?.data?.map(p => (
                  <div key={p.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/prompts')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} color="var(--yellow)" fill="var(--yellow)" /><MessageSquare size={11} color="#007AFF" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(0,122,255,0.5)', background: 'rgba(0,122,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>Prompt</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 22 }}>{p.content?.slice(0, 60)}{p.content?.length > 60 ? '…' : ''}</div>
                  </div>
                ))}
                {favoriteCommands?.data?.map(c => (
                  <div key={c.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/commands')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} color="var(--yellow)" fill="var(--yellow)" /><TerminalSquare size={11} color="#5AC8FA" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(91,200,250,0.5)', background: 'rgba(91,200,250,0.08)', padding: '1px 6px', borderRadius: 4 }}>Command</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 22, fontFamily: 'monospace' }}>{c.command?.slice(0, 55)}{c.command?.length > 55 ? '…' : ''}</div>
                  </div>
                ))}
                {favoriteNotes?.data?.map(n => (
                  <div key={n.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/notes')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} color="var(--yellow)" fill="var(--yellow)" /><StickyNote size={11} color="#FFD60A" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,214,10,0.5)', background: 'rgba(255,214,10,0.08)', padding: '1px 6px', borderRadius: 4 }}>Note</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 22 }}>{n.content?.slice(0, 60)}{n.content?.length > 60 ? '…' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dashboard 4: Category Distribution ── */}
      {!statsLoading && stats?.category_distribution?.length > 1 && (() => {
        const cats = stats.category_distribution
        const typeKeys = ['prompts', 'skills', 'steering', 'notes']
        const typeColors = { prompts: '#007AFF', skills: '#FF9500', steering: '#BF5AF2', notes: '#FFD60A' }
        const typeIcons = { prompts: MessageSquare, skills: Zap, steering: Navigation, notes: StickyNote }
        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Grid size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Category Distribution</span>
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                {typeKeys.map(k => {
                  const Icon = typeIcons[k]
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={11} color={typeColors[k]} />
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{k}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cats.map(cat => {
                  const maxVal = Math.max(...cats.map(c => c.total), 1)
                  return (
                    <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, minWidth: 90, color: 'var(--text-secondary)' }}>{cat.category}</span>
                      <div style={{ flex: 1, display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
                        {typeKeys.map(k => cat[k] > 0 && (
                          <div key={k} style={{ flex: cat[k], background: typeColors[k], opacity: 0.8, minWidth: 2 }} title={`${k}: ${cat[k]}`} />
                        ))}
                        <div style={{ flex: maxVal - cat.total, background: 'rgba(255,255,255,0.04)' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 24, textAlign: 'right' }}>{cat.total}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dashboard 5: Notes Insights ── */}
      {!statsLoading && stats?.notes_insights && stats.notes_insights.total > 0 && (() => {
        const ni = stats.notes_insights
        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileText size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Notes Insights</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 14 }}>
              <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                  <StickyNote size={13} color="#FFD60A" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Overview</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Total notes', value: ni.total, color: '#FFD60A' },
                    { label: 'With content', value: ni.with_content, color: '#30D158' },
                    { label: 'Pinned', value: ni.pinned, color: '#007AFF' },
                    { label: 'Favorites', value: ni.favorites, color: '#FFD60A' },
                    { label: 'Avg length', value: ni.avg_length >= 1000 ? `~${(ni.avg_length/1000).toFixed(1)}k` : `~${ni.avg_length}`, color: 'rgba(255,255,255,0.5)', suffix: ' chars' },
                  ].map(({ label, value, color, suffix }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}{suffix || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
              {ni.by_color?.length > 0 && (
                <div className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                    <span style={{ fontSize: 13 }}>🎨</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Notes by color</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ni.by_color.map(({ color, count }) => (
                      <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round((count / ni.total) * 100)}%`, background: color, opacity: 0.8, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 20, textAlign: 'right' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ni.top_longest?.length > 0 && (
                <div className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                    <FileText size={13} color="#FFD60A" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Longest notes</span>
                  </div>
                  {ni.top_longest.map((n, i) => (
                    <div key={n.title} onClick={() => navigate('/notes')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-quaternary)', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                      <span style={{ fontSize: 11, color: '#FFD60A', fontWeight: 600, flexShrink: 0 }}>{n.chars >= 1000 ? `~${(n.chars/1000).toFixed(1)}k` : n.chars}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
