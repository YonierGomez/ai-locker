import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import CommandPalette from './components/CommandPalette'
import PromptsPage from './pages/PromptsPage'
import SkillsPage from './pages/SkillsPage'
import SteeringPage from './pages/SteeringPage'
import McpPage from './pages/McpPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import TrashPage from './pages/TrashPage'
import CommandsPage from './pages/CommandsPage'
import NotesPage from './pages/NotesPage'
import AiSessionPage from './pages/AiSessionPage'
import { settingsApi } from './utils/api'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

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

  return (
    <>
      <div className="app-layout">
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
          />

          <div key={location.pathname} className="route-transition">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/steering" element={<SteeringPage />} />
              <Route path="/mcp" element={<McpPage />} />
              <Route path="/commands" element={<CommandsPage />} />
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
