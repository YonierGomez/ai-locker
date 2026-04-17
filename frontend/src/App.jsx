import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import CommandPalette from './components/CommandPalette'
import PromptsPage from './pages/PromptsPage'
import SkillsPage from './pages/SkillsPage'
import InstructionsPage from './pages/InstructionsPage'
import McpPage from './pages/McpPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import TrashPage from './pages/TrashPage'
import CommandsPage from './pages/CommandsPage'
import NotesPage from './pages/NotesPage'
import AiSessionPage from './pages/AiSessionPage'
import SnippetsPage from './pages/SnippetsPage'
import AgentsPage from './pages/AgentsPage'
import HooksPage from './pages/HooksPage'
import VaultPage from './pages/VaultPage'
import { settingsApi } from './utils/api'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('promptly_sidebar_collapsed') === '1'
  })
  const qc = useQueryClient()

  // ── Bootstrap: auto-configure Bearer token from server's API_KEY
  // /api/client-config is a public endpoint that returns the API_KEY so the
  // frontend can authenticate automatically without manual user input.
  useEffect(() => {
    fetch('/api/client-config')
      .then(r => r.json())
      .then(data => {
        if (data.apiKey) {
          const stored = localStorage.getItem('promptly_api_key')
          if (stored !== data.apiKey) {
            localStorage.setItem('promptly_api_key', data.apiKey)
            // Token changed — invalidate all queries so they re-run authenticated
            qc.invalidateQueries()
          }
        }
      })
      .catch(() => { /* server not ready yet */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60000,
  })

  // Apply accent color from saved settings
  useEffect(() => {
    if (settings?.accent_color) {
      document.documentElement.style.setProperty('--blue', settings.accent_color)
      document.documentElement.style.setProperty('--accent', settings.accent_color)
    }
  }, [settings?.accent_color])

  // Global Cmd+K / Ctrl+K shortcut
  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setPaletteOpen(p => !p)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    localStorage.setItem('promptly_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  return (
    <>
      <div className={`app-layout ${sidebarCollapsed ? 'sidebar-desktop-collapsed' : ''}`}>
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="main-content">
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            onSearchClick={() => setPaletteOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed(v => !v)}
            sidebarCollapsed={sidebarCollapsed}
          />

          <div key={location.pathname} className="route-transition">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/steering" element={<InstructionsPage />} />
              <Route path="/mcp" element={<McpPage />} />
              <Route path="/commands" element={<CommandsPage />} />
              <Route path="/snippets" element={<SnippetsPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/hooks" element={<HooksPage />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/ai" element={<AiSessionPage />} />
            </Routes>
          </div>
        </div>

        {/* Global Command Palette */}
        <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </>
  )
}
