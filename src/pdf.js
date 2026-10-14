function safeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wrap(text, max = 88) {
  const words = safeText(text).split(' ').filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    if (!line) line = word
    else if (`${line} ${word}`.length <= max) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function pdfEscape(text) {
  return safeText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function makePdf(lines) {
  const pageChunks = []
  let current = []
  let used = 0
  for (const line of lines) {
    const height = line.gapBefore ?? 0
    if (used + height + (line.gapAfter ?? 15) > 690 && current.length) {
      pageChunks.push(current)
      current = []
      used = 0
    }
    current.push(line)
    used += height + (line.gapAfter ?? 15)
  }
  if (current.length) pageChunks.push(current)

  const objects = []
  const addObject = (body) => { objects.push(body); return objects.length }
  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds = []

  for (const chunk of pageChunks) {
    let y = 790
    const commands = []
    for (const line of chunk) {
      y -= line.gapBefore ?? 0
      const size = line.size ?? 11
      commands.push(`BT /F1 ${size} Tf 56 ${y.toFixed(2)} Td (${pdfEscape(line.text)}) Tj ET`)
      y -= line.gapAfter ?? 15
    }
    const stream = commands.join('\n')
    const contentId = addObject(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdf).length)
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xrefOffset = new TextEncoder().encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Generate a formal, complaint-specific representation letter as a downloadable PDF. */
export function downloadComplaintLetter(report, user = null) {
  const reporter = safeText(report.reporter || user?.name || '')
  const email = safeText(report.reporterEmail || (reporter && reporter === safeText(user?.name) ? user?.email : '') || '')
  const city = safeText(report.city || 'the concerned city')
  const authority = /mumbai/i.test(city)
    ? 'The Municipal Commissioner, Municipal Corporation of Greater Mumbai'
    : /pune/i.test(city) && /pimpri|chinchwad/i.test(safeText(report.address))
      ? 'The Municipal Commissioner, Pimpri Chinchwad Municipal Corporation'
      : /pune/i.test(city)
        ? 'The Municipal Commissioner, Pune Municipal Corporation'
        : /nagpur/i.test(city)
          ? 'The Municipal Commissioner, Nagpur Municipal Corporation'
          : 'The Municipal Commissioner / Executive Engineer (Roads), concerned local authority'

  const subject = `Request for inspection and urgent rectification of ${safeText(report.category || 'road damage')} at ${safeText(report.area || report.address || 'the reported location')}`
  const lines = []
  const add = (text, options = {}) => lines.push({ text, ...options })
  const paragraph = (text, max = 88) => {
    wrap(text, max).forEach((line, i) => add(line, { gapAfter: i === wrap(text, max).length - 1 ? 13 : 14 }))
    add('', { gapAfter: 5 })
  }

  add('CITIZEN REPRESENTATION / ROAD-DAMAGE COMPLAINT', { size: 15, gapAfter: 25 })
  add(`Date: ${formatDate(new Date().toISOString())}`, { gapAfter: 22 })
  add('To,', { gapAfter: 15 })
  wrap(authority, 88).forEach((line) => add(line, { gapAfter: 15 }))
  add(city, { gapAfter: 22 })
  add('Subject:', { gapAfter: 15 })
  wrap(subject, 88).forEach((line) => add(line, { gapAfter: 15 }))
  add('Respected Sir/Madam,', { gapAfter: 22 })
  paragraph(`I wish to bring to your attention a road/infrastructure safety issue recorded at ${safeText(report.address || 'the location specified below')}. The details of the complaint are provided for your inspection and necessary action.`)
  add('COMPLAINT DETAILS', { size: 12, gapAfter: 19 })
  const details = [
    `Reference ID: ROADFIX-${safeText(report.id || 'N/A').toUpperCase()}`,
    `Nature of issue: ${safeText(report.category || 'Road damage')}`,
    `Location: ${safeText(report.address || 'Not recorded')}`,
    `Area / locality: ${safeText(report.area || 'Not recorded')}`,
    `City / district: ${city}`,
    `Coordinates: Latitude ${Number.isFinite(Number(report.lat)) ? Number(report.lat).toFixed(6) : 'N/A'}, Longitude ${Number.isFinite(Number(report.lng)) ? Number(report.lng).toFixed(6) : 'N/A'}`,
    `Severity indicated by reporter: ${safeText(report.severity || 'Not assessed').toUpperCase()}`,
    `Date reported on Road-Fix: ${formatDate(report.createdAt)}`,
    `Current Road-Fix status: ${safeText(report.status || 'Reported')}`,
    `Description: ${safeText(report.description || 'No additional description provided.')}`,
    `Photograph: ${report.photo ? 'A photograph is available in the Road-Fix report; please attach the original image separately if required.' : 'No photograph was attached to this report.'}`,
  ]
  details.forEach((detail) => wrap(detail, 88).forEach((line) => add(line, { gapAfter: 15 })))
  add('', { gapAfter: 7 })
  paragraph('In view of the potential risk to commuters, pedestrians and vehicles, I respectfully request that the concerned department inspect the site, arrange the necessary repair or safety measures at the earliest, and provide a complaint/reference number and an update on the action taken.', 88)
  paragraph('I request that this representation be forwarded to the responsible road-owning agency if the location falls under another department or jurisdiction.', 88)
  add('Thank you.', { gapAfter: 24 })
  add('Yours faithfully,', { gapAfter: 22 })
  add(reporter || '[Your full name]', { gapAfter: 15 })
  add(`Email: ${email || '[Your email address]'}`, { gapAfter: 15 })
  add('Mobile: [Enter your mobile number]', { gapAfter: 15 })
  add('Postal address: [Enter your postal address]', { gapAfter: 22 })
  add('Signature: __________________________', { gapAfter: 25 })
  add('Enclosure: Photograph(s) and any supporting material, where available.', { size: 9, gapAfter: 14 })
  add('Note: This is a citizen-drafted representation, not a government-issued form. Please verify the details, complete contact fields, sign it, and follow the receiving authority\'s submission instructions.', { size: 8, gapAfter: 12 })

  const blob = makePdf(lines)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `Road-Fix_Complaint_${safeText(report.id || 'report').replace(/\s/g, '')}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
