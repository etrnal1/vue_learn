<template>
  <div class="workflow-panel">
    <h2>流程工作项管理</h2>
    <p>分发工作项、追踪处理人并监控超时。</p>
    <div class="workflow-placeholder">TODO: 筛选、分配与交接</div>
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
