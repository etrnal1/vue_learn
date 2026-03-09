const MENU_KEY = 'admin_menus_v1'
const ROLE_KEY = 'admin_roles_v1'
const DEPT_KEY = 'admin_departments_v1'
const SIDEBAR_NAV_KEY = 'admin_sidebar_nav_v1'
const SIDEBAR_NAV_EVENT = 'admin-sidebar-nav-updated'
const APP_UI_SETTINGS_KEY = 'admin_app_ui_settings_v1'
const APP_UI_SETTINGS_EVENT = 'admin-app-ui-settings-updated'

const defaultMenus = [
  {
    id: 'menu-system',
    parentId: null,
    name: '系统管理',
    path: '/system',
    component: 'Layout',
    icon: 'Settings',
    order: 1,
    status: 'enabled'
  },
  {
    id: 'menu-system-menu',
    parentId: 'menu-system',
    name: '菜单管理',
    path: '/system/menu',
    component: 'MenuManagement',
    icon: 'Menu',
    order: 1,
    status: 'enabled'
  },
  {
    id: 'menu-system-role',
    parentId: 'menu-system',
    name: '角色管理',
    path: '/system/role',
    component: 'RoleManagement',
    icon: 'UserFilled',
    order: 2,
    status: 'enabled'
  },
  {
    id: 'menu-system-dept',
    parentId: 'menu-system',
    name: '部门管理',
    path: '/system/dept',
    component: 'DeptManagement',
    icon: 'OfficeBuilding',
    order: 3,
    status: 'enabled'
  }
]

const defaultRoles = [
  {
    id: 'role-admin',
    code: 'admin',
    name: '系统管理员',
    dataScope: 'all',
    status: 'enabled',
    menuIds: ['menu-system', 'menu-system-menu', 'menu-system-role', 'menu-system-dept'],
    remark: '拥有系统所有菜单权限'
  },
  {
    id: 'role-operator',
    code: 'operator',
    name: '运维人员',
    dataScope: 'dept_and_children',
    status: 'enabled',
    menuIds: ['menu-system', 'menu-system-menu', 'menu-system-dept'],
    remark: '负责基础配置维护'
  },
  {
    id: 'role-viewer',
    code: 'viewer',
    name: '只读访客',
    dataScope: 'self',
    status: 'disabled',
    menuIds: ['menu-system'],
    remark: '默认仅保留一级菜单'
  }
]

const defaultDepartments = [
  {
    id: 'dept-headquarter',
    parentId: null,
    name: '总部',
    leader: '张三',
    phone: '13800000001',
    order: 1,
    status: 'enabled'
  },
  {
    id: 'dept-tech',
    parentId: 'dept-headquarter',
    name: '技术部',
    leader: '李四',
    phone: '13800000002',
    order: 1,
    status: 'enabled'
  },
  {
    id: 'dept-ops',
    parentId: 'dept-headquarter',
    name: '运维部',
    leader: '王五',
    phone: '13800000003',
    order: 2,
    status: 'enabled'
  }
]

