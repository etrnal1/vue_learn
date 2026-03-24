<template>
  <div class="surge-page">
    <!-- 顶部内部 Tab -->
    <div class="surge-mode-tabs">
      <button :class="['surge-mode-tab', { active: mode === 'generator' }]" @click="mode = 'generator'">⚡ 配置生成器</button>
      <button :class="['surge-mode-tab', { active: mode === 'reference' }]" @click="mode = 'reference'">📖 概念手册</button>
    </div>

    <!-- ===== 配置生成器 ===== -->
    <div v-if="mode === 'generator'">
      <!-- 步骤指示器 -->
      <div class="surge-steps">
        <div
          v-for="(label, i) in steps"
          :key="i"
          :class="['surge-step', { active: step === i, done: step > i }]"
          @click="step > i && (step = i)"
        >
          <span class="surge-step-dot">{{ step > i ? '✓' : i + 1 }}</span>
          <span class="surge-step-label">{{ label }}</span>
        </div>
      </div>

      <!-- Step 0: General -->
      <section v-if="step === 0" class="panel surge-step-panel">
        <h3 class="surge-section-title">General 基础设置</h3>
        <div class="surge-form-group">
          <label class="surge-label">日志级别</label>
          <select v-model="general.loglevel" class="select">
            <option>verbose</option>
            <option>info</option>
            <option>notify</option>
            <option>warning</option>
          </select>
        </div>
        <div class="surge-form-group">
          <label class="surge-label">DNS 服务器</label>
          <input v-model="general.dns" class="input" placeholder="8.8.8.8, 1.1.1.1" />
        </div>
        <div class="surge-form-group">
          <label class="surge-label">跳过代理（Skip Proxy）</label>
          <input v-model="general.skipProxy" class="input" placeholder="127.0.0.1, localhost, 192.168.0.0/24" />
        </div>
        <div class="surge-form-group surge-form-row">
          <label class="surge-label">WiFi 共享</label>
          <label class="surge-toggle">
            <input type="checkbox" v-model="general.allowWifi" />
            <span class="surge-toggle-track"></span>
          </label>
        </div>
        <template v-if="general.allowWifi">
          <div class="surge-form-group">
            <label class="surge-label">HTTP 监听端口</label>
            <input v-model.number="general.httpPort" class="input" type="number" placeholder="6152" />
          </div>
          <div class="surge-form-group">
            <label class="surge-label">SOCKS5 监听端口</label>
            <input v-model.number="general.socksPort" class="input" type="number" placeholder="6153" />
          </div>
        </template>
        <div class="surge-form-group surge-form-row">
          <label class="surge-label">增强模式（enhanced-mode）</label>
          <label class="surge-toggle">
            <input type="checkbox" v-model="general.enhanced" />
            <span class="surge-toggle-track"></span>
          </label>
        </div>
        <div class="surge-form-group surge-form-row">
          <label class="surge-label">IPv6 支持</label>
          <label class="surge-toggle">
            <input type="checkbox" v-model="general.ipv6" />
            <span class="surge-toggle-track"></span>
          </label>
        </div>
      </section>

      <!-- Step 1: 代理节点 -->
      <section v-if="step === 1" class="panel surge-step-panel">
        <h3 class="surge-section-title">代理节点</h3>
        <p v-if="proxies.length === 0" class="surge-empty-hint">还没有节点，点击下方按钮添加</p>
        <div v-for="(proxy, i) in proxies" :key="i" class="surge-proxy-card">
          <div class="surge-proxy-header">
            <span class="surge-badge">{{ proxy.type.toUpperCase() }}</span>
            <span class="surge-proxy-name">{{ proxy.name || '未命名节点' }}</span>
            <button class="surge-btn-icon" @click="proxies.splice(i, 1)">✕</button>
          </div>
          <div class="surge-proxy-fields">
            <div class="surge-form-group">
              <label class="surge-label">节点名称</label>
              <input v-model="proxy.name" class="input" placeholder="HK-01" />
            </div>
            <div class="surge-form-group">
              <label class="surge-label">协议类型</label>
              <select v-model="proxy.type" class="select">
                <option value="ss">Shadowsocks</option>
                <option value="vmess">VMess (V2Ray)</option>
                <option value="trojan">Trojan</option>
                <option value="http">HTTP</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div class="surge-form-row-2">
              <div class="surge-form-group">
                <label class="surge-label">服务器</label>
                <input v-model="proxy.server" class="input" placeholder="example.com" />
              </div>
              <div class="surge-form-group surge-form-port">
                <label class="surge-label">端口</label>
                <input v-model.number="proxy.port" class="input" type="number" placeholder="443" />
              </div>
            </div>
            <!-- SS -->
            <template v-if="proxy.type === 'ss'">
              <div class="surge-form-group">
                <label class="surge-label">加密方式</label>
                <select v-model="proxy.method" class="select">
                  <option>chacha20-ietf-poly1305</option>
                  <option>aes-128-gcm</option>
                  <option>aes-256-gcm</option>
                  <option>aes-256-cfb</option>
                  <option>rc4-md5</option>
                </select>
              </div>
              <div class="surge-form-group">
                <label class="surge-label">密码</label>
                <input v-model="proxy.password" class="input" placeholder="your-password" />
              </div>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">UDP 转发</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.udp" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
            </template>
            <!-- VMess -->
            <template v-if="proxy.type === 'vmess'">
              <div class="surge-form-group">
                <label class="surge-label">UUID</label>
                <input v-model="proxy.uuid" class="input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">TLS</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.tls" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">WebSocket</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.ws" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
              <template v-if="proxy.ws">
                <div class="surge-form-group">
                  <label class="surge-label">WS 路径</label>
                  <input v-model="proxy.wsPath" class="input" placeholder="/path" />
                </div>
                <div class="surge-form-group">
                  <label class="surge-label">WS Host（可选）</label>
                  <input v-model="proxy.wsHost" class="input" placeholder="example.com" />
                </div>
              </template>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">跳过证书验证</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.skipCert" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
            </template>
            <!-- Trojan -->
            <template v-if="proxy.type === 'trojan'">
              <div class="surge-form-group">
                <label class="surge-label">密码</label>
                <input v-model="proxy.password" class="input" placeholder="your-password" />
              </div>
              <div class="surge-form-group">
                <label class="surge-label">SNI（可选）</label>
                <input v-model="proxy.sni" class="input" placeholder="example.com" />
              </div>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">跳过证书验证</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.skipCert" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">UDP 转发</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.udp" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
            </template>
            <!-- HTTP / SOCKS5 -->
            <template v-if="proxy.type === 'http' || proxy.type === 'socks5'">
              <div class="surge-form-group">
                <label class="surge-label">用户名（可选）</label>
                <input v-model="proxy.username" class="input" placeholder="username" />
              </div>
              <div class="surge-form-group">
                <label class="surge-label">密码（可选）</label>
                <input v-model="proxy.password" class="input" placeholder="password" />
              </div>
              <div class="surge-form-group surge-form-row">
                <label class="surge-label">TLS</label>
                <label class="surge-toggle">
                  <input type="checkbox" v-model="proxy.tls" />
                  <span class="surge-toggle-track"></span>
                </label>
              </div>
            </template>
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px" @click="addProxy">＋ 添加代理节点</button>
      </section>

      <!-- Step 2: 代理组 -->
      <section v-if="step === 2" class="panel surge-step-panel">
        <h3 class="surge-section-title">代理组</h3>
        <p v-if="proxyGroups.length === 0" class="surge-empty-hint">代理组用于管理多个节点的选择策略</p>
        <div v-for="(group, i) in proxyGroups" :key="i" class="surge-proxy-card">
          <div class="surge-proxy-header">
            <span class="surge-badge surge-badge-group">{{ group.type }}</span>
            <span class="surge-proxy-name">{{ group.name || '未命名组' }}</span>
            <button class="surge-btn-icon" @click="proxyGroups.splice(i, 1)">✕</button>
          </div>
          <div class="surge-proxy-fields">
            <div class="surge-form-group">
              <label class="surge-label">组名</label>
              <input v-model="group.name" class="input" placeholder="Proxy" />
            </div>
            <div class="surge-form-group">
              <label class="surge-label">策略类型</label>
              <select v-model="group.type" class="select">
                <option value="select">select（手动选择）</option>
                <option value="url-test">url-test（自动测速最快）</option>
                <option value="fallback">fallback（故障自动转移）</option>
                <option value="load-balance">load-balance（负载均衡）</option>
              </select>
            </div>
            <template v-if="group.type !== 'select'">
              <div class="surge-form-group">
                <label class="surge-label">测速 URL</label>
                <input v-model="group.url" class="input" placeholder="http://www.gstatic.com/generate_204" />
              </div>
              <div class="surge-form-group">
                <label class="surge-label">测速间隔（秒）</label>
                <input v-model.number="group.interval" class="input" type="number" placeholder="300" />
              </div>
            </template>
            <div class="surge-form-group">
              <label class="surge-label">成员节点</label>
              <div class="surge-check-list">
                <label v-for="p in proxies" :key="p.name" class="surge-check-item">
                  <input type="checkbox" :value="p.name" v-model="group.members" />
                  <span>{{ p.name || '未命名' }}</span>
                </label>
                <label class="surge-check-item">
                  <input type="checkbox" value="DIRECT" v-model="group.members" />
                  <span>DIRECT</span>
                </label>
                <label v-for="g2 in proxyGroups.filter(g3 => g3 !== group)" :key="'g' + g2.name" class="surge-check-item">
                  <input type="checkbox" :value="g2.name" v-model="group.members" />
                  <span>{{ g2.name || '未命名组' }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px" @click="addGroup">＋ 添加代理组</button>
      </section>

      <!-- Step 3: 规则 -->
      <section v-if="step === 3" class="panel surge-step-panel">
        <h3 class="surge-section-title">规则</h3>
        <div class="surge-quick-rules">
          <p class="surge-label" style="margin-bottom:8px">快速添加：</p>
          <div class="surge-quick-btns">
            <button class="btn surge-quick-btn" @click="addQuickRule('GEOIP', 'CN', 'DIRECT')">GEOIP CN 直连</button>
            <button class="btn surge-quick-btn" @click="addQuickRule('DOMAIN-SUFFIX', 'apple.com', 'DIRECT')">Apple 直连</button>
            <button class="btn surge-quick-btn" @click="addQuickRule('DOMAIN-SUFFIX', 'icloud.com', 'DIRECT')">iCloud 直连</button>
            <button class="btn surge-quick-btn" @click="addQuickRule('DOMAIN-SUFFIX', 'cn', 'DIRECT')">*.cn 直连</button>
            <button class="btn surge-quick-btn" @click="addFinalRule">添加 FINAL 兜底</button>
          </div>
        </div>
        <div v-for="(rule, i) in rules" :key="i" class="surge-rule-row">
          <select v-model="rule.type" class="select surge-rule-type">
            <option>DOMAIN</option>
            <option>DOMAIN-SUFFIX</option>
            <option>DOMAIN-KEYWORD</option>
            <option>IP-CIDR</option>
            <option>GEOIP</option>
            <option>RULE-SET</option>
            <option>FINAL</option>
          </select>
          <input
            v-if="rule.type !== 'FINAL'"
            v-model="rule.value"
            class="input surge-rule-value"
            placeholder="值"
          />
          <select v-model="rule.policy" class="select surge-rule-policy">
            <option>DIRECT</option>
            <option>REJECT</option>
            <option v-for="g in proxyGroups" :key="'gr' + g.name">{{ g.name }}</option>
            <option v-for="p in proxies" :key="'pr' + p.name">{{ p.name }}</option>
          </select>
          <button class="surge-btn-icon" @click="rules.splice(i, 1)">✕</button>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px" @click="addRule">＋ 添加规则</button>
      </section>

      <!-- Step 4: 预览 & 导出 -->
      <section v-if="step === 4" class="panel surge-step-panel">
        <h3 class="surge-section-title">预览 & 导出</h3>
        <div class="surge-export-actions">
          <button class="btn btn-primary" @click="copyConfig">{{ copied ? '✓ 已复制' : '复制配置' }}</button>
          <button class="btn" @click="downloadConfig">下载 .conf</button>
        </div>
        <div class="surge-save-row">
          <input v-model="saveName" class="input" placeholder="配置名称（如：工作代理）" style="flex:1" />
          <button class="btn" style="margin-left:8px;white-space:nowrap" @click="saveConfig">保存</button>
        </div>
        <pre class="surge-config-preview">{{ generatedConfig }}</pre>
      </section>

      <!-- 步骤导航 -->
      <div class="surge-step-nav">
        <button v-if="step > 0" class="btn" @click="step--">← 上一步</button>
        <span></span>
        <button v-if="step < 4" class="btn btn-primary" @click="step++">下一步 →</button>
      </div>

      <!-- 已保存配置 -->
      <section v-if="savedConfigs.length" class="panel" style="margin-top:16px">
        <h3 class="surge-section-title">已保存配置</h3>
        <div v-for="(c, i) in savedConfigs" :key="c.id" class="surge-saved-card">
          <div class="surge-saved-info">
            <strong>{{ c.name }}</strong>
            <span class="surge-saved-date">{{ formatDate(c.updatedAt) }}</span>
          </div>
          <div class="surge-saved-actions">
            <button class="btn" style="font-size:13px;padding:4px 10px" @click="loadConfig(c)">加载</button>
            <button class="btn" style="font-size:13px;padding:4px 10px;color:var(--danger,#ef4444)" @click="savedConfigs.splice(i,1);persistSaved()">删除</button>
          </div>
        </div>
      </section>
    </div>

    <!-- ===== 概念手册 ===== -->
    <div v-if="mode === 'reference'" class="surge-reference">
      <!-- 代理类型 -->
      <section class="panel">
        <h3 class="surge-section-title">代理类型</h3>
        <div v-for="pt in proxyTypes" :key="pt.name" class="surge-ref-card">
          <div class="surge-ref-header" @click="pt.open = !pt.open">
            <span class="surge-badge">{{ pt.name }}</span>
            <span class="surge-ref-desc">{{ pt.desc }}</span>
            <span class="surge-ref-arrow">{{ pt.open ? '▲' : '▼' }}</span>
          </div>
          <div v-if="pt.open" class="surge-ref-body">
            <p class="surge-ref-note">{{ pt.note }}</p>
            <pre class="surge-code-block">{{ pt.template }}</pre>
            <table class="surge-param-table">
              <thead><tr><th>参数</th><th>必填</th><th>说明</th></tr></thead>
              <tbody>
                <tr v-for="p in pt.params" :key="p.name">
                  <td><code>{{ p.name }}</code></td>
                  <td>{{ p.required ? '✓' : '－' }}</td>
                  <td>{{ p.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 代理组类型 -->
      <section class="panel">
        <h3 class="surge-section-title">代理组类型</h3>
        <div v-for="g in groupTypes" :key="g.name" class="surge-ref-card">
          <div class="surge-ref-header" @click="g.open = !g.open">
            <span class="surge-badge surge-badge-group">{{ g.name }}</span>
            <span class="surge-ref-desc">{{ g.desc }}</span>
            <span class="surge-ref-arrow">{{ g.open ? '▲' : '▼' }}</span>
          </div>
          <div v-if="g.open" class="surge-ref-body">
            <p class="surge-ref-note">{{ g.note }}</p>
            <pre class="surge-code-block">{{ g.example }}</pre>
          </div>
        </div>
      </section>

      <!-- 规则类型速查 -->
      <section class="panel">
        <h3 class="surge-section-title">规则类型速查</h3>
        <div class="surge-table-wrap">
          <table class="surge-param-table">
            <thead><tr><th>类型</th><th>匹配对象</th><th>示例</th></tr></thead>
            <tbody>
              <tr v-for="r in ruleTypes" :key="r.type">
                <td><code>{{ r.type }}</code></td>
                <td>{{ r.match }}</td>
                <td><code class="surge-code-sm">{{ r.example }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- General 参数说明 -->
      <section class="panel">
        <h3 class="surge-section-title">General 参数说明</h3>
        <div class="surge-table-wrap">
          <table class="surge-param-table">
            <thead><tr><th>参数</th><th>默认值</th><th>说明</th></tr></thead>
            <tbody>
              <tr v-for="p in generalParams" :key="p.name">
                <td><code>{{ p.name }}</code></td>
                <td><code>{{ p.default }}</code></td>
                <td>{{ p.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- MITM & Script 进阶 -->
      <section class="panel">
        <h3 class="surge-section-title">MITM & Script 进阶</h3>
        <div v-for="item in mitmItems" :key="item.title" class="surge-ref-card">
          <div class="surge-ref-header" @click="item.open = !item.open">
            <span class="surge-ref-title">{{ item.title }}</span>
            <span class="surge-ref-arrow">{{ item.open ? '▲' : '▼' }}</span>
          </div>
          <div v-if="item.open" class="surge-ref-body">
            <p class="surge-ref-note">{{ item.desc }}</p>
            <pre v-if="item.code" class="surge-code-block">{{ item.code }}</pre>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SurgePage',
  data() {
    return {
      mode: 'generator',
      step: 0,
      copied: false,
      saveName: '',

      // 生成器状态
      general: {
        loglevel: 'notify',
        dns: '8.8.8.8, 1.1.1.1, system',
        skipProxy: '127.0.0.1, localhost, 192.168.0.0/24, 10.0.0.0/8, ::1',
        allowWifi: false,
        httpPort: 6152,
        socksPort: 6153,
        enhanced: false,
        ipv6: false,
      },
      proxies: [],
      proxyGroups: [],
      rules: [],
      savedConfigs: [],

      steps: ['General', '代理节点', '代理组', '规则', '预览导出'],

      // 概念手册数据
      proxyTypes: [
        {
          name: 'SS',
          desc: 'Shadowsocks — 最常用的加密代理协议',
          note: '格式：名称 = ss, 服务器, 端口, encrypt-method=加密方式, password=密码',
          open: false,
          template: `ProxyName = ss, 1.2.3.4, 443, encrypt-method=chacha20-ietf-poly1305, password=your-password
# 可选参数
ProxyName = ss, 1.2.3.4, 443, encrypt-method=aes-128-gcm, password=pwd, udp-relay=true`,
          params: [
            { name: 'encrypt-method', required: true, desc: '加密方式，推荐 chacha20-ietf-poly1305 或 aes-128-gcm' },
            { name: 'password', required: true, desc: '连接密码' },
            { name: 'udp-relay', required: false, desc: '是否开启 UDP 转发，默认 false' },
            { name: 'obfs', required: false, desc: '混淆方式（http/tls），可选' },
            { name: 'obfs-host', required: false, desc: '混淆域名' },
          ],
        },
        {
          name: 'VMess',
          desc: 'V2Ray 协议，支持 WebSocket + TLS',
          note: '格式：名称 = vmess, 服务器, 端口, username=UUID, ws=true, ws-path=/path, tls=true',
          open: false,
          template: `# 基础 VMess
ProxyName = vmess, example.com, 443, username=uuid-here, tls=true

# VMess + WebSocket + TLS
ProxyName = vmess, example.com, 443, username=uuid-here, ws=true, ws-path=/ray, tls=true, tls-host=example.com`,
          params: [
            { name: 'username', required: true, desc: 'UUID 格式的用户 ID' },
            { name: 'tls', required: false, desc: '是否启用 TLS，默认 false' },
            { name: 'ws', required: false, desc: '是否使用 WebSocket 传输，默认 false' },
            { name: 'ws-path', required: false, desc: 'WebSocket 路径，如 /ray' },
            { name: 'ws-headers', required: false, desc: 'WS 自定义请求头，如 Host:example.com' },
            { name: 'skip-cert-verify', required: false, desc: '跳过 TLS 证书验证，仅测试用' },
          ],
        },
        {
          name: 'Trojan',
          desc: '基于 TLS 的高隐蔽性代理协议',
          note: '格式：名称 = trojan, 服务器, 端口, password=密码, sni=域名',
          open: false,
          template: `ProxyName = trojan, example.com, 443, password=your-password, sni=example.com
# 跳过证书验证（不推荐用于生产）
ProxyName = trojan, 1.2.3.4, 443, password=pwd, sni=example.com, skip-cert-verify=true`,
          params: [
            { name: 'password', required: true, desc: '连接密码' },
            { name: 'sni', required: false, desc: 'TLS SNI，建议填写域名' },
            { name: 'skip-cert-verify', required: false, desc: '跳过证书验证，默认 false' },
            { name: 'udp-relay', required: false, desc: 'UDP 转发，默认 false' },
          ],
        },
        {
          name: 'HTTP',
          desc: '标准 HTTP/HTTPS 代理',
          note: '格式：名称 = http, 服务器, 端口 [, username=用户名, password=密码]',
          open: false,
          template: `# 无认证
ProxyName = http, proxy.example.com, 8080
# 有认证
ProxyName = http, proxy.example.com, 8080, username=user, password=pwd
# HTTPS 代理
ProxyName = http, proxy.example.com, 443, tls=true`,
          params: [
            { name: 'username', required: false, desc: '代理认证用户名' },
            { name: 'password', required: false, desc: '代理认证密码' },
            { name: 'tls', required: false, desc: '是否使用 HTTPS 代理，默认 false' },
          ],
        },
        {
          name: 'SOCKS5',
          desc: 'SOCKS5 代理，支持 TCP 和 UDP',
          note: '格式：名称 = socks5, 服务器, 端口 [, username=用户名, password=密码]',
          open: false,
          template: `# 无认证
ProxyName = socks5, proxy.example.com, 1080
# 有认证
ProxyName = socks5, proxy.example.com, 1080, username=user, password=pwd
# SOCKS5 over TLS
ProxyName = socks5, proxy.example.com, 1080, tls=true`,
          params: [
            { name: 'username', required: false, desc: '认证用户名' },
            { name: 'password', required: false, desc: '认证密码' },
            { name: 'tls', required: false, desc: '是否使用 TLS 加密，默认 false' },
            { name: 'udp-relay', required: false, desc: 'UDP 转发，默认 false' },
          ],
        },
      ],

      groupTypes: [
        {
          name: 'select',
          desc: '手动选择节点，适合日常切换使用',
          note: '用户可在 Surge 界面手动选择当前使用哪个节点。适合有多个节点，日常需要手动切换场景。',
          open: false,
          example: `# 手动选择：成员可以是代理、DIRECT、REJECT 或其他代理组
ProxyGroup = select, HK-01, US-01, DIRECT, AnotherGroup`,
        },
        {
          name: 'url-test',
          desc: '自动选择延迟最低的节点',
          note: '定期对所有成员节点发送 HTTP 请求测速，自动切换到延迟最低的节点。',
          open: false,
          example: `# 自动测速，每 300 秒一次，选最快节点
AutoProxy = url-test, HK-01, US-01, JP-01, url=http://www.gstatic.com/generate_204, interval=300
# 可选：tolerance 参数，避免频繁切换（延迟差小于此值不切换）
AutoProxy = url-test, HK-01, US-01, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50`,
        },
        {
          name: 'fallback',
          desc: '故障转移，节点不可用时自动切换到下一个',
          note: '按顺序优先使用第一个节点，若不可用则自动切换到下一个可用节点。适合高可用场景。',
          open: false,
          example: `# 优先用 HK-01，不可用时自动切换
FallbackProxy = fallback, HK-01, US-01, JP-01, url=http://www.gstatic.com/generate_204, interval=300`,
        },
        {
          name: 'load-balance',
          desc: '负载均衡，流量分散到多个节点',
          note: '将不同连接分配到不同节点，适合需要分流以提高总体带宽的场景。',
          open: false,
          example: `# 负载均衡，可指定 persistent 模式（相同目标始终用同一节点）
LoadBalance = load-balance, HK-01, HK-02, HK-03, url=http://www.gstatic.com/generate_204, interval=300, persistent=true`,
        },
      ],

      ruleTypes: [
        { type: 'DOMAIN', match: '完整域名精确匹配', example: 'DOMAIN,example.com,PROXY' },
        { type: 'DOMAIN-SUFFIX', match: '域名后缀匹配（含子域名）', example: 'DOMAIN-SUFFIX,google.com,PROXY' },
        { type: 'DOMAIN-KEYWORD', match: '域名包含关键词', example: 'DOMAIN-KEYWORD,google,PROXY' },
        { type: 'IP-CIDR', match: 'IP 地址段（CIDR 格式）', example: 'IP-CIDR,192.168.0.0/16,DIRECT' },
        { type: 'IP-CIDR6', match: 'IPv6 地址段', example: 'IP-CIDR6,2001:db8::/32,DIRECT' },
        { type: 'GEOIP', match: '按 IP 地理位置国家代码', example: 'GEOIP,CN,DIRECT' },
        { type: 'RULE-SET', match: '引用外部规则集文件', example: 'RULE-SET,SYSTEM,DIRECT' },
        { type: 'PROCESS-NAME', match: '按进程名匹配（macOS）', example: 'PROCESS-NAME,curl,PROXY' },
        { type: 'FINAL', match: '兜底规则（必须放最后）', example: 'FINAL,PROXY' },
      ],

      generalParams: [
        { name: 'loglevel', default: 'notify', desc: '日志级别：verbose/info/notify/warning' },
        { name: 'dns-server', default: 'system', desc: 'DNS 服务器列表，逗号分隔' },
        { name: 'skip-proxy', default: '', desc: '不走代理的 IP/域名/CIDR 列表' },
        { name: 'allow-wifi-access', default: 'false', desc: '允许局域网内其他设备通过此设备代理' },
        { name: 'http-listen', default: '127.0.0.1:6152', desc: 'HTTP 代理监听地址和端口' },
        { name: 'socks5-listen', default: '127.0.0.1:6153', desc: 'SOCKS5 代理监听地址和端口' },
        { name: 'enhanced-mode', default: 'false', desc: '增强模式，接管系统 DNS，配合 tun 模式使用' },
        { name: 'ipv6', default: 'false', desc: '是否启用 IPv6 支持' },
        { name: 'exclude-simple-hostnames', default: 'true', desc: '排除不含点的简单主机名（如 localhost）' },
        { name: 'replica', default: 'false', desc: '是否开启流量嗅探记录（调试用）' },
        { name: 'tun-excluded-routes', default: '', desc: 'TUN 模式下排除的路由 CIDR 段' },
        { name: 'hijack-dns', default: '', desc: '劫持特定 DNS 服务器的请求' },
      ],

      mitmItems: [
        {
          title: 'MITM 是什么',
          desc: 'MITM（Man-in-the-Middle，中间人）功能允许 Surge 解密 HTTPS 流量，用于抓包调试或脚本修改响应。需要在设备上安装并信任 Surge 生成的根证书。',
          open: false,
          code: `[MITM]
enable = true
# 需要解密的域名（支持通配符）
hostname = *.example.com, api.service.com
# 跳过证书验证（不推荐）
# skip-server-cert-verify = true`,
        },
        {
          title: 'Script 脚本钩子',
          desc: 'Surge 支持通过 JavaScript 脚本修改请求/响应，可用于去广告、修改接口返回值、定时任务等。',
          open: false,
          code: `[Script]
# 修改 HTTP 响应
script1 = type=http-response, pattern=https://api.example.com/data, script-path=scripts/modify.js

# 定时任务（每天 8:00 执行）
cron1 = type=cron, cronexp=0 8 * * *, script-path=scripts/daily.js

# 脚本文件示例（scripts/modify.js）
# $done({ body: JSON.stringify({ patched: true }) })`,
        },
        {
          title: '证书安装步骤（iOS）',
          desc: '要使用 MITM 功能，需在 iOS 设备上安装根证书。',
          open: false,
          code: `步骤：
1. 打开 Surge → 首页 → MITM → 安装证书
2. 跳转到"设置"App → 通用 → VPN与设备管理
3. 找到 Surge 证书 → 安装
4. 设置 → 通用 → 关于本机 → 证书信任设置
5. 找到 Surge 的证书 → 开启完全信任

注意：MITM 会解密 HTTPS 流量，请勿对不信任的网站开启。`,
        },
      ],
    }
  },

  computed: {
    generatedConfig() {
      const lines = []

      // [General]
      lines.push('[General]')
      lines.push(`loglevel = ${this.general.loglevel}`)
      lines.push(`dns-server = ${this.general.dns || '8.8.8.8, 1.1.1.1'}`)
      lines.push(`skip-proxy = ${this.general.skipProxy || '127.0.0.1, localhost, 192.168.0.0/24'}`)
      if (this.general.allowWifi) {
        lines.push(`allow-wifi-access = true`)
        lines.push(`http-listen = 0.0.0.0:${this.general.httpPort || 6152}`)
        lines.push(`socks5-listen = 0.0.0.0:${this.general.socksPort || 6153}`)
      }
      if (this.general.enhanced) lines.push(`enhanced-mode = true`)
      if (this.general.ipv6) lines.push(`ipv6 = true`)

      // [Proxy]
      if (this.proxies.length) {
        lines.push('')
        lines.push('[Proxy]')
        for (const p of this.proxies) {
          const line = this.formatProxy(p)
          if (line) lines.push(line)
        }
      }

      // [Proxy Group]
      if (this.proxyGroups.length) {
        lines.push('')
        lines.push('[Proxy Group]')
        for (const g of this.proxyGroups) {
          const line = this.formatGroup(g)
          if (line) lines.push(line)
        }
      }

      // [Rule]
      if (this.rules.length) {
        lines.push('')
        lines.push('[Rule]')
        for (const r of this.rules) {
          if (r.type === 'FINAL') {
            lines.push(`FINAL,${r.policy}`)
          } else if (r.value) {
            lines.push(`${r.type},${r.value},${r.policy}`)
          }
        }
      }

      return lines.join('\n')
    },
  },

  methods: {
    formatProxy(p) {
      const name = p.name || 'Proxy'
      if (p.type === 'ss') {
        let line = `${name} = ss, ${p.server || 'server'}, ${p.port || 443}, encrypt-method=${p.method || 'chacha20-ietf-poly1305'}, password=${p.password || ''}`
        if (p.udp) line += ', udp-relay=true'
        return line
      }
      if (p.type === 'vmess') {
        let line = `${name} = vmess, ${p.server || 'server'}, ${p.port || 443}, username=${p.uuid || ''}`
        if (p.tls) line += ', tls=true'
        if (p.ws) {
          line += `, ws=true, ws-path=${p.wsPath || '/'}`
          if (p.wsHost) line += `, ws-headers=Host:${p.wsHost}`
        }
        if (p.skipCert) line += ', skip-cert-verify=true'
        return line
      }
      if (p.type === 'trojan') {
        let line = `${name} = trojan, ${p.server || 'server'}, ${p.port || 443}, password=${p.password || ''}`
        if (p.sni) line += `, sni=${p.sni}`
        if (p.skipCert) line += ', skip-cert-verify=true'
        if (p.udp) line += ', udp-relay=true'
        return line
      }
      if (p.type === 'http') {
        let line = `${name} = http, ${p.server || 'server'}, ${p.port || 8080}`
        if (p.username) line += `, username=${p.username}, password=${p.password || ''}`
        if (p.tls) line += ', tls=true'
        return line
      }
      if (p.type === 'socks5') {
        let line = `${name} = socks5, ${p.server || 'server'}, ${p.port || 1080}`
        if (p.username) line += `, username=${p.username}, password=${p.password || ''}`
        if (p.tls) line += ', tls=true'
        return line
      }
      return ''
    },

    formatGroup(g) {
      if (!g.name) return ''
      const members = (g.members || []).join(', ')
      if (g.type === 'select') {
        return `${g.name} = select, ${members}`
      }
      const url = g.url || 'http://www.gstatic.com/generate_204'
      const interval = g.interval || 300
      return `${g.name} = ${g.type}, ${members}, url=${url}, interval=${interval}`
    },

    addProxy() {
      this.proxies.push({
        name: `Proxy-${this.proxies.length + 1}`,
        type: 'ss',
        server: '',
        port: 443,
        method: 'chacha20-ietf-poly1305',
        password: '',
        uuid: '',
        tls: false,
        ws: false,
        wsPath: '/',
        wsHost: '',
        sni: '',
        skipCert: false,
        udp: false,
        username: '',
      })
    },

    addGroup() {
      this.proxyGroups.push({
        name: `Group-${this.proxyGroups.length + 1}`,
        type: 'select',
        members: [],
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
      })
    },

    addRule() {
      this.rules.push({ type: 'DOMAIN-SUFFIX', value: '', policy: 'DIRECT' })
    },

    addQuickRule(type, value, policy) {
      this.rules.push({ type, value, policy })
    },

    addFinalRule() {
      const hasPolicy = this.proxyGroups.length
        ? this.proxyGroups[0].name
        : this.proxies.length
          ? this.proxies[0].name
          : 'PROXY'
      this.rules.push({ type: 'FINAL', value: '', policy: hasPolicy })
    },

    async copyConfig() {
      try {
        await navigator.clipboard.writeText(this.generatedConfig)
        this.copied = true
        setTimeout(() => { this.copied = false }, 2000)
      } catch {
        // fallback
        const el = document.createElement('textarea')
        el.value = this.generatedConfig
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        this.copied = true
        setTimeout(() => { this.copied = false }, 2000)
      }
    },

    downloadConfig() {
      const blob = new Blob([this.generatedConfig], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.saveName || 'surge'}.conf`
      a.click()
      URL.revokeObjectURL(url)
    },

    saveConfig() {
      const name = this.saveName.trim() || `配置 ${new Date().toLocaleDateString()}`
      const existing = this.savedConfigs.findIndex(c => c.name === name)
      const item = {
        id: existing >= 0 ? this.savedConfigs[existing].id : Date.now(),
        name,
        createdAt: existing >= 0 ? this.savedConfigs[existing].createdAt : Date.now(),
        updatedAt: Date.now(),
        data: {
          general: JSON.parse(JSON.stringify(this.general)),
          proxies: JSON.parse(JSON.stringify(this.proxies)),
          proxyGroups: JSON.parse(JSON.stringify(this.proxyGroups)),
          rules: JSON.parse(JSON.stringify(this.rules)),
        },
      }
      if (existing >= 0) {
        this.savedConfigs.splice(existing, 1, item)
      } else {
        this.savedConfigs.unshift(item)
      }
      this.persistSaved()
    },

    loadConfig(c) {
      this.general = JSON.parse(JSON.stringify(c.data.general))
      this.proxies = JSON.parse(JSON.stringify(c.data.proxies))
      this.proxyGroups = JSON.parse(JSON.stringify(c.data.proxyGroups))
      this.rules = JSON.parse(JSON.stringify(c.data.rules))
      this.step = 0
    },

    persistSaved() {
      try {
        localStorage.setItem('surge_configs', JSON.stringify(this.savedConfigs))
      } catch {}
    },

    loadSaved() {
      try {
        const raw = localStorage.getItem('surge_configs')
        if (raw) this.savedConfigs = JSON.parse(raw)
      } catch {}
    },

    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
  },

  mounted() {
    this.loadSaved()
  },
}
</script>

<style scoped>
.surge-page {
  padding: 0 0 80px;
}

/* 顶部模式 Tab */
.surge-mode-tabs {
  display: flex;
  gap: 0;
  margin: 16px 16px 0;
  background: var(--surface, #f1f5f9);
  border-radius: 12px;
  padding: 4px;
}
.surge-mode-tab {
  flex: 1;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  border-radius: 9px;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  transition: all 0.2s;
}
.surge-mode-tab.active {
  background: var(--card-bg, #fff);
  color: var(--primary, #0f766e);
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

/* 步骤指示器 */
.surge-steps {
  display: flex;
  align-items: center;
  padding: 16px 16px 0;
  gap: 0;
  overflow-x: auto;
}
.surge-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 52px;
  cursor: default;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.surge-step.active { opacity: 1; }
.surge-step.done { opacity: 0.7; cursor: pointer; }
.surge-step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--surface, #f1f5f9);
  color: var(--text-muted, #64748b);
  border: 2px solid var(--border, #e2e8f0);
}
.surge-step.active .surge-step-dot {
  background: var(--primary, #0f766e);
  color: #fff;
  border-color: var(--primary, #0f766e);
}
.surge-step.done .surge-step-dot {
  background: var(--primary, #0f766e);
  color: #fff;
  border-color: var(--primary, #0f766e);
  font-size: 11px;
}
.surge-step-label {
  font-size: 10px;
  margin-top: 4px;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
}
.surge-step.active .surge-step-label {
  color: var(--primary, #0f766e);
  font-weight: 600;
}

/* 表单面板 */
.surge-step-panel {
  margin: 12px 16px 0;
}
.surge-section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px;
  color: var(--text, #0f172a);
}
.surge-form-group {
  margin-bottom: 14px;
}
.surge-label {
  display: block;
  font-size: 13px;
  color: var(--text-muted, #64748b);
  margin-bottom: 5px;
}
.surge-form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.surge-form-row .surge-label {
  margin-bottom: 0;
}
.surge-form-row-2 {
  display: flex;
  gap: 10px;
}
.surge-form-row-2 .surge-form-group {
  flex: 1;
}
.surge-form-port {
  flex: 0 0 90px !important;
}

/* Toggle */
.surge-toggle {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}
.surge-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.surge-toggle-track {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--border, #cbd5e1);
  transition: background 0.2s;
  position: relative;
}
.surge-toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.surge-toggle input:checked ~ .surge-toggle-track {
  background: var(--primary, #0f766e);
}
.surge-toggle input:checked ~ .surge-toggle-track::after {
  transform: translateX(18px);
}

/* 代理卡片 */
.surge-proxy-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}
.surge-proxy-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface, #f8fafc);
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.surge-proxy-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #0f172a);
}
.surge-proxy-fields {
  padding: 12px;
}
.surge-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--primary, #0f766e);
  color: #fff;
  letter-spacing: 0.5px;
}
.surge-badge-group {
  background: #7c3aed;
}
.surge-btn-icon {
  border: none;
  background: none;
  color: var(--text-muted, #94a3b8);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}
.surge-btn-icon:hover { background: var(--surface, #f1f5f9); }

/* 复选框列表 */
.surge-check-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.surge-check-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--card-bg, #fff);
}
.surge-check-item input { cursor: pointer; }

/* 规则行 */
.surge-quick-rules {
  margin-bottom: 14px;
}
.surge-quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.surge-quick-btn {
  font-size: 12px !important;
  padding: 5px 10px !important;
}
.surge-rule-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.surge-rule-type {
  flex: 0 0 auto;
  width: 150px;
  font-size: 13px;
}
.surge-rule-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
.surge-rule-policy {
  flex: 0 0 auto;
  width: 100px;
  font-size: 13px;
}

/* 预览 */
.surge-export-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.surge-save-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.surge-config-preview {
  background: var(--surface, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  padding: 14px;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
  white-space: pre;
  color: var(--text, #0f172a);
  font-family: 'Menlo', 'Courier New', monospace;
}

/* 步骤导航 */
.surge-step-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 0;
}

/* 已保存配置 */
.surge-saved-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border, #f1f5f9);
}
.surge-saved-card:last-child { border-bottom: none; }
.surge-saved-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.surge-saved-date {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.surge-saved-actions {
  display: flex;
  gap: 6px;
}

.surge-empty-hint {
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
  text-align: center;
  padding: 16px 0;
}

/* 概念手册 */
.surge-reference .panel {
  margin: 12px 16px 0;
}
.surge-ref-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
}
.surge-ref-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  cursor: pointer;
  background: var(--card-bg, #fff);
  user-select: none;
}
.surge-ref-header:active { background: var(--surface, #f8fafc); }
.surge-ref-desc {
  flex: 1;
  font-size: 13px;
  color: var(--text-muted, #64748b);
}
.surge-ref-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #0f172a);
}
.surge-ref-arrow {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
.surge-ref-body {
  padding: 12px 14px;
  border-top: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #f8fafc);
}
.surge-ref-note {
  font-size: 13px;
  color: var(--text-muted, #64748b);
  margin: 0 0 10px;
  line-height: 1.5;
}
.surge-code-block {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
  white-space: pre;
  color: var(--text, #0f172a);
  font-family: 'Menlo', 'Courier New', monospace;
  margin-bottom: 12px;
}

/* 参数表格 */
.surge-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.surge-param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.surge-param-table th {
  background: var(--surface, #f1f5f9);
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  font-size: 12px;
  white-space: nowrap;
}
.surge-param-table td {
  padding: 8px 10px;
  border-top: 1px solid var(--border, #f1f5f9);
  color: var(--text, #0f172a);
  vertical-align: top;
  line-height: 1.4;
}
.surge-param-table code {
  font-family: 'Menlo', 'Courier New', monospace;
  font-size: 12px;
  background: var(--surface, #f1f5f9);
  padding: 1px 5px;
  border-radius: 4px;
  word-break: break-all;
}
.surge-code-sm {
  font-size: 11px;
}
</style>
