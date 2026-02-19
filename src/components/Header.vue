<template>
  <div class="header">
    <h1>✨ Vue 3 学习参考中心</h1>
    <p>全功能学习平台 - Spring、Excel、最佳实践</p>
   
  </div>
</template>

<script>
export default {
  name: 'Header'
}
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 40px;
  border-radius: 15px;
  margin-bottom: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.header h1 {
  font-size: 3em;
  margin-bottom: 15px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.header p {
  font-size: 1.3em;
  opacity: 0.95;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2em;
  }

  .header p {
    font-size: 1em;
  }

  .header {
    padding: 40px 20px;
  }
}
</style>
