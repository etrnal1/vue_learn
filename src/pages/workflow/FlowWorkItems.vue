<template>
  <div class="flow-work-items">
    <h2>流程工作项</h2>
    <p>管理流程中的工作项和待办事项</p>
    <div class="placeholder">✅ 流程工作项管理模块</div>
  </div>
</template>

<script>
export default { name: 'FlowWorkItems' }
</script>

<style scoped>
.flow-work-items {
  padding: 16px;
  background: var(--app-card);
  border-radius: 12px;
  border: 1px solid var(--app-border);
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: var(--app-text-muted);
  font-size: 1.2em;
}
</style>
