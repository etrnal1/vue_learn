<template>
  <div class="user-switcher">
    <span class="switcher-label">当前用户:</span>
    <div class="user-dropdown" @click="open = !open" ref="dropdown">
      <span class="current-user">
        {{ currentUser.avatar }} {{ currentUser.name }}
        <span class="role-tag">{{ roleLabel }}</span>
      </span>
      <span class="arrow">{{ open ? '▲' : '▼' }}</span>
    </div>
    <div v-if="open" class="dropdown-menu">
      <div
        v-for="user in users"
        :key="user.id"
        class="dropdown-item"
        :class="{ active: user.id === currentUser.id }"
        @click="selectUser(user)"
      >
        {{ user.avatar }} {{ user.name }}
        <span class="role-tag small">{{ getRoleLabel(user.role) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
const ROLE_LABELS = { admin: '管理员', member: '成员', approver: '审批人' }

export default {
  name: 'UserSwitcher',
  props: {
    currentUser: { type: Object, required: true },
    users: { type: Array, required: true }
  },
  emits: ['switch-user'],
  data() {
    return { open: false }
  },
  computed: {
    roleLabel() {
      return ROLE_LABELS[this.currentUser.role] || this.currentUser.role
    }
  },
  methods: {
    selectUser(user) {
      this.$emit('switch-user', user)
      this.open = false
    },
    getRoleLabel(role) {
      return ROLE_LABELS[role] || role
    },
    handleClickOutside(e) {
      if (this.$refs.dropdown && !this.$el.contains(e.target)) {
        this.open = false
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.user-switcher {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.switcher-label {
  font-size: 0.9em;
  color: #666;
  font-weight: 600;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

@media (max-width: 1024px) {
  .user-switcher {
    gap: 8px;
  }

  .switcher-label {
    font-size: 0.85em;
  }

  .user-dropdown {
    padding: 6px 12px;
    font-size: 0.9em;
  }
}

@media (max-width: 768px) {
  .user-switcher {
    width: 100%;
    gap: 8px;
  }

  .switcher-label {
    font-size: 0.8em;
  }

  .user-dropdown {
    flex: 1;
    padding: 6px 10px;
    font-size: 0.85em;
  }

  .current-user {
    font-size: 0.85em;
  }

  .role-tag {
    font-size: 0.65em;
    padding: 1px 6px;
    margin-left: 4px;
  }
}

@media (max-width: 480px) {
  .switcher-label {
    display: none;
  }

  .user-dropdown {
    width: 100%;
    padding: 6px 8px;
    font-size: 0.75em;
  }
}

.user-dropdown:hover {
  border-color: #3b82f6;
}

.current-user {
  font-weight: 600;
  color: #333;
}

.arrow {
  font-size: 0.7em;
  color: #999;
}

.role-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 10px;
  font-size: 0.75em;
  font-weight: 600;
  margin-left: 6px;
}

.role-tag.small {
  font-size: 0.7em;
  padding: 1px 6px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 200px;
  animation: fadeDown 0.2s ease;
}

@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
  color: #333;
  transition: background 0.2s;
}

.dropdown-item:first-child { border-radius: 6px 6px 0 0; }
.dropdown-item:last-child { border-radius: 0 0 6px 6px; }

.dropdown-item:hover {
  background: #eff6ff;
}

.dropdown-item.active {
  background: #3b82f6;
  color: white;
}

.dropdown-item.active .role-tag {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
</style>
