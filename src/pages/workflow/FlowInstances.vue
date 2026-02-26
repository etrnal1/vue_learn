<template>
  <div class="flow-instances">
    <h2>流程实例管理</h2>
    <p>查看和管理流程的所有实例及其状态</p>
    <div class="placeholder">📋 流程实例管理模块</div>
  </div>
</template>

<script>
export default { name: 'FlowInstances' }
</script>

<style scoped>
.flow-instances {
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
