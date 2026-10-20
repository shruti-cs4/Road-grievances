/** Draw an image or video onto a canvas, downscaled, and return a JPEG data URL. */
export function toResizedDataURL(source, maxWidth = 1000) {
  const isVideo = source instanceof HTMLVideoElement
  const sw = isVideo ? source.videoWidth : source.naturalWidth
  const sh = isVideo ? source.videoHeight : source.naturalHeight
  const scale = Math.min(1, maxWidth / (sw || maxWidth))
  const w = Math.round(sw * scale)
  const h = Math.round(sh * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(source, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.72)
}

/** Read an uploaded file, downscale it, and resolve a JPEG data URL. */
export function fileToResizedDataURL(file, maxWidth = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(toResizedDataURL(img, maxWidth))
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Reverse-geocode coordinates into a readable address via OpenStreetMap Nominatim. */
export async function reverseGeocode(lat, lng) {
  const fallback = {
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    area: 'Unknown area',
    city: 'Unknown',
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    // HTTP failure from Nominatim
    if (!res.ok) {
      throw new Error(`Reverse geocoding HTTP ${res.status}`)
    }

    const data = await res.json()

    // API returned no usable address
    if (!data || !data.display_name) {
      throw new Error('Reverse geocoding returned no address')
    }

    const a = data.address ?? {}

    const area =
      a.neighbourhood ||
      a.residential ||
      a.quarter ||
      a.suburb ||
      a.city_district ||
      a.village ||
      a.hamlet ||
      a.town ||
      a.road ||
      fallback.area

    const city =
      a.city ||
      a.town ||
      a.municipality ||
      a.state_district ||
      a.county ||
      fallback.city

    return {
      address: data.display_name,
      area,
      city,
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)

    // IMPORTANT:
    // Don't hide the failure. Let report.js decide how to handle it.
    throw new Error('REVERSE_GEOCODING_FAILED')
  }
}