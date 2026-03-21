import geoip from 'geoip-lite'
import https from 'https'

let homeGeo = null

export async function fetchHomeGeo() {
  try {
    const ip = await new Promise((resolve, reject) => {
      const req = https.get('https://api.ipify.org', { timeout: 4000 }, res => {
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => resolve(data.trim()))
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    })
    homeGeo = lookupGeo(ip)
    if (homeGeo) homeGeo = { ...homeGeo, ip }
    console.log('[geo] 本机公网IP:', ip, homeGeo?.full)
  } catch (e) {
    console.warn('[geo] 无法获取本机公网IP:', e.message)
  }
  return homeGeo
}

export function getHomeGeo() { return homeGeo }

// 国家代码 → 中文名
const COUNTRY_ZH = {
  US: '美国', CN: '中国', JP: '日本', GB: '英国', DE: '德国',
  FR: '法国', CA: '加拿大', AU: '澳大利亚', SG: '新加坡', HK: '香港',
  TW: '台湾', KR: '韩国', IN: '印度', RU: '俄罗斯', BR: '巴西',
  NL: '荷兰', SE: '瑞典', NO: '挪威', CH: '瑞士', IE: '爱尔兰',
  IT: '意大利', ES: '西班牙', PL: '波兰', CZ: '捷克', FI: '芬兰',
  DK: '丹麦', AT: '奥地利', BE: '比利时', NZ: '新西兰', ZA: '南非',
  MX: '墨西哥', AR: '阿根廷', CL: '智利', TR: '土耳其', IL: '以色列',
  AE: '阿联酋', SA: '沙特', MY: '马来西亚', TH: '泰国', ID: '印尼',
  PH: '菲律宾', VN: '越南', PK: '巴基斯坦', BD: '孟加拉', NG: '尼日利亚',
  PT: '葡萄牙', GR: '希腊', RO: '罗马尼亚', UA: '乌克兰', HU: '匈牙利',
  LT: '立陶宛', LV: '拉脱维亚', EE: '爱沙尼亚', SK: '斯洛伐克',
  BG: '保加利亚', HR: '克罗地亚', SI: '斯洛文尼亚', RS: '塞尔维亚',
  LU: '卢森堡', IS: '冰岛', CY: '塞浦路斯', MT: '马耳他',
  // 亚太
  MO: '澳门', MM: '缅甸', KH: '柬埔寨', LA: '老挝', NP: '尼泊尔',
  LK: '斯里兰卡', BT: '不丹', AF: '阿富汗', UZ: '乌兹别克斯坦',
  KZ: '哈萨克斯坦', MN: '蒙古', KG: '吉尔吉斯',
}

// 国家代码 → 国旗 emoji
function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('')
}

const cache = new Map() // ip → geo info

export function lookupGeo(ip) {
  if (cache.has(ip)) return cache.get(ip)

  // 跳过私有/保留地址
  if (!ip || ip.startsWith('127.') || ip.startsWith('192.168.') ||
      ip.startsWith('10.') || ip.startsWith('169.254.') ||
      ip.startsWith('172.') || ip === '::1') {
    const r = { country: '', region: '', city: '', flag: '🏠', label: '本地' }
    cache.set(ip, r)
    return r
  }

  const geo = geoip.lookup(ip)
  if (!geo) {
    const r = { country: '', region: '', city: '', flag: '❓', label: '未知' }
    cache.set(ip, r)
    return r
  }

  const countryZh = COUNTRY_ZH[geo.country] || geo.country
  const flag = countryFlag(geo.country)
  // 显示文本：国旗 + 中文国名（+ 城市，如果有）
  const cityPart = geo.city ? ` · ${geo.city}` : ''
  const label = `${countryZh}${cityPart}`

  const r = {
    country: geo.country,
    countryZh,
    region: geo.region || '',
    city: geo.city || '',
    flag,
    label,           // 简短显示
    full: `${flag} ${label}`,  // 带旗帜显示
    ll: geo.ll       // [lat, lon]
  }
  cache.set(ip, r)
  return r
}
