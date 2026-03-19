import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import PromptsPage from './pages/PromptsPage'
import SkillsPage from './pages/SkillsPage'
import SteeringPage from './pages/SteeringPage'
import McpPage from './pages/McpPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import TrashPage from './pages/TrashPage'
import CommandsPage from './pages/CommandsPage'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [window.location.pathname])

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/steering" element={<SteeringPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/commands" element={<CommandsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/trash" element={<TrashPage />} />
        </Routes>
      </div>
    </div>
  )
}
