<template>
  <div class="workflow-panel">
    <h2>流程实例管理</h2>
    <p>展示已启动的流程实例、节点状态以及运行时参数。</p>
    <div class="workflow-placeholder">TODO: 实例列表 + 状态刷新</div>
  </div>
</template>

<style scoped>
.workflow-panel {
  padding: 18px;
  border-radius: 16px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}
.workflow-placeholder {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed var(--app-border);
  color: var(--app-text-muted);
  font-size: 0.9em;
}
</style>
