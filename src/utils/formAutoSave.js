const DEFAULT_STORAGE_KEY = 'app_form_autosave_v1'

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch (_error) {
    return fallback
  }
}

function getNodeIndexAmongSameTag(node) {
  if (!node?.parentElement) return 1
  const tag = node.tagName
  const siblings = Array.from(node.parentElement.children).filter((item) => item.tagName === tag)
  const index = siblings.indexOf(node)
  return index >= 0 ? index + 1 : 1
}

function buildElementPath(node) {
  const segments = []
  let current = node
  while (current && current !== document.body) {
    const tag = String(current.tagName || '').toLowerCase()
    if (!tag) break
    const index = getNodeIndexAmongSameTag(current)
    segments.unshift(`${tag}:${index}`)
    current = current.parentElement
  }
  return segments.join('>')
}

function shouldTrackField(field) {
  if (!field || field.disabled) return false
  if (field.hasAttribute('data-autosave-ignore')) return false
  const type = String(field.type || '').toLowerCase()
  if (type === 'password') return false
  if (type === 'file') return false
  if (type === 'hidden') return false
  if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') return false
  return true
}

function getFieldKey(field, index) {
  const explicit = String(field.getAttribute('data-autosave-key') || '').trim()
  if (explicit) return explicit
  const name = String(field.name || '').trim()
  if (name) return `name:${name}`
  const id = String(field.id || '').trim()
  if (id) return `id:${id}`
  return `index:${index}`
}

function formIsOptOut(form) {
  const mode = String(form.getAttribute('data-autosave') || '').trim().toLowerCase()
  return mode === 'off'
}

