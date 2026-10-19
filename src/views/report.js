import { icon } from '../icons.js'
import { CATEGORIES, SEVERITIES, addReport } from '../store.js'
import { reverseGeocode, fileToResizedDataURL, toResizedDataURL } from '../media.js'
import { navigate } from '../router.js'
import { toast } from '../toast.js'

const SEVERITY_HELP = {
  low: 'Minor, cosmetic',
  medium: 'Noticeable, needs repair',
  high: 'Dangerous, urgent',
}

export function ReportView() {
  const state = {
    photo: null,
    photoFile: null,
    category: 'Pothole',
    severity: 'medium',
    description: '',
    location: null,
    locating: false,
    submitting: false,
  }

  // Camera state
  let stream = null
  let cameraOpen = false

  const root = document.createElement('form')
  root.className = 'report-grid'
  root.setAttribute('novalidate', '')

  /* ---------------- Photo capture rendering ---------------- */
  function photoMarkup() {
    if (cameraOpen) {
      return `
        <div class="photo-frame" style="background:var(--foreground);">
          <div class="photo-inner">
            <video id="cam-video" playsinline muted></video>
            <div class="photo-cambar">
              <button type="button" class="btn btn-secondary btn-sm" id="cam-cancel">${icon('x', 'icon-sm')} Cancel</button>
              <button type="button" class="btn btn-primary" id="cam-capture">${icon('camera', 'icon-sm')} Capture</button>
            </div>
          </div>
        </div>`
    }
    if (state.photo) {
      return `
        <div class="photo-frame">
          <div class="photo-inner">
            <img src="${state.photo}" alt="Reported road damage" />
            <div class="photo-tools">
              <button type="button" class="btn btn-secondary btn-sm" id="photo-retake">${icon('rotate-ccw', 'icon-sm')} Retake</button>
              <button type="button" class="btn btn-secondary btn-icon btn-sm" id="photo-remove" aria-label="Remove photo">${icon('x', 'icon-sm')}</button>
            </div>
          </div>
        </div>`
    }
    return `
      <div class="photo-drop">
        <span class="bubble">${icon('image', 'icon-lg')}</span>
        <p class="title">Add a photo of the damage</p>
        <p class="hint">Use your camera for an on-the-spot photo, or upload an existing one.</p>
        <div class="photo-actions">
          <button type="button" class="btn btn-primary" id="open-camera">${icon('camera', 'icon-sm')} Open camera</button>
          <button type="button" class="btn btn-outline" id="upload-btn">${icon('upload', 'icon-sm')} Upload</button>
        </div>
      </div>
      <input type="file" accept="image/*" capture="environment" id="file-input" hidden />`
  }

  /* ---------------- Location rendering ---------------- */
  function locationMarkup() {
    if (state.location) {
      const l = state.location
      return `
        <div class="loc-address">
          ${icon('map-pin', 'icon-sm')}
          <p>${l.address}</p>
        </div>
        <div class="coord-grid">
          <div class="coord"><p class="k">Latitude</p><p class="v">${l.lat.toFixed(6)}</p></div>
          <div class="coord"><p class="k">Longitude</p><p class="v">${l.lng.toFixed(6)}</p></div>
        </div>
        <p class="section-hint">Area detected: <span style="color:var(--foreground);font-weight:500;">${l.area}</span>${l.city ? `, ${l.city}` : ''}</p>`
    }
    return `
      <div class="loc-empty">
        ${icon('navigation', 'icon-lg')}
        <p>Capture your exact latitude &amp; longitude, converted to a readable address.</p>
      </div>`
  }

  function render() {
    root.innerHTML = `
      <div class="report-main" style="display:flex;flex-direction:column;gap:1.5rem;">
        <section class="form-section">
          <div>
            <span class="label">1. Photo of the damage</span>
            <p class="section-hint">Add a photo of the damage. It will be uploaded and shared with your complaint.</p>
          </div>
          <div id="photo-slot">${photoMarkup()}</div>
        </section>

        <section class="form-section">
          <span class="label">2. What is the issue?</span>
          <div class="chip-grid">
            ${CATEGORIES.map(
              (c) => `<button type="button" class="chip${state.category === c ? ' active' : ''}" data-cat="${c}">${c}</button>`,
            ).join('')}
          </div>
        </section>

        <section class="form-section">
          <span class="label">3. How severe is it?</span>
          <div class="sev-grid">
            ${SEVERITIES.map((s) => {
              let cls = 'sev-chip'
              if (state.severity === s) cls += s === 'high' ? ' active-high' : ' active'
              return `<button type="button" class="${cls}" data-sev="${s}">${s}<small>${SEVERITY_HELP[s]}</small></button>`
            }).join('')}
          </div>
        </section>

        <section class="form-section">
          <label class="label" for="description">4. Description</label>
          <textarea class="textarea" id="description" rows="4"
            placeholder="Describe the damage, its size, and any risk to road users…">${state.description}</textarea>
        </section>
      </div>

      <div class="report-aside">
        <div class="sticky-side">
          <div class="card">
            <div class="card-content" style="display:flex;flex-direction:column;gap:1rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span class="label">Location</span>
                <button type="button" class="btn ${state.location ? 'btn-outline' : 'btn-primary'} btn-sm" id="detect-loc" ${state.locating ? 'disabled' : ''}>
                  ${state.locating ? icon('loader', 'icon-sm') : icon('locate-fixed', 'icon-sm')}
                  ${state.location ? 'Refresh' : 'Use my location'}
                </button>
              </div>
              <div id="loc-slot" style="display:flex;flex-direction:column;gap:0.75rem;">${locationMarkup()}</div>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-lg w-full" id="submit-btn" ${state.submitting ? 'disabled' : ''}>
            ${state.submitting ? icon('loader', 'icon-sm') : icon('send', 'icon-sm')} Raise complaint
          </button>
          <p class="section-hint" style="text-align:center;">Your report is added to the live map and reviewed twice a week for priority routing.</p>
        </div>
      </div>
    `
    wire()
  }

  /* ---------------- Camera helpers ---------------- */
  function stopCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop())
    stream = null
    cameraOpen = false
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera not available. Please upload a photo instead.')
      root.querySelector('#file-input')?.click()
      return
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      cameraOpen = true
      renderPhotoSlot()
      const video = root.querySelector('#cam-video')
      if (video) {
        video.srcObject = stream
        video.play().catch(() => {})
      }
    } catch {
      toast.error('Could not access the camera. Please allow permission or upload a photo.')
    }
  }
  function capture() {
    const video = root.querySelector('#cam-video')
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not capture the image.')
        return
      }

      state.photoFile = new File(
        [blob],
        `road-damage-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      state.photo = URL.createObjectURL(blob)
      stopCamera()
      renderPhotoSlot()
    }, 'image/jpeg', 0.85)
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Please choose an image smaller than 5 MB.')
      e.target.value = ''
      return
    }

    try {
      state.photoFile = file
      state.photo = await fileToResizedDataURL(file)
      renderPhotoSlot()
    } catch {
      state.photoFile = null
      state.photo = null
      toast.error('Could not read that image.')
    } finally {
      e.target.value = ''
    }
  }

  function renderPhotoSlot() {
    const slot = root.querySelector('#photo-slot')
    if (slot) {
      slot.innerHTML = photoMarkup()
      wirePhoto()
    }
  }

  function renderLocSlot() {
    const slot = root.querySelector('#loc-slot')
    if (slot) slot.innerHTML = locationMarkup()
    const btn = root.querySelector('#detect-loc')
    if (btn) {
      btn.disabled = state.locating
      btn.className = `btn ${state.location ? 'btn-outline' : 'btn-primary'} btn-sm`
      btn.innerHTML = `${state.locating ? icon('loader', 'icon-sm') : icon('locate-fixed', 'icon-sm')} ${state.location ? 'Refresh' : 'Use my location'}`
    }
  }
  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported', {
        description: 'Your browser does not provide location services.',
      })
      return
    }

    state.locating = true
    renderLocSlot()

    navigator.geolocation.getCurrentPosition(
      // -----------------------------------------
      // GPS SUCCESS
      // -----------------------------------------
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords

        toast.message('Location captured', {
          description: 'Looking up the address…',
        })

        try {
          const details = await reverseGeocode(latitude, longitude)

          state.location = {
            lat: latitude,
            lng: longitude,
            accuracy,
            ...details,
          }

          state.locating = false
          renderLocSlot()

          toast.success('Location detected', {
            description: `${details.area}${details.city ? `, ${details.city}` : ''}`,
          })
        } catch (error) {
          console.error('Reverse geocoding error:', error)

          state.locating = false
          renderLocSlot()

          toast.error('Location captured, but address lookup failed', {
            description:
              'Your coordinates were detected, but we could not convert them into an address. Please try again.',
          })
        }
      },

      // -----------------------------------------
      // GPS ERROR
      // -----------------------------------------
      (err) => {
        state.locating = false
        renderLocSlot()

        console.error('Geolocation error:', {
          code: err.code,
          message: err.message,
        })

        switch (err.code) {
          case err.PERMISSION_DENIED:
            toast.error('Location permission denied', {
              description:
                'Please allow location access for Road-Fix in your browser settings.',
            })
            break

          case err.POSITION_UNAVAILABLE:
            toast.error('Location unavailable', {
              description:
                'Your device could not determine your current location. This can happen on laptops when location services cannot obtain a position.',
            })
            break

          case err.TIMEOUT:
            toast.error('Location request timed out', {
              description:
                'Your device took too long to determine your location. Please try again.',
            })
            break

          default:
            toast.error('Unable to determine location', {
              description:
                'An unknown location error occurred. Please try again.',
            })
        }
      },

      // -----------------------------------------
      // GEOLOCATION OPTIONS
      // -----------------------------------------
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      },
    )
  }

  /* ---------------- Wiring ---------------- */
  function wirePhoto() {
    root.querySelector('#open-camera')?.addEventListener('click', openCamera)
    root.querySelector('#upload-btn')?.addEventListener('click', () => root.querySelector('#file-input')?.click())
    root.querySelector('#file-input')?.addEventListener('change', onFile)
    root.querySelector('#cam-cancel')?.addEventListener('click', () => {
      stopCamera()
      renderPhotoSlot()
    })
    root.querySelector('#cam-capture')?.addEventListener('click', capture)
    root.querySelector('#photo-retake')?.addEventListener('click', openCamera)
    root.querySelector('#photo-remove')?.addEventListener('click', () => {
      if (state.photo?.startsWith('blob:')) {
        URL.revokeObjectURL(state.photo)
      }
      state.photo = null
      state.photoFile = null
      renderPhotoSlot()
    })
  }

  function wire() {
    wirePhoto()

    root.querySelectorAll('[data-cat]').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat
        root.querySelectorAll('[data-cat]').forEach((b) =>
          b.classList.toggle('active', b.dataset.cat === state.category),
        )
      }),
    )

    root.querySelectorAll('[data-sev]').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.severity = btn.dataset.sev
        root.querySelectorAll('[data-sev]').forEach((b) => {
          b.classList.remove('active', 'active-high')
          if (b.dataset.sev === state.severity) {
            b.classList.add(state.severity === 'high' ? 'active-high' : 'active')
          }
        })
      }),
    )

    root.querySelector('#description')?.addEventListener('input', (e) => {
      state.description = e.target.value
    })

    root.querySelector('#detect-loc')?.addEventListener('click', detectLocation)
  }

  root.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!state.location) {
      toast.error('Please capture your location first.')
      return
    }
    if (state.description.trim().length < 5) {
      toast.error('Please add a short description of the damage.')
      return
    }
    state.submitting = true
    const submitButton = root.querySelector('#submit-btn')
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Submitting…' }
    try {
      const report = await addReport({
        photo: state.photoFile,
        lat: state.location.lat,
        lng: state.location.lng,
        address: state.location.address,
        area: state.location.area,
        city: state.location.city,
        category: state.category,
        severity: state.severity,
        description: state.description.trim(),
      })
      toast.success('Complaint shared with Road-Fix', {
        description: `Reference #${String(report.id).slice(0, 6).toUpperCase()} • ${report.area || report.city}`,
      })
      stopCamera()
      navigate('#/map')
    } catch (error) {
      console.error('Complaint submission failed:', error)
      state.submitting = false
      const button = root.querySelector('#submit-btn')
      if (button) { button.disabled = false; button.innerHTML = `${icon('send', 'icon-sm')} Raise complaint` }
      toast.error('Could not submit complaint', { description: error.message || 'Please check your connection and try again.' })
    }
  })

  render()
  return root
}
