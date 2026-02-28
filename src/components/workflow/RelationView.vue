<template>
  <div class="relation-view">
    <div class="section">
      <h4>顺序主线</h4>
      <div v-if="sequentialSteps.length === 0" class="empty">暂无顺序节点</div>
      <div v-else class="chain">
        <div v-for="(step, index) in sequentialSteps" :key="step.id || index" class="chain-item">
          <span class="idx">{{ index + 1 }}</span>
          <span class="name">{{ step.name || `步骤 ${index + 1}` }}</span>
          <span v-if="index < sequentialSteps.length - 1" class="arrow">→</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h4>平级关系</h4>
      <div v-if="parallelSteps.length === 0" class="empty">暂无平级节点</div>
      <div v-else class="list">
        <div v-for="step in parallelSteps" :key="step.id" class="item parallel">
          <strong>{{ step.name || '未命名步骤' }}</strong>
          <span class="meta">平级（与主线同级）</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h4>子集关系</h4>
      <div v-if="childGroups.length === 0" class="empty">暂无子集节点</div>
      <div v-else class="tree">
        <div v-for="group in childGroups" :key="group.parentId || group.parentName" class="tree-group">
          <div class="parent">{{ group.parentName }}</div>
          <div class="children">
            <div v-for="child in group.children" :key="child.id" class="child">↳ {{ child.name || '未命名步骤' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RelationView',
  props: {
    steps: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    normalizedSteps() {
      return (this.steps || []).map((step) => ({
        ...step,
        relationType: step.relationType || step.relation_type || 'sequential',
        parentStepId: step.parentStepId || step.parent_step_id || null
      }))
    },
    sequentialSteps() {
      return this.normalizedSteps.filter((step) => step.relationType === 'sequential')
    },
    parallelSteps() {
      return this.normalizedSteps.filter((step) => step.relationType === 'parallel')
    },
    childGroups() {
      const byId = new Map(this.normalizedSteps.map((step) => [String(step.id), step]))
      const groups = new Map()
      for (const step of this.normalizedSteps) {
        if (step.relationType !== 'child' || !step.parentStepId) continue
        const parentKey = String(step.parentStepId)
        if (!groups.has(parentKey)) {
          const parent = byId.get(parentKey)
          groups.set(parentKey, {
            parentId: parentKey,
            parentName: parent?.name || `父节点 ${parentKey}`,
            children: []
          })
        }
        groups.get(parentKey).children.push(step)
      }
      return Array.from(groups.values())
    }
  }
}
</script>

<style scoped>
.relation-view {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.section {
  border: 1px solid #d7e4f6;
  border-radius: 12px;
  background: linear-gradient(170deg, #fff, #f5faff);
  padding: 12px;
}

.section h4 {
  margin: 0 0 10px;
  font-size: 0.95rem;
}

.empty {
  color: #64748b;
  font-size: 0.85rem;
}

.chain {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chain-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #dcfce7;
}

.idx {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.name {
  font-size: 0.82rem;
  font-weight: 600;
}

.arrow {
  color: #166534;
}

.list,
.tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item.parallel {
  padding: 8px 10px;
  border-radius: 8px;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
}

.meta {
  display: block;
  font-size: 0.75rem;
  color: #0c4a6e;
  margin-top: 2px;
}

.tree-group {
  padding: 8px 10px;
  border-radius: 8px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
}

.parent {
  font-weight: 700;
  color: #3730a3;
}

.children {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.child {
  font-size: 0.82rem;
  color: #4338ca;
}

@media (max-width: 768px) {
  .relation-view {
    grid-template-columns: 1fr;
  }
}
</style>
