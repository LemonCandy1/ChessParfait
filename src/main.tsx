import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadRoute } from './routes'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Pages rendered to HTML at build time are hydrated in place. Their code is loaded first
// so the first render matches the HTML instead of falling back to the skeleton.
// Unknown URLs are served the home page's HTML, so only hydrate when it was rendered for this path.
if (container.dataset.prerendered === window.location.pathname) {
  preloadRoute(window.location.pathname)
    .catch(() => {})
    .then(() => hydrateRoot(container, app))
} else {
  createRoot(container).render(app)
}
