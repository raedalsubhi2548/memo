import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ADMIN_HOST } from './lib/host.js'
import './fonts.css'
import './index.css'

// Public pages arrive pre-rendered (scripts/prerender.mjs): hydrate them with the same catalog they were built with,
// then the live catalog replaces it. Other routes (account, checkout…) start empty and render normally.
if (ADMIN_HOST) document.documentElement.dataset.host = 'admin'
const root = document.getElementById('root')
let initialCatalog
try { initialCatalog = JSON.parse(document.getElementById('__catalog')?.textContent || 'null') || undefined } catch { /* ignore */ }
const app = <React.StrictMode><App Router={BrowserRouter} initialCatalog={initialCatalog} /></React.StrictMode>
if (root.firstElementChild && initialCatalog && !ADMIN_HOST) ReactDOM.hydrateRoot(root, app)
else { root.textContent = ''; document.documentElement.classList.remove('adm'); ReactDOM.createRoot(root).render(app) }
