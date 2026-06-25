import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ExtAuth from './ExtAuth.jsx'

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/ext-auth' ? <ExtAuth /> : <App />}
  </StrictMode>,
)
