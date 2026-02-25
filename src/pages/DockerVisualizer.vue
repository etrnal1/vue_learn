<template>
  <div class="docker-page">
    <!-- Header -->
    <section class="hero">
      <div>
        <h1>🐳 Docker 可视化管理</h1>
        <p>实时监控容器状态、镜像、网络和卷</p>
      </div>
      <div class="hero-actions">
        <button @click="refreshStatus" class="action-btn" :disabled="isLoading">
          {{ isLoading ? '刷新中...' : '🔄 刷新' }}
        </button>
        <button @click="toggleAutoRefresh" class="action-btn" :class="{ active: autoRefresh }">
          {{ autoRefresh ? '⏸ 停止自动刷新' : '▶ 自动刷新' }}
        </button>
      </div>
    </section>

    <!-- Stats Overview -->
    <section class="stats-grid">
      <article class="stat-card">
        <div class="stat-icon">🐳</div>
        <div class="stat-content">
          <div class="stat-label">容器</div>
          <div class="stat-value">{{ dockerStats.containers }}</div>
          <div class="stat-detail">{{ dockerStats.runningContainers }} 运行 / {{ dockerStats.stoppedContainers }} 停止</div>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-label">镜像</div>
          <div class="stat-value">{{ dockerStats.images }}</div>
          <div class="stat-detail">{{ formatBytes(dockerStats.imageSize) }}</div>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-content">
          <div class="stat-label">网络</div>
          <div class="stat-value">{{ dockerStats.networks }}</div>
          <div class="stat-detail">连接 {{ dockerStats.connectedContainers }} 个容器</div>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-icon">💾</div>
        <div class="stat-content">
          <div class="stat-label">存储</div>
          <div class="stat-value">{{ formatBytes(dockerStats.volumeSize) }}</div>
          <div class="stat-detail">{{ dockerStats.volumes }} 个卷</div>
        </div>
      </article>
    </section>

    <!-- Tabs Navigation -->
    <section class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </section>

    <!-- Containers Panel -->
    <section v-if="activeTab === 'containers'" class="panel">
      <header class="panel-header">
        <h2>运行中的容器</h2>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索容器..."
          class="search-input"
        />
      </header>

      <div v-if="filteredContainers.length === 0" class="empty-state">
        <p>暂无容器</p>
      </div>

      <div v-else class="containers-list">
        <article
          v-for="container in filteredContainers"
          :key="container.id"
          class="container-card"
          :class="{ [container.state]: true }"
        >
          <div class="card-header">
            <div class="status-badge" :class="container.state" :title="container.state">
              {{ getStatusEmoji(container.state) }}
            </div>
            <div class="container-info">
              <h3>{{ container.name }}</h3>
              <code class="container-id">{{ container.id.substring(0, 12) }}</code>
            </div>
            <div class="card-actions">
              <button
                @click="enterContainer(container.id, container.fullId)"
                class="action-btn-small"
                title="进入容器"
                v-if="container.state === 'running'"
              >
                💻
              </button>
              <button
                @click="toggleContainer(container.id, container.state)"
                class="action-btn-small"
                :title="container.state === 'running' ? '停止' : '启动'"
              >
                {{ container.state === 'running' ? '⏹' : '▶' }}
              </button>
              <button @click="removeContainer(container.id)" class="action-btn-small danger" title="删除">
                🗑
              </button>
            </div>
          </div>

          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">镜像</span>
                <span class="value">{{ container.image }}</span>
              </div>
              <div class="info-item">
                <span class="label">状态</span>
                <span class="value">{{ container.status }}</span>
              </div>
              <div class="info-item">
                <span class="label">创建时间</span>
                <span class="value">{{ formatDate(container.created) }}</span>
              </div>
              <div class="info-item">
                <span class="label">启动时间</span>
                <span class="value">{{ formatDate(container.started) }}</span>
              </div>
            </div>

            <!-- Ports -->
            <div v-if="container.ports.length > 0" class="ports-section">
              <h4>端口映射</h4>
              <div class="ports-list">
                <span v-for="(port, idx) in container.ports" :key="idx" class="port-badge">
                  {{ port }}
                </span>
              </div>
            </div>

            <!-- Networks -->
            <div v-if="container.networks.length > 0" class="networks-section">
              <h4>网络连接</h4>
              <div class="networks-list">
                <span v-for="network in container.networks" :key="network" class="network-badge">
                  {{ network }}
                </span>
              </div>
            </div>

            <!-- Resources -->
            <div class="resources-section">
              <div class="resource-item">
                <span class="label">CPU 使用</span>
                <div class="meter">
                  <div class="meter-fill" :style="{ width: `${container.cpuPercent}%` }"></div>
                </div>
                <span class="value">{{ container.cpuPercent }}%</span>
              </div>
              <div class="resource-item">
                <span class="label">内存使用</span>
                <div class="meter">
                  <div class="meter-fill" :style="{ width: `${container.memoryPercent}%` }"></div>
                </div>
                <span class="value">{{ formatBytes(container.memoryUsage) }} / {{ formatBytes(container.memoryLimit) }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Images Panel -->
    <section v-if="activeTab === 'images'" class="panel">
      <header class="panel-header">
        <h2>Docker 镜像</h2>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索镜像..."
          class="search-input"
        />
      </header>

      <div v-if="filteredImages.length === 0" class="empty-state">
        <p>暂无镜像</p>
      </div>

      <div v-else class="images-list">
        <article v-for="image in filteredImages" :key="image.id" class="image-card">
          <div class="card-header">
            <div class="image-icon">📦</div>
            <div class="image-info">
              <h3>{{ image.repository }}</h3>
              <code class="image-tag">{{ image.tag }}</code>
            </div>
            <div class="card-actions">
              <button @click="removeImage(image.id)" class="action-btn-small danger" title="删除">
                🗑
              </button>
            </div>
          </div>

          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">ID</span>
                <code>{{ image.id.substring(0, 12) }}</code>
              </div>
              <div class="info-item">
                <span class="label">大小</span>
                <span>{{ formatBytes(image.size) }}</span>
              </div>
              <div class="info-item">
                <span class="label">创建时间</span>
                <span>{{ formatDate(image.created) }}</span>
              </div>
              <div class="info-item">
                <span class="label">使用者</span>
                <span>{{ image.containers }} 个容器</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Networks Panel -->
    <section v-if="activeTab === 'networks'" class="panel">
      <header class="panel-header">
        <h2>Docker 网络</h2>
        <div class="panel-actions">
          <button @click="createNetwork" class="action-btn-small">➕ 创建网络</button>
        </div>
      </header>

      <div v-if="networks.length === 0" class="empty-state">
        <p>暂无网络</p>
      </div>

      <div v-else class="networks-grid">
        <article v-for="network in networks" :key="network.id" class="network-card">
          <div class="network-header">
            <div class="network-icon">🌐</div>
            <h3>{{ network.name }}</h3>
            <button @click="removeNetwork(network.id)" class="action-btn-small danger" title="删除">
              🗑
            </button>
          </div>

          <div class="network-body">
            <div class="info-item">
              <span class="label">驱动</span>
              <span>{{ network.driver }}</span>
            </div>
            <div class="info-item">
              <span class="label">子网</span>
              <code>{{ network.subnet }}</code>
            </div>
            <div class="info-item">
              <span class="label">连接容器数</span>
              <span>{{ network.containers }}</span>
            </div>
          </div>

          <!-- Connected Containers -->
          <div v-if="network.connectedContainers.length > 0" class="connected-containers">
            <h4>连接的容器</h4>
            <div class="containers-list-inline">
              <span v-for="ctr in network.connectedContainers" :key="ctr" class="container-badge">
                {{ ctr }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Volumes Panel -->
    <section v-if="activeTab === 'volumes'" class="panel">
      <header class="panel-header">
        <h2>Docker 卷</h2>
        <div class="panel-actions">
          <button @click="createVolume" class="action-btn-small">➕ 创建卷</button>
        </div>
      </header>

      <div v-if="volumes.length === 0" class="empty-state">
        <p>暂无卷</p>
      </div>

      <div v-else class="volumes-list">
        <article v-for="volume in volumes" :key="volume.name" class="volume-card">
          <div class="card-header">
            <div class="volume-icon">💾</div>
            <div class="volume-info">
              <h3>{{ volume.name }}</h3>
              <code class="volume-driver">{{ volume.driver }}</code>
            </div>
            <div class="card-actions">
              <button @click="removeVolume(volume.name)" class="action-btn-small danger" title="删除">
                🗑
              </button>
            </div>
          </div>

          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">驱动</span>
                <span>{{ volume.driver }}</span>
              </div>
              <div class="info-item">
                <span class="label">挂载点</span>
                <code>{{ volume.mountpoint }}</code>
              </div>
              <div class="info-item">
                <span class="label">使用者</span>
                <span>{{ volume.containers }} 个容器</span>
              </div>
              <div class="info-item">
                <span class="label">创建时间</span>
                <span>{{ formatDate(volume.created) }}</span>
              </div>
            </div>

            <!-- Containers using this volume -->
            <div v-if="volume.connectedContainers.length > 0" class="connected-containers">
              <h4>使用此卷的容器</h4>
              <div class="containers-list-inline">
                <span v-for="ctr in volume.connectedContainers" :key="ctr" class="container-badge">
                  {{ ctr }}
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Docker Info Panel -->
    <section v-if="activeTab === 'info'" class="panel">
      <header class="panel-header">
        <h2>Docker 信息</h2>
      </header>

      <div class="info-sections">
        <div class="info-section">
          <h3>服务器信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Docker 版本</span>
              <span>{{ dockerInfo.version }}</span>
            </div>
            <div class="info-item">
              <span class="label">API 版本</span>
              <span>{{ dockerInfo.apiVersion }}</span>
            </div>
            <div class="info-item">
              <span class="label">操作系统</span>
              <span>{{ dockerInfo.os }}</span>
            </div>
            <div class="info-item">
              <span class="label">架构</span>
              <span>{{ dockerInfo.arch }}</span>
            </div>
            <div class="info-item">
              <span class="label">CPU 数</span>
              <span>{{ dockerInfo.cpus }}</span>
            </div>
            <div class="info-item">
              <span class="label">内存</span>
              <span>{{ formatBytes(dockerInfo.memTotal) }}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>存储驱动</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">驱动</span>
              <span>{{ dockerInfo.storageDriver }}</span>
            </div>
            <div class="info-item">
              <span class="label">镜像总数</span>
              <span>{{ dockerInfo.images }}</span>
            </div>
            <div class="info-item">
              <span class="label">容器总数</span>
              <span>{{ dockerInfo.containers }}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>日志驱动</h3>
          <div class="log-drivers">
            <span v-for="driver in dockerInfo.logDrivers" :key="driver" class="driver-badge">
              {{ driver }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'DockerVisualizer',
  data() {
    return {
      activeTab: 'containers',
      autoRefresh: false,
      isLoading: false,
      searchQuery: '',
      refreshTimer: null,

      dockerStats: {
        containers: 12,
        runningContainers: 8,
        stoppedContainers: 4,
        images: 24,
        imageSize: 12884901888, // 12GB
        networks: 5,
        connectedContainers: 15,
        volumes: 8,
        volumeSize: 5368709120 // 5GB
      },

      containers: [
        {
          id: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
          name: 'nginx-web',
          image: 'nginx:latest',
          state: 'running',
          status: '运行中',
          created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          started: new Date(Date.now() - 2 * 60 * 60 * 1000),
          ports: ['80:8080', '443:8443'],
          networks: ['bridge', 'docker-net'],
          cpuPercent: 12.5,
          memoryUsage: 268435456, // 256MB
          memoryLimit: 1073741824, // 1GB
        },
        {
          id: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7',
          name: 'postgres-db',
          image: 'postgres:13',
          state: 'running',
          status: '运行中',
          created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          started: new Date(Date.now() - 12 * 60 * 60 * 1000),
          ports: ['5432:5432'],
          networks: ['docker-net'],
          cpuPercent: 8.2,
          memoryUsage: 536870912, // 512MB
          memoryLimit: 2147483648, // 2GB
        },
        {
          id: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8',
          name: 'redis-cache',
          image: 'redis:7-alpine',
          state: 'running',
          status: '运行中',
          created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          started: new Date(Date.now() - 5 * 60 * 60 * 1000),
          ports: ['6379:6379'],
          networks: ['docker-net'],
          cpuPercent: 2.1,
          memoryUsage: 134217728, // 128MB
          memoryLimit: 536870912, // 512MB
        },
        {
          id: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9',
          name: 'old-service',
          image: 'myapp:v1.0',
          state: 'exited',
          status: '已停止',
          created: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          started: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          ports: ['3000:3000'],
          networks: [],
          cpuPercent: 0,
          memoryUsage: 0,
          memoryLimit: 1073741824,
        }
      ],

      images: [
        {
          id: 'sha256:1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
          repository: 'nginx',
          tag: 'latest',
          size: 268435456, // 256MB
          created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          containers: 1
        },
        {
          id: 'sha256:2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q',
          repository: 'postgres',
          tag: '13',
          size: 536870912, // 512MB
          created: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          containers: 1
        },
        {
          id: 'sha256:3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r',
          repository: 'redis',
          tag: '7-alpine',
          size: 67108864, // 64MB
          created: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          containers: 1
        },
        {
          id: 'sha256:4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s',
          repository: 'myapp',
          tag: 'v1.0',
          size: 1073741824, // 1GB
          created: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          containers: 0
        }
      ],

      networks: [
        {
          id: 'net-001',
          name: 'bridge',
          driver: 'bridge',
          subnet: '172.17.0.0/16',
          containers: 8,
          connectedContainers: ['nginx-web', 'postgres-db', 'redis-cache']
        },
        {
          id: 'net-002',
          name: 'docker-net',
          driver: 'bridge',
          subnet: '172.18.0.0/16',
          containers: 3,
          connectedContainers: ['nginx-web', 'postgres-db', 'redis-cache']
        },
        {
          id: 'net-003',
          name: 'host',
          driver: 'host',
          subnet: 'N/A',
          containers: 0,
          connectedContainers: []
        }
      ],

      volumes: [
        {
          name: 'postgres-data',
          driver: 'local',
          mountpoint: '/var/lib/docker/volumes/postgres-data/_data',
          containers: 1,
          created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          connectedContainers: ['postgres-db']
        },
        {
          name: 'redis-data',
          driver: 'local',
          mountpoint: '/var/lib/docker/volumes/redis-data/_data',
          containers: 1,
          created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          connectedContainers: ['redis-cache']
        },
        {
          name: 'app-logs',
          driver: 'local',
          mountpoint: '/var/lib/docker/volumes/app-logs/_data',
          containers: 2,
          created: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          connectedContainers: ['nginx-web', 'postgres-db']
        }
      ],

      dockerInfo: {
        version: '24.0.0',
        apiVersion: '1.43',
        os: 'linux',
        arch: 'x86_64',
        cpus: 8,
        memTotal: 17179869184, // 16GB
        storageDriver: 'overlay2',
        images: 24,
        containers: 12,
        logDrivers: ['json-file', 'local', 'splunk']
      },

      tabs: [
        { id: 'containers', label: '容器', icon: '🐳' },
        { id: 'images', label: '镜像', icon: '📦' },
        { id: 'networks', label: '网络', icon: '🌐' },
        { id: 'volumes', label: '卷', icon: '💾' },
        { id: 'info', label: '信息', icon: 'ℹ️' }
      ]
    }
  },

  computed: {
    filteredContainers() {
      return this.containers.map(c => ({
        ...c,
        memoryPercent: c.memoryLimit > 0 ? Math.round((c.memoryUsage / c.memoryLimit) * 100) : 0
      })).filter(c =>
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.image.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    },

    filteredImages() {
      return this.images.filter(img =>
        img.repository.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        img.tag.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    }
  },

  methods: {
    formatBytes(bytes) {
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      if (bytes === 0) return '0 B'
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
    },

    formatDate(date) {
      return new Date(date).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    getStatusEmoji(state) {
      const statusMap = {
        running: '🟢',
        exited: '⭕',
        paused: '⏸',
        restarting: '🔄'
      }
      return statusMap[state] || '❓'
    },

    async enterContainer(id, fullId) {
      try {
        const response = await fetch(`/api/docker/exec/${fullId}`)
        const result = await response.json()

        if (response.ok && result.status === 'ok') {
          const { quickCommand, shellOptions } = result.data
          const message = `✅ 进入容器命令:\n\n${quickCommand}\n\n在你的终端中执行此命令。\n\nShell 选项:\n${shellOptions.map(s => `• ${s.label}: ${s.command}`).join('\n')}`
          alert(message)
          console.log('Container exec command:', quickCommand)
        } else {
          alert(`❌ 错误: ${result.error}`)
        }
      } catch (error) {
        alert(`❌ 无法获取进入容器的命令: ${error.message}`)
        console.error('Error entering container:', error)
      }
    },

    async toggleContainer(id, state) {
      try {
        const fullId = this.containers.find(c => c.id.startsWith(id))?.fullId || id
        const action = state === 'running' ? 'stop' : 'start'
        const endpoint = `/api/docker/containers/${fullId}/${action}`

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeout: 10 })
        })

        if (response.ok) {
          // 立即刷新容器列表
          await this.fetchContainers()
          console.log(`Container ${fullId} ${action}ed successfully`)
        } else {
          const error = await response.json()
          alert(`❌ 无法${action === 'running' ? '停止' : '启动'}容器: ${error.error}`)
        }
      } catch (error) {
        alert(`❌ 操作失败: ${error.message}`)
        console.error('Error toggling container:', error)
      }
    },

    async removeContainer(id) {
      if (!confirm('确定要删除此容器吗？')) return

      try {
        const fullId = this.containers.find(c => c.id.startsWith(id))?.fullId || id

        const response = await fetch(`/api/docker/containers/${fullId}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true, removeVolumes: false })
        })

        if (response.ok) {
          // 从列表中移除
          this.containers = this.containers.filter(c => !c.id.startsWith(id))
          console.log(`Container ${fullId} removed successfully`)
        } else {
          const error = await response.json()
          alert(`❌ 无法删除容器: ${error.error}`)
        }
      } catch (error) {
        alert(`❌ 删除失败: ${error.message}`)
        console.error('Error removing container:', error)
      }
    },

    async removeImage(id) {
      if (!confirm('确定要删除此镜像吗？')) return

      try {
        const response = await fetch(`/api/docker/images/${id}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        })

        if (response.ok) {
          // 从列表中移除
          this.images = this.images.filter(img => img.id !== id)
          console.log(`Image ${id} removed successfully`)
        } else {
          const error = await response.json()
          alert(`❌ 无法删除镜像: ${error.error}`)
        }
      } catch (error) {
        alert(`❌ 删除失败: ${error.message}`)
        console.error('Error removing image:', error)
      }
    },

    removeNetwork(id) {
      if (confirm('确定要删除此网络吗？')) {
        this.networks = this.networks.filter(net => net.id !== id)
        console.log(`Removed network ${id}`)
      }
    },

    removeVolume(name) {
      if (confirm('确定要删除此卷吗？')) {
        this.volumes = this.volumes.filter(vol => vol.name !== name)
        console.log(`Removed volume ${name}`)
      }
    },

    createNetwork() {
      const name = prompt('输入网络名称:')
      if (name) {
        alert(`创建网络: ${name}`)
      }
    },

    createVolume() {
      const name = prompt('输入卷名称:')
      if (name) {
        alert(`创建卷: ${name}`)
      }
    },

    async fetchContainers() {
      try {
        const response = await fetch('/api/docker/containers')
        const result = await response.json()

        if (response.ok && result.status === 'ok') {
          this.containers = result.data.map(container => {
            const isRunning = container.State === 'running'
            return {
              id: container.ID.substring(0, 12),
              fullId: container.ID,
              name: container.Names[0]?.replace('/', '') || 'unknown',
              image: container.Image,
              state: isRunning ? 'running' : container.State || 'exited',
              status: container.Status || '未知',
              ports: container.Ports.split(',').filter(p => p.trim()).map(p => p.trim()),
              networks: Object.keys(container.NetworkSettings?.Networks || {}),
              cpuPercent: parseFloat(container.stats?.CPUPercent?.replace('%', '') || 0),
              memoryUsage: this.parseSize(container.stats?.MemUsage?.split(' ')[0] || '0'),
              memoryLimit: this.parseSize(container.stats?.MemLimit?.split(' ')[0] || '0'),
              created: new Date(container.Created || Date.now()),
              started: new Date(container.StartedAt || Date.now())
            }
          })
        }
      } catch (error) {
        console.error('Failed to fetch containers:', error)
      }
    },

    async fetchImages() {
      try {
        const response = await fetch('/api/docker/images')
        const result = await response.json()

        if (response.ok && result.status === 'ok') {
          this.images = result.data.map(image => ({
            id: image.ID || image.id,
            repository: image.Repository || 'unknown',
            tag: image.Tag || 'latest',
            size: this.parseSize(image.Size?.toString() || '0'),
            created: new Date(image.Created || Date.now()),
            containers: parseInt(image.Containers) || 0
          }))
        }
      } catch (error) {
        console.error('Failed to fetch images:', error)
      }
    },

    async fetchNetworks() {
      try {
        const response = await fetch('/api/docker/networks')
        const result = await response.json()

        if (response.ok && result.status === 'ok') {
          this.networks = result.data.map(network => ({
            id: network.ID,
            name: network.Name,
            driver: network.Driver,
            subnet: network.IPAM?.Config?.[0]?.Subnet || 'N/A',
            containers: Object.keys(network.Containers || {}).length,
            connectedContainers: Object.keys(network.Containers || {})
          }))
        }
      } catch (error) {
        console.error('Failed to fetch networks:', error)
      }
    },

    async fetchVolumes() {
      try {
        const response = await fetch('/api/docker/volumes')
        const result = await response.json()

        if (response.ok && result.status === 'ok') {
          this.volumes = result.data.map(volume => ({
            name: volume.Name,
            driver: volume.Driver,
            mountpoint: volume.Mountpoint,
            containers: 0,
            created: new Date(),
            connectedContainers: []
          }))
        }
      } catch (error) {
        console.error('Failed to fetch volumes:', error)
      }
    },

    parseSize(sizeStr) {
      // 解析 Docker 的大小格式如 "256MB", "1.5GB"
      if (!sizeStr) return 0
      const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
      const match = sizeStr.match(/^([\d.]+)([A-Z]+)$/)
      if (!match) return 0
      return Math.round(parseFloat(match[1]) * (units[match[2]] || 1))
    },

    async refreshStatus() {
      this.isLoading = true
      try {
        await Promise.all([
          this.fetchContainers(),
          this.fetchImages(),
          this.fetchNetworks(),
          this.fetchVolumes()
        ])
        console.log('Status refreshed')
      } catch (error) {
        console.error('Error refreshing status:', error)
      } finally {
        this.isLoading = false
      }
    },

    toggleAutoRefresh() {
      this.autoRefresh = !this.autoRefresh
      if (this.autoRefresh) {
        this.refreshTimer = setInterval(() => {
          this.refreshStatus()
        }, 5000)
      } else if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
      }
    }
  },

  mounted() {
    // 初始化加载数据
    this.refreshStatus()
  },

  beforeUnmount() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
  }
}
</script>