const defaultSidebarNav = [
  { id: 'home', groupKey: 'workbench', groupTitle: '工作台', groupIcon: '🏠', groupOrder: 1, tabOrder: 1 },
  { id: 'launchOps', groupKey: 'workbench', groupTitle: '工作台', groupIcon: '🏠', groupOrder: 1, tabOrder: 2 },
  { id: 'spring', groupKey: 'learning', groupTitle: '学习与文档', groupIcon: '📚', groupOrder: 2, tabOrder: 1 },
  { id: 'excel', groupKey: 'learning', groupTitle: '学习与文档', groupIcon: '📚', groupOrder: 2, tabOrder: 2 },
  { id: 'wiki', groupKey: 'learning', groupTitle: '学习与文档', groupIcon: '📚', groupOrder: 2, tabOrder: 3 },
  { id: 'docs', groupKey: 'learning', groupTitle: '学习与文档', groupIcon: '📚', groupOrder: 2, tabOrder: 4 },
  { id: 'itsm', groupKey: 'business', groupTitle: '业务系统', groupIcon: '🧩', groupOrder: 3, tabOrder: 1 },
  { id: 'scheduler', groupKey: 'business', groupTitle: '业务系统', groupIcon: '🧩', groupOrder: 3, tabOrder: 2 },
  { id: 'monitor', groupKey: 'business', groupTitle: '业务系统', groupIcon: '🧩', groupOrder: 3, tabOrder: 3 },
  { id: 'macMiniPower', groupKey: 'business', groupTitle: '业务系统', groupIcon: '🧩', groupOrder: 3, tabOrder: 4 },
  { id: 'powerMetricsCompare', groupKey: 'business', groupTitle: '业务系统', groupIcon: '🧩', groupOrder: 3, tabOrder: 5 },
  { id: 'chat', groupKey: 'content', groupTitle: '内容管理', groupIcon: '🗂️', groupOrder: 4, tabOrder: 1 },
  { id: 'video', groupKey: 'content', groupTitle: '内容管理', groupIcon: '🗂️', groupOrder: 4, tabOrder: 2 },
  { id: 'music', groupKey: 'content', groupTitle: '内容管理', groupIcon: '🗂️', groupOrder: 4, tabOrder: 3 },
  { id: 'album', groupKey: 'content', groupTitle: '内容管理', groupIcon: '🗂️', groupOrder: 4, tabOrder: 4 },
  { id: 'weibo', groupKey: 'content', groupTitle: '内容管理', groupIcon: '🗂️', groupOrder: 4, tabOrder: 5 },
  { id: 'git', groupKey: 'devops', groupTitle: '开发与运维', groupIcon: '🛠️', groupOrder: 5, tabOrder: 1 },
  { id: 'ffmpeg', groupKey: 'devops', groupTitle: '开发与运维', groupIcon: '🛠️', groupOrder: 5, tabOrder: 2 },
  { id: 'docker', groupKey: 'devops', groupTitle: '开发与运维', groupIcon: '🛠️', groupOrder: 5, tabOrder: 3 },
  { id: 'terminal', groupKey: 'devops', groupTitle: '开发与运维', groupIcon: '🛠️', groupOrder: 5, tabOrder: 4 },
  { id: 'database', groupKey: 'devops', groupTitle: '开发与运维', groupIcon: '🛠️', groupOrder: 5, tabOrder: 5 },
  { id: 'userAdmin', groupKey: 'iam', groupTitle: '用户与权限', groupIcon: '🔐', groupOrder: 6, tabOrder: 1 },
  { id: 'menuManagement', groupKey: 'iam', groupTitle: '用户与权限', groupIcon: '🔐', groupOrder: 6, tabOrder: 2 },
  { id: 'roleManagement', groupKey: 'iam', groupTitle: '用户与权限', groupIcon: '🔐', groupOrder: 6, tabOrder: 3 },
  { id: 'departmentManagement', groupKey: 'iam', groupTitle: '用户与权限', groupIcon: '🔐', groupOrder: 6, tabOrder: 4 },
  { id: 'logs', groupKey: 'audit', groupTitle: '日志审计', groupIcon: '📊', groupOrder: 7, tabOrder: 1 },
  { id: 'authLogs', groupKey: 'audit', groupTitle: '日志审计', groupIcon: '📊', groupOrder: 7, tabOrder: 2 },
  { id: 'runtimeLogs', groupKey: 'audit', groupTitle: '日志审计', groupIcon: '📊', groupOrder: 7, tabOrder: 3 },
  { id: 'flowTracking', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 1 },
  { id: 'flowDiagram', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 2 },
  { id: 'flowPreview', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 3 },
  { id: 'flowPreviewConsole', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 4 },
  { id: 'flowAgentRunner', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 5 },
  { id: 'tradeFlowExplorer', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 6 },
  { id: 'flowTasks', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 7 },
  { id: 'flowFiles', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 8 },
  { id: 'flowInstances', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 9 },
  { id: 'flowWorkItems', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 10 },
  { id: 'flowManagement', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 11 },
  { id: 'flowAutomation', groupKey: 'workflow', groupTitle: '工作流管理', groupIcon: '🔄', groupOrder: 8, tabOrder: 12 }
]

