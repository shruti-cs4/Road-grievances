const STATUS_LABELS = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  'in-progress': 'In progress',
  resolved: 'Resolved',
}

/** Severity badge markup. */
export function severityBadge(severity) {
  return `<span class="badge sev-${severity}"><span class="dot" aria-hidden="true"></span>${severity}</span>`
}

/** Status badge markup. */
export function statusBadge(status) {
  return `<span class="badge st-${status}">${STATUS_LABELS[status]}</span>`
}
