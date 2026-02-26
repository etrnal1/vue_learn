<template>
  <div class="db-console">
    <div class="db-layout">
      <aside class="db-sidebar">
        <div class="sidebar-head">
          <h2>数据库</h2>
          <button class="btn" @click="loadDatabases" :disabled="busyList">
            {{ busyList ? '刷新中...' : '刷新' }}
          </button>
        </div>
        <div v-if="databases.length === 0" class="empty">
          暂无数据库
        </div>
        <button
          v-for="name in databases"
          :key="name"
          class="db-item"
          :class="{ active: selectedDatabase === name }"
          @click="selectedDatabase = name"
        >
          {{ name }}
        </button>
      </aside>

      <section class="db-main">
        <div class="editor-head">
          <div class="selection">
            当前库：<strong>{{ selectedDatabase || '未选择' }}</strong>
          </div>
          <button class="btn btn-primary" @click="executeSql" :disabled="busyExec || !selectedDatabase">
            {{ busyExec ? '执行中...' : '执行 SQL' }}
          </button>
        </div>
        <textarea
          v-model="sql"
          class="sql-input"
          placeholder="请输入 SQL，例如：SELECT * FROM users LIMIT 20"
        />
        <div v-if="errorText" class="error">{{ errorText }}</div>

        <div v-if="result" class="result">
          <div class="result-head">
            <span>耗时 {{ result.durationMs }}ms</span>
            <span v-if="result.type === 'query'">返回 {{ result.rowCount }} 行</span>
            <span v-else>影响 {{ result.affectedRows || 0 }} 行</span>
          </div>

          <div v-if="result.type === 'query'" class="table-wrap">
            <table class="result-table">
              <thead>
                <tr>
                  <th v-for="col in result.columns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in result.rows" :key="idx">
                  <td v-for="col in result.columns" :key="col">{{ formatCell(row[col]) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="result.truncated" class="hint">结果已截断，仅显示前 500 行。</div>
          </div>

          <div v-else class="mutation-result">
            <div>affectedRows: {{ result.affectedRows || 0 }}</div>
            <div>changedRows: {{ result.changedRows || 0 }}</div>
            <div>insertId: {{ result.insertId ?? '-' }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { api } from '../utils/api'

export default {
  name: 'DatabaseConsole',
  data() {
    return {
      databases: [],
      selectedDatabase: '',
      sql: 'SELECT NOW() AS current_time;',
      busyList: false,
      busyExec: false,
      errorText: '',
      result: null
    }
  },
  methods: {
    formatCell(value) {
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    },
    async loadDatabases() {
      this.busyList = true
      this.errorText = ''
      try {
        const res = await api.database.listDatabases()
        this.databases = Array.isArray(res?.databases) ? res.databases : []
        if (!this.selectedDatabase && this.databases.length > 0) {
          this.selectedDatabase = this.databases[0]
        }
        if (res?.fallback) {
          this.errorText = res?.warning || '数据库列表已回退到当前连接库'
        }
      } catch (error) {
        if (Number(error?.status || 0) === 401) {
          this.errorText = '未登录，无法加载数据库列表'
        } else if (Number(error?.status || 0) === 403) {
          this.errorText = '当前账号没有数据库模块权限，请联系管理员分配角色'
        } else {
          this.errorText = error?.message || '加载数据库列表失败'
        }
      } finally {
        this.busyList = false
      }
    },
    async executeSql() {
      if (!this.selectedDatabase) {
        this.errorText = '请先选择数据库'
        return
      }
      if (!this.sql.trim()) {
        this.errorText = 'SQL 不能为空'
        return
      }

      this.busyExec = true
      this.errorText = ''
      try {
        const res = await api.database.execute({
          database: this.selectedDatabase,
          sql: this.sql
        })
        this.result = res
      } catch (error) {
        this.result = null
        if (Number(error?.status || 0) === 401) {
          this.errorText = '未登录，无法执行 SQL'
        } else if (Number(error?.status || 0) === 403) {
          this.errorText = '当前账号没有数据库执行权限'
        } else {
          this.errorText = error?.message || '执行失败'
        }
      } finally {
        this.busyExec = false
      }
    }
  },
  mounted() {
    this.loadDatabases()
  }
}
</script>

<style scoped>
.db-console { display: flex; flex-direction: column; gap: 12px; }
.db-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 12px;
  min-height: 70vh;
}
.db-sidebar {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 10px;
  background: var(--app-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 80vh;
  overflow: auto;
}
.sidebar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.sidebar-head h2 { margin: 0; font-size: 1em; }
.db-item {
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 7px 9px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  cursor: pointer;
}
.db-item.active {
  border-color: transparent;
  background: var(--app-primary);
  color: var(--app-on-primary);
}
.db-main {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 10px;
  background: var(--app-card);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.editor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.selection { color: var(--app-text-secondary); font-size: 0.9em; }
.sql-input {
  width: 100%;
  min-height: 180px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: #0f172a;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
.result {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  overflow: hidden;
}
.result-head {
  display: flex;
  gap: 14px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  font-size: 0.85em;
}
.table-wrap { overflow: auto; max-height: 42vh; }
.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.result-table th, .result-table td {
  border-bottom: 1px solid var(--app-border);
  padding: 7px 8px;
  text-align: left;
  white-space: nowrap;
}
.result-table th {
  position: sticky;
  top: 0;
  background: var(--app-card);
  z-index: 1;
}
.mutation-result {
  display: flex;
  gap: 14px;
  padding: 10px;
  font-size: 0.9em;
}
.btn {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.btn-primary {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #b91c1c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 8px 10px;
}
.empty { color: var(--app-text-muted); font-size: 0.88em; }
.hint {
  padding: 6px 10px;
  font-size: 0.8em;
  color: var(--app-text-muted);
}
@media (max-width: 980px) {
  .db-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .db-sidebar {
    max-height: 28vh;
  }
}
</style>
