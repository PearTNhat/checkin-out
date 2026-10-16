import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const ExtAuth = lazy(() => import('./ExtAuth.jsx'))
const path = window.location.pathname

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/ext-auth' ? (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Đang tải...</div>}>
        <ExtAuth />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
