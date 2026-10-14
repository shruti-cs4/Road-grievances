import { icon } from '../icons.js'
import { getReports, getUser } from '../store.js'
import { severityBadge, statusBadge } from '../badges.js'
import { downloadComplaintLetter } from '../pdf.js'

const PORTALS = [
  {
    title: 'Maharashtra State Grievance Portal',
    description: 'Use this state-level channel for grievances relating to Maharashtra government departments. Keep the acknowledgement/token number for follow-up.',
    href: 'https://grievances.maharashtra.gov.in/en',
    label: 'Open state grievance portal',
    tag: 'State government',
  },
  {
    title: 'Maharashtra PWD — Road Complaint Guidance',
    description: 'Official Public Works Department information, including regional toll-free numbers for potholes on PWD roads. Check which agency owns the road before submitting.',
    href: 'https://pwd.maharashtra.gov.in/en/toll-free-numbers-for-registering-pothole-complaints-on-pwd-roads/',
    label: 'View PWD complaint contacts',
    tag: 'Roads / potholes',
  },
  {
    title: 'CPGRAMS — Central Public Grievances',
    description: 'A Government of India grievance platform. Use it only where the matter falls within the relevant government organisation’s jurisdiction; registration is required.',
    href: 'https://pgportal.gov.in/',
    label: 'Open CPGRAMS',
    tag: 'Central / eligible departments',
  },
]

function cityPortals(reports) {
  const cities = [...new Set(reports.map((r) => String(r.city || '').trim()).filter(Boolean))]
  const items = []
  for (const city of cities) {
    if (/mumbai/i.test(city)) items.push({ title: 'MyBMC — Municipal Corporation of Greater Mumbai', description: 'Official BMC citizen portal. Use the available civic grievance channels for road issues in Mumbai.', href: 'https://portal.mcgm.gov.in/', label: 'Open MyBMC', tag: city })
    else if (/pune/i.test(city) && reports.some((r) => /pimpri|chinchwad/i.test(`${r.city} ${r.address}`))) items.push({ title: 'PCMC — Pimpri Chinchwad Municipal Corporation', description: 'Official PCMC website with citizen grievance services and pothole-management information.', href: 'https://www.pcmcindia.gov.in/', label: 'Open PCMC website', tag: city })
    else if (/pune/i.test(city)) items.push({ title: 'PMC — Pune Municipal Corporation', description: 'Official Pune Municipal Corporation website. Check the current citizen grievance or road-complaint options.', href: 'https://www.pmc.gov.in/', label: 'Open PMC website', tag: city })
    else if (/nagpur/i.test(city)) items.push({ title: 'Nagpur Municipal Corporation', description: 'Official NMC website with citizen services and grievance information.', href: 'https://nmcnagpur.gov.in/', label: 'Open NMC website', tag: city })
  }
  const seen = new Set()
  return items.filter((item) => !seen.has(item.href) && seen.add(item.href))
}

export function SubmitView() {
  const reports = getReports()
  const user = getUser()
  const root = document.createElement('div')
  root.className = 'stack submit-page'
  const portals = [...cityPortals(reports), ...PORTALS]

  root.innerHTML = `
    <section class="page-heading">
      <p class="eyebrow">Citizen action centre</p>
      <h1>Take your complaint to the right authority.</h1>
      <p>Download a formal, complaint-specific letter, check the relevant government channel, and submit it yourself. Road-Fix does not send complaints to government systems automatically.</p>
    </section>

    <section class="notice-card">
      <div class="notice-icon">${icon('file-down', 'icon-lg')}</div>
      <div>
        <h2>How to submit your letter</h2>
        <ol>
          <li>Download the PDF for the specific complaint below.</li>
          <li>Review the address and coordinates; add your mobile number and postal address, then sign the letter.</li>
          <li>Open the relevant official portal or contact the road-owning department. Upload the PDF if accepted, or print and submit it in person.</li>
          <li>Save the official acknowledgement / complaint number for follow-up.</li>
        </ol>
      </div>
    </section>

    <section>
      <div class="section-heading-row">
        <div><h2>Your complaint letters</h2><p class="section-hint">Each PDF is generated from that report's location, issue, severity and description.</p></div>
        <span class="count-chip">${reports.length} reports</span>
      </div>
      <div class="submission-reports">
        ${reports.length ? reports.map((r) => `
          <article class="submission-report card">
            <div class="submission-report-main">
              <div class="thumb thumb-lg">${r.photo ? `<img src="${r.photo}" alt="${r.category}" />` : icon('map-pin', 'icon')}</div>
              <div class="grow">
                <div class="submission-title-row"><h3>${r.category}</h3>${severityBadge(r.severity)}</div>
                <p class="row-sub">${r.address || `${r.area || ''}, ${r.city || ''}`}</p>
                <p class="submission-description">${r.description || 'No additional description provided.'}</p>
                <div class="submission-meta">${statusBadge(r.status)} <span>Ref: ROADFIX-${String(r.id).toUpperCase()}</span></div>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-download="${r.id}">${icon('file-down', 'icon-sm')} Download letter PDF</button>
          </article>
        `).join('') : '<p class="empty-note">No complaints have been recorded yet. Create a report first to generate its letter.</p>'}
      </div>
    </section>

    <section>
      <div class="section-heading-row"><div><h2>Official submission channels</h2><p class="section-hint">Choose the authority that owns or maintains the road. Portal availability and accepted attachments may vary.</p></div></div>
      <div class="portal-grid">
        ${portals.map((p) => `
          <article class="card portal-card">
            <span class="portal-tag">${p.tag}</span>
            <h3>${p.title}</h3>
            <p>${p.description}</p>
            <a class="btn btn-outline btn-sm" href="${p.href}" target="_blank" rel="noopener noreferrer">${p.label} ${icon('arrow-right', 'icon-sm')}</a>
          </article>
        `).join('')}
      </div>
    </section>
    <p class="legal-note">Important: India does not have one universal prescribed letter template for every road-damage complaint. This is a formal citizen representation format, not an official government form. Local bodies may require complaints through their own portal, app, helpline, or ward office. Never assume that downloading or generating a PDF means the complaint has been filed.</p>
  `

  root.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      const report = reports.find((r) => r.id === button.dataset.download)
      if (report) downloadComplaintLetter(report, user)
    })
  })
  return root
}
