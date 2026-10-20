import './styles.css'
import { initStore } from './store.js'
import { startRouter } from './router.js'
import { toast } from './toast.js'

async function startApp() {
  try {
    await initStore()
    startRouter()
  } catch (error) {
    console.error('Civil-Complaint startup failed:', error)

    const app = document.getElementById('app')
    if (app) {
      const message = String(error.message || error).replace(
        /[&<>"']/g,
        (c) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
      )

      app.innerHTML = `
        <main style="max-width:720px;margin:4rem auto;padding:2rem;font-family:system-ui">
          <h1>Civil-Complaint setup required</h1>
          <p>${message}</p>
          <p>
            Create a Supabase project, configure <code>.env</code>,
            and run the SQL in <code>supabase/schema.sql</code>.
            Then restart the development server.
          </p>
        </main>
      `
    }

    toast.error('Civil-Complaint could not connect to the shared database.', {
      description: error.message,
    })
  }
}

startApp()
