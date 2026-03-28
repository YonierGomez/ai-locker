import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(20, 20, 35, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              fontFamily: 'Geist, -apple-system, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#30D158', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#FF375F', secondary: 'white' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
