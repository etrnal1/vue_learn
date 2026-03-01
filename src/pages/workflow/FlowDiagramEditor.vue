<template>
  <div class="flow-editor">
    <!-- 流程列表或编辑器 -->
    <div v-if="!editingFlow" class="flow-list-view">
      <header class="editor-header">
        <div>
          <h2>流程图编辑器</h2>
          <p class="subtitle">创建和编辑流程节点、连线与条件</p>
        </div>
        <button class="btn btn-primary" :disabled="!canEditFlow" @click="createNewFlow">
          + 新建流程
        </button>
      </header>

      <div v-if="loading && flows.length === 0" class="list-loading">
        <div class="list-loading__icon">⏳</div>
        <p>正在加载流程...</p>
      </div>

      <div v-else-if="!loading && flows.length === 0" class="empty-state">
        <div class="empty-icon">🌀</div>
        <p>暂无流程</p>
        <button class="btn btn-primary" @click="createNewFlow">创建第一个流程</button>
      </div>

      <div v-else class="flow-cards">
        <div v-for="flow in flows" :key="flow.id" class="flow-card-item">
          <div class="card-header">
            <h3>{{ flow.name }}</h3>
            <span class="badge">{{ (flow.steps || []).length }} 步</span>
          </div>
          <p class="card-desc">{{ flow.description || '暂无描述' }}</p>

          <!-- 步骤预览 -->
          <div v-if="flow.steps && flow.steps.length > 0" class="steps-preview-list">
            <div class="preview-title">步骤预览：</div>
            <div class="steps-preview-items">
              <div v-for="(step, idx) in flow.steps" :key="step.id || idx" class="preview-step">
                <span class="step-num">{{ idx + 1 }}</span>
                <div class="step-info">
                  <span class="step-title">{{ step.name || '（未命名）' }}</span>
                  <span v-if="step.description" class="step-desc">{{ step.description }}</span>
                  <span v-if="step.tip" class="preview-tip">提示：{{ step.tip }}</span>
                  <span v-if="step.note" class="preview-note">备注：{{ step.note }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn btn-small" @click="editFlow(flow)">编辑</button>
            <button class="btn btn-small btn-danger" :disabled="!canAdminFlow" @click="deleteFlow(flow)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 流程编辑器 -->
    <div v-else class="flow-editor-view">
      <header class="editor-header">
        <button class="btn-back" @click="editingFlow = null">← 返回</button>
        <div class="flow-info">
          <h2>
            <input
              v-model="editingFlow.name"
              class="flow-name-input"
              placeholder="流程名称"
              @input="scheduleAutoSave"
            />
          </h2>
          <textarea
            v-model="editingFlow.description"
            class="flow-desc-input"
            placeholder="流程描述"
            rows="2"
            @input="scheduleAutoSave"
          ></textarea>
        </div>
        <div class="editor-actions">
          <span class="sync-badge" :class="{ offline: !networkOnline, pending: pendingSyncCount > 0 }">
            {{ networkOnline ? '在线' : '离线' }} · 待同步 {{ pendingSyncCount }}
          </span>
          <button
            class="btn btn-small"
            :disabled="!networkOnline || pendingSyncCount === 0 || isFlushingOfflineQueue"
            @click="flushOfflineQueue(false)"
          >
            {{ isFlushingOfflineQueue ? '同步中...' : '立即同步' }}
          </button>
          <button class="btn btn-success" :disabled="!canSaveFlow || !canEditFlow" @click="saveFlow">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </header>

      <!-- 步骤编辑 -->
      <div class="steps-editor">
        <div class="steps-header">
          <div>
            <h3>流程步骤</h3>
            <p class="steps-count">共 {{ editingFlow.steps?.length || 0 }} 个步骤</p>
          </div>
          <button class="btn btn-small" :disabled="!canEditFlow" @click="addStep">+ 添加步骤</button>
        </div>

        <!-- 视图切换按钮 -->
        <div v-if="editingFlow.steps && editingFlow.steps.length > 0" class="view-switcher">
          <button :class="{ active: view === 'list' }" @click="switchView('list')">
            📋 列表视图
          </button>
          <button :class="{ active: view === 'timeline' }" @click="switchView('timeline')">
            📈 时间线视图
          </button>
          <button :class="{ active: view === 'canvas' }" @click="switchView('canvas')">
            🧩 画布拖拽
          </button>
          <button :class="{ active: view === 'relation' }" @click="switchView('relation')">
            🕸 关系视图
          </button>

          <!-- Phase 3: 参数传递系统按钮 -->
          <div class="toolbar-divider"></div>
          <button class="btn btn-sm" :disabled="!canEditFlow" @click="openVariableManager" title="管理流程变量">
            🔤 变量管理
          </button>
          <button v-if="selectedStepForParams" class="btn btn-sm" :disabled="!canEditFlow" @click="openParameterMapper" title="配置参数映射">
            🔗 参数配置
          </button>
        </div>

        <div v-if="!editingFlow.steps || editingFlow.steps.length === 0" class="no-steps">
          <p>暂无步骤，点击上面的按钮添加</p>
        </div>

        <!-- 时间线视图 -->
        <div
          v-if="timelineMounted && editingFlow.steps && editingFlow.steps.length > 0"
          v-show="view === 'timeline'"
          class="timeline-section"
        >
          <TimelineView :steps="editingFlow.steps" />
        </div>

        <div
          v-if="editingFlow.steps && editingFlow.steps.length > 0"
          v-show="view === 'relation'"
          class="relation-section"
        >
          <RelationView :steps="editingFlow.steps" />
        </div>

        <!-- 画布拖拽视图 -->
        <div
          v-if="canvasMounted"
          v-show="view === 'canvas'"
          class="canvas-section"
        >
          <FlowEditor
            ref="flowEditorRef"
            v-if="editingFlow"
            v-model="flowDiagram"
            :title="editingFlow.name"
            :readonly="!canEditFlow"
            @save="onFlowDiagramSave"
            @node-select="onCanvasNodeClick"
            @layout-change="onCanvasLayoutChange"
          />
        </div>

        <!-- 列表视图 -->
        <div
          v-if="editingFlow.steps && editingFlow.steps.length > 0"
          v-show="view === 'list'"
          class="steps-list-wrapper"
        >
          <div class="steps-list">
            <div
              v-for="(step, index) in editingFlow.steps"
              :key="step.id"
              class="step-item"
              :class="{ 'editing-step': editingStepIndex === index }"
              :data-step-id="step.id || ''"
              @click="editingStepIndex = index"
            >
              <div class="step-header-row">
                <div class="step-number">{{ index + 1 }}</div>
                <input
                  v-model="step.name"
                  class="step-input"
                  placeholder="步骤名称"
                  @input="scheduleAutoSave"
                />
                <div class="step-actions">
                  <button
                    class="btn-icon"
                    @click.stop="insertStepAt(index)"
                    :disabled="!canEditFlow"
                    title="向上插入"
                  >
                    ⤴️
                  </button>
                  <button
                    class="btn-icon"
                    @click.stop="insertStepAt(index + 1)"
                    :disabled="!canEditFlow"
                    title="向下插入"
                  >
                    ⤵️
                  </button>
                  <button
                    class="btn-icon"
                    @click.stop="moveStep(index, -1)"
                    :disabled="!canEditFlow || index === 0"
                    title="上移"
                  >
                    ⬆️
                  </button>
                  <button
                    class="btn-icon"
                    :disabled="!canEditFlow || index === editingFlow.steps.length - 1"
                    @click.stop="moveStep(index, 1)"
                    title="下移"
                  >
                    ⬇️
                  </button>
                  <button
                    class="btn-icon btn-danger"
                    :disabled="!canEditFlow"
                    @click.stop="removeStep(index)"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div class="step-content">
                <div class="step-field">
                  <label class="step-label">
                    <span class="label-text">描述</span>
                    <span class="label-hint">说明这个步骤的内容和目的</span>
                  </label>
                  <textarea
                    v-model="step.description"
                    class="step-textarea"
                    placeholder="例如：评估申请人的请假理由和工作状况"
                    rows="2"
                    @input="scheduleAutoSave"
                  ></textarea>
                </div>

                <div class="step-fields-row">
                  <div class="step-field">
                    <label class="step-label">
                      <span class="label-text">负责人</span>
                      <span class="label-hint">完成此步骤的人员角色或名称</span>
                    </label>
                    <input
                      v-model="step.assignee"
                      class="step-input-sm"
                      placeholder="例如：部门经理"
                      @input="scheduleAutoSave"
                    />
                  </div>
                  <div class="step-field">
                    <label class="step-label">
                      <span class="label-text">预计耗时</span>
                      <span class="label-hint">完成此步骤的大约时间</span>
                    </label>
                    <input
                      v-model="step.duration"
                      class="step-input-sm"
                      placeholder="例如：2h、30min"
                      @input="scheduleAutoSave"
                    />
                  </div>
                </div>

                <div class="step-fields-row">
                  <div class="step-field">
                    <label class="step-label">
                      <span class="label-text">流程关系</span>
                      <span class="label-hint">顺序=主链路，平级=并行/同级，子流程=隶属某一步</span>
                    </label>
                    <select v-model="step.relationType" class="step-input-sm" @change="onRelationTypeChange(step)">
                      <option value="sequential">顺序</option>
                      <option value="parallel">平级</option>
                      <option value="child">子流程</option>
                    </select>
                  </div>
                  <div class="step-field" v-if="step.relationType === 'child'">
                    <label class="step-label">
                      <span class="label-text">上级步骤</span>
                    </label>
                    <select v-model="step.parentStepId" class="step-input-sm" @change="scheduleAutoSave">
                      <option :value="null">请选择</option>
                      <option
                        v-for="parent in parentCandidatesFor(step.id)"
                        :key="parent.id"
                        :value="parent.id"
                      >
                        {{ parent.name || parent.id }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="step-field">
                  <label class="step-label">
                    <span class="label-text">提示</span>
                    <span class="label-hint">可写操作注意点或前置条件（选填）</span>
                  </label>
                  <textarea
                    v-model="step.tip"
                    class="step-textarea"
                    placeholder="例如：先确认申请表已填写完整"
                    rows="2"
                    @input="scheduleAutoSave"
                  ></textarea>
                </div>
                <div class="step-field">
                  <label class="step-label">
                    <span class="label-text">备注</span>
                    <span class="label-hint">写下任何补充说明或交付内容（选填）</span>
                  </label>
                  <textarea
                    v-model="step.note"
                    class="step-textarea"
                    placeholder="例如：本步骤需要同步记录在工单中"
                    rows="2"
                    @input="scheduleAutoSave"
                  ></textarea>
                </div>

                <label class="step-label checkbox-label">
                  <input v-model="step.conditional" type="checkbox" @change="scheduleAutoSave" />
                  <span class="label-text">条件触发</span>
                  <span class="label-hint">勾选表示该步骤仅在满足特定条件时执行</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 步骤数量提示 -->
          <div v-if="editingFlow.steps && editingFlow.steps.length > 0" class="steps-info">
            <p>💡 已添加 {{ editingFlow.steps.length }} 个步骤，可以使用上⬆️ 下⬇️ 按钮调整顺序</p>
          </div>
        </div>
      </div>

      <!-- 预览 -->
      <div class="steps-preview">
        <h3>预览</h3>
        <div class="preview-list">
          <div
            v-for="(step, index) in editingFlow.steps || []"
            :key="step.id"
            class="preview-item"
          >
            <div class="preview-index">{{ index + 1 }}</div>
            <div class="preview-info">
              <p class="preview-title">{{ step.name || `步骤 ${index + 1}` }}</p>
              <p class="preview-desc">{{ step.description }}</p>
              <p v-if="step.tip" class="preview-tip">提示：{{ step.tip }}</p>
              <p v-if="step.note" class="preview-note">备注：{{ step.note }}</p>
              <div class="preview-meta">
                <span v-if="step.assignee">👤 {{ step.assignee }}</span>
                <span v-if="step.duration">⏱ {{ step.duration }}</span>
                <span v-if="step.conditional">⚡ 条件触发</span>
                <span>🔗 {{ relationTypeLabel(step.relationType || step.relation_type) }}</span>
                <span v-if="step.parentStepId || step.parent_step_id">↳ 上级 {{ step.parentStepId || step.parent_step_id }}</span>
                <span v-if="step.moduleKey || step.module_key">🧩 {{ step.moduleKey || step.module_key }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="versions-panel">
        <div class="versions-header">
          <div>
            <h3>公共模块</h3>
            <p class="subtitle">把高频步骤存为公共模块，在任意流程中一键复用。</p>
          </div>
          <div class="versions-actions">
            <button class="btn btn-small" :disabled="!canEditFlow" @click="openSharedModuleForm('create')">
              新建模块
            </button>
            <button class="btn btn-small" :disabled="!canEditFlow || editingStepIndex == null" @click="openSharedModuleForm('create', null, 'selected-step')">
              当前步骤存为模块
            </button>
            <button class="btn btn-small" @click="loadSharedModules">
              刷新模块
            </button>
          </div>
        </div>
        <div v-if="sharedModulesLoading" class="versions-loading">加载模块中...</div>
        <div v-else-if="sharedModules.length === 0" class="versions-empty">暂无公共模块</div>
        <ul v-else class="versions-list">
          <li v-for="module in sharedModules" :key="module.id" class="versions-item">
            <div>
              <strong>{{ module.name }}</strong>
              <p>{{ module.module_key }} · {{ formatDate(module.updated_at || module.updatedAt) }}</p>
            </div>
            <div class="versions-actions">
              <button class="btn btn-small" :disabled="!canEditFlow" @click="insertSharedModule(module)">
                插入流程
              </button>
              <button class="btn btn-small" :disabled="!canEditFlow" @click="editSharedModule(module)">
                编辑
              </button>
              <button class="btn btn-small btn-danger" :disabled="!canEditFlow" @click="removeSharedModule(module)">
                删除
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="versions-panel trace-learning-panel">
        <div class="versions-header">
          <div>
            <h3>交易模拟 · 链路学习</h3>
            <p class="subtitle">一笔交易可包含多条链路；支持从当前流程步骤一键生成，再逐条补全 spans。</p>
          </div>
          <div class="versions-actions">
            <button class="btn btn-small" :disabled="!editingFlow?.steps?.length" @click="generateTradeFromFlow">
              从流程生成交易
            </button>
            <button class="btn btn-small" @click="showTraceLearning = !showTraceLearning">
              {{ showTraceLearning ? '收起' : '展开' }}
            </button>
          </div>
        </div>
        <div v-if="showTraceLearning" class="trace-learning-body">
          <TraceFlowDemo
            ref="traceDemo"
            :flow-context="editingFlow"
            :selected-step-id="selectedStepIdForTrace"
            @select-step="onTraceSelectStep"
          />
        </div>
        <div v-else class="versions-empty">展开后可查看/编辑交易与链路。</div>
      </div>

      <div class="versions-panel">
        <div class="versions-header">
          <div>
            <h3>版本历史</h3>
            <p class="subtitle">展示已发布的快照，支持手动创建与回滚</p>
          </div>
          <div class="versions-actions">
              <button class="btn btn-small" :disabled="creatingVersion || !canPublishFlow" @click="createVersion">
                {{ creatingVersion ? '创建中…' : '创建版本' }}
              </button>
              <button class="btn btn-small btn-danger" :disabled="rollingBack || !flowVersions.length || !canPublishFlow" @click="rollbackVersion">
                {{ rollingBack ? '回滚中…' : '回滚最新' }}
              </button>
            </div>
        </div>
        <div v-if="versionsLoading" class="versions-loading">
          <span class="list-loading__icon">⏳</span>
          <p>加载版本...</p>
        </div>
        <div v-else-if="versionError" class="versions-error">
          <p>版本加载失败：{{ versionError }}</p>
        </div>
        <div v-else-if="flowVersions.length === 0" class="versions-empty">
          <p>暂无版本</p>
        </div>
        <ul v-else class="versions-list">
          <li v-for="version in flowVersions" :key="version.id" class="versions-item">
            <div>
              <strong>{{ version.name || version.note || version.id }}</strong>
              <p>{{ formatDate(version.created_at || version.createdAt || version.timestamp) }}</p>
            </div>
            <span class="versions-status">{{ version.status || '未知' }}</span>
          </li>
        </ul>
      </div>

      <div class="collaboration-panel">
        <div class="collaboration-header">
          <div>
            <h3>协作 & 条件泳道</h3>
            <p class="subtitle">针对当前流程收集评论与条件路径概览，可 @ 用户提醒并在泳道视图中查看分支。</p>
          </div>
          <button class="btn btn-small" @click="toggleSwimlaneView">
            {{ showSwimlaneView ? '隐藏泳道视图' : '显示泳道视图' }}
          </button>
        </div>
        <div v-if="showSwimlaneView" class="swimlane-container">
          <div v-for="lane in swimlaneLanes" :key="lane.id" class="swimlane">
            <p class="swimlane-label">{{ lane.label }}</p>
            <div class="swimlane-steps">
              <label v-for="step in lane.steps" :key="step.id" class="swimlane-step">
                <input type="radio" :value="step.id" v-model="commentDraft.stepId" />
                <div>
                  <strong>{{ step.name || '未命名步骤' }}</strong>
                  <p class="swimlane-step__meta">
                    <span v-if="step.assignee">👤 {{ step.assignee }}</span>
                    <span v-if="step.duration">⏱ {{ step.duration }}</span>
                    <span v-if="step.conditional">⚡ 条件</span>
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="comment-section">
          <div class="comment-form">
            <label>评论目标步骤</label>
            <div class="comment-step-select">
              <select v-model="commentDraft.stepId">
                <option v-for="step in editingFlow?.steps || []" :key="step.id" :value="step.id">
                  {{ step.name || `步骤 ${editingFlow.steps.indexOf(step) + 1}` }}
                </option>
              </select>
            </div>
            <label>内容</label>
            <textarea
              v-model="commentDraft.text"
              rows="3"
              placeholder="输入评论/反馈。可使用 @用户名 快速提醒。"
              @input="commentDraft.text = commentDraft.text.slice(0, 512)"
            ></textarea>
            <label>提醒人（可选）</label>
            <input
              list="user-suggestions"
              v-model="commentDraft.mention"
              placeholder="例如 alice、bob"
            />
            <datalist id="user-suggestions">
              <option v-for="user in availableUsers" :value="user" :key="user" />
            </datalist>
            <button class="btn btn-small" :disabled="!canCommentFlow" @click="addComment">添加评论</button>
          </div>
          <div class="comment-list">
            <div v-if="!currentStepComments.length" class="comment-empty">当前步骤暂无评论</div>
            <article
              v-for="comment in currentStepComments"
              :key="comment.id"
              class="comment-card"
            >
              <div class="comment-card__meta">
                <span class="comment-author">{{ comment.author }}</span>
                <span class="comment-status" :class="`comment-status--${comment.status || 'open'}`">
                  {{ comment.status === 'resolved' ? '已解决' : '待处理' }}
                </span>
                <span class="comment-ts">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <p v-html="highlightMentions(comment.text)" class="comment-body"></p>
              <div class="comment-actions">
                <button
                  v-if="comment.status !== 'resolved'"
                  class="btn btn-small"
                  @click="updateCommentStatus(comment, 'resolved')"
                >
                  标记已解决
                </button>
                <button
                  v-else
                  class="btn btn-small"
                  @click="updateCommentStatus(comment, 'open')"
                >
                  重新打开
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 3: 流程变量管理对话框 -->
    <ItsmModal
      v-if="showVariableManager"
      title="流程变量管理"
      size="large"
      @close="showVariableManager = false"
    >
      <VariableDefinitionDialog
        :flowId="editingFlow.id"
        @close="showVariableManager = false"
        @variables-updated="onVariablesUpdated"
      />
    </ItsmModal>

    <!-- Phase 3: 参数映射对话框 -->
    <ItsmModal
      v-if="showParameterMapper && selectedStepForParams"
      :title="`参数映射 - ${selectedStepForParams.name}`"
      size="large"
      @close="showParameterMapper = false"
    >
      <ParameterMappingDialog
        :flowId="editingFlow.id"
        :stepId="selectedStepForParams.id"
        :stepName="selectedStepForParams.name"
        :availableVariables="flowVariables"
        @close="showParameterMapper = false"
        @parameters-updated="onParametersUpdated"
      />
    </ItsmModal>

    <ItsmModal
      v-if="showSharedModuleForm"
      :title="sharedModuleFormMode === 'edit' ? '编辑公共模块' : '新建公共模块'"
      size="large"
      @close="closeSharedModuleForm"
    >
      <div class="module-form">
        <div class="module-form-row">
          <label>模块名称</label>
          <input v-model.trim="sharedModuleForm.name" class="step-input" placeholder="例如：风控审批模块" />
        </div>
        <div class="module-form-row">
          <label>模块标识（moduleKey）</label>
          <input v-model.trim="sharedModuleForm.moduleKey" class="step-input" placeholder="例如：risk_approval_v1" />
        </div>
        <div class="module-form-row">
          <label>描述（可选）</label>
          <textarea v-model="sharedModuleForm.description" class="step-textarea" rows="2" placeholder="描述此模块适用场景"></textarea>
        </div>
        <div class="module-form-row">
          <label>模板来源</label>
          <select v-model="sharedModuleForm.sourceType" class="step-input-sm">
            <option value="empty">单步骤空模板</option>
            <option value="selected-step" :disabled="editingStepIndex == null">当前选中步骤</option>
            <option value="flow-all" :disabled="!editingFlow?.steps?.length">当前流程全部步骤</option>
            <option v-if="sharedModuleFormMode === 'edit'" value="keep-existing">保留模块原模板</option>
          </select>
        </div>
        <p class="module-form-hint">
          将按所选来源生成模块步骤模板；后续可继续编辑模块并覆盖模板。
        </p>
        <div class="module-form-actions">
          <button class="btn btn-small" @click="closeSharedModuleForm">取消</button>
          <button class="btn btn-small btn-success" :disabled="sharedModuleSubmitting" @click="submitSharedModuleForm">
            {{ sharedModuleSubmitting ? '提交中…' : (sharedModuleFormMode === 'edit' ? '保存修改' : '创建模块') }}
          </button>
        </div>
      </div>
    </ItsmModal>

    <!-- 消息提示 -->
    <div v-if="message" class="message" :class="[message.type, { 'auto-save': message.auto }]">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'
import { recordAudit } from '../../utils/auditLog.js'
import TraceFlowDemo from '../../components/workflow/TraceFlowDemo.vue'
import TimelineView from '../../components/workflow/TimelineView.vue'
import RelationView from '../../components/workflow/RelationView.vue'
import { VueFlow, applyNodeChanges } from '@vue-flow/core'
import FlowEditor from '../../components/flow-editor/FlowEditor.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import VariableDefinitionDialog from '../../components/flow-editor/dialogs/VariableDefinitionDialog.vue'
import ParameterMappingDialog from '../../components/flow-editor/dialogs/ParameterMappingDialog.vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const FLOW_OFFLINE_QUEUE_KEY = 'flow_editor_offline_sync_queue_v1'
const FLOW_DRAFT_PREFIX = 'flow_editor_draft_v1:'

export default {
  name: 'FlowDiagramEditor',
  components: { TraceFlowDemo, TimelineView, RelationView, VueFlow, FlowEditor, ItsmModal, VariableDefinitionDialog, ParameterMappingDialog },
  data() {
    return {
      flows: [],
      editingFlow: null,
      editingStepIndex: null,
      loading: false,
      saving: false,
      flowRbacEnabled: String(import.meta.env.VITE_FLOW_RBAC_ENABLED || 'false').toLowerCase() === 'true',
      flowPermissions: null,
      permissionsLoading: false,
      message: null,
      messageTimer: null,
      offlineQueue: [],
      networkOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
      isFlushingOfflineQueue: false,
      autoSaveTimer: null,
      lastSavedFlow: null,
      isAutoSaving: false,
      autoSaveEnabled: true,
      autoSaveInterval: 3000,  // 每 3 秒自动保存一次
      flowVersions: [],
      versionsLoading: false,
      versionError: '',
      creatingVersion: false,
      rollingBack: false,
      comments: [],
      commentsLoading: false,
      commentDraft: {
        stepId: null,
        text: '',
        mention: ''
      },
      availableUsers: ['alice', 'bob', 'charlie'],
      showSwimlaneView: false,
      showTraceLearning: true,
      timelineMounted: false,
      canvasMounted: false,
      canvasNodes: [],
      canvasEdges: [],
      canvasInteractionMode: 'node',
      sharedModules: [],
      sharedModulesLoading: false,
      showSharedModuleForm: false,
      sharedModuleFormMode: 'create',
      sharedModuleSubmitting: false,
      sharedModuleForm: {
        id: '',
        name: '',
        moduleKey: '',
        description: '',
        sourceType: 'empty'
      },
      view: 'list',  // 'list' | 'timeline' | 'canvas'
      flowDiagram: { nodes: [], edges: [] },
      // Phase 3: 参数传递与数据映射
      showVariableManager: false,
      showParameterMapper: false,
      flowVariables: [],
      selectedStepForParams: null,
      parametersLoading: false
    }
  },
  computed: {
    hasSteps() {
      return Array.isArray(this.editingFlow?.steps) && this.editingFlow.steps.length > 0
    },
    canSaveFlow() {
      return Boolean(
        this.editingFlow &&
        this.editingFlow.name?.trim() &&
        this.hasSteps &&
        !this.saving
      )
    },
    canEditFlow() {
      if (!this.flowRbacEnabled) return true
      return this.flowPermissions?.actions?.edit !== false
    },
    canPublishFlow() {
      if (!this.flowRbacEnabled) return true
      return this.flowPermissions?.actions?.publish !== false
    },
    canAdminFlow() {
      if (!this.flowRbacEnabled) return true
      return this.flowPermissions?.actions?.admin !== false
    },
    canCommentFlow() {
      if (!this.flowRbacEnabled) return true
      return this.flowPermissions?.actions?.comment !== false
    },
    currentCommentStepId() {
      if (this.commentDraft.stepId) return this.commentDraft.stepId
      return this.editingFlow?.steps?.[0]?.id || null
    },
    currentStepComments() {
      if (!this.currentCommentStepId) return []
      return this.comments.filter(comment => comment.stepId === this.currentCommentStepId)
    },
    swimlaneLanes() {
      const steps = this.editingFlow?.steps || []
      const lanes = [
        { id: 'primary', label: '默认路径', steps: [] },
        { id: 'conditional', label: '条件分支', steps: [] }
      ]
      steps.forEach((step) => {
        const target = step.conditional ? lanes[1] : lanes[0]
        target.steps.push(step)
      })
      return lanes
    },
    selectedStepIdForTrace() {
      const idx = this.editingStepIndex
      const steps = this.editingFlow?.steps || []
      if (idx == null || idx < 0 || idx >= steps.length) return null
      return steps[idx]?.id || null
    },
    pendingSyncCount() {
      return Array.isArray(this.offlineQueue) ? this.offlineQueue.length : 0
    }
  },
  methods: {
    getDraftStorageKey(flowId) {
      return `${FLOW_DRAFT_PREFIX}${String(flowId || '').trim()}`
    },
    loadOfflineQueue() {
      try {
        const raw = window.localStorage?.getItem(FLOW_OFFLINE_QUEUE_KEY) || '[]'
        const parsed = JSON.parse(raw)
        this.offlineQueue = Array.isArray(parsed) ? parsed : []
      } catch (error) {
        this.offlineQueue = []
      }
    },
    saveOfflineQueue() {
      try {
        window.localStorage?.setItem(FLOW_OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue || []))
      } catch (error) {
        // ignore storage errors
      }
    },
    saveOfflineDraft(flowData) {
      if (!flowData?.id) return
      try {
        window.localStorage?.setItem(this.getDraftStorageKey(flowData.id), JSON.stringify(flowData))
      } catch (error) {
        // ignore storage errors
      }
    },
    loadOfflineDraft(flowId) {
      if (!flowId) return null
      try {
        const raw = window.localStorage?.getItem(this.getDraftStorageKey(flowId))
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch (error) {
        return null
      }
    },
    removeOfflineDraft(flowId) {
      if (!flowId) return
      try {
        window.localStorage?.removeItem(this.getDraftStorageKey(flowId))
      } catch (error) {
        // ignore storage errors
      }
    },
    isNetworkError(error) {
      if (!this.networkOnline) return true
      if (!error) return false
      const message = String(error?.message || '').toLowerCase()
      return (
        error?.name === 'TypeError' ||
        message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('network request failed') ||
        message.includes('load failed')
      )
    },
    isDuplicateFlowError(error) {
      const message = String(error?.message || '').toLowerCase()
      return message.includes('duplicate') || message.includes('exists') || message.includes('已存在')
    },
    upsertOfflineQueueItem(op, flowData, source = 'manual') {
      if (!flowData?.id) return
      const flowId = String(flowData.id)
      const nextItem = {
        flowId,
        op: op === 'create' ? 'create' : 'update',
        payload: flowData,
        source,
        queuedAt: Date.now()
      }
      const index = this.offlineQueue.findIndex((item) => String(item?.flowId) === flowId)
      if (index >= 0) {
        const previous = this.offlineQueue[index]
        const merged = {
          ...previous,
          ...nextItem,
          op: previous?.op === 'create' || nextItem.op === 'create' ? 'create' : 'update'
        }
        this.offlineQueue.splice(index, 1, merged)
      } else {
        this.offlineQueue.push(nextItem)
      }
      this.saveOfflineQueue()
      this.saveOfflineDraft(flowData)
    },
    onNetworkOnline() {
      this.networkOnline = true
      this.flushOfflineQueue(true)
    },
    onNetworkOffline() {
      this.networkOnline = false
      this.showAutoSaveMessage('当前离线，流程修改将先保存到本地队列', 'error')
    },
    async saveFlowWithOfflineSupport(flowData, options = {}) {
      const { source = 'manual', closeOnSuccess = false } = options
      const isNew = !this.flows.some(f => f.id === flowData.id)
      const op = isNew ? 'create' : 'update'

      if (!this.networkOnline) {
        this.upsertOfflineQueueItem(op, flowData, source)
        this.lastSavedFlow = JSON.parse(JSON.stringify(this.editingFlow))
        this.showAutoSaveMessage('离线状态：已保存到本地，联网后将自动同步', 'success')
        return { queued: true }
      }

      try {
        let result
        if (op === 'create') {
          result = await api.flows.create(flowData)
        } else {
          result = await api.flows.update(flowData.id, flowData)
        }
        this.lastSavedFlow = JSON.parse(JSON.stringify(this.editingFlow))
        this.offlineQueue = (this.offlineQueue || []).filter((item) => String(item?.flowId) !== String(flowData.id))
        this.saveOfflineQueue()
        this.removeOfflineDraft(flowData.id)
        if (closeOnSuccess) {
          await this.loadFlows()
          this.editingFlow = null
        }
        return { queued: false, result }
      } catch (error) {
        if (this.isNetworkError(error)) {
          this.networkOnline = false
          this.upsertOfflineQueueItem(op, flowData, source)
          this.lastSavedFlow = JSON.parse(JSON.stringify(this.editingFlow))
          this.showAutoSaveMessage('网络中断：已转为离线保存，恢复网络后自动入库', 'success')
          return { queued: true }
        }
        throw error
      }
    },
    async flushOfflineQueue(silent = false) {
      if (!this.networkOnline || this.isFlushingOfflineQueue || this.pendingSyncCount === 0) return
      this.isFlushingOfflineQueue = true
      let synced = 0
      try {
        const queue = [...this.offlineQueue]
        for (const item of queue) {
          const flowId = String(item?.flowId || '')
          if (!flowId || !item?.payload) continue
          try {
            if (item.op === 'create') {
              try {
                await api.flows.create(item.payload)
              } catch (error) {
                if (this.isDuplicateFlowError(error)) {
                  await api.flows.update(flowId, item.payload)
                } else {
                  throw error
                }
              }
            } else {
              await api.flows.update(flowId, item.payload)
            }
            this.offlineQueue = this.offlineQueue.filter((entry) => String(entry?.flowId) !== flowId)
            this.saveOfflineQueue()
            this.removeOfflineDraft(flowId)
            synced += 1
          } catch (error) {
            if (this.isNetworkError(error)) {
              this.networkOnline = false
              break
            }
            if (!silent) {
              this.showMessage(`同步失败(${flowId}): ${error?.message || '未知错误'}`, 'error')
            }
          }
        }
        if (synced > 0) {
          await this.loadFlows()
        }
        if (synced > 0 && !silent) {
          this.showMessage(`已同步 ${synced} 条离线流程变更`, 'success')
        }
      } finally {
        this.isFlushingOfflineQueue = false
      }
    },
    formatDate(value) {
      if (!value) return '未知时间'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '未知时间'
      return date.toLocaleString()
    },
    normalizeComment(comment = {}) {
      const mentionUsers = Array.isArray(comment.mentionUsers)
        ? comment.mentionUsers
        : Array.isArray(comment.mention_users)
          ? comment.mention_users
          : []
      return {
        id: comment.id || `comment_${Date.now()}`,
        stepId: comment.stepId || comment.step_id || null,
        text: comment.text || '',
        mentionUsers,
        status: comment.status || 'open',
        author: comment.author || comment.authorName || comment.author_name || '当前用户',
        createdAt: comment.createdAt || comment.created_at || Date.now(),
        updatedAt: comment.updatedAt || comment.updated_at || Date.now()
      }
    },
    async loadComments(flowId) {
      if (!flowId) {
        this.comments = []
        return
      }
      this.commentsLoading = true
      try {
        const result = await api.flows.getComments(flowId)
        this.comments = Array.isArray(result) ? result.map((item) => this.normalizeComment(item)) : []
      } catch (error) {
        this.showMessage(`加载评论失败: ${error?.message}`, 'error')
      } finally {
        this.commentsLoading = false
      }
    },
    createStep(seed = {}, index = 0) {
      const now = Date.now()
      return {
        id: seed.id || `step_${now}_${index}_${Math.random().toString(36).slice(2, 8)}`,
        name: this.normalizeCanvasNodeName(seed.name || seed.title || '', ''),
        description: seed.description || '',
        assignee: seed.assignee || '',
        duration: seed.duration || '',
        conditional: !!seed.conditional,
        relationType: seed.relationType || seed.relation_type || 'sequential',
        parentStepId: seed.parentStepId || seed.parent_step_id || null,
        moduleKey: seed.moduleKey || seed.module_key || '',
        tip: seed.tip || '',
        note: seed.note || '',
        positionX: Number.isFinite(Number(seed.positionX))
          ? Number(seed.positionX)
          : (Number.isFinite(Number(seed.position_x)) ? Number(seed.position_x) : null),
        positionY: Number.isFinite(Number(seed.positionY))
          ? Number(seed.positionY)
          : (Number.isFinite(Number(seed.position_y)) ? Number(seed.position_y) : null)
      }
    },
    normalizeFlow(flow = {}) {
      const steps = (Array.isArray(flow.steps) ? flow.steps : []).map((step, index) =>
        this.createStep(step, index)
      )
      return {
        ...flow,
        steps
      }
    },
    generateTradeFromFlow() {
      const flow = this.editingFlow
      if (!flow) return
      this.showTraceLearning = true
      this.$nextTick(() => {
        try {
          this.$refs.traceDemo?.createTradeFromFlow?.(flow)
        } catch (error) {
          console.error('生成交易失败:', error)
          this.showMessage('生成交易失败，请查看控制台', 'error')
        }
      })
    },
    onTraceSelectStep(payload) {
      const stepId = payload?.stepId
      if (!stepId || !this.editingFlow?.steps?.length) return
      const idx = this.editingFlow.steps.findIndex((s) => String(s.id) === String(stepId))
      if (idx === -1) return
      this.editingStepIndex = idx
      this.commentDraft.stepId = stepId
      this.$nextTick(() => {
        const stepIdText = String(stepId)
        const nodeList = this.$el?.querySelectorAll?.('.step-item') || []
        const el = Array.from(nodeList).find((node) => node?.getAttribute?.('data-step-id') === stepIdText)
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    },
    buildFlowPayload(sourceFlow = this.editingFlow, options = {}) {
      if (!sourceFlow) return null
      const { fallbackName = '未命名流程' } = options
      const now = Date.now()
      const seed = Math.random().toString(36).substr(2, 6)
      const steps = (Array.isArray(sourceFlow.steps) ? sourceFlow.steps : []).map((step, index) => ({
        id: step.id || `step_${now}_${index}_${seed}`,
        name: this.normalizeCanvasNodeName(step.name || '', ''),
        description: step.description || '',
        assignee: step.assignee || '',
        duration: step.duration || '',
        order: index,
        conditional: !!step.conditional,
        relationType: step.relationType || step.relation_type || 'sequential',
        parentStepId: step.parentStepId || step.parent_step_id || null,
        moduleKey: step.moduleKey || step.module_key || '',
        tip: step.tip || '',
        note: step.note || '',
        positionX: Number.isFinite(Number(step.positionX)) ? Number(step.positionX) : null,
        positionY: Number.isFinite(Number(step.positionY)) ? Number(step.positionY) : null
      }))

      return {
        id: sourceFlow.id || `flow_${now}_${seed}`,
        name: (sourceFlow.name || '').trim() || fallbackName,
        description: sourceFlow.description || '',
        icon: sourceFlow.icon || '🌀',
        steps
      }
    },
    relationTypeLabel(type) {
      if (type === 'parallel') return '平级'
      if (type === 'child') return '子流程'
      return '顺序'
    },
    onRelationTypeChange(step) {
      if (!step) return
      if ((step.relationType || 'sequential') !== 'child') {
        step.parentStepId = null
      }
      this.scheduleAutoSave()
      this.syncCanvasFromSteps()
    },
    parentCandidatesFor(stepId) {
      const steps = this.editingFlow?.steps || []
      return steps.filter((step) => String(step.id) !== String(stepId))
    },
    async loadSharedModules() {
      this.sharedModulesLoading = true
      try {
        const result = await api.flows.getSharedModules()
        this.sharedModules = Array.isArray(result) ? result : []
      } catch (error) {
        this.sharedModules = []
        // 兼容旧后端：公共模块接口未上线时不阻断编辑流程
        const msg = String(error?.message || '')
        if (!/404|not found|流程不存在|未登录|401/i.test(msg)) {
          this.showMessage(`加载公共模块失败: ${error?.message}`, 'error')
        } else {
          console.warn('公共模块接口暂不可用，已降级为无模块模式')
        }
      } finally {
        this.sharedModulesLoading = false
      }
    },
    parseModuleTemplates(module) {
      const raw = module?.steps_snapshot || module?.stepsSnapshot
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : [])
        return Array.isArray(parsed) ? parsed : []
      } catch (_error) {
        return []
      }
    },
    defaultModuleTemplateStep() {
      return {
        name: '模块步骤',
        description: '',
        assignee: '',
        duration: '',
        conditional: false,
        relationType: 'sequential',
        parentStepId: null,
        tip: '',
        note: ''
      }
    },
    getSelectedStepAsModuleSteps() {
      const idx = this.editingStepIndex
      const step = (this.editingFlow?.steps || [])[idx]
      if (!step) return []
      return [{
        name: step.name || '模块步骤',
        description: step.description || '',
        assignee: step.assignee || '',
        duration: step.duration || '',
        conditional: !!step.conditional,
        relationType: step.relationType || step.relation_type || 'sequential',
        parentStepId: step.parentStepId || step.parent_step_id || null,
        tip: step.tip || '',
        note: step.note || ''
      }]
    },
    getCurrentFlowAsModuleSteps() {
      return (this.editingFlow?.steps || []).map((step) => ({
        name: step.name || '模块步骤',
        description: step.description || '',
        assignee: step.assignee || '',
        duration: step.duration || '',
        conditional: !!step.conditional,
        relationType: step.relationType || step.relation_type || 'sequential',
        parentStepId: step.parentStepId || step.parent_step_id || null,
        tip: step.tip || '',
        note: step.note || ''
      }))
    },
    openSharedModuleForm(mode = 'create', module = null, preferredSource = '') {
      if (!this.canEditFlow) return
      const sourceType = preferredSource || (mode === 'edit' ? 'keep-existing' : 'empty')
      this.sharedModuleFormMode = mode === 'edit' ? 'edit' : 'create'
      this.sharedModuleForm = {
        id: module?.id || '',
        name: module?.name || '',
        moduleKey: module?.module_key || module?.moduleKey || '',
        description: module?.description || '',
        sourceType
      }
      if (sourceType === 'selected-step' && this.editingStepIndex == null) {
        this.sharedModuleForm.sourceType = 'empty'
      }
      this.showSharedModuleForm = true
    },
    closeSharedModuleForm() {
      this.showSharedModuleForm = false
      this.sharedModuleSubmitting = false
    },
    resolveSharedModuleStepsBySource(sourceType, moduleForEdit = null) {
      if (sourceType === 'selected-step') {
        return this.getSelectedStepAsModuleSteps()
      }
      if (sourceType === 'flow-all') {
        return this.getCurrentFlowAsModuleSteps()
      }
      if (sourceType === 'keep-existing') {
        return this.parseModuleTemplates(moduleForEdit)
      }
      return [this.defaultModuleTemplateStep()]
    },
    async submitSharedModuleForm() {
      if (this.sharedModuleSubmitting) return
      const mode = this.sharedModuleFormMode
      const draft = this.sharedModuleForm || {}
      const name = String(draft.name || '').trim()
      const moduleKey = String(draft.moduleKey || '').trim()
      const description = String(draft.description || '').trim()
      if (!name || !moduleKey) {
        this.showMessage('模块名称和标识必填', 'error')
        return
      }
      const editingModule = mode === 'edit'
        ? this.sharedModules.find((m) => String(m.id) === String(draft.id))
        : null
      const steps = this.resolveSharedModuleStepsBySource(draft.sourceType, editingModule)
      if (!Array.isArray(steps) || steps.length === 0) {
        this.showMessage('模板步骤为空，请更换模板来源', 'error')
        return
      }
      this.sharedModuleSubmitting = true
      try {
        if (mode === 'edit' && draft.id) {
          await api.flows.updateSharedModule(draft.id, { name, moduleKey, description, steps })
          this.showMessage('公共模块已更新', 'success')
        } else {
          await api.flows.createSharedModule({ name, moduleKey, description, steps })
          this.showMessage('公共模块已创建', 'success')
        }
        this.closeSharedModuleForm()
        await this.loadSharedModules()
      } catch (error) {
        this.showMessage(`${mode === 'edit' ? '更新' : '创建'}公共模块失败: ${error?.message}`, 'error')
      } finally {
        this.sharedModuleSubmitting = false
      }
    },
    async editSharedModule(module) {
      if (!module?.id) return
      this.openSharedModuleForm('edit', module, 'keep-existing')
    },
    insertSharedModule(module) {
      if (!this.canEditFlow || !module) return
      let templates = this.parseModuleTemplates(module)
      if (!Array.isArray(templates) || templates.length === 0) {
        this.showMessage('模块没有可插入的步骤模板', 'error')
        return
      }
      const insertIndex = this.editingStepIndex == null ? (this.editingFlow?.steps?.length || 0) : this.editingStepIndex + 1
      const mapped = templates.map((tpl, i) => this.createStep({
        ...tpl,
        moduleKey: module.module_key || module.moduleKey || ''
      }, i))
      this.editingFlow.steps.splice(insertIndex, 0, ...mapped)
      this.syncCanvasFromSteps()
      this.scheduleAutoSave()
      this.showMessage(`已插入公共模块：${module.name}`, 'success')
    },
    async removeSharedModule(module) {
      if (!module?.id) return
      if (!window.confirm(`确定删除公共模块「${module.name}」吗？`)) return
      try {
        await api.flows.deleteSharedModule(module.id)
        this.showMessage('公共模块已删除', 'success')
        await this.loadSharedModules()
      } catch (error) {
        this.showMessage(`删除公共模块失败: ${error?.message}`, 'error')
      }
    },
    getStepCanvasPosition(step, index, context = {}) {
      const x = Number(step?.positionX)
      const y = Number(step?.positionY)
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y }
      }
      const relationType = step?.relationType || step?.relation_type || 'sequential'
      const {
        steps = [],
        positionById = new Map(),
        seqIndexMap = new Map(),
        parallelIndexMap = new Map(),
        baseX = 120,
        baseY = 120,
        seqSpacing = 260,
        parallelSpacingY = 130,
        childSpacingY = 180
      } = context

      if (relationType === 'child' && step?.parentStepId && positionById.has(String(step.parentStepId))) {
        const parent = positionById.get(String(step.parentStepId))
        return {
          x: parent.x + 60,
          y: parent.y + childSpacingY
        }
      }

      if (relationType === 'parallel') {
        const prev = steps[index - 1]
        const prevPos = positionById.get(String(prev?.id || ''))
        const parallelOrder = parallelIndexMap.get(String(step.id)) || 0
        if (prevPos) {
          return {
            x: prevPos.x + seqSpacing,
            y: baseY + (parallelOrder + 1) * parallelSpacingY
          }
        }
      }

      const seqOrder = seqIndexMap.get(String(step.id)) ?? index
      return {
        x: baseX + seqOrder * seqSpacing,
        y: baseY
      }
    },
    syncCanvasFromSteps(flow = this.editingFlow) {
      const steps = flow?.steps || []
      const byId = new Map(steps.map((step) => [String(step.id), step]))
      const seqIndexMap = new Map()
      const parallelIndexMap = new Map()
      let seqOrder = 0
      let parallelOrder = 0
      steps.forEach((step) => {
        const relationType = step.relationType || step.relation_type || 'sequential'
        if (relationType === 'parallel') {
          parallelIndexMap.set(String(step.id), parallelOrder++)
        } else {
          seqIndexMap.set(String(step.id), seqOrder++)
        }
      })
      const positionById = new Map()

      this.canvasNodes = steps.map((step, index) => {
        const position = this.getStepCanvasPosition(step, index, {
          steps,
          positionById,
          seqIndexMap,
          parallelIndexMap
        })
        positionById.set(String(step.id), position)
        const relationType = step.relationType || step.relation_type || 'sequential'
        return {
          id: String(step.id),
          position,
          data: {
            label: step.name || `步骤 ${index + 1}`,
            description: step.description || '',
            assignee: step.assignee || '',
            duration: step.duration || '',
            relationType
          },
          type: step.nodeType || (step.conditional ? 'exclusiveGateway' : 'userTask'),
          style: relationType === 'child'
            ? { border: '1px solid #3b82f6', background: '#eff6ff', borderRadius: '10px', width: '210px' }
            : step.conditional
              ? { border: '1px solid #f59e0b', background: '#fffbeb', borderRadius: '10px', width: '210px' }
              : { border: '1px solid #10b981', background: '#ecfdf5', borderRadius: '10px', width: '210px' }
        }
      })

      this.canvasEdges = steps.map((step, index) => {
        const relationType = step.relationType || step.relation_type || 'sequential'
        const targetId = String(step.id)

        if (relationType === 'child' && step.parentStepId && byId.has(String(step.parentStepId))) {
          return {
            id: `edge_parent_${step.parentStepId}_${targetId}`,
            source: String(step.parentStepId),
            target: targetId,
            type: 'smoothstep',
            label: '子流程',
            animated: true,
            markerEnd: 'arrowclosed',
            style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '6 3' }
          }
        }

        if (index === 0) return null
        const prev = steps[index - 1]
        if (!prev) return null
        const isParallel = relationType === 'parallel'
        return {
          id: `edge_${prev.id}_${targetId}`,
          source: String(prev.id),
          target: targetId,
          type: 'smoothstep',
          label: isParallel ? '平级' : '主流程',
          animated: true,
          markerEnd: 'arrowclosed',
          style: isParallel
            ? { stroke: '#0ea5e9', strokeWidth: 2, strokeDasharray: '5 3' }
            : { stroke: step.conditional ? '#f59e0b' : '#10b981', strokeWidth: 2, strokeDasharray: step.conditional ? '6 3' : undefined }
        }
      }).filter(Boolean)

      this.flowDiagram = {
        nodes: JSON.parse(JSON.stringify(this.canvasNodes)),
        edges: JSON.parse(JSON.stringify(this.canvasEdges))
      }
    },
    onCanvasNodesChange(changes = []) {
      this.canvasNodes = applyNodeChanges(changes, this.canvasNodes)

      if (!Array.isArray(changes) || !this.editingFlow?.steps?.length) return
      let hasPositionChange = false
      const stepMap = new Map(this.editingFlow.steps.map((step) => [String(step.id), step]))
      for (const change of changes) {
        if (change?.type !== 'position' || !change?.position) continue
        const step = stepMap.get(String(change.id))
        if (!step) continue
        step.positionX = Number(change.position.x)
        step.positionY = Number(change.position.y)
        hasPositionChange = true
      }
      if (hasPositionChange) {
        this.scheduleAutoSave()
      }
    },
    onCanvasLayoutChange(diagram = {}) {
      if (!this.editingFlow?.steps?.length) return
      const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : []
      const edges = Array.isArray(diagram.edges) ? diagram.edges : []
      if (nodes.length === 0) return

      const nodeMap = new Map(nodes.map((n) => [String(n.id), n]))
      const incomingEdgeMap = new Map()
      edges.forEach((edge) => {
        if (!edge?.target) return
        if (!incomingEdgeMap.has(String(edge.target))) {
          incomingEdgeMap.set(String(edge.target), edge)
        }
      })

      let changed = false
      this.editingFlow.steps.forEach((step) => {
        const node = nodeMap.get(String(step.id))
        if (node?.position) {
          const nx = Number(node.position.x)
          const ny = Number(node.position.y)
          if (Number.isFinite(nx) && Number.isFinite(ny)) {
            if (step.positionX !== nx || step.positionY !== ny) {
              step.positionX = nx
              step.positionY = ny
              changed = true
            }
          }
        }

        const incoming = incomingEdgeMap.get(String(step.id))
        if (!incoming) return
        const edgeLabel = String(incoming?.label || '').trim()
        const nextRelationType = edgeLabel.includes('子')
          ? 'child'
          : (edgeLabel.includes('平') ? 'parallel' : (step.relationType || 'sequential'))
        const nextParentId = nextRelationType === 'child' ? (incoming.source || null) : null
        if ((step.relationType || 'sequential') !== nextRelationType) {
          step.relationType = nextRelationType
          changed = true
        }
        if ((step.parentStepId || null) !== nextParentId) {
          step.parentStepId = nextParentId
          changed = true
        }
      })

      if (changed) {
        this.scheduleAutoSave()
      }
    },
    normalizeCanvasNodeName(value, fallback = '未命名节点') {
      const raw = String(value || '').trim()
      if (!raw) return fallback
      return raw
        .replace(/^\d+(?:\.\d+)*\s*[.\-、]?\s*/, '')
        .replace(/\s*[·|-]\s*(子流程|平级)$/g, '')
        .trim() || fallback
    },
    async onFlowDiagramSave(elements) {
      if (!this.editingFlow || !this.canEditFlow) return

      try {
        this.saving = true
        const nodes = elements.filter(el => el.type !== 'edge')
        const edges = elements.filter(el => el.type === 'edge')
        const stepMap = new Map((this.editingFlow.steps || []).map((step) => [String(step.id), step]))
        const incomingEdgeMap = new Map()
        edges.forEach((edge) => {
          if (!edge?.target) return
          if (!incomingEdgeMap.has(String(edge.target))) {
            incomingEdgeMap.set(String(edge.target), edge)
          }
        })

        // 更新步骤信息
        const updatedSteps = nodes.map((node, index) => {
          const original = stepMap.get(String(node.id)) || {}
          const incoming = incomingEdgeMap.get(String(node.id))
          const edgeLabel = String(incoming?.label || '').trim()
          const relationType = edgeLabel.includes('子')
            ? 'child'
            : (edgeLabel.includes('平') ? 'parallel' : (original.relationType || original.relation_type || 'sequential'))
          const parentStepId = relationType === 'child'
            ? (incoming?.source || original.parentStepId || original.parent_step_id || null)
            : null
          return {
            id: node.id,
            name: this.normalizeCanvasNodeName(
              node.data.label || node.data.name || original.name,
              '未命名节点'
            ),
            description: node.data.description || original.description || '',
            assignee: node.data.assignee || original.assignee || '',
            duration: node.data.duration || original.duration || '',
            conditional: original.conditional || node.type === 'exclusiveGateway',
            relationType,
            parentStepId,
            moduleKey: original.moduleKey || original.module_key || '',
            positionX: Math.round(node.position.x),
            positionY: Math.round(node.position.y),
            order: index
          }
        })

        // 准备连线数据
        const connections = edges.map(edge => ({
          source_step_id: edge.source,
          target_step_id: edge.target,
          label: edge.label || ''
        }))

        const flowData = this.buildFlowPayload({
          ...this.editingFlow,
          steps: updatedSteps
        })
        if (!flowData) {
          this.showMessage('流程图数据无效，无法保存', 'error')
          return
        }

        const saveResult = await this.saveFlowWithOfflineSupport(flowData, { source: 'diagram' })

        this.editingFlow.steps = updatedSteps.map((step, index) => this.createStep(step, index))
        this.syncCanvasFromSteps()
        if (saveResult?.queued) {
          this.showMessage('离线状态：流程图修改已加入同步队列', 'warning')
        } else {
          this.showMessage('流程图保存成功', 'success')
        }
      } catch (error) {
        console.error('保存流程图失败:', error)
        this.showMessage(`保存失败: ${error.message}`, 'error')
      } finally {
        this.saving = false
      }
    },
    initializeFlowDiagram(flow) {
      if (!flow || !flow.steps) {
        this.flowDiagram = { nodes: [], edges: [] }
        return
      }
      const normalized = this.normalizeFlow(flow)
      this.syncCanvasFromSteps(normalized)
    },
    async loadFlows() {
      this.loading = true
      try {
        const result = await api.flows.getAll()
        this.flows = Array.isArray(result) ? result.map(flow => this.normalizeFlow(flow)) : []
      } catch (error) {
        this.showMessage(`加载流程失败: ${error?.message}`, 'error')
      } finally {
        this.loading = false
      }
    },
    async loadFlowPermissions() {
      if (!this.flowRbacEnabled) {
        this.flowPermissions = {
          rbacEnabled: false,
          actions: {
            read: true,
            comment: true,
            edit: true,
            publish: true,
            rollback: true,
            export: true,
            admin: true
          }
        }
        return
      }
      this.permissionsLoading = true
      try {
        const result = await api.flows.getMyPermissions()
        this.flowPermissions = result || null
      } catch (error) {
        this.flowPermissions = null
      } finally {
        this.permissionsLoading = false
      }
    },
    async createVersion() {
      if (!this.canPublishFlow) {
        this.showMessage('当前角色无权限创建版本', 'error')
        return
      }
      if (!this.editingFlow) return
      const note = window.prompt('请输入版本变更说明（可选）：', '')
      if (note === null) return
      this.creatingVersion = true
      try {
        const payload = this.buildFlowPayload(this.editingFlow)
        await api.flows.createRelease(this.editingFlow.id, {
          note: note.trim() || '手动版本',
          snapshot: payload
        })
        this.showMessage('版本已创建', 'success')
        recordAudit({ action: 'create_version', detail: note || '', flowId: this.editingFlow.id })
        await this.loadVersions(this.editingFlow.id)
      } catch (error) {
        this.showMessage(`创建版本失败: ${error?.message}`, 'error')
      } finally {
        this.creatingVersion = false
      }
    },
    async rollbackVersion() {
      if (!this.canPublishFlow) {
        this.showMessage('当前角色无权限回滚版本', 'error')
        return
      }
      if (!this.editingFlow) return
      if (!window.confirm('确定回滚到最近发布版本？')) {
        return
      }
      this.rollingBack = true
      try {
        await api.flows.rollbackRelease(this.editingFlow.id)
        this.showMessage('流程已回滚到发布版本', 'success')
        recordAudit({ action: 'rollback_flow', detail: this.editingFlow.name || '', flowId: this.editingFlow.id })
        await this.loadFlows()
        this.editingFlow = null
      } catch (error) {
        this.showMessage(`回滚失败: ${error?.message}`, 'error')
      } finally {
        this.rollingBack = false
      }
    },
    async loadVersions(flowId) {
      if (!flowId) {
        this.flowVersions = []
        return
      }
      this.versionsLoading = true
      this.versionError = ''
      try {
        const result = await api.flows.getReleases()
        const candidates = Array.isArray(result) ? result : []
        const normalized = candidates.filter((release) => {
          const owner = release.flowId || release.flow_id || release.flow
          return owner === flowId
        })
        this.flowVersions = normalized.sort((a, b) => {
          const left = new Date(a.created_at || a.createdAt || a.timestamp || 0).getTime()
          const right = new Date(b.created_at || b.createdAt || b.timestamp || 0).getTime()
          return right - left
        })
      } catch (error) {
        this.versionError = error?.message || '获取版本失败'
      } finally {
        this.versionsLoading = false
      }
    },
    selectStepForComment(stepId) {
      this.commentDraft.stepId = stepId
    },
    addComment() {
      if (!this.canCommentFlow) {
        this.showMessage('当前角色无权限评论', 'error')
        return
      }
      const text = (this.commentDraft.text || '').trim()
      if (!text || !this.currentCommentStepId) {
        this.showMessage('请先选择步骤并输入评论内容', 'error')
        return
      }
      const mention = this.commentDraft.mention?.trim() || ''
      const mentionUsers = mention ? [mention] : []
      const draft = {
        stepId: this.currentCommentStepId,
        text,
        mentionUsers,
        status: 'open'
      }

      const request = this.editingFlow?.id
        ? api.flows.addComment(this.editingFlow.id, draft)
        : Promise.resolve({
            id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ...draft,
            author: mention ? `@${mention}` : '当前用户',
            createdAt: new Date().toISOString()
          })

      request
        .then((saved) => {
          const normalized = this.normalizeComment(saved)
          this.comments.unshift(normalized)
          this.commentDraft.text = ''
          this.commentDraft.mention = ''
          this.showMessage('评论已添加', 'success')
          recordAudit({
            action: 'add_comment',
            detail: normalized.text,
            flowId: this.editingFlow?.id
          })
        })
        .catch((error) => {
          this.showMessage(`评论保存失败: ${error?.message}`, 'error')
        })
    },
    async updateCommentStatus(comment, status) {
      if (!comment?.id || !status) return
      const nextStatus = status === 'resolved' ? 'resolved' : 'open'
      try {
        if (this.editingFlow?.id) {
          const updated = await api.flows.updateComment(this.editingFlow.id, comment.id, { status: nextStatus })
          const normalized = this.normalizeComment(updated)
          const idx = this.comments.findIndex((item) => item.id === comment.id)
          if (idx !== -1) this.comments.splice(idx, 1, normalized)
        } else {
          const idx = this.comments.findIndex((item) => item.id === comment.id)
          if (idx !== -1) this.comments[idx].status = nextStatus
        }
        this.showMessage(nextStatus === 'resolved' ? '评论已标记为已解决' : '评论已重新打开', 'success')
      } catch (error) {
        this.showMessage(`更新评论状态失败: ${error?.message}`, 'error')
      }
    },
    toggleSwimlaneView() {
      this.showSwimlaneView = !this.showSwimlaneView
    },
    requestCanvasFit(retry = 0) {
      if (this.view !== 'canvas') return
      this.$nextTick(() => {
        this.$refs.flowEditorRef?.zoomFit?.()
      })
      if (retry < 2) {
        setTimeout(() => {
          this.$refs.flowEditorRef?.zoomFit?.()
          this.requestCanvasFit(retry + 1)
        }, 140)
      }
    },
    switchView(nextView) {
      if (nextView !== 'list' && nextView !== 'timeline' && nextView !== 'canvas' && nextView !== 'relation') return
      if (this.view === nextView) return
      if (nextView === 'timeline') {
        this.timelineMounted = true
      }
      if (nextView === 'canvas') {
        this.canvasMounted = true
        this.syncCanvasFromSteps()
        this.requestCanvasFit()
      }
      this.view = nextView
    },
    highlightMentions(text) {
      if (!text) return text
      return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>')
    },
    createNewFlow() {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限新建流程', 'error')
        return
      }
      this.editingFlow = this.normalizeFlow({
        id: `flow_${Date.now()}`,
        name: '',
        description: '',
        icon: '🌀',
        steps: [],
        created_at: Date.now(),
        updated_at: Date.now()
      })
      this.editingStepIndex = null
      this.lastSavedFlow = null
      this.flowVersions = []
      this.versionError = ''
      this.comments = []
      this.view = 'list'
      this.timelineMounted = false
      this.canvasMounted = false
      this.canvasNodes = []
      this.canvasEdges = []
      this.canvasInteractionMode = 'node'
    },
    editFlow(flow) {
      if (!flow) {
        this.showMessage('流程数据异常，无法进入编辑', 'error')
        return
      }
      try {
        const normalized = this.normalizeFlow(JSON.parse(JSON.stringify(flow)))
        const localDraft = this.loadOfflineDraft(flow.id)
        const nextFlow = localDraft ? this.normalizeFlow(localDraft) : normalized
        this.editingFlow = nextFlow
        this.lastSavedFlow = JSON.parse(JSON.stringify(nextFlow))
        this.editingStepIndex = null
        this.view = 'list'
        this.timelineMounted = false
        this.canvasMounted = false
        this.canvasInteractionMode = 'node'
        this.syncCanvasFromSteps()
        this.requestCanvasFit()
        if (localDraft) {
          this.showMessage('已加载本地离线草稿，联网后将自动同步', 'warning')
        }
      } catch (error) {
        console.error('进入编辑态失败:', error)
        this.showMessage(`进入编辑失败: ${error?.message || '未知错误'}`, 'error')
        return
      }

      Promise.allSettled([
        this.loadVersions(flow.id),
        this.loadComments(flow.id),
        this.loadFlowVariables(flow.id),
        this.loadSharedModules()
      ]).then((results) => {
        const failed = results.filter((item) => item.status === 'rejected')
        if (failed.length > 0) {
          console.warn('编辑态扩展数据加载部分失败:', failed)
        }
      })
    },

    // Phase 3: 参数传递与数据映射相关方法
    openVariableManager() {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限管理变量', 'error')
        return
      }
      this.showVariableManager = true
    },

    openParameterMapper() {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限配置参数', 'error')
        return
      }
      if (!this.selectedStepForParams) {
        this.showMessage('请先选择一个步骤', 'error')
        return
      }
      this.showParameterMapper = true
    },

    async loadFlowVariables(flowId) {
      try {
        const data = await api.flows.getVariables(flowId)
        this.flowVariables = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('加载流程变量失败:', error)
        this.flowVariables = []
      }
    },

    onVariablesUpdated(variables) {
      this.flowVariables = variables
      this.showMessage('流程变量已更新', 'success')
    },

    onParametersUpdated() {
      this.showMessage('参数映射已更新', 'success')
    },

    onCanvasNodeClick(node) {
      const payload = node?.node ? node.node : node
      const nodeId = String(payload?.id || '')
      if (!nodeId || !this.editingFlow?.steps?.length) return
      const step = this.editingFlow.steps.find(s => String(s.id) === nodeId)
      if (!step) return
      const idx = this.editingFlow.steps.findIndex(s => String(s.id) === nodeId)
      this.editingStepIndex = idx
      this.commentDraft.stepId = step.id
      this.selectedStepForParams = step
    },

    async saveFlow() {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限保存流程', 'error')
        return
      }
      if (!this.editingFlow.name.trim()) {
        this.showMessage('请输入流程名称', 'error')
        return
      }

      if (!this.editingFlow.steps || this.editingFlow.steps.length === 0) {
        this.showMessage('请至少添加一个步骤', 'error')
        return
      }

      this.saving = true
      try {
        const flowData = this.buildFlowPayload(this.editingFlow)
        if (!flowData || flowData.steps.length === 0) {
          this.showMessage('请至少添加一个步骤', 'error')
          return
        }

        const saveResult = await this.saveFlowWithOfflineSupport(flowData, {
          source: 'manual',
          closeOnSuccess: true
        })
        if (saveResult?.queued) {
          this.showMessage('离线状态：流程已暂存，联网后自动入库', 'warning')
        } else {
          this.showMessage('流程已保存', 'success')
        }
        recordAudit({ action: 'save_flow', detail: flowData.name, flowId: flowData.id })
      } catch (error) {
        this.showMessage(`保存失败: ${error?.message}`, 'error')
        console.error('保存流程错误:', error)
      } finally {
        this.saving = false
      }
    },
    async deleteFlow(flow) {
      if (!this.canAdminFlow) {
        this.showMessage('当前角色无权限删除流程', 'error')
        return
      }
      if (!window.confirm(`确定删除流程 "${flow.name}" 吗？此操作不可撤销。`)) {
        return
      }

      try {
        await api.flows.delete(flow.id)
        this.showMessage('流程已删除', 'success')
        await this.loadFlows()
        recordAudit({ action: 'delete_flow', detail: flow.name || '', flowId: flow.id })
      } catch (error) {
        this.showMessage(`删除失败: ${error?.message}`, 'error')
      }
    },
    addStep() {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限修改步骤', 'error')
        return
      }
      if (!this.editingFlow.steps) {
        this.editingFlow.steps = []
      }
      const newStep = this.createStep({}, this.editingFlow.steps.length)
      this.editingFlow.steps.push(newStep)
      this.syncCanvasFromSteps()
      this.scheduleAutoSave()
      this.$nextTick(() => {
        this.editingStepIndex = this.editingFlow.steps.length - 1
      })
    },
    insertStepAt(targetIndex) {
      if (!this.canEditFlow) return
      if (!this.editingFlow?.steps) {
        this.editingFlow.steps = []
      }
      const index = Math.max(0, Math.min(Number(targetIndex) || 0, this.editingFlow.steps.length))
      const newStep = this.createStep({}, index)
      this.editingFlow.steps.splice(index, 0, newStep)
      this.syncCanvasFromSteps()
      this.scheduleAutoSave()
      this.$nextTick(() => {
        this.editingStepIndex = index
      })
    },
    removeStep(index) {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限修改步骤', 'error')
        return
      }
      if (this.editingFlow.steps && this.editingFlow.steps.length > 0) {
        this.editingFlow.steps.splice(index, 1)
        if (this.editingStepIndex === index) {
          this.editingStepIndex = null
        } else if (this.editingStepIndex > index) {
          this.editingStepIndex -= 1
        }
        this.syncCanvasFromSteps()
        this.scheduleAutoSave()
      }
    },
    moveStep(index, direction) {
      if (!this.canEditFlow) {
        this.showMessage('当前角色无权限调整顺序', 'error')
        return
      }
      if (!this.editingFlow.steps || this.editingFlow.steps.length < 2) return
      const newIndex = index + direction

      // 检查新索引是否有效
      if (newIndex < 0 || newIndex >= this.editingFlow.steps.length) return

      // 交换步骤
      const stepsCopy = [...this.editingFlow.steps]
      const [moved] = stepsCopy.splice(index, 1)
      stepsCopy.splice(newIndex, 0, moved)
      this.editingFlow.steps = stepsCopy
      this.syncCanvasFromSteps()

      if (this.editingStepIndex === index) {
        this.editingStepIndex = newIndex
      }

      // 触发自动保存
      this.scheduleAutoSave()

      // 提示用户
      if (direction === -1) {
        this.showMessage(`已将第 ${index + 1} 步上移到第 ${newIndex + 1} 步`, 'info')
      } else {
        this.showMessage(`已将第 ${index + 1} 步下移到第 ${newIndex + 1} 步`, 'info')
      }
    },
    // 自动保存功能
    hasChanges() {
      if (!this.editingFlow || !this.lastSavedFlow) return true
      return JSON.stringify(this.editingFlow) !== JSON.stringify(this.lastSavedFlow)
    },
    scheduleAutoSave() {
      // 清除旧的计时器
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
      }

      // 如果禁用了自动保存，则不调度
      if (!this.autoSaveEnabled) return

      // 设置新的计时器
      this.autoSaveTimer = setTimeout(() => {
        if (this.editingFlow && this.hasChanges()) {
          this.autoSave()
        }
      }, this.autoSaveInterval)
    },
    async autoSave() {
      if (!this.editingFlow || this.isAutoSaving || !this.autoSaveEnabled) return

      // 如果有未保存的更改，执行保存
      if (!this.hasChanges()) return

      this.isAutoSaving = true
      try {
        const flowData = this.buildFlowPayload(this.editingFlow)
        if (!flowData || flowData.steps.length === 0) return

        const saveResult = await this.saveFlowWithOfflineSupport(flowData, { source: 'auto' })
        if (saveResult?.queued) {
          this.showAutoSaveMessage('✓ 已离线保存，联网后自动同步', 'success')
        } else {
          this.showAutoSaveMessage('✓ 已自动保存', 'success')
        }
      } catch (error) {
        console.error('自动保存失败:', error)
        this.showAutoSaveMessage(`自动保存失败: ${error?.message}`, 'error')
      } finally {
        this.isAutoSaving = false
      }
    },
    setMessage(text, type = 'info', options = {}) {
      const {
        auto = false,
        duration = 3000
      } = options

      if (this.messageTimer) {
        clearTimeout(this.messageTimer)
        this.messageTimer = null
      }

      this.message = { text, type, auto }
      this.messageTimer = setTimeout(() => {
        this.message = null
        this.messageTimer = null
      }, duration)
    },
    showAutoSaveMessage(text, type = 'success') {
      // 自动保存提示不覆盖用户手动操作反馈，避免“调换顺序提示”被抢占
      if (this.message && !this.message.auto) return
      this.setMessage(text, type, { auto: true, duration: 2000 })
    },
    showMessage(text, type = 'info') {
      this.setMessage(text, type, { auto: false, duration: 3000 })
    }
  },
  watch: {
    editingFlow(newFlow) {
      if (newFlow?.steps?.length) {
        this.commentDraft.stepId = this.commentDraft.stepId || newFlow.steps[0].id
        this.initializeFlowDiagram(newFlow)
      } else {
        this.commentDraft.stepId = null
        this.flowDiagram = { nodes: [], edges: [] }
      }
    }
  },
  mounted() {
    const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    if (touchCapable) {
      this.canvasInteractionMode = 'pan'
    }
    this.networkOnline = navigator.onLine !== false
    this.loadOfflineQueue()
    window.addEventListener('online', this.onNetworkOnline)
    window.addEventListener('offline', this.onNetworkOffline)
    this.loadFlowPermissions()
    this.loadFlows()
    if (this.networkOnline && this.pendingSyncCount > 0) {
      this.flushOfflineQueue(true)
    }
    // 公共模块在进入编辑态时懒加载，避免旧后端接口缺失影响列表页操作
  },
  beforeUnmount() {
    // 页面卸载前，清除自动保存计时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
    if (this.messageTimer) {
      clearTimeout(this.messageTimer)
    }
    window.removeEventListener('online', this.onNetworkOnline)
    window.removeEventListener('offline', this.onNetworkOffline)
  }
}
</script>

