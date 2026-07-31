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

    <!-- 底部导航 -->
    <nav v-if="!locked" class="app-nav">
      <button type="button" class="nav-tab" :class="{ active: activeTab === 'kb' }" @click="activeTab = 'kb'">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        <span class="nav-label">文档</span>
      </button>
      <button type="button" class="nav-tab" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span class="nav-label">笔记</span>
      </button>
      <button type="button" class="nav-tab" :class="{ active: activeTab === 'backup' }" @click="activeTab = 'backup'">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span class="nav-label">备份</span>
        <span v-if="backupOverdue" class="nav-badge"></span>
      </button>
      <button type="button" class="nav-tab" :class="{ active: isMoreTabActive }" @click="toggleMoreMenu">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
        <span class="nav-label">更多</span>
        <span v-if="swUpdateAvailable" class="nav-badge"></span>
      </button>
    </nav>

    <!-- 更多菜单弹出层 -->
    <transition name="sheet">
      <div v-if="moreMenuOpen" class="sheet-overlay" @click.self="moreMenuOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-menu">
            <button v-if="swUpdateAvailable" type="button" class="sheet-item sheet-item-update" @click="applySwUpdate">
              <span class="sheet-item-icon">🆕</span>
              <div class="sheet-item-body">
                <strong>新版本可用</strong>
                <p>点击立即更新并刷新页面</p>
              </div>
              <span class="sheet-update-badge">UPDATE</span>
            </button>
            <button v-else type="button" class="sheet-item" @click="checkSwUpdate">
              <span class="sheet-item-icon">🔄</span>
              <div class="sheet-item-body">
                <strong>检查更新</strong>
                <p>{{ swCheckMsg || '当前已是最新版本' }}</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" @click="toggleTheme">
              <span class="sheet-item-icon">{{ darkMode ? '☀️' : '🌙' }}</span>
              <div class="sheet-item-body">
                <strong>{{ darkMode ? '浅色模式' : '深色模式' }}</strong>
                <p>切换应用主题外观</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" :class="{ active: activeTab === 'surge' }" @click="goTab('surge')">
              <span class="sheet-item-icon">⚡</span>
              <div class="sheet-item-body">
                <strong>Surge 配置</strong>
                <p>快速生成代理配置文件 & 概念速查</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" :class="{ active: activeTab === 'ai' }" @click="goTab('ai'); loadAiPanel()">
              <span class="sheet-item-icon">🤖</span>
              <div class="sheet-item-body">
                <strong>AI 语义搜索</strong>
                <p>按含义搜索文档，而不只是关键词</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" :class="{ active: activeTab === 'about' }" @click="goTab('about')">
              <span class="sheet-item-icon">📖</span>
              <div class="sheet-item-body">
                <strong>关于</strong>
                <p>功能介绍、iCloud 备份指南、常见问题</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" :class="{ active: activeTab === 'pwa' }" @click="goTab('pwa')">
              <span class="sheet-item-icon">🩺</span>
              <div class="sheet-item-body">
                <strong>离线诊断</strong>
                <p>检测 SW、缓存、HTTPS 状态</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" @click="goTab('trash')">
              <span class="sheet-item-icon">🗑️</span>
              <div class="sheet-item-body">
                <strong>回收站</strong>
                <p>{{ trashDocs.length }} 个已删除文档</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
            <button type="button" class="sheet-item" @click="goTab('backup')">
              <span class="sheet-item-icon">🔒</span>
              <div class="sheet-item-body">
                <strong>密码与安全</strong>
                <p>设置应用锁屏密码</p>
              </div>
              <span class="sheet-arrow">›</span>
            </button>
          </div>
          <button type="button" class="sheet-cancel" @click="moreMenuOpen = false">取消</button>
        </div>
      </div>
    </transition>

    <!-- 文件夹管理面板 -->
    <transition name="sheet">
      <div v-if="folderPanelOpen" class="sheet-overlay" @click.self="folderPanelOpen = false">
        <div class="sheet-panel" style="max-height:70vh">
          <div class="sheet-handle"></div>
          <h3 style="margin:0 0 12px;font-size:17px">文件夹管理</h3>

          <!-- 新建文件夹 -->
          <div class="folder-create-bar">
            <input v-model.trim="folderNewName" class="input" placeholder="新建文件夹名称" @keydown.enter="doCreateFolder" />
            <button type="button" class="btn btn-primary" @click="doCreateFolder" :disabled="!folderNewName">创建</button>
          </div>

          <div v-if="!folders.length" class="empty compact" style="padding:16px">
            <strong>暂无文件夹</strong>
            <p>输入名称创建第一个文件夹。</p>
          </div>

          <div v-else class="folder-manage-list">
            <div v-for="f in folders" :key="f.id" class="folder-manage-item">
              <span class="folder-dot" :style="{ background: f.color }"></span>
              <template v-if="folderEditId === f.id">
                <input v-model.trim="folderEditName" class="input" style="flex:1" @keydown.enter="doRenameFolder(f)" @keydown.esc="folderEditId = null" />
                <button type="button" class="mini-btn" @click="doRenameFolder(f)">✓</button>
                <button type="button" class="mini-btn" @click="folderEditId = null">✕</button>
              </template>
              <template v-else>
                <span class="folder-manage-name">{{ f.name }}</span>
                <span class="folder-manage-count">{{ docs.filter(d => d.folderId === f.id).length }}</span>
                <button type="button" class="mini-btn" @click="folderEditId = f.id; folderEditName = f.name" title="重命名">✏️</button>
                <button type="button" class="mini-btn danger" @click="doDeleteFolder(f)" title="删除">🗑</button>
              </template>
            </div>
          </div>

          <button type="button" class="btn" style="width:100%;margin-top:12px" @click="folderPanelOpen = false">关闭</button>
        </div>
      </div>
    </transition>

    <!-- 移动到文件夹弹窗 -->
    <transition name="fade">
      <div v-if="moveDocTarget" class="sheet-overlay" @click.self="moveDocTarget = null" style="z-index:7000">
        <div class="move-folder-popup">
          <h3 style="margin:0 0 8px;font-size:15px">移动「{{ moveDocTarget.name }}」到</h3>
          <button type="button" class="folder-move-item" @click="doMoveDoc(0)">
            <span>📄</span> 未分类（根目录）
          </button>
          <button v-for="f in folders" :key="f.id" type="button" class="folder-move-item" @click="doMoveDoc(f.id)">
            <span class="folder-dot" :style="{ background: f.color }"></span> {{ f.name }}
          </button>
          <button type="button" class="btn" style="width:100%;margin-top:8px" @click="moveDocTarget = null">取消</button>
        </div>
      </div>
    </transition>

    <!-- 全局搜索浮动按钮 -->
    <button v-if="!locked && !readerOpen && !globalSearchOpen && activeTab !== 'ai'" type="button" class="global-search-fab" @click="openGlobalSearch">🔍</button>

    <!-- 全局搜索面板 -->
    <transition name="sheet">
      <div v-if="globalSearchOpen" class="global-search-overlay" @click.self="globalSearchOpen = false">
        <div class="global-search-panel">
          <div class="global-search-header">
            <input
              ref="globalSearchInput"
              v-model.trim="globalSearchKeyword"
              class="input global-search-input"
              placeholder="搜索文档和笔记..."
              @input="doGlobalSearch"
            />
            <button type="button" class="mini-btn" @click="globalSearchOpen = false">取消</button>
          </div>
          <div class="global-search-results">
            <div v-if="globalSearchKeyword && globalSearchResults.length === 0" class="empty compact">
              <strong>没有匹配结果</strong>
            </div>
            <button
              v-for="(r, i) in globalSearchResults"
              :key="i"
              type="button"
              class="search-item"
              @click="openGlobalResult(r)"
            >
              <div class="doc-icon" :class="r.source" style="width:28px;height:28px;font-size:12px;flex-shrink:0">{{ r.icon }}</div>
              <div>
                <strong>{{ r.title }}</strong>
                <p>{{ r.snippet }}</p>
              </div>
              <span class="search-item-tag">{{ r.tag }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <div v-if="activeTab === 'kb'" class="kb-scroll-area">
    <!-- 仪表盘 -->
    <section class="dashboard panel">
      <div class="dashboard-header">
        <div>
          <h2 class="dashboard-greeting">{{ greetingText }}</h2>
          <p class="dashboard-sub">共 {{ docs.length }} 篇文档 · {{ docs.filter(d=>d.starred).length }} 收藏 · 今日阅读 {{ readingStatsDisplay }}</p>
        </div>
        <div class="dashboard-actions">
          <button type="button" class="btn btn-primary" @click="openFilePicker">导入文档</button>
          <button type="button" class="btn" @click="requestPersistentStorage">{{ storageInfo.persisted ? '✅ 已持久化' : '申请持久化' }}</button>
        </div>
      </div>
      <div class="dashboard-cards">
        <div class="dash-card" v-for="t in [
          { label: 'Word', count: docCounts.docx, cls: 'docx' },
          { label: 'Excel', count: docCounts.xlsx, cls: 'xlsx' },
          { label: 'PDF', count: docCounts.pdf, cls: 'pdf' },
          { label: 'HTML', count: docCounts.html, cls: 'html' },
          { label: 'MD', count: docCounts.md, cls: 'md' },
          { label: 'TXT', count: docCounts.txt, cls: 'txt' }
        ]" :key="t.cls" @click="typeFilter = t.cls">
          <div class="dash-card-icon" :class="t.cls">{{ t.count }}</div>
          <span>{{ t.label }}</span>
        </div>
      </div>
      <!-- 阅读打卡热力图 -->
      <div class="heatmap-wrap">
        <div class="section-head" style="margin-bottom:8px">
          <div>
            <p class="eyebrow">Streak</p>
            <h2>阅读打卡</h2>
          </div>
        </div>
        <div class="heatmap-grid">
          <div v-for="(week, wi) in heatmapWeeks" :key="wi" class="heatmap-week">
            <div
              v-for="(day, di) in week"
              :key="di"
              class="heatmap-cell"
              :class="day ? `level-${heatmapLevel(day.minutes)}` : 'empty-cell'"
              :title="day ? `${day.key}：${day.minutes} 分钟` : ''"
            ></div>
          </div>
        </div>
        <div class="heatmap-legend">
          <span>少</span>
          <span class="heatmap-cell level-0"></span>
          <span class="heatmap-cell level-1"></span>
          <span class="heatmap-cell level-2"></span>
          <span class="heatmap-cell level-3"></span>
          <span class="heatmap-cell level-4"></span>
          <span>多</span>
        </div>
      </div>

      <!-- 一键继续 -->
      <div v-if="lastReadDoc" class="continue-reading" @click="openDoc(lastReadDoc)">
        <div class="continue-icon">📖</div>
        <div class="continue-info">
          <strong>继续阅读</strong>
          <span>{{ lastReadDoc.name }}</span>
        </div>
        <div class="continue-progress">
          <div class="continue-bar"><div class="continue-fill" :style="{ width: (bookmarks[lastReadDoc.id]?.progress || 0) + '%' }"></div></div>
          <span>{{ bookmarks[lastReadDoc.id]?.progress || 0 }}%</span>
        </div>
      </div>

      <div v-if="recentDocs.length" class="dashboard-recent">
        <p class="eyebrow">最近阅读</p>
        <div class="recent-list">
          <button v-for="doc in recentDocs" :key="doc.id" type="button" class="recent-item" @click="openDoc(doc)">
            <div class="doc-icon" :class="doc.type" style="width:28px;height:28px;font-size:11px">{{ { docx: 'W', xlsx: 'X', pdf: 'P', html: 'H', md: 'M', txt: 'T' }[doc.type] || '?' }}</div>
            <div class="recent-meta">
              <strong>{{ doc.name }}</strong>
              <span>{{ formatTimeAgo(bookmarks[doc.id]?.updatedAt) }} · {{ bookmarks[doc.id]?.progress || 0 }}%</span>
            </div>
            <div class="recent-progress-mini">
              <div class="continue-bar"><div class="continue-fill" :style="{ width: (bookmarks[doc.id]?.progress || 0) + '%' }"></div></div>
            </div>
          </button>
        </div>
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
          <option value="html">HTML</option>
          <option value="md">Markdown</option>
        </select>
        <button type="button" class="btn" :class="{ 'btn-active': typeFilter === 'starred' }" @click="typeFilter = typeFilter === 'starred' ? 'all' : 'starred'">★ 收藏</button>
        <button type="button" class="btn" @click="reloadDocs">刷新</button>
      </div>
    </section>

    <!-- 统计卡片已整合到仪表盘 -->

    <section class="layout">
      <aside class="panel sidebar">
        <div class="section-head">
          <div>
            <p class="eyebrow">Documents</p>
            <h2>文档列表</h2>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span class="pill">{{ filteredDocs.length }}</span>
            <button type="button" class="mini-btn" @click="folderPanelOpen = true" title="管理文件夹">📁</button>
          </div>
        </div>

        <!-- 文件夹快速筛选 -->
        <div v-if="folders.length" class="folder-chips">
          <button type="button" class="folder-chip" :class="{ active: activeFolderId === null }" @click="activeFolderId = null">全部</button>
          <button type="button" class="folder-chip" :class="{ active: activeFolderId === 0 }" @click="activeFolderId = activeFolderId === 0 ? null : 0">未分类</button>
          <button
            v-for="f in folders" :key="f.id"
            type="button"
            class="folder-chip"
            :class="{ active: activeFolderId === f.id }"
            :style="{ '--fc': f.color }"
            @click="activeFolderId = activeFolderId === f.id ? null : f.id"
          >
            <span class="folder-dot" :style="{ background: f.color }"></span>{{ f.name }}
          </button>
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
            <div class="doc-icon" :class="doc.type">{{ { docx: 'W', xlsx: 'X', pdf: 'P', html: 'H', md: 'M', txt: 'T' }[doc.type] || '?' }}</div>
            <div class="doc-meta">
              <strong><span v-if="doc.starred" class="star-mark">★</span>{{ doc.name }}<span v-if="bookmarks[doc.id]" class="bookmark-badge" :title="'已读 ' + bookmarks[doc.id].progress + '%'">🔖{{ bookmarks[doc.id].progress }}%</span></strong>
              <p>{{ getDocPreview(doc) }}</p>
              <span>{{ doc.type.toUpperCase() }} · {{ formatBytes(doc.size) }}<template v-if="getDocFolder(doc)"> · 📁{{ getDocFolder(doc).name }}</template></span>
            </div>
            <button v-if="folders.length" type="button" class="doc-move-btn" @click.stop="moveDocTarget = doc" title="移动到文件夹">📁</button>
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
        <button type="button" class="reader-back" @click="closeReader">← 返回</button>
        <div class="reader-title">{{ activeDoc.name }}</div>
        <button type="button" class="reader-search-toggle" @click="toggleReaderSearch">🔍</button>
        <button type="button" class="mini-btn" :class="{ 'btn-active': editMode }" @click="toggleEditMode" title="编辑">✏️</button>
        <div class="reader-menu-wrap">
          <button type="button" class="mini-btn" @click="readerMenuOpen = !readerMenuOpen" title="更多操作">⋯</button>
          <transition name="fade">
            <div v-if="readerMenuOpen" class="reader-menu-overlay" @click.self="readerMenuOpen = false">
              <div class="reader-menu">
                <button type="button" class="reader-menu-item" @click="toggleStar(activeDoc); readerMenuOpen = false">
                  <span>{{ activeDoc.starred ? '★' : '☆' }}</span>{{ activeDoc.starred ? '取消收藏' : '收藏' }}
                </button>
                <button type="button" class="reader-menu-item" @click="changeFontSize(-1)">
                  <span>A-</span>缩小字体
                </button>
                <button type="button" class="reader-menu-item" @click="changeFontSize(1)">
                  <span>A+</span>放大字体
                </button>
                <button type="button" class="reader-menu-item" @click="saveBookmark(); readerMenuOpen = false">
                  <span>🔖</span>保存书签
                </button>
                <button type="button" class="reader-menu-item" @click="openVersionPanel(); readerMenuOpen = false">
                  <span>⏱</span>版本历史
                </button>
                <button type="button" class="reader-menu-item" @click="openLinkedNotesPanel">
                  <span>🔗</span>关联笔记{{ linkedNotes.length ? `（${linkedNotes.length}）` : '' }}
                </button>
                <div class="reader-menu-divider"></div>
                <button type="button" class="reader-menu-item" @click="toggleTTS(); readerMenuOpen = false">
                  <span>{{ ttsPlaying ? '⏸' : '🔊' }}</span>{{ ttsPlaying ? '停止朗读' : '全文朗读' }}
                </button>
                <div v-if="ttsPlaying" class="reader-menu-item tts-rate-row" @click.stop>
                  <span>🐢</span>
                  <input type="range" min="0.5" max="2.5" step="0.1" v-model.number="ttsRate" class="tts-slider" @input="updateTTSRate" />
                  <span style="font-size:12px;min-width:32px">{{ ttsRate }}x</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 文章导航栏 -->
      <div class="reader-nav-bar">
        <button type="button" class="reader-nav-btn" :disabled="!prevDoc" @click="goDoc(prevDoc)">
          ‹ 上一篇
        </button>
        <span class="reader-nav-pos">{{ readerDocIndex + 1 }} / {{ filteredDocs.length }}</span>
        <button type="button" class="reader-nav-btn" :disabled="!nextDoc" @click="goDoc(nextDoc)">
          下一篇 ›
        </button>
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

      <!-- 编辑模式工具栏 -->
      <div v-if="editMode" class="editor-toolbar">
        <template v-if="['docx','pdf'].includes(activeDoc.type)">
          <button type="button" class="mini-btn" @click="execFormat('bold')" title="加粗"><b>B</b></button>
          <button type="button" class="mini-btn" @click="execFormat('italic')" title="斜体"><i>I</i></button>
          <button type="button" class="mini-btn" @click="execFormat('underline')" title="下划线"><u>U</u></button>
          <span class="toolbar-sep"></span>
          <button type="button" class="mini-btn" @click="execFormat('insertUnorderedList')" title="无序列表">• 列表</button>
          <button type="button" class="mini-btn" @click="execFormat('insertOrderedList')" title="有序列表">1. 列表</button>
          <span class="toolbar-sep"></span>
          <select class="editor-heading-select" @change="execFormat('formatBlock', $event.target.value); $event.target.value = ''">
            <option value="">标题</option>
            <option value="H1">H1</option>
            <option value="H2">H2</option>
            <option value="H3">H3</option>
            <option value="P">正文</option>
          </select>
        </template>
        <span class="toolbar-spacer"></span>
        <button type="button" class="btn btn-sm" @click="cancelEdit">取消</button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="editSaving" @click="saveEdit">
          {{ editSaving ? '保存中...' : '保存' }}
        </button>
      </div>

      <!-- 内容区 -->
      <div ref="readerBody" class="reader-body" :style="{ fontSize: readerFontSize + 'px' }" @scroll="onReaderScroll" @mouseup="!editMode && onTextSelect($event)" @touchend="!editMode && onTextSelect($event)">

        <!-- 编辑模式 -->
        <template v-if="editMode">
          <!-- md / txt / html：纯文本编辑 -->
          <div v-if="['md','txt','html'].includes(activeDoc.type)" class="reader-block editor-block">
            <textarea
              ref="editorTextarea"
              v-model="editContent"
              class="editor-textarea"
              spellcheck="false"
            ></textarea>
          </div>
          <!-- docx / pdf：富文本 contenteditable -->
          <div v-else-if="['docx','pdf'].includes(activeDoc.type)" class="reader-block editor-block">
            <article
              ref="editorRichtext"
              class="docx-content editor-richtext"
              contenteditable="true"
              v-html="editContent"
              @input="onRichtextInput"
            ></article>
          </div>
          <!-- xlsx 不支持编辑 -->
          <div v-else class="reader-block">
            <div class="empty compact" style="padding:20px">
              <strong>表格文档暂不支持编辑</strong>
              <p>请导出为 Excel 后使用专业工具编辑。</p>
            </div>
          </div>
        </template>

        <!-- 阅读模式（原有） -->
        <template v-else>
          <div v-if="activeDoc.type === 'html'" class="reader-block html-iframe-wrap">
            <iframe
              ref="htmlIframe"
              class="html-iframe"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              :srcdoc="activeDoc.contentHtml"
              @load="onHtmlIframeLoad"
            ></iframe>
          </div>

          <div v-else-if="['docx','pdf','md','txt'].includes(activeDoc.type)" class="reader-block">
            <div v-if="activeDoc.parseWarnings?.length" class="warning">
              {{ activeDoc.parseWarnings.join('；') }}
            </div>
            <article ref="readerContent" class="docx-content" v-html="wikiLinkedContentHtml" @click="onReaderContentClick"></article>
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
        </template>
      </div>

      <!-- 版本历史面板 -->
      <transition name="sheet">
        <div v-if="versionPanelOpen" class="version-overlay" @click.self="versionPanelOpen = false">
          <div class="version-panel">
            <div class="version-header">
              <h3>版本历史</h3>
              <button type="button" class="mini-btn" @click="versionPanelOpen = false">✕</button>
            </div>

            <!-- 保存新版本 -->
            <div class="version-save-bar">
              <input v-model.trim="versionMessage" class="input" placeholder="版本说明（可选）" />
              <button type="button" class="btn btn-primary" @click="saveCurrentVersion">保存版本</button>
            </div>

            <!-- diff 视图 -->
            <div v-if="diffView" class="diff-view">
              <div class="diff-header">
                <strong>对比: v{{ diffView.from }} → v{{ diffView.to }}</strong>
                <button type="button" class="mini-btn" @click="diffView = null">关闭</button>
              </div>
              <div class="diff-stats">
                <span class="diff-add">+{{ diffView.added }} 新增</span>
                <span class="diff-del">-{{ diffView.removed }} 删除</span>
              </div>
              <div class="diff-content" v-html="diffView.html"></div>
            </div>

            <!-- 版本列表 -->
            <div v-if="docVersions.length === 0" class="empty compact" style="padding:20px">
              <strong>暂无版本记录</strong>
              <p>点击"保存版本"创建第一个快照。</p>
            </div>
            <div v-else class="version-list">
              <div v-for="(ver, idx) in docVersions" :key="ver.id" class="version-item">
                <div class="version-dot" :class="{ first: idx === 0 }"></div>
                <div class="version-info">
                  <strong>v{{ ver.version }} · {{ ver.message }}</strong>
                  <span>{{ formatDate(ver.createdAt) }} · {{ formatBytes(ver.size || 0) }}</span>
                </div>
                <div class="version-actions">
                  <button v-if="idx < docVersions.length - 1" type="button" class="mini-btn" @click="showDiff(ver, docVersions[idx + 1])">对比</button>
                  <button v-if="idx > 0" type="button" class="mini-btn" @click="doRollback(ver)">回滚</button>
                  <button type="button" class="mini-btn danger" @click="doDeleteVersion(ver)">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 关联笔记面板 -->
      <transition name="sheet">
        <div v-if="linkedNotesPanelOpen" class="version-overlay" @click.self="linkedNotesPanelOpen = false">
          <div class="version-panel">
            <div class="version-header">
              <h3>关联笔记</h3>
              <button type="button" class="mini-btn" @click="linkedNotesPanelOpen = false">✕</button>
            </div>

            <div v-if="linkedNotes.length === 0" class="empty compact" style="padding:20px">
              <strong>暂无关联笔记</strong>
              <p>在正文里划词选中文字，点击"摘录"即可生成一条关联到本文档的笔记。</p>
            </div>
            <div v-else class="version-list">
              <button
                v-for="note in linkedNotes"
                :key="note.id"
                type="button"
                class="version-item"
                style="width:100%;text-align:left;background:none;border:none;cursor:pointer"
                @click="jumpToNote(note)"
              >
                <div class="version-dot"></div>
                <div class="version-info">
                  <strong>{{ note.title }}</strong>
                  <span>{{ formatDate(note.createdAt) }} · {{ (note.content || '').slice(0, 40) }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 选中文字操作弹窗 -->
      <div v-if="selectionPopup" class="selection-popup" :style="{ top: selectionPopup.y + 'px', left: selectionPopup.x + 'px' }">
        <button type="button" class="sel-btn" @click="highlightSelection">高亮</button>
        <button type="button" class="sel-btn" @click="excerptToNote">摘录</button>
        <button type="button" class="sel-btn" @click="selectionPopup = null">✕</button>
      </div>

      <!-- 回到顶部按钮 -->
      <button
        v-if="readerProgress > 15"
        type="button"
        class="reader-top-btn"
        @click="scrollReaderTop"
      >↑ 顶部</button>

      <!-- 书签提示 -->
      <transition name="toast">
        <div v-if="bookmarkToast" class="bookmark-toast">{{ bookmarkToast }}</div>
      </transition>
    </div>

    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      accept=".docx,.xlsx,.pdf,.html,.htm,.md,.txt"
      multiple
      @change="onFileChange"
    />
    </div>

    <!-- 个人笔记 -->
    <div v-if="activeTab === 'notes'" class="kb-scroll-area">
      <PersonalNotes
        :focus-note-id="pendingOpenNoteId"
        @consumed-focus="pendingOpenNoteId = null"
        @jump-to-doc="onJumpToDoc"
      />
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

      <section class="panel auto-backup-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">iCloud Auto Backup</p>
            <h2>定时备份到 iCloud</h2>
          </div>
        </div>
        <p class="backup-desc">开启后按设定间隔自动导出备份文件。iOS Safari 下载目录默认同步到 iCloud Drive，实现云端自动备份。</p>

        <div class="auto-backup-controls">
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoBackupEnabled" @change="toggleAutoBackup" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="toggle-text">{{ autoBackupEnabled ? '已开启' : '已关闭' }}</span>
          </label>

          <div v-if="autoBackupEnabled" class="interval-select">
            <label>备份间隔</label>
            <select v-model.number="autoBackupInterval" class="input select" @change="onBackupIntervalChange">
              <option :value="1">每小时</option>
              <option :value="6">每 6 小时</option>
              <option :value="12">每 12 小时</option>
              <option :value="24">每天</option>
              <option :value="72">每 3 天</option>
              <option :value="168">每周</option>
            </select>
          </div>
        </div>

        <div v-if="autoBackupEnabled" class="backup-status-bar">
          <div class="backup-status-item">
            <span class="backup-status-dot" :class="backupOverdue ? 'overdue' : 'ok'"></span>
            <span>{{ backupOverdue ? '备份已过期' : '备份正常' }}</span>
          </div>
          <div v-if="lastAutoBackupTime" class="backup-status-item">
            <span class="backup-status-label">上次备份</span>
            <span>{{ lastAutoBackupTime }}</span>
          </div>
          <button type="button" class="mini-btn" @click="_doAutoBackup">立即备份</button>
        </div>

        <details class="icloud-guide">
          <summary>如何配置 iCloud 自动同步？</summary>
          <ol>
            <li>打开 iPhone <strong>设置 → iCloud → iCloud Drive</strong>，确认已开启</li>
            <li>Safari 的下载文件默认保存到 <strong>"文件" App → iCloud Drive → 下载项</strong></li>
            <li>开启自动备份后，JSON 备份文件会按间隔自动下载到该目录</li>
            <li>新设备登录同一 Apple ID → 打开 "文件" App → 找到备份文件 → 在本应用中导入恢复</li>
          </ol>
        </details>
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
              <p>知识库支持 .docx（Word）、.xlsx（Excel）和 .pdf（PDF），单文件最大 50MB。</p>
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

    <!-- 回收站 -->
    <div v-if="activeTab === 'trash'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">Trash</p>
          <h1>回收站</h1>
          <p class="hero-text">已删除的文档可在此恢复。</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-danger" :disabled="trashDocs.length === 0" @click="emptyTrash">清空回收站</button>
        </div>
      </section>
      <section class="panel">
        <div v-if="trashDocs.length === 0" class="empty compact">
          <strong>回收站为空</strong>
          <p>删除的文档会出现在这里。</p>
        </div>
        <div v-else class="doc-list">
          <div v-for="item in trashDocs" :key="item.id" class="doc-item trash-item">
            <div class="doc-icon" :class="item.type">{{ { docx: 'W', xlsx: 'X', pdf: 'P', html: 'H', md: 'M', txt: 'T' }[item.type] || '?' }}</div>
            <div class="doc-meta">
              <strong>{{ item.name }}</strong>
              <span>{{ item.type.toUpperCase() }} · {{ formatBytes(item.size) }} · 删除于 {{ formatDate(item.deletedAt) }}</span>
            </div>
            <div class="trash-actions">
              <button type="button" class="mini-btn" @click="restoreFromTrash(item)">恢复</button>
              <button type="button" class="mini-btn danger" @click="permanentDeleteTrash(item)">永久删除</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Surge 配置生成器 -->
    <div v-if="activeTab === 'surge'" class="kb-scroll-area">
      <SurgePage />
    </div>

    <!-- AI 语义搜索（只负责搜索本身，设置单独拆到 ai-settings 页面） -->
    <div v-if="activeTab === 'ai'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">AI Search</p>
          <h1>AI 语义搜索</h1>
          <p class="hero-text">按含义找文档，不只是关键词精确匹配。需要先去设置里选一个 embedding 来源并建立索引。</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn" @click="goTab('ai-settings')">⚙️ 来源 / 索引设置</button>
        </div>
      </section>

      <section class="panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Index</p>
            <h2>索引状态</h2>
          </div>
          <span class="pill">{{ aiIndexStats.docs }} 篇文档 / {{ aiIndexStats.notes }} 条笔记</span>
        </div>
        <p class="backup-desc" v-if="!aiIndexStats.chunks && !aiIndexStats.noteChunks">
          还没有索引。新增/编辑文档或笔记后会自动建索引，也可以去"来源 / 索引设置"手动重建。
        </p>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Search</p>
            <h2>语义搜索</h2>
          </div>
        </div>
        <div class="ai-search-bar">
          <input
            v-model.trim="aiSearchKeyword"
            class="input"
            placeholder="用一句话描述你要找的内容..."
            @keydown.enter="doAiSearch"
            @focus="onAiSearchFocus"
          />
          <button type="button" class="btn btn-primary" :disabled="aiSearching" @click="doAiSearch">{{ aiSearching ? '搜索中...' : '搜索' }}</button>
        </div>
        <p v-if="aiSearchMsg" class="ai-search-msg">{{ aiSearchMsg }}</p>
        <div v-if="aiSearchResults.length" class="ai-result-list" style="margin-top:12px">
          <button
            v-for="r in aiSearchResults"
            :key="(r.kind || 'doc') + '-' + (r.kind === 'note' ? r.noteId : r.docId) + '-' + r.chunkIndex"
            type="button"
            class="ai-result-item"
            @click="openAiResult(r)"
          >
            <span class="ai-result-icon">{{ r.kind === 'note' ? '📝' : '📄' }}</span>
            <span class="ai-result-body">
              <span class="ai-result-top">
                <span class="ai-result-name">{{ r.kind === 'note' ? r.noteTitle : r.docName }}</span>
                <span class="ai-result-kind">{{ r.kind === 'note' ? '笔记' : '文档' }}</span>
              </span>
              <p class="ai-result-snippet">{{ r.chunkText }}</p>
            </span>
            <span class="ai-result-score">
              <span class="ai-result-score-value" :class="'score-' + aiScoreTier(r.score)">{{ (r.score * 100).toFixed(0) }}%</span>
              <span class="ai-result-score-bar">
                <span
                  class="ai-result-score-fill"
                  :class="'score-' + aiScoreTier(r.score)"
                  :style="{ width: Math.max(6, r.score * 100) + '%' }"
                ></span>
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <!-- AI 设置 - 入口页（只做导航，三块内容各自独立成页） -->
    <div v-if="activeTab === 'ai-settings'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">AI Settings</p>
          <h1>Embedding 设置</h1>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn" @click="goTab('ai')">← 返回搜索</button>
        </div>
      </section>

      <section class="panel">
        <button type="button" class="ai-settings-nav-item" @click="goTab('ai-local')">
          <span>本地模型</span>
          <span class="ai-settings-nav-arrow">›</span>
        </button>
      </section>
      <section class="panel" style="margin-top:16px">
        <button type="button" class="ai-settings-nav-item" @click="goTab('ai-cloud')">
          <span>云端 API</span>
          <span class="ai-settings-nav-arrow">›</span>
        </button>
      </section>
      <section class="panel" style="margin-top:16px">
        <button type="button" class="ai-settings-nav-item" @click="goTab('ai-index')">
          <span>索引建立</span>
          <span class="ai-settings-nav-arrow">›</span>
        </button>
      </section>
    </div>

    <!-- AI 设置 - 本地模型 -->
    <div v-if="activeTab === 'ai-local'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">AI Settings</p>
          <h1>本地模型</h1>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn" @click="goTab('ai-settings')">← 返回</button>
        </div>
      </section>

      <section class="panel">
        <div class="ai-radio-row">
          <input id="ai-provider-local" type="radio" value="local" v-model="aiConfig.provider" />
          <label for="ai-provider-local">使用本地模型</label>
        </div>
        <p class="ai-plain-desc">浏览器里跑轻量模型，数据完全不离开设备。首次使用要联网下载模型（约几十 MB），之后可离线用。</p>

        <p class="ai-plain-label" style="margin-top:14px">下载状态</p>
        <p class="ai-plain-desc">
          {{ aiLocalModelStatus === 'ready' ? '模型已就绪（本次会话内）' : aiLocalModelStatus === 'loading' ? (aiLocalModelProgress || '加载中...') : aiLocalModelStatus === 'error' ? aiLocalModelProgress : '还不确定是否已下载' }}
        </p>
        <button
          type="button"
          class="btn btn-primary"
          style="width:100%"
          :disabled="aiLocalModelStatus === 'loading'"
          @click="checkOrLoadLocalModel"
        >{{ aiLocalModelStatus === 'ready' ? '重新检测' : '检测 / 下载模型' }}</button>
      </section>

      <section class="panel" style="margin-top:16px">
        <button type="button" class="btn btn-primary" style="width:100%" @click="saveAiConfig">保存设置</button>
        <p v-if="aiConfigMsg" class="password-msg">{{ aiConfigMsg }}</p>
      </section>
    </div>

    <!-- AI 设置 - 云端 API -->
    <div v-if="activeTab === 'ai-cloud'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">AI Settings</p>
          <h1>云端 API</h1>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn" @click="goTab('ai-settings')">← 返回</button>
        </div>
      </section>

      <section class="panel">
        <div class="ai-radio-row">
          <input id="ai-provider-cloud" type="radio" value="cloud" v-model="aiConfig.provider" />
          <label for="ai-provider-cloud">使用云端 API</label>
        </div>
        <p class="ai-plain-desc">调用你自己的 OpenAI 兼容 embedding 接口，效果通常更好，但会把文档内容发送到你填写的地址，且可能产生调用费用。</p>
        <p class="ai-plain-desc">注意：选了云端 API 后，新增/编辑文档会自动调用这个接口生成索引，每次都会产生请求（可能产生费用），不需要每次手动确认。</p>

        <p class="ai-plain-label" style="margin-top:14px">API Base URL</p>
        <input v-model.trim="aiConfig.cloud.baseUrl" class="input" placeholder="例如 https://api.openai.com/v1" />

        <p class="ai-plain-label" style="margin-top:10px">API Key</p>
        <input v-model.trim="aiConfig.cloud.apiKey" type="password" class="input" placeholder="sk-..." />

        <p class="ai-plain-label" style="margin-top:10px">模型名称</p>
        <input v-model.trim="aiConfig.cloud.model" class="input" placeholder="text-embedding-3-small" />
      </section>

      <section class="panel" style="margin-top:16px">
        <button type="button" class="btn btn-primary" style="width:100%" @click="saveAiConfig">保存设置</button>
        <p v-if="aiConfigMsg" class="password-msg">{{ aiConfigMsg }}</p>
      </section>
    </div>

    <!-- AI 设置 - 索引建立 -->
    <div v-if="activeTab === 'ai-index'" class="kb-scroll-area">
      <section class="hero">
        <div>
          <p class="eyebrow">AI Settings</p>
          <h1>索引建立</h1>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn" @click="goTab('ai-settings')">← 返回</button>
        </div>
      </section>

      <section class="panel">
        <p class="ai-plain-label">当前状态</p>
        <p class="ai-plain-desc">已索引 {{ aiIndexStats.docs }} 篇文档 / {{ aiIndexStats.chunks }} 段，{{ aiIndexStats.notes }} 条笔记 / {{ aiIndexStats.noteChunks }} 段。</p>
        <p class="ai-plain-desc">索引会把每篇文档/笔记切成小段落，逐段生成向量存起来，语义搜索靠比对向量实现。现在新增、编辑、恢复文档或笔记时会自动在后台更新索引，删除时也会自动清理对应索引，不用手动操作。</p>
        <p class="ai-plain-desc">如果切换过 embedding 来源（本地/云端），或者想确保所有内容都是最新索引，可以在这里手动全量重建一次：</p>
        <button type="button" class="btn btn-primary" style="width:100%" :disabled="aiIndexing" @click="rebuildAiIndex">
          {{ aiIndexing ? '索引中...' : '全量重建索引' }}
        </button>
        <p v-if="aiIndexing" class="ai-plain-desc">{{ aiIndexProgress.done }} / {{ aiIndexProgress.total }} · {{ aiIndexProgress.name }}</p>
      </section>
    </div>

    <!-- 图片放大器（全局，文档正文里的图片点击后弹出） -->
    <ImageLightbox v-model:src="lightboxSrc" />
  </div>
</template>

<script>
import * as XLSX from 'xlsx'
import mammoth from 'mammoth/mammoth.browser'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs'
import { marked } from 'marked'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href
import PersonalNotes from './features/notes/PersonalNotes.vue'
import SurgePage from './features/surge/SurgePage.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import { listNotes, createNote, getNotesByDocId } from './features/notes/notesDb.js'
import {
  knowledgeBaseDb,
  clearKnowledgeDocs,
  getKnowledgeMeta,
  listKnowledgeDocs,
  removeKnowledgeDoc,
  updateKnowledgeDoc,
  saveKnowledgeDocs,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveDocToFolder,
  setKnowledgeMeta,
  exportAllData,
  importAllData,
  setPassword,
  verifyPassword,
  hasPassword,
  saveDocVersion,
  listDocVersions,
  getDocVersion,
  rollbackDocVersion,
  deleteDocVersion
} from './features/knowledge-base/knowledgeBaseDb.js'
import {
  getEmbedConfig,
  setEmbedConfig,
  buildAllIndex,
  buildDocIndex,
  buildAllNoteIndex,
  buildNoteIndex,
  getIndexStats,
  semanticSearch,
  removeDocIndex,
  removeNoteIndex,
  clearAllIndex,
  preloadLocalModel,
  isLocalModelLoaded
} from './features/knowledge-base/semanticSearch.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024

function toSheetRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []))
    : []
}

