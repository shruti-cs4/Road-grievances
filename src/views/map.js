import L from 'leaflet'
import { icon } from '../icons.js'
import { getReports, getUser } from '../store.js'
import { severityBadge, statusBadge } from '../badges.js'
import { downloadComplaintLetter } from '../pdf.js'

const SEVERITY_COLOR = { low: '#3f9d5a', medium: '#e8a020', high: '#d24444' }

const SEVERITY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function markerIcon(severity, active) {
  const color = SEVERITY_COLOR[severity]
  const size = active ? 34 : 26
  return L.divIcon({
    className: 'roadfix-marker',
    html: `<span style="display:block;width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35);${active ? 'outline:3px solid rgba(0,0,0,.15);' : ''}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

export function MapView() {
  const reports = getReports()
  const user = getUser()
  let query = ''
  let severity = 'all'
  let activeId = null

  let map = null
  let markers = new Map()

  const root = document.createElement('div')
  root.className = 'map-grid'
  root.innerHTML = `
    <div class="map-main">
      <div class="map-box"><div id="map" style="width:100%;height:100%;"></div></div>
    </div>
    <div class="map-aside map-side">
      <div class="input-wrap">
        ${icon('search', 'icon-sm')}
        <input class="input" id="map-search" placeholder="Search area, city or type…" />
      </div>
      <div class="filter-row" id="filters">
        ${SEVERITY_FILTERS.map(
          (f) => `<button type="button" class="pill${f.value === 'all' ? ' active' : ''}" data-sev="${f.value}">${f.label}</button>`,
        ).join('')}
        <span class="filter-count" id="filter-count"></span>
      </div>
      <div class="report-list scroll" id="report-list"></div>
    </div>
  `

  function getFiltered() {
    const q = query.trim().toLowerCase()
    return reports.filter((r) => {
      if (severity !== 'all' && r.severity !== severity) return false
      if (!q) return true
      return (
        r.area.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      )
    })
  }

  function renderList(filtered) {
    const list = root.querySelector('#report-list')
    root.querySelector('#filter-count').textContent =
      `${filtered.length} report${filtered.length === 1 ? '' : 's'}`

    if (filtered.length === 0) {
      list.innerHTML = `<p class="empty-note">No reports match your filters.</p>`
      return
    }
    list.innerHTML = filtered
      .map(
        (r) => `
      <article class="report-item${activeId === r.id ? ' active' : ''}" data-report="${r.id}">
        <button type="button" class="report-item-select" data-id="${r.id}" aria-label="View ${r.category} report">
          <div class="thumb thumb-lg">
            ${r.photo ? `<img src="${r.photo}" alt="${r.category}" />` : icon('map-pin', 'icon')}
          </div>
          <div class="grow">
            <div class="top">
              <p class="row-title truncate">${r.category}</p>
              ${severityBadge(r.severity)}
            </div>
            <p class="addr truncate">${r.address}</p>
            <div class="meta">
              ${statusBadge(r.status)}
              <span class="time">${icon('calendar', 'icon-sm')} ${timeAgo(r.createdAt)}</span>
            </div>
          </div>
        </button>
        <button type="button" class="btn btn-outline btn-sm report-download" data-download="${r.id}">${icon('file-down', 'icon-sm')} PDF letter</button>
      </article>`,
      )
      .join('')

    list.querySelectorAll('[data-id]').forEach((btn) =>
      btn.addEventListener('click', () => selectReport(btn.dataset.id)),
    )
    list.querySelectorAll('[data-download]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const report = reports.find((r) => r.id === btn.dataset.download)
        if (report) downloadComplaintLetter(report, user)
      }),
    )
  }

  function renderMarkers(filtered) {
    if (!map) return
    markers.forEach((m) => m.remove())
    markers = new Map()
    filtered.forEach((r) => {
      const m = L.marker([r.lat, r.lng], { icon: markerIcon(r.severity, activeId === r.id) })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:180px"><strong>${r.category}</strong>
           <div style="font-size:12px;margin:4px 0;color:#555">${r.address}</div>
           <div style="font-size:12px">Severity: <b style="color:${SEVERITY_COLOR[r.severity]}">${r.severity}</b></div></div>`,
        )
      m.on('click', () => selectReport(r.id, false))
      markers.set(r.id, m)
    })
    if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((r) => [r.lat, r.lng]))
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
    }
  }

  function selectReport(id, fly = true) {
    activeId = id
    const r = reports.find((x) => x.id === id)
    const filtered = getFiltered()
    renderList(filtered)
    // refresh marker icons for active state
    markers.forEach((m, mid) => {
      const rep = reports.find((x) => x.id === mid)
      if (rep) m.setIcon(markerIcon(rep.severity, mid === activeId))
    })
    if (r && map) {
      if (fly) map.flyTo([r.lat, r.lng], 16, { duration: 0.8 })
      markers.get(id)?.openPopup()
    }
  }

  function refresh() {
    const filtered = getFiltered()
    renderList(filtered)
    renderMarkers(filtered)
  }

  // Wire controls
  root.querySelector('#map-search').addEventListener('input', (e) => {
    query = e.target.value
    refresh()
  })
  root.querySelectorAll('[data-sev]').forEach((btn) =>
    btn.addEventListener('click', () => {
      severity = btn.dataset.sev
      root.querySelectorAll('[data-sev]').forEach((b) =>
        b.classList.toggle('active', b.dataset.sev === severity),
      )
      refresh()
    }),
  )

  // Initialise the Leaflet map after the node is in the DOM.
  requestAnimationFrame(() => {
    const container = root.querySelector('#map')
    if (!container) return
    const first = reports[0]
    const center = first ? [first.lat, first.lng] : [19.7515, 75.7139]
    map = L.map(container, { scrollWheelZoom: true }).setView(center, 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    map.whenReady(() => map.invalidateSize())
    refresh()
  })

  renderList(getFiltered())
  return root
}
