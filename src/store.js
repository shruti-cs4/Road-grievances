const REPORTS_KEY = 'roadfix.reports.v1'
const USER_KEY = 'roadfix.user.v1'

export const CATEGORIES = [
  'Pothole',
  'Crack',
  'Waterlogging',
  'Broken Footpath',
  'Damaged Divider',
  'Open Manhole',
]

export const SEVERITIES = ['low', 'medium', 'high']

export const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 4 }

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const SEED = [
  { id: uid(), photo: null, lat: 19.076, lng: 72.8777, address: 'S.V. Road, Bandra West, Mumbai', area: 'Bandra West', city: 'Mumbai', category: 'Pothole', severity: 'high', description: 'Deep pothole near the junction, two-wheelers skidding during rain.', status: 'acknowledged', createdAt: daysAgo(2), reporter: 'Aarti P.' },
  { id: uid(), photo: null, lat: 19.081, lng: 72.842, address: 'Linking Road, Khar West, Mumbai', area: 'Khar West', city: 'Mumbai', category: 'Pothole', severity: 'high', description: 'Cluster of potholes across both lanes, worsening every week.', status: 'reported', createdAt: daysAgo(1), reporter: 'Rohit K.' },
  { id: uid(), photo: null, lat: 19.0745, lng: 72.8795, address: 'Hill Road, Bandra West, Mumbai', area: 'Bandra West', city: 'Mumbai', category: 'Waterlogging', severity: 'medium', description: 'Water collects here after light rain, hiding a large pothole.', status: 'reported', createdAt: daysAgo(3), reporter: 'Sana M.' },
  { id: uid(), photo: null, lat: 18.5204, lng: 73.8567, address: 'FC Road, Shivajinagar, Pune', area: 'Shivajinagar', city: 'Pune', category: 'Pothole', severity: 'high', description: 'Multiple potholes near the college, heavy student traffic.', status: 'in-progress', createdAt: daysAgo(5), reporter: 'Kiran D.' },
  { id: uid(), photo: null, lat: 18.5289, lng: 73.8743, address: 'Koregaon Park Road 5, Pune', area: 'Koregaon Park', city: 'Pune', category: 'Crack', severity: 'low', description: 'Long surface crack running along the divider.', status: 'resolved', createdAt: daysAgo(9), reporter: 'Meghna S.' },
  { id: uid(), photo: null, lat: 18.5167, lng: 73.8562, address: 'JM Road, Deccan, Pune', area: 'Deccan', city: 'Pune', category: 'Open Manhole', severity: 'high', description: 'Uncovered manhole on a busy stretch, no barricade.', status: 'reported', createdAt: daysAgo(1), reporter: 'Anonymous' },
  { id: uid(), photo: null, lat: 21.1458, lng: 79.0882, address: 'Wardha Road, Dhantoli, Nagpur', area: 'Dhantoli', city: 'Nagpur', category: 'Pothole', severity: 'medium', description: 'Edge of the road broken away near the bus stop.', status: 'acknowledged', createdAt: daysAgo(4), reporter: 'Vivek T.' },
  { id: uid(), photo: null, lat: 21.1497, lng: 79.0806, address: 'Sitabuldi Main Road, Nagpur', area: 'Sitabuldi', city: 'Nagpur', category: 'Broken Footpath', severity: 'medium', description: 'Footpath slabs lifted, pedestrians forced onto the road.', status: 'reported', createdAt: daysAgo(6), reporter: 'Priya N.' },
  { id: uid(), photo: null, lat: 19.0771, lng: 72.8785, address: 'Turner Road, Bandra West, Mumbai', area: 'Bandra West', city: 'Mumbai', category: 'Pothole', severity: 'medium', description: 'Recurring pothole that was patched but reopened.', status: 'reported', createdAt: daysAgo(2), reporter: 'Imran S.' },
  { id: uid(), photo: null, lat: 18.5211, lng: 73.8579, address: 'FC Road near Garware, Pune', area: 'Shivajinagar', city: 'Pune', category: 'Pothole', severity: 'high', description: 'Another deep pothole a few metres from the earlier one.', status: 'reported', createdAt: daysAgo(1), reporter: 'Neha J.' },
]

const state = {
  ready: false,
  user: null,
  reports: [],
}

export function initStore() {
  try {
    const storedUser = localStorage.getItem(USER_KEY)
    if (storedUser) state.user = JSON.parse(storedUser)

    const storedReports = localStorage.getItem(REPORTS_KEY)
    if (storedReports) {
      state.reports = JSON.parse(storedReports)
    } else {
      state.reports = SEED
      localStorage.setItem(REPORTS_KEY, JSON.stringify(SEED))
    }
  } catch {
    state.reports = SEED
  } finally {
    state.ready = true
  }
}

export function getUser() {
  return state.user
}

export function getReports() {
  return state.reports
}

function persistReports(next) {
  state.reports = next
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota errors */
  }
}

export function login(email, name) {
  const derived = (name && name.trim()) || email.split('@')[0].replace(/[._]/g, ' ')
  state.user = { email, name: derived }
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(state.user))
  } catch {}
}

export function logout() {
  state.user = null
  try {
    localStorage.removeItem(USER_KEY)
  } catch {}
}

export function addReport(r) {
  const report = {
    ...r,
    id: uid(),
    createdAt: new Date().toISOString(),
    status: 'reported',
    reporter: state.user?.name ?? 'Anonymous',
    reporterEmail: state.user?.email ?? '',
  }
  persistReports([report, ...state.reports])
  return report
}

export function computeHotspots(reports) {
  const groups = new Map()
  for (const r of reports) {
    const key = `${r.city}::${r.area}`
    const arr = groups.get(key) ?? []
    arr.push(r)
    groups.set(key, arr)
  }

  const hotspots = []
  for (const [key, group] of groups) {
    const open = group.filter((r) => r.status !== 'resolved')
    const score = group.reduce((s, r) => s + SEVERITY_WEIGHT[r.severity], 0)
    const categories = {}
    for (const r of group) categories[r.category] = (categories[r.category] ?? 0) + 1
    hotspots.push({
      key,
      area: group[0].area,
      city: group[0].city,
      count: group.length,
      score,
      high: open.filter((r) => r.severity === 'high').length,
      lat: group.reduce((s, r) => s + r.lat, 0) / group.length,
      lng: group.reduce((s, r) => s + r.lng, 0) / group.length,
      categories,
    })
  }
  return hotspots.sort((a, b) => b.score - a.score || b.count - a.count)
}
