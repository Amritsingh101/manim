import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { useThemeStore } from './stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
})

function ThemeInit() {
  const { initTheme } = useThemeStore()
  useEffect(() => { initTheme() }, [initTheme])
  return null
}

function ThemedToaster() {
  // Read theme from localStorage directly to avoid re-render loops
  const stored = (() => { try { return JSON.parse(localStorage.getItem('manim-theme') || '{}').state?.theme } catch { return null } })()
  const isLight = stored === 'light'

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: isLight ? '#FFFFFF' : '#181828',
          color: isLight ? '#111118' : '#EEEEFF',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(107,92,231,0.25)'}`,
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.10)' : '0 4px 20px rgba(0,0,0,0.50)',
        },
        success: { iconTheme: { primary: '#16A34A', secondary: isLight ? '#FFFFFF' : '#181828' } },
        error:   { iconTheme: { primary: '#DC2626', secondary: isLight ? '#FFFFFF' : '#181828' } },
      }}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeInit />
      <App />
      <ThemedToaster />
    </QueryClientProvider>
  </React.StrictMode>
)
