import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App'
import { setupDesktop } from './tauri'

// Install the Tauri HTTP fetch before rendering (no-op in the browser)
setupDesktop().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
