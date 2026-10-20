import { getUser } from '../store.js'
import { downloadComplaintLetter } from '../pdf.js'

export function openComplaintModal(report) {
  const oldModal = document.querySelector('#complaint-modal')
  oldModal?.remove()

  const modal = document.createElement('div')
  modal.id = 'complaint-modal'
  modal.className = 'complaint-modal-overlay'

  const date = report.created_at
    ? new Date(report.created_at).toLocaleString()
    : 'Not available'

  const photo = report.photo
    ? `<img class="complaint-modal-photo" src="${report.photo}" alt="Road damage photo">`
    : `<div class="complaint-modal-no-photo">No photo available</div>`

  modal.innerHTML = `
    <section class="complaint-modal-card" role="dialog"
      aria-modal="true" aria-labelledby="complaint-modal-title">

      <button class="complaint-modal-close" aria-label="Close">&times;</button>

      ${photo}

      <div class="complaint-modal-body">
        <div class="complaint-modal-heading">
          <div>
            <p class="complaint-modal-eyebrow">ROAD-FIX COMPLAINT</p>
            <h2 id="complaint-modal-title">${escapeHTML(report.category || 'Road damage')}</h2>
          </div>
          <span class="complaint-modal-severity severity-${escapeHTML(report.severity || 'low')}">
            ${escapeHTML(report.severity || 'Unknown')} severity
          </span>
        </div>

        <div class="complaint-modal-grid">
          <div class="complaint-modal-field">
            <span>Report ID</span>
            <strong>${escapeHTML(String(report.id ?? 'N/A'))}</strong>
          </div>
          <div class="complaint-modal-field">
            <span>Date reported</span>
            <strong>${escapeHTML(date)}</strong>
          </div>
          <div class="complaint-modal-field">
            <span>Latitude</span>
            <strong>${escapeHTML(String(report.lat ?? 'N/A'))}</strong>
          </div>
          <div class="complaint-modal-field">
            <span>Longitude</span>
            <strong>${escapeHTML(String(report.lng ?? 'N/A'))}</strong>
          </div>
          <div class="complaint-modal-field">
            <span>Severity</span>
            <strong>${escapeHTML(report.severity || 'Not specified')}</strong>
          </div>
          <div class="complaint-modal-field">
            <span>Status</span>
            <strong>${escapeHTML(report.status || 'Unknown')}</strong>
          </div>
        </div>

        <div class="complaint-modal-section">
          <h3><span>📍</span> Location</h3>
          <p>${escapeHTML(report.address || report.area || 'Address unavailable')}</p>
          <p class="complaint-modal-muted">
            ${escapeHTML([report.area, report.city].filter(Boolean).join(', '))}
          </p>
        </div>

        <div class="complaint-modal-section">
          <h3>Description</h3>
          <p class="complaint-modal-description">
            ${escapeHTML(report.description || 'No description provided.')}
          </p>
        </div>

        <div class="complaint-modal-section">
          <h3>Reported by</h3>
          <p>${escapeHTML(report.reporter_name || 'Not available')}</p>
        </div>

        <div class="complaint-modal-actions">
          <button type="button" class="complaint-modal-map">View on map</button>
          <button type="button" class="complaint-modal-pdf">Download PDF</button>
        </div>
      </div>
    </section>
  `

  document.body.appendChild(modal)
  document.body.style.overflow = 'hidden'

  const close = () => {
    modal.remove()
    document.body.style.overflow = ''
  }

  modal.querySelector('.complaint-modal-close').addEventListener('click', close)
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close()
  })

  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      close()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)

  modal.querySelector('.complaint-modal-map').addEventListener('click', () => {
    close()
    window.location.hash = '#/map'
  })

  
  modal.querySelector('.complaint-modal-pdf').addEventListener('click', () => {
    downloadComplaintLetter(report, getUser())
  })
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char])
}
