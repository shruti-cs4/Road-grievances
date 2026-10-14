import { icon } from './icons.js'

const ICONS = {
  success: 'check-circle',
  error: 'triangle-alert',
  message: 'map-pin',
}

function show(type, title, description) {
  const region = document.getElementById('toast-region')
  if (!region) return

  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.setAttribute('role', type === 'error' ? 'alert' : 'status')
  el.innerHTML = `
    <span class="toast-icon">${icon(ICONS[type] || 'map-pin', 'icon-sm')}</span>
    <div class="toast-body">
      <p class="toast-title">${escapeHtml(title)}</p>
      ${description ? `<p class="toast-desc">${escapeHtml(description)}</p>` : ''}
    </div>
  `
  region.appendChild(el)
  requestAnimationFrame(() => el.classList.add('in'))

  const remove = () => {
    el.classList.remove('in')
    el.addEventListener('transitionend', () => el.remove(), { once: true })
    setTimeout(() => el.remove(), 400)
  }
  setTimeout(remove, 3800)
  el.addEventListener('click', remove)
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
}

export const toast = {
  success: (title, opts = {}) => show('success', title, opts.description),
  error: (title, opts = {}) => show('error', title, opts.description),
  message: (title, opts = {}) => show('message', title, opts.description),
}
