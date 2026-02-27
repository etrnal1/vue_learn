<template>
  <div class="flow-editor">
    <!-- 工具栏 -->
    <div class="flow-editor__toolbar">
      <div class="toolbar-section">
        <h3>节点工具</h3>
        <div class="node-palette">
          <button
            class="palette-btn"
            draggable="true"
            @dragstart="onNodeDragStart('startEvent')"
            title="开始事件"
          >
            ◆ 开始
          </button>
          <button
            class="palette-btn"
            draggable="true"
            @dragstart="onNodeDragStart('userTask')"
            title="用户任务"
          >
            ◻ 任务
          </button>
          <button
            class="palette-btn"
            draggable="true"
            @dragstart="onNodeDragStart('exclusiveGateway')"
            title="排他网关 - 条件分支"
          >
            ◊ 排他分支
          </button>
          <button
            class="palette-btn"
            draggable="true"
            @dragstart="onNodeDragStart('parallelGateway')"
            title="并行网关 - 多路并行执行"
          >
            ⬠ 并行网关
          </button>
          <button
            class="palette-btn"
            draggable="true"
            @dragstart="onNodeDragStart('inclusiveGateway')"
            title="包容网关 - 多条件组合"
          >
            ◈ 包容网关
          </button>
          <button
            class="palette-btn"
            draggable="true"
            @dragstart="onNodeDragStart('endEvent')"
            title="结束事件"
          >
            ◆ 结束
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <h3>操作</h3>
        <button class="action-btn" @click="saveFlow" :disabled="!hasChanges">
          💾 保存
        </button>
        <button class="action-btn" @click="deleteSelected" :disabled="!selectedNode">
          🗑 删除
        </button>
        <button class="action-btn" @click="zoomFit">
          🔍 适应屏幕
        </button>
      </div>
    </div>

    <!-- 画布区域 -->
    <div class="flow-editor__canvas" @dragover="onDragOver" @drop="onDrop">
      <VueFlow
        ref="vueFlow"
        :nodes="nodes"
        :edges="edges"
        :default-viewport="defaultViewport"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
        <MiniMap />

        <!-- 自定义节点 -->
        <template #node-startEvent="nodeProps">
          <StartNode :data="nodeProps.data" />
        </template>
        <template #node-userTask="nodeProps">
          <UserTaskNode :data="nodeProps.data" />
        </template>
        <template #node-exclusiveGateway="nodeProps">
          <ExclusiveGatewayNode :data="nodeProps.data" />
        </template>
        <template #node-parallelGateway="nodeProps">
          <ParallelGatewayNode :data="nodeProps.data" />
        </template>
        <template #node-inclusiveGateway="nodeProps">
          <InclusiveGatewayNode :data="nodeProps.data" />
        </template>
        <template #node-endEvent="nodeProps">
          <EndNode :data="nodeProps.data" />
        </template>
      </VueFlow>
    </div>

    <!-- 属性编辑面板 -->
    <div v-if="selectedNode" class="flow-editor__properties">
      <div class="properties-header">
        <h3>节点属性</h3>
        <button class="close-btn" @click="selectedNode = null">×</button>
      </div>

      <div class="properties-body">
        <div class="form-group">
          <label>节点名称</label>
          <input
            v-model="selectedNode.data.label"
            type="text"
            class="app-input"
            @change="onNodePropertyChange"
          />
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea
            v-model="selectedNode.data.description"
            class="app-textarea"
            rows="3"
            @change="onNodePropertyChange"
          ></textarea>
        </div>

        <div v-if="selectedNode.type !== 'startEvent' && selectedNode.type !== 'endEvent'" class="form-group">
          <label>负责人</label>
          <input
            v-model="selectedNode.data.assignee"
            type="text"
            class="app-input"
            placeholder="输入用户名或ID"
            @change="onNodePropertyChange"
          />
        </div>

        <div v-if="selectedNode.type === 'userTask'" class="form-group">
          <label>预计耗时</label>
          <input
            v-model="selectedNode.data.duration"
            type="text"
            class="app-input"
            placeholder="例: 2h, 30m"
            @change="onNodePropertyChange"
          />
        </div>

        <div v-if="['exclusiveGateway', 'parallelGateway', 'inclusiveGateway'].includes(selectedNode.type)" class="form-group">
          <label>条件配置</label>
          <button class="btn btn-sm btn-outline" @click="editConditions">
            编辑条件
          </button>
          <div v-if="selectedNode.data.condition" class="condition-info">
            <small>已设置条件</small>
          </div>
        </div>
      </div>
    </div>

    <!-- 连线信息 -->
    <div v-if="selectedEdge" class="flow-editor__edge-properties">
      <div class="properties-header">
        <h3>连线属性</h3>
        <button class="close-btn" @click="selectedEdge = null">×</button>
      </div>

      <div class="properties-body">
        <div class="form-group">
          <label>连线标签</label>
          <input
            v-model="selectedEdge.label"
            type="text"
            class="app-input"
            @change="onEdgePropertyChange"
          />
        </div>
      </div>
    </div>

    <!-- 加载/保存提示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-if="saveStatus" class="save-status" :class="saveStatus.type">
      {{ saveStatus.message }}
    </div>

    <!-- 条件编辑对话框 -->
    <ConditionEditorDialog
      v-if="showConditionEditor"
      :condition="selectedNode?.data?.condition"
      @save="onConditionSave"
      @close="showConditionEditor = false"
    />
  </div>
