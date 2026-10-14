import { icon } from '../icons.js'
import { getUser, getReports, computeHotspots } from '../store.js'
import { severityBadge, statusBadge } from '../badges.js'
import { downloadComplaintLetter } from '../pdf.js'

const STEPS = [
  { ic: 'camera', title: 'Capture', text: 'Photograph the road damage.' },
  { ic: 'locate-fixed', title: 'Locate', text: 'We tag exact coordinates and address.' },
  { ic: 'send', title: 'Report', text: 'Your complaint joins the live map.' },
  { ic: 'file-down', title: 'Submit', text: 'Download a formal letter and submit it to the relevant authority.' },
]

export function OverviewView() {
  const user = getUser()
  const reports = getReports()
  const hotspots = computeHotspots(reports)

  const open = reports.filter((r) => r.status !== 'resolved')
  const stats = {
    total: reports.length,
    highOpen: open.filter((r) => r.severity === 'high').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    hotspots: hotspots.filter((h) => h.count >= 2).length,
  }

  const statCards = [
    { label: 'Total complaints', value: stats.total, ic: 'map-pin', tone: '' },
    { label: 'High severity (open)', value: stats.highOpen, ic: 'triangle-alert', tone: 'text-destructive' },
    { label: 'Hotspots', value: stats.hotspots, ic: 'flame', tone: 'text-primary' },
    { label: 'Resolved', value: stats.resolved, ic: 'check-circle', tone: 'text-chart-3' },
  ]

  const recent = reports.slice(0, 5)
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const root = document.createElement('div')
  root.className = 'stack'
  root.innerHTML = `
    <section class="hero">
      <div class="hero-stripes" aria-hidden="true"></div>
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="hero-eyebrow">Hi ${firstName}</p>
          <h1>Spotted a pothole? Report it in under a minute.</h1>
          <p>Every report is mapped and organized to help residents document road damage and prepare a formal complaint for the relevant authority.</p>
        </div>
        <div class="hero-actions">
          <a href="#/report" class="btn btn-primary btn-lg">${icon('plus-circle', 'icon-sm')} Report damage</a>
          <a href="#/map" class="btn btn-secondary btn-lg">${icon('map-pin', 'icon-sm')} View map</a>
          <a href="#/submit" class="btn btn-secondary btn-lg">${icon('file-down', 'icon-sm')} Submit to authorities</a>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      ${statCards
        .map(
          (s) => `
        <div class="card stat">
          <div class="card-content">
            <span class="stat-icon">${icon(s.ic, `icon ${s.tone}`)}</span>
            <div>
              <p class="stat-value">${s.value}</p>
              <p class="stat-label">${s.label}</p>
            </div>
          </div>
        </div>`,
        )
        .join('')}
    </section>

    <div class="grid-5">
      <div class="card span-3">
        <div class="card-header row">
          <h2 class="card-title">Recent reports</h2>
          <a href="#/map" class="link-more">View all ${icon('arrow-right', 'icon-sm')}</a>
        </div>
        <div class="card-content" style="display:flex;flex-direction:column;gap:0.5rem;">
          ${recent
            .map(
              (r) => `
            <div class="recent-row">
              <div class="thumb">
                ${r.photo ? `<img src="${r.photo}" alt="${r.category}" />` : icon('map-pin', 'icon-sm')}
              </div>
              <div class="grow">
                <p class="row-title truncate">${r.category}</p>
                <p class="row-sub truncate">${r.area}, ${r.city}</p>
              </div>
              <div class="col-end">
                ${severityBadge(r.severity)}
                ${statusBadge(r.status)}
                <button type="button" class="btn btn-outline btn-sm recent-download" data-download="${r.id}" aria-label="Download complaint letter PDF">${icon('file-down', 'icon-sm')} PDF</button>
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </div>

      <div class="span-2" style="display:flex;flex-direction:column;gap:1.5rem;">
        <div class="card">
          <div class="card-header row">
            <h2 class="card-title">Top hotspots</h2>
            <a href="#/analytics" class="link-more">Details ${icon('arrow-right', 'icon-sm')}</a>
          </div>
          <div class="card-content" style="display:flex;flex-direction:column;gap:0.625rem;">
            ${hotspots
              .slice(0, 4)
              .map(
                (h, i) => `
              <div class="hotspot-row">
                <span class="rank">${i + 1}</span>
                <div class="grow">
                  <p class="row-title truncate">${h.area}</p>
                  <p class="row-sub">${h.city}</p>
                </div>
                <span class="hotspot-count">${h.count}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">How it works</h2>
          </div>
          <div class="card-content" style="display:flex;flex-direction:column;gap:0.75rem;">
            ${STEPS.map(
              (s) => `
              <div class="step">
                <span class="step-icon">${icon(s.ic, 'icon-sm')}</span>
                <div>
                  <p class="row-title">${s.title}</p>
                  <p class="row-sub">${s.text}</p>
                </div>
              </div>`,
            ).join('')}
          </div>
        </div>
      </div>
    </div>
  `
  root.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      const report = reports.find((r) => r.id === button.dataset.download)
      if (report) downloadComplaintLetter(report, user)
    })
  })

  return root
}