<style scoped>
.docker-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Hero Section */
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 24px;
  background: var(--app-card);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  box-shadow: var(--app-soft-shadow);
}

.hero h1 {
  font-size: 1.8em;
  margin-bottom: 8px;
  color: var(--app-text);
}

.hero p {
  font-size: 0.95em;
  color: var(--app-text-muted);
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 10px 16px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px var(--app-shadow);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--app-shadow);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.active {
  background: var(--app-primary-dark);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-soft-shadow);
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: var(--app-primary);
  box-shadow: 0 4px 16px var(--app-shadow-light);
}

.stat-icon {
  font-size: 2.5em;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.85em;
  color: var(--app-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.8em;
  font-weight: 700;
  color: var(--app-primary);
  margin-top: 4px;
}

.stat-detail {
  font-size: 0.8em;
  color: var(--app-text-secondary);
  margin-top: 4px;
}

/* Tabs Bar */
.tabs-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 12px;
  background: var(--app-group-bg);
  border-radius: 12px;
  border: 1px solid var(--app-border);
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.tab-btn.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 4px 12px var(--app-shadow);
}

/* Panel */
.panel {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: var(--app-soft-shadow);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.4em;
  color: var(--app-text);
}

.search-input {
  flex: 0 1 300px;
  padding: 8px 14px;
  background: var(--app-card);
  color: var(--app-text);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  font-size: 0.9em;
}

