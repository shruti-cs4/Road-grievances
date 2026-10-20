import { icon } from './icons.js'
import { getUser, logout } from './store.js'
import { navigate } from './router.js'

const NAV = [
  { href: '#/', label: 'Overview', ic: 'layout-dashboard' },
  { href: '#/report', label: 'Report', ic: 'plus-circle' },
  { href: '#/map', label: 'Map', ic: 'map-pin' },
  { href: '#/analytics', label: 'Priority', ic: 'bar-chart-3' },
  { href: '#/submit', label: 'Submit', ic: 'file-down' },
]

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Render the authenticated app shell around a view node.
 * @param {string} activeHref current route hash
 * @param {HTMLElement} contentNode the view content element
 */
export function renderShell(activeHref, contentNode) {
  const user = getUser()
  const shell = document.createElement('div')
  shell.className = 'shell'

  const desktopNav = NAV.map(
    ({ href, label, ic }) =>
      `<a href="${href}" class="nav-link${href === activeHref ? ' active' : ''}">${icon(ic, 'icon-sm')}${label}</a>`,
  ).join('')

  const mobileNav = NAV.map(
    ({ href, label, ic }) =>
      `<a href="${href}" class="nav-tab${href === activeHref ? ' active' : ''}">${icon(ic, 'icon')}${label}</a>`,
  ).join('')

  shell.innerHTML = `
    <header class="appbar">
      <div class="appbar-inner">
        <a href="#/" class="brand">
          <span class="brand-badge">${icon('triangle-alert', 'icon')}</span>
          <span class="brand-name">Road<span class="accent">-Fix</span></span>
        </a>
        <nav class="nav-desktop">${desktopNav}</nav>
        <div class="appbar-user">
          <div class="user-meta">
            <p class="name">${user.name}</p>
            <p class="email">${user.email}</p>
          </div>
          <span class="avatar">${initials(user.name)}</span>
          <button class="btn btn-ghost btn-icon" id="logout-btn" aria-label="Sign out">
            ${icon('log-out', 'icon-sm')}
          </button>
        </div>
      </div>
    </header>
    <main class="main"></main>
    <nav class="nav-mobile">
      <div class="nav-mobile-inner">${mobileNav}</div>
    </nav>
  `

  shell.querySelector('.main').appendChild(contentNode)
  shell.querySelector('#logout-btn').addEventListener('click', async () => {
    try {
      await logout()
      navigate('#/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  })

  return shell
}

/** Full-screen loading placeholder. */
export function loadingScreen() {
  const el = document.createElement('div')
  el.className = 'loading-screen'
  el.innerHTML = `${icon('triangle-alert', 'icon pulse')}<span>Loading Civil-Complaint…</span>`
  return el
}