<style scoped>
.flow-editor {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.editor-header h2 {
  margin: 0 0 4px;
  font-size: 1.8em;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.95em;
}

.flow-info {
  flex: 1;
  min-width: 200px;
}

.flow-name-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-size: 1em;
  font-weight: 600;
}

.flow-desc-input {
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-size: 0.9em;
  resize: vertical;
  font-family: inherit;
}

.editor-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.sync-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78em;
  font-weight: 700;
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.sync-badge.offline {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

.sync-badge.pending {
  background: #fef3c7;
  color: #92400e;
  border-color: #fcd34d;
}

.btn-back {
  border: none;
  background: transparent;
  color: var(--app-primary);
  font-size: 1.1em;
  padding: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* 按钮样式 */
.btn {
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  font-size: 0.95em;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.85em;
}

.btn-primary {
  background: var(--app-primary);
  color: var(--app-on-primary);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-icon {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
  padding: 6px 8px;
  font-size: 0.9em;
}

.btn-icon.btn-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 流程列表 */
.flow-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  border: 2px dashed var(--app-border);
  border-radius: 16px;
  background: var(--app-card);
}

.list-loading {
  text-align: center;
  padding: 40px 20px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  color: var(--app-text-muted);
}

.list-loading__icon {
  font-size: 2em;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 16px;
  color: var(--app-text-muted);
  font-size: 1.1em;
}

.flow-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.flow-card-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.badge {
  background: var(--app-primary);
  color: var(--app-on-primary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}

.card-desc {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
  line-height: 1.4;
}

/* 步骤预览 */
.steps-preview-list {
  padding: 10px;
  background: var(--app-card-elevated);
  border-radius: 8px;
  border-left: 3px solid var(--app-primary);
}

.preview-title {
  font-size: 0.8em;
  font-weight: 600;
  color: var(--app-text-muted);
  margin-bottom: 6px;
}

.steps-preview-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
}

.preview-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85em;
  padding: 6px 0;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  font-size: 0.75em;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.step-title {
  color: var(--app-text);
  font-weight: 600;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}

.step-desc {
  color: var(--app-text-muted);
  font-size: 0.9em;
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.3;
}

.preview-more {
  font-size: 0.8em;
  color: var(--app-text-muted);
  font-style: italic;
  padding-left: 24px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* 编辑器视图 */
.flow-editor-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.steps-editor {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.steps-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.steps-count {
  margin: 4px 0 0;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.no-steps {
  text-align: center;
  padding: 40px 20px;
  color: var(--app-text-muted);
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
}

/* 视图切换器 */
.view-switcher {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  padding: 12px 0;
  border-bottom: 1px solid var(--app-border);
}

.view-switcher button {
  padding: 8px 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-switcher button.active {
  background: var(--app-primary);
  color: white;
  border-color: var(--app-primary);
}

.view-switcher button:hover:not(.active) {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

/* Phase 3: 工具栏分隔符和参数按钮 */
.toolbar-divider {
  width: 1px;
  height: 32px;
  background: var(--app-border);
  margin: 0 4px;
}

.view-switcher .btn-sm {
  padding: 8px 12px;
  font-size: 0.9rem;
}

.view-switcher .btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 时间线视图容器 */
.timeline-section {
  padding: 20px 0;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  margin: 12px 0;
}

.relation-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  margin: 12px 0;
}

.canvas-section {
  margin: 12px 0;
}

.canvas-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.canvas-toolbar .btn.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: var(--app-primary);
}

.canvas-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.flow-canvas {
  width: 100%;
  min-width: 760px;
  height: 460px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(59, 130, 246, 0.04));
}

.canvas-hint {
  margin: 8px 2px 0;
  color: var(--app-text-muted);
  font-size: 0.85em;
}

/* 步骤列表容器 - 支持滚动 */
.steps-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.steps-list::-webkit-scrollbar {
  width: 6px;
}

.steps-list::-webkit-scrollbar-track {
  background: var(--app-card);
  border-radius: 3px;
}

.steps-list::-webkit-scrollbar-thumb {
  background: var(--app-border);
  border-radius: 3px;
}

.steps-list::-webkit-scrollbar-thumb:hover {
  background: var(--app-text-muted);
}

.step-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
}

.step-item.editing-step {
  border-color: var(--app-primary);
  background: rgba(0, 122, 255, 0.05);
}

/* 步骤头部行 - 包含编号、名称、操作按钮 */
.step-header-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.step-number {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9em;
}

.step-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-text {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--app-text);
}

.label-hint {
  font-size: 0.75em;
  color: var(--app-text-muted);
  font-weight: normal;
}

.step-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: 600;
  min-width: 200px;
}

.step-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-family: inherit;
  font-size: 0.9em;
  resize: vertical;
}

