// 音色偏好：Enhanced/Premium/Neural 优先，Apple 已知自然音色次之
function pickVoice(voices, lang) {
  const candidates = voices.filter((v) => v.lang.startsWith(lang))
  if (!candidates.length) return null
  const premium = candidates.find((v) => /enhanced|premium|neural/i.test(v.name))
  if (premium) return premium
  const apple = candidates.find((v) => /Samantha|Ava|Karen|Moira|Alex/i.test(v.name))
  if (apple) return apple
  return candidates[0]
}

function getVoicesReady() {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices()
    if (v.length) { resolve(v); return }
    window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices())
    // 300ms fallback，部分浏览器不触发 onvoiceschanged
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 300)
  })
}

export async function speak(text) {
  if (!('speechSynthesis' in window) || !text) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = /[一-龥]/.test(text) ? 'zh-CN' : 'en-US'
  utter.rate = 0.85
  const voices = await getVoicesReady()
  const voice = pickVoice(voices, utter.lang)
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

// 优先播放真人录音 URL，失败或没有 URL 时回退 TTS
export async function speakWithAudio(audioUrl, text) {
  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl)
      await audio.play()
      return
    } catch {
      // 离线或链接失效，降级到 TTS
    }
  }
  await speak(text)
}

// 查询音标 + 真人录音 URL（US 口音优先）
export async function lookupPhoneticAndAudio(word) {
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
    const phonetics = entry.phonetics || []

    const withAudio = phonetics.filter((p) => p.audio)
    const preferred = withAudio.find((p) => p.audio.includes('-us.')) || withAudio[0]

    const phonetic =
      entry.phonetic ||
      phonetics.find((p) => p.text)?.text ||
      ''
    const audioUrl = preferred?.audio || ''

    return { phonetic, audioUrl }
  } finally {
    clearTimeout(timer)
  }
}

// 向后兼容保留
export async function lookupPhonetic(word) {
  const { phonetic } = await lookupPhoneticAndAudio(word)
  return phonetic
}