</template>

<script>
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import StartNode from './nodes/StartNode.vue'
import UserTaskNode from './nodes/UserTaskNode.vue'
import ExclusiveGatewayNode from './nodes/ExclusiveGatewayNode.vue'
import ParallelGatewayNode from './nodes/ParallelGatewayNode.vue'
import InclusiveGatewayNode from './nodes/InclusiveGatewayNode.vue'
import EndNode from './nodes/EndNode.vue'
import ConditionEditorDialog from './dialogs/ConditionEditorDialog.vue'
import { api } from '../../utils/api.js'

// 简单的 UUID 生成函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const uuidv4 = generateUUID

export default {
  name: 'FlowEditor',
  components: {
    VueFlow,
    Background,
    Controls,
    MiniMap,
    StartNode,
    UserTaskNode,
    ExclusiveGatewayNode,
    ParallelGatewayNode,
    InclusiveGatewayNode,
    EndNode,
    ConditionEditorDialog
  },
  props: {
    flowId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      flow: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      loading: false,
      hasChanges: false,
      saveStatus: null,
      draggedNodeType: null,
      defaultViewport: { zoom: 1, x: 0, y: 0 },
      nodeIdCounter: 0,
      showConditionEditor: false
    }
  },
  watch: {
    flowId: {
      immediate: true,
      handler() {
        this.loadFlow()
      }
    }
  },
  mounted() {
    this.vueFlow = this.$refs.vueFlow
  },
  methods: {
    async loadFlow() {
      this.loading = true
      try {
        this.flow = await api.flows.getOne(this.flowId)
        this.initializeGraph()
        this.hasChanges = false
      } catch (error) {
        console.error('加载流程失败:', error)
        this.showSaveStatus('加载失败', 'error')
      } finally {
        this.loading = false
      }
    },

    initializeGraph() {
      const steps = this.flow.steps || []
      const nodeMap = new Map()

      // 创建节点
      this.nodes = steps.map((step, index) => {
        const node = {
          id: step.id || `node_${index}`,
          type: step.node_type || 'userTask',
          position: {
            x: step.position_x || index * 200,
            y: step.position_y || 100
          },
          data: {
            label: step.name,
            description: step.description,
            assignee: step.assignee,
            duration: step.duration,
            conditional: step.conditional
          },
          draggable: true,
          selectable: true
        }
        nodeMap.set(step.id, node)
        return node
      })

      // 创建边（连线）
      this.edges = []
      steps.forEach((step, index) => {
        if (index < steps.length - 1) {
          const nextStep = steps[index + 1]
          this.edges.push({
            id: `edge_${step.id}_${nextStep.id}`,
            source: step.id,
            target: nextStep.id,
            label: step.conditional ? '条件' : ''
          })
        }
      })

      this.nodeIdCounter = steps.length
    },

    onNodeDragStart(nodeType) {
      this.draggedNodeType = nodeType
    },

    onDragOver(event) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },

    onDrop(event) {
      if (!this.draggedNodeType) return

      event.preventDefault()

      const { x, y } = event
      const newNode = {
        id: `node_${uuidv4()}`,
        type: this.draggedNodeType,
        position: { x: x - 60, y: y - 40 },
        data: {
          label: this.getNodeLabel(this.draggedNodeType),
          description: '',
          assignee: ''
        }
      }

      this.nodes.push(newNode)
      this.hasChanges = true
      this.draggedNodeType = null
    },

    getNodeLabel(nodeType) {
      const labels = {
        startEvent: '开始',
        userTask: '新任务',
        exclusiveGateway: '排他分支',
        parallelGateway: '并行网关',
        inclusiveGateway: '包容网关',
        endEvent: '结束'
      }
      return labels[nodeType] || nodeType
    },

    onNodesChange(changes) {
      changes.forEach(change => {
        if (change.type === 'position' && change.position) {
          this.hasChanges = true
        }
      })
    },

    onEdgesChange(changes) {
      this.hasChanges = true
    },

    onConnect(connection) {
      const edge = {
        id: `edge_${connection.source}_${connection.target}`,
        source: connection.source,
        target: connection.target
      }
      this.edges.push(edge)
      this.hasChanges = true
    },

    onNodeClick(event) {
      this.selectedNode = event.node
      this.selectedEdge = null
    },

    onPaneClick() {
      this.selectedNode = null
      this.selectedEdge = null
    },

    onNodePropertyChange() {
      this.hasChanges = true
    },

    onEdgePropertyChange() {
      this.hasChanges = true
    },

    deleteSelected() {
      if (this.selectedNode) {
        this.nodes = this.nodes.filter(n => n.id !== this.selectedNode.id)
        this.edges = this.edges.filter(e =>
          e.source !== this.selectedNode.id && e.target !== this.selectedNode.id
        )
        this.selectedNode = null
        this.hasChanges = true
      }
    },

    async saveFlow() {
      if (!this.hasChanges) return

      this.loading = true
      try {
        // 准备更新数据
        const updateData = {
          steps: this.nodes.map(node => ({
            id: node.id,
            name: node.data.label,
            description: node.data.description,
            assignee: node.data.assignee,
            duration: node.data.duration,
            position_x: Math.round(node.position.x),
            position_y: Math.round(node.position.y),
            node_type: node.type,
            node_width: 120,
            node_height: 80
          })),
          connections: this.edges.map(edge => ({
            source_step_id: edge.source,
            target_step_id: edge.target,
            label: edge.label
          }))
        }

        await api.flows.update(this.flowId, updateData)
        this.hasChanges = false
        this.showSaveStatus('保存成功', 'success')
      } catch (error) {
        console.error('保存失败:', error)
        this.showSaveStatus('保存失败', 'error')
      } finally {
        this.loading = false
      }
    },

    zoomFit() {
      if (this.vueFlow) {
        this.vueFlow.fitView()
      }
    },

    editConditions() {
      this.showConditionEditor = true
    },

    onConditionSave(condition) {
      if (this.selectedNode) {
        this.selectedNode.data.condition = condition
        this.hasChanges = true
      }
      this.showConditionEditor = false
    },

    showSaveStatus(message, type) {
      this.saveStatus = { message, type }
      setTimeout(() => {
        this.saveStatus = null
      }, 3000)
    }
  }
}
</script>

