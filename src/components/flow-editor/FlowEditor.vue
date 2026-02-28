<template>
  <div class="flow-editor">
    <!-- 工具栏 -->
    <div class="flow-editor__toolbar">
      <div class="toolbar-section">
        <h2 class="flow-title">{{ title || '流程画布' }}</h2>
        <h3>节点工具</h3>
        <div class="node-palette">
          <button
            class="palette-btn"
            :disabled="readonly"
            draggable="true"
            @dragstart="onNodeDragStart('startEvent', $event)"
            @touchstart="onNodeTouchStart('startEvent', $event)"
            title="开始事件"
          >
            ◆ 开始
          </button>
          <button
            class="palette-btn"
            :disabled="readonly"
            draggable="true"
            @dragstart="onNodeDragStart('userTask', $event)"
            @touchstart="onNodeTouchStart('userTask', $event)"
            title="用户任务"
          >
            ◻ 任务
          </button>
          <button
            class="palette-btn"
            :disabled="readonly"
            draggable="true"
            @dragstart="onNodeDragStart('exclusiveGateway', $event)"
            @touchstart="onNodeTouchStart('exclusiveGateway', $event)"
            title="排他网关 - 条件分支"
          >
            ◊ 排他分支
          </button>
          <button
            class="palette-btn"
            :disabled="readonly"
            draggable="true"
            @dragstart="onNodeDragStart('parallelGateway', $event)"
            @touchstart="onNodeTouchStart('parallelGateway', $event)"
            title="并行网关 - 多路并行执行"
          >
            ⬠ 并行网关
          </button>
          <button
            class="palette-btn"
            :disabled="readonly"
            draggable="true"
            @dragstart="onNodeDragStart('inclusiveGateway', $event)"
            @touchstart="onNodeTouchStart('inclusiveGateway', $event)"
            title="包容网关 - 多条件组合"
          >
            ◈ 包容网关
          </button>
          <button
            class="palette-btn"
            :disabled="readonly"
            draggable="true"
            @dragstart="onNodeDragStart('endEvent', $event)"
            @touchstart="onNodeTouchStart('endEvent', $event)"
            title="结束事件"
          >
            ◆ 结束
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <h3>操作</h3>
        <button class="action-btn" @click="saveFlow" :disabled="!hasChanges || readonly">
          💾 保存
        </button>
        <button class="action-btn" @click="deleteSelected" :disabled="(!selectedNode && !selectedEdge) || readonly">
          🗑 删除
        </button>
        <button class="action-btn" @click="zoomFit">
          🔍 适应屏幕
        </button>
      </div>
    </div>

    <!-- 画布区域 -->
    <div
      ref="vueFlowContainer"
      class="flow-editor__canvas"
      :class="{ 'is-drag-over': isDragOver }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <FlowThreeBackground :nodes="nodes" :edges="edges" />
      <div class="relation-legend">
        <span><i class="chip seq"></i>顺序集</span>
        <span><i class="chip parallel"></i>平级集</span>
        <span><i class="chip child"></i>子集</span>
      </div>
      <VueFlow
        ref="vueFlow"
        :nodes="nodes"
        :edges="edges"
        :default-viewport="defaultViewport"
        :nodes-draggable="!readonly"
        :nodes-connectable="!readonly"
        :elements-selectable="true"
        :pan-on-drag="true"
        :zoom-on-pinch="true"
        :zoom-on-scroll="true"
        :prevent-scrolling="false"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
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
import { VueFlow, applyNodeChanges, applyEdgeChanges } from '@vue-flow/core'
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
import FlowThreeBackground from './FlowThreeBackground.vue'
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
    ConditionEditorDialog,
    FlowThreeBackground
  },
  props: {
    flowId: {
      type: String,
      default: ''
    },
    modelValue: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    },
    title: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'save', 'node-select', 'layout-change'],
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
      showConditionEditor: false,
      // 拖拽相关状态
      isDragOver: false,
      dragOverPos: null,
      dragStartPos: null,
      dragImage: null,
      // 移动设备触摸相关状态
      touchStartNodeType: null,
      touchStartPos: null,
      touchElement: null,
      isMobile: false,
      isNodeDragging: false
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(value) {
        if (!value || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return
        // 拖拽中忽略外部回写，避免节点被强制重置位置导致“拖不动”
        if (this.isNodeDragging) return
        this.nodes = JSON.parse(JSON.stringify(value.nodes))
        this.edges = JSON.parse(JSON.stringify(value.edges))
      }
    },
    flowId: {
      immediate: true,
      handler() {
        if (this.flowId) this.loadFlow()
      }
    }
  },
  mounted() {
    this.vueFlow = this.$refs.vueFlow
    // 检测是否是移动设备
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  },
  unmounted() {
    // 清理触摸事件监听
    if (this.touchElement) {
      this.touchElement.removeEventListener('touchend', this.onTouchEnd)
    }
  },
  methods: {
    async loadFlow() {
      if (!this.flowId) return
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
            label: step.conditional ? '条件' : '主流程',
            animated: true,
            markerEnd: 'arrowclosed',
            style: {
              stroke: step.conditional ? '#f59e0b' : '#10b981',
              strokeWidth: 2,
              strokeDasharray: step.conditional ? '6 3' : undefined
            }
          })
        }
      })

      this.nodeIdCounter = steps.length
    },

    onNodeDragStart(nodeType, event) {
      this.draggedNodeType = nodeType
      this.dragStartPos = { x: event.clientX, y: event.clientY }

      // 创建自定义拖拽图像
      if (event.dataTransfer) {
        const label = this.getNodeLabel(nodeType)
        const dragImg = document.createElement('div')
        dragImg.textContent = label
        dragImg.style.cssText = `
          padding: 8px 12px;
          background: var(--app-primary);
          color: white;
          border-radius: 6px;
          font-size: 12px;
          position: absolute;
          left: -9999px;
          pointer-events: none;
        `
        document.body.appendChild(dragImg)
        event.dataTransfer.setDragImage(dragImg, 0, 0)
        event.dataTransfer.effectAllowed = 'copy'

        setTimeout(() => document.body.removeChild(dragImg), 0)
      }
    },

    onDragOver(event) {
      if (!this.draggedNodeType) return

      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'

      // 视觉反馈：高亮画布
      this.isDragOver = true
      this.dragOverPos = { x: event.clientX, y: event.clientY }
    },

    onDragLeave(event) {
      // 防止子元素的 dragLeave 触发
      if (event.target === event.currentTarget) {
        this.isDragOver = false
        this.dragOverPos = null
      }
    },

    onDrop(event) {
      if (!this.draggedNodeType) return

      event.preventDefault()
      this.isDragOver = false
      this.dragOverPos = null

      // 获取画布相对位置
      const canvas = this.$refs.vueFlowContainer
      if (!canvas) {
        // 如果没有获取到容器，使用屏幕坐标
        this.createNodeAtPosition(event.clientX, event.clientY)
      } else {
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // 考虑缩放和平移
        const vueFlow = this.vueFlow
        if (vueFlow && vueFlow.project) {
          try {
            const pos = vueFlow.project({ x, y })
            this.createNodeAtPosition(pos.x, pos.y)
          } catch (e) {
            // 如果 project 方法失败，使用原始位置
            this.createNodeAtPosition(x, y)
          }
        } else {
          this.createNodeAtPosition(x, y)
        }
      }

      this.draggedNodeType = null
    },

    createNodeAtPosition(x, y) {
      // 考虑节点大小进行居中
      const nodeWidth = 120
      const nodeHeight = 60

      const newNode = {
        id: `node_${uuidv4()}`,
        type: this.draggedNodeType,
        position: {
          x: x - nodeWidth / 2,
          y: y - nodeHeight / 2
        },
        data: {
          label: this.getNodeLabel(this.draggedNodeType),
          description: '',
          assignee: '',
          duration: '',
          conditional: false
        },
        draggable: true,
        selectable: true
      }

      this.nodes.push(newNode)
      this.hasChanges = true

      // 自动选中新节点
      this.selectedNode = newNode
      this.emitModelValue()
      this.emitLayoutChange()
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

    // ========== 移动设备触摸支持 ==========

    onNodeTouchStart(nodeType, event) {
      if (this.isMobile) {
        event.preventDefault()
        this.touchStartNodeType = nodeType
        this.touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY }

        // 创建虚拟拖拽元素（视觉反馈）
        const label = this.getNodeLabel(nodeType)
        const touchElement = document.createElement('div')
        touchElement.textContent = label
        touchElement.style.cssText = `
          padding: 10px 14px;
          background: var(--app-primary);
          color: white;
          border-radius: 6px;
          font-size: 13px;
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: translate(-50%, -50%);
        `

        // 跟随手指移动
        const onTouchMove = (moveEvent) => {
          const touch = moveEvent.touches[0]
          touchElement.style.left = touch.clientX + 'px'
          touchElement.style.top = touch.clientY + 'px'

          // 视觉反馈：检查是否在画布上
          const canvas = this.$refs.vueFlowContainer
          if (canvas) {
            const rect = canvas.getBoundingClientRect()
            const isOverCanvas = (
              touch.clientX >= rect.left &&
              touch.clientX <= rect.right &&
              touch.clientY >= rect.top &&
              touch.clientY <= rect.bottom
            )
            touchElement.style.background = isOverCanvas ? 'var(--app-primary)' : '#ef4444'
          }
        }

        const onTouchEnd = (endEvent) => {
          document.removeEventListener('touchmove', onTouchMove)
          document.removeEventListener('touchend', onTouchEnd)

          if (touchElement.parentNode) {
            document.body.removeChild(touchElement)
          }

          // 判断放置位置
          if (endEvent.changedTouches.length > 0) {
            const touch = endEvent.changedTouches[0]
            const canvas = this.$refs.vueFlowContainer

            if (canvas) {
              const rect = canvas.getBoundingClientRect()
              const isOverCanvas = (
                touch.clientX >= rect.left &&
                touch.clientX <= rect.right &&
                touch.clientY >= rect.top &&
                touch.clientY <= rect.bottom
              )

              if (isOverCanvas) {
                const x = touch.clientX - rect.left
                const y = touch.clientY - rect.top

                // 考虑缩放
                const vueFlow = this.vueFlow
                if (vueFlow && vueFlow.project) {
                  try {
                    const pos = vueFlow.project({ x, y })
                    this.createNodeAtPosition(pos.x, pos.y)
                  } catch (e) {
                    this.createNodeAtPosition(x, y)
                  }
                } else {
                  this.createNodeAtPosition(x, y)
                }
              }
            }
          }

          this.touchStartNodeType = null
          this.touchStartPos = null
        }

        document.body.appendChild(touchElement)
        document.addEventListener('touchmove', onTouchMove, { passive: false })
        document.addEventListener('touchend', onTouchEnd)
      }
    },

    onNodesChange(changes) {
      if (this.readonly) return
      this.nodes = applyNodeChanges(changes, this.nodes)
      let hasFinalChange = false
      changes.forEach(change => {
        if (change.type === 'position' && change.position) {
          this.hasChanges = true
          this.isNodeDragging = Boolean(change.dragging)
          if (change.dragging === false) {
            hasFinalChange = true
            this.isNodeDragging = false
          }
        } else if (change.type !== 'select') {
          hasFinalChange = true
        }
      })
      if (hasFinalChange) {
        this.emitModelValue()
        this.emitLayoutChange()
      }
    },

    onEdgesChange(changes) {
      if (this.readonly) return
      this.edges = applyEdgeChanges(changes, this.edges)
      this.hasChanges = true
      this.emitModelValue()
      this.emitLayoutChange()
    },

    onConnect(connection) {
      if (this.readonly) return
      const edge = {
        id: `edge_${connection.source}_${connection.target}`,
        source: connection.source,
        target: connection.target,
        label: '主流程',
        animated: true,
        markerEnd: 'arrowclosed',
        style: { stroke: '#10b981', strokeWidth: 2 }
      }
      this.edges.push(edge)
      this.hasChanges = true
      this.emitModelValue()
      this.emitLayoutChange()
    },

    onNodeClick(event) {
      this.selectedNode = event.node
      this.selectedEdge = null
      this.$emit('node-select', event.node)
    },
    onEdgeClick(event) {
      this.selectedEdge = event.edge
      this.selectedNode = null
    },

    onPaneClick() {
      this.selectedNode = null
      this.selectedEdge = null
    },

    onNodePropertyChange() {
      if (this.readonly) return
      this.hasChanges = true
      this.emitModelValue()
      this.emitLayoutChange()
    },

    onEdgePropertyChange() {
      if (this.readonly) return
      this.hasChanges = true
      this.emitModelValue()
      this.emitLayoutChange()
    },

    deleteSelected() {
      if (this.readonly) return
      if (this.selectedNode) {
        this.nodes = this.nodes.filter(n => n.id !== this.selectedNode.id)
        this.edges = this.edges.filter(e =>
          e.source !== this.selectedNode.id && e.target !== this.selectedNode.id
        )
        this.selectedNode = null
        this.hasChanges = true
        this.emitModelValue()
        this.emitLayoutChange()
        return
      }
      if (this.selectedEdge) {
        this.edges = this.edges.filter(e => e.id !== this.selectedEdge.id)
        this.selectedEdge = null
        this.hasChanges = true
        this.emitModelValue()
        this.emitLayoutChange()
      }
    },

    async saveFlow() {
      if (!this.hasChanges) return

      this.loading = true
      try {
        if (!this.flowId) {
          const elements = [...this.nodes, ...this.edges.map((edge) => ({ ...edge, type: 'edge' }))]
          this.$emit('save', elements)
          this.hasChanges = false
          this.showSaveStatus('布局已应用', 'success')
          return
        }
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
      if (this.readonly) return
      if (this.selectedNode) {
        this.selectedNode.data.condition = condition
        this.hasChanges = true
        this.emitModelValue()
      }
      this.showConditionEditor = false
    },
    emitModelValue() {
      this.$emit('update:modelValue', {
        nodes: JSON.parse(JSON.stringify(this.nodes)),
        edges: JSON.parse(JSON.stringify(this.edges))
      })
    },
    emitLayoutChange() {
      this.$emit('layout-change', {
        nodes: JSON.parse(JSON.stringify(this.nodes)),
        edges: JSON.parse(JSON.stringify(this.edges))
      })
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
  background: linear-gradient(160deg, #f8fbff 0%, #f0f9ff 48%, #eefaf5 100%);
  color: var(--app-text);
  border-radius: 16px;
  overflow: hidden;
}

.flow-editor__toolbar {
  width: 230px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 68%, #f0f9ff 100%);
  border-right: 1px solid #dbe7f7;
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
  color: #5d6f8a;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.flow-title {
  margin: 0 0 8px 0;
  font-size: 1.06rem;
  font-weight: 700;
  color: #14385b;
}

.node-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-btn {
  padding: 8px 12px;
  background: linear-gradient(130deg, #0ea5e9, #2563eb);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: grab;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.24);
  user-select: none;
}

.palette-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.palette-btn:active:not(:disabled) {
  cursor: grabbing;
  transform: translateY(0);
}

.palette-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn {
  width: 100%;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #d4e1f4;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #f0f8ff;
  transform: translateY(-1px);
  box-shadow: 0 8px 14px rgba(30, 64, 175, 0.12);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flow-editor__canvas {
  flex: 1;
  position: relative;
  background: radial-gradient(circle at 18% 10%, #ffffff 0%, #f0f7ff 44%, #ecfeff 100%);
  transition: all 0.2s ease;
  overflow: hidden;
}

.flow-editor__canvas.is-drag-over {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 2px dashed var(--app-primary);
}

.flow-editor__canvas.is-drag-over::before {
  content: '拖拽节点到这里';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  background: var(--app-primary);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
  z-index: 100;
  animation: float 0.5s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-8px);
  }
}

.flow-editor__canvas :deep(.vue-flow) {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
}

.relation-legend {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 3;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(6px);
  border: 1px solid #d8e6f7;
  font-size: 11px;
  color: #334155;
  font-weight: 600;
}

.relation-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.chip.seq { background: #22c55e; }
.chip.parallel { background: #0ea5e9; }
.chip.child { background: #6366f1; }

.flow-editor__canvas :deep(.vue-flow__pane),
.flow-editor__canvas :deep(.vue-flow__node) {
  touch-action: none;
}

.flow-editor__canvas :deep(.vue-flow__background-pattern) {
  opacity: 0.35;
}

.flow-editor__canvas :deep(.vue-flow__edge-path) {
  stroke-width: 2.2px;
  stroke: #2563eb;
  filter: drop-shadow(0 0 4px rgba(37, 99, 235, 0.35));
}

.flow-editor__canvas :deep(.vue-flow__controls) {
  border: 1px solid #d5e4f7;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
}

.flow-editor__canvas :deep(.vue-flow__controls-button) {
  background: rgba(255, 255, 255, 0.96);
  border-color: #d9e7fb;
}

.flow-editor__properties,
.flow-editor__edge-properties {
  width: 300px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-left: 1px solid #dbe7f7;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  overflow-y: auto;
}

.properties-header {
  padding: 16px;
  border-bottom: 1px solid #dce8f8;
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
  border: 1px solid #d1dff3;
  border-radius: 10px;
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
