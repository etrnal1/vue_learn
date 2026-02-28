import { extractBearerToken, getUserByToken } from '../auth.js';

function parseRoleList(value, fallback) {
  const source = String(value || fallback || '');
  const roles = source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(roles));
}

const roleGroups = {
  admin: parseRoleList(process.env.RBAC_ADMIN_ROLES, 'admin'),
  audit: parseRoleList(process.env.RBAC_AUDIT_ROLES, 'admin,approver'),
  database: parseRoleList(process.env.RBAC_DATABASE_ROLES, 'admin')
};

export function getRoleGroup(name) {
  const roles = roleGroups[String(name || '').trim()];
  return Array.isArray(roles) && roles.length > 0 ? roles : [];
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: '未登录或令牌缺失' });
    }

    const auth = await getUserByToken(token);
    if (!auth?.user) {
      return res.status(401).json({ error: '登录已过期或无效' });
    }

    req.auth = auth;
    req.authUser = auth.user;
    return next();
  } catch (error) {
    console.error('鉴权失败:', error);
    return res.status(500).json({ error: '鉴权失败' });
  }
}

export function requireRoles(...roles) {
  const allowed = new Set(roles.map((role) => String(role || '').trim()).filter(Boolean));

  return (req, res, next) => {
    const role = String(req.authUser?.role || '').trim();
    if (!allowed.has(role)) {
      return res.status(403).json({
        error: '权限不足',
        requiredRoles: Array.from(allowed)
      });
    }
    return next();
  };
}
