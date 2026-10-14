import { getUser } from './store.js'
import { renderShell } from './shell.js'
import { LoginView } from './views/login.js'
import { OverviewView } from './views/overview.js'
import { ReportView } from './views/report.js'
import { MapView } from './views/map.js'
import { AnalyticsView } from './views/analytics.js'
import { SubmitView } from './views/submit.js'

const ROUTES = {
  '#/': { view: OverviewView, protected: true },
  '#/report': { view: ReportView, protected: true },
  '#/map': { view: MapView, protected: true },
  '#/analytics': { view: AnalyticsView, protected: true },
  '#/submit': { view: SubmitView, protected: true },
  '#/login': { view: LoginView, protected: false },
}

/** Programmatic navigation. */
export function navigate(hash) {
  if (location.hash === hash) render()
  else location.hash = hash
}

function currentHash() {
  const h = location.hash || '#/'
  return ROUTES[h] ? h : '#/'
}

function render() {
  const app = document.getElementById('app')
  const hash = currentHash()
  const user = getUser()

  // Auth guard
  if (ROUTES[hash].protected && !user) {
    if (location.hash !== '#/login') {
      location.hash = '#/login'
      return
    }
  }
  if (hash === '#/login' && user) {
    location.hash = '#/'
    return
  }

  const route = ROUTES[hash]
  const content = route.view()

  app.replaceChildren()
  if (route.protected) {
    app.appendChild(renderShell(hash, content))
  } else {
    app.appendChild(content)
  }
  window.scrollTo(0, 0)
}

/** Start the hash router. */
export function startRouter() {
  window.addEventListener('hashchange', render)
  if (!location.hash) location.hash = getUser() ? '#/' : '#/login'
  else render()
}
