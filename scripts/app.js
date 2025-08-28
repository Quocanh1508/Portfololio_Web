import { supabase } from './supabase.js'

function showMessage(text, type) {
  const el = document.getElementById('submit-message')
  if (!el) return
  el.textContent = text
  if (type) el.dataset.type = type
}

let isSubmitting = false
async function handleSubmit(event) {
  event.preventDefault()
  const form = event.currentTarget
  if (isSubmitting) return
  isSubmitting = true
  const formData = new FormData(form)

  const payload = {
    url: String(formData.get('url') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    submit_key: String(formData.get('submit_key') || '')
  }

  if (!payload.url || !payload.title || !payload.description || !payload.submit_key) {
    return showMessage('Vui lòng điền đầy đủ thông tin', 'error')
  }

  try {
    const { data, error } = await supabase.rpc('submit_portfolio_item', {
      p_url: payload.url,
      p_title: payload.title,
      p_description: payload.description,
      p_submit_key: payload.submit_key
    })
    if (error) throw error
    showMessage('Nộp bài thành công', 'success')
    form.reset()
    await renderSubmissions()
  } catch (e) {
    showMessage(e.message || 'Có lỗi xảy ra khi nộp bài', 'error')
  }
  isSubmitting = false
}

export async function renderSubmissions() {
  const ownerId = window.__ENV__?.OWNER_UUID
  const query = supabase.from('submissions').select('*').order('created_at', { ascending: false })
  const { data, error } = ownerId
    ? await query.eq('user_id', ownerId)
    : await query

  if (error) {
    console.error('Supabase select error:', error)
    showMessage(error.message || 'Không tải được danh sách', 'error')
    return
  }

  const container = document.getElementById('submissions-list')
  if (!container) return
  container.innerHTML = (data || []).map(x => {
    const safeUrl = escapeAttr(x.url)
    const urlObj = (() => { try { return new URL(x.url) } catch { return null } })()
    const fullShort = urlObj ? `${urlObj.hostname}${urlObj.pathname !== '/' ? urlObj.pathname : ''}` : String(x.url)
    const shortUrl = escapeHtml(truncate(fullShort, 32))
    return (
      `<article class="submission">
        <h3>
          ${escapeHtml(x.title)}
          <a class="open-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Mở liên kết ↗</a>
        </h3>
        <p class="muted">${shortUrl}</p>
        <p>${escapeHtml(x.description)}</p>
      </article>`
    )
  }).join('')
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/[\n\r\t]/g, '')
}

function truncate(str, max) {
  const s = String(str)
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
}

document.getElementById('submit-form')?.addEventListener('submit', handleSubmit)
document.getElementById('refresh')?.addEventListener('click', renderSubmissions)
renderSubmissions()

// UX: smooth scroll + active link + back to top
const back = document.getElementById('backToTop')
if (back) {
  back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) back.classList.add('show'); else back.classList.remove('show')
  })
}

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href')
    if (!href) return
    const target = document.querySelector(href)
    if (!target) return
    e.preventDefault()
    target.scrollIntoView({ behavior: 'smooth' })
  })
})

// Scroll reveal using IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible')
      observer.unobserve(entry.target)
    }
  }
}, { threshold: 0.18 })

document.querySelectorAll('.reveal').forEach(el => observer.observe(el))