<style scoped>
.flow-editor {
  display: flex;
  height: 100vh;
  background: var(--app-bg);
  color: var(--app-text);
}

.flow-editor__toolbar {
  width: 200px;
  background: var(--app-card);
  border-right: 1px solid var(--app-border);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.toolbar-section h3 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: #666;
  font-weight: 600;
}

.node-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-btn {
  padding: 8px 12px;
  background: var(--app-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: grab;
  font-size: 0.9rem;
  transition: opacity 0.2s;
}

.palette-btn:hover:not(:disabled) {
  opacity: 0.8;
}

.palette-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: var(--app-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flow-editor__canvas {
  flex: 1;
  position: relative;
  background: white;
}

.flow-editor__canvas :deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

.flow-editor__properties,
.flow-editor__edge-properties {
  width: 300px;
  background: var(--app-card);
  border-left: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  overflow-y: auto;
}

.properties-header {
  padding: 16px;
  border-bottom: 1px solid var(--app-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.properties-header h3 {
  margin: 0;
  font-size: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--app-text);
}

.properties-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
}

.app-input,
.app-textarea {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.app-textarea {
  resize: vertical;
}

.condition-info {
  padding: 6px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 0.85rem;
  text-align: center;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.save-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  animation: slideIn 0.3s ease-out;
}

.save-status.success {
  background: #10b981;
  color: white;
}

.save-status.error {
  background: #ef4444;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .flow-editor {
    flex-direction: column;
  }

  .flow-editor__toolbar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--app-border);
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .flow-editor__properties,
  .flow-editor__edge-properties {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--app-border);
    max-height: 40vh;
  }
}
</style>
