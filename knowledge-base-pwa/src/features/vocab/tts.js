export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = /[一-龥]/.test(text) ? 'zh-CN' : 'en-US'
  utter.rate = 0.85
  window.speechSynthesis.speak(utter)
}

export function ttsAvailable() {
  return 'speechSynthesis' in window
}

export async function lookupPhonetic(word) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase().trim())}`,
      { signal: controller.signal }
    )
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    const entry = data[0]
    const phonetic =
      entry.phonetic ||
      (entry.phonetics || []).find((p) => p.text)?.text ||
      ''
    return phonetic
  } finally {
    clearTimeout(timer)
  }
}
