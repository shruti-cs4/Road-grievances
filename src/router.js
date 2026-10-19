import { getUser, refreshReports } from './store.js'
import { renderShell } from './shell.js'
import { LoginView } from './views/login.js'
import { OverviewView } from './views/overview.js'
import { ReportView } from './views/report.js'
import { MapView } from './views/map.js'
import { AnalyticsView } from './views/analytics.js'
import { SubmitView } from './views/submit.js'
import { toast } from './toast.js'

const ROUTES = {
  '#/': { view: OverviewView, protected: true },
  '#/report': { view: ReportView, protected: true },
  '#/map': { view: MapView, protected: true },
  '#/analytics': { view: AnalyticsView, protected: true },
  '#/submit': { view: SubmitView, protected: true },
  '#/login': { view: LoginView, protected: false },
}
let renderVersion = 0

export function navigate(hash) {
  if (location.hash === hash) render()
  else location.hash = hash
}
function currentHash() {
  const h = location.hash || '#/'
  return ROUTES[h] ? h : '#/'
}

async function render() {
  const version = ++renderVersion
  const app = document.getElementById('app')
  const hash = currentHash()
  const route = ROUTES[hash]
  const user = getUser()
  if (route.protected && !user) {
    if (location.hash !== '#/login') location.hash = '#/login'
    else app.replaceChildren(LoginView())
    return
  }
  if (hash === '#/login' && user) {
    location.hash = '#/'
    return
  }
  if (route.protected) {
    try {
      await refreshReports()
    } catch (error) {
      console.error('Could not refresh reports:', error)
      toast.error('Could not load shared complaints', { description: error.message || 'Check your connection and Supabase configuration.' })
    }
  }
  if (version !== renderVersion || currentHash() !== hash) return
  const content = route.view()
  app.replaceChildren()
  app.appendChild(route.protected ? renderShell(hash, content) : content)
  window.scrollTo(0, 0)
}

export function startRouter() {
  window.addEventListener('hashchange', render)
  if (!location.hash) location.hash = getUser() ? '#/' : '#/login'
  else render()
}
