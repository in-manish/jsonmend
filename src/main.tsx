import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyLocationToStore } from './ui/navigation'
import { Shell } from './ui/Shell'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

applyLocationToStore()

createRoot(root).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