/* 步骤属性行 */
.step-fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.step-input-sm {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-size: 0.85em;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-direction: row;
}

.checkbox-label input {
  cursor: pointer;
  margin: 0;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  gap: 6px;
  flex-direction: row;
}

/* 步骤信息提示 */
.steps-info {
  padding: 12px;
  background: rgba(0, 122, 255, 0.05);
  border: 1px solid rgba(0, 122, 255, 0.2);
  border-radius: 8px;
  color: var(--app-text-muted);
  font-size: 0.9em;
  text-align: center;
}

.steps-info p {
  margin: 0;
}

/* 预览 */
.steps-preview {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
}

.steps-preview h3 {
  margin: 0 0 12px;
  font-size: 1.1em;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
}

.preview-index {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85em;
}

.preview-info {
  flex: 1;
}

.preview-title {
  margin: 0;
  font-weight: 600;
  color: var(--app-text);
}

.preview-desc {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.preview-tip,
.preview-note {
  margin: 4px 0 0;
  font-size: 0.8em;
  color: var(--app-text-muted);
}

.preview-note {
  color: var(--app-text);
  font-weight: 500;
}

.preview-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  flex-wrap: wrap;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.versions-panel {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.versions-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.versions-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.versions-loading,
.versions-error,
.versions-empty {
  padding: 12px;
  text-align: center;
  color: var(--app-text-muted);
}

.versions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.versions-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.versions-item strong {
  display: block;
  font-size: 0.95em;
}

.versions-status {
  font-size: 0.8em;
  color: var(--app-text);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
}

.collaboration-panel {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.collaboration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.swimlane-container {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.swimlane {
  flex: 1;
  min-width: 220px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 12px;
  background: var(--app-card-elevated);
}

.swimlane-label {
  font-weight: 600;
  margin-bottom: 8px;
}

.swimlane-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.swimlane-step {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  border: 1px dashed var(--app-border);
  align-items: center;
  cursor: pointer;
}

.swimlane-step input {
  accent-color: var(--app-primary);
}

.swimlane-step strong {
  margin: 0;
  font-size: 0.9em;
  display: block;
}

.swimlane-step__meta {
  font-size: 0.8em;
  color: var(--app-text-muted);
  display: flex;
  gap: 6px;
}

.comment-section {
  border-top: 1px solid var(--app-border);
  padding-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-form label {
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.comment-form textarea,
.comment-form input,
.comment-form select {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-family: inherit;
}

.comment-step-select {
  width: 100%;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.comment-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.8em;
  color: var(--app-text-muted);
  margin-bottom: 4px;
}

.comment-body {
  margin: 0;
  font-size: 0.95em;
}

.comment-ts {
  margin-left: auto;
}

.comment-empty {
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.module-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.module-form-row label {
  font-size: 0.88em;
  color: var(--app-text-muted);
}

.module-form-hint {
  margin: 0;
  font-size: 0.82em;
  color: var(--app-text-muted);
}

.module-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.comment-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75em;
  font-weight: 600;
}

.comment-status--open {
  background: #fef3c7;
  color: #92400e;
}

.comment-status--resolved {
  background: #dcfce7;
  color: #166534;
}

.comment-actions {
  margin-top: 8px;
}

.mention {
  font-weight: 600;
  color: var(--app-primary);
}

/* 消息提示 */
.message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #10b981;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.message.error {
  background: #ef4444;
}

.message.auto-save {
  bottom: 80px;
  right: 20px;
  background: #8b5cf6;
  opacity: 0.9;
  font-size: 0.85em;
  padding: 8px 12px;
}

/* Visual refresh */
.flow-editor {
  --flow-accent: #0ea5e9;
  --flow-accent-soft: rgba(14, 165, 233, 0.14);
  --flow-emerald: #10b981;
  --flow-bg: linear-gradient(160deg, #f8fbff 0%, #f4f7ff 44%, #f0fdfa 100%);
  font-family: "Avenir Next", "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif;
  background: var(--flow-bg);
  border-radius: 18px;
}

.editor-header h2 {
  letter-spacing: 0.2px;
}

.subtitle {
  color: #5f6f87;
}

.btn {
  border-radius: 10px;
  border-color: #d1ddf0;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.09);
}

.btn-primary {
  background: linear-gradient(120deg, #0ea5e9, #2563eb);
  border-color: transparent;
}

.btn-success {
  background: linear-gradient(120deg, #10b981, #059669);
  border-color: transparent;
}

.flow-card-item,
.steps-editor,
.steps-preview,
.versions-panel,
.collaboration-panel {
  border-color: #dbe5f5;
  border-radius: 16px;
  box-shadow: 0 10px 26px rgba(30, 41, 59, 0.08);
}

.flow-card-item {
  background: linear-gradient(155deg, #ffffff 0%, #f8fbff 58%, #eef6ff 100%);
}

.flow-card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(14, 48, 105, 0.12);
}

.badge {
  background: linear-gradient(120deg, #0284c7, #2563eb);
  border-radius: 999px;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.3);
}

.steps-preview-list {
  background: linear-gradient(145deg, #f6fbff, #f0f9ff);
  border-left: 3px solid var(--flow-accent);
}

.steps-header,
.view-switcher {
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(to bottom, rgba(248, 251, 255, 0.95), rgba(248, 251, 255, 0.88));
  backdrop-filter: blur(6px);
}

.view-switcher button {
  border-radius: 999px;
  border-color: #cfdef3;
  background: linear-gradient(180deg, #fff, #f7fbff);
  color: #274060;
}

.view-switcher button.active {
  background: linear-gradient(120deg, #0891b2, #1d4ed8);
  box-shadow: 0 8px 18px rgba(29, 78, 216, 0.24);
}

.step-item {
  border-color: #d9e6f7;
  border-radius: 14px;
  background: linear-gradient(150deg, #ffffff 0%, #f8fbff 60%, #f0f7ff 100%);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);
}

.step-item:hover {
  border-color: #93c5fd;
}

.step-item.editing-step {
  border-color: #0284c7;
  background: linear-gradient(145deg, #f0faff, #eaf4ff);
  box-shadow: 0 12px 26px rgba(14, 116, 144, 0.2);
}

.step-number,
.preview-index,
.step-num {
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.28);
}

.step-input,
.step-textarea,
.step-input-sm,
.comment-form textarea,
.comment-form input,
.comment-form select,
.flow-name-input,
.flow-desc-input {
  border-color: #cfdcee;
  background: #ffffff;
  border-radius: 10px;
}

.step-input:focus,
.step-textarea:focus,
.step-input-sm:focus,
.flow-name-input:focus,
.flow-desc-input:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px var(--flow-accent-soft);
  outline: none;
}

.steps-info {
  background: linear-gradient(140deg, rgba(14, 165, 233, 0.08), rgba(16, 185, 129, 0.09));
  border-color: rgba(14, 165, 233, 0.24);
}

.comment-card,
.versions-item,
.swimlane,
.swimlane-step {
  border-color: #d7e6fa;
  background: linear-gradient(160deg, #ffffff, #f5faff);
}

.message {
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .flow-editor {
    padding: 12px;
  }

  .editor-header {
    flex-direction: column;
    gap: 12px;
  }

  .editor-header h2 {
    font-size: 1.4em;
  }

  /* 移动端步骤列表 */
  .steps-list {
    max-height: 60vh;
  }

  .step-header-row {
    flex-wrap: wrap;
  }

  .step-input {
    min-width: auto;
  }

  .step-fields-row {
    grid-template-columns: 1fr;
  }

  .step-actions {
    flex-direction: row;
    gap: 4px;
  }

  .btn-icon {
    padding: 4px 8px;
    font-size: 0.9em;
  }

  .steps-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .flow-cards {
    grid-template-columns: 1fr;
  }

  .steps-preview-list {
    padding: 8px;
  }

  .preview-step {
    font-size: 0.8em;
    gap: 6px;
  }

  .step-num {
    width: 18px;
    height: 18px;
    font-size: 0.65em;
  }

  .step-desc {
    font-size: 0.85em;
  }

  .step-meta {
    flex-direction: column;
    gap: 6px;
  }

  .step-input-sm {
    min-width: 100%;
  }

  .step-actions {
    flex-direction: row;
    gap: 2px;
  }

  .steps-editor,
  .steps-preview {
    padding: 12px;
  }

  .view-switcher {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
    padding-bottom: 10px;
  }

  .view-switcher button {
    flex: 0 0 auto;
    min-height: 40px;
    padding: 8px 14px;
  }

  .btn,
  .btn-icon,
  .btn-back {
    min-height: 40px;
  }

  .flow-canvas {
    min-width: 680px;
    height: 56vh;
    min-height: 340px;
    max-height: 520px;
  }

  .canvas-toolbar .btn {
    min-height: 40px;
  }

  .message {
    bottom: 12px;
    right: 12px;
    left: 12px;
  }
}

@media (max-width: 480px) {
  .flow-editor {
    padding: 8px;
  }

  .editor-header h2 {
    font-size: 1.2em;
  }

  .editor-actions {
    width: 100%;
  }

  .btn {
    flex: 1;
  }

  .view-switcher button {
    min-height: 38px;
    padding: 8px 12px;
  }

  .card-header {
    flex-direction: column;
  }

  .step-item {
    flex-direction: column;
    gap: 8px;
  }

  .step-number {
    align-self: flex-start;
  }

  .step-actions {
    width: 100%;
    flex-direction: row;
  }

  .btn-icon {
    flex: 1;
  }

  .preview-item {
    gap: 8px;
  }

  .flow-canvas {
    min-width: 620px;
    min-height: 320px;
  }

  .canvas-toolbar {
    gap: 6px;
  }
}
</style>
