<template>
  <div class="surge-page">
    <!-- 页面顶部 -->
    <section class="hero">
      <div class="hero-icon">⚡</div>
      <div class="hero-text">
        <h2>Surge 工具箱</h2>
        <p>配置生成器 · 概念手册 · 离线可用</p>
      </div>
    </section>

    <!-- 内部模式切换 -->
    <div class="surge-mode-bar">
      <button :class="['surge-mode-btn', { active: mode === 'generator' }]" @click="mode = 'generator'">
        🛠 配置生成器
      </button>
      <button :class="['surge-mode-btn', { active: mode === 'reference' }]" @click="mode = 'reference'">
        📖 概念手册
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- 配置生成器                                                    -->
    <!-- ============================================================ -->
    <div v-if="mode === 'generator'">

      <!-- 步骤指示器 -->
      <div class="steps-bar">
        <div
          v-for="(label, i) in stepLabels"
          :key="i"
          :class="['step-dot-wrap', { active: step === i, done: step > i }]"
          @click="step > i ? step = i : null"
        >
          <span class="step-circle">{{ step > i ? '✓' : i + 1 }}</span>
          <span class="step-name">{{ label }}</span>
        </div>
      </div>

      <!-- ── Step 0: General ── -->
      <section v-if="step === 0" class="panel step-panel">
        <h3 class="step-title">⚙️ General — 基础设置</h3>

        <div class="form-group">
          <label class="form-label">日志级别</label>
          <select v-model="general.loglevel" class="select">
            <option value="verbose">verbose（详细）</option>
            <option value="info">info（信息）</option>
            <option value="notify">notify（通知）</option>
            <option value="warning">warning（警告）</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">DNS 服务器</label>
          <input v-model="general.dns" class="input" placeholder="8.8.8.8, 1.1.1.1" />
          <span class="form-hint">多个 DNS 用逗号分隔</span>
        </div>

        <div class="form-group">
          <label class="form-label">跳过代理（Skip Proxy）</label>
          <input v-model="general.skipProxy" class="input" placeholder="127.0.0.1, localhost, 192.168.0.0/24" />
          <span class="form-hint">局域网/本地地址填这里</span>
        </div>

        <div class="form-group form-row-check">
          <label class="form-label">开启 WiFi 共享（allow-wifi-access）</label>
          <input type="checkbox" v-model="general.allowWifi" class="check-box" />
        </div>

        <template v-if="general.allowWifi">
          <div class="form-group">
            <label class="form-label">HTTP 监听端口</label>
            <input v-model.number="general.httpPort" class="input" type="number" placeholder="6152" />
          </div>
          <div class="form-group">
            <label class="form-label">SOCKS5 监听端口</label>
            <input v-model.number="general.socksPort" class="input" type="number" placeholder="6153" />
          </div>
        </template>

        <div class="form-group form-row-check">
          <label class="form-label">增强模式（enhanced-mode）</label>
          <input type="checkbox" v-model="general.enhancedMode" class="check-box" />
        </div>
      </section>

      <!-- ── Step 1: 代理节点 ── -->
      <section v-if="step === 1" class="panel step-panel">
        <h3 class="step-title">🌐 Proxy — 代理节点</h3>

        <div v-if="proxies.length === 0" class="empty">
          <p>暂无代理节点，点击下方按钮添加</p>
        </div>

        <div v-for="(proxy, i) in proxies" :key="i" class="proxy-card">
          <div class="proxy-card-header">
            <span class="badge">{{ proxy.type.toUpperCase() }}</span>
            <span class="proxy-card-name">{{ proxy.name || '未命名节点' }}</span>
            <button class="btn-icon-sm" @click="proxies.splice(i, 1)" title="删除">✕</button>
          </div>

          <div class="proxy-fields">
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">节点名称</label>
                <input v-model="proxy.name" class="input" placeholder="Hong Kong 01" />
              </div>
              <div class="form-group">
                <label class="form-label">协议类型</label>
                <select v-model="proxy.type" class="select">
                  <option value="ss">Shadowsocks</option>
                  <option value="vmess">VMess</option>
                  <option value="trojan">Trojan</option>
                  <option value="http">HTTP</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">服务器地址</label>
                <input v-model="proxy.server" class="input" placeholder="example.com 或 IP" />
              </div>
              <div class="form-group">
                <label class="form-label">端口</label>
                <input v-model.number="proxy.port" class="input" type="number" placeholder="443" />
              </div>
            </div>

            <!-- SS -->
            <template v-if="proxy.type === 'ss'">
              <div class="form-group">
                <label class="form-label">加密方式</label>
                <select v-model="proxy.method" class="select">
                  <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305（推荐）</option>
                  <option value="aes-128-gcm">aes-128-gcm</option>
                  <option value="aes-256-gcm">aes-256-gcm</option>
                  <option value="aes-128-cfb">aes-128-cfb</option>
                  <option value="aes-256-cfb">aes-256-cfb</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">密码</label>
                <input v-model="proxy.password" class="input" type="password" placeholder="your-password" />
              </div>
              <div class="form-group form-row-check">
                <label class="form-label">开启 UDP 转发</label>
                <input type="checkbox" v-model="proxy.udp" class="check-box" />
              </div>
            </template>

            <!-- VMess -->
            <template v-if="proxy.type === 'vmess'">
              <div class="form-group">
                <label class="form-label">UUID</label>
                <input v-model="proxy.uuid" class="input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
              <div class="form-row-check-group">
                <div class="form-group form-row-check">
                  <label class="form-label">TLS</label>
                  <input type="checkbox" v-model="proxy.tls" class="check-box" />
                </div>
                <div class="form-group form-row-check">
                  <label class="form-label">WebSocket</label>
                  <input type="checkbox" v-model="proxy.ws" class="check-box" />
                </div>
              </div>
              <div v-if="proxy.tls" class="form-group">
                <label class="form-label">SNI / TLS 主机名</label>
                <input v-model="proxy.sni" class="input" placeholder="example.com" />
              </div>
              <div v-if="proxy.ws" class="form-group">
                <label class="form-label">WebSocket 路径</label>
                <input v-model="proxy.wsPath" class="input" placeholder="/path" />
              </div>
              <div v-if="proxy.ws" class="form-group">
                <label class="form-label">WebSocket Host（可选）</label>
                <input v-model="proxy.wsHost" class="input" placeholder="example.com" />
              </div>
            </template>

            <!-- Trojan -->
            <template v-if="proxy.type === 'trojan'">
              <div class="form-group">
                <label class="form-label">密码</label>
                <input v-model="proxy.password" class="input" type="password" placeholder="your-password" />
              </div>
              <div class="form-group">
                <label class="form-label">SNI</label>
                <input v-model="proxy.sni" class="input" placeholder="example.com" />
              </div>
              <div class="form-group form-row-check">
                <label class="form-label">跳过证书验证（不推荐）</label>
                <input type="checkbox" v-model="proxy.skipCert" class="check-box" />
              </div>
            </template>

            <!-- HTTP / SOCKS5 -->
            <template v-if="proxy.type === 'http' || proxy.type === 'socks5'">
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">用户名（可选）</label>
                  <input v-model="proxy.username" class="input" placeholder="username" />
                </div>
                <div class="form-group">
                  <label class="form-label">密码（可选）</label>
                  <input v-model="proxy.password" class="input" type="password" placeholder="password" />
                </div>
              </div>
              <div v-if="proxy.type === 'http'" class="form-group form-row-check">
                <label class="form-label">TLS（HTTPS 代理）</label>
                <input type="checkbox" v-model="proxy.tls" class="check-box" />
              </div>
            </template>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:8px" @click="addProxy">＋ 添加代理节点</button>
      </section>

      <!-- ── Step 2: 代理组 ── -->
      <section v-if="step === 2" class="panel step-panel">
        <h3 class="step-title">🔀 Proxy Group — 代理组</h3>

        <div v-if="proxyGroups.length === 0" class="empty">
          <p>暂无代理组，建议至少添加一个 select 组</p>
        </div>

        <div v-for="(group, i) in proxyGroups" :key="i" class="proxy-card">
          <div class="proxy-card-header">
            <span class="badge badge-group">{{ group.type }}</span>
            <span class="proxy-card-name">{{ group.name || '未命名' }}</span>
            <button class="btn-icon-sm" @click="proxyGroups.splice(i, 1)">✕</button>
          </div>

          <div class="proxy-fields">
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">组名</label>
                <input v-model="group.name" class="input" placeholder="Proxy" />
              </div>
              <div class="form-group">
                <label class="form-label">类型</label>
                <select v-model="group.type" class="select">
                  <option value="select">select（手动选择）</option>
                  <option value="url-test">url-test（自动测速）</option>
                  <option value="fallback">fallback（故障转移）</option>
                  <option value="load-balance">load-balance（负载均衡）</option>
                </select>
              </div>
            </div>

            <template v-if="group.type !== 'select'">
              <div class="form-group">
                <label class="form-label">测速 URL</label>
                <input v-model="group.url" class="input" placeholder="http://www.gstatic.com/generate_204" />
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">测速间隔（秒）</label>
                  <input v-model.number="group.interval" class="input" type="number" placeholder="300" />
                </div>
                <div class="form-group">
                  <label class="form-label">超时（ms）</label>
                  <input v-model.number="group.timeout" class="input" type="number" placeholder="5000" />
                </div>
              </div>
            </template>

            <div class="form-group">
              <label class="form-label">包含的节点/策略</label>
              <div class="member-checkboxes">
                <label v-for="p in proxies" :key="'p-' + p.name" class="check-item">
                  <input type="checkbox" :value="p.name" v-model="group.members" />
                  <span>{{ p.name || '未命名' }}</span>
                </label>
                <label v-for="g in proxyGroups.filter((_, gi) => gi !== i)" :key="'g-' + g.name" class="check-item">
                  <input type="checkbox" :value="g.name" v-model="group.members" />
                  <span class="member-group-label">{{ g.name || '未命名组' }}</span>
                </label>
                <label class="check-item">
                  <input type="checkbox" value="DIRECT" v-model="group.members" />
                  <span>DIRECT</span>
                </label>
                <label class="check-item">
                  <input type="checkbox" value="REJECT" v-model="group.members" />
                  <span>REJECT</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:8px" @click="addGroup">＋ 添加代理组</button>
      </section>

      <!-- ── Step 3: 规则 ── -->
      <section v-if="step === 3" class="panel step-panel">
        <h3 class="step-title">📋 Rule — 规则</h3>

        <div class="quick-rules-bar">
          <p class="form-label" style="margin-bottom:6px">快速插入常用规则：</p>
          <div class="quick-btns">
            <button class="btn btn-sm" @click="addQuickRule('GEOIP', 'CN', 'DIRECT')">🇨🇳 CN 直连</button>
            <button class="btn btn-sm" @click="addQuickRule('DOMAIN-SUFFIX', 'apple.com', 'DIRECT')">🍎 Apple</button>
            <button class="btn btn-sm" @click="addQuickRule('DOMAIN-SUFFIX', 'icloud.com', 'DIRECT')">☁️ iCloud</button>
            <button class="btn btn-sm" @click="addQuickRule('DOMAIN-KEYWORD', 'google', firstProxyPolicy)">🔍 Google</button>
          </div>
        </div>

        <div v-if="rules.length === 0" class="empty" style="margin-top:12px">
          <p>暂无规则，最后请务必添加 FINAL 兜底规则</p>
        </div>

        <div v-for="(rule, i) in rules" :key="i" class="rule-row">
          <select v-model="rule.type" class="select select-compact">
            <option>DOMAIN</option>
            <option>DOMAIN-SUFFIX</option>
            <option>DOMAIN-KEYWORD</option>
            <option>IP-CIDR</option>
            <option>IP-CIDR6</option>
            <option>GEOIP</option>
            <option>RULE-SET</option>
            <option>FINAL</option>
          </select>
          <input
            v-if="rule.type !== 'FINAL'"
            v-model="rule.value"
            class="input input-compact"
            placeholder="值"
          />
          <select v-model="rule.policy" class="select select-compact">
            <option>DIRECT</option>
            <option>REJECT</option>
            <option v-for="g in proxyGroups" :key="g.name" :value="g.name">{{ g.name }}</option>
            <option v-for="p in proxies" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
          <button class="btn-icon-sm" @click="rules.splice(i, 1)">✕</button>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:8px" @click="addRule">＋ 添加规则</button>
        <button class="btn" style="width:100%;margin-top:6px" @click="addFinalRule">添加 FINAL 兜底</button>
      </section>

      <!-- ── Step 4: 预览 & 导出 ── -->
      <section v-if="step === 4" class="panel step-panel">
        <h3 class="step-title">✅ 预览 & 导出</h3>

        <div class="export-actions">
          <button class="btn btn-primary" @click="copyConfig">
            {{ copied ? '✓ 已复制' : '📋 复制配置' }}
          </button>
          <button class="btn" @click="downloadConfig">⬇️ 下载 .conf</button>
        </div>

        <div class="save-bar">
          <input v-model.trim="saveName" class="input" placeholder="配置名称（如：HK 节点配置）" />
          <button class="btn btn-primary" :disabled="!saveName" @click="saveToDb">💾 保存</button>
        </div>
        <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>

        <pre class="config-preview">{{ generatedConfig }}</pre>
      </section>

      <!-- 步骤导航 -->
      <div class="step-nav-bar">
        <button v-if="step > 0" class="btn" @click="step--">← 上一步</button>
        <span class="step-nav-info">{{ step + 1 }} / {{ stepLabels.length }}</span>
        <button v-if="step < stepLabels.length - 1" class="btn btn-primary" @click="step++">下一步 →</button>
      </div>

      <!-- 已保存配置列表 -->
      <section v-if="savedConfigs.length" class="panel" style="margin:0 16px">
        <h3>💾 已保存的配置</h3>
        <div v-for="(c, i) in savedConfigs" :key="c.id" class="saved-item">
          <div class="saved-item-info">
            <strong>{{ c.name }}</strong>
            <span class="saved-item-date">{{ formatDate(c.updatedAt) }}</span>
          </div>
          <div class="saved-item-actions">
            <button class="btn btn-sm" @click="loadFromDb(c)">加载</button>
            <button class="btn btn-sm" @click="exportSaved(c)">导出</button>
            <button class="btn btn-sm btn-danger" @click="removeFromDb(i, c.id)">删除</button>
          </div>
        </div>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- 概念手册                                                      -->
    <!-- ============================================================ -->
    <div v-if="mode === 'reference'">

      <!-- 代理类型 -->
      <section class="panel">
        <h3>🌐 代理协议类型</h3>
        <div
          v-for="pt in proxyTypeDocs"
          :key="pt.name"
          class="ref-card"
          @click="pt.open = !pt.open"
        >
          <div class="ref-card-header">
            <span class="badge">{{ pt.name }}</span>
            <span class="ref-card-desc">{{ pt.desc }}</span>
            <span class="ref-card-arrow">{{ pt.open ? '▲' : '▼' }}</span>
          </div>
          <div v-if="pt.open" class="ref-card-body" @click.stop>
            <pre class="code-block">{{ pt.template }}</pre>
            <table class="ref-table">
              <thead><tr><th>参数</th><th>必填</th><th>说明</th></tr></thead>
              <tbody>
                <tr v-for="p in pt.params" :key="p.name">
                  <td><code>{{ p.name }}</code></td>
                  <td :class="p.required ? 'req-yes' : 'req-no'">{{ p.required ? '✓' : '－' }}</td>
                  <td>{{ p.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 代理组 -->
      <section class="panel">
        <h3>🔀 代理组类型</h3>
        <div v-for="g in groupTypeDocs" :key="g.name" class="ref-card ref-card-static">
          <div class="ref-card-header">
            <span class="badge badge-group">{{ g.name }}</span>
            <span class="ref-card-desc">{{ g.desc }}</span>
          </div>
          <p class="ref-card-tip">{{ g.tip }}</p>
          <pre class="code-block ref-code">{{ g.example }}</pre>
        </div>
      </section>

      <!-- 规则速查表 -->
      <section class="panel">
        <h3>📋 规则类型速查</h3>
        <table class="ref-table ref-table-full">
          <thead>
            <tr><th>规则类型</th><th>匹配对象</th><th>示例</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in ruleTypeDocs" :key="r.type">
              <td><code>{{ r.type }}</code></td>
              <td>{{ r.match }}</td>
              <td><code class="code-small">{{ r.example }}</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- General 参数 -->
      <section class="panel">
        <h3>⚙️ General 参数说明</h3>
        <table class="ref-table ref-table-full">
          <thead>
            <tr><th>参数</th><th>默认值</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in generalParamDocs" :key="p.name">
              <td><code>{{ p.name }}</code></td>
              <td><code class="code-dim">{{ p.default }}</code></td>
              <td>{{ p.desc }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- MITM 进阶 -->
      <section class="panel">
        <h3>🔐 MITM & Script 进阶</h3>
        <div class="ref-card ref-card-static">
          <div class="ref-card-header">
            <span class="badge badge-warn">MITM</span>
            <span class="ref-card-desc">中间人解密 HTTPS 流量</span>
          </div>
          <p class="ref-card-tip">需在设备安装并信任 Surge 根证书（设置 → MitM → 安装证书）</p>
          <pre class="code-block ref-code">[MITM]
enable = true
hostname = *.example.com, api.service.com
ca-passphrase = your-passphrase
ca-p12 = base64-encoded-p12</pre>
        </div>
        <div class="ref-card ref-card-static">
          <div class="ref-card-header">
            <span class="badge badge-warn">Script</span>
            <span class="ref-card-desc">脚本钩子，改写请求/响应</span>
          </div>
          <pre class="code-block ref-code">[Script]
# 名称 = type=类型, pattern=匹配URL, script-path=脚本路径
rewrite = type=http-response, pattern=https://api.example.com/data, \
  script-path=scripts/rewrite.js, max-size=131072, requires-body=true</pre>
        </div>
      </section>
    </div>

  </div>
</template>

<script>
import { listSurgeConfigs, saveSurgeConfig, deleteSurgeConfig } from './surgeDb.js'

function emptyProxy() {
  return {
    name: '', type: 'ss', server: '', port: 443,
    password: '', method: 'chacha20-ietf-poly1305',
    uuid: '', tls: false, ws: false, wsPath: '/', wsHost: '',
    sni: '', skipCert: false, username: '', udp: false
  }
}

function emptyGroup() {
  return {
    name: '', type: 'select', members: [],
    url: 'http://www.gstatic.com/generate_204',
    interval: 300, timeout: 5000
  }
}

export default {
  name: 'SurgePage',

  data() {
    return {
      mode: 'generator',
      step: 0,
      stepLabels: ['General', '代理节点', '代理组', '规则', '预览导出'],

      general: {
        loglevel: 'notify',
        dns: '8.8.8.8, 1.1.1.1',
        skipProxy: '127.0.0.1, localhost, *.local, 192.168.0.0/24, 10.0.0.0/8',
        allowWifi: false,
        httpPort: 6152,
        socksPort: 6153,
        enhancedMode: false
      },
      proxies: [],
      proxyGroups: [],
      rules: [],

      copied: false,
      saveName: '',
      saveMsg: '',
      savedConfigs: [],

      // ── 概念手册数据 ──
      proxyTypeDocs: [
        {
          name: 'Shadowsocks', desc: '轻量高效的代理协议（SS）', open: false,
          template: 'HK-SS = ss, hk.example.com, 443, encrypt-method=chacha20-ietf-poly1305, password=your-pwd, udp-relay=true',
          params: [
            { name: 'encrypt-method', required: true, desc: '加密方式，推荐 chacha20-ietf-poly1305 / aes-128-gcm' },
            { name: 'password', required: true, desc: '认证密码' },
            { name: 'udp-relay', required: false, desc: '开启 UDP 转发，默认 false' },
            { name: 'obfs', required: false, desc: '混淆方式：http 或 tls' },
            { name: 'obfs-host', required: false, desc: '混淆域名' }
          ]
        },
        {
          name: 'VMess', desc: 'V2Ray 核心协议，支持 WS+TLS', open: false,
          template: 'HK-V2 = vmess, hk.example.com, 443, username=uuid, tls=true, ws=true, ws-path=/ray, sni=hk.example.com',
          params: [
            { name: 'username', required: true, desc: 'VMess UUID' },
            { name: 'tls', required: false, desc: '是否启用 TLS，默认 false' },
            { name: 'ws', required: false, desc: '是否使用 WebSocket 传输' },
            { name: 'ws-path', required: false, desc: 'WebSocket 路径' },
            { name: 'ws-headers', required: false, desc: 'WS 附加头，格式 Host:domain' },
            { name: 'sni', required: false, desc: 'TLS SNI 主机名' },
            { name: 'skip-cert-verify', required: false, desc: '跳过证书验证，不建议生产使用' }
          ]
        },
        {
          name: 'Trojan', desc: '伪装 HTTPS 的代理协议', open: false,
          template: 'HK-Trojan = trojan, hk.example.com, 443, password=your-pwd, sni=hk.example.com',
          params: [
            { name: 'password', required: true, desc: '认证密码' },
            { name: 'sni', required: false, desc: 'TLS SNI，通常填服务器域名' },
            { name: 'skip-cert-verify', required: false, desc: '跳过证书验证' },
            { name: 'udp-relay', required: false, desc: '开启 UDP 转发' }
          ]
        },
        {
          name: 'HTTP', desc: '明文或 TLS 的 HTTP 代理', open: false,
          template: 'Corp = http, proxy.corp.com, 8080, username=user, password=pass',
          params: [
            { name: 'username', required: false, desc: '代理认证用户名' },
            { name: 'password', required: false, desc: '代理认证密码' },
            { name: 'tls', required: false, desc: '是否为 HTTPS 代理' },
            { name: 'skip-cert-verify', required: false, desc: '跳过证书验证' }
          ]
        },
        {
          name: 'SOCKS5', desc: 'SOCKS5 代理协议', open: false,
          template: 'Local = socks5, 127.0.0.1, 1080',
          params: [
            { name: 'username', required: false, desc: '认证用户名' },
            { name: 'password', required: false, desc: '认证密码' },
            { name: 'udp-relay', required: false, desc: '开启 UDP 转发' }
          ]
        }
      ],

      groupTypeDocs: [
        {
          name: 'select', desc: '手动选择使用哪个节点',
          tip: '适合需要手动切换节点的场景，在 Surge 界面中可以直接点选。',
          example: 'Proxy = select, HK-01, JP-01, DIRECT'
        },
        {
          name: 'url-test', desc: '定期测速，自动选延迟最低的节点',
          tip: '追求最低延迟时使用，Surge 会周期性测速并自动切换最优节点。',
          example: 'Auto = url-test, HK-01, JP-01, SG-01, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50'
        },
        {
          name: 'fallback', desc: '故障转移，主节点失败时自动切换',
          tip: '按顺序尝试，第一个可用节点生效，适合主备切换场景。',
          example: 'Failover = fallback, HK-Primary, HK-Backup, JP-01, url=http://www.gstatic.com/generate_204, interval=120'
        },
        {
          name: 'load-balance', desc: '多节点负载均衡',
          tip: '轮询多个节点，分散流量，提升整体吞吐量。',
          example: 'LB = load-balance, HK-01, HK-02, HK-03, url=http://www.gstatic.com/generate_204, interval=300'
        }
      ],

      ruleTypeDocs: [
        { type: 'DOMAIN', match: '完整域名精确匹配', example: 'DOMAIN,example.com,PROXY' },
        { type: 'DOMAIN-SUFFIX', match: '域名后缀（含子域名）', example: 'DOMAIN-SUFFIX,google.com,PROXY' },
        { type: 'DOMAIN-KEYWORD', match: '域名中包含关键词', example: 'DOMAIN-KEYWORD,youtube,PROXY' },
        { type: 'IP-CIDR', match: 'IPv4 地址段', example: 'IP-CIDR,192.168.0.0/16,DIRECT' },
        { type: 'IP-CIDR6', match: 'IPv6 地址段', example: 'IP-CIDR6,::1/128,DIRECT' },
        { type: 'GEOIP', match: 'IP 归属国家/地区', example: 'GEOIP,CN,DIRECT' },
        { type: 'RULE-SET', match: '引用外部规则集文件', example: 'RULE-SET,SYSTEM,DIRECT' },
        { type: 'PROCESS-NAME', match: '匹配进程名（macOS）', example: 'PROCESS-NAME,curl,DIRECT' },
        { type: 'FINAL', match: '兜底规则（最后一条）', example: 'FINAL,PROXY' }
      ],

      generalParamDocs: [
        { name: 'loglevel', default: 'notify', desc: '日志级别：verbose/info/notify/warning' },
        { name: 'dns-server', default: 'system', desc: '自定义 DNS，多个用逗号分隔' },
        { name: 'doh-server', default: '–', desc: 'DNS over HTTPS 服务器地址' },
        { name: 'skip-proxy', default: '–', desc: '不走代理的地址段' },
        { name: 'bypass-system', default: 'true', desc: '系统流量绕过代理' },
        { name: 'allow-wifi-access', default: 'false', desc: '允许局域网设备通过此机器代理' },
        { name: 'http-listen', default: '127.0.0.1:6152', desc: 'HTTP 代理监听地址和端口' },
        { name: 'socks5-listen', default: '127.0.0.1:6153', desc: 'SOCKS5 代理监听地址和端口' },
        { name: 'enhanced-mode', default: 'false', desc: '增强模式，接管更多系统流量（iOS）' },
        { name: 'ipv6', default: 'false', desc: '是否启用 IPv6 支持' },
        { name: 'exclude-simple-hostnames', default: 'true', desc: '排除无点的主机名（如 localhost）' }
      ]
    }
  },

  computed: {
    firstProxyPolicy() {
      if (this.proxyGroups.length) return this.proxyGroups[0].name
      if (this.proxies.length) return this.proxies[0].name
      return 'PROXY'
    },

    generatedConfig() {
      const lines = []

      lines.push('[General]')
      lines.push(`loglevel = ${this.general.loglevel}`)
      lines.push(`dns-server = ${this.general.dns || '8.8.8.8, 1.1.1.1'}`)
      lines.push(`skip-proxy = ${this.general.skipProxy || '127.0.0.1, localhost, *.local'}`)
      if (this.general.enhancedMode) lines.push('enhanced-mode = true')
      if (this.general.allowWifi) {
        lines.push('allow-wifi-access = true')
        lines.push(`http-listen = 0.0.0.0:${this.general.httpPort || 6152}`)
        lines.push(`socks5-listen = 0.0.0.0:${this.general.socksPort || 6153}`)
      }

      if (this.proxies.length) {
        lines.push('\n[Proxy]')
        for (const p of this.proxies) {
          const line = this.formatProxyLine(p)
          if (line) lines.push(line)
        }
      }

      if (this.proxyGroups.length) {
        lines.push('\n[Proxy Group]')
        for (const g of this.proxyGroups) {
          lines.push(this.formatGroupLine(g))
        }
      }

      if (this.rules.length) {
        lines.push('\n[Rule]')
        for (const r of this.rules) {
          if (r.type === 'FINAL') {
            lines.push(`FINAL,${r.policy}`)
          } else if (r.value) {
            lines.push(`${r.type},${r.value},${r.policy}`)
          }
        }
      }

      return lines.join('\n')
    }
  },

  methods: {
    formatProxyLine(p) {
      const n = p.name || 'Proxy'
      if (p.type === 'ss') {
        let l = `${n} = ss, ${p.server}, ${p.port}, encrypt-method=${p.method || 'chacha20-ietf-poly1305'}, password=${p.password || ''}`
        if (p.udp) l += ', udp-relay=true'
        return l
      }
      if (p.type === 'vmess') {
        let l = `${n} = vmess, ${p.server}, ${p.port}, username=${p.uuid || ''}`
        if (p.tls) l += ', tls=true'
        if (p.sni) l += `, sni=${p.sni}`
        if (p.ws) {
          l += `, ws=true, ws-path=${p.wsPath || '/'}`
          if (p.wsHost) l += `, ws-headers=Host:${p.wsHost}`
        }
        return l
      }
      if (p.type === 'trojan') {
        let l = `${n} = trojan, ${p.server}, ${p.port}, password=${p.password || ''}`
        if (p.sni) l += `, sni=${p.sni}`
        if (p.skipCert) l += ', skip-cert-verify=true'
        return l
      }
      if (p.type === 'http') {
        let l = `${n} = http, ${p.server}, ${p.port}`
        if (p.username) l += `, username=${p.username}, password=${p.password || ''}`
        if (p.tls) l += ', tls=true'
        return l
      }
      if (p.type === 'socks5') {
        let l = `${n} = socks5, ${p.server}, ${p.port}`
        if (p.username) l += `, username=${p.username}, password=${p.password || ''}`
        return l
      }
      return ''
    },

    formatGroupLine(g) {
      const members = (g.members || []).join(', ')
      if (g.type === 'select') return `${g.name} = select, ${members}`
      const url = g.url || 'http://www.gstatic.com/generate_204'
      return `${g.name} = ${g.type}, ${members}, url=${url}, interval=${g.interval || 300}, timeout=${g.timeout || 5000}`
    },

    addProxy() { this.proxies.push(emptyProxy()) },
    addGroup() { this.proxyGroups.push(emptyGroup()) },
    addRule() { this.rules.push({ type: 'DOMAIN-SUFFIX', value: '', policy: 'DIRECT' }) },
    addFinalRule() {
      this.rules = this.rules.filter(r => r.type !== 'FINAL')
      this.rules.push({ type: 'FINAL', value: '', policy: this.firstProxyPolicy })
    },
    addQuickRule(type, value, policy) {
      this.rules.push({ type, value, policy })
    },

    async copyConfig() {
      try {
        await navigator.clipboard.writeText(this.generatedConfig)
      } catch {
        const el = document.createElement('textarea')
        el.value = this.generatedConfig
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      this.copied = true
      setTimeout(() => { this.copied = false }, 2000)
    },

    downloadConfig() {
      const blob = new Blob([this.generatedConfig], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.saveName || 'surge-config'}.conf`
      a.click()
      URL.revokeObjectURL(url)
    },

    async loadSaved() {
      this.savedConfigs = await listSurgeConfigs()
    },

    async saveToDb() {
      if (!this.saveName) return
      const config = {
        general: { ...this.general },
        proxies: JSON.parse(JSON.stringify(this.proxies)),
        proxyGroups: JSON.parse(JSON.stringify(this.proxyGroups)),
        rules: JSON.parse(JSON.stringify(this.rules))
      }
      await saveSurgeConfig(this.saveName, config)
      this.saveMsg = `✓ 已保存「${this.saveName}」`
      setTimeout(() => { this.saveMsg = '' }, 2500)
      await this.loadSaved()
    },

    loadFromDb(saved) {
      const c = saved.config
      this.general = { ...c.general }
      this.proxies = JSON.parse(JSON.stringify(c.proxies || []))
      this.proxyGroups = JSON.parse(JSON.stringify(c.proxyGroups || []))
      this.rules = JSON.parse(JSON.stringify(c.rules || []))
      this.saveName = saved.name
      this.step = 0
      this.saveMsg = `✓ 已加载「${saved.name}」`
      setTimeout(() => { this.saveMsg = '' }, 2500)
    },

    exportSaved(saved) {
      const c = saved.config
      // 临时替换数据以复用 generatedConfig 逻辑
      const bak = {
        general: this.general, proxies: this.proxies,
        proxyGroups: this.proxyGroups, rules: this.rules
      }
      this.general = c.general
      this.proxies = c.proxies || []
      this.proxyGroups = c.proxyGroups || []
      this.rules = c.rules || []
      const text = this.generatedConfig
      Object.assign(this, bak)

      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${saved.name}.conf`
      a.click()
      URL.revokeObjectURL(url)
    },

    async removeFromDb(index, id) {
      await deleteSurgeConfig(id)
      this.savedConfigs.splice(index, 1)
    },

    formatDate(ts) {
      return new Date(ts).toLocaleString('zh-CN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    }
  },

  mounted() {
    this.loadSaved()
  }
}
</script>

<style scoped>
.surge-page { padding-bottom: 32px; }

/* 模式切换 */
.surge-mode-bar {
  display: flex;
  gap: 8px;
  margin: 0 16px 16px;
}
.surge-mode-btn {
  flex: 1;
  padding: 10px 0;
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: 10px;
  background: var(--bg-card, var(--bg));
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.surge-mode-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* 步骤指示器 */
.steps-bar {
  display: flex;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 12px;
  overflow-x: auto;
  gap: 4px;
}
.step-dot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 44px;
  cursor: default;
}
.step-dot-wrap.done { cursor: pointer; }
.step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--border, #e2e8f0);
  color: var(--text-muted, #94a3b8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.15s;
}
.step-dot-wrap.active .step-circle {
  background: var(--primary);
  color: #fff;
}
.step-dot-wrap.done .step-circle {
  background: var(--primary);
  color: #fff;
  opacity: 0.65;
}
.step-name {
  font-size: 10px;
  color: var(--text-muted, #94a3b8);
  white-space: nowrap;
}
.step-dot-wrap.active .step-name {
  color: var(--primary);
  font-weight: 600;
}

/* 步骤面板 */
.step-panel { margin: 0 16px 12px; }
.step-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}

/* 表单 */
.form-group { margin-bottom: 12px; }
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted, #64748b);
  margin-bottom: 4px;
}
.form-hint {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  margin-top: 3px;
  display: block;
}
.form-row-check {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #f1f5f9);
}
.form-row-check .form-label { margin: 0; }
.check-box {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
}
.form-row-check-group {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 0 12px;
  margin-bottom: 12px;
}
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* 节点卡片 */
.proxy-card {
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}
.proxy-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-hover, rgba(0,0,0,0.03));
}
.proxy-card-name { flex: 1; font-size: 14px; font-weight: 600; }
.proxy-fields { padding: 12px; }

/* Badge */
.badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: var(--primary);
  color: #fff;
}
.badge-group { background: #7c3aed; }
.badge-warn { background: #d97706; }

/* 节点多选 */
.member-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
}
.check-item input { accent-color: var(--primary); }
.member-group-label { color: #7c3aed; }

/* 规则 */
.quick-rules-bar { margin-bottom: 12px; }
.quick-btns { display: flex; flex-wrap: wrap; gap: 6px; }
.rule-row {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-bottom: 6px;
}
.select-compact { flex: 0 0 126px; font-size: 12px; padding: 6px 4px; }
.input-compact { flex: 1; font-size: 12px; padding: 6px 8px; }

/* 导出 */
.export-actions { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.export-actions .btn { flex: 1; }
.save-bar { display: flex; gap: 8px; margin-bottom: 8px; }
.save-bar .input { flex: 1; }
.save-msg { font-size: 13px; color: var(--primary); margin: 0 0 8px; }
.config-preview {
  background: var(--bg-code, #1e293b);
  color: #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  font-size: 11.5px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
}

/* 步骤导航 */
.step-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 16px;
}
.step-nav-info { font-size: 13px; color: var(--text-muted, #94a3b8); }

/* 已保存 */
.saved-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border, #f1f5f9);
  gap: 8px;
}
.saved-item:last-child { border-bottom: none; }
.saved-item-info { flex: 1; min-width: 0; }
.saved-item-info strong { display: block; font-size: 14px; }
.saved-item-date { font-size: 12px; color: var(--text-muted, #94a3b8); }
.saved-item-actions { display: flex; gap: 5px; flex-shrink: 0; }

/* 概念手册 */
.ref-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  cursor: pointer;
}
.ref-card-static { cursor: default; }
.ref-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.ref-card-desc { flex: 1; font-size: 13px; color: var(--text-muted, #64748b); }
.ref-card-arrow { font-size: 11px; color: var(--text-muted, #94a3b8); }
.ref-card-tip {
  font-size: 12px;
  color: var(--text-muted, #64748b);
  margin: 0 12px 8px;
  padding: 6px 10px;
  background: var(--bg-hover, rgba(0,0,0,0.03));
  border-radius: 6px;
  line-height: 1.5;
}
.ref-card-body { padding: 0 12px 12px; cursor: default; }
.code-block {
  background: var(--bg-code, #1e293b);
  color: #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11.5px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
  margin: 8px 0;
}
.ref-code { margin: 0 12px 12px; }
.code-small { font-size: 11px; word-break: break-all; }
.code-dim { color: var(--text-muted, #94a3b8); font-size: 11px; }

.ref-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  margin-top: 8px;
}
.ref-table-full { font-size: 12px; }
.ref-table th {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 2px solid var(--border, #e2e8f0);
  color: var(--text-muted, #64748b);
  font-weight: 600;
}
.ref-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border, #f1f5f9);
  vertical-align: top;
}
.req-yes { color: var(--primary); font-weight: 700; }
.req-no { color: var(--text-muted, #94a3b8); }

.btn-icon-sm {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}
.btn-icon-sm:hover { background: #fee2e2; color: #ef4444; }
</style>
