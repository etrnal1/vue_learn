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

      <!-- ── General ── -->
      <section class="panel step-panel">
        <div class="section-header">
          <h3 class="step-title">⚙️ General — 基础设置</h3>
          <button class="btn btn-sm copy-sec-btn" @click="copySection('general')">
            {{ copiedSection === 'general' ? '✓ 已复制' : '复制此段 ↗' }}
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">loglevel <span class="hint">日志级别</span></label>
          <select v-model="general.loglevel" class="select">
            <option value="verbose">verbose — 详细输出（调试用）</option>
            <option value="info">info — 一般信息</option>
            <option value="notify">notify — 重要通知（推荐）</option>
            <option value="warning">warning — 仅显示警告</option>
          </select>
          <p class="field-tip">控制日志详细程度，日常使用选 notify 即可</p>
        </div>

        <div class="form-group">
          <label class="form-label">dns-server <span class="hint">DNS 服务器</span></label>
          <input v-model="general.dns" class="input" placeholder="8.8.8.8, 1.1.1.1" />
          <p class="field-tip">域名解析服务器，多个地址用逗号分隔；留空使用系统默认</p>
        </div>

        <div class="form-group">
          <label class="form-label">skip-proxy <span class="hint">跳过代理的地址</span></label>
          <input v-model="general.skipProxy" class="input" placeholder="127.0.0.1, localhost, 192.168.0.0/24" />
          <p class="field-tip">填写后这些地址会直接连接，不经过代理。局域网、本机地址填这里</p>
        </div>

        <div class="form-group form-row-check">
          <div>
            <label class="form-label" style="margin:0">allow-wifi-access <span class="hint">WiFi 局域网共享</span></label>
            <p class="field-tip" style="margin:2px 0 0">开启后，同一 WiFi 下其他设备可以使用此机器作为代理</p>
          </div>
          <input type="checkbox" v-model="general.allowWifi" class="check-box" />
        </div>

        <template v-if="general.allowWifi">
          <div class="form-group">
            <label class="form-label">http-listen <span class="hint">HTTP 监听地址</span></label>
            <input v-model.number="general.httpPort" class="input" type="number" placeholder="6152" />
            <p class="field-tip">局域网设备连接此端口使用 HTTP 代理，地址固定为 0.0.0.0（监听所有网卡）</p>
          </div>
          <div class="form-group">
            <label class="form-label">socks5-listen <span class="hint">SOCKS5 监听地址</span></label>
            <input v-model.number="general.socksPort" class="input" type="number" placeholder="6153" />
            <p class="field-tip">局域网设备连接此端口使用 SOCKS5 代理</p>
          </div>
        </template>

        <div class="form-group form-row-check">
          <div>
            <label class="form-label" style="margin:0">enhanced-mode <span class="hint">增强模式</span></label>
            <p class="field-tip" style="margin:2px 0 0">接管所有网络请求，代理更彻底；iOS 上建议开启</p>
          </div>
          <input type="checkbox" v-model="general.enhancedMode" class="check-box" />
        </div>
      </section>

      <!-- ── Proxy 代理节点 ── -->
      <section class="panel step-panel">
        <div class="section-header">
          <h3 class="step-title">🌐 Proxy — 代理节点</h3>
          <button class="btn btn-sm copy-sec-btn" :disabled="!proxies.length" @click="copySection('proxy')">
            {{ copiedSection === 'proxy' ? '✓ 已复制' : '复制此段 ↗' }}
          </button>
        </div>

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
                <label class="form-label">节点名称 <span class="hint">name</span></label>
                <input v-model="proxy.name" class="input" placeholder="Hong Kong 01" />
              </div>
              <div class="form-group">
                <label class="form-label">协议类型 <span class="hint">type</span></label>
                <select v-model="proxy.type" class="select">
                  <option value="ss">SS — Shadowsocks 经典代理</option>
                  <option value="vmess">VMess — V2Ray 主协议</option>
                  <option value="trojan">Trojan — 伪装 HTTPS 流量</option>
                  <option value="http">HTTP — 标准 HTTP 代理</option>
                  <option value="socks5">SOCKS5 — 通用代理协议</option>
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">服务器地址 <span class="hint">server</span></label>
                <input v-model="proxy.server" class="input" placeholder="example.com 或 IP" />
              </div>
              <div class="form-group">
                <label class="form-label">端口 <span class="hint">port</span></label>
                <input v-model.number="proxy.port" class="input" type="number" placeholder="443" />
              </div>
            </div>

            <!-- SS -->
            <template v-if="proxy.type === 'ss'">
              <div class="form-group">
                <label class="form-label">encrypt-method <span class="hint">加密方式</span></label>
                <select v-model="proxy.method" class="select">
                  <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305（推荐，移动端性能佳）</option>
                  <option value="aes-128-gcm">aes-128-gcm（硬件加速快）</option>
                  <option value="aes-256-gcm">aes-256-gcm（更强加密）</option>
                  <option value="aes-128-cfb">aes-128-cfb（旧版兼容）</option>
                  <option value="aes-256-cfb">aes-256-cfb（旧版兼容）</option>
                </select>
                <p class="field-tip">SS 数据加密算法；推荐 chacha20-ietf-poly1305，移动设备性能最佳</p>
              </div>
              <div class="form-group">
                <label class="form-label">password <span class="hint">密码</span></label>
                <input v-model="proxy.password" class="input" type="password" placeholder="your-password" />
              </div>
              <div class="form-group form-row-check">
                <div>
                  <label class="form-label" style="margin:0">udp-relay <span class="hint">UDP 转发</span></label>
                  <p class="field-tip" style="margin:2px 0 0">开启后支持 UDP 流量代理（游戏、DNS 等）</p>
                </div>
                <input type="checkbox" v-model="proxy.udp" class="check-box" />
              </div>
            </template>

            <!-- VMess -->
            <template v-if="proxy.type === 'vmess'">
              <div class="form-group">
                <label class="form-label">username / UUID <span class="hint">用户标识</span></label>
                <input v-model="proxy.uuid" class="input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                <p class="field-tip">VMess 协议的身份凭证，从服务端获取的 UUID</p>
              </div>
              <div class="form-row-check-group">
                <div class="form-group form-row-check">
                  <div>
                    <label class="form-label" style="margin:0">tls <span class="hint">TLS 加密传输</span></label>
                    <p class="field-tip" style="margin:2px 0 0">在 VMess 外层包裹 TLS，流量更安全</p>
                  </div>
                  <input type="checkbox" v-model="proxy.tls" class="check-box" />
                </div>
                <div class="form-group form-row-check">
                  <div>
                    <label class="form-label" style="margin:0">ws <span class="hint">WebSocket 传输</span></label>
                    <p class="field-tip" style="margin:2px 0 0">使用 WebSocket 协议传输，便于 CDN 转发</p>
                  </div>
                  <input type="checkbox" v-model="proxy.ws" class="check-box" />
                </div>
              </div>
              <div v-if="proxy.tls" class="form-group">
                <label class="form-label">sni <span class="hint">SNI 服务器名称指示</span></label>
                <input v-model="proxy.sni" class="input" placeholder="example.com" />
                <p class="field-tip">TLS 握手时发送的域名，用于虚拟主机识别；通常填服务器域名</p>
              </div>
              <div v-if="proxy.ws" class="form-group">
                <label class="form-label">ws-path <span class="hint">WebSocket 路径</span></label>
                <input v-model="proxy.wsPath" class="input" placeholder="/path" />
                <p class="field-tip">VMess 伪装成 HTTP 请求的 URL 路径，需与服务端一致</p>
              </div>
              <div v-if="proxy.ws" class="form-group">
                <label class="form-label">ws-headers Host <span class="hint">WebSocket 伪装域名（可选）</span></label>
                <input v-model="proxy.wsHost" class="input" placeholder="example.com" />
                <p class="field-tip">WS 请求头中的 Host 字段，CDN 转发时填 CDN 域名</p>
              </div>
            </template>

            <!-- Trojan -->
            <template v-if="proxy.type === 'trojan'">
              <div class="form-group">
                <label class="form-label">password <span class="hint">密码</span></label>
                <input v-model="proxy.password" class="input" type="password" placeholder="your-password" />
              </div>
              <div class="form-group">
                <label class="form-label">sni <span class="hint">SNI 服务器名称指示</span></label>
                <input v-model="proxy.sni" class="input" placeholder="example.com" />
                <p class="field-tip">Trojan 基于 TLS，SNI 用于指定握手时的域名；通常填服务器域名</p>
              </div>
              <div class="form-group form-row-check">
                <div>
                  <label class="form-label" style="margin:0">skip-cert-verify <span class="hint">跳过证书验证</span></label>
                  <p class="field-tip" style="margin:2px 0 0">忽略 TLS 证书错误，仅用于测试，生产环境不建议开启</p>
                </div>
                <input type="checkbox" v-model="proxy.skipCert" class="check-box" />
              </div>
            </template>

            <!-- HTTP / SOCKS5 -->
            <template v-if="proxy.type === 'http' || proxy.type === 'socks5'">
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">username <span class="hint">用户名（可选）</span></label>
                  <input v-model="proxy.username" class="input" placeholder="username" />
                </div>
                <div class="form-group">
                  <label class="form-label">password <span class="hint">密码（可选）</span></label>
                  <input v-model="proxy.password" class="input" type="password" placeholder="password" />
                </div>
              </div>
              <div v-if="proxy.type === 'http'" class="form-group form-row-check">
                <div>
                  <label class="form-label" style="margin:0">tls <span class="hint">HTTPS 代理</span></label>
                  <p class="field-tip" style="margin:2px 0 0">服务器是 HTTPS 代理时开启（即 CONNECT over TLS）</p>
                </div>
                <input type="checkbox" v-model="proxy.tls" class="check-box" />
              </div>
            </template>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:8px" @click="addProxy">＋ 添加代理节点</button>
      </section>

      <!-- ── Proxy Group 代理组 ── -->
      <section class="panel step-panel">
        <div class="section-header">
          <h3 class="step-title">🔀 Proxy Group — 代理组</h3>
          <button class="btn btn-sm copy-sec-btn" :disabled="!proxyGroups.length" @click="copySection('group')">
            {{ copiedSection === 'group' ? '✓ 已复制' : '复制此段 ↗' }}
          </button>
        </div>

        <div v-if="proxyGroups.length === 0" class="empty">
          <p>代理组将多个节点组合，规则中引用组名。建议至少添加一个 select 组</p>
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
                <label class="form-label">组名 <span class="hint">name</span></label>
                <input v-model="group.name" class="input" placeholder="Proxy" />
                <p class="field-tip">规则中 policy 填写此名称来引用这个组</p>
              </div>
              <div class="form-group">
                <label class="form-label">类型 <span class="hint">type</span></label>
                <select v-model="group.type" class="select">
                  <option value="select">select — 手动选择节点</option>
                  <option value="url-test">url-test — 自动测速最优</option>
                  <option value="fallback">fallback — 故障自动转移</option>
                  <option value="load-balance">load-balance — 负载均衡</option>
                </select>
              </div>
            </div>

            <template v-if="group.type !== 'select'">
              <div class="form-group">
                <label class="form-label">url <span class="hint">测速地址</span></label>
                <input v-model="group.url" class="input" placeholder="http://www.gstatic.com/generate_204" />
                <p class="field-tip">用于测速的 URL，Surge 会定期请求此地址检测节点延迟</p>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">interval <span class="hint">测速间隔（秒）</span></label>
                  <input v-model.number="group.interval" class="input" type="number" placeholder="300" />
                  <p class="field-tip">每隔多少秒测速一次</p>
                </div>
                <div class="form-group">
                  <label class="form-label">timeout <span class="hint">超时（毫秒）</span></label>
                  <input v-model.number="group.timeout" class="input" type="number" placeholder="5000" />
                  <p class="field-tip">超过此时间无响应则视为不可用</p>
                </div>
              </div>
            </template>

            <div class="form-group">
              <label class="form-label">包含的节点 / 策略</label>
              <p class="field-tip" style="margin-bottom:6px">勾选加入此组的节点，DIRECT = 直连，REJECT = 拒绝</p>
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

      <!-- ── Rule 规则 ── -->
      <section class="panel step-panel">
        <div class="section-header">
          <h3 class="step-title">📋 Rule — 规则</h3>
          <button class="btn btn-sm copy-sec-btn" :disabled="!rules.length" @click="copySection('rule')">
            {{ copiedSection === 'rule' ? '✓ 已复制' : '复制此段 ↗' }}
          </button>
        </div>

        <p class="section-desc">规则决定流量走哪条路：<strong>DIRECT</strong>（直连）、<strong>REJECT</strong>（拒绝）或某个代理组</p>

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
          <p>暂无规则。最后请务必添加 FINAL 兜底规则，否则未匹配流量没有出口</p>
        </div>

        <div v-for="(rule, i) in rules" :key="i" class="rule-row">
          <select v-model="rule.type" class="select select-compact" :title="ruleTypeHints[rule.type]">
            <option value="DOMAIN">DOMAIN</option>
            <option value="DOMAIN-SUFFIX">DOMAIN-SUFFIX</option>
            <option value="DOMAIN-KEYWORD">DOMAIN-KEYWORD</option>
            <option value="IP-CIDR">IP-CIDR</option>
            <option value="IP-CIDR6">IP-CIDR6</option>
            <option value="GEOIP">GEOIP</option>
            <option value="RULE-SET">RULE-SET</option>
            <option value="FINAL">FINAL</option>
          </select>
          <input
            v-if="rule.type !== 'FINAL'"
            v-model="rule.value"
            class="input input-compact"
            :placeholder="rulePlaceholders[rule.type] || '值'"
          />
          <select v-model="rule.policy" class="select select-compact">
            <option>DIRECT</option>
            <option>REJECT</option>
            <option v-for="g in proxyGroups" :key="g.name" :value="g.name">{{ g.name }}</option>
            <option v-for="p in proxies" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
          <button class="btn-icon-sm" @click="rules.splice(i, 1)">✕</button>
        </div>

        <!-- 规则类型说明 -->
        <div v-if="rules.length" class="rule-type-legend">
          <span v-for="(hint, type) in ruleTypeHints" :key="type" class="legend-item">
            <code>{{ type }}</code>：{{ hint }}
          </span>
        </div>

        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-primary" style="flex:1" @click="addRule">＋ 添加规则</button>
          <button class="btn" style="flex:1" @click="addFinalRule">添加 FINAL 兜底</button>
        </div>
      </section>

      <!-- ── 预览 & 导出 ── -->
      <section class="panel step-panel">
        <div class="section-header">
          <h3 class="step-title">✅ 预览 & 导出</h3>
          <button class="btn btn-sm copy-sec-btn" @click="copySection('all')">
            {{ copiedSection === 'all' ? '✓ 已复制' : '复制全部 ↗' }}
          </button>
        </div>

        <div class="export-actions">
          <button class="btn" @click="downloadConfig">⬇️ 下载 .conf</button>
        </div>

        <div class="save-bar">
          <input v-model.trim="saveName" class="input" placeholder="配置名称（如：HK 节点配置）" />
          <button class="btn btn-primary" :disabled="!saveName" @click="saveToDb">💾 保存</button>
        </div>
        <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>

        <pre class="config-preview">{{ generatedConfig }}</pre>
      </section>

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
      copiedSection: '',

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

      saveName: '',
      saveMsg: '',
      savedConfigs: [],

      ruleTypeHints: {
        'DOMAIN': '精确匹配完整域名',
        'DOMAIN-SUFFIX': '匹配域名及其所有子域名',
        'DOMAIN-KEYWORD': '域名中包含此关键词',
        'IP-CIDR': 'IPv4 地址段（如 192.168.0.0/24）',
        'IP-CIDR6': 'IPv6 地址段',
        'GEOIP': 'IP 归属国家代码（如 CN）',
        'RULE-SET': '引用外部规则集文件',
        'FINAL': '兜底规则，未匹配时使用'
      },

      rulePlaceholders: {
        'DOMAIN': 'example.com',
        'DOMAIN-SUFFIX': 'google.com',
        'DOMAIN-KEYWORD': 'youtube',
        'IP-CIDR': '192.168.0.0/24',
        'IP-CIDR6': '::1/128',
        'GEOIP': 'CN',
        'RULE-SET': 'SYSTEM'
      },

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
            { name: 'username', required: true, desc: 'VMess UUID，从服务端获取' },
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
        { name: 'loglevel', default: 'notify', desc: '日志级别：verbose / info / notify / warning' },
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

    generalSection() {
      const lines = ['[General]']
      lines.push(`loglevel = ${this.general.loglevel}`)
      lines.push(`dns-server = ${this.general.dns || '8.8.8.8, 1.1.1.1'}`)
      lines.push(`skip-proxy = ${this.general.skipProxy || '127.0.0.1, localhost, *.local'}`)
      if (this.general.enhancedMode) lines.push('enhanced-mode = true')
      if (this.general.allowWifi) {
        lines.push('allow-wifi-access = true')
        lines.push(`http-listen = 0.0.0.0:${this.general.httpPort || 6152}`)
        lines.push(`socks5-listen = 0.0.0.0:${this.general.socksPort || 6153}`)
      }
      return lines.join('\n')
    },

    proxySection() {
      if (!this.proxies.length) return ''
      const lines = ['[Proxy]']
      for (const p of this.proxies) {
        const line = this.formatProxyLine(p)
        if (line) lines.push(line)
      }
      return lines.join('\n')
    },

    proxyGroupSection() {
      if (!this.proxyGroups.length) return ''
      const lines = ['[Proxy Group]']
      for (const g of this.proxyGroups) lines.push(this.formatGroupLine(g))
      return lines.join('\n')
    },

    ruleSection() {
      if (!this.rules.length) return ''
      const lines = ['[Rule]']
      for (const r of this.rules) {
        if (r.type === 'FINAL') lines.push(`FINAL,${r.policy}`)
        else if (r.value) lines.push(`${r.type},${r.value},${r.policy}`)
      }
      return lines.join('\n')
    },

    generatedConfig() {
      return [
        this.generalSection,
        this.proxySection,
        this.proxyGroupSection,
        this.ruleSection
      ].filter(Boolean).join('\n\n')
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

    async copySection(key) {
      const textMap = {
        general: this.generalSection,
        proxy: this.proxySection,
        group: this.proxyGroupSection,
        rule: this.ruleSection,
        all: this.generatedConfig
      }
      const text = textMap[key] || ''
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const el = document.createElement('textarea')
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      this.copiedSection = key
      setTimeout(() => { this.copiedSection = '' }, 2000)
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
      this.saveMsg = `✓ 已加载「${saved.name}」`
      setTimeout(() => { this.saveMsg = '' }, 2500)
    },

    exportSaved(saved) {
      const c = saved.config
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

.step-panel { margin: 0 16px 12px; }
.step-title { font-size: 16px; font-weight: 600; margin: 0; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.copy-sec-btn {
  font-size: 12px;
  padding: 5px 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.section-desc {
  font-size: 13px;
  color: var(--text-muted, #64748b);
  margin: -8px 0 12px;
  line-height: 1.5;
}

.form-group { margin-bottom: 12px; }
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted, #64748b);
  margin-bottom: 4px;
}
.hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted, #94a3b8);
  margin-left: 4px;
}
.field-tip {
  font-size: 11.5px;
  color: var(--text-muted, #94a3b8);
  margin: 3px 0 0;
  line-height: 1.5;
}
.form-row-check {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #f1f5f9);
  gap: 12px;
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
.rule-type-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
  padding: 8px;
  background: var(--bg-hover, rgba(0,0,0,0.02));
  border-radius: 8px;
}
.legend-item { font-size: 11px; color: var(--text-muted, #64748b); }
.legend-item code { font-size: 11px; color: var(--primary); }

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