.search-input::placeholder {
  color: var(--app-text-muted);
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn-small {
  padding: 6px 12px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-btn-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--app-shadow-light);
}

.action-btn-small.danger {
  background: #ef4444;
}

.action-btn-small.danger:hover {
  background: #dc2626;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--app-text-muted);
}

/* Containers List */
.containers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.container-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--app-card-elevated);
  transition: all 0.2s ease;
}

.container-card.running {
  border-left: 4px solid #10b981;
}

.container-card.exited {
  border-left: 4px solid #6b7280;
  opacity: 0.8;
}

.container-card:hover {
  box-shadow: 0 4px 12px var(--app-shadow-light);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-card);
}

.status-badge {
  font-size: 1.5em;
  flex-shrink: 0;
}

.status-badge.running::after {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  margin-left: 4px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.container-info {
  flex: 1;
}

.container-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1em;
  color: var(--app-text);
}

.container-id {
  font-family: monospace;
  font-size: 0.8em;
  color: var(--app-text-muted);
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* Card Body */
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 0.8em;
  color: var(--app-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-item .value,
.info-item code {
  font-size: 0.95em;
  color: var(--app-text);
  word-break: break-all;
}

/* Ports & Networks */
.ports-section,
.networks-section,
.resources-section,
.connected-containers {
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}

.ports-section h4,
.networks-section h4,
.resources-section h4,
.connected-containers h4 {
  margin: 0 0 8px 0;
  font-size: 0.9em;
  color: var(--app-text-secondary);
  font-weight: 600;
}

.ports-list,
.networks-list,
.containers-list-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.port-badge,
.network-badge,
.container-badge,
.driver-badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
}

.network-badge {
  background: var(--app-primary);
}

.container-badge {
  background: var(--app-shadow-light);
  color: var(--app-primary);
}

/* Resources Section */
.resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.resource-item .label {
  font-size: 0.85em;
  color: var(--app-text-secondary);
  font-weight: 600;
  min-width: 80px;
}

.meter {
  flex: 1;
  height: 6px;
  background: var(--app-group-bg);
  border-radius: 3px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--app-primary), var(--app-primary-dark));
  transition: width 0.3s ease;
}

