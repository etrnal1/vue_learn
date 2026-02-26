<template>
  <div class="workflow-panel">
    <h2>流程追踪</h2>
    <p>汇总运行中的流程，跟踪当前节点与执行状态。</p>
    <div class="workflow-placeholder">TODO: 接入日志/追踪数据</div>
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
