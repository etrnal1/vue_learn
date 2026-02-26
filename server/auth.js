import crypto from 'crypto';
import pool from './db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function now() {
  return Date.now();
}

function toSafeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    email: row.email,
    createdAt: row.created_at
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = crypto.pbkdf2Sync(
    String(password),
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  ).toString('hex');
  return `${salt}:${key}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expected] = String(storedHash).split(':');
  const actual = hashPassword(password, salt).split(':')[1];
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function ensureAuthSchema() {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL
    AFTER email
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      token_hash CHAR(64) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      revoked_at BIGINT NULL,
      INDEX idx_token_hash (token_hash),
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function createSession(userId, ttlMs = SESSION_TTL_MS) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const createdAt = now();
  const expiresAt = createdAt + ttlMs;
  await pool.query(
    `INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, NULL)`,
    [tokenHash, userId, createdAt, expiresAt]
  );
  return { token, expiresAt };
}

export async function revokeSessionByToken(token) {
  const tokenHash = hashToken(token);
  await pool.query(
    'UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL',
    [now(), tokenHash]
  );
}

export async function cleanupExpiredSessions() {
  await pool.query(
    'DELETE FROM auth_sessions WHERE revoked_at IS NOT NULL OR expires_at < ?',
    [now()]
  );
}

export async function getUserByToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.role, u.avatar, u.email, u.created_at, s.expires_at
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
     LIMIT 1`,
    [tokenHash, now()]
  );
  if (rows.length === 0) return null;
  return {
    user: toSafeUser(rows[0]),
    expiresAt: Number(rows[0].expires_at)
  };
}

export async function getUserByCredentials(userId, password) {
  const [rows] = await pool.query(
    'SELECT id, name, role, avatar, email, created_at, password_hash FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (!verifyPassword(password, row.password_hash)) return null;
  return toSafeUser(row);
}

export async function registerUser({
  id,
  name,
  role = 'member',
  avatar = '👨‍💻',
  email = null,
  password
}) {
  const createdAt = now();
  const passwordHash = hashPassword(password);
  await pool.query(
    `INSERT INTO users (id, name, role, avatar, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, role, avatar, email, passwordHash, createdAt]
  );
  const [rows] = await pool.query(
    'SELECT id, name, role, avatar, email, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return toSafeUser(rows[0]);
}

export function extractBearerToken(req) {
  const header = String(req.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}
