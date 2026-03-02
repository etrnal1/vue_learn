<template>
  <div class="wiki-page">
    <div class="wiki-hero panel">
      <div>
        <h2>维基知识中心</h2>
        <p>像维基百科一样组织你的知识：检索、编辑、追溯、协作。</p>
      </div>
      <div class="hero-stats">
        <span class="stat">词条 {{ articles.length }}</span>
        <span class="stat">收藏 {{ starredCount }}</span>
        <span class="stat">总浏览 {{ totalViews }}</span>
      </div>
    </div>

    <div class="wiki-toolbar panel">
      <input v-model.trim="searchQuery" class="input" placeholder="搜索标题 / 摘要 / 标签 / 正文...">
      <select v-model="categoryFilter" class="input">
        <option value="all">全部分类</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="sortBy" class="input">
        <option value="recent">最近更新</option>
        <option value="popular">浏览最多</option>
        <option value="title">标题 A-Z</option>
      </select>
      <label class="check"><input v-model="onlyStarred" type="checkbox"> 仅收藏</label>
      <button class="btn btn-primary" @click="createArticle">新建词条</button>
      <button class="btn" @click="openRandomArticle">随机词条</button>
      <button class="btn" :disabled="importingDoc" @click="triggerDocImport">{{ importingDoc ? '导入中...' : '导入文档' }}</button>
      <button class="btn" @click="showPalette = !showPalette">{{ showPalette ? '收起色卡' : '色卡' }}</button>
      <button class="btn" @click="exportJson">导出JSON</button>
      <button class="btn" @click="exportCsv">导出CSV</button>
      <button class="btn" @click="triggerImportJson">导入JSON</button>
      <button class="btn" @click="triggerImportCsv">导入CSV</button>
      <input ref="docImportRef" class="hidden-input" type="file" accept=".md,.markdown,.txt,.doc,.docx,.pdf" @change="importDocumentToDraft">
      <input ref="importRefJson" class="hidden-input" type="file" accept="application/json" @change="importJson">
      <input ref="importRefCsv" class="hidden-input" type="file" accept=".csv,text/csv" @change="importCsv">
      <div class="import-log-wrap">
        <div class="import-log-head">
          <strong>导入日志</strong>
          <button class="btn btn-sm" @click="clearImportLogs">清空</button>
        </div>
        <div class="import-log-panel">
          <div v-if="importLogs.length === 0" class="import-log-empty">暂无导入日志</div>
          <div v-for="log in importLogs" :key="log.id" class="import-log-line" :class="`lv-${log.level}`">
            <span class="time">{{ formatDate(log.time) }}</span>
            <span class="msg">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPalette" class="palette-panel panel">
      <div class="palette-head">
        <h3>色卡</h3>
        <span class="meta">点击颜色复制 HEX</span>
      </div>
      <div class="palette-groups">
        <section v-for="group in paletteGroups" :key="group.name" class="palette-group">
          <h4>{{ group.name }}</h4>
          <div class="swatches">
            <button
              v-for="color in group.colors"
              :key="`${group.name}_${color}`"
              class="swatch"
              :style="{ background: color }"
              :title="color"
              @click="copyColor(color)"
            >
              <span class="swatch-code">{{ color }}</span>
            </button>
          </div>
        </section>
      </div>
    </div>

    <div class="wiki-layout" :class="{ 'focus-reading': focusMode, 'reading-mode': viewTab === 'read', 'reader-fullscreen': readerFullscreen }">
      <aside v-show="!isMobile || !mobileReadMode" class="panel list-panel">
        <h3>词条列表</h3>
        <div v-if="filteredArticles.length === 0" class="empty">没有匹配词条</div>
        <div v-else ref="articleListRef" class="article-list" @scroll.passive="onArticleListScroll">
          <div :style="{ height: `${virtualArticlePaddingTop}px` }"></div>
          <article
            v-for="item in virtualDisplayedArticles"
            :key="item.id"
            class="article-item"
            :class="{ active: item.id === activeArticleId }"
            :data-article-id="item.id"
            @click="openArticle(item.id)"
          >
            <div class="item-head">
              <h4>{{ item.title }}</h4>
              <div class="item-actions">
                <button class="star-btn" @click.stop="toggleStar(item)">{{ item.starred ? '★' : '☆' }}</button>
                <button class="btn btn-sm btn-danger-inline" @click.stop="requestRemoveArticle(item.id)">删</button>
              </div>
            </div>
            <div class="meta">
              <span>{{ item.category || '未分类' }}</span>
              <span>·</span>
              <span>{{ item.views }} 浏览</span>
              <span>·</span>
              <span>{{ formatDate(item.updatedAt) }}</span>
            </div>
            <p class="summary">{{ item.summary || '暂无摘要' }}</p>
            <div v-if="item.tags.length" class="tags">
              <span v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
          </article>
          <div :style="{ height: `${virtualArticlePaddingBottom}px` }"></div>
        </div>
      </aside>

      <section ref="contentPanelRef" class="panel content-panel">
        <div v-if="!activeArticle" class="empty">
          请先选择词条，或点击“新建词条”。
        </div>

        <template v-else>
          <div class="content-head">
            <div>
              <h3>{{ activeArticle.title }}</h3>
              <div class="meta">
                <span>{{ activeArticle.category || '未分类' }}</span>
                <span>·</span>
                <span>{{ activeArticle.views }} 浏览</span>
                <span>·</span>
                <span>更新于 {{ formatDate(activeArticle.updatedAt) }}</span>
              </div>
            </div>
            <div class="head-actions">
              <button v-if="isMobile && mobileReadMode" class="btn" @click="backToList">返回列表</button>
              <button class="btn" @click="viewTab = 'read'">阅读</button>
              <button class="btn" @click="startEdit">编辑</button>
              <button v-if="viewTab === 'read' && !isMobile" class="btn" @click="toggleReadRail">
                {{ hideReadRail ? '显示侧栏' : '隐藏侧栏' }}
              </button>
              <button
                v-if="viewTab === 'read' && !isMobile && !hideReadRail && !focusMode && (activeArticle?.annotations?.length > 0)"
                class="btn"
                @click="annotationRailOnly = !annotationRailOnly"
              >
                {{ annotationRailOnly ? '显示目录+批注' : '仅看批注栏' }}
              </button>
              <button class="btn" @click="locateActiveArticle">定位词条</button>
              <button v-if="viewTab === 'read'" class="btn" @click="toggleFocusMode">
                {{ focusMode ? '退出沉浸' : '沉浸阅读' }}
              </button>
              <button v-if="viewTab === 'read'" class="btn" @click="toggleReaderFullscreen">
                {{ readerFullscreen ? '退出全屏' : '全屏学习' }}
              </button>
              <button v-if="viewTab === 'read'" class="btn" @click="quickAnnotateMode = !quickAnnotateMode">
                {{ quickAnnotateMode ? '关闭快批' : '段落快批' }}
              </button>
              <button class="btn" @click="openPublishForm">发布版本</button>
              <button class="btn" @click="viewTab = 'history'">历史</button>
              <button class="btn" @click="viewTab = 'timeline'">时间轴</button>
              <button class="btn" @click="viewTab = 'discuss'">讨论</button>
              <button v-if="isMobile && viewTab === 'read' && toc.length" class="btn" @click="toggleMobileToc">
                {{ showMobileToc ? '收起目录' : '目录' }}
              </button>
              <button
                v-if="isMobile && viewTab === 'read' && (activeArticle?.annotations?.length || 0) > 0"
                class="btn"
                @click="toggleMobileAnnotationList"
              >
                {{ showMobileAnnotationList ? '收起批注' : `批注(${activeArticle.annotations.length})` }}
              </button>
              <button class="btn btn-danger" @click="requestRemoveArticle(activeArticle.id)">删除</button>
            </div>
          </div>
          <div v-if="deleteConfirmVisible && deleteTargetArticle" class="delete-form-panel">
            <div class="delete-form-title">谨慎删除确认</div>
            <p class="delete-form-tip">
              即将删除：<strong>{{ deleteTargetArticle.title }}</strong>。此操作不可恢复，请输入完整标题后再确认。
            </p>
            <input
              v-model.trim="deleteConfirmInput"
              class="input"
              :placeholder="`输入：${deleteTargetArticle.title}`"
            >
            <div class="actions">
              <button class="btn btn-danger" :disabled="!canConfirmDelete" @click="confirmRemoveArticle">确认删除</button>
              <button class="btn" @click="cancelRemoveArticle">取消</button>
            </div>
          </div>
          <div v-if="publishFormVisible && viewTab === 'read'" class="publish-form-panel">
            <div class="publish-form-title">发布版本</div>
            <div class="form-group">
              <label>发布说明</label>
              <textarea
                v-model.trim="publishFormNote"
                class="input"
                rows="3"
                placeholder="请输入本次发布说明（可选）"
              ></textarea>
            </div>
            <div class="actions">
              <button class="btn btn-primary" @click="publishCurrentVersion">确认发布</button>
              <button class="btn" @click="cancelPublishForm">取消</button>
            </div>
          </div>

          <div v-if="viewTab === 'read'" class="read-area">
            <div class="read-layout" :class="{ 'compact-rail': hideReadRail || focusMode, 'annotation-only': annotationRailOnly }">
              <div class="read-main">
                <div v-if="isMobile" class="mobile-read-tools">
                  <button class="btn btn-sm" @click="adjustReaderFont(-1)">A-</button>
                  <span class="tool-stat">字号 {{ readerFontSize }}px</span>
                  <button class="btn btn-sm" @click="adjustReaderFont(1)">A+</button>
                  <button class="btn btn-sm" @click="adjustReaderLineHeight(-0.05)">紧凑</button>
                  <button class="btn btn-sm" @click="adjustReaderLineHeight(0.05)">舒展</button>
                  <button class="btn btn-sm btn-primary" @click="annotateCurrentParagraphOnMobile">当前段落批注</button>
                  <select v-model="annotationViewMode" class="input reader-select">
                    <option value="all">批注: 全部</option>
                    <option value="highlight">批注: 仅高亮</option>
                    <option value="note">批注: 仅旁注</option>
                  </select>
                  <button class="btn btn-sm" @click="quickAnnotateMode = !quickAnnotateMode">
                    {{ quickAnnotateMode ? '关闭快批' : '段落快批' }}
                  </button>
                </div>
                <ArticleReaderModule
                  :query="inPageQuery"
                  :hit-count="inPageMatches.length"
                  :can-navigate="inPageMatches.length > 0"
                  :visible="readerModuleVisible"
                  @update:query="inPageQuery = $event"
                  @prev="jumpToPrevInPageMatch"
                  @next="jumpToNextInPageMatch"
                  @top="jumpReaderToTop"
                  @bottom="jumpReaderToBottom"
                  @toggle-visible="readerModuleVisible = $event"
                >
                  <template #extra>
                    <select v-model="annotationViewMode" class="input inpage-select">
                      <option value="all">全部批注</option>
                      <option value="highlight">仅高亮</option>
                      <option value="note">仅旁注</option>
                    </select>
                  </template>
                </ArticleReaderModule>
                <p v-if="activeArticle.summary" class="lead">{{ activeArticle.summary }}</p>
                <div
                  :class="['markdown', `ann-view-${annotationViewMode}`]"
                  :style="readerStyle"
                  v-html="renderedHtml"
                  @click="handleMarkdownClickForQuickAnnotate"
                  @mouseup="captureSelectionForAnnotation"
                  @touchend.passive="captureSelectionForAnnotation"
                ></div>
                <button
                  v-if="annotationSelection.text && !isMobile && !showAnnotationComposer"
                  class="annotation-fab"
                  :style="annotationFabStyle"
                  @click="openAnnotationComposer"
                >
                  添加批注
                </button>
                <div v-if="annotationSelection.text && !isMobile && showAnnotationComposer" class="annotation-composer">
                  <div class="annotation-quote">{{ annotationSelection.text }}</div>
                  <div class="annotation-color-row">
                    <button
                      v-for="color in annotationColors"
                      :key="`desktop-${color.value}`"
                      type="button"
                      class="annotation-color-btn"
                      :class="[`is-${color.value}`, { active: annotationColor === color.value }]"
                      @click="annotationColor = color.value"
                    >
                      {{ color.label }}
                    </button>
                  </div>
                  <textarea
                    ref="annotationInputRef"
                    v-model.trim="annotationDraft"
                    class="input annotation-input"
                    rows="3"
                    placeholder="输入批注内容（可选）"
                  ></textarea>
                  <div class="actions">
                    <button class="btn btn-primary btn-sm" @click="saveAnnotation">高亮并批注</button>
                    <button class="btn btn-sm" @click="clearAnnotationComposer">取消</button>
                  </div>
                </div>
                <p v-if="annotationSavedAt" class="annotation-saved-tip">批注已保存：{{ formatDate(annotationSavedAt) }}</p>
                <div v-if="isMobile && activeArticle.annotations?.length" class="mobile-inline-annotations">
                  <div class="mobile-inline-annotations__head">
                    <h4>相关批注</h4>
                    <span class="meta">{{ activeArticle.annotations.length }} 条</span>
                  </div>
                  <div class="mobile-inline-annotations__list">
                    <button
                      v-for="item in activeArticle.annotations"
                      :key="`mobile-inline-ann-${item.id}`"
                      type="button"
                      class="mobile-inline-annotations__item"
                      @click="openMobileAnnotationOverview(item.id)"
                    >
                      <span class="annotation-color-dot" :class="`dot-${item.color || 'yellow'}`"></span>
                      <span class="mobile-inline-annotations__quote">{{ item.quote }}</span>
                      <span class="mobile-inline-annotations__note">{{ item.note || '仅高亮' }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <aside v-if="!(hideReadRail || focusMode) && (toc.length > 0 || (activeArticle.annotations?.length > 0) || inPageQuery)" class="inline-toc">
                <div v-if="toc.length > 0 && !annotationRailOnly" class="inline-panel-section">
                  <h4>章节目录</h4>
                  <div class="toc-list">
                    <a
                      v-for="item in toc"
                      :key="item.id"
                      class="toc-item"
                      :style="{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }"
                      @click="jumpToHeading(item.id)"
                    >
                      {{ item.text }}
                    </a>
                  </div>
                </div>

                <div v-if="activeArticle.annotations?.length" class="inline-panel-section annotation-rail-section">
                  <h4>批注栏（Word风格）</h4>
                  <div class="annotation-list annotation-list--rail annotation-list--word">
                    <article
                      v-for="(item, idx) in activeArticle.annotations"
                      :key="item.id"
                      class="annotation-item"
                      :data-ann-row-id="item.id"
                      role="button"
                      tabindex="0"
                      @click="jumpToAnnotation(item.id)"
                      @keyup.enter="jumpToAnnotation(item.id)"
                    >
                      <div class="annotation-body">
                        <div class="annotation-topline">
                          <button class="annotation-jump" @click.stop="jumpToAnnotation(item.id)">定位</button>
                          <span class="annotation-index">#{{ idx + 1 }}</span>
                          <p class="annotation-status" :class="`status-${item.status || 'open'}`">
                            {{ (item.status || 'open') === 'resolved' ? '已解决' : '待处理' }}
                          </p>
                          <p v-if="!renderedAnnotationIds.has(String(item.id))" class="annotation-locate-tip">待定位</p>
                        </div>
                        <div class="annotation-inline-row">
                          <span class="annotation-color-dot" :class="`dot-${item.color || 'yellow'}`"></span>
                          <span class="annotation-mini annotation-mini--quote" :title="item.quote">{{ item.quote }}</span>
                          <span class="annotation-mini annotation-mini--note" :title="item.note || '仅高亮'">
                            {{ item.note || '仅高亮' }}
                          </span>
                        </div>
                        <p class="meta">创建于 {{ formatDate(item.createdAt) }}</p>
                        <div v-if="item.replies?.length" class="annotation-replies">
                          <article v-for="reply in item.replies" :key="reply.id" class="annotation-reply">
                            <p class="meta">{{ reply.author }} · {{ formatDate(reply.createdAt) }}</p>
                            <p>{{ reply.text }}</p>
                          </article>
                        </div>
                        <div class="annotation-reply-editor">
                          <input
                            v-model.trim="annotationReplyDrafts[item.id]"
                            class="input"
                            placeholder="回复此批注..."
                            @click.stop
                            @keyup.enter="addAnnotationReply(item.id)"
                          >
                        </div>
                      </div>
                      <div class="annotation-side-actions">
                        <button class="btn btn-sm" @click.stop="toggleAnnotationStatus(item.id)">
                          {{ (item.status || 'open') === 'resolved' ? '重开' : '解决' }}
                        </button>
                        <button class="btn btn-sm" @click.stop="addAnnotationReply(item.id)">回复</button>
                        <button class="btn btn-sm" @click.stop="removeAnnotation(item.id)">删除</button>
                      </div>
                    </article>
                  </div>
                </div>

                <div v-if="inPageQuery && !annotationRailOnly" class="inline-panel-section">
                  <h4>检索结果</h4>
                  <div v-if="inPageMatches.length === 0" class="empty mini">未命中正文内容</div>
                  <div v-else class="toc-list">
                    <button
                      v-for="(hit, idx) in inPageMatches"
                      :key="hit.id"
                      class="toc-item hit-item"
                      :class="{ active: idx === inPageActiveIndex }"
                      @click="jumpToInPageMatch(idx)"
                    >
                      {{ hit.preview }}
                    </button>
                  </div>
                </div>

                <div
                  v-if="(toc.length === 0 || annotationRailOnly) && (!activeArticle.annotations || activeArticle.annotations.length === 0)"
                  class="empty mini"
                >
                  暂无目录和批注
                </div>
              </aside>
            </div>
            <div class="reader-jump-tools">
              <button class="btn btn-sm" @click="jumpReaderToTop">页首</button>
              <button class="btn btn-sm" @click="jumpReaderToBottom">页尾</button>
            </div>
          </div>

            <div v-if="viewTab === 'edit'" class="edit-area">
              <div class="form-group">
                <label>标题 *</label>
                <input v-model.trim="draft.title" class="input" placeholder="输入词条标题">
              </div>
            <div class="form-group">
              <label>摘要</label>
              <input v-model.trim="draft.summary" class="input" placeholder="一句话摘要">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>分类</label>
                <input v-model.trim="draft.category" class="input" placeholder="技术 / 历史 / 产品">
              </div>
              <div class="form-group">
                <label>标签（逗号分隔）</label>
                <input v-model.trim="draft.tagsText" class="input" placeholder="vue, javascript, web">
              </div>
            </div>
              <div class="form-group">
                <label>正文（支持基础 Markdown）</label>
                <textarea v-model="draft.content" class="input content-input" rows="14" placeholder="# 标题\n\n- 要点 A\n- 要点 B"></textarea>
              </div>
              <div class="form-group">
                <label>版本说明（会写入历史）</label>
                <input v-model.trim="editVersionNote" class="input" placeholder="例如：补充示例，修正文案，发布到 v3">
              </div>
              <div class="form-group">
                <label>图片上传（可预览并插入正文）</label>
                <input class="input" type="file" accept="image/*" multiple @change="handleImageUpload">
              </div>
              <div v-if="draftImages.length" class="image-preview-list">
              <article v-for="item in draftImages" :key="item.id" class="image-preview-card">
                <img :src="item.url" :alt="item.name" class="image-preview" loading="lazy" decoding="async">
                <div class="image-preview-actions">
                  <button class="btn btn-sm btn-primary" @click="insertImageToDraft(item)">插入正文</button>
                  <button class="btn btn-sm" @click="removeDraftImage(item.id)">移除</button>
                </div>
              </article>
            </div>
            <div v-if="draftSavedAt" class="draft-tip">草稿已自动保存：{{ formatDate(draftSavedAt) }}</div>
            <div class="actions">
              <button class="btn btn-primary" @click="saveDraft">保存词条</button>
              <button class="btn" @click="saveDraft({ publish: true })">保存并发布版本</button>
              <button class="btn" @click="cancelEdit">取消</button>
            </div>
          </div>

          <div v-if="viewTab === 'history'" class="history-area">
            <div class="history-filter-bar">
              <label>历史筛选</label>
              <select v-model="historyFilter" class="input history-filter-select">
                <option value="all">全部</option>
                <option value="publish">仅发布</option>
                <option value="edit">仅编辑</option>
              </select>
              <span class="meta">共 {{ filteredHistory.length }} 条</span>
            </div>
            <div v-if="!filteredHistory.length" class="empty">暂无符合筛选条件的历史版本</div>
            <div v-else class="history-list">
              <article v-for="ver in filteredHistory" :key="ver.id" class="history-item">
                <div>
                  <strong>{{ ver.label || '未命名版本' }} · {{ formatDate(ver.updatedAt) }}</strong>
                  <div class="meta">
                    <span>{{ ver.note || ver.summary || '无备注' }}</span>
                    <span v-if="ver.action"> · {{ ver.action === 'publish' ? '发布' : '编辑' }}</span>
                    <span v-if="ver.publishedAt"> · 已发布</span>
                  </div>
                </div>
                <div class="history-actions">
                  <button class="btn btn-sm" @click="previewVersionDiff(ver.id)">查看对比</button>
                  <button class="btn btn-sm" @click="rollbackVersion(ver.id)">回滚到此版本</button>
                </div>
              </article>
            </div>
            <div v-if="versionDiffPreview" class="diff-panel">
              <h4>版本对比预览</h4>
              <pre class="diff-pre">{{ versionDiffPreview }}</pre>
            </div>
          </div>

          <div v-if="viewTab === 'timeline'" class="timeline-area">
            <div v-if="timelineEvents.length === 0" class="empty">暂无时间轴数据</div>
            <div v-else class="timeline-list">
              <article v-for="event in timelineEvents" :key="event.id" class="timeline-item">
                <div class="timeline-dot" :class="{ update: event.type === 'update' }"></div>
                <div class="timeline-main">
                  <div class="meta">{{ formatDate(event.time) }} · {{ event.type === 'create' ? '创建' : '更新' }}</div>
                  <button class="timeline-link" @click="openArticle(event.articleId)">{{ event.title }}</button>
                  <p v-if="event.summary" class="summary">{{ event.summary }}</p>
                </div>
              </article>
            </div>
          </div>

          <div v-if="viewTab === 'discuss'" class="discussion-area">
            <div class="form-group">
              <label>评论作者</label>
              <input v-model.trim="commentAuthor" class="input" placeholder="例如：张三">
            </div>
            <div class="form-group">
              <label>新增讨论</label>
              <textarea v-model.trim="commentText" class="input" rows="3" placeholder="写下你的补充、问题或修订建议"></textarea>
            </div>
            <div class="actions">
              <button class="btn btn-primary" @click="addComment">提交讨论</button>
            </div>
            <div v-if="!activeArticle.comments.length" class="empty">暂无讨论</div>
            <div v-else class="comment-list">
              <article v-for="comment in activeArticle.comments" :key="comment.id" class="comment-item">
                <div class="comment-head">
                  <div class="meta">{{ comment.author }} · {{ formatDate(comment.createdAt) }}</div>
                  <button class="btn btn-sm" @click="removeComment(comment.id)">删除</button>
                </div>
                <p>{{ comment.text }}</p>
              </article>
            </div>
          </div>
        </template>
      </section>

      <aside v-show="!isMobile || !mobileReadMode" class="panel side-panel">
        <div class="widget">
          <h3>相关文章</h3>
          <div v-if="relatedArticles.length === 0" class="empty mini">暂无推荐</div>
          <div v-else class="related-list">
            <button v-for="item in relatedArticles" :key="item.id" class="related-item" @click="openArticle(item.id)">
              {{ item.title }}
            </button>
          </div>
        </div>

        <div class="widget">
          <h3>最近浏览</h3>
          <div v-if="recentArticles.length === 0" class="empty mini">暂无记录</div>
          <div v-else class="recent-list">
            <button v-for="item in recentArticles" :key="item.id" class="related-item" @click="openArticle(item.id)">
              {{ item.title }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="isMobile && showMobileToc" class="mobile-toc-mask" @click="showMobileToc = false"></div>
    <aside v-if="isMobile" class="mobile-toc-drawer panel" :class="{ open: showMobileToc }">
      <div class="mobile-toc-head">
        <h3>章节目录</h3>
        <button class="btn btn-sm" @click="showMobileToc = false">关闭</button>
      </div>
      <div v-if="toc.length === 0" class="empty mini">当前词条无目录</div>
      <div v-else class="toc-list">
        <a
          v-for="item in toc"
          :key="item.id"
          class="toc-item"
          :style="{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }"
          @click="jumpToHeading(item.id)"
        >
          {{ item.text }}
        </a>
      </div>
    </aside>
    <div v-if="isMobile && showMobileAnnotationList" class="mobile-toc-mask" @click="showMobileAnnotationList = false"></div>
    <aside v-if="isMobile" class="mobile-ann-list-drawer panel" :class="{ open: showMobileAnnotationList }">
      <div class="mobile-toc-head">
        <h3>批注汇总</h3>
        <button class="btn btn-sm" @click="showMobileAnnotationList = false">关闭</button>
      </div>
      <article v-if="activeMobileAnnotation" class="mobile-ann-focus-card">
        <div class="mobile-ann-focus-card__head">
          <strong>当前批注</strong>
          <span class="annotation-status" :class="`status-${activeMobileAnnotation.status || 'open'}`">
            {{ (activeMobileAnnotation.status || 'open') === 'resolved' ? '已解决' : '待处理' }}
          </span>
        </div>
        <p class="mobile-ann-focus-card__quote">{{ activeMobileAnnotation.quote }}</p>
        <p class="mobile-ann-focus-card__note">{{ activeMobileAnnotation.note || '（仅高亮，无文字批注）' }}</p>
      </article>
      <div v-if="!activeArticle?.annotations?.length" class="empty mini">暂无批注</div>
      <div v-else class="annotation-list">
        <article
          v-for="item in activeArticle.annotations"
          :key="`mobile-ann-${item.id}`"
          class="annotation-item"
          :class="{ 'ann-focus-row': String(item.id) === String(mobileActiveAnnotationId) }"
          @click="jumpToAnnotation(item.id, { keepDrawer: true })"
        >
          <div class="annotation-body">
            <p class="annotation-hit">
              <span class="annotation-color-dot" :class="`dot-${item.color || 'yellow'}`"></span>
              {{ item.quote }}
            </p>
            <p class="annotation-note">{{ item.note || '（仅高亮，无文字批注）' }}</p>
          </div>
        </article>
      </div>
    </aside>
    <div v-if="isMobile && annotationSelection.text" class="mobile-annotation-mask" @click="clearAnnotationComposer"></div>
    <aside v-if="isMobile && annotationSelection.text" class="mobile-annotation-drawer panel">
      <div class="mobile-annotation-head">
        <strong>添加批注</strong>
        <button class="btn btn-sm" @click="clearAnnotationComposer">关闭</button>
      </div>
      <p class="annotation-quote">{{ annotationSelection.text }}</p>
      <div class="annotation-color-row">
        <button
          v-for="color in annotationColors"
          :key="`mobile-${color.value}`"
          type="button"
          class="annotation-color-btn"
          :class="[`is-${color.value}`, { active: annotationColor === color.value }]"
          @click="annotationColor = color.value"
        >
          {{ color.label }}
        </button>
      </div>
      <textarea
        v-model.trim="annotationDraft"
        class="input annotation-input"
        rows="3"
        placeholder="输入批注内容（可选）"
      ></textarea>
      <div class="actions">
        <button class="btn btn-primary btn-sm" @click="saveAnnotation">高亮并批注</button>
      </div>
    </aside>
    <div
      v-if="isMobile && viewTab === 'read' && activeArticle && !annotationSelection.text && !showMobileAnnotationList"
      class="mobile-annotation-dock"
    >
      <button class="btn btn-sm" @click="openMobileAnnotationOverview()">
        批注 {{ activeArticle.annotations?.length || 0 }}
      </button>
      <button class="btn btn-primary btn-sm" @click="startMobileQuickAnnotation">添加批注</button>
    </div>
  </div>
</template>

<script>
import { api } from '../utils/api.js'
import { marked } from 'marked'
import ArticleReaderModule from '../components/article/ArticleReaderModule.vue'
import {
  applyAnnotationsToHtml,
  buildHistorySnapshot,
  filterHistoryEntries,
  nextVersionSeq,
  normalizeAnnotations,
  normalizeHistoryEntries
} from '../utils/wikiArticleUtils.js'
import {
  buildInPageMatches,
  findReaderRoot,
  flashElement,
  jumpReaderToBottom,
  jumpReaderToTop,
  jumpToInPageMatch,
  locateListItemById
} from '../utils/readerAssist.js'

const STORAGE_KEY = 'wiki_center_articles_v1'
const STATE_KEY = 'wiki_center_state_v1'
const DRAFT_KEY = 'wiki_center_draft_v1'
const SYNC_META_KEY = 'wiki_center_sync_meta_v1'

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  name: 'WikiCenter',
  components: {
    ArticleReaderModule
  },
  data() {
    return {
      articles: [],
      activeArticleId: null,
      searchQuery: '',
      categoryFilter: 'all',
      sortBy: 'recent',
      onlyStarred: false,
      viewTab: 'read',
      historyFilter: 'all',
      draft: this.emptyDraft(),
      draftSavedAt: null,
      compareVersionId: '',
      commentText: '',
      commentAuthor: '当前用户',
      recentIds: [],
      storageMode: 'unknown',
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
      mobileReadMode: false,
      showMobileToc: false,
      showMobileAnnotationList: false,
      mobileActiveAnnotationId: '',
      mobileSelectionLockUntil: 0,
      importingDoc: false,
      importLogs: [],
      articleListScrollTop: 0,
      articleListViewportHeight: 760,
      articleItemHeight: 232,
      articleRenderBuffer: 6,
      draftImages: [],
      showPalette: false,
      readerFontSize: 15,
      readerLineHeight: 1.8,
      hideReadRail: false,
      annotationRailOnly: true,
      focusMode: false,
      readerFullscreen: false,
      quickAnnotateMode: false,
      editVersionNote: '',
      annotationSelection: {
        text: '',
        anchor: null
      },
      annotationAnchor: {
        x: 24,
        y: 120
      },
      showAnnotationComposer: false,
      annotationDraft: '',
      annotationColor: 'yellow',
      annotationReplyDrafts: {},
      annotationSavedAt: null,
      annotationViewMode: 'all',
      readerModuleVisible: true,
      publishFormVisible: false,
      publishFormNote: '',
      deleteConfirmVisible: false,
      deleteTargetId: null,
      deleteConfirmInput: '',
      inPageQuery: '',
      inPageMatches: [],
      inPageActiveIndex: -1,
      annotationColors: [
        { value: 'yellow', label: '黄色' },
        { value: 'green', label: '绿色' },
        { value: 'blue', label: '蓝色' },
        { value: 'pink', label: '粉色' },
        { value: 'orange', label: '橙色' },
        { value: 'purple', label: '紫色' },
        { value: 'cyan', label: '青色' },
        { value: 'red', label: '红色' }
      ],
      syncTimer: null,
      syncing: false,
      editAutoSaveTimer: null,
      paletteGroups: [
        { name: '主色', colors: ['#2563EB', '#0EA5E9', '#06B6D4', '#14B8A6', '#22C55E', '#84CC16'] },
        { name: '暖色', colors: ['#F97316', '#F59E0B', '#EAB308', '#EF4444', '#EC4899', '#D946EF'] },
        { name: '中性色', colors: ['#0F172A', '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8'] },
        { name: '浅色背景', colors: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#E0F2FE', '#ECFEFF', '#F0FDF4'] }
      ]
    }
  },
  computed: {
    totalViews() {
      return this.articles.reduce((sum, item) => sum + (Number(item.views) || 0), 0)
    },
    starredCount() {
      return this.articles.filter((item) => item.starred).length
    },
    categories() {
      const set = new Set(this.articles.map((item) => item.category).filter(Boolean))
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    },
    filteredArticles() {
      const q = this.searchQuery.toLowerCase()
      return [...this.articles]
        .filter((item) => {
          if (this.categoryFilter !== 'all' && item.category !== this.categoryFilter) return false
          if (this.onlyStarred && !item.starred) return false
          if (!q) return true
          return String(item.searchText || '').includes(q)
        })
        .sort((a, b) => {
          if (this.sortBy === 'popular') return (b.views || 0) - (a.views || 0)
          if (this.sortBy === 'title') return a.title.localeCompare(b.title, 'zh-CN')
          return (b.updatedAt || 0) - (a.updatedAt || 0)
        })
    },
    virtualArticleStart() {
      return Math.max(
        0,
        Math.floor(this.articleListScrollTop / this.articleItemHeight) - this.articleRenderBuffer
      )
    },
    virtualArticleVisibleCount() {
      const base = Math.ceil(this.articleListViewportHeight / this.articleItemHeight)
      return base + this.articleRenderBuffer * 2
    },
    virtualArticleEnd() {
      return Math.min(this.filteredArticles.length, this.virtualArticleStart + this.virtualArticleVisibleCount)
    },
    virtualDisplayedArticles() {
      return this.filteredArticles.slice(this.virtualArticleStart, this.virtualArticleEnd)
    },
    virtualArticlePaddingTop() {
      return this.virtualArticleStart * this.articleItemHeight
    },
    virtualArticlePaddingBottom() {
      return (this.filteredArticles.length - this.virtualArticleEnd) * this.articleItemHeight
    },
    activeArticle() {
      return this.articles.find((item) => item.id === this.activeArticleId) || null
    },
    activeMobileAnnotation() {
      if (!this.activeArticle || !Array.isArray(this.activeArticle.annotations)) return null
      return this.activeArticle.annotations.find((ann) => String(ann.id) === String(this.mobileActiveAnnotationId)) || null
    },
    deleteTargetArticle() {
      if (!this.deleteTargetId) return null
      return this.articles.find((item) => item.id === this.deleteTargetId) || null
    },
    canConfirmDelete() {
      const target = this.deleteTargetArticle
      if (!target) return false
      return String(this.deleteConfirmInput || '') === String(target.title || '')
    },
    toc() {
      if (!this.activeArticle) return []
      const normalized = this.normalizeDocumentMarkdown(this.activeArticle.content || '')
      return this.extractMarkdownHeadings(normalized)
    },
    renderedHtml() {
      if (!this.activeArticle) return ''
      const normalized = this.normalizeDocumentMarkdown(this.activeArticle.content || '')
      const html = this.markdownToHtml(normalized)
      return applyAnnotationsToHtml(html, this.activeArticle.annotations || [])
    },
    renderedAnnotationIds() {
      const set = new Set()
      const html = String(this.renderedHtml || '')
      const regex = /data-ann-id="([^"]+)"/g
      let m = regex.exec(html)
      while (m) {
        if (m[1]) set.add(String(m[1]))
        m = regex.exec(html)
      }
      return set
    },
    filteredHistory() {
      return filterHistoryEntries(this.activeArticle?.history || [], this.historyFilter)
    },
    readerStyle() {
      return {
        fontSize: `${this.readerFontSize}px`,
        lineHeight: this.readerLineHeight
      }
    },
    annotationFabStyle() {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      const left = Math.max(12, Math.min(vw - 116, Number(this.annotationAnchor?.x) || 12))
      const top = Math.max(12, Math.min(vh - 56, Number(this.annotationAnchor?.y) || 12))
      return {
        left: `${left}px`,
        top: `${top}px`
      }
    },
    relatedArticles() {
      if (!this.activeArticle) return []
      const baseTags = new Set(this.activeArticle.tags)
      return this.articles
        .filter((item) => item.id !== this.activeArticle.id)
        .map((item) => {
          const sameCategory = item.category && item.category === this.activeArticle.category ? 1 : 0
          const sharedTags = item.tags.filter((tag) => baseTags.has(tag)).length
          return { item, score: sameCategory * 2 + sharedTags }
        })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((row) => row.item)
    },
    recentArticles() {
      return this.recentIds
        .map((id) => this.articles.find((item) => item.id === id))
        .filter(Boolean)
        .slice(0, 8)
    },
    isMobile() {
      return this.viewportWidth <= 880
    },
    timelineEvents() {
      const events = []
      for (const item of this.articles) {
        events.push({
          id: `create_${item.id}`,
          articleId: item.id,
          type: 'create',
          time: item.createdAt || item.updatedAt || Date.now(),
          title: item.title,
          summary: item.summary || ''
        })
        if (item.updatedAt && item.createdAt && item.updatedAt - item.createdAt > 60 * 1000) {
          events.push({
            id: `update_${item.id}_${item.updatedAt}`,
            articleId: item.id,
            type: 'update',
            time: item.updatedAt,
            title: item.title,
            summary: item.summary || ''
          })
        }
      }
      return events.sort((a, b) => (a.time || 0) - (b.time || 0))
    },
    versionDiffPreview() {
      if (!this.activeArticle || !this.compareVersionId) return ''
      const target = this.activeArticle.history.find((item) => item.id === this.compareVersionId)
      if (!target) return ''
      return this.buildDiffPreview(this.activeArticle.content || '', target.content || '')
    }
  },
  methods: {
    getLatestUpdatedAt(items) {
      if (!Array.isArray(items) || items.length === 0) return 0
      return items.reduce((max, item) => Math.max(max, Number(item?.updatedAt) || 0), 0)
    },
    mergeArticlesPreferNewer(localItems, remoteItems) {
      const l = this.normalizeArticles(localItems || [])
      const r = this.normalizeArticles(remoteItems || [])
      const map = new Map()
      for (const item of [...r, ...l]) {
        const prev = map.get(item.id)
        if (!prev) {
          map.set(item.id, item)
          continue
        }
        map.set(item.id, (Number(item.updatedAt) || 0) >= (Number(prev.updatedAt) || 0) ? item : prev)
      }
      return this.normalizeArticles([...map.values()])
    },
    readSyncMeta() {
      try {
        const raw = localStorage.getItem(SYNC_META_KEY)
        if (!raw) return { dirty: false, lastSyncedAt: 0 }
        const parsed = JSON.parse(raw)
        return {
          dirty: Boolean(parsed?.dirty),
          lastSyncedAt: Number(parsed?.lastSyncedAt) || 0
        }
      } catch (error) {
        return { dirty: false, lastSyncedAt: 0 }
      }
    },
    writeSyncMeta(meta = {}) {
      const payload = {
        dirty: Boolean(meta.dirty),
        lastSyncedAt: Number(meta.lastSyncedAt) || 0
      }
      localStorage.setItem(SYNC_META_KEY, JSON.stringify(payload))
    },
    emptyDraft() {
      return {
        title: '',
        summary: '',
        category: '',
        tagsText: '',
        content: ''
      }
    },
    parseTags(input) {
      return String(input || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    },
    hasDraftChanges() {
      if (!this.activeArticleId) return false
      const current = this.articles.find((item) => item.id === this.activeArticleId)
      if (!current) return false
      return (
        String(this.draft.title || '').trim() !== String(current.title || '') ||
        String(this.draft.summary || '').trim() !== String(current.summary || '') ||
        String(this.draft.category || '').trim() !== String(current.category || '') ||
        this.parseTags(this.draft.tagsText).join(',') !== (Array.isArray(current.tags) ? current.tags.join(',') : '') ||
        String(this.draft.content || '') !== String(current.content || '')
      )
    },
    buildSearchText(item) {
      const title = String(item?.title || '')
      const summary = String(item?.summary || '')
      const category = String(item?.category || '')
      const tags = Array.isArray(item?.tags) ? item.tags.join(' ') : ''
      const contentPrefix = String(item?.content || '').slice(0, 600)
      return [title, summary, category, tags, contentPrefix].join(' ').toLowerCase()
    },
    onArticleListScroll(event) {
      this.articleListScrollTop = event?.target?.scrollTop || 0
    },
    measureArticleListViewport() {
      const el = this.$refs.articleListRef
      if (!el) return
      this.articleListViewportHeight = Math.max(220, el.clientHeight || 760)
    },
    resetArticleListScroll() {
      this.articleListScrollTop = 0
      const el = this.$refs.articleListRef
      if (el) el.scrollTop = 0
    },
    buildDiffPreview(currentContent, targetContent) {
      const current = String(currentContent || '').split('\n')
      const target = String(targetContent || '').split('\n')
      const max = Math.max(current.length, target.length)
      const out = []
      for (let i = 0; i < max; i += 1) {
        const c = current[i] ?? ''
        const t = target[i] ?? ''
        if (c === t) continue
        if (c) out.push(`- ${c}`)
        if (t) out.push(`+ ${t}`)
      }
      if (out.length === 0) return '当前词条与该历史版本内容一致。'
      return out.slice(0, 160).join('\n')
    },
    saveDraftCache() {
      if (this.viewTab !== 'edit') return
      const payload = {
        activeArticleId: this.activeArticleId || null,
        draft: this.draft,
        editVersionNote: this.editVersionNote,
        savedAt: Date.now()
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
      this.draftSavedAt = payload.savedAt
    },
    clearDraftCache() {
      localStorage.removeItem(DRAFT_KEY)
      this.draftSavedAt = null
    },
    restoreDraftCache() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return
        const cachedDraft = parsed.draft
        if (!cachedDraft || typeof cachedDraft !== 'object') return

        const targetId = parsed.activeArticleId ? String(parsed.activeArticleId) : null
        if (targetId && this.articles.some((item) => item.id === targetId)) {
          this.activeArticleId = targetId
        }

        this.draft = {
          title: String(cachedDraft.title || ''),
          summary: String(cachedDraft.summary || ''),
          category: String(cachedDraft.category || ''),
          tagsText: String(cachedDraft.tagsText || ''),
          content: String(cachedDraft.content || '')
        }
        this.editVersionNote = String(parsed.editVersionNote || '')
        this.viewTab = 'edit'
        this.draftSavedAt = Number(parsed.savedAt) || null
      } catch (error) {
        console.warn('恢复草稿失败', error)
      }
    },
    makeSlug(text, seen) {
      const base = text
        .toLowerCase()
        .replace(/[^\u4e00-\u9fa5\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') || 'section'
      let slug = base
      let i = 2
      while (seen.has(slug)) {
        slug = `${base}-${i}`
        i += 1
      }
      seen.add(slug)
      return slug
    },
    detectStructuredHeading(line) {
      const text = String(line || '').trim()
      if (!text || text.length > 140) return null

      const chapterStyle = text.match(/^第[一二三四五六七八九十百千万零\d]+[章节篇部分][：:\s-]*(.*)$/)
      if (chapterStyle) {
        const title = chapterStyle[1] ? `${text}` : text
        return { level: 2, text: title }
      }

      const chineseOrdered = text.match(/^[一二三四五六七八九十百千万]+[、.．]\s*(.{2,120})$/)
      if (chineseOrdered) {
        return { level: 2, text }
      }

      const numbered = text.match(/^(\d+(?:\.\d+){0,3})[)\.、\s_-]+(.{2,120})$/)
      if (numbered) {
        const depth = numbered[1].split('.').length
        const level = Math.min(4, depth + 1)
        return { level, text: numbered[2].trim() }
      }

      const chapterEn = text.match(/^chapter\s+\d+[\s:.-]+(.+)$/i)
      if (chapterEn) {
        return { level: 2, text: chapterEn[1].trim() || text }
      }

      return null
    },
    normalizeDocumentMarkdown(content) {
      const raw = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
      if (!raw) return ''

      const hasHtmlBlock = /<\s*(h[1-6]|p|ul|ol|li|table|blockquote|pre|code)\b/i.test(raw)
      if (hasHtmlBlock) return raw

      const lines = raw.split('\n').map((line) => line.replace(/\t/g, '  ').trimEnd())
      const hasMarkdownHeading = lines.some((line) => /^\s{0,3}#{1,6}\s+\S+/.test(line))
      if (hasMarkdownHeading) return lines.join('\n')

      // 保真优先：仅当明显存在多个结构化标题时才转换，避免破坏原排版
      const headingCandidates = lines
        .map((line, index) => ({ index, heading: this.detectStructuredHeading(line) }))
        .filter((item) => item.heading)

      if (headingCandidates.length < 2) {
        return lines.join('\n')
      }

      const converted = []
      const headingIndexMap = new Map(headingCandidates.map((item) => [item.index, item.heading]))

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        if (!line.trim()) {
          converted.push('')
          continue
        }

        const heading = headingIndexMap.get(i)
        if (heading) {
          converted.push(`${'#'.repeat(heading.level)} ${heading.text}`)
        } else {
          converted.push(line)
        }
      }

      return converted.join('\n')
    },
    extractMarkdownHeadings(markdown) {
      const source = String(markdown || '')
      if (!source) return []

      const seen = new Set()
      const headings = []

      try {
        const tokens = marked.lexer(source, { gfm: true })
        for (const token of tokens) {
          if (token?.type !== 'heading') continue
          const level = Number(token.depth) || 1
          if (level > 4) continue
          const text = String(token.text || '').replace(/<[^>]+>/g, '').trim()
          if (!text) continue
          headings.push({ id: this.makeSlug(text, seen), text, level })
        }
      } catch (error) {
        // fallback regex when lexer fails
      }

      if (headings.length > 0) return headings

      // HTML 标题兼容（例如 docx 转换后的内容）
      const htmlHeadingRegex = /<h([1-4])[^>]*>(.*?)<\/h\1>/gi
      let m = htmlHeadingRegex.exec(source)
      while (m) {
        const level = Number(m[1]) || 1
        const text = String(m[2] || '').replace(/<[^>]+>/g, '').trim()
        if (text) {
          headings.push({ id: this.makeSlug(text, seen), text, level })
        }
        m = htmlHeadingRegex.exec(source)
      }
      if (headings.length > 0) return headings

      for (const line of source.split('\n')) {
        const match = line.match(/^(#{1,4})\s+(.+)$/)
        if (!match) continue
        const level = match[1].length
        const text = match[2].trim()
        headings.push({ id: this.makeSlug(text, seen), text, level })
      }

      if (headings.length > 0) return headings

      // 最后兜底：不改正文，仅从结构化行中识别目录
      for (const line of source.split('\n')) {
        const item = this.detectStructuredHeading(line)
        if (!item) continue
        headings.push({ id: this.makeSlug(item.text, seen), text: item.text, level: item.level })
      }

      return headings
    },
    formatInline(text) {
      return escapeHtml(text)
        .replace(/!\[(.*?)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    },
    markdownToHtml(content) {
      const source = String(content || '')
      if (!source) return ''

      const headings = this.extractMarkdownHeadings(source)
      const seen = new Set()
      let headingIndex = 0

      try {
        marked.setOptions({
          gfm: true,
          breaks: true
        })

        const renderer = new marked.Renderer()
        renderer.heading = (args) => {
          const depth = Number(args.depth) || 1
          const text = String(args.text || '').trim()
          const fallback = text || `section-${headingIndex + 1}`
          const expected = headings[headingIndex]
          const id = expected?.id || this.makeSlug(fallback, seen)
          seen.add(id)
          headingIndex += 1
          return `<h${depth} id="${id}">${args.text}</h${depth}>`
        }

        return marked.parse(source, { renderer })
      } catch (error) {
        console.warn('Markdown 渲染失败，已回退简易渲染', error)
        const safe = escapeHtml(source).replace(/\n/g, '<br>')
        return `<p>${safe}</p>`
      }
    },
    normalizeArticles(list) {
      if (!Array.isArray(list)) return []
      const now = Date.now()
      const seen = new Set()
      return list
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const title = String(item.title || '').trim()
          if (!title) return null
          const id = String(item.id || `wiki_${now}_${Math.random().toString(16).slice(2, 6)}`)
          if (seen.has(id)) return null
          seen.add(id)
          const createdAt = Number(item.createdAt) || now
          const updatedAt = Number(item.updatedAt) || createdAt
          const historyList = normalizeHistoryEntries(item.history, {
            title,
            summary: String(item.summary || ''),
            content: String(item.content || ''),
            category: String(item.category || '').trim(),
            tags: Array.isArray(item.tags) ? item.tags : [],
            versionSeq: 1,
            updatedAt
          }, updatedAt)
          const maxHistorySeq = historyList.reduce((max, ver) => {
            const match = String(ver.label || '').match(/^v(\d+)$/i)
            return Math.max(max, match ? Number(match[1]) : 0)
          }, 1)
          const normalizedItem = {
            id,
            title,
            summary: String(item.summary || ''),
            content: String(item.content || ''),
            category: String(item.category || '').trim(),
            tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
            views: Number(item.views) || 0,
            starred: Boolean(item.starred),
            createdAt,
            updatedAt,
            versionSeq: Math.max(1, Number(item.versionSeq) || maxHistorySeq),
            history: historyList,
            annotations: normalizeAnnotations(item.annotations, updatedAt),
            comments: Array.isArray(item.comments)
              ? item.comments
                .map((comment) => ({
                  id: String(comment.id || `comment_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
                  author: String(comment.author || '访客').trim() || '访客',
                  text: String(comment.text || '').trim(),
                  createdAt: Number(comment.createdAt) || now
                }))
                .filter((comment) => comment.text)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              : []
          }
          normalizedItem.searchText = this.buildSearchText(normalizedItem)
          return normalizedItem
        })
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    seedArticles() {
      const now = Date.now()
      return [
        {
          id: 'wiki_vue3',
          title: 'Vue 3',
          summary: '渐进式 JavaScript 框架，支持组合式 API 与高性能渲染。',
          content: '# Vue 3\n\n## 核心能力\n- 组合式 API\n- 响应式系统\n- 单文件组件\n\n## 适用场景\n适合构建中大型 Web 应用。',
          category: '技术',
          tags: ['vue', 'frontend', 'javascript'],
          views: 12,
          starred: true,
          createdAt: now - 1000 * 60 * 60 * 24 * 4,
          updatedAt: now - 1000 * 60 * 60 * 5,
          history: [],
          comments: []
        },
        {
          id: 'wiki_http',
          title: 'HTTP 状态码',
          summary: '用于表达请求处理结果的标准响应码。',
          content: '# HTTP 状态码\n\n## 2xx\n- 200 OK\n- 201 Created\n\n## 4xx\n- 400 Bad Request\n- 404 Not Found\n\n## 5xx\n- 500 Internal Server Error',
          category: '网络',
          tags: ['http', 'backend'],
          views: 8,
          starred: false,
          createdAt: now - 1000 * 60 * 60 * 24 * 3,
          updatedAt: now - 1000 * 60 * 60 * 2,
          history: [],
          comments: []
        },
        {
          id: 'wiki_product_docs',
          title: '产品文档体系',
          summary: '定义愿景、需求、方案、验收的标准化文档结构。',
          content: '# 产品文档体系\n\n## 文档分层\n- PRD\n- 技术方案\n- 测试用例\n\n## 版本管理\n通过版本记录追溯每次修改原因。',
          category: '产品',
          tags: ['product', 'documentation'],
          views: 6,
          starred: false,
          createdAt: now - 1000 * 60 * 60 * 24 * 2,
          updatedAt: now - 1000 * 60 * 60,
          history: [],
          comments: []
        }
      ]
    },
    persistArticles() {
      const normalized = this.normalizeArticles(this.articles)
      this.articles = normalized
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      this.writeSyncMeta({ dirty: true, lastSyncedAt: this.readSyncMeta().lastSyncedAt })
      this.scheduleBackgroundSync(900)
    },
    persistState() {
      localStorage.setItem(STATE_KEY, JSON.stringify({ recentIds: this.recentIds }))
    },
    scheduleBackgroundSync(delay = 1200) {
      if (this.syncTimer) {
        clearTimeout(this.syncTimer)
      }
      this.syncTimer = setTimeout(() => {
        this.syncTimer = null
        this.syncLibraryInBackground()
      }, delay)
    },
    async syncLibraryInBackground(force = false) {
      if (this.syncing) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      const meta = this.readSyncMeta()
      if (!force && !meta.dirty) return

      this.syncing = true
      try {
        const normalized = this.normalizeArticles(this.articles)
        const saved = await api.wiki.saveLibrary(normalized)
        const merged = this.mergeArticlesPreferNewer(normalized, saved?.items || [])
        this.articles = merged
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        this.storageMode = 'server'
        this.writeSyncMeta({ dirty: false, lastSyncedAt: Date.now() })
      } catch (error) {
        this.storageMode = 'local'
        console.warn('后台同步 wiki 失败，将在网络恢复后重试', error)
      } finally {
        this.syncing = false
      }
    },
    async load() {
      let localItems = []
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          localItems = this.normalizeArticles(JSON.parse(raw))
          this.articles = localItems
        }
      } catch (error) {
        console.warn('加载本地 wiki 数据失败', error)
      }

      // 缓存优先：本地有数据时直接使用，不阻塞等待数据库
      if (localItems.length > 0) {
        this.articles = localItems
        this.storageMode = 'cache'
      } else {
        try {
          const remote = await api.wiki.getLibrary()
          const remoteItems = this.normalizeArticles(remote?.items || [])
          this.storageMode = 'server'

          if (remoteItems.length > 0) {
            this.articles = remoteItems
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteItems))
            this.writeSyncMeta({ dirty: false, lastSyncedAt: this.getLatestUpdatedAt(remoteItems) })
          } else {
            const seeded = this.seedArticles()
            this.articles = seeded
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
            this.writeSyncMeta({ dirty: true, lastSyncedAt: 0 })
          }
        } catch (error) {
          this.storageMode = 'local'
          console.warn('连接 wiki 服务失败，使用本地模式', error)
          const seeded = this.seedArticles()
          this.articles = seeded
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
          this.writeSyncMeta({ dirty: true, lastSyncedAt: 0 })
        }
      }

      try {
        const raw = localStorage.getItem(STATE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          this.recentIds = Array.isArray(parsed.recentIds) ? parsed.recentIds.map((id) => String(id)) : []
        }
      } catch (error) {
        console.warn('加载 wiki 状态失败', error)
      }

      this.activeArticleId = this.articles[0]?.id || null
      this.viewTab = 'read'
      this.$nextTick(() => this.measureArticleListViewport())
      this.restoreDraftCache()
      if (localItems.length > 0) {
        this.scheduleBackgroundSync(1800)
      }
    },
    openArticle(id) {
      const article = this.articles.find((item) => item.id === id)
      if (!article) return
      this.activeArticleId = id
      article.views += 1
      this.viewTab = 'read'
      this.historyFilter = 'all'
      this.clearAnnotationComposer()
      this.annotationReplyDrafts = {}
      this.commentText = ''
      this.compareVersionId = ''
      if (this.isMobile) {
        this.mobileReadMode = true
        this.$nextTick(() => this.focusContentPanel())
      }

      this.recentIds = [id, ...this.recentIds.filter((item) => item !== id)].slice(0, 20)
      this.persistState()
    },
    toggleStar(item) {
      item.starred = !item.starred
      item.updatedAt = Date.now()
      this.persistArticles()
    },
    createArticle() {
      this.activeArticleId = null
      this.viewTab = 'edit'
      this.draft = this.emptyDraft()
      this.draftImages = []
      this.compareVersionId = ''
      if (this.isMobile) {
        this.mobileReadMode = true
        this.$nextTick(() => this.focusContentPanel())
      }
    },
    startEdit() {
      if (!this.activeArticle) return
      this.viewTab = 'edit'
      this.compareVersionId = ''
      this.draftImages = []
      this.draft = {
        title: this.activeArticle.title,
        summary: this.activeArticle.summary,
        category: this.activeArticle.category,
        tagsText: this.activeArticle.tags.join(', '),
        content: this.activeArticle.content
      }
      if (this.isMobile) {
        this.mobileReadMode = true
        this.$nextTick(() => this.focusContentPanel())
      }
    },
    saveDraft(options = {}) {
      const opts = {
        publish: false,
        auto: false,
        keepEditing: false,
        silent: false,
        ...options
      }

      const title = String(this.draft.title || '').trim()
      if (!title) {
        if (!opts.silent) alert('请填写词条标题')
        return
      }

      if (opts.auto && !this.activeArticleId) return
      if (opts.auto && !this.hasDraftChanges()) return

      const now = Date.now()
      const payload = {
        title,
        summary: String(this.draft.summary || '').trim(),
        category: String(this.draft.category || '').trim(),
        tags: this.parseTags(this.draft.tagsText),
        content: this.draft.content,
        updatedAt: now
      }

      const note = String(this.editVersionNote || '').trim()
      if (!this.activeArticleId) {
        const id = `wiki_${now}`
        const historyEntry = buildHistorySnapshot({ ...payload, versionSeq: 1 }, {
          updatedAt: now,
          label: 'v1',
          note: note || '初始版本',
          action: opts.publish ? 'publish' : 'edit',
          publishedAt: opts.publish ? now : 0
        })
        this.articles.unshift({
          id,
          views: 0,
          starred: false,
          createdAt: now,
          versionSeq: 1,
          history: [historyEntry],
          annotations: [],
          comments: [],
          ...payload
        })
        this.activeArticleId = id
      } else {
        const idx = this.articles.findIndex((item) => item.id === this.activeArticleId)
        if (idx === -1) return
        const current = this.articles[idx]
        const currentSeq = Math.max(1, Number(current.versionSeq) || 1)
        if (!Array.isArray(current.history)) current.history = []

        if (!opts.auto) {
          current.history.unshift(buildHistorySnapshot(current, {
            updatedAt: Number(current.updatedAt) || now,
            label: `v${currentSeq}`,
            note: note || '编辑保存前版本',
            action: 'edit'
          }))
        }

        const nextSeq = opts.auto ? currentSeq : Math.max(currentSeq + 1, nextVersionSeq(current))
        this.articles[idx] = {
          ...current,
          ...payload,
          versionSeq: nextSeq
        }

        if (!opts.auto && opts.publish) {
          this.articles[idx].history.unshift(buildHistorySnapshot(this.articles[idx], {
            updatedAt: now,
            label: `v${this.articles[idx].versionSeq}`,
            note: note || '发布版本',
            action: 'publish',
            publishedAt: now
          }))
        }
      }

      this.persistArticles()
      this.draftSavedAt = now
      if (opts.auto) return

      this.viewTab = opts.keepEditing ? 'edit' : 'read'
      this.draft = this.emptyDraft()
      this.editVersionNote = ''
      this.draftImages = []
      this.compareVersionId = ''
      this.clearDraftCache()
    },
    openPublishForm() {
      if (!this.activeArticle) return
      this.publishFormVisible = true
      this.publishFormNote = ''
    },
    cancelPublishForm() {
      this.publishFormVisible = false
      this.publishFormNote = ''
    },
    requestRemoveArticle(id) {
      const target = this.articles.find((item) => item.id === id)
      if (!target) return
      this.deleteTargetId = target.id
      this.deleteConfirmInput = ''
      this.deleteConfirmVisible = true
      this.cancelPublishForm()
    },
    cancelRemoveArticle() {
      this.deleteConfirmVisible = false
      this.deleteTargetId = null
      this.deleteConfirmInput = ''
    },
    confirmRemoveArticle() {
      if (!this.canConfirmDelete) return
      this.removeArticle(this.deleteTargetId)
      this.cancelRemoveArticle()
    },
    publishCurrentVersion() {
      if (!this.activeArticle) return
      const now = Date.now()
      const note = String(this.publishFormNote || '').trim()
      const seq = Math.max(1, Number(this.activeArticle.versionSeq) || 1)
      if (!Array.isArray(this.activeArticle.history)) this.activeArticle.history = []
      this.activeArticle.history.unshift(buildHistorySnapshot(this.activeArticle, {
        updatedAt: now,
        label: `v${seq}`,
        note: note || '手动发布版本',
        action: 'publish',
        publishedAt: now
      }))
      this.activeArticle.updatedAt = now
      this.persistArticles()
      this.cancelPublishForm()
    },
    toggleReadRail() {
      this.hideReadRail = !this.hideReadRail
    },
    toggleFocusMode() {
      this.focusMode = !this.focusMode
      if (this.focusMode) {
        this.hideReadRail = true
      }
    },
    toggleReaderFullscreen() {
      if (this.viewTab !== 'read') return
      this.readerFullscreen = !this.readerFullscreen
    },
    setDocumentScrollLock(locked) {
      if (typeof document === 'undefined') return
      document.body.style.overflow = locked ? 'hidden' : ''
    },
    handleMarkdownClickForQuickAnnotate(event) {
      const tappedAnnId = event?.target?.closest?.('[data-ann-id]')?.getAttribute?.('data-ann-id')
      if (this.isMobile && tappedAnnId) {
        this.openMobileAnnotationOverview(tappedAnnId)
        return
      }
      if (!this.quickAnnotateMode || this.viewTab !== 'read') return
      if (this.isMobile) {
        const selected = String(window.getSelection?.()?.toString?.() || '').trim()
        if (selected) return
        if (Date.now() < Number(this.mobileSelectionLockUntil || 0)) return
      }
      const target = event?.target
      if (!target || !(target instanceof Element)) return
      if (target.closest('a, button, code, pre, mark')) return
      const block = target.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th')
      if (!block) return
      const text = String(block.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text || text.length < 2) return
      this.annotationSelection = {
        text: text.slice(0, 280),
        anchor: this.buildAnnotationAnchor(block)
      }
      const rect = block.getBoundingClientRect()
      this.annotationAnchor = {
        x: rect.right + 10,
        y: rect.top - 8
      }
      this.showAnnotationComposer = !this.isMobile
      if (!this.isMobile) {
        this.$nextTick(() => {
          const input = this.$refs.annotationInputRef
          if (input && typeof input.focus === 'function') input.focus()
        })
      }
    },
    captureSelectionForAnnotation() {
      if (this.viewTab !== 'read') return
      setTimeout(() => this.refreshAnnotationSelection(), 0)
    },
    refreshAnnotationSelection() {
      if (this.viewTab !== 'read') return
      const selection = window.getSelection?.()
      const selected = String(selection?.toString?.() || '').replace(/\s+/g, ' ').trim()
      if (!selected || selected.length < 2) return
      const anchorNode = selection?.anchorNode
      const targetElement = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement
      if (!targetElement || !targetElement.closest('.markdown')) return
      const block = targetElement.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th')
      const pickedText = this.isMobile
        ? this.refineMobileSelectionText(selected)
        : selected.slice(0, 280)
      this.annotationSelection = {
        text: pickedText,
        anchor: this.buildAnnotationAnchor(block)
      }
      if (this.isMobile) {
        this.mobileSelectionLockUntil = Date.now() + 1200
      }
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null
      const rect = range?.getBoundingClientRect?.()
      if (rect) {
        this.annotationAnchor = {
          x: rect.right + 10,
          y: rect.top - 8
        }
      }
      if (!this.isMobile) {
        this.showAnnotationComposer = false
      }
    },
    refineMobileSelectionText(selectedText) {
      const text = String(selectedText || '').replace(/\s+/g, ' ').trim()
      if (!text) return ''
      if (text.length <= 120) return text
      const sentenceParts = text
        .split(/(?<=[。！？!?；;])/)
        .map((item) => item.trim())
        .filter(Boolean)
      const candidate = sentenceParts.find((item) => item.length >= 6 && item.length <= 120)
      if (candidate) return candidate
      return text.slice(0, 120).trim()
    },
    buildAnnotationAnchor(blockEl) {
      if (!blockEl) return null
      const blockText = String(blockEl.textContent || '').replace(/\s+/g, ' ').trim()
      if (!blockText) return null
      return {
        blockExcerpt: blockText.slice(0, 120),
        blockTag: String(blockEl.tagName || '').toLowerCase()
      }
    },
    annotateCurrentParagraphOnMobile() {
      if (!this.isMobile || this.viewTab !== 'read') return
      const root = this.findMarkdownRoot()
      if (!root) return
      const blocks = Array.from(root.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th'))
      if (!blocks.length) return
      const viewportCenter = window.innerHeight * 0.42
      let picked = null
      let minDistance = Number.POSITIVE_INFINITY
      for (const block of blocks) {
        const rect = block.getBoundingClientRect()
        if (rect.bottom < 64 || rect.top > window.innerHeight - 56) continue
        const center = rect.top + rect.height / 2
        const distance = Math.abs(center - viewportCenter)
        if (distance < minDistance) {
          minDistance = distance
          picked = { block, rect }
        }
      }
      if (!picked) return
      const text = String(picked.block.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text) return
      this.annotationSelection = {
        text: this.refineMobileSelectionText(text).slice(0, 180),
        anchor: this.buildAnnotationAnchor(picked.block)
      }
      this.annotationAnchor = {
        x: picked.rect.right + 10,
        y: picked.rect.top - 8
      }
      flashElement(picked.block, 'inpage-match-focus', 900)
    },
    openAnnotationComposer() {
      if (!this.annotationSelection.text) return
      this.showAnnotationComposer = true
      this.$nextTick(() => {
        const input = this.$refs.annotationInputRef
        if (input && typeof input.focus === 'function') {
          input.focus()
        }
      })
    },
    clearAnnotationComposer() {
      this.annotationSelection = { text: '', anchor: null }
      this.annotationDraft = ''
      this.annotationColor = 'yellow'
      this.showAnnotationComposer = false
    },
    saveAnnotation() {
      if (!this.activeArticle) return
      const quote = String(this.annotationSelection?.text || '').trim()
      if (!quote) return
      if (!Array.isArray(this.activeArticle.annotations)) {
        this.activeArticle.annotations = []
      }
      const annotationId = `ann_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`
      this.activeArticle.annotations.unshift({
        id: annotationId,
        quote,
        note: String(this.annotationDraft || '').trim(),
        anchor: this.annotationSelection?.anchor || null,
        color: this.annotationColor || 'yellow',
        status: 'open',
        replies: [],
        createdAt: Date.now()
      })
      this.activeArticle.updatedAt = Date.now()
      this.persistArticles()
      this.annotationSavedAt = Date.now()
      this.annotationViewMode = 'all'
      this.clearAnnotationComposer()
      if (typeof window.getSelection === 'function') {
        window.getSelection()?.removeAllRanges?.()
      }
      this.$nextTick(() => this.jumpToAnnotation(annotationId))
    },
    removeAnnotation(annotationId) {
      if (!this.activeArticle || !Array.isArray(this.activeArticle.annotations)) return
      this.activeArticle.annotations = this.activeArticle.annotations.filter((item) => item.id !== annotationId)
      if (String(this.mobileActiveAnnotationId) === String(annotationId)) {
        this.mobileActiveAnnotationId = this.activeArticle.annotations[0]?.id ? String(this.activeArticle.annotations[0].id) : ''
      }
      if (this.annotationReplyDrafts[annotationId]) {
        delete this.annotationReplyDrafts[annotationId]
      }
      this.activeArticle.updatedAt = Date.now()
      this.persistArticles()
    },
    toggleAnnotationStatus(annotationId) {
      if (!this.activeArticle || !Array.isArray(this.activeArticle.annotations)) return
      const item = this.activeArticle.annotations.find((ann) => ann.id === annotationId)
      if (!item) return
      item.status = item.status === 'resolved' ? 'open' : 'resolved'
      this.activeArticle.updatedAt = Date.now()
      this.persistArticles()
    },
    addAnnotationReply(annotationId) {
      if (!this.activeArticle || !Array.isArray(this.activeArticle.annotations)) return
      const item = this.activeArticle.annotations.find((ann) => ann.id === annotationId)
      if (!item) return
      const text = String(this.annotationReplyDrafts[annotationId] || '').trim()
      if (!text) return
      if (!Array.isArray(item.replies)) item.replies = []
      item.replies.push({
        id: `ann_reply_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        author: this.commentAuthor || '当前用户',
        text,
        createdAt: Date.now()
      })
      this.annotationReplyDrafts[annotationId] = ''
      this.activeArticle.updatedAt = Date.now()
      this.persistArticles()
    },
    jumpToAnnotation(annotationId, options = {}) {
      const opts = { keepDrawer: false, ...options }
      if (this.isMobile) {
        this.mobileActiveAnnotationId = String(annotationId || '')
        if (!opts.keepDrawer) {
          this.showMobileAnnotationList = false
        }
      }
      const el = document.querySelector(`[data-ann-id="${String(annotationId)}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const wrap = el.closest('.ann-inline-wrap')
        if (wrap) {
          flashElement(wrap, 'ann-focus', 1100)
        }
        return
      }
      const row = this.$el?.querySelector?.(`[data-ann-row-id="${String(annotationId)}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        flashElement(row, 'ann-focus-row', 1100)
      }
    },
    findMarkdownRoot() {
      return findReaderRoot(this.$el, '.read-main .markdown')
    },
    refreshInPageMatches() {
      const query = String(this.inPageQuery || '').trim()
      const oldMatches = Array.isArray(this.inPageMatches) ? this.inPageMatches : []
      const oldActive = Number(this.inPageActiveIndex)
      const oldActiveId = oldMatches[oldActive]?.id || ''
      if (!query || this.viewTab !== 'read') {
        this.inPageMatches = []
        this.inPageActiveIndex = -1
        return
      }
      const root = this.findMarkdownRoot()
      if (!root) {
        this.inPageMatches = []
        this.inPageActiveIndex = -1
        return
      }
      const out = buildInPageMatches(root, query, { limit: 120 })
      this.inPageMatches = out
      if (!out.length) {
        this.inPageActiveIndex = -1
        return
      }
      if (oldActiveId) {
        const keepIdx = out.findIndex((item) => item.id === oldActiveId)
        if (keepIdx >= 0) {
          this.inPageActiveIndex = keepIdx
          return
        }
      }
      if (oldActive >= 0) {
        this.inPageActiveIndex = Math.min(oldActive, out.length - 1)
        return
      }
      this.inPageActiveIndex = 0
    },
    jumpToInPageMatch(index) {
      const targetIndex = Number(index)
      if (!Number.isFinite(targetIndex) || targetIndex < 0 || targetIndex >= this.inPageMatches.length) return
      const hit = this.inPageMatches[targetIndex]
      if (!hit) return
      const root = this.findMarkdownRoot()
      if (!root) return
      this.inPageActiveIndex = targetIndex
      jumpToInPageMatch(root, hit, { focusClass: 'inpage-match-focus', focusDuration: 1000 })
    },
    jumpToNextInPageMatch() {
      if (!this.inPageMatches.length) return
      const base = this.inPageActiveIndex >= 0 ? this.inPageActiveIndex : -1
      const next = (base + 1) % this.inPageMatches.length
      this.jumpToInPageMatch(next)
    },
    jumpToPrevInPageMatch() {
      if (!this.inPageMatches.length) return
      const base = this.inPageActiveIndex >= 0 ? this.inPageActiveIndex : 0
      const prev = (base - 1 + this.inPageMatches.length) % this.inPageMatches.length
      this.jumpToInPageMatch(prev)
    },
    jumpReaderToTop() {
      const root = this.findMarkdownRoot()
      if (!root) return
      jumpReaderToTop(root)
    },
    jumpReaderToBottom() {
      const root = this.findMarkdownRoot()
      if (!root) return
      jumpReaderToBottom(root)
    },
    locateActiveArticle() {
      if (!this.activeArticleId) return
      if (this.isMobile && this.mobileReadMode) {
        this.mobileReadMode = false
      }
      this.$nextTick(() => {
        const list = this.$refs.articleListRef
        if (!list) return
        locateListItemById(list, this.activeArticleId, {
          dataAttr: 'data-article-id',
          highlightClass: 'located',
          highlightDuration: 1200
        })
      })
    },
    handleSelectionChange() {
      if (this.viewTab !== 'read') return
      this.refreshAnnotationSelection()
    },
    handleGlobalMouseUp() {
      if (this.viewTab !== 'read') return
      this.refreshAnnotationSelection()
    },
    cancelEdit() {
      if (this.activeArticleId) {
        this.viewTab = 'read'
      } else {
        this.viewTab = 'read'
        this.activeArticleId = this.articles[0]?.id || null
      }
      this.draft = this.emptyDraft()
      this.editVersionNote = ''
      this.draftImages = []
      this.clearDraftCache()
    },
    removeArticle(id) {
      const target = this.articles.find((item) => item.id === id)
      if (!target) return

      this.articles = this.articles.filter((item) => item.id !== id)
      this.recentIds = this.recentIds.filter((item) => item !== id)
      this.activeArticleId = this.articles[0]?.id || null
      this.viewTab = 'read'
      this.persistArticles()
      this.persistState()
    },
    rollbackVersion(versionId) {
      if (!this.activeArticle) return
      const version = this.activeArticle.history.find((item) => item.id === versionId)
      if (!version) return
      if (!confirm('确定回滚到该历史版本吗？')) return

      const now = Date.now()
      const currentSeq = Math.max(1, Number(this.activeArticle.versionSeq) || 1)
      const currentSnapshot = buildHistorySnapshot(this.activeArticle, {
        updatedAt: this.activeArticle.updatedAt || now,
        label: `v${currentSeq}`,
        note: '回滚前版本备份',
        action: 'edit'
      })

      this.activeArticle.history.unshift(currentSnapshot)
      this.activeArticle.title = version.title
      this.activeArticle.summary = version.summary
      this.activeArticle.category = version.category
      this.activeArticle.tags = [...version.tags]
      this.activeArticle.content = version.content
      this.activeArticle.updatedAt = now
      const rollbackSeqMatch = String(version.label || '').match(/^v(\d+)$/i)
      if (rollbackSeqMatch) {
        this.activeArticle.versionSeq = Number(rollbackSeqMatch[1]) || currentSeq
      }

      this.persistArticles()
      this.viewTab = 'read'
      this.compareVersionId = ''
    },
    previewVersionDiff(versionId) {
      this.compareVersionId = versionId
    },
    addComment() {
      if (!this.activeArticle || !this.commentText) return
      this.activeArticle.comments.unshift({
        id: `comment_${Date.now()}`,
        author: this.commentAuthor || '当前用户',
        text: this.commentText,
        createdAt: Date.now()
      })
      this.commentText = ''
      this.persistArticles()
    },
    removeComment(commentId) {
      if (!this.activeArticle) return
      this.activeArticle.comments = this.activeArticle.comments.filter((item) => item.id !== commentId)
      this.persistArticles()
    },
    openRandomArticle() {
      if (this.articles.length === 0) return
      const pool = this.articles.filter((item) => item.id !== this.activeArticleId)
      const target = (pool.length ? pool : this.articles)[Math.floor(Math.random() * (pool.length || this.articles.length))]
      this.openArticle(target.id)
    },
    createArticleFromImport({ title, summary, content, sourceExt, sourceName }) {
      const now = Date.now()
      const cleanTitle = String(title || '').trim() || `导入词条_${now}`
      const cleanSummary = String(summary || '').trim()
      const cleanContent = String(content || '').trim()
      if (!cleanContent) {
        throw new Error('导入正文为空，无法创建词条')
      }

      const tags = ['导入文档']
      if (sourceExt) tags.push(String(sourceExt).replace(/^\./, '').toLowerCase())
      if (sourceName && sourceName.includes('.')) {
        const ext = sourceName.split('.').pop()
        if (ext) tags.push(String(ext).toLowerCase())
      }

      const id = `wiki_${now}_${Math.random().toString(16).slice(2, 6)}`
      const item = {
        id,
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        category: '导入文档',
        tags: Array.from(new Set(tags)).slice(0, 20),
        views: 0,
        starred: false,
        createdAt: now,
        updatedAt: now,
        versionSeq: 1,
        history: [buildHistorySnapshot({
          title: cleanTitle,
          summary: cleanSummary,
          content: cleanContent,
          category: '导入文档',
          tags: Array.from(new Set(tags)).slice(0, 20),
          versionSeq: 1,
          updatedAt: now
        }, {
          updatedAt: now,
          label: 'v1',
          note: '导入初始版本',
          action: 'publish',
          publishedAt: now
        })],
        annotations: [],
        comments: []
      }

      this.articles.unshift(item)
      this.activeArticleId = id
      this.viewTab = 'read'
      this.searchQuery = ''
      this.categoryFilter = 'all'
      this.onlyStarred = false
      this.sortBy = 'recent'
      this.mobileReadMode = true
      this.persistArticles()
      this.resetArticleListScroll()
      return item
    },
    jumpToHeading(id) {
      if (this.viewTab !== 'read') {
        this.viewTab = 'read'
        this.$nextTick(() => this.jumpToHeading(id))
        return
      }
      if (this.isMobile) this.showMobileToc = false
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    escapeCsvCell(value) {
      const text = String(value ?? '')
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    },
    parseCsvLine(line) {
      const cells = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (inQuote) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              cur += '"'
              i += 1
            } else {
              inQuote = false
            }
          } else {
            cur += ch
          }
        } else if (ch === '"') {
          inQuote = true
        } else if (ch === ',') {
          cells.push(cur)
          cur = ''
        } else {
          cur += ch
        }
      }
      cells.push(cur)
      return cells
    },
    parseCsvText(text) {
      const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
      if (lines.length === 0) return []
      const header = this.parseCsvLine(lines[0]).map((h) => h.trim())
      const rows = []
      for (let i = 1; i < lines.length; i += 1) {
        if (!lines[i].trim()) continue
        const cells = this.parseCsvLine(lines[i])
        const row = {}
        header.forEach((key, idx) => {
          row[key] = cells[idx] ?? ''
        })
        rows.push(row)
      }
      return rows
    },
    sanitizeFileName(name) {
      const base = String(name || '').replace(/\.[^.]+$/, '').trim()
      return base || `file_${Date.now()}`
    },
    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsDataURL(file)
      })
    },
    exportJson() {
      const payload = {
        exportedAt: new Date().toISOString(),
        items: this.articles
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wiki-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    exportCsv() {
      const header = ['id', 'title', 'summary', 'category', 'tags', 'content', 'starred', 'views', 'createdAt', 'updatedAt']
      const lines = [header.join(',')]
      for (const item of this.articles) {
        const row = [
          item.id,
          item.title,
          item.summary || '',
          item.category || '',
          (item.tags || []).join('|'),
          item.content || '',
          item.starred ? '1' : '0',
          String(item.views || 0),
          String(item.createdAt || ''),
          String(item.updatedAt || '')
        ]
        lines.push(row.map((cell) => this.escapeCsvCell(cell)).join(','))
      }
      const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wiki-export-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    triggerDocImport() {
      this.$refs.docImportRef?.click()
    },
    pushImportLog(level, message) {
      this.importLogs.unshift({
        id: `import_log_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        time: Date.now(),
        level: String(level || 'info'),
        message: String(message || '')
      })
      if (this.importLogs.length > 120) {
        this.importLogs.splice(120)
      }
    },
    clearImportLogs() {
      this.importLogs = []
    },
    async importDocumentToDraft(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return

      const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase() || ''}`
      const supported = ['.md', '.markdown', '.txt', '.doc', '.docx', '.pdf']
      if (!supported.includes(ext)) {
        alert('仅支持 md/txt/doc/docx/pdf')
        this.pushImportLog('warn', `不支持的文件格式：${file.name}`)
        if (input) input.value = ''
        return
      }

      this.importingDoc = true
      this.pushImportLog('info', `开始导入：${file.name}（${Math.round(file.size / 1024)} KB）`)
      let controller = null
      let timeoutId = null
      try {
        let nextTitle = this.sanitizeFileName(file.name)
        let nextSummary = ''
        let nextContent = ''

        if (ext === '.md' || ext === '.markdown' || ext === '.txt') {
          this.pushImportLog('info', '文本文件读取中...')
          const content = await file.text()
          nextContent = String(content || '').replace(/\r\n/g, '\n').trim()
          const lines = nextContent.split('\n').filter(Boolean)
          nextSummary = lines.slice(0, 2).join(' ').slice(0, 180)
          this.pushImportLog('success', `读取完成，提取 ${nextContent.length} 字符`)
        } else {
          this.pushImportLog('info', '正在上传文件到后端解析...')
          const dataUrl = await this.fileToDataUrl(file)
          const base64 = String(dataUrl || '').split(',').pop() || ''
          this.pushImportLog('info', `上传体积：${Math.round(file.size / 1024)} KB`)
          controller = new AbortController()
          timeoutId = setTimeout(() => controller.abort(), 120000)
          const result = await api.wiki.importDocument({
            fileName: file.name,
            dataBase64: base64
          }, { signal: controller.signal })
          nextTitle = result?.title || nextTitle
          nextSummary = result?.summary || ''
          nextContent = String(result?.content || '').trim()
          this.pushImportLog('success', `后端解析完成，提取 ${nextContent.length} 字符`)
        }

        if (!nextContent) {
          throw new Error('未从文档中提取到可用正文')
        }

        const created = this.createArticleFromImport({
          title: nextTitle,
          summary: nextSummary,
          content: nextContent,
          sourceExt: ext,
          sourceName: file.name
        })
        this.pushImportLog('success', `导入完成并创建词条：${created.title}`)
      } catch (error) {
        const msg = String(error?.message || '')
        this.pushImportLog('error', `导入失败：${msg || '未知错误'}`)
        if (msg.includes('Failed to fetch')) {
          alert('导入文档失败：后端不可用。请先启动/重启后端服务（npm run server:test 或 npm run dev）。')
        } else if (error?.name === 'AbortError') {
          alert('导入文档失败：请求超时（120秒）或被中断。')
        } else if (msg.includes('API 端点不存在') || msg.includes('404')) {
          alert('导入文档失败：后端未加载新接口。请重启后端服务后再试。')
        } else if (msg.includes('文档解析后为空')) {
          alert('导入文档失败：文件解析为空。请先确认文档有可复制文本（扫描版 PDF 可能无文本层）。')
        } else if (msg.includes('未从文档中提取到可用正文')) {
          alert('导入文档失败：文件未提取到正文内容（常见于扫描版 PDF）。')
        } else if (msg.includes('413') || msg.includes('payload')) {
          alert('导入文档失败：文件过大。请先拆分/压缩文档后再导入。')
        } else {
          alert(`导入文档失败：${msg || '请检查文件格式'}`)
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        controller = null
        timeoutId = null
        this.importingDoc = false
        if (input) input.value = ''
      }
    },
    async handleImageUpload(event) {
      const input = event?.target
      const files = Array.from(input?.files || [])
      if (files.length === 0) return
      for (const file of files) {
        if (!String(file.type || '').startsWith('image/')) continue
        try {
          const url = await this.fileToDataUrl(file)
          this.draftImages.unshift({
            id: `img_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            name: this.sanitizeFileName(file.name),
            url
          })
        } catch (error) {
          console.warn('图片读取失败', error)
        }
      }
      if (input) input.value = ''
    },
    insertImageToDraft(image) {
      const name = image?.name || 'image'
      const url = image?.url || ''
      if (!url) return
      const line = `![${name}](${url})`
      this.draft.content = this.draft.content
        ? `${this.draft.content}\n\n${line}`
        : line
    },
    removeDraftImage(id) {
      this.draftImages = this.draftImages.filter((item) => item.id !== id)
    },
    async copyColor(color) {
      const text = String(color || '').trim()
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
        alert(`已复制色值：${text}`)
      } catch (error) {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        alert(ok ? `已复制色值：${text}` : `复制失败：${text}`)
      }
    },
    triggerImportJson() {
      this.$refs.importRefJson?.click()
    },
    triggerImportCsv() {
      this.$refs.importRefCsv?.click()
    },
    async importJson(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const items = Array.isArray(parsed) ? parsed : parsed.items
        const normalized = this.normalizeArticles(items)
        if (normalized.length === 0) {
          alert('导入失败：未发现有效词条')
        } else {
          this.articles = normalized
          this.activeArticleId = normalized[0].id
          this.viewTab = 'read'
          this.resetArticleListScroll()
          this.persistArticles()
          alert(`导入成功：${normalized.length} 条词条`)
        }
      } catch (error) {
        alert(`导入失败：${error.message || '文件格式错误'}`)
      } finally {
        if (input) input.value = ''
      }
    },
    async importCsv(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const rows = this.parseCsvText(text)
        const items = rows.map((row, idx) => ({
          id: String(row.id || `wiki_${Date.now()}_${idx}`),
          title: String(row.title || '').trim(),
          summary: String(row.summary || ''),
          category: String(row.category || '').trim(),
          tags: String(row.tags || '').split('|').map((t) => t.trim()).filter(Boolean),
          content: String(row.content || ''),
          starred: String(row.starred || '').trim() === '1' || String(row.starred || '').toLowerCase() === 'true',
          views: Number(row.views) || 0,
          createdAt: Number(row.createdAt) || Date.now(),
          updatedAt: Number(row.updatedAt) || Date.now(),
          history: [],
          comments: []
        }))
        const normalized = this.normalizeArticles(items)
        if (normalized.length === 0) {
          alert('导入失败：CSV 中未发现有效词条')
        } else {
          this.articles = normalized
          this.activeArticleId = normalized[0].id
          this.viewTab = 'read'
          this.resetArticleListScroll()
          this.persistArticles()
          alert(`导入成功：${normalized.length} 条词条`)
        }
      } catch (error) {
        alert(`导入 CSV 失败：${error.message || '文件格式错误'}`)
      } finally {
        if (input) input.value = ''
      }
    },
    focusContentPanel() {
      const panel = this.$refs.contentPanelRef
      if (!panel || typeof panel.scrollIntoView !== 'function') return
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    backToList() {
      this.mobileReadMode = false
      this.$nextTick(() => {
        const list = document.querySelector('.list-panel')
        if (list && typeof list.scrollIntoView === 'function') {
          list.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    handleResize() {
      this.viewportWidth = window.innerWidth
      this.$nextTick(() => this.measureArticleListViewport())
      if (!this.isMobile) {
        this.mobileReadMode = false
        this.showMobileToc = false
        this.showMobileAnnotationList = false
        this.mobileActiveAnnotationId = ''
      }
    },
    toggleMobileToc() {
      this.showMobileToc = !this.showMobileToc
      if (this.showMobileToc) {
        this.showMobileAnnotationList = false
      }
    },
    toggleMobileAnnotationList() {
      this.showMobileAnnotationList = !this.showMobileAnnotationList
      if (this.showMobileAnnotationList) {
        this.showMobileToc = false
        if (!this.mobileActiveAnnotationId && this.activeArticle?.annotations?.length) {
          this.mobileActiveAnnotationId = String(this.activeArticle.annotations[0].id)
        }
      }
    },
    openMobileAnnotationOverview(annotationId = '') {
      if (!this.isMobile) return
      const id = String(annotationId || '')
      if (id) {
        this.mobileActiveAnnotationId = id
      } else if (!this.mobileActiveAnnotationId && this.activeArticle?.annotations?.length) {
        this.mobileActiveAnnotationId = String(this.activeArticle.annotations[0].id)
      }
      this.showMobileToc = false
      this.showMobileAnnotationList = true
    },
    startMobileQuickAnnotation() {
      this.showMobileAnnotationList = false
      this.annotateCurrentParagraphOnMobile()
    },
    adjustReaderFont(delta) {
      const next = this.readerFontSize + Number(delta || 0)
      this.readerFontSize = Math.max(13, Math.min(22, next))
    },
    adjustReaderLineHeight(delta) {
      const next = Math.round((this.readerLineHeight + Number(delta || 0)) * 100) / 100
      this.readerLineHeight = Math.max(1.45, Math.min(2.2, next))
    },
    ensureEditAutoSaveTimer() {
      if (this.editAutoSaveTimer) return
      this.editAutoSaveTimer = setInterval(() => {
        if (this.viewTab !== 'edit') return
        this.saveDraft({ auto: true, silent: true, keepEditing: true })
      }, 15000)
    },
    clearEditAutoSaveTimer() {
      if (!this.editAutoSaveTimer) return
      clearInterval(this.editAutoSaveTimer)
      this.editAutoSaveTimer = null
    },
    handleSaveShortcut(event) {
      const key = String(event?.key || '').toLowerCase()
      if (key !== 's') return
      if (!event?.ctrlKey && !event?.metaKey) return
      if (this.viewTab !== 'edit') return
      event.preventDefault()
      this.saveDraft()
    },
    onNetworkBackOnline() {
      this.syncLibraryInBackground()
    },
    handleButtonPressFeedback(event) {
      const target = event?.target
      if (!target || typeof target.closest !== 'function') return
      const button = target.closest('button, .btn, [role="button"]')
      if (!button || button.disabled) return
      button.classList.add('btn-pressed')
      setTimeout(() => {
        button.classList.remove('btn-pressed')
      }, 220)
    }
  },
  watch: {
    searchQuery() {
      this.resetArticleListScroll()
    },
    categoryFilter() {
      this.resetArticleListScroll()
    },
    sortBy() {
      this.resetArticleListScroll()
    },
    onlyStarred() {
      this.resetArticleListScroll()
    },
    draft: {
      deep: true,
      handler() {
        this.saveDraftCache()
      }
    },
    viewTab() {
      if (this.viewTab === 'edit') {
        this.readerFullscreen = false
        this.saveDraftCache()
        this.ensureEditAutoSaveTimer()
        return
      }
      this.clearEditAutoSaveTimer()
      if (this.viewTab !== 'read') {
        this.readerFullscreen = false
        this.clearAnnotationComposer()
        this.cancelPublishForm()
        this.cancelRemoveArticle()
        this.showMobileToc = false
        this.showMobileAnnotationList = false
        this.mobileActiveAnnotationId = ''
      }
      this.$nextTick(() => this.refreshInPageMatches())
    },
    readerFullscreen(value) {
      this.setDocumentScrollLock(Boolean(value))
    },
    activeArticleId() {
      this.showMobileToc = false
      this.showMobileAnnotationList = false
      this.mobileActiveAnnotationId = ''
      this.historyFilter = 'all'
      // 切换词条时始终回到阅读态，避免被历史编辑态“粘住”
      this.viewTab = 'read'
      this.clearAnnotationComposer()
      this.cancelPublishForm()
      this.cancelRemoveArticle()
      this.inPageQuery = ''
      this.inPageMatches = []
      this.inPageActiveIndex = -1
    },
    inPageQuery() {
      this.$nextTick(() => this.refreshInPageMatches())
    },
    renderedHtml() {
      this.$nextTick(() => this.refreshInPageMatches())
    }
  },
  mounted() {
    this.load()
    this.$nextTick(() => this.measureArticleListViewport())
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('online', this.onNetworkBackOnline)
    window.addEventListener('keydown', this.handleSaveShortcut)
    document.addEventListener('selectionchange', this.handleSelectionChange)
    document.addEventListener('mouseup', this.handleGlobalMouseUp)
    this.$el?.addEventListener?.('click', this.handleButtonPressFeedback, true)
  },
  beforeUnmount() {
    this.setDocumentScrollLock(false)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('online', this.onNetworkBackOnline)
    window.removeEventListener('keydown', this.handleSaveShortcut)
    document.removeEventListener('selectionchange', this.handleSelectionChange)
    document.removeEventListener('mouseup', this.handleGlobalMouseUp)
    this.$el?.removeEventListener?.('click', this.handleButtonPressFeedback, true)
    this.clearEditAutoSaveTimer()
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
      this.syncTimer = null
    }
  }
}
</script>

<style scoped>
.wiki-page { color: var(--app-text); }
.panel {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: 0 8px 20px var(--app-shadow-light);
}

.wiki-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 12px;
  padding: 16px;
  background-image:
    radial-gradient(circle at right top, color-mix(in srgb, var(--app-primary) 22%, transparent) 0%, transparent 58%),
    linear-gradient(135deg, color-mix(in srgb, var(--app-card) 84%, white), var(--app-card));
}

.wiki-hero h2 {
  margin: 0;
  font-family: "Palatino", "Palatino Linotype", "Songti SC", serif;
  letter-spacing: 0.02em;
}

.wiki-hero p { margin: 6px 0 0; color: var(--app-text-muted); }
.hero-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat { padding: 6px 10px; border-radius: 999px; border: 1px solid var(--app-border); background: var(--app-card-elevated); font-size: 0.82em; }

.wiki-toolbar {
  margin-bottom: 12px;
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 140px 130px repeat(8, auto);
  gap: 8px;
  align-items: center;
}
.import-log-wrap {
  grid-column: 1 / -1;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 8px;
}
.import-log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.import-log-panel {
  max-height: 180px;
  overflow: auto;
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  padding: 6px;
  font-size: 0.78em;
  background: var(--app-card);
}
.import-log-line {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 8px;
  padding: 3px 2px;
}
.import-log-line .time { color: var(--app-text-muted); }
.import-log-line.lv-error .msg { color: #b91c1c; }
.import-log-line.lv-warn .msg { color: #b45309; }
.import-log-line.lv-success .msg { color: #166534; }
.import-log-empty {
  color: var(--app-text-muted);
  font-size: 0.9em;
  padding: 6px 4px;
}

.wiki-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 280px;
  gap: 12px;
}

.palette-panel { margin-bottom: 12px; padding: 12px; }
.palette-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.palette-head h3 { margin: 0; font-size: 0.96em; }
.palette-groups { display: grid; gap: 10px; }
.palette-group h4 { margin: 0 0 6px; font-size: 0.84em; color: var(--app-text-secondary); }
.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.swatch {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  min-height: 46px;
  padding: 6px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.swatch:hover { transform: translateY(-1px); }
.swatch-code {
  font-size: 0.74em;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.list-panel,
.content-panel,
.side-panel { padding: 12px; min-height: 640px; }
.list-panel h3,
.side-panel h3 { margin: 0 0 10px; font-size: 1em; }

.article-list { display: grid; gap: 8px; max-height: 760px; overflow: auto; }
.article-item {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
  cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: 180px;
}
.list-load-more { display: flex; justify-content: center; padding: 6px 0 2px; }
.article-item.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px var(--app-shadow-light);
}
.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.item-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.item-head h4 { margin: 0; font-size: 0.98em; }
.star-btn {
  border: none;
  background: transparent;
  color: #f59e0b;
  font-size: 1.1em;
  cursor: pointer;
}
.btn-danger-inline {
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 8px;
  border-color: #fecaca;
  color: #b91c1c;
}
.summary { margin: 6px 0 0; font-size: 0.86em; color: var(--app-text-secondary); }

.content-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.content-head h3 {
  margin: 0;
  font-family: "Palatino", "Palatino Linotype", "Songti SC", serif;
}

.head-actions,
.actions,
.tags { display: flex; gap: 6px; flex-wrap: wrap; }

.read-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 12px;
}
.read-main { min-width: 0; }
.inline-toc {
  position: sticky;
  top: 10px;
  align-self: start;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 10px;
  max-height: 72dvh;
  overflow: auto;
}
.inline-toc h4 {
  margin: 0 0 8px;
  font-size: 0.9em;
  color: var(--app-text-secondary);
}
.mobile-read-tools {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
}
.tool-stat {
  font-size: 0.8em;
  color: var(--app-text-muted);
}

.markdown {
  line-height: 1.8;
  font-family: "Georgia", "Times New Roman", "Songti SC", serif;
  font-size: 15px;
}
.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
  margin-top: 22px;
  margin-bottom: 8px;
  font-family: "Palatino", "Palatino Linotype", "Songti SC", serif;
}
.markdown :deep(h1) {
  font-size: 1.52em;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--app-border);
}
.markdown :deep(h2) {
  font-size: 1.24em;
  padding-left: 8px;
  border-left: 3px solid color-mix(in srgb, var(--app-primary) 55%, transparent);
}
.markdown :deep(h3) {
  font-size: 1.08em;
}
.markdown :deep(p) { margin: 10px 0; }
.markdown :deep(code) {
  background: color-mix(in srgb, var(--app-primary) 14%, transparent);
  padding: 2px 6px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.markdown :deep(pre) {
  margin: 10px 0;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  overflow: auto;
}
.markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
.markdown :deep(ul),
.markdown :deep(ol) { padding-left: 24px; margin: 10px 0; }
.markdown :deep(li) { margin: 4px 0; }
.markdown :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 4px solid color-mix(in srgb, var(--app-primary) 45%, transparent);
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-text-secondary);
}
.markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.95em;
}
.markdown :deep(th),
.markdown :deep(td) {
  border: 1px solid var(--app-border);
  padding: 6px 8px;
  text-align: left;
}
.markdown :deep(th) {
  background: var(--app-card-elevated);
}
.markdown :deep(a) { color: var(--app-primary); }
.markdown :deep(img) {
  max-width: 100%;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  margin: 10px 0;
  display: block;
}

.lead {
  margin: 0 0 12px;
  padding: 10px;
  border-left: 4px solid var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-text-secondary);
}

.form-group { margin-bottom: 10px; }
.form-group label { display: block; margin-bottom: 5px; color: var(--app-text-secondary); font-size: 0.86em; font-weight: 700; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.input {
  width: 100%;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
  border-radius: 9px;
  padding: 8px 10px;
  font: inherit;
}
.input:focus { outline: none; border-color: var(--app-primary); }
.content-input { min-height: 280px; }

.meta {
  color: var(--app-text-muted);
  font-size: 0.8em;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.tag {
  font-size: 0.74em;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 14%, transparent);
  color: var(--app-primary);
}

.widget { margin-bottom: 14px; }
.toc-list,
.related-list,
.recent-list,
.history-list,
.comment-list { display: grid; gap: 8px; }
.toc-item,
.related-item {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  text-align: left;
  padding: 7px 8px;
  cursor: pointer;
  text-decoration: none;
  white-space: normal;
  line-height: 1.4;
}
.related-item:hover,
.toc-item:hover { border-color: var(--app-primary); color: var(--app-primary); }

.history-item,
.comment-item {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.history-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.history-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.history-filter-bar label {
  font-size: 0.88em;
  color: var(--app-text-secondary);
}
.history-filter-select {
  width: auto;
  min-width: 120px;
  padding: 6px 10px;
}
.diff-panel {
  margin-top: 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
}
.diff-panel h4 { margin: 0 0 8px; font-size: 0.92em; }
.diff-pre {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78em;
  line-height: 1.5;
}
.draft-tip { margin: -2px 0 8px; font-size: 0.8em; color: var(--app-text-muted); }
.image-preview-list {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.image-preview-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 8px;
  background: var(--app-card-elevated);
}
.image-preview {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--app-border);
}
.image-preview-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.comment-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.comment-item p { margin: 6px 0 0; white-space: pre-wrap; }
.annotation-composer {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-primary) 6%, var(--app-card));
}
.annotation-fab {
  position: fixed;
  z-index: 70;
  border: 1px solid var(--app-primary);
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.82em;
  font-weight: 700;
  box-shadow: 0 8px 16px color-mix(in srgb, var(--app-primary) 25%, transparent);
  cursor: pointer;
}
.annotation-quote {
  border-left: 3px solid var(--app-primary);
  padding: 6px 10px;
  color: var(--app-text-secondary);
  margin-bottom: 10px;
  font-size: 0.92em;
}
.annotation-input {
  margin-bottom: 10px;
}
.annotation-color-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.annotation-color-btn {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.8em;
  cursor: pointer;
}
.annotation-color-btn.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 18%, transparent);
}
.annotation-color-btn.is-yellow { background: #fff6b8; }
.annotation-color-btn.is-green { background: #dcfce7; }
.annotation-color-btn.is-blue { background: #dbeafe; }
.annotation-color-btn.is-pink { background: #fce7f3; }
.annotation-color-btn.is-orange { background: #ffedd5; }
.annotation-color-btn.is-purple { background: #ede9fe; }
.annotation-color-btn.is-cyan { background: #cffafe; }
.annotation-color-btn.is-red { background: #fee2e2; }
.annotation-list {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}
.annotation-list-title {
  font-weight: 700;
  color: var(--app-text-secondary);
  font-size: 0.9em;
}
.annotation-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: start;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.annotation-item:hover {
  border-color: color-mix(in srgb, var(--app-primary) 42%, var(--app-border));
}

.annotation-item:focus-visible {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 22%, transparent);
}

.annotation-item.ann-focus-row {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 20%, transparent);
}
.annotation-jump {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 8px;
  padding: 4px 8px;
  color: var(--app-text-secondary);
  cursor: pointer;
}
.annotation-body {
  min-width: 0;
}
.annotation-topline {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.annotation-inline-row {
  margin: 0;
  color: var(--app-text);
  font-weight: 500;
  line-height: 1.45;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
}
.annotation-hit {
  margin: 0;
  color: var(--app-text);
  font-weight: 600;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 6px;
}
.annotation-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}
.dot-yellow { background: #eab308; }
.dot-green { background: #22c55e; }
.dot-blue { background: #3b82f6; }
.dot-pink { background: #ec4899; }
.dot-orange { background: #f97316; }
.dot-purple { background: #8b5cf6; }
.dot-cyan { background: #06b6d4; }
.dot-red { background: #ef4444; }
.annotation-note {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}
.annotation-mini {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  padding: 2px 8px;
  font-size: 0.74em;
  color: var(--app-text-secondary);
  background: color-mix(in srgb, var(--app-card) 92%, #fff);
  max-width: 100%;
}
.annotation-mini--quote {
  flex: 1 1 56%;
  min-width: 0;
  max-width: none;
  color: var(--app-text);
  border-color: color-mix(in srgb, var(--app-primary) 24%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}
.annotation-mini--note {
  flex: 1 1 44%;
  min-width: 0;
  max-width: none;
}
.annotation-mini--quote,
.annotation-mini--note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.annotation-saved-tip {
  margin-top: 8px;
  font-size: 0.82em;
  color: #166534;
}
.annotation-status {
  margin: 6px 0 0;
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.78em;
  font-weight: 700;
}
.annotation-status.status-open {
  background: #fef3c7;
  color: #92400e;
}
.annotation-status.status-resolved {
  background: #dcfce7;
  color: #166534;
}
.annotation-locate-tip {
  margin: 6px 0 0;
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.76em;
  font-weight: 700;
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}
.annotation-replies {
  margin-top: 8px;
  display: grid;
  gap: 6px;
}
.annotation-reply {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 6px 8px;
  background: var(--app-card);
}
.annotation-reply p {
  margin: 4px 0 0;
  line-height: 1.55;
  white-space: pre-wrap;
}
.annotation-reply-editor {
  margin-top: 8px;
}
.annotation-side-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
:deep(mark.text-annotation) {
  background: color-mix(in srgb, #fde68a 68%, #fff);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
  box-decoration-break: clone;
}
:deep(mark.text-annotation.ann-green) { background: color-mix(in srgb, #bbf7d0 68%, #fff); }
:deep(mark.text-annotation.ann-blue) { background: color-mix(in srgb, #bfdbfe 68%, #fff); }
:deep(mark.text-annotation.ann-pink) { background: color-mix(in srgb, #fbcfe8 68%, #fff); }
:deep(mark.text-annotation.ann-orange) { background: color-mix(in srgb, #fed7aa 68%, #fff); }
:deep(mark.text-annotation.ann-purple) { background: color-mix(in srgb, #ddd6fe 68%, #fff); }
:deep(mark.text-annotation.ann-cyan) { background: color-mix(in srgb, #a5f3fc 68%, #fff); }
:deep(mark.text-annotation.ann-red) { background: color-mix(in srgb, #fecaca 68%, #fff); }

.mobile-annotation-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  z-index: 60;
}
.mobile-annotation-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 61;
  border-radius: 14px 14px 0 0;
  padding: 12px;
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.2);
}
.mobile-annotation-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.timeline-list { display: grid; gap: 10px; }
.timeline-item {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
}
.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  margin-top: 6px;
  box-shadow: 0 0 0 3px color-mix(in srgb, #22c55e 22%, transparent);
}
.timeline-dot.update {
  background: #3b82f6;
  box-shadow: 0 0 0 3px color-mix(in srgb, #3b82f6 22%, transparent);
}
.timeline-link {
  margin-top: 3px;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--app-primary);
  text-align: left;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.btn {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
}
.btn-primary { background: var(--app-primary); color: var(--app-on-primary); border-color: transparent; box-shadow: 0 8px 18px var(--app-shadow); }
.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn-sm { padding: 5px 8px; font-size: 0.8em; }

.empty {
  text-align: center;
  border: 1px dashed var(--app-border);
  color: var(--app-text-muted);
  border-radius: 10px;
  padding: 28px 10px;
}
.empty.mini { padding: 14px 8px; font-size: 0.82em; }

.check { font-size: 0.84em; color: var(--app-text-secondary); display: inline-flex; align-items: center; gap: 6px; }
.hidden-input { display: none; }
.mobile-toc-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 49;
}
.mobile-toc-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 72dvh;
  overflow: auto;
  z-index: 50;
  border-radius: 16px 16px 0 0;
  transform: translateY(105%);
  transition: transform 0.22s ease;
}
.mobile-ann-list-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 72dvh;
  overflow: auto;
  z-index: 50;
  border-radius: 16px 16px 0 0;
  transform: translateY(105%);
  transition: transform 0.22s ease;
}
.mobile-toc-drawer.open {
  transform: translateY(0);
}
.mobile-ann-list-drawer.open {
  transform: translateY(0);
}
.mobile-toc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.mobile-toc-head h3 {
  margin: 0;
  font-size: 0.95em;
}

.mobile-ann-focus-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 9px 10px;
  margin-bottom: 8px;
  background: color-mix(in srgb, var(--app-card-elevated) 95%, #ffffff);
}

.mobile-ann-focus-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mobile-ann-focus-card__head strong {
  font-size: 0.82em;
  color: var(--app-text-secondary);
}

.mobile-ann-focus-card__quote {
  margin: 7px 0 0;
  font-size: 0.84em;
  line-height: 1.5;
  color: var(--app-text);
}

.mobile-ann-focus-card__note {
  margin: 6px 0 0;
  font-size: 0.8em;
  line-height: 1.45;
  color: var(--app-text-secondary);
}

.mobile-annotation-dock {
  position: fixed;
  left: 10px;
  right: 10px;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  z-index: 62;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-card) 96%, #ffffff);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
}

.mobile-annotation-dock .btn {
  min-height: 36px;
}

@media (max-width: 1080px) {
  .wiki-layout { grid-template-columns: 280px minmax(0, 1fr); }
  .side-panel { grid-column: 1 / -1; min-height: auto; }
  .read-layout { grid-template-columns: 1fr; }
  .inline-toc {
    display: block;
    position: static;
    max-height: none;
    order: 2;
    margin-top: 10px;
  }
}

@media (max-width: 880px) {
  .wiki-toolbar {
    grid-template-columns: 1fr;
  }
  .import-log-line {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .swatches { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wiki-layout { grid-template-columns: 1fr; }
  .list-panel,
  .content-panel,
  .side-panel { min-height: auto; }
  .content-head { flex-direction: column; }
  .form-row { grid-template-columns: 1fr; }
  .mobile-read-tools .btn {
    padding: 6px 8px;
    font-size: 0.78em;
  }
  .annotation-item {
    grid-template-columns: 1fr;
  }
  .annotation-side-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

/* Enterprise Layout Overrides */
.wiki-page {
  background:
    radial-gradient(circle at 88% -8%, color-mix(in srgb, var(--app-primary) 10%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--app-bg) 92%, #ffffff), var(--app-bg));
  border-radius: 14px;
  padding: 12px;
}

.panel {
  border-radius: 14px;
  box-shadow: var(--app-soft-shadow);
}

.wiki-layout {
  grid-template-columns: 220px minmax(0, 2.45fr) 210px;
  gap: 20px;
}

.wiki-layout.reading-mode {
  grid-template-columns: 200px minmax(0, 1fr);
}

.wiki-layout.reading-mode .side-panel {
  display: none;
}

.wiki-hero {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 20px 22px;
  background: color-mix(in srgb, var(--app-card) 94%, #ffffff);
  margin-bottom: 16px;
}

.wiki-hero h2,
.content-head h3,
.markdown {
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.wiki-toolbar {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 14px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  gap: 12px;
  margin-bottom: 16px;
}

.list-panel,
.content-panel,
.side-panel {
  min-height: 660px;
  padding: 26px;
  background: color-mix(in srgb, var(--app-card) 96%, #ffffff);
}

.article-list {
  gap: 12px;
}

.article-item {
  border-radius: 12px;
  padding: 14px;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
  contain-intrinsic-size: 220px;
}

.article-item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--app-primary) 35%, var(--app-border));
}

.article-item.active {
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--app-primary) 42%, var(--app-border));
}

.article-item.located {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 16%, #ffffff);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 28%, transparent);
  animation: locatedPulse 1.1s ease;
}

.item-head h4 {
  font-size: 1.08rem;
  line-height: 1.4;
}

.summary {
  margin-top: 10px;
  font-size: 0.94rem;
  line-height: 1.64;
}

.meta {
  font-size: 0.86rem;
  gap: 8px;
}

.content-head {
  gap: 18px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--app-border);
}

.publish-form-panel {
  margin: -8px 0 14px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-card));
}

.publish-form-title {
  margin-bottom: 8px;
  font-size: 0.92em;
  font-weight: 700;
  color: var(--app-text-secondary);
}

.delete-form-panel {
  margin: -8px 0 14px;
  padding: 12px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff7f7;
}

.delete-form-title {
  margin-bottom: 8px;
  font-size: 0.92em;
  font-weight: 700;
  color: #b91c1c;
}

.delete-form-tip {
  margin: 0 0 10px;
  font-size: 0.84em;
  color: #7f1d1d;
  line-height: 1.5;
}

.head-actions,
.actions,
.tags {
  gap: 12px;
}

.read-layout {
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 300px;
}

.read-layout.annotation-only {
  grid-template-columns: minmax(0, 1.4fr) minmax(340px, 0.95fr);
}

.read-layout.compact-rail {
  grid-template-columns: minmax(0, 1fr);
}

.read-layout.compact-rail .inline-toc {
  display: none;
}

.read-main {
  order: 1;
  min-width: 0;
}

.inpage-toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto auto auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--app-card) 95%, #ffffff);
  margin-bottom: 12px;
}

.inpage-meta {
  font-size: 0.8em;
  color: var(--app-text-muted);
  white-space: nowrap;
}

.inpage-select {
  width: auto;
  min-width: 110px;
  padding: 6px 9px;
}

.reader-select {
  width: auto;
  min-width: 110px;
  padding: 5px 8px;
  font-size: 0.8em;
}

.inline-toc {
  order: 2;
  position: sticky;
  top: 12px;
  max-height: calc(100dvh - 120px);
  overflow: auto;
  margin-top: 0;
  background: color-mix(in srgb, var(--app-card) 95%, #ffffff);
  border: 1px solid var(--app-border);
  padding: 12px;
}

.inline-panel-section + .inline-panel-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--app-border);
}

.inline-panel-section h4 {
  margin: 0 0 8px;
  font-size: 0.92em;
  color: var(--app-text-secondary);
}

.annotation-list--rail {
  margin-top: 0;
}

.annotation-rail-section h4 {
  letter-spacing: 0.02em;
}

.annotation-list--word {
  gap: 10px;
}

.annotation-list--word .annotation-item {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  padding: 10px;
  border-radius: 12px;
  border-left: 4px solid color-mix(in srgb, var(--app-primary) 35%, var(--app-border));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-card-elevated) 92%, #ffffff),
    color-mix(in srgb, var(--app-card) 95%, #ffffff)
  );
}

.annotation-list--word .annotation-jump {
  align-self: start;
}

.annotation-index {
  align-self: start;
  min-width: 34px;
  text-align: center;
  border-radius: 999px;
  font-size: 0.74em;
  font-weight: 800;
  line-height: 1;
  padding: 7px 8px;
  border: 1px solid color-mix(in srgb, var(--app-primary) 24%, var(--app-border));
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, #ffffff);
}

.annotation-list--word .annotation-body {
  grid-column: 1;
  grid-row: 1;
}

.annotation-list--word .annotation-side-actions {
  grid-column: 1;
  grid-row: 2;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
}

.annotation-list--word .annotation-hit {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}

.annotation-list--word .annotation-note {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-card) 90%, #ffffff);
  border: 1px solid var(--app-border);
}

.annotation-list--word .annotation-inline-row {
  margin-bottom: 2px;
}

.annotation-list--word .annotation-topline {
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 4px;
}

.annotation-list--word .annotation-jump,
.annotation-list--word .annotation-index {
  transform: translateY(-0.32em);
  font-size: 0.66em;
  line-height: 1;
  min-height: 18px;
  padding: 3px 7px;
  border-radius: 999px;
}

.annotation-list--word .annotation-jump {
  border-color: color-mix(in srgb, var(--app-primary) 20%, var(--app-border));
  color: color-mix(in srgb, var(--app-primary) 78%, #111827);
  background: color-mix(in srgb, var(--app-primary) 8%, #ffffff);
}

.annotation-list--word .annotation-index {
  min-width: 0;
  padding-inline: 8px;
}

.annotation-list--word .annotation-status,
.annotation-list--word .annotation-locate-tip {
  transform: translateY(-0.24em);
  font-size: 0.68em;
  margin: 0;
  padding: 2px 8px;
}

.mobile-inline-annotations {
  margin-top: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-card) 94%, #ffffff);
  padding: 10px;
}

.mobile-inline-annotations__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.mobile-inline-annotations__head h4 {
  margin: 0;
  font-size: 0.88em;
}

.mobile-inline-annotations__list {
  display: grid;
  gap: 6px;
}

.mobile-inline-annotations__item {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  padding: 7px 8px;
  width: 100%;
  text-align: left;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 6px;
  row-gap: 3px;
}

.mobile-inline-annotations__item .annotation-color-dot {
  grid-row: 1 / span 2;
  align-self: center;
}

.mobile-inline-annotations__quote,
.mobile-inline-annotations__note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76em;
}

.mobile-inline-annotations__quote {
  color: var(--app-text);
}

.hit-item.active {
  border-color: var(--app-primary);
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
}

.reader-jump-tools {
  position: fixed;
  right: 18px;
  bottom: 20px;
  z-index: 46;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn {
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  padding: 8px 12px;
  transition: transform 0.12s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 28%, transparent);
}

.btn.btn-pressed {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 32%, transparent);
}

.btn-primary {
  box-shadow: 0 8px 20px color-mix(in srgb, var(--app-primary) 22%, transparent);
}

.input {
  border-radius: 10px;
  font-size: 14px;
  padding: 10px 12px;
}

.markdown {
  font-size: 17px;
  line-height: 2;
  max-width: 104ch;
  margin: 0 auto;
}

.read-layout.compact-rail .markdown {
  max-width: 116ch;
}

.lead {
  margin-bottom: 18px;
  padding: 14px;
}

.toc-item,
.related-item {
  border-radius: 10px;
  padding: 10px 12px;
  line-height: 1.55;
  font-size: 0.95rem;
}

.history-item,
.comment-item,
.timeline-item {
  border-radius: 12px;
  padding: 14px;
}

.widget {
  margin-bottom: 18px;
}

.inline-toc,
.mobile-read-tools,
.mobile-toc-drawer,
.mobile-ann-list-drawer {
  border-radius: 10px;
}

:deep(.ann-inline-wrap) {
  display: inline;
  vertical-align: baseline;
}

:deep(.ann-inline-note) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  transform: translateY(-0.42em);
  width: 1.55em;
  height: 1.55em;
  border: 1px solid color-mix(in srgb, var(--app-primary) 22%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 10%, #fff);
  color: color-mix(in srgb, var(--app-primary) 86%, #111827);
  border-radius: 999px;
  padding: 0;
  font-size: 0.64em;
  font-weight: 700;
  line-height: 1;
}

:deep(.ann-inline-note.is-empty) {
  opacity: 0.7;
  border-style: solid;
}

:deep(.ann-inline-wrap.ann-focus .ann-inline-note) {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-primary) 18%, transparent);
}

:deep(.inpage-match-focus) {
  background: color-mix(in srgb, var(--app-primary) 13%, transparent);
  outline: 1px solid color-mix(in srgb, var(--app-primary) 45%, transparent);
  border-radius: 8px;
  transition: background 0.25s ease;
}

.markdown :deep(.ann-fallback-list) {
  border: 1px dashed color-mix(in srgb, var(--app-primary) 35%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 6%, #ffffff);
  border-radius: 10px;
  padding: 8px 10px;
  margin: 10px 0 14px;
}

.markdown :deep(.ann-fallback-title) {
  font-size: 0.82em;
  color: var(--app-text-secondary);
  font-weight: 700;
  margin-bottom: 6px;
}

.markdown :deep(.ann-fallback-item) {
  font-size: 0.84em;
  color: var(--app-text-muted);
  line-height: 1.45;
}

.markdown :deep(.ann-fallback-item + .ann-fallback-item) {
  margin-top: 4px;
}

.markdown.ann-view-highlight :deep(.ann-inline-note) {
  display: none;
}

.markdown.ann-view-note :deep(mark.text-annotation) {
  background: transparent;
  border-bottom: 2px dashed color-mix(in srgb, var(--app-primary) 55%, transparent);
}

@keyframes locatedPulse {
  0% { transform: translateY(0); }
  30% { transform: translateY(-1px); }
  100% { transform: translateY(0); }
}

@media (max-width: 1200px) {
  .wiki-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }
  .wiki-layout.reading-mode {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .side-panel {
    grid-column: 1 / -1;
    min-height: auto;
  }
}

@media (min-width: 1600px) {
  .wiki-layout {
    grid-template-columns: 230px minmax(0, 2.8fr) 220px;
  }
  .markdown {
    max-width: 118ch;
  }
  .read-layout.compact-rail .markdown {
    max-width: 126ch;
  }
}

.wiki-layout.focus-reading {
  grid-template-columns: 1fr;
}

.wiki-layout.focus-reading .list-panel,
.wiki-layout.focus-reading .side-panel {
  display: none;
}

.wiki-layout.focus-reading .content-panel {
  grid-column: 1 / -1;
  min-height: auto;
}

.wiki-layout.reader-fullscreen {
  grid-template-columns: 1fr;
}

.wiki-layout.reader-fullscreen .list-panel,
.wiki-layout.reader-fullscreen .side-panel {
  display: none;
}

.wiki-layout.reader-fullscreen .content-panel {
  position: fixed;
  inset: 10px;
  z-index: 1500;
  margin: 0;
  width: auto;
  max-width: none;
  min-height: auto;
  overflow: auto;
  padding: 18px;
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.26);
}

.wiki-layout.reader-fullscreen .read-layout {
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 1fr);
}

.wiki-layout.reader-fullscreen .read-layout.compact-rail {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 880px) {
  .wiki-page {
    padding: 0;
  }
  .wiki-toolbar {
    padding: 12px;
    gap: 10px;
  }
  .list-panel,
  .content-panel,
  .side-panel {
    min-height: auto;
    padding: 14px;
  }
  .content-panel {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }
  .head-actions {
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
    gap: 8px;
  }
  .head-actions .btn {
    flex: 0 0 auto;
    min-width: auto;
    white-space: nowrap;
    padding: 7px 10px;
    font-size: 0.82em;
  }
  .inpage-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .inpage-meta {
    grid-column: 1 / -1;
  }
  .inpage-select {
    grid-column: 1 / -1;
    width: 100%;
  }
  .read-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .mobile-read-tools {
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
  }
  .mobile-read-tools .btn,
  .mobile-read-tools .reader-select {
    min-height: 34px;
  }
  .mobile-read-tools .reader-select {
    padding: 6px 9px;
  }
  .inline-toc {
    position: static;
    max-height: none;
    order: 2;
  }
  .annotation-list--word .annotation-item {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }
  .annotation-index,
  .annotation-list--word .annotation-jump,
  .annotation-list--word .annotation-body,
  .annotation-list--word .annotation-side-actions {
    grid-column: auto;
    grid-row: auto;
  }
  .annotation-index {
    justify-self: start;
  }
  .markdown {
    font-size: 16.5px;
    line-height: 1.96;
    letter-spacing: 0.01em;
    font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .markdown :deep(h1) {
    font-size: 1.38em;
    margin-top: 18px;
    margin-bottom: 10px;
  }
  .markdown :deep(h2) {
    font-size: 1.2em;
    margin-top: 16px;
    margin-bottom: 9px;
  }
  .markdown :deep(h3) {
    font-size: 1.08em;
    margin-top: 14px;
    margin-bottom: 8px;
  }
  .markdown :deep(p) {
    margin: 0 0 0.98em;
    text-align: justify;
    text-justify: inter-ideograph;
  }
  .markdown :deep(li) {
    margin: 6px 0;
    line-height: 1.85;
  }
  .markdown :deep(blockquote) {
    padding: 10px 12px;
    line-height: 1.8;
  }
  .markdown :deep(pre) {
    border-radius: 10px;
    font-size: 0.84em;
  }
  .markdown :deep(img) {
    border-radius: 12px;
    margin: 12px 0;
  }
  .mobile-inline-annotations {
    margin-top: 14px;
    padding: 10px;
    border-radius: 12px;
  }
  .mobile-inline-annotations__item {
    min-height: 46px;
    padding: 8px 9px;
  }
  .mobile-inline-annotations__quote,
  .mobile-inline-annotations__note {
    font-size: 0.8em;
    line-height: 1.4;
  }
  .reader-jump-tools {
    right: 10px;
    bottom: 12px;
  }
  .wiki-layout.reader-fullscreen .content-panel {
    inset: 0;
    border-radius: 0;
    padding: 12px;
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }
  .wiki-layout.reader-fullscreen .read-layout {
    grid-template-columns: 1fr;
  }
}
</style>