function safeParse(value, fallback) {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (error) {
    return fallback
  }
}

function readList(key, fallback) {
  if (typeof window === 'undefined') return structuredClone(fallback)
  return safeParse(window.localStorage.getItem(key), structuredClone(fallback))
}

function writeList(key, list) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []))
}

export function getMenus() {
  return readList(MENU_KEY, defaultMenus)
}

export function saveMenus(list) {
  writeList(MENU_KEY, list)
}

export function getRoles() {
  return readList(ROLE_KEY, defaultRoles)
}

export function saveRoles(list) {
  writeList(ROLE_KEY, list)
}

export function getDepartments() {
  return readList(DEPT_KEY, defaultDepartments)
}

export function saveDepartments(list) {
  writeList(DEPT_KEY, list)
}

export function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function normalizeSidebarItem(item) {
  const id = String(item?.id || '').trim()
  if (!id) return null
  return {
    id,
    groupKey: String(item?.groupKey || 'other').trim() || 'other',
    groupTitle: String(item?.groupTitle || '未分组').trim() || '未分组',
    groupIcon: String(item?.groupIcon || '📁').trim() || '📁',
    groupOrder: Number(item?.groupOrder || 99),
    tabOrder: Number(item?.tabOrder || 99)
  }
}

function normalizeSidebarList(list) {
  const source = Array.isArray(list) ? list : []
  const normalized = source
    .map((item) => normalizeSidebarItem(item))
    .filter((item, index, arr) => item && arr.findIndex((entry) => entry.id === item.id) === index)
  const base = normalized.length > 0 ? normalized : []
  const existingIds = new Set(base.map((item) => item.id))
  const missingDefaults = defaultSidebarNav
    .map((item) => normalizeSidebarItem(item))
    .filter((item) => item && !existingIds.has(item.id))
  const merged = [...base, ...missingDefaults]
  return merged.length > 0 ? merged : structuredClone(defaultSidebarNav)
}

export function getSidebarNavConfig() {
  const list = readList(SIDEBAR_NAV_KEY, defaultSidebarNav)
  return normalizeSidebarList(list)
}

export function saveSidebarNavConfig(list) {
  const normalized = normalizeSidebarList(list)
  writeList(SIDEBAR_NAV_KEY, normalized)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SIDEBAR_NAV_EVENT, { detail: normalized }))
  }
}

export function getSidebarNavEventName() {
  return SIDEBAR_NAV_EVENT
}

const defaultAppUiSettings = {
  performanceOverlayEnabled: false
}

function normalizeAppUiSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {}
  return {
    performanceOverlayEnabled: Boolean(source.performanceOverlayEnabled)
  }
}

export function getAppUiSettings() {
  if (typeof window === 'undefined') return { ...defaultAppUiSettings }
  try {
    const raw = window.localStorage.getItem(APP_UI_SETTINGS_KEY)
    if (!raw) return { ...defaultAppUiSettings }
    const parsed = JSON.parse(raw)
    return normalizeAppUiSettings({ ...defaultAppUiSettings, ...parsed })
  } catch (_error) {
    return { ...defaultAppUiSettings }
  }
}

export function saveAppUiSettings(settings) {
  const normalized = normalizeAppUiSettings(settings)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(APP_UI_SETTINGS_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(APP_UI_SETTINGS_EVENT, { detail: normalized }))
  }
}

export function getAppUiSettingsEventName() {
  return APP_UI_SETTINGS_EVENT
}
