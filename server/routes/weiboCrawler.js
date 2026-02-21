import express from 'express';
import fsp from 'fs/promises';
import path from 'path';

const router = express.Router();

const DATA_DIR = path.resolve('server/data/weibo');
const DEFAULT_COUNT = 20;
const MAX_COUNT = 100;

const scheduler = {
  enabled: false,
  timer: null,
  config: null,
  lastRunAt: null,
  lastError: '',
  lastCount: 0
};

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error('当前 Node 环境不支持 fetch，请升级 Node 版本')
  }
}

function normalizeUid(uid) {
  const s = String(uid || '').trim();
  if (!/^\d{4,20}$/.test(s)) return '';
  return s;
}

function normalizeCount(input) {
  const n = Number.parseInt(input, 10);
  if (Number.isNaN(n) || n <= 0) return DEFAULT_COUNT;
  return Math.min(n, MAX_COUNT);
}

function normalizeInterval(input) {
  const n = Number.parseInt(input, 10);
  if (Number.isNaN(n) || n <= 0) return 30;
  return Math.min(Math.max(n, 1), 24 * 60);
}

function stripHtml(input) {
  return String(input || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function filePathForUid(uid) {
  return path.join(DATA_DIR, `${uid}.json`);
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function readSaved(uid) {
  try {
    const p = filePathForUid(uid);
    const raw = await fsp.readFile(p, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (error) {
    return [];
  }
}

async function writeSaved(uid, items) {
  await ensureDataDir();
  const payload = {
    uid,
    updatedAt: Date.now(),
    count: items.length,
    items
  };
  await fsp.writeFile(filePathForUid(uid), JSON.stringify(payload, null, 2), 'utf8');
}

function mergeById(oldItems, newItems) {
  const map = new Map();
  for (const it of oldItems || []) map.set(it.id, it);
  for (const it of newItems || []) map.set(it.id, it);
  return [...map.values()].sort((a, b) => (b.createdTs || 0) - (a.createdTs || 0));
}

function toCsv(items) {
  const header = ['id', 'uid', 'userName', 'createdAt', 'source', 'reposts', 'comments', 'likes', 'url', 'text'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.join(',')];
  for (const it of items) {
    lines.push([
      esc(it.id),
      esc(it.uid),
      esc(it.userName),
      esc(it.createdAt),
      esc(it.source),
      esc(it.reposts),
      esc(it.comments),
      esc(it.likes),
      esc(it.url),
      esc(it.text)
    ].join(','));
  }
  return lines.join('\n');
}

async function fetchPublicWeibo(uid, count) {
  ensureFetchAvailable();
  const containerId = `107603${uid}`;
  const url = `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}&containerid=${containerId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json,text/plain,*/*'
    }
  });

  if (!response.ok) {
    throw new Error(`微博接口请求失败: HTTP ${response.status}`);
  }

  const data = await response.json();
  const cards = data?.data?.cards;
  if (!Array.isArray(cards)) {
    throw new Error('微博接口未返回有效卡片数据（可能被限制或 uid 无效）');
  }

  const items = [];
  for (const card of cards) {
    const mblog = card?.mblog;
    if (!mblog || !mblog.id) continue;

    const text = stripHtml(mblog.text || '');
    const userName = mblog?.user?.screen_name || '';
    const urlPath = mblog.bid ? `https://weibo.com/${uid}/${mblog.bid}` : '';

    items.push({
      id: String(mblog.id),
      uid,
      userName,
      createdAt: mblog.created_at || '',
      createdTs: Date.now(),
      source: stripHtml(mblog.source || ''),
      reposts: Number(mblog.reposts_count || 0),
      comments: Number(mblog.comments_count || 0),
      likes: Number(mblog.attitudes_count || 0),
      text,
      url: urlPath,
      fetchedAt: Date.now()
    });

    if (items.length >= count) break;
  }

  return items;
}

async function runSchedulerOnce() {
  if (!scheduler.config) return;
  const { uid, count, autoSave } = scheduler.config;
  const fetched = await fetchPublicWeibo(uid, count);
  scheduler.lastRunAt = Date.now();
  scheduler.lastCount = fetched.length;
  scheduler.lastError = '';

  if (autoSave) {
    const old = await readSaved(uid);
    const merged = mergeById(old, fetched);
    await writeSaved(uid, merged);
  }
}

function stopScheduler() {
  if (scheduler.timer) {
    clearInterval(scheduler.timer);
    scheduler.timer = null;
  }
  scheduler.enabled = false;
}

function schedulerPayload() {
  return {
    enabled: scheduler.enabled,
    config: scheduler.config,
    lastRunAt: scheduler.lastRunAt,
    lastCount: scheduler.lastCount,
    lastError: scheduler.lastError
  };
}

router.post('/fetch', async (req, res) => {
  const uid = normalizeUid(req.body?.uid);
  const count = normalizeCount(req.body?.count);
  if (!uid) return res.status(400).json({ error: 'uid 必须是数字' });

  try {
    const items = await fetchPublicWeibo(uid, count);
    res.json({ uid, count: items.length, items });
  } catch (error) {
    console.error('抓取微博失败:', error);
    res.status(500).json({ error: error.message || '抓取失败' });
  }
});

router.post('/save', async (req, res) => {
  const uid = normalizeUid(req.body?.uid);
  if (!uid) return res.status(400).json({ error: 'uid 必须是数字' });

  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : await fetchPublicWeibo(uid, normalizeCount(req.body?.count));
    const old = await readSaved(uid);
    const merged = mergeById(old, items);
    await writeSaved(uid, merged);
    res.json({ uid, saved: merged.length });
  } catch (error) {
    console.error('保存微博失败:', error);
    res.status(500).json({ error: error.message || '保存失败' });
  }
});

router.get('/saved', async (req, res) => {
  const uid = normalizeUid(req.query?.uid);
  if (!uid) return res.status(400).json({ error: 'uid 必须是数字' });

  try {
    const items = await readSaved(uid);
    res.json({ uid, count: items.length, items });
  } catch (error) {
    console.error('读取已保存微博失败:', error);
    res.status(500).json({ error: error.message || '读取失败' });
  }
});

router.get('/download', async (req, res) => {
  const uid = normalizeUid(req.query?.uid);
  const format = String(req.query?.format || 'json').toLowerCase();
  if (!uid) return res.status(400).json({ error: 'uid 必须是数字' });

  try {
    const items = await readSaved(uid);
    if (format === 'csv') {
      const csv = toCsv(items);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="weibo_${uid}.csv"`);
      return res.send(`\uFEFF${csv}`);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="weibo_${uid}.json"`);
    return res.send(JSON.stringify({ uid, count: items.length, items }, null, 2));
  } catch (error) {
    console.error('下载微博数据失败:', error);
    res.status(500).json({ error: error.message || '下载失败' });
  }
});

router.get('/scheduler', (req, res) => {
  res.json(schedulerPayload());
});

router.post('/scheduler/start', async (req, res) => {
  const uid = normalizeUid(req.body?.uid);
  if (!uid) return res.status(400).json({ error: 'uid 必须是数字' });

  const config = {
    uid,
    count: normalizeCount(req.body?.count),
    intervalMinutes: normalizeInterval(req.body?.intervalMinutes),
    autoSave: req.body?.autoSave !== false
  };

  stopScheduler();
  scheduler.enabled = true;
  scheduler.config = config;

  try {
    await runSchedulerOnce();
  } catch (error) {
    scheduler.lastError = error.message || '首次执行失败';
  }

  scheduler.timer = setInterval(async () => {
    try {
      await runSchedulerOnce();
    } catch (error) {
      scheduler.lastError = error.message || '定时抓取失败';
      scheduler.lastRunAt = Date.now();
    }
  }, config.intervalMinutes * 60 * 1000);

  res.json(schedulerPayload());
});

router.post('/scheduler/stop', (req, res) => {
  stopScheduler();
  res.json(schedulerPayload());
});

router.post('/scheduler/run', async (req, res) => {
  if (!scheduler.config) {
    return res.status(400).json({ error: '尚未配置定时任务' });
  }

  try {
    await runSchedulerOnce();
    res.json(schedulerPayload());
  } catch (error) {
    scheduler.lastError = error.message || '手动执行失败';
    scheduler.lastRunAt = Date.now();
    res.status(500).json({ error: scheduler.lastError });
  }
});

export default router;
