import { icon } from '../icons.js'
import { login } from '../store.js'
import { navigate } from '../router.js'
import { toast } from '../toast.js'

const HIGHLIGHTS = [
  { ic: 'camera', title: 'Snap & report', text: 'Capture road damage with your camera in seconds.' },
  { ic: 'map-pin', title: 'Pinpoint location', text: 'Exact latitude, longitude and a readable address.' },
  { ic: 'shield-check', title: 'Ready for submission', text: 'Generate a formal complaint letter and find the relevant government channel.' },
]

export function LoginView() {
  let mode = 'signin' // 'signin' | 'signup'

  const root = document.createElement('div')
  root.className = 'auth'

  function template() {
    return `
      <section class="auth-brand">
        <div class="stripes" aria-hidden="true"></div>
        <div class="auth-brand-head">
          <span class="brand-badge">${icon('triangle-alert', 'icon-lg')}</span>
          <span class="brand-name">Road<span class="accent">-Fix</span></span>
        </div>
        <div class="auth-copy">
          <p class="region">Maharashtra</p>
          <h1 class="text-balance">Report a pothole. Help fix the road.</h1>
          <p>Crowdsourced road-damage reporting that turns citizen photos into prioritized,
            location-tagged complaints for the people who can repair them.</p>
          <ul class="auth-highlights">
            ${HIGHLIGHTS.map(
              (h) => `
              <li>
                <span class="hi-icon">${icon(h.ic, 'icon')}</span>
                <div>
                  <p class="hi-title">${h.title}</p>
                  <p class="hi-text">${h.text}</p>
                </div>
              </li>`,
            ).join('')}
          </ul>
        </div>
        <p class="auth-footnote">A civic initiative — residents can prepare complaint letters and submit them through official channels.</p>
      </section>

      <section class="auth-form-panel">
        <div class="auth-form">
          <div class="auth-form-brand">
            <span class="brand-badge">${icon('triangle-alert', 'icon')}</span>
            <span class="brand-name">Road<span class="accent">-Fix</span></span>
          </div>
          <h2>${mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p class="sub">${
            mode === 'signin'
              ? 'Sign in to report and track road damage.'
              : 'Join Civil-Complaint to start reporting road damage.'
          }</p>
          <form class="auth-fields" id="auth-form">
            ${
              mode === 'signup'
                ? `<div class="field">
                    <label class="label" for="name">Full name</label>
                    <input class="input" id="name" placeholder="Your name" autocomplete="name" />
                  </div>`
                : ''
            }
            <div class="field">
              <label class="label" for="email">Email</label>
              <input class="input" id="email" type="email" placeholder="you@example.com" autocomplete="email" />
            </div>
            <div class="field">
              <label class="label" for="password">Password</label>
              <input class="input" id="password" type="password" placeholder="••••••••"
                autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" />
            </div>
            <button type="submit" class="btn btn-primary btn-lg w-full mt-2">
              ${mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p class="auth-switch">
            ${mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" id="switch-mode">${mode === 'signin' ? 'Sign up' : 'Sign in'}</button>
          </p>
        </div>
      </section>
    `
  }

  function wire() {
    root.querySelector('#switch-mode').addEventListener('click', () => {
      mode = mode === 'signin' ? 'signup' : 'signin'
      root.innerHTML = template()
      wire()
    })

    root.querySelector('#auth-form').addEventListener('submit', (e) => {
      e.preventDefault()
      const name = root.querySelector('#name')?.value.trim() ?? ''
      const email = root.querySelector('#email').value.trim()
      const password = root.querySelector('#password').value

      if (!email || !password || (mode === 'signup' && !name)) {
        toast.error('Please fill in all fields.')
        return
      }
      const submitButton = root.querySelector('button[type="submit"]')
      submitButton.disabled = true
      submitButton.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…'
      login(email, password, mode === 'signup' ? name : undefined)
        .then((result) => {
          if (result.confirmationRequired) {
            toast.message('Check your email to confirm your account', { description: 'After confirming, return here and sign in.' })
            mode = 'signin'
            root.innerHTML = template()
            wire()
            return
          }
          toast.success(mode === 'signup' ? 'Account created. Welcome!' : 'Signed in successfully.')
          navigate('#/')
        })
        .catch((error) => {
          toast.error('Authentication failed', { description: error.message || 'Please check your email and password.' })
          const currentButton = root.querySelector('button[type="submit"]')
          if (currentButton) { currentButton.disabled = false; currentButton.textContent = mode === 'signup' ? 'Create account' : 'Sign in' }
        })
    })
  }

  root.innerHTML = template()
  wire()
  return root
}
