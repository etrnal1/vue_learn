<template>
  <div class="workflow-panel">
    <h2>流程任务</h2>
    <p>管理所有待办任务、执行策略和任务优先级。</p>
    <div class="workflow-placeholder">TODO: 展示任务队列与执行历史</div>
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