export default {
  name: 'KnowledgeBaseStandaloneApp',
  components: { PersonalNotes, SurgePage, ImageLightbox },
  data() {
    return {
      activeTab: 'kb',
      moreMenuOpen: false,
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
      bookmarks: {},
      bookmarkSaveTimer: null,
      bookmarkToast: '',
      importQueue: [],
      storageInfo: {
        persisted: false,
        usageText: '0 B',
        quotaText: '0 B'
      },
      swUpdateAvailable: false,
      swCheckMsg: '',
      autoBackupEnabled: false,
      autoBackupInterval: 24,
      lastAutoBackupTime: '',
      lastAutoBackupTs: 0,
      backupOverdue: false,
      darkMode: false,
      globalSearchOpen: false,
      globalSearchKeyword: '',
      globalSearchResults: [],
      trashDocs: [],
      readerFontSize: 16,
      highlights: {},
      selectionPopup: null,
      readingStats: { today: 0, week: [], sessionStart: 0 },
      readingStatsAll: {},
      folders: [],
      activeFolderId: null,
      folderPanelOpen: false,
      folderNewName: '',
      folderEditId: null,
      folderEditName: '',
      moveDocTarget: null,
      readerMenuOpen: false,
      ttsPlaying: false,
      ttsRate: 1,
      editMode: false,
      editContent: '',
      editSaving: false,
      versionPanelOpen: false,
      docVersions: [],
      diffView: null,
      versionMessage: '',
      changelog: [],
      // 笔记 ↔ 文档 双向关联
      linkedNotes: [],
      linkedNotesPanelOpen: false,
      pendingOpenNoteId: null,
      // 图片放大器
      lightboxSrc: '',

      // AI 语义搜索
      aiConfig: { provider: 'local', localModel: 'Xenova/all-MiniLM-L6-v2', cloud: { baseUrl: '', apiKey: '', model: 'text-embedding-3-small' } },
      aiConfigMsg: '',
      aiIndexStats: { chunks: 0, docs: 0, notes: 0, noteChunks: 0 },
      aiIndexing: false,
      aiIndexProgress: { done: 0, total: 0, name: '' },
      aiSearchKeyword: '',
      aiSearchResults: [],
      aiSearching: false,
      aiSearchMsg: '',
      // 本地模型下载/加载状态：unknown | loading | ready | error
      aiLocalModelStatus: 'unknown',
      aiLocalModelProgress: ''
    }
  },
  computed: {
    filteredDocs() {
      const keyword = String(this.listKeyword || '').trim().toLowerCase()
      return this.docs.filter((doc) => {
        // 文件夹筛选
        if (this.activeFolderId !== null) {
          if (this.activeFolderId === 0) { if (doc.folderId && doc.folderId !== 0) return false }
          else { if (doc.folderId !== this.activeFolderId) return false }
        }
        if (this.typeFilter === 'starred') { if (!doc.starred) return false }
        else if (this.typeFilter !== 'all' && doc.type !== this.typeFilter) return false
        if (!keyword) return true
        return `${doc.name} ${doc.contentText || ''}`.toLowerCase().includes(keyword)
      })
    },
    activeDoc() {
      return this.docs.find((doc) => doc.id === this.activeDocId) || null
    },
    // 把正文里的 [[文档名]] 语法转成可点击的 wiki 式互链
    wikiLinkedContentHtml() {
      const html = this.activeDoc?.contentHtml || ''
      if (!html) return html
      return html.replace(/\[\[([^\[\]]{1,80})\]\]/g, (match, rawName) => {
        const name = rawName.trim()
        if (!name) return match
        const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const exists = !!this.findDocByLooseName(name)
        const cls = exists ? 'wiki-link' : 'wiki-link wiki-link-missing'
        return `<a href="#" class="${cls}" data-wiki-name="${escaped}" title="${exists ? '跳转到《' + escaped + '》' : '未找到匹配的文档'}">[[${escaped}]]</a>`
      })
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
    readerDocIndex() {
      if (!this.activeDoc) return -1
      return this.filteredDocs.findIndex(d => d.id === this.activeDocId)
    },
    prevDoc() {
      const idx = this.readerDocIndex
      return idx > 0 ? this.filteredDocs[idx - 1] : null
    },
    nextDoc() {
      const idx = this.readerDocIndex
      return idx >= 0 && idx < this.filteredDocs.length - 1 ? this.filteredDocs[idx + 1] : null
    },
    isMoreTabActive() {
      return ['about', 'pwa', 'trash', 'surge', 'ai', 'ai-settings', 'ai-local', 'ai-cloud', 'ai-index'].includes(this.activeTab)
    },
    docCounts() {
      return this.docs.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1
        return acc
      }, { docx: 0, xlsx: 0, pdf: 0, html: 0, md: 0, txt: 0 })
    },
    readingStatsDisplay() {
      const mins = Math.round(this.readingStats.today / 60000)
      if (mins < 1) return '0 分钟'
      if (mins < 60) return mins + ' 分钟'
      return Math.floor(mins / 60) + ' 小时 ' + (mins % 60) + ' 分钟'
    },
    greetingText() {
      const h = new Date().getHours()
      if (h < 6) return '夜深了，注意休息'
      if (h < 12) return '早上好，开始学习吧'
      if (h < 18) return '下午好，继续加油'
      return '晚上好，今日收获如何'
    },
    lastReadDoc() {
      const sorted = this.docs
        .filter(d => this.bookmarks[d.id] && this.bookmarks[d.id].progress > 0 && this.bookmarks[d.id].progress < 100)
        .sort((a, b) => (this.bookmarks[b.id]?.updatedAt || 0) - (this.bookmarks[a.id]?.updatedAt || 0))
      return sorted[0] || null
    },
    recentDocs() {
      const withBookmark = this.docs
        .filter(d => this.bookmarks[d.id])
        .sort((a, b) => (this.bookmarks[b.id]?.updatedAt || 0) - (this.bookmarks[a.id]?.updatedAt || 0))
      return withBookmark.slice(0, 8)
    },
    // 最近 14 周（98 天）的阅读打卡数据，按周分列，周日在最上面（GitHub 贡献图风格）
    heatmapWeeks() {
      const totalDays = 98
      const now = new Date()
      const days = []
      for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const key = d.toDateString()
        const minutes = Math.round((this.readingStatsAll[key] || 0) / 60000)
        days.push({ key, minutes })
      }
      const firstDow = new Date(days[0].key).getDay()
      const weeks = []
      let week = new Array(firstDow).fill(null)
      for (const d of days) {
        week.push(d)
        if (week.length === 7) { weeks.push(week); week = [] }
      }
      if (week.length) {
        while (week.length < 7) week.push(null)
        weeks.push(week)
      }
      return weeks
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
      await this.loadFolders()
      await this.refreshStorageInfo()
      this.runDiagnostics()
      // 恢复书签数据
      this.bookmarks = (await getKnowledgeMeta('bookmarks')) || {}
      // 恢复主题
      const savedTheme = localStorage.getItem('kb-theme')
      if (savedTheme === 'dark') {
        this.darkMode = true
        document.documentElement.setAttribute('data-theme', 'dark')
      }
      // 恢复回收站
      this.trashDocs = (await getKnowledgeMeta('trashDocs')) || []
      // 恢复字体大小
      this.readerFontSize = parseInt(localStorage.getItem('kb-font-size') || '16', 10)
      // 恢复高亮数据
      this.highlights = (await getKnowledgeMeta('highlights')) || {}
      // 加载阅读统计
      this.loadReadingStats()
      // 监听 SW 更新事件
      if (window.__swUpdate?.available) this.swUpdateAvailable = true
      window.addEventListener('sw-update-found', () => { this.swUpdateAvailable = true })
      // 恢复自动备份设置
      this.autoBackupEnabled = localStorage.getItem('kb-auto-backup') === 'true'
      this.autoBackupInterval = parseInt(localStorage.getItem('kb-auto-backup-interval') || '24', 10)
      this.lastAutoBackupTime = localStorage.getItem('kb-last-backup-time') || ''
      this.lastAutoBackupTs = parseInt(localStorage.getItem('kb-last-backup-ts') || '0', 10)
      this._checkBackupOverdue()
      if (this.autoBackupEnabled) {
        this._setupAutoBackup()
      }
      // 处理来自系统分享（Web Share Target）的待导入内容
      if (new URLSearchParams(location.search).get('shared') === '1') {
        await this.consumePendingShares()
      }
      // 提前加载 AI 语义搜索的配置和索引统计
      this.loadAiPanel().catch(() => {})
    },
    // ─── Web Share Target：读取 sw.js 存到 kb-share-inbox 的待导入内容 ───
    _openShareDb() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('kb-share-inbox', 1)
        req.onupgradeneeded = () => {
          req.result.createObjectStore('pendingShares', { keyPath: 'id', autoIncrement: true })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    },
    async consumePendingShares() {
      // 清理地址栏上的 ?shared=1，避免刷新时重复处理
      history.replaceState(null, '', location.pathname)
      try {
        const db = await this._openShareDb()
        const items = await new Promise((resolve, reject) => {
          const tx = db.transaction('pendingShares', 'readonly')
          const req = tx.objectStore('pendingShares').getAll()
          req.onsuccess = () => resolve(req.result || [])
          req.onerror = () => reject(req.error)
        })
        if (!items.length) return

        const files = items.filter(item => item.kind === 'file' && item.file).map(item => item.file)
        const textItems = items.filter(item => item.kind === 'text')

        if (files.length) {
          await this.importFiles(files)
          this.activeTab = 'kb'
        }
        for (const item of textItems) {
          const title = item.title || item.link || '分享内容'
          const contentParts = [item.text, item.link].filter(Boolean)
          const created = await createNote({
            title: '分享：' + title,
            content: contentParts.join('\n\n') || '(无正文)',
            category: '分享',
            tags: ['分享']
          })
          this.autoIndexNote(created)
        }

        // 清空收件箱
        await new Promise((resolve, reject) => {
          const tx = db.transaction('pendingShares', 'readwrite')
          tx.objectStore('pendingShares').clear()
          tx.oncomplete = resolve
          tx.onerror = () => reject(tx.error)
        })

        if (files.length || textItems.length) {
          alert(`已从系统分享导入 ${files.length} 个文件` + (textItems.length ? `，${textItems.length} 条分享笔记` : ''))
        }
      } catch (err) {
        console.error('[share-target] 导入分享内容失败:', err)
      }
    },
    openGlobalSearch() {
      this.globalSearchOpen = true
      this.globalSearchKeyword = ''
      this.globalSearchResults = []
      this.$nextTick(() => this.$refs.globalSearchInput?.focus())
    },
    async doGlobalSearch() {
      const kw = this.globalSearchKeyword.toLowerCase()
      if (!kw) { this.globalSearchResults = []; return }
      const results = []
      // 搜索文档
      for (const doc of this.docs) {
        const hay = `${doc.name}\n${doc.contentText || ''}`.toLowerCase()
        const idx = hay.indexOf(kw)
        if (idx >= 0) {
          const start = Math.max(0, idx - 20)
          const end = Math.min(hay.length, idx + kw.length + 40)
          results.push({
            source: doc.type, icon: { docx: 'W', xlsx: 'X', pdf: 'P', html: 'H', md: 'M', txt: 'T' }[doc.type] || '?',
            title: doc.name, snippet: hay.slice(start, end).replace(/\s+/g, ' ').trim(),
            tag: doc.type.toUpperCase(), type: 'doc', data: doc
          })
        }
      }
      // 搜索笔记
      try {
        const notes = await listNotes({ keyword: this.globalSearchKeyword })
        for (const n of notes.slice(0, 20)) {
          const content = (n.content || '').toLowerCase()
          const idx = content.indexOf(kw)
          const snippet = idx >= 0
            ? content.slice(Math.max(0, idx - 20), idx + kw.length + 40).replace(/\s+/g, ' ').trim()
            : (n.content || '').slice(0, 60)
          results.push({
            source: 'note', icon: '📝', title: n.title, snippet,
            tag: '笔记', type: 'note', data: n
          })
        }
      } catch (e) { /* ignore */ }
      this.globalSearchResults = results.slice(0, 30)
    },
    openGlobalResult(r) {
      this.globalSearchOpen = false
      if (r.type === 'doc') {
        this.activeTab = 'kb'
        this.openDoc(r.data)
      } else if (r.type === 'note') {
        this.activeTab = 'notes'
      }
    },
    // ─── 字体大小 ───
    changeFontSize(delta) {
      this.readerFontSize = Math.max(12, Math.min(28, this.readerFontSize + delta * 2))
      localStorage.setItem('kb-font-size', this.readerFontSize)
    },
    // ─── 文档收藏 ───
    async toggleStar(doc) {
      doc.starred = !doc.starred
      await knowledgeBaseDb.docs.update(doc.id, { starred: doc.starred })
    },
    // ─── 文本选中 ───
    onTextSelect() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        this.selectionPopup = null
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const overlay = this.$refs.readerBody?.getBoundingClientRect() || { top: 0, left: 0 }
      this.selectionPopup = {
        text: sel.toString().trim(),
        x: Math.min(rect.left - overlay.left + rect.width / 2, window.innerWidth - 120),
        y: rect.top - overlay.top - 40 + (this.$refs.readerBody?.scrollTop || 0)
      }
    },
    // ─── 高亮标注 ───
    highlightSelection() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      try {
        const range = sel.getRangeAt(0)
        const mark = document.createElement('mark')
        mark.className = 'user-highlight'
        range.surroundContents(mark)
      } catch (e) { /* 跨节点选中时忽略 */ }
      // 保存高亮数据
      if (this.activeDocId) {
        const docHighlights = this.highlights[this.activeDocId] || []
        docHighlights.push({ text: this.selectionPopup?.text || '', time: Date.now() })
        this.highlights[this.activeDocId] = docHighlights
        setKnowledgeMeta('highlights', this.highlights)
      }
      this.selectionPopup = null
      window.getSelection()?.removeAllRanges()
    },
    // ─── 摘录到笔记 ───
    async excerptToNote() {
      if (!this.selectionPopup?.text) return
      const title = '摘录：' + (this.activeDoc?.name || '未知文档')
      const content = '> ' + this.selectionPopup.text + '\n\n— 来自《' + (this.activeDoc?.name || '') + '》'
      const created = await createNote({
        title,
        content,
        category: '摘录',
        tags: ['摘录'],
        sourceDocId: this.activeDoc?.id || 0,
        sourceDocName: this.activeDoc?.name || ''
      })
      this.autoIndexNote(created)
      // 摘录后来源文档新增了一条关联笔记，刷新一下列表
      if (this.activeDocId) this.loadLinkedNotes(this.activeDocId)
      this.selectionPopup = null
      window.getSelection()?.removeAllRanges()
      this.bookmarkToast = '已摘录到笔记'
      setTimeout(() => { this.bookmarkToast = '' }, 1500)
    },
    // ─── 关联笔记（笔记 ↔ 文档）───
    async loadLinkedNotes(docId) {
      this.linkedNotes = await getNotesByDocId(docId)
    },
    openLinkedNotesPanel() {
      this.linkedNotesPanelOpen = true
      this.readerMenuOpen = false
    },
    jumpToNote(note) {
      this.linkedNotesPanelOpen = false
      this.readerMenuOpen = false
      this.pendingOpenNoteId = note.id
      this.activeTab = 'notes'
    },
    // ─── wiki 式文档互链 [[文档名]] ───
    findDocByLooseName(name) {
      const target = String(name || '').trim().toLowerCase()
      if (!target) return null
      return this.docs.find(d => {
        const full = d.name.toLowerCase()
        const noExt = full.replace(/\.[^.]+$/, '')
        return full === target || noExt === target
      }) || null
    },
    onReaderContentClick(event) {
      // 点图片 → 打开放大器
      if (event.target.tagName === 'IMG') {
        this.lightboxSrc = event.target.currentSrc || event.target.src
        return
      }
      const link = event.target.closest?.('.wiki-link')
      if (!link) return
      event.preventDefault()
      const name = link.getAttribute('data-wiki-name') || ''
      const doc = this.findDocByLooseName(name)
      if (!doc) {
        alert(`未找到名为"${name}"的文档（互链按文档名匹配，忽略扩展名）`)
        return
      }
      this.goDoc(doc)
    },
    onJumpToDoc(docId) {
      const doc = this.docs.find(d => d.id === docId)
      if (!doc) {
        alert('原文档不存在或已被删除')
        return
      }
      this.activeTab = 'kb'
      this.openDoc(doc)
    },
    // ─── TTS 朗读 ───
    toggleTTS() {
      if (this.ttsPlaying) {
        speechSynthesis.cancel()
        this.ttsPlaying = false
        return
      }
      const text = this.activeDoc?.contentText || ''
      if (!text.trim()) {
        this.bookmarkToast = '没有可朗读的文本内容'
        setTimeout(() => { this.bookmarkToast = '' }, 1500)
        return
      }
      if (!('speechSynthesis' in window)) {
        this.bookmarkToast = '当前浏览器不支持语音合成'
        setTimeout(() => { this.bookmarkToast = '' }, 1500)
        return
      }
      // 分段朗读（每段最多200字，避免长文本被截断）
      const chunks = []
      const maxLen = 200
      for (let i = 0; i < text.length; i += maxLen) {
        chunks.push(text.slice(i, i + maxLen))
      }
      this.ttsPlaying = true
      this._ttsChunks = chunks
      this._ttsIndex = 0
      this._speakNextChunk()
    },
    _speakNextChunk() {
      if (!this.ttsPlaying || this._ttsIndex >= this._ttsChunks.length) {
        this.ttsPlaying = false
        return
      }
      const utter = new SpeechSynthesisUtterance(this._ttsChunks[this._ttsIndex])
      utter.lang = 'zh-CN'
      utter.rate = this.ttsRate
      utter.onend = () => {
        this._ttsIndex++
        this._speakNextChunk()
      }
      utter.onerror = () => {
        this.ttsPlaying = false
      }
      speechSynthesis.speak(utter)
    },
    updateTTSRate() {
      if (!this.ttsPlaying) return
      // 重启当前朗读以应用新速率
      speechSynthesis.cancel()
      this._speakNextChunk()
    },
    stopTTSIfNeeded() {
      if (this.ttsPlaying) {
        speechSynthesis.cancel()
        this.ttsPlaying = false
      }
    },
    // ─── 文件夹管理 ───
    async loadFolders() {
      this.folders = await listFolders()
    },
    getDocFolder(doc) {
      if (!doc.folderId) return null
      return this.folders.find(f => f.id === doc.folderId) || null
    },
    async doCreateFolder() {
      if (!this.folderNewName) return
      await createFolder(this.folderNewName)
      this.folderNewName = ''
      await this.loadFolders()
    },
    async doRenameFolder(f) {
      if (!this.folderEditName) return
      await renameFolder(f.id, this.folderEditName)
      this.folderEditId = null
      this.folderEditName = ''
      await this.loadFolders()
    },
    async doDeleteFolder(f) {
      const count = this.docs.filter(d => d.folderId === f.id).length
      if (!confirm(`删除文件夹「${f.name}」？其中 ${count} 篇文档将移到未分类。`)) return
      await deleteFolder(f.id)
      if (this.activeFolderId === f.id) this.activeFolderId = null
      await this.loadFolders()
      await this.reloadDocs()
    },
    async doMoveDoc(folderId) {
      if (!this.moveDocTarget) return
      await moveDocToFolder(this.moveDocTarget.id, folderId)
      this.moveDocTarget = null
      await this.reloadDocs()
    },
    // ─── 编辑模式 ───
    toggleEditMode() {
      if (this.editMode) {
        this.cancelEdit()
        return
      }
      if (this.activeDoc.type === 'xlsx') {
        this.bookmarkToast = '表格文档暂不支持编辑'
        setTimeout(() => { this.bookmarkToast = '' }, 1500)
        return
      }
      // 进入编辑模式
      if (['md', 'txt'].includes(this.activeDoc.type)) {
        this.editContent = this.activeDoc.contentText || ''
      } else if (this.activeDoc.type === 'html') {
        this.editContent = this.activeDoc.contentHtml || ''
      } else {
        // docx, pdf — 编辑 HTML
        this.editContent = this.activeDoc.contentHtml || ''
      }
      this.editMode = true
      this.$nextTick(() => {
        if (this.$refs.editorTextarea) this.$refs.editorTextarea.focus()
      })
    },
    cancelEdit() {
      if (this.editContent !== (this.activeDoc.contentText || this.activeDoc.contentHtml || '')) {
        if (!confirm('放弃未保存的修改？')) return
      }
      this.editMode = false
      this.editContent = ''
    },
    async saveEdit() {
      if (!this.activeDoc || this.editSaving) return
      this.editSaving = true
      try {
        // 保存编辑前的版本快照
        await saveDocVersion(this.activeDoc, '编辑前自动保存')

        const doc = this.activeDoc
        let contentHtml, contentText

        if (doc.type === 'md') {
          contentText = this.editContent
          contentHtml = marked(this.editContent)
        } else if (doc.type === 'txt') {
          contentText = this.editContent
          contentHtml = '<pre class="txt-content">' + this.escHtml(this.editContent) + '</pre>'
        } else if (doc.type === 'html') {
          contentHtml = this.editContent
          // 提取纯文本
          const tmp = document.createElement('div')
          tmp.innerHTML = this.editContent
          contentText = tmp.textContent || ''
        } else {
          // docx / pdf — 从 contenteditable 获取
          contentHtml = this.$refs.editorRichtext?.innerHTML || this.editContent
          const tmp = document.createElement('div')
          tmp.innerHTML = contentHtml
          contentText = tmp.textContent || ''
        }

        await updateKnowledgeDoc(doc.id, {
          contentHtml,
          contentText,
          size: new Blob([contentHtml]).size
        })
        await this.reloadDocs()

        // 保存编辑后的版本快照
        const updated = this.docs.find(d => d.id === doc.id)
        if (updated) {
          await saveDocVersion(updated, '编辑保存')
          // 内容变了，自动重新索引这一篇（后台静默进行）
          this.autoIndexDoc(updated)
        }

        this.editMode = false
        this.editContent = ''
        this.bookmarkToast = '已保存'
        setTimeout(() => { this.bookmarkToast = '' }, 1500)
      } catch (err) {
        console.error('[edit] save failed:', err)
        alert('保存失败: ' + err.message)
      } finally {
        this.editSaving = false
      }
    },
    execFormat(command, value) {
      document.execCommand(command, false, value || null)
      this.$refs.editorRichtext?.focus()
    },
    onRichtextInput() {
      // 同步 contenteditable 内容到 editContent（用于脏检查）
      this.editContent = this.$refs.editorRichtext?.innerHTML || ''
    },
    // ─── 版本管理 ───
    async openVersionPanel() {
      if (!this.activeDoc) return
      this.docVersions = await listDocVersions(this.activeDoc.id)
      this.diffView = null
      this.versionMessage = ''
      this.versionPanelOpen = true
    },
    async saveCurrentVersion() {
      if (!this.activeDoc) return
      const msg = this.versionMessage || `手动保存 v${this.docVersions.length + 1}`
      await saveDocVersion(this.activeDoc, msg)
      this.versionMessage = ''
      this.docVersions = await listDocVersions(this.activeDoc.id)
      this.bookmarkToast = '版本已保存'
      setTimeout(() => { this.bookmarkToast = '' }, 1500)
    },
    showDiff(newer, older) {
      const newLines = (newer.contentText || '').split('\n')
      const oldLines = (older.contentText || '').split('\n')
      let added = 0, removed = 0
      const diffHtml = []
      // 简易逐行 diff
      const maxLen = Math.max(newLines.length, oldLines.length)
      for (let i = 0; i < maxLen; i++) {
        const nLine = newLines[i]
        const oLine = oldLines[i]
        if (nLine === oLine) {
          if (nLine !== undefined) diffHtml.push(`<div class="diff-line diff-same">${this.escHtml(nLine) || '&nbsp;'}</div>`)
        } else {
          if (oLine !== undefined) {
            removed++
            diffHtml.push(`<div class="diff-line diff-removed">- ${this.escHtml(oLine)}</div>`)
          }
          if (nLine !== undefined) {
            added++
            diffHtml.push(`<div class="diff-line diff-added">+ ${this.escHtml(nLine)}</div>`)
          }
        }
      }
      this.diffView = {
        from: older.version,
        to: newer.version,
        added,
        removed,
        html: diffHtml.join('')
      }
    },
    escHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },
    async doRollback(ver) {
      if (!confirm(`确定回滚到 v${ver.version}？当前内容将自动保存为新版本。`)) return
      // 先保存当前版本
      await saveDocVersion(this.activeDoc, `回滚前自动保存`)
      // 执行回滚
      await rollbackDocVersion(this.activeDoc.id, ver.id)
      // 刷新文档和版本列表
      await this.reloadDocs()
      this.docVersions = await listDocVersions(this.activeDoc.id)
      this.bookmarkToast = `已回滚到 v${ver.version}`
      setTimeout(() => { this.bookmarkToast = '' }, 1500)
    },
    async doDeleteVersion(ver) {
      if (!confirm(`确定删除版本 v${ver.version}？`)) return
      await deleteDocVersion(ver.id)
      this.docVersions = await listDocVersions(this.activeDoc.id)
    },
    // ─── 阅读统计 ───
    startReadingTimer() {
      this.readingStats.sessionStart = Date.now()
    },
    stopReadingTimer() {
      if (!this.readingStats.sessionStart) return
      const elapsed = Date.now() - this.readingStats.sessionStart
      this.readingStats.sessionStart = 0
      const today = new Date().toDateString()
      const saved = JSON.parse(localStorage.getItem('kb-reading-stats') || '{}')
      saved[today] = (saved[today] || 0) + elapsed
      localStorage.setItem('kb-reading-stats', JSON.stringify(saved))
      this.readingStats.today = saved[today]
      this.readingStatsAll = saved
    },
    loadReadingStats() {
      const saved = JSON.parse(localStorage.getItem('kb-reading-stats') || '{}')
      const today = new Date().toDateString()
      this.readingStats.today = saved[today] || 0
      this.readingStatsAll = saved
    },
    // ─── 阅读打卡热力图 ───
    heatmapLevel(minutes) {
      if (!minutes) return 0
      if (minutes < 10) return 1
      if (minutes < 30) return 2
      if (minutes < 60) return 3
      return 4
    },
    toggleTheme() {
      this.darkMode = !this.darkMode
      document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light')
      localStorage.setItem('kb-theme', this.darkMode ? 'dark' : 'light')
    },
    toggleMoreMenu() {
      this.moreMenuOpen = !this.moreMenuOpen
    },
    goTab(id) {
      this.activeTab = id
      this.moreMenuOpen = false
    },
    // ─── AI 语义搜索 ───
    async loadAiPanel() {
      this.aiConfig = await getEmbedConfig()
      this.aiIndexStats = await getIndexStats()
      // 如果本地模型这个会话里已经加载过了（比如之前搜索时自动下载过），
      // 直接同步状态，避免又显示"还不确定是否已下载"
      if (this.aiConfig.provider === 'local' && isLocalModelLoaded(this.aiConfig.localModel)) {
        this.aiLocalModelStatus = 'ready'
      }
    },
    // 单篇文档自动建索引：导入新文档 / 编辑保存后调用，静默进行，不打断当前操作。
    // 用的是 embedTexts 里已有的懒加载逻辑，本地模型没下载过的话会在这里自动触发下载。
    async autoIndexDoc(doc) {
      if (!doc) return
      try {
        await buildDocIndex(doc)
        this.aiIndexStats = await getIndexStats()
      } catch (err) {
        console.warn('[auto-index] 自动索引失败:', doc?.name, err)
      }
    },
    // 单条笔记自动建索引（分享导入 / 摘录到笔记 时调用，PersonalNotes.vue 内部编辑/删除笔记
    // 有它自己的一份同逻辑，因为那些操作发生在子组件内，够不到这里的 state）
    async autoIndexNote(note) {
      if (!note) return
      try {
        await buildNoteIndex(note)
        this.aiIndexStats = await getIndexStats()
      } catch (err) {
        console.warn('[auto-index] 笔记自动索引失败:', note?.title, err)
      }
    },
    async saveAiConfig() {
      await setEmbedConfig(JSON.parse(JSON.stringify(this.aiConfig)))
      this.aiConfigMsg = '✅ 已保存'
      setTimeout(() => { this.aiConfigMsg = '' }, 1500)
    },
    // 手动"检测/下载模型"：主动触发一次本地模型加载，让用户能看到下载进度和最终状态，
    // 而不是等到真正搜索/建索引时才第一次悄悄触发下载
    async checkOrLoadLocalModel() {
      this.aiLocalModelStatus = 'loading'
      this.aiLocalModelProgress = '正在连接...'
      try {
        await preloadLocalModel(this.aiConfig.localModel, (event) => {
          if (!event) return
          if (event.status === 'progress' && event.file) {
            const pct = event.progress ? event.progress.toFixed(0) : '0'
            this.aiLocalModelProgress = `下载中 ${event.file}：${pct}%`
          } else if (event.status === 'ready' || event.status === 'done') {
            this.aiLocalModelProgress = '处理中...'
          } else if (event.file) {
            this.aiLocalModelProgress = `${event.status || '准备中'}：${event.file}`
          }
        })
        this.aiLocalModelStatus = 'ready'
        this.aiLocalModelProgress = '模型已就绪，可以离线使用'
      } catch (err) {
        this.aiLocalModelStatus = 'error'
        this.aiLocalModelProgress = '加载失败: ' + (err.message || '未知错误')
      }
    },
    // 手机上搜索框获得焦点、键盘弹出后，把输入框滚动到可见区域，
    // 避免下面紧挨着的"搜索"按钮被键盘挡住
    onAiSearchFocus(event) {
      const el = event.target
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 350)
    },
    async rebuildAiIndex() {
      const allNotes = await listNotes()
      if (this.aiConfig.provider === 'cloud') {
        if (!window.confirm(`将把 ${this.docs.length} 篇文档 + ${allNotes.length} 条笔记的内容发送到你填写的 API 地址生成向量，确定继续吗？`)) return
      }
      await this.saveAiConfig()
      this.aiIndexing = true
      const total = this.docs.length + allNotes.length
      this.aiIndexProgress = { done: 0, total, name: '' }
      try {
        await buildAllIndex(this.docs, (done, _t, name) => {
          this.aiIndexProgress = { done, total, name }
        })
        await buildAllNoteIndex(allNotes, (done, _t, name) => {
          this.aiIndexProgress = { done: this.docs.length + done, total, name }
        })
        this.aiIndexStats = await getIndexStats()
      } catch (err) {
        alert('建立索引失败: ' + (err.message || '未知错误'))
      } finally {
        this.aiIndexing = false
      }
    },
    async doAiSearch() {
      if (!this.aiSearchKeyword.trim()) return
      this.aiSearching = true
      this.aiSearchMsg = ''
      try {
        // 本地模型还没加载过的话，就地下载，不用先切去设置页——
        // 进度直接显示在搜索结果上方，下载完接着自动搜索
        if (this.aiConfig.provider === 'local' && this.aiLocalModelStatus !== 'ready') {
          this.aiLocalModelStatus = 'loading'
          this.aiSearchMsg = '首次使用需要下载本地模型，请稍候...'
          try {
            await preloadLocalModel(this.aiConfig.localModel, (event) => {
              if (!event) return
              if (event.status === 'progress' && event.file) {
                const pct = event.progress ? event.progress.toFixed(0) : '0'
                this.aiSearchMsg = `下载模型中 ${event.file}：${pct}%`
              }
            })
            this.aiLocalModelStatus = 'ready'
            this.aiSearchMsg = ''
          } catch (err) {
            this.aiLocalModelStatus = 'error'
            this.aiSearchMsg = '模型加载失败: ' + (err.message || '未知错误')
            return
          }
        }
        this.aiSearchResults = await semanticSearch(this.aiSearchKeyword, 10)
        if (!this.aiSearchResults.length) this.aiSearchMsg = '没有匹配结果，先确认已经建立过索引'
      } catch (err) {
        this.aiSearchMsg = '搜索失败: ' + (err.message || '未知错误')
        this.aiSearchResults = []
      } finally {
        this.aiSearching = false
      }
    },
    openAiResult(r) {
      if (r.kind === 'note') {
        this.pendingOpenNoteId = r.noteId
        this.activeTab = 'notes'
        return
      }
      const doc = this.docs.find(d => d.id === r.docId)
      if (!doc) {
        alert('原文档不存在，可能已被删除，建议重建索引')
        return
      }
      this.activeTab = 'kb'
      this.openDoc(doc)
    },
    // 结果分数分档，用于结果卡片的颜色深浅
    aiScoreTier(score) {
      if (score >= 0.6) return 'high'
      if (score >= 0.4) return 'mid'
      return 'low'
    },
    applySwUpdate() {
      const sw = window.__swUpdate?.worker
      if (sw) {
        sw.postMessage({ type: 'SKIP_WAITING' })
        // controllerchange 事件会自动刷新页面
      }
      this.moreMenuOpen = false
    },
    async checkSwUpdate() {
      this.swCheckMsg = '检查中...'
      try {
        const reg = await navigator.serviceWorker?.getRegistration()
        if (reg) {
          await reg.update()
          // 等一小会儿让 SW 有时间下载
          await new Promise(r => setTimeout(r, 1500))
          if (window.__swUpdate?.available || reg.waiting) {
            this.swUpdateAvailable = true
            this.swCheckMsg = ''
          } else {
            this.swCheckMsg = '已是最新版本'
          }
        } else {
          this.swCheckMsg = 'SW 未注册'
        }
      } catch (e) {
        this.swCheckMsg = '检查失败: ' + e.message
      }
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
        // 为新导入的文档创建初始版本
        for (const doc of this.docs) {
          if (importedDocs.some(d => d.name === doc.name)) {
            const versions = await listDocVersions(doc.id)
            if (versions.length === 0) {
              await saveDocVersion(doc, '初始导入')
            }
            // 自动建索引，不等待完成（后台静默进行，不卡住导入流程）
            this.autoIndexDoc(doc)
          }
        }
        await this.refreshStorageInfo()
      }
    },
    async parseFile(file) {
      const lowerName = String(file.name || '').toLowerCase()
      if (lowerName.endsWith('.docx')) return this.parseDocx(file)
      if (lowerName.endsWith('.xlsx')) return this.parseXlsx(file)
      if (lowerName.endsWith('.pdf')) return this.parsePdf(file)
      if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) return this.parseHtml(file)
      if (lowerName.endsWith('.md')) return this.parseMarkdown(file)
      if (lowerName.endsWith('.txt')) return this.parseTxt(file)
      throw new Error('仅支持 .docx、.xlsx、.pdf、.html、.md 和 .txt')
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
    async parseMarkdown(file) {
      const rawText = await file.text()
      const contentHtml = marked(rawText)
      return {
        name: file.name,
        type: 'md',
        size: file.size,
        contentHtml: contentHtml || '<p>文档为空</p>',
        contentText: rawText.trim(),
        sheets: [],
        parseWarnings: []
      }
    },
    async parseTxt(file) {
      const rawText = await file.text()
      const escaped = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return {
        name: file.name,
        type: 'txt',
        size: file.size,
        contentHtml: '<pre class="txt-content">' + escaped + '</pre>',
        contentText: rawText.trim(),
        sheets: [],
        parseWarnings: []
      }
    },
    async parseHtml(file) {
      const rawHtml = await file.text()
      // 提取纯文本用于列表搜索
      const tmp = document.createElement('div')
      tmp.innerHTML = rawHtml
      const contentText = tmp.textContent || tmp.innerText || ''
      // contentHtml 保存完整原始 HTML，供 iframe srcdoc 渲染
      return {
        name: file.name,
        type: 'html',
        size: file.size,
        contentHtml: rawHtml || '<p>文档为空</p>',
        contentText: contentText.trim(),
        sheets: [],
        parseWarnings: []
      }
    },
    escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },
    async openDoc(doc) {
      this.activeDocId = doc.id
      this.syncActiveSheet()
      this.readerOpen = true
      this.selectionPopup = null
      this.startReadingTimer()
      await setKnowledgeMeta('lastOpenedDocId', doc.id)
      this.restoreBookmark()
      this.loadLinkedNotes(doc.id)
    },
    closeReader() {
      if (this.editMode) {
        if (!confirm('正在编辑中，确定退出？')) return
        this.editMode = false
        this.editContent = ''
      }
      this.stopTTSIfNeeded()
      this.autoSaveBookmark()
      this.stopReadingTimer()
      this.selectionPopup = null
      this.readerOpen = false
      this.clearReaderSearch()
      this.readerProgress = 0
      this.linkedNotesPanelOpen = false
      this.linkedNotes = []
    },
    goDoc(doc) {
      if (!doc) return
      this.clearReaderSearch()
      this.readerProgress = 0
      this.activeDocId = doc.id
      this.syncActiveSheet()
      this.loadLinkedNotes(doc.id)
      this.$nextTick(() => {
        this.$refs.readerBody?.scrollTo({ top: 0 })
      })
    },
    onReaderScroll() {
      const el = this.$refs.readerBody
      if (!el) return
      const { scrollTop, scrollHeight, clientHeight } = el
      this.readerProgress = scrollHeight > clientHeight
        ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        : 0
      // 自动保存阅读位置（防抖 2 秒）
      clearTimeout(this.bookmarkSaveTimer)
      this.bookmarkSaveTimer = setTimeout(() => this.autoSaveBookmark(), 2000)
    },
    async autoSaveBookmark() {
      if (!this.activeDocId) return
      const el = this.$refs.readerBody
      if (!el || el.scrollTop < 10) return
      const ratio = el.scrollHeight > el.clientHeight
        ? el.scrollTop / (el.scrollHeight - el.clientHeight)
        : 0
      this.bookmarks[this.activeDocId] = {
        scrollRatio: ratio,
        progress: this.readerProgress,
        updatedAt: Date.now()
      }
      await setKnowledgeMeta('bookmarks', this.bookmarks)
    },
    async saveBookmark() {
      if (!this.activeDocId) return
      const el = this.$refs.readerBody
      const ratio = el && el.scrollHeight > el.clientHeight
        ? el.scrollTop / (el.scrollHeight - el.clientHeight)
        : 0
      this.bookmarks[this.activeDocId] = {
        scrollRatio: ratio,
        progress: this.readerProgress,
        updatedAt: Date.now()
      }
      await setKnowledgeMeta('bookmarks', this.bookmarks)
      this.bookmarkToast = '书签已保存'
      setTimeout(() => { this.bookmarkToast = '' }, 1500)
    },
    async removeBookmark(docId) {
      delete this.bookmarks[docId]
      await setKnowledgeMeta('bookmarks', this.bookmarks)
    },
    async restoreBookmark() {
      const bm = this.bookmarks[this.activeDocId]
      if (!bm) return
      await this.$nextTick()
      const el = this.$refs.readerBody
      if (!el) return
      const target = bm.scrollRatio * (el.scrollHeight - el.clientHeight)
      el.scrollTo({ top: target })
    },
    scrollReaderTop() {
      this.$refs.readerBody?.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onHtmlIframeLoad() {
      // 自动调整 iframe 高度以适应内容
      try {
        const iframe = this.$refs.htmlIframe
        if (!iframe) return
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          const h = doc.documentElement.scrollHeight || doc.body.scrollHeight
          iframe.style.height = h + 'px'
        }
      } catch (e) { /* 跨域限制时忽略 */ }
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
      const confirmed = window.confirm(`将”${doc.name}”移入回收站？`)
      if (!confirmed) return
      this.readerOpen = false
      // 移入回收站（保存精简版，不含完整 contentHtml 以节省空间）
      this.trashDocs.push({
        id: doc.id, name: doc.name, type: doc.type, size: doc.size,
        createdAt: doc.createdAt, deletedAt: Date.now()
      })
      if (this.trashDocs.length > 100) this.trashDocs = this.trashDocs.slice(-100)
      await setKnowledgeMeta('trashDocs', this.trashDocs)
      await setKnowledgeMeta('trashDoc_' + doc.id, doc)
      await removeKnowledgeDoc(doc.id)
      await removeDocIndex(doc.id)
      await this.reloadDocs()
      await this.refreshStorageInfo()
    },
    async restoreFromTrash(item) {
      const fullDoc = await getKnowledgeMeta('trashDoc_' + item.id)
      if (!fullDoc) { alert('回收站数据已丢失'); return }
      await saveKnowledgeDocs([fullDoc])
      this.trashDocs = this.trashDocs.filter(d => d.id !== item.id)
      await setKnowledgeMeta('trashDocs', this.trashDocs)
      await setKnowledgeMeta('trashDoc_' + item.id, null)
      await this.reloadDocs()
      await this.refreshStorageInfo()
      this.autoIndexDoc(fullDoc)
    },
    async permanentDeleteTrash(item) {
      if (!window.confirm(`永久删除”${item.name}”？此操作不可恢复。`)) return
      this.trashDocs = this.trashDocs.filter(d => d.id !== item.id)
      await setKnowledgeMeta('trashDocs', this.trashDocs)
      await setKnowledgeMeta('trashDoc_' + item.id, null)
      await removeDocIndex(item.id)
    },
    async emptyTrash() {
      if (!window.confirm('清空回收站？所有文档将永久删除。')) return
      for (const item of this.trashDocs) {
        await setKnowledgeMeta('trashDoc_' + item.id, null)
        await removeDocIndex(item.id)
      }
      this.trashDocs = []
      await setKnowledgeMeta('trashDocs', [])
    },
    async clearAllDocs() {
      const confirmed = window.confirm('确定清空全部知识库文档吗？文档将移入回收站。')
      if (!confirmed) return
      for (const doc of this.docs) {
        this.trashDocs.push({
          id: doc.id, name: doc.name, type: doc.type, size: doc.size,
          createdAt: doc.createdAt, deletedAt: Date.now()
        })
        await setKnowledgeMeta('trashDoc_' + doc.id, doc)
        await removeDocIndex(doc.id)
      }
      if (this.trashDocs.length > 100) this.trashDocs = this.trashDocs.slice(-100)
      await setKnowledgeMeta('trashDocs', this.trashDocs)
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
    formatTimeAgo(ts) {
      if (!ts) return ''
      const diff = Date.now() - ts
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return '刚刚'
      if (mins < 60) return `${mins}分钟前`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${hours}小时前`
      const days = Math.floor(hours / 24)
      if (days < 30) return `${days}天前`
      return this.formatDate(ts)
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
    toggleAutoBackup() {
      localStorage.setItem('kb-auto-backup', this.autoBackupEnabled)
      if (this.autoBackupEnabled) {
        this._setupAutoBackup()
        // 首次开启时如果从未备份过，立即执行一次
        if (!this.lastAutoBackupTs) this._doAutoBackup()
      } else {
        this._teardownAutoBackup()
        this.backupOverdue = false
      }
    },
    onBackupIntervalChange() {
      localStorage.setItem('kb-auto-backup-interval', this.autoBackupInterval)
      this._checkBackupOverdue()
      if (this.autoBackupEnabled) {
        this._setupAutoBackup()
      }
    },
    _setupAutoBackup() {
      this._teardownAutoBackup()
      // 定时检查（每分钟检查一次是否到期）
      this._backupTimer = setInterval(() => {
        if (this.autoBackupEnabled && this._isBackupDue()) {
          this._doAutoBackup()
        }
      }, 60 * 1000)
      // 页面恢复可见时也检查
      this._visibilityHandler = () => {
        if (document.visibilityState === 'visible' && this.autoBackupEnabled) {
          this._checkBackupOverdue()
          if (this._isBackupDue()) this._doAutoBackup()
        }
      }
      document.addEventListener('visibilitychange', this._visibilityHandler)
    },
    _teardownAutoBackup() {
      if (this._backupTimer) { clearInterval(this._backupTimer); this._backupTimer = null }
      if (this._visibilityHandler) {
        document.removeEventListener('visibilitychange', this._visibilityHandler)
        this._visibilityHandler = null
      }
    },
    _isBackupDue() {
      if (!this.lastAutoBackupTs) return true
      const elapsed = Date.now() - this.lastAutoBackupTs
      return elapsed >= this.autoBackupInterval * 60 * 60 * 1000
    },
    _checkBackupOverdue() {
      if (!this.autoBackupEnabled || !this.lastAutoBackupTs) {
        this.backupOverdue = false
        return
      }
      this.backupOverdue = this._isBackupDue()
    },
    async _doAutoBackup() {
      try {
        const data = await exportAllData()
        const json = JSON.stringify(data)
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kb-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        const now = Date.now()
        const timeStr = new Date(now).toLocaleString('zh-CN')
        this.lastAutoBackupTime = timeStr
        this.lastAutoBackupTs = now
        this.backupOverdue = false
        localStorage.setItem('kb-last-backup-time', timeStr)
        localStorage.setItem('kb-last-backup-ts', String(now))
      } catch (e) {
        console.error('[auto-backup]', e)
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
