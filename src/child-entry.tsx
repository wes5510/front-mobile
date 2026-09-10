import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ChildPage from './pages/ChildPage'

const container = document.getElementById('root')

if (container) {
  createRoot(container).render(
    <StrictMode>
      <ChildPage />
    </StrictMode>,
  )
}
