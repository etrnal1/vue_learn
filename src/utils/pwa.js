/**
 * PWA 检测和管理工具
 */

/**
 * 检测应用是否作为 PWA 运行
 * @returns {Object} PWA 检测结果
 */
export function detectPWA() {
  const isPWA = {
    installed: false,
    mode: null,
    displayMode: null,
    standalone: false,
    hasServiceWorker: false,
    isPWACapable: false
  }

  // 检测独立显示模式（PWA 安装后的独立应用模式）
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isPWA.installed = true
    isPWA.displayMode = 'standalone'
  }

  // 检测最小 UI 模式（带最小导航的浏览器 UI）
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    isPWA.displayMode = 'minimal-ui'
  }

  // 检查 navigator.standalone（iOS Safari）
  if (navigator.standalone === true) {
    isPWA.installed = true
    isPWA.displayMode = 'standalone'
    isPWA.mode = 'ios'
  }

  // 检查是否有 Service Worker
  if ('serviceWorker' in navigator) {
    isPWA.hasServiceWorker = true
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        isPWA.hasServiceWorker = true
      }
    }).catch(() => {})
  }

  // 检查是否支持 PWA（有 manifest 文件）
  const hasManifest = document.querySelector('link[rel="manifest"]') !== null
  if (hasManifest) {
    isPWA.isPWACapable = true
  }

  // 综合判断：如果安装、有显示模式或 Service Worker，则认为是 PWA
  if (isPWA.installed || isPWA.hasServiceWorker || isPWA.isPWACapable) {
    isPWA.installed = isPWA.installed || isPWA.hasServiceWorker
  }

  return isPWA
}

/**
 * 获取 PWA 状态的友好文本
 * @param {Object} pwaInfo PWA 检测结果
 * @returns {string} 状态文本
 */
export function getPWAStatusText(pwaInfo) {
  if (pwaInfo.installed) {
    return 'PWA 已安装'
  }
  if (pwaInfo.isPWACapable) {
    return 'PWA 就绪'
  }
  return '网页应用'
}

/**
 * 获取 PWA 安装状态详情
 * @param {Object} pwaInfo PWA 检测结果
 * @returns {string} 详情文本
 */
export function getPWAStatusDetail(pwaInfo) {
  const details = []

  if (pwaInfo.installed) {
    details.push('✓ 已安装为独立应用')
  }

  if (pwaInfo.mode === 'ios') {
    details.push('✓ iOS PWA 模式')
  }

  if (pwaInfo.displayMode) {
    details.push(`✓ 显示模式: ${pwaInfo.displayMode}`)
  }

  if (pwaInfo.hasServiceWorker) {
    details.push('✓ Service Worker 已激活')
  }

  if (pwaInfo.isPWACapable) {
    details.push('✓ PWA 应用清单就绪')
  }

  return details.length > 0 ? details.join('\n') : '标准网页应用'
}

/**
 * 监听 PWA 安装事件
 * @param {Function} callback 安装成功时的回调
 * @returns {Function} 取消监听函数
 */
export function onPWAInstalled(callback) {
  if (!window.addEventListener) {
    return () => {}
  }

  const handler = () => {
    callback && callback()
  }

  // iOS 不支持 beforeinstallprompt，但可以检测是否已安装
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // 阻止默认安装提示
  })

  // 监听应用被安装
  window.addEventListener('appinstalled', handler)

  return () => {
    window.removeEventListener('appinstalled', handler)
  }
}

/**
 * 获取 PWA 安装提示
 * @returns {Promise<Event>} 安装提示事件
 */
export function getPWAInstallPrompt() {
  return new Promise((resolve) => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      resolve(e)
    })
  })
}

/**
 * 触发 PWA 安装提示
 * @param {Event} deferredPrompt beforeinstallprompt 事件
 * @returns {Promise<void>}
 */
export async function triggerPWAInstall(deferredPrompt) {
  if (!deferredPrompt) {
    console.warn('PWA 安装提示不可用')
    return
  }

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  console.log(`用户选择: ${outcome}`)
}

/**
 * 检查应用版本更新
 * @returns {Promise<boolean>} 是否有新版本
 */
export async function checkForUpdate() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      await registration.update()
    }
    return true
  } catch (error) {
    console.error('检查更新失败:', error)
    return false
  }
}
