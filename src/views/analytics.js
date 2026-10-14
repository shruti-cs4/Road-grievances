import { icon } from '../icons.js'
import { getReports, computeHotspots } from '../store.js'
import { toast } from '../toast.js'

function nextAnalysisDate() {
  // Analysis runs twice a week: Monday (1) and Thursday (4).
  const now = new Date()
  const day = now.getDay()
  const targets = [1, 4]
  let best = 7
  for (const t of targets) {
    const delta = (t - day + 7) % 7 || 7
    best = Math.min(best, delta)
  }
  const d = new Date(now)
  d.setDate(now.getDate() + best)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

function buildReportText(hotspots) {
  const lines = []
  lines.push('ROAD-FIX — HIGH-PRIORITY ROAD DAMAGE REPORT')
  lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`)
  lines.push('Prepared for: Public Works Department, Government of Maharashtra')
  lines.push('='.repeat(56))
  hotspots.slice(0, 10).forEach((h, i) => {
    const cats = Object.entries(h.categories)
      .map(([c, n]) => `${c} (${n})`)
      .join(', ')
    lines.push('')
    lines.push(`${i + 1}. ${h.area}, ${h.city}`)
    lines.push(`   Complaints: ${h.count} | High severity: ${h.high} | Priority score: ${h.score}`)
    lines.push(`   Approx. location: ${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`)
    lines.push(`   Issue types: ${cats}`)
  })
  return lines.join('\n')
}

export function AnalyticsView() {
  const reports = getReports()
  const hotspots = computeHotspots(reports)

  const open = reports.filter((r) => r.status !== 'resolved')
  const stats = {
    total: reports.length,
    highOpen: open.filter((r) => r.severity === 'high').length,
    hotspots: hotspots.filter((h) => h.high > 0 || h.count >= 2).length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  const chartData = hotspots.slice(0, 7).map((h) => ({
    name: h.area.length > 12 ? h.area.slice(0, 12) + '…' : h.area,
    score: h.score,
    high: h.high,
  }))
  const maxScore = Math.max(1, ...chartData.map((d) => d.score))

  const statCards = [
    { label: 'Total complaints', value: stats.total, ic: 'map-pinned', tone: '' },
    { label: 'High severity (open)', value: stats.highOpen, ic: 'triangle-alert', tone: 'text-destructive' },
    { label: 'Active hotspots', value: stats.hotspots, ic: 'map-pinned', tone: 'text-primary' },
    { label: 'Resolved', value: stats.resolved, ic: 'check-circle', tone: 'text-chart-3' },
  ]

  const root = document.createElement('div')
  root.className = 'stack'
  root.innerHTML = `
    <div class="analysis-banner">
      <div class="analysis-left">
        <span class="analysis-icon">${icon('calendar-clock', 'icon')}</span>
        <div>
          <p class="row-title">Biweekly priority analysis</p>
          <p class="row-sub">Reports are analysed twice a week. Next run: ${nextAnalysisDate()}.</p>
        </div>
      </div>
      <button class="btn btn-primary" id="download-btn">${icon('file-down', 'icon-sm')} Generate authority report</button>
    </div>

    <div class="stats-grid">
      ${statCards
        .map(
          (s) => `
        <div class="card stat">
          <div class="card-content">
            ${icon(s.ic, `icon ${s.tone}`)}
            <div>
              <p class="stat-value">${s.value}</p>
              <p class="stat-label">${s.label}</p>
            </div>
          </div>
        </div>`,
        )
        .join('')}
    </div>

    <div class="grid-5">
      <div class="card span-3">
        <div class="card-header"><h2 class="card-title">Priority score by area</h2></div>
        <div class="card-content">
          <div class="chart">
            ${chartData
              .map(
                (d) => `
              <div class="bar-col">
                <div class="bar-track">
                  <div class="bar${d.high > 0 ? ' high' : ''}" style="height:${Math.max(2, (d.score / maxScore) * 100)}%;">
                    <span class="bar-val">${d.score}</span>
                  </div>
                </div>
                <span class="bar-label" title="${d.name}">${d.name}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="card span-2">
        <div class="card-header"><h2 class="card-title">Top priority locations</h2></div>
        <div class="card-content" style="display:flex;flex-direction:column;">
          ${hotspots
            .slice(0, 6)
            .map(
              (h, i) => `
            ${i > 0 ? '<div class="separator"></div>' : ''}
            <div class="priority-item">
              <span class="rank${i === 0 ? ' rank-top' : ''}">${i + 1}</span>
              <div class="grow">
                <p class="row-title truncate">${h.area}, ${h.city}</p>
                <p class="row-sub">${h.count} complaints · ${h.high} high severity · score ${h.score}</p>
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </div>
    </div>
  `

  root.querySelector('#download-btn').addEventListener('click', () => {
    const blob = new Blob([buildReportText(hotspots)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'roadfix-priority-report.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Priority report generated', {
      description: 'Compiled the top hotspots for the authorities.',
    })
  })

  return root
}