.resource-item .value {
  font-size: 0.85em;
  color: var(--app-text-secondary);
  min-width: 120px;
}

/* Images List */
.images-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.image-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--app-card-elevated);
}

.image-icon {
  font-size: 1.5em;
  flex-shrink: 0;
}

.image-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1em;
  color: var(--app-text);
}

.image-tag {
  font-family: monospace;
  font-size: 0.8em;
  color: var(--app-text-muted);
  background: var(--app-group-bg);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Networks Grid */
.networks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
}

.network-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 16px;
  background: var(--app-card-elevated);
}

.network-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.network-icon {
  font-size: 1.8em;
}

.network-header h3 {
  margin: 0;
  flex: 1;
  font-size: 1.1em;
}

.network-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}

/* Volumes List */
.volumes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.volume-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--app-card-elevated);
}

.volume-icon {
  font-size: 1.5em;
}

.volume-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1em;
}

.volume-driver {
  font-family: monospace;
  font-size: 0.8em;
  color: var(--app-text-muted);
}

/* Info Sections */
.info-sections {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--app-border);
}

.info-section:last-child {
  border-bottom: none;
}

.info-section h3 {
  margin: 0 0 16px 0;
  font-size: 1.1em;
  color: var(--app-text);
}

/* Responsive */
@media (max-width: 768px) {
  .docker-page {
    padding: 12px;
  }

  .hero {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .tabs-bar {
    gap: 6px;
  }

  .tab-btn {
    padding: 6px 12px;
    font-size: 0.85em;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .panel-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .search-input {
    width: 100%;
    flex: 1;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions {
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .docker-page {
    padding: 8px;
  }

  .hero h1 {
    font-size: 1.4em;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-icon {
    font-size: 2em;
  }

  .tabs-bar {
    gap: 4px;
  }

  .tab-btn {
    padding: 5px 10px;
    font-size: 0.8em;
  }

  .containers-list,
  .images-list,
  .volumes-list,
  .networks-grid {
    padding: 12px;
    gap: 12px;
  }
}
</style>