export function createFormAutoSave(options = {}) {
  const storageKey = String(options.storageKey || DEFAULT_STORAGE_KEY)
  const getScope = typeof options.getScope === 'function' ? options.getScope : () => 'global'
  const debounceMs = Number(options.debounceMs || 300)
  const restoreDebounceMs = Number(options.restoreDebounceMs || 140)

  let isRestoring = false
  let destroyed = false
  let saveTimers = new Map()
  let restoreTimer = null
  let observer = null

  let store = safeParse(window.localStorage.getItem(storageKey), {})

  function persistStore() {
    window.localStorage.setItem(storageKey, JSON.stringify(store))
  }

  function getFormId(form) {
    const explicit = String(form.getAttribute('data-autosave-id') || '').trim()
    if (explicit) return `id:${explicit}`
    return `path:${buildElementPath(form)}`
  }

  function getScopeBucket(scope) {
    const scopeKey = String(scope || 'global')
    const bucket = store[scopeKey]
    if (bucket && typeof bucket === 'object') return bucket
    store[scopeKey] = {}
    return store[scopeKey]
  }

  function collectFormSnapshot(form) {
    const controls = Array.from(form.querySelectorAll('input,select,textarea'))
    if (controls.length === 0) return null

    const values = {}
    controls.forEach((field, index) => {
      if (!shouldTrackField(field)) return
      const type = String(field.type || '').toLowerCase()
      const baseKey = getFieldKey(field, index)

      if (type === 'radio') {
        const radioKey = `radio:${String(field.name || baseKey)}`
        if (!(radioKey in values)) values[radioKey] = null
        if (field.checked) values[radioKey] = String(field.value ?? '')
        return
      }

      if (type === 'checkbox') {
        values[`checkbox:${baseKey}`] = Boolean(field.checked)
        return
      }

      values[`value:${baseKey}`] = String(field.value ?? '')
    })

    if (Object.keys(values).length === 0) return null
    return {
      values,
      updatedAt: Date.now()
    }
  }

  function applySnapshotToForm(form, snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.values || typeof snapshot.values !== 'object') return
    const controls = Array.from(form.querySelectorAll('input,select,textarea'))
    if (controls.length === 0) return

    isRestoring = true
    try {
      controls.forEach((field, index) => {
        if (!shouldTrackField(field)) return
        const type = String(field.type || '').toLowerCase()
        const baseKey = getFieldKey(field, index)
        const beforeValue = type === 'checkbox' ? Boolean(field.checked) : String(field.value ?? '')
        let changed = false

        if (type === 'radio') {
          const radioKey = `radio:${String(field.name || baseKey)}`
          if (!(radioKey in snapshot.values)) return
          const shouldCheck = String(snapshot.values[radioKey] ?? '') === String(field.value ?? '')
          if (Boolean(field.checked) !== shouldCheck) {
            field.checked = shouldCheck
            changed = true
          }
        } else if (type === 'checkbox') {
          const checkboxKey = `checkbox:${baseKey}`
          if (!(checkboxKey in snapshot.values)) return
          const next = Boolean(snapshot.values[checkboxKey])
          if (Boolean(field.checked) !== next) {
            field.checked = next
            changed = true
          }
        } else {
          const valueKey = `value:${baseKey}`
          if (!(valueKey in snapshot.values)) return
          const next = String(snapshot.values[valueKey] ?? '')
          if (beforeValue !== next) {
            field.value = next
            changed = true
          }
        }

        if (!changed) return
        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.dispatchEvent(new Event('change', { bubbles: true }))
      })
    } finally {
      isRestoring = false
    }
  }

  function saveForm(form) {
    if (destroyed || !form || formIsOptOut(form)) return
    const scope = String(getScope() || 'global')
    const formId = getFormId(form)
    const snapshot = collectFormSnapshot(form)
    const bucket = getScopeBucket(scope)

    if (!snapshot) {
      if (bucket[formId]) {
        delete bucket[formId]
        persistStore()
      }
      return
    }

    bucket[formId] = snapshot
    persistStore()
  }

  function queueSaveForm(form) {
    if (!form || destroyed || isRestoring) return
    const key = `${String(getScope() || 'global')}::${getFormId(form)}`
    const previous = saveTimers.get(key)
    if (previous) window.clearTimeout(previous)
    const timer = window.setTimeout(() => {
      saveTimers.delete(key)
      saveForm(form)
    }, debounceMs)
    saveTimers.set(key, timer)
  }

  function restoreCurrentScope() {
    if (destroyed) return
    const scope = String(getScope() || 'global')
    const bucket = store[scope]
    if (!bucket || typeof bucket !== 'object') return
    const forms = Array.from(document.querySelectorAll('form'))
    forms.forEach((form) => {
      if (formIsOptOut(form)) return
      const formId = getFormId(form)
      const snapshot = bucket[formId]
      if (!snapshot) return
      applySnapshotToForm(form, snapshot)
    })
  }

  function queueRestore() {
    if (destroyed) return
    if (restoreTimer) window.clearTimeout(restoreTimer)
    restoreTimer = window.setTimeout(() => {
      restoreTimer = null
      restoreCurrentScope()
    }, restoreDebounceMs)
  }

  function clearScope(scope) {
    const scopeKey = String(scope || getScope() || 'global')
    if (!store[scopeKey]) return
    delete store[scopeKey]
    persistStore()
  }

  function clearAll() {
    store = {}
    persistStore()
  }

  function onInput(event) {
    const form = event?.target?.closest?.('form')
    if (!form) return
    queueSaveForm(form)
  }

  document.addEventListener('input', onInput, true)
  document.addEventListener('change', onInput, true)

  observer = new MutationObserver(() => {
    queueRestore()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  queueRestore()

  return {
    restoreCurrentScope,
    queueRestore,
    clearScope,
    clearAll,
    destroy() {
      if (destroyed) return
      destroyed = true
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onInput, true)
      if (observer) {
        observer.disconnect()
        observer = null
      }
      if (restoreTimer) {
        window.clearTimeout(restoreTimer)
        restoreTimer = null
      }
      saveTimers.forEach((timer) => window.clearTimeout(timer))
      saveTimers.clear()
    }
  }
}
