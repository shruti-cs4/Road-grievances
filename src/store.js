import { supabase, isSupabaseConfigured } from './supabase.js'

export const CATEGORIES = [
  'Pothole', 'Crack', 'Waterlogging', 'Broken Footpath', 'Damaged Divider', 'Open Manhole',
]
export const SEVERITIES = ['low', 'medium', 'high']
export const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 4 }

const state = { ready: false, user: null, reports: [] }

function normalizeReport(row) {
  return {
    id: row.id,
    photo: row.photo_url || null,
    photo_url: row.photo_url || null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address || '',
    area: row.area || '',
    city: row.city || '',
    category: row.category,
    severity: row.severity,
    description: row.description,
    status: row.status || 'reported',
    createdAt: row.created_at,
    reporter_name: row.reporter_name || 'Road-Fix user',
    reporterEmail: '',
  }
}

function normalizeUser(user) {
  if (!user) return null
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Road-Fix user'
  return { id: user.id, email: user.email || '', name }
}

export async function initStore() {
  if (!isSupabaseConfigured) {
    state.ready = true
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
  }
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  state.user = normalizeUser(session?.user)
  await refreshReports()
  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = normalizeUser(session?.user)
  })
  state.ready = true
}

export function getUser() { return state.user }
export function getReports() { return state.reports }
export function isStoreReady() { return state.ready }

export async function refreshReports() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('reports')
    .select('id, user_id, reporter_name, lat, lng, address, area, city, category, severity, photo_url, description, status, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  state.reports = (data || []).map(normalizeReport)
  return state.reports
}

export async function login(email, password, name) {
  if (!supabase) throw new Error('Supabase is not configured. Add your project URL and anon key to .env.')
  const normalizedEmail = email.trim().toLowerCase()
  if (name) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: name.trim() } },
    })
    if (error) throw error
    if (!data.session) return { confirmationRequired: true }
    state.user = normalizeUser(data.user)
    return { confirmationRequired: false }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
  if (error) throw error
  state.user = normalizeUser(data.user)
  await refreshReports()
  return { confirmationRequired: false }
}

export async function logout() {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
  state.user = null
}

export async function addReport(r) {
  if (!supabase || !state.user?.id) throw new Error('Please sign in before submitting a complaint.')
  
  let photoUrl = null
  if (r.photo instanceof File) {
    const file = r.photo

    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Photo must be 5 MB or smaller.')
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath =`${state.user.id}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('complaint-photos')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage
      .from('complaint-photos')
      .getPublicUrl(filePath)

    photoUrl = publicData.publicUrl
  }

  const payload = {
    user_id: state.user.id,
    reporter_name: state.user.name,
    lat: Number(r.lat),
    lng: Number(r.lng),
    address: String(r.address || '').slice(0, 500),
    area: String(r.area || '').slice(0, 200),
    city: String(r.city || '').slice(0, 200),
    category: r.category,
    severity: r.severity,
    description: String(r.description || '').trim().slice(0, 3000),
    status: 'reported',
  }
  const { data, error } = await supabase.from('reports').insert(payload).select('id, user_id, reporter_name, lat, lng, address, area, city, category, severity, photo_url, description, status, created_at').single()
  if (error) throw error
  const report = normalizeReport(data)
  state.reports = [report, ...state.reports.filter((existing) => existing.id !== report.id)]
  return report
}

export function computeHotspots(reports) {
  const groups = new Map()
  for (const r of reports) {
    const key = `${r.city || 'Unknown'}::${r.area || 'Unknown'}`
    const arr = groups.get(key) ?? []
    arr.push(r)
    groups.set(key, arr)
  }
  const hotspots = []
  for (const [key, group] of groups) {
    const open = group.filter((r) => r.status !== 'resolved')
    const score = group.reduce((s, r) => s + (SEVERITY_WEIGHT[r.severity] || 1), 0)
    const categories = {}
    for (const r of group) categories[r.category] = (categories[r.category] ?? 0) + 1
    hotspots.push({ key, area: group[0].area || 'Unknown area', city: group[0].city || 'Unknown city', count: group.length, score,
      high: open.filter((r) => r.severity === 'high').length,
      lat: group.reduce((s, r) => s + r.lat, 0) / group.length,
      lng: group.reduce((s, r) => s + r.lng, 0) / group.length, categories })
  }
  return hotspots.sort((a, b) => b.score - a.score || b.count - a.count)
}
