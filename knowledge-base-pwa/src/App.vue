<template>
  <div class="kb-page">
    <!-- 密码锁屏 -->
    <div v-if="locked" class="lock-screen">
      <div class="lock-card">
        <div class="lock-icon">🔒</div>
        <h2>知识库已锁定</h2>
        <p>请输入密码解锁</p>
        <input
          v-model="lockPassword"
          type="password"
          class="input lock-input"
          placeholder="输入密码"
          @keydown.enter="doUnlock"
        />
        <p v-if="lockError" class="lock-error">{{ lockError }}</p>
        <button type="button" class="btn btn-primary lock-btn" @click="doUnlock">解锁</button>
      </div>
    </div>

    <!-- 全局导航 -->
    <nav v-if="!locked" class="app-nav">
      <button
        v-for="tab in appTabs"
        :key="tab.id"
        type="button"
        class="nav-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </nav>

    <div v-if="activeTab === 'kb'" class="kb-scroll-area">
    <section class="hero">
      <div>
        <p class="eyebrow">Offline-first</p>
        <h1>本地知识库 PWA</h1>
        <p class="hero-text">独立工作区版本。支持本地导入、离线阅读、列表管理和全文搜索。</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn btn-primary" @click="openFilePicker">导入文档</button>
        <button type="button" class="btn" @click="requestPersistentStorage">申请持久化</button>
      </div>
    </section>

    <section class="toolbar panel">
      <div class="toolbar-group">
        <input v-model.trim="listKeyword" class="input" placeholder="列表搜索：文件名 / 内容关键词" />
        <input v-model.trim="searchKeyword" class="input" placeholder="全文搜索：正文 / 单元格" />
      </div>
      <div class="toolbar-group">
        <select v-model="typeFilter" class="input select">
          <option value="all">全部</option>
          <option value="docx">Word</option>
          <option value="xlsx">Excel</option>
          <option value="pdf">PDF</option>
        </select>
        <button type="button" class="btn" @click="reloadDocs">刷新</button>
        <button type="button" class="btn btn-danger" :disabled="docs.length === 0" @click="clearAllDocs">清空全部</button>
      </div>
    </section>

    <section class="stats">
      <article class="stat panel">
        <span>文档总数</span>
        <strong>{{ docs.length }}</strong>
      </article>
      <article class="stat panel">
        <span>Word</span>
        <strong>{{ docCounts.docx }}</strong>
      </article>
      <article class="stat panel">
        <span>Excel</span>
        <strong>{{ docCounts.xlsx }}</strong>
      </article>
      <article class="stat panel">
        <span>PDF</span>
        <strong>{{ docCounts.pdf }}</strong>
      </article>
      <article class="stat panel">
        <span>存储状态</span>
        <strong>{{ storageInfo.persisted ? '已持久化' : '未持久化' }}</strong>
      </article>
    </section>

    <section class="layout">
      <aside class="panel sidebar">
        <div class="section-head">
          <div>
            <p class="eyebrow">Documents</p>
            <h2>文档列表</h2>
          </div>
          <span class="pill">{{ filteredDocs.length }}</span>
        </div>

        <div v-if="filteredDocs.length === 0" class="empty">
          <strong>还没有文档</strong>
          <p>点击“导入文档”，选择 `.docx` 或 `.xlsx`。</p>
        </div>

        <div v-else class="doc-list">
          <button
            v-for="doc in filteredDocs"
            :key="doc.id"
            type="button"
            class="doc-item"
            :class="{ active: activeDocId === doc.id }"
            @click="openDoc(doc)"
          >
            <div class="doc-icon" :class="doc.type">{{ { docx: 'W', xlsx: 'X', pdf: 'P' }[doc.type] || '?' }}</div>
            <div class="doc-meta">
              <strong>{{ doc.name }}</strong>
              <p>{{ getDocPreview(doc) }}</p>
              <span>{{ doc.type.toUpperCase() }} · {{ formatBytes(doc.size) }}</span>
            </div>
          </button>
        </div>
      </aside>

      <main class="content-stack">
        <section class="panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Management</p>
              <h2>文档管理</h2>
            </div>
          </div>
          <div v-if="filteredDocs.length === 0" class="empty compact">
            <strong>暂无文档</strong>
            <p>导入后这里会显示完整管理表格。</p>
          </div>
          <div v-else class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>类型</th>
                  <th>大小</th>
                  <th>导入时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in filteredDocs" :key="`row-${doc.id}`">
                  <td>{{ doc.name }}</td>
                  <td>{{ doc.type.toUpperCase() }}</td>
                  <td>{{ formatBytes(doc.size) }}</td>
                  <td>{{ formatDate(doc.createdAt) }}</td>
                  <td class="row-actions">
                    <button type="button" class="mini-btn" @click="openDoc(doc)">打开</button>
                    <button type="button" class="mini-btn" @click="shareDoc(doc)">分享</button>
                    <button type="button" class="mini-btn danger" @click="deleteDoc(doc)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Search</p>
              <h2>全文搜索</h2>
            </div>
            <span class="pill">{{ searchResults.length }} 结果</span>
          </div>
          <div v-if="searchResults.length === 0" class="empty compact">
            <strong>{{ searchKeyword ? '没有匹配结果' : '输入关键词开始搜索' }}</strong>
            <p>搜索范围覆盖文件名、Word 正文和 Excel 单元格内容。</p>
          </div>
          <div v-else class="search-list">
            <button
              v-for="result in searchResults"
              :key="`${result.doc.id}-${result.index}`"
              type="button"
              class="search-item"
              @click="openSearchResult(result)"
            >
              <div>
                <strong>{{ result.doc.name }}</strong>
                <p>{{ result.snippet }}</p>
              </div>
              <span>{{ result.doc.type.toUpperCase() }}</span>
            </button>
          </div>
        </section>

        <!-- 导入队列 -->
        <section v-if="importQueue.length > 0" class="panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Import</p>
              <h2>导入进度</h2>
            </div>
          </div>
          <div class="queue-list">
            <div v-for="item in importQueue" :key="item.key" class="queue-item">
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.detail }}</p>
              </div>
              <span class="queue-state" :class="item.state">{{ item.status }}</span>
            </div>
          </div>
        </section>
      </main>
    </section>

    <!-- 全屏文档阅读器 -->
    <div v-if="activeDoc && readerOpen" class="reader-overlay">
      <!-- 阅读进度条 -->
      <div class="reader-progress-bar">
        <div class="reader-progress-fill" :style="{ width: readerProgress + '%' }"></div>
      </div>

      <!-- 顶部栏 -->
      <div class="reader-header">
        <button type="button" class="reader-back" @click="closeReader">← 返回列表</button>
        <div class="reader-title">{{ activeDoc.name }}</div>
        <button type="button" class="reader-search-toggle" @click="toggleReaderSearch">🔍</button>
        <button type="button" class="mini-btn" @click="shareDoc(activeDoc)">分享</button>
      </div>

      <!-- 搜索栏 -->
      <div v-if="readerSearchOpen" class="reader-search-bar">
        <input
          ref="readerSearchInput"
          v-model.trim="readerSearchKeyword"
          class="input reader-search-input"
          placeholder="搜索文档内容..."
          @input="doReaderSearch"
          @keydown.enter="jumpToMatch(1)"
        />
        <span v-if="readerSearchKeyword" class="reader-match-info">
          {{ readerMatchIndex + 1 }} / {{ readerMatchCount }}
        </span>
        <button type="button" class="mini-btn" @click="jumpToMatch(-1)" :disabled="!readerMatchCount">▲</button>
        <button type="button" class="mini-btn" @click="jumpToMatch(1)" :disabled="!readerMatchCount">▼</button>
        <button type="button" class="mini-btn" @click="clearReaderSearch">✕</button>
      </div>

      <!-- 内容区 -->
      <div ref="readerBody" class="reader-body" @scroll="onReaderScroll">
        <div v-if="activeDoc.type === 'docx'" class="reader-block">
          <div v-if="activeDoc.parseWarnings?.length" class="warning">
            {{ activeDoc.parseWarnings.join('；') }}
          </div>
          <article ref="readerContent" class="docx-content" v-html="activeDoc.contentHtml"></article>
        </div>

        <div v-else class="reader-block">
          <div class="sheet-tabs">
            <button
              v-for="sheet in activeDoc.sheets || []"
              :key="sheet.name"
              type="button"
              class="mini-btn"
              :class="{ active: activeSheetName === sheet.name }"
              @click="activeSheetName = sheet.name"
            >
              {{ sheet.name }}
            </button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th v-for="head in activeSheet.headers" :key="head">{{ head || ' ' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in activeSheet.rows" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`" :title="formatCell(cell)">
                    {{ formatCell(cell) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 回到顶部按钮 -->
      <button
        v-if="readerProgress > 15"
        type="button"
        class="reader-top-btn"
        @click="scrollReaderTop"
      >↑ 顶部</button>
    </div>

    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      accept=".docx,.xlsx,.pdf"
      multiple
      @change="onFileChange"
    />
    </div>

    <!-- 个人笔记 -->
    <div v-if="activeTab === 'notes'" class="kb-scroll-area">
      <PersonalNotes />
    </div>

    <!-- 备份迁移 -->
    <div v-if="activeTab === 'backup'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">Backup & Migrate</p>
          <h1>备份与迁移</h1>
          <p class="hero-text">导出全部数据为 JSON 文件，在新设备上导入即可恢复。支持知识库文档和个人笔记。</p>
        </div>
      </section>

      <section class="backup-grid">
        <article class="panel backup-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Export</p>
              <h2>导出备份</h2>
            </div>
          </div>
          <p class="backup-desc">将所有数据（知识库文档 + 个人笔记 + 分类）打包为一个 JSON 文件下载到本地。</p>
          <div class="backup-actions">
            <button type="button" class="btn btn-primary" :disabled="backupBusy" @click="doBackup">
              {{ backupBusy ? '导出中...' : '导出全部数据' }}
            </button>
          </div>
        </article>

        <article class="panel backup-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Import</p>
              <h2>导入恢复</h2>
            </div>
          </div>
          <p class="backup-desc">从备份文件恢复数据。支持合并（保留现有数据）或替换（清空后导入）两种模式。</p>
          <div class="backup-actions">
            <button type="button" class="btn btn-primary" :disabled="backupBusy" @click="$refs.backupFileInput?.click()">
              {{ backupBusy ? '导入中...' : '合并导入' }}
            </button>
            <button type="button" class="btn btn-danger" :disabled="backupBusy" @click="doRestoreReplace">
              替换导入
            </button>
          </div>
          <input ref="backupFileInput" type="file" accept=".json" class="hidden-input" @change="onBackupFileChange($event, 'merge')" />
          <input ref="backupReplaceInput" type="file" accept=".json" class="hidden-input" @change="onBackupFileChange($event, 'replace')" />
        </article>
      </section>

      <section v-if="backupStatus" class="panel" style="margin-top:16px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Status</p>
            <h2>操作结果</h2>
          </div>
          <button type="button" class="mini-btn" @click="backupStatus = ''">关闭</button>
        </div>
        <div class="backup-result" v-html="backupStatus"></div>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Security</p>
            <h2>密码保护</h2>
          </div>
        </div>
        <p class="backup-desc">设置密码后，每次打开应用需要输入密码才能访问。留空新密码可清除密码。</p>
        <div class="password-form">
          <input v-model="passwordForm.current" type="password" class="input" placeholder="当前密码（首次设置留空）" />
          <input v-model="passwordForm.newPwd" type="password" class="input" placeholder="新密码（至少4位）" />
          <input v-model="passwordForm.confirm" type="password" class="input" placeholder="确认新密码" @keydown.enter="doSetPassword" />
          <div class="backup-actions">
            <button type="button" class="btn btn-primary" @click="doSetPassword">设置密码</button>
          </div>
          <p v-if="passwordMsg" class="password-msg">{{ passwordMsg }}</p>
        </div>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Tips</p>
            <h2>使用说明</h2>
          </div>
        </div>
        <div class="backup-tips">
          <p><strong>迁移到新设备：</strong></p>
          <ol>
            <li>在旧设备上点击「导出全部数据」，保存 JSON 文件</li>
            <li>将 JSON 文件传到新设备（AirDrop / 微信 / 邮件等）</li>
            <li>在新设备上打开本应用，点击「合并导入」选择文件</li>
          </ol>
          <p><strong>合并 vs 替换：</strong></p>
          <ul>
            <li><strong>合并导入</strong>：保留现有数据，追加备份中的数据</li>
            <li><strong>替换导入</strong>：清空现有数据，完全用备份覆盖（⚠️ 不可逆）</li>
          </ul>
          <p><strong>定期备份：</strong>建议定期导出备份，防止数据丢失。</p>
        </div>
      </section>
    </div>

    <!-- 关于说明 -->
    <div v-if="activeTab === 'about'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">About</p>
          <h1>关于本地知识库</h1>
          <p class="hero-text">一款离线优先的知识管理 PWA，数据完全存储在本地设备上。</p>
        </div>
      </section>

      <section class="about-grid">
        <article class="panel about-card">
          <h3>功能介绍</h3>
          <ul class="about-list">
            <li><strong>知识库</strong> — 导入 Word (.docx) 和 Excel (.xlsx) 文档，支持全文搜索和离线阅读</li>
            <li><strong>个人笔记</strong> — 轻量级笔记管理，支持分类、标签、星标、搜索和数据统计</li>
            <li><strong>备份迁移</strong> — 一键导出/导入全部数据，方便跨设备迁移</li>
            <li><strong>离线使用</strong> — 首次加载后，无需网络即可完整使用所有功能</li>
          </ul>
        </article>

        <article class="panel about-card">
          <h3>快速上手</h3>
          <ol class="about-list">
            <li>用 Safari 打开本应用</li>
            <li>点击底部分享按钮 → <strong>添加到主屏幕</strong></li>
            <li>从主屏幕打开，即可离线使用</li>
            <li>导入文档或新建笔记开始使用</li>
          </ol>
        </article>

        <article class="panel about-card highlight">
          <h3>iPhone iCloud 备份</h3>
          <p>本应用数据存储在设备的 IndexedDB 中，<strong>会随 iCloud 备份自动同步</strong>。</p>
          <h4>确保 iCloud 备份生效：</h4>
          <ol class="about-list">
            <li>打开 <strong>设置 → [你的名字] → iCloud → iCloud 云备份</strong></li>
            <li>确认 <strong>iCloud 云备份</strong> 已开启</li>
            <li>确保 <strong>Safari</strong> 在 iCloud 同步列表中已开启（设置 → iCloud → 使用 iCloud 的 App → Safari）</li>
            <li>连接 WiFi 并充电时会自动备份</li>
          </ol>
          <h4>恢复数据：</h4>
          <ul class="about-list">
            <li><strong>新 iPhone 从 iCloud 恢复备份</strong>时，PWA 数据会自动恢复</li>
            <li>如果自动恢复不完整，可使用<strong>「备份迁移」</strong>功能手动导入</li>
          </ul>
          <div class="about-tip">
            <strong>建议：</strong>除了依赖 iCloud，也定期使用「备份迁移 → 导出」手动备份一份 JSON 文件到 iCloud Drive 或其他云盘，双重保险。
          </div>
        </article>

        <article class="panel about-card">
          <h3>数据存储说明</h3>
          <ul class="about-list">
            <li><strong>存储位置</strong> — 浏览器 IndexedDB（本地设备）</li>
            <li><strong>隐私安全</strong> — 所有数据仅保存在你的设备上，不会上传到任何服务器</li>
            <li><strong>持久化</strong> — 建议在「PWA 诊断」中申请持久化存储，防止浏览器自动清理</li>
            <li><strong>存储限制</strong> — 通常可使用设备可用空间的 50%（Safari）</li>
          </ul>
        </article>

        <article class="panel about-card">
          <h3>常见问题</h3>
          <div class="faq-list">
            <div class="faq-item">
              <strong>Q: 离线打不开怎么办？</strong>
              <p>确保通过 HTTPS 访问，首次加载后刷新一次让 Service Worker 接管。切到「PWA 诊断」页面检查状态。</p>
            </div>
            <div class="faq-item">
              <strong>Q: 换手机后数据怎么迁移？</strong>
              <p>方法一：iCloud 备份恢复（自动）。方法二：在旧手机上导出 JSON，传到新手机导入（手动）。</p>
            </div>
            <div class="faq-item">
              <strong>Q: 支持哪些文件格式？</strong>
              <p>知识库支持 .docx（Word）和 .xlsx（Excel），单文件最大 50MB。</p>
            </div>
            <div class="faq-item">
              <strong>Q: 数据会丢失吗？</strong>
              <p>正常使用不会。但建议申请持久化存储并定期手动备份，以防浏览器极端情况下清理存储。</p>
            </div>
          </div>
        </article>

        <article class="panel about-card">
          <h3>版本信息</h3>
          <table class="about-info-table">
            <tr><td>应用版本</td><td>1.0.0</td></tr>
            <tr><td>技术栈</td><td>Vue 3 + Vite + Dexie (IndexedDB)</td></tr>
            <tr><td>离线支持</td><td>Service Worker + Cache API</td></tr>
            <tr><td>平台兼容</td><td>iOS Safari 16+ / Chrome / Edge</td></tr>
          </table>
        </article>
      </section>
    </div>

    <!-- PWA 诊断面板 -->
    <div v-if="activeTab === 'pwa'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">PWA Diagnostics</p>
          <h1>离线状态诊断</h1>
          <p class="hero-text">检查 Service Worker、缓存和 HTTPS 状态，帮助排查离线问题。</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary" @click="runDiagnostics">重新检测</button>
        </div>
      </section>

      <section class="diag-grid">
        <article class="diag-card" :class="diag.protocol.ok ? 'ok' : 'fail'">
          <div class="diag-icon">{{ diag.protocol.ok ? '✅' : '❌' }}</div>
          <div>
            <strong>协议: {{ diag.protocol.value }}</strong>
            <p>{{ diag.protocol.detail }}</p>
          </div>
        </article>

        <article class="diag-card" :class="diag.swSupport.ok ? 'ok' : 'fail'">
          <div class="diag-icon">{{ diag.swSupport.ok ? '✅' : '❌' }}</div>
          <div>
            <strong>SW 支持</strong>
            <p>{{ diag.swSupport.detail }}</p>
          </div>
        </article>

        <article class="diag-card" :class="diag.swStatus.ok ? 'ok' : 'fail'">
          <div class="diag-icon">{{ diag.swStatus.ok ? '✅' : '❌' }}</div>
          <div>
            <strong>SW 状态: {{ diag.swStatus.value }}</strong>
            <p>{{ diag.swStatus.detail }}</p>
          </div>
        </article>

        <article class="diag-card" :class="diag.cacheStatus.ok ? 'ok' : 'fail'">
          <div class="diag-icon">{{ diag.cacheStatus.ok ? '✅' : '❌' }}</div>
          <div>
            <strong>缓存: {{ diag.cacheStatus.value }}</strong>
            <p>{{ diag.cacheStatus.detail }}</p>
          </div>
        </article>

        <article class="diag-card" :class="diag.persistent.ok ? 'ok' : 'warn'">
          <div class="diag-icon">{{ diag.persistent.ok ? '✅' : '⚠️' }}</div>
          <div>
            <strong>持久化存储</strong>
            <p>{{ diag.persistent.detail }}</p>
          </div>
        </article>

        <article class="diag-card" :class="diag.standalone.ok ? 'ok' : 'warn'">
          <div class="diag-icon">{{ diag.standalone.ok ? '✅' : 'ℹ️' }}</div>
          <div>
            <strong>运行模式</strong>
            <p>{{ diag.standalone.detail }}</p>
          </div>
        </article>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Cache Details</p>
            <h2>已缓存资源</h2>
          </div>
          <span class="pill">{{ diag.cachedUrls.length }} 个</span>
        </div>
        <div v-if="diag.cachedUrls.length === 0" class="empty compact">
          <strong>缓存为空</strong>
          <p>Service Worker 未注册或未完成缓存。</p>
        </div>
        <div v-else class="cache-list">
          <div v-for="url in diag.cachedUrls" :key="url" class="cache-item">{{ url }}</div>
        </div>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Summary</p>
            <h2>诊断结论</h2>
          </div>
        </div>
        <div class="diag-summary" :class="diagSummary.level">
          <strong>{{ diagSummary.title }}</strong>
          <p>{{ diagSummary.message }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx'
import mammoth from 'mammoth/mammoth.browser'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href
import PersonalNotes from './features/notes/PersonalNotes.vue'
import {
  clearKnowledgeDocs,
  getKnowledgeMeta,
  listKnowledgeDocs,
  removeKnowledgeDoc,
  saveKnowledgeDocs,
  setKnowledgeMeta,
  exportAllData,
  importAllData,
  setPassword,
  verifyPassword,
  hasPassword
} from './features/knowledge-base/knowledgeBaseDb.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024

function toSheetRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []))
    : []
}

export default {
  name: 'KnowledgeBaseStandaloneApp',
  components: { PersonalNotes },
  data() {
    return {
      activeTab: 'kb',
      appTabs: [
        { id: 'kb', label: '知识库', icon: '📚' },
        { id: 'notes', label: '个人笔记', icon: '📝' },
        { id: 'backup', label: '备份迁移', icon: '💾' },
        { id: 'about', label: '关于', icon: '📖' },
        { id: 'pwa', label: 'PWA 诊断', icon: '🔧' }
      ],
      backupStatus: '',
      backupBusy: false,
      locked: false,
      lockPassword: '',
      lockError: '',
      passwordForm: { current: '', newPwd: '', confirm: '' },
      passwordMsg: '',
      diag: {
        protocol: { ok: false, value: '', detail: '检测中...' },
        swSupport: { ok: false, detail: '检测中...' },
        swStatus: { ok: false, value: '', detail: '检测中...' },
        cacheStatus: { ok: false, value: '', detail: '检测中...' },
        persistent: { ok: false, detail: '检测中...' },
        standalone: { ok: false, detail: '检测中...' },
        cachedUrls: []
      },
      docs: [],
      listKeyword: '',
      searchKeyword: '',
      typeFilter: 'all',
      activeDocId: null,
      activeSheetName: '',
      readerOpen: false,
      readerProgress: 0,
      readerSearchOpen: false,
      readerSearchKeyword: '',
      readerMatchCount: 0,
      readerMatchIndex: 0,
      importQueue: [],
      storageInfo: {
        persisted: false,
        usageText: '0 B',
        quotaText: '0 B'
      }
    }
  },
  computed: {
    filteredDocs() {
      const keyword = String(this.listKeyword || '').trim().toLowerCase()
      return this.docs.filter((doc) => {
        const typeMatched = this.typeFilter === 'all' || doc.type === this.typeFilter
        if (!typeMatched) return false
        if (!keyword) return true
        return `${doc.name} ${doc.contentText || ''}`.toLowerCase().includes(keyword)
      })
    },
    activeDoc() {
      return this.docs.find((doc) => doc.id === this.activeDocId) || null
    },
    activeSheet() {
      const fallback = { headers: [], rows: [] }
      if (!this.activeDoc || this.activeDoc.type !== 'xlsx') return fallback
      return this.activeDoc.sheets?.find((sheet) => sheet.name === this.activeSheetName) || this.activeDoc.sheets?.[0] || fallback
    },
    searchResults() {
      const keyword = String(this.searchKeyword || '').trim().toLowerCase()
      if (!keyword) return []
      return this.docs
        .map((doc) => {
          const haystack = `${doc.name}\n${doc.contentText || ''}`
          const lower = haystack.toLowerCase()
          const index = lower.indexOf(keyword)
          if (index === -1) return null
          const start = Math.max(0, index - 28)
          const end = Math.min(haystack.length, index + keyword.length + 52)
          return {
            doc,
            index,
            snippet: haystack.slice(start, end).replace(/\s+/g, ' ').trim()
          }
        })
        .filter(Boolean)
    },
    docCounts() {
      return this.docs.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1
        return acc
      }, { docx: 0, xlsx: 0, pdf: 0 })
    },
    diagSummary() {
      const d = this.diag
      if (!d.protocol.ok) {
        return {
          level: 'fail',
          title: '❌ 不支持离线：需要 HTTPS',
          message: `当前通过 ${d.protocol.value} 访问，Service Worker 要求 HTTPS 或 localhost。请部署到 HTTPS 服务器，或通过 localhost 访问。`
        }
      }
      if (!d.swSupport.ok) {
        return { level: 'fail', title: '❌ 浏览器不支持 Service Worker', message: '请使用 Safari 14+ 或 Chrome。' }
      }
      if (!d.swStatus.ok) {
        return { level: 'fail', title: '❌ Service Worker 未激活', message: '请刷新页面等待 SW 安装完成，然后再测试离线。' }
      }
      if (!d.cacheStatus.ok) {
        return { level: 'fail', title: '❌ 缓存不完整', message: '关键资源未缓存。请联网刷新页面，等待 SW 重新缓存。' }
      }
      return { level: 'ok', title: '✅ 离线就绪！', message: '所有资源已缓存，可以安全开启飞行模式使用。' }
    }
  },
  async mounted() {
    // 检查是否设置了密码
    const hasPwd = await hasPassword()
    if (hasPwd) {
      this.locked = true
      return
    }
    await this.initApp()
  },
  methods: {
    async initApp() {
      await this.reloadDocs()
      await this.refreshStorageInfo()
      this.runDiagnostics()
    },
    async doUnlock() {
      this.lockError = ''
      if (!this.lockPassword) {
        this.lockError = '请输入密码'
        return
      }
      const ok = await verifyPassword(this.lockPassword)
      if (ok) {
        this.locked = false
        this.lockPassword = ''
        await this.initApp()
      } else {
        this.lockError = '密码错误'
      }
    },
    async doSetPassword() {
      this.passwordMsg = ''
      const { current, newPwd, confirm } = this.passwordForm
      // 如果已有密码，需要验证当前密码
      const hasPwd = await hasPassword()
      if (hasPwd) {
        const ok = await verifyPassword(current)
        if (!ok) { this.passwordMsg = '❌ 当前密码错误'; return }
      }
      if (!newPwd && !hasPwd) { this.passwordMsg = '❌ 请输入新密码'; return }
      if (newPwd && newPwd !== confirm) { this.passwordMsg = '❌ 两次密码不一致'; return }
      if (newPwd && newPwd.length < 4) { this.passwordMsg = '❌ 密码至少4位'; return }
      await setPassword(newPwd || null)
      this.passwordForm = { current: '', newPwd: '', confirm: '' }
      this.passwordMsg = newPwd ? '✅ 密码已设置' : '✅ 密码已清除'
    },
    async shareDoc(doc) {
      let content = ''
      let filename = doc.name

      if (doc.type === 'docx') {
        content = doc.contentText || ''
        filename = doc.name.replace(/\.docx$/i, '') + '.txt'
      } else {
        // Excel: 导出为 CSV 格式
        const sheets = doc.sheets || []
        content = sheets.map(sheet => {
          const header = (sheet.headers || []).join(',')
          const rows = (sheet.rows || []).map(r => r.join(',')).join('\n')
          return `[${sheet.name}]\n${header}\n${rows}`
        }).join('\n\n')
        filename = doc.name.replace(/\.xlsx$/i, '') + '.csv'
      }

      // 优先文件分享
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([content], filename, { type: 'text/plain' })
          const shareData = { title: doc.name, files: [file] }
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData)
            return
          }
        } catch (_) {}
        try {
          await navigator.share({ title: doc.name, text: content.slice(0, 2000) })
          return
        } catch (err) {
          if (err.name !== 'AbortError') console.error('[share]', err)
          return
        }
      }
      // 回退到剪贴板
      try {
        await navigator.clipboard.writeText(content)
        alert('内容已复制到剪贴板')
      } catch (_) {
        alert('当前浏览器不支持分享功能')
      }
    },
    async reloadDocs() {
      this.docs = await listKnowledgeDocs()
      if (!this.docs.length) {
        this.activeDocId = null
        this.activeSheetName = ''
      }
    },
    syncActiveSheet() {
      if (this.activeDoc?.type === 'xlsx') {
        this.activeSheetName = this.activeDoc.sheets?.[0]?.name || ''
      } else {
        this.activeSheetName = ''
      }
    },
    openFilePicker() {
      this.$refs.fileInput?.click()
    },
    async onFileChange(event) {
      const files = Array.from(event?.target?.files || [])
      event.target.value = ''
      if (!files.length) return
      await this.importFiles(files)
    },
    async importFiles(files) {
      const queuedItems = files.map((file, index) => ({
        key: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        status: '等待中',
        state: 'idle',
        detail: this.formatBytes(file.size)
      }))
      this.importQueue = [...queuedItems, ...this.importQueue].slice(0, 20)

      const importedDocs = []
      for (const file of files) {
        const queueItem = this.importQueue.find((item) => item.key.startsWith(`${file.name}-${file.lastModified}`))
        if (queueItem) {
          queueItem.status = '解析中'
          queueItem.state = 'loading'
          queueItem.detail = `${this.formatBytes(file.size)} · 正在读取`
        }
        try {
          if (file.size > MAX_FILE_SIZE) {
            throw new Error('文件超过 50 MB 限制')
          }
          const doc = await this.parseFile(file)
          importedDocs.push(doc)
          if (queueItem) {
            queueItem.status = '成功'
            queueItem.state = 'done'
            queueItem.detail = `${doc.type.toUpperCase()} · 已写入本地数据库`
          }
        } catch (error) {
          if (queueItem) {
            queueItem.status = '失败'
            queueItem.state = 'error'
            queueItem.detail = error?.message || '解析失败'
          }
        }
      }

      if (importedDocs.length) {
        await saveKnowledgeDocs(importedDocs)
        await this.reloadDocs()
        await this.refreshStorageInfo()
      }
    },
    async parseFile(file) {
      const lowerName = String(file.name || '').toLowerCase()
      if (lowerName.endsWith('.docx')) return this.parseDocx(file)
      if (lowerName.endsWith('.xlsx')) return this.parseXlsx(file)
      if (lowerName.endsWith('.pdf')) return this.parsePdf(file)
      throw new Error('仅支持 .docx、.xlsx 和 .pdf')
    },
    async parseDocx(file) {
      const arrayBuffer = await file.arrayBuffer()
      const [{ value: htmlResult, messages }, { value: textResult }] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }),
        mammoth.extractRawText({ arrayBuffer })
      ])
      return {
        name: file.name,
        type: 'docx',
        size: file.size,
        contentHtml: htmlResult || '<p>文档为空</p>',
        contentText: String(textResult || '').trim(),
        sheets: [],
        parseWarnings: Array.isArray(messages) ? messages.map((item) => item.message).filter(Boolean) : []
      }
    },
    async parseXlsx(file) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheets = workbook.SheetNames.map((name) => {
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          raw: false,
          defval: ''
        })
        const rows = toSheetRows(rawRows)
        const [headers = [], ...bodyRows] = rows
        return { name, headers, rows: bodyRows }
      })
      const contentText = sheets.map((sheet) => [sheet.name, ...sheet.headers, ...sheet.rows.flat()].join(' ')).join('\n')
      return {
        name: file.name,
        type: 'xlsx',
        size: file.size,
        contentHtml: '',
        contentText,
        sheets,
        parseWarnings: []
      }
    },
    async parsePdf(file) {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pages = []
      const textParts = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const lines = []
        let lastY = null

        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            lines.push('<br/>')
          }
          lines.push(this.escapeHtml(item.str))
          lastY = item.transform[5]
        }

        const pageText = textContent.items.map(item => item.str).join(' ')
        textParts.push(pageText)
        pages.push(`<div class="pdf-page"><div class="pdf-page-num">第 ${i} 页 / 共 ${pdf.numPages} 页</div>${lines.join(' ')}</div>`)
      }

      return {
        name: file.name,
        type: 'pdf',
        size: file.size,
        contentHtml: pages.join('<hr class="pdf-page-break"/>'),
        contentText: textParts.join('\n'),
        sheets: [],
        parseWarnings: pdf.numPages > 50 ? [`文档共 ${pdf.numPages} 页，加载较慢`] : []
      }
    },
    escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },
    async openDoc(doc) {
      this.activeDocId = doc.id
      this.syncActiveSheet()
      this.readerOpen = true
      await setKnowledgeMeta('lastOpenedDocId', doc.id)
    },
    closeReader() {
      this.readerOpen = false
      this.clearReaderSearch()
      this.readerProgress = 0
    },
    onReaderScroll() {
      const el = this.$refs.readerBody
      if (!el) return
      const { scrollTop, scrollHeight, clientHeight } = el
      this.readerProgress = scrollHeight > clientHeight
        ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        : 0
    },
    scrollReaderTop() {
      this.$refs.readerBody?.scrollTo({ top: 0, behavior: 'smooth' })
    },
    toggleReaderSearch() {
      this.readerSearchOpen = !this.readerSearchOpen
      if (this.readerSearchOpen) {
        this.$nextTick(() => this.$refs.readerSearchInput?.focus())
      } else {
        this.clearReaderSearch()
      }
    },
    doReaderSearch() {
      // 先清除旧高亮
      this._clearHighlights()

      if (!this.readerSearchKeyword || !this.$refs.readerBody) {
        this.readerMatchCount = 0
        this.readerMatchIndex = 0
        return
      }

      const container = this.$refs.readerBody
      const kw = this.readerSearchKeyword.toLowerCase()
      const marks = []

      // 遍历所有文本节点
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
      const textNodes = []
      while (walker.nextNode()) textNodes.push(walker.currentNode)

      for (const node of textNodes) {
        const text = node.nodeValue
        const lower = text.toLowerCase()
        let pos = 0
        const fragments = []
        let idx

        while ((idx = lower.indexOf(kw, pos)) !== -1) {
          if (idx > pos) fragments.push(document.createTextNode(text.slice(pos, idx)))
          const mark = document.createElement('mark')
          mark.className = 'reader-highlight'
          mark.textContent = text.slice(idx, idx + kw.length)
          marks.push(mark)
          fragments.push(mark)
          pos = idx + kw.length
        }

        if (fragments.length) {
          if (pos < text.length) fragments.push(document.createTextNode(text.slice(pos)))
          const parent = node.parentNode
          for (const frag of fragments) parent.insertBefore(frag, node)
          parent.removeChild(node)
        }
      }

      this.readerMatchCount = marks.length
      this.readerMatchIndex = marks.length > 0 ? 0 : -1
      this._readerMarks = marks
      this._updateActiveHighlight()
    },
    jumpToMatch(direction) {
      if (!this.readerMatchCount) return
      this.readerMatchIndex = (this.readerMatchIndex + direction + this.readerMatchCount) % this.readerMatchCount
      this._updateActiveHighlight()
    },
    _updateActiveHighlight() {
      const marks = this._readerMarks || []
      marks.forEach((m, i) => {
        m.className = i === this.readerMatchIndex ? 'reader-highlight active' : 'reader-highlight'
      })
      if (marks[this.readerMatchIndex]) {
        marks[this.readerMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
    _clearHighlights() {
      const container = this.$refs.readerBody
      if (!container) return
      const marks = container.querySelectorAll('mark.reader-highlight')
      marks.forEach(mark => {
        const parent = mark.parentNode
        parent.replaceChild(document.createTextNode(mark.textContent), mark)
        parent.normalize()
      })
      this._readerMarks = []
    },
    clearReaderSearch() {
      this._clearHighlights()
      this.readerSearchKeyword = ''
      this.readerSearchOpen = false
      this.readerMatchCount = 0
      this.readerMatchIndex = 0
    },
    async openSearchResult(result) {
      await this.openDoc(result.doc)
    },
    async deleteDoc(doc) {
      const confirmed = window.confirm(`确定删除文档”${doc.name}”吗？`)
      if (!confirmed) return
      this.readerOpen = false
      await removeKnowledgeDoc(doc.id)
      await this.reloadDocs()
      await this.refreshStorageInfo()
    },
    async clearAllDocs() {
      const confirmed = window.confirm('确定清空全部知识库文档吗？该操作不可撤销。')
      if (!confirmed) return
      await clearKnowledgeDocs()
      await setKnowledgeMeta('lastOpenedDocId', null)
      this.importQueue = []
      await this.reloadDocs()
      await this.refreshStorageInfo()
    },
    async requestPersistentStorage() {
      if (!navigator?.storage?.persist) {
        alert('当前浏览器不支持持久化存储 API')
        return
      }
      const granted = await navigator.storage.persist()
      await this.refreshStorageInfo()
      if (granted) {
        alert('✅ 持久化已开启！浏览器不会自动清除你的数据。')
      } else {
        alert('⚠️ 浏览器拒绝了持久化请求。\n\n提示：将此应用「添加到主屏幕」安装为 PWA 后再试，或在浏览器设置中允许本站存储。')
      }
    },
    async refreshStorageInfo() {
      const next = {
        persisted: false,
        usageText: '未知',
        quotaText: '未知'
      }
      if (navigator?.storage?.persisted) {
        next.persisted = await navigator.storage.persisted()
      }
      if (navigator?.storage?.estimate) {
        const estimate = await navigator.storage.estimate()
        next.usageText = this.formatBytes(estimate?.usage || 0)
        next.quotaText = this.formatBytes(estimate?.quota || 0)
      }
      this.storageInfo = next
    },
    getDocPreview(doc) {
      const source = String(doc?.contentText || '').replace(/\s+/g, ' ').trim()
      return source ? `${source.slice(0, 88)}${source.length > 88 ? '...' : ''}` : '暂无预览'
    },
    formatBytes(value) {
      const size = Number(value || 0)
      if (!Number.isFinite(size) || size <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      const level = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)))
      const amount = size / (1024 ** level)
      return `${amount.toFixed(amount >= 10 || level === 0 ? 0 : 1)} ${units[level]}`
    },
    formatDate(value) {
      if (!value) return '未知时间'
      return new Date(value).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatCell(cell) {
      const text = cell == null ? '' : String(cell)
      return text.length > 60 ? `${text.slice(0, 60)}...` : text
    },
    async doBackup() {
      this.backupBusy = true
      this.backupStatus = ''
      try {
        const data = await exportAllData()
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const date = new Date().toISOString().slice(0, 10)
        a.href = url
        a.download = `knowledge-base-backup-${date}.json`
        a.click()
        URL.revokeObjectURL(url)
        this.backupStatus = `✅ 导出成功！<br>文档: ${data.stats.docs} 篇<br>笔记: ${data.stats.notes} 条<br>分类: ${data.stats.categories} 个<br>文件大小: ${this.formatBytes(json.length)}`
      } catch (err) {
        this.backupStatus = `❌ 导出失败: ${err.message}`
      } finally {
        this.backupBusy = false
      }
    },
    doRestoreReplace() {
      if (!confirm('⚠️ 替换导入会清空现有所有数据，确定继续吗？')) return
      this.$refs.backupReplaceInput?.click()
    },
    async onBackupFileChange(event, mode) {
      const file = event?.target?.files?.[0]
      event.target.value = ''
      if (!file) return

      this.backupBusy = true
      this.backupStatus = ''
      try {
        const text = await file.text()
        const backup = JSON.parse(text)

        if (!backup.data) throw new Error('文件格式不正确，缺少 data 字段')

        const result = await importAllData(backup, mode)
        await this.reloadDocs()
        await this.refreshStorageInfo()

        const modeText = mode === 'replace' ? '替换' : '合并'
        this.backupStatus = `✅ ${modeText}导入成功！<br>文档: ${result.docs} 篇<br>笔记: ${result.notes} 条<br>分类: ${result.categories} 个<br>备份时间: ${backup.exportedAt || '未知'}`
      } catch (err) {
        this.backupStatus = `❌ 导入失败: ${err.message}`
      } finally {
        this.backupBusy = false
      }
    },
    async runDiagnostics() {
      const d = this.diag

      // 1. 协议检测
      const proto = location.protocol
      const isSecure = proto === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      d.protocol = {
        ok: isSecure,
        value: proto.replace(':', ''),
        detail: isSecure
          ? 'HTTPS 或 localhost，Service Worker 可正常工作'
          : `当前 ${proto}//${location.host}，SW 要求 HTTPS 或 localhost`
      }

      // 2. SW 支持
      d.swSupport = {
        ok: 'serviceWorker' in navigator,
        detail: 'serviceWorker' in navigator ? '浏览器支持 Service Worker' : '浏览器不支持 Service Worker'
      }

      // 3. SW 状态
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            const sw = reg.active || reg.waiting || reg.installing
            const state = sw ? sw.state : '无'
            const isActive = !!(reg.active)
            d.swStatus = {
              ok: isActive,
              value: state,
              detail: isActive
                ? `SW 已激活，scope: ${reg.scope}`
                : `SW 状态: ${state}。等待激活中...`
            }
          } else {
            d.swStatus = { ok: false, value: '未注册', detail: isSecure ? 'SW 未注册，请刷新页面' : '因 HTTP 协议，SW 无法注册' }
          }
        } catch (err) {
          d.swStatus = { ok: false, value: '错误', detail: err.message }
        }
      } else {
        d.swStatus = { ok: false, value: '不支持', detail: '浏览器不支持' }
      }

      // 4. 缓存检测
      try {
        const keys = await caches.keys()
        const allUrls = []
        let hasHtml = false
        let hasJs = false
        let hasCss = false
        for (const key of keys) {
          const cache = await caches.open(key)
          const requests = await cache.keys()
          for (const req of requests) {
            const short = req.url.replace(location.origin, '')
            allUrls.push(`[${key.replace('knowledge-base-', '')}] ${short}`)
            if (short.includes('index.html') || short.endsWith('/')) hasHtml = true
            if (short.endsWith('.js')) hasJs = true
            if (short.endsWith('.css')) hasCss = true
          }
        }
        const complete = hasHtml && hasJs && hasCss
        d.cacheStatus = {
          ok: complete,
          value: complete ? `${allUrls.length} 个资源` : '不完整',
          detail: complete
            ? `HTML=${hasHtml ? '✓' : '✗'} JS=${hasJs ? '✓' : '✗'} CSS=${hasCss ? '✓' : '✗'}，共 ${allUrls.length} 个`
            : `缺少关键资源 HTML=${hasHtml ? '✓' : '✗'} JS=${hasJs ? '✓' : '✗'} CSS=${hasCss ? '✓' : '✗'}`
        }
        d.cachedUrls = allUrls
      } catch (err) {
        d.cacheStatus = { ok: false, value: '错误', detail: err.message }
        d.cachedUrls = []
      }

      // 5. 持久化
      if (navigator?.storage?.persisted) {
        const persisted = await navigator.storage.persisted()
        d.persistent = {
          ok: persisted,
          detail: persisted ? '已持久化，浏览器不会自动清除数据' : '未持久化，数据可能被浏览器清除。建议点击"申请持久化"'
        }
      } else {
        d.persistent = { ok: false, detail: '不支持 StorageManager API' }
      }

      // 6. 独立模式
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      d.standalone = {
        ok: isStandalone,
        detail: isStandalone ? '已从主屏幕启动（独立模式）' : '在浏览器中运行。建议"添加到主屏幕"获得最佳离线体验'
      }
    }
  }
}
</script>
