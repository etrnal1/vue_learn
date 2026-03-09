import express from 'express';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import pool from '../db.js';

const router = express.Router();
const execFileAsync = promisify(execFile);
const POWER_SAMPLE_CACHE_MS = 4000;
const POWER_HISTORY_LIMIT = 720;
const POWER_SAMPLER_INTERVAL_MS = 15000;

let previousCpuSnapshot = readCpuSnapshot();
let recentPowerSample = null;
let powerHistory = [];
let powerSamplerStarted = false;
let powerSchemaReady = false;
let powerSchemaEnsuring = null;

function readCpuSnapshot() {
  return os.cpus().map((cpu) => {
    const times = cpu.times || {};
    const idle = Number(times.idle || 0);
    const total = Object.values(times).reduce((sum, value) => sum + Number(value || 0), 0);
    return { idle, total };
  });
}

function getCpuUsagePercent() {
  const current = readCpuSnapshot();
  const fallback = Math.min(100, Math.max(0, (os.loadavg?.()[0] || 0) * 100 / Math.max(1, os.cpus().length)));

  if (!Array.isArray(previousCpuSnapshot) || previousCpuSnapshot.length !== current.length) {
    previousCpuSnapshot = current;
    return Number(fallback.toFixed(1));
  }

  let totalDelta = 0;
  let idleDelta = 0;

  for (let i = 0; i < current.length; i += 1) {
    const total = current[i].total - previousCpuSnapshot[i].total;
    const idle = current[i].idle - previousCpuSnapshot[i].idle;
    totalDelta += Math.max(0, total);
    idleDelta += Math.max(0, idle);
  }

  previousCpuSnapshot = current;

  if (totalDelta <= 0) {
    return Number(fallback.toFixed(1));
  }

  const usage = (1 - idleDelta / totalDelta) * 100;
  return Number(Math.min(100, Math.max(0, usage)).toFixed(1));
}

function getDiskUsage() {
  if (typeof fs.statfsSync !== 'function') {
    return null;
  }

  const targetPath = process.platform === 'win32'
    ? `${path.parse(process.cwd()).root || 'C:\\'}`
    : '/';

  try {
    const stat = fs.statfsSync(targetPath);
    const blockSize = Number(stat.bsize || 0);
    const totalBytes = Number(stat.blocks || 0) * blockSize;
    const freeBytes = Number(stat.bavail || stat.bfree || 0) * blockSize;
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const usagePercent = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

    return {
      path: targetPath,
      totalBytes,
      freeBytes,
      usedBytes,
      usagePercent
    };
  } catch (error) {
    return null;
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function getDevicePowerProfile() {
  const model = String(os.cpus()?.[0]?.model || '').toLowerCase();
  const isAppleSiliconMac = process.platform === 'darwin' && process.arch === 'arm64';

  if (isAppleSiliconMac) {
    if (model.includes('m4')) {
      return { baseIdleWatts: 5.5, cpuRangeWatts: 20, memoryRangeWatts: 3.2, ioRangeWatts: 2.3, label: 'Apple Silicon Mac mini / desktop class (M4)' };
    }
    if (model.includes('m3') || model.includes('m2') || model.includes('m1')) {
      return { baseIdleWatts: 5.2, cpuRangeWatts: 18, memoryRangeWatts: 3, ioRangeWatts: 2.1, label: 'Apple Silicon Mac mini / desktop class (M1-M3)' };
    }
    return { baseIdleWatts: 5.8, cpuRangeWatts: 19, memoryRangeWatts: 3, ioRangeWatts: 2.2, label: 'Apple Silicon Mac desktop' };
  }

  if (process.platform === 'darwin') {
    return { baseIdleWatts: 11, cpuRangeWatts: 45, memoryRangeWatts: 5, ioRangeWatts: 4, label: 'Intel Mac desktop' };
  }

  return { baseIdleWatts: 10, cpuRangeWatts: 35, memoryRangeWatts: 4, ioRangeWatts: 3, label: 'Generic desktop host' };
}

async function readTopPowerProcesses() {
  if (process.platform !== 'darwin') {
    return [];
  }

  try {
    const { stdout } = await execFileAsync('top', ['-l', '1', '-n', '8', '-o', 'power', '-stats', 'pid,command,cpu,power'], {
      timeout: 2500,
      maxBuffer: 1024 * 128
    });

    const lines = String(stdout || '').split('\n');
    const headerIndex = lines.findIndex((line) => /^\s*PID\s+COMMAND\s+%CPU\s+POWER/.test(line));
    if (headerIndex < 0) return [];

    return lines
      .slice(headerIndex + 1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.+?)\s+([0-9.]+)\s+([0-9.]+)$/);
        if (!match) return null;
        return {
          pid: Number(match[1]),
          command: String(match[2] || '').trim(),
          cpuPercent: Number(match[3] || 0),
          powerScore: Number(match[4] || 0)
        };
      })
      .filter((item) => item && Number.isFinite(item.powerScore))
      .sort((a, b) => b.powerScore - a.powerScore);
  } catch (_error) {
    return [];
  }
}

function getIntensityLabel(value) {
  if (value >= 0.82) return 'very-high';
  if (value >= 0.58) return 'high';
  if (value >= 0.3) return 'medium';
  return 'low';
}

function estimatePowerMetrics({ cpuUsagePercent = 0, memoryUsagePercent = 0, loadAverage = [], diskUsagePercent = 0, topProcesses = [] }) {
  const profile = getDevicePowerProfile();
  const cpuFactor = clamp(cpuUsagePercent / 100);
  const memoryFactor = clamp((memoryUsagePercent - 30) / 70);
  const ioFactor = clamp((diskUsagePercent - 35) / 65);
  const loadFactor = clamp(Number(loadAverage?.[0] || 0) / Math.max(1, os.cpus().length));
  const processPowerFactor = clamp(topProcesses.reduce((sum, item) => sum + Number(item.powerScore || 0), 0) / 120);
  const blendedCpuFactor = clamp(cpuFactor * 0.64 + loadFactor * 0.22 + processPowerFactor * 0.14);
  const intensityFactor = clamp(blendedCpuFactor * 0.72 + memoryFactor * 0.18 + ioFactor * 0.1);
  const estimatedWatts = Number((
    profile.baseIdleWatts +
    blendedCpuFactor * profile.cpuRangeWatts +
    memoryFactor * profile.memoryRangeWatts +
    ioFactor * profile.ioRangeWatts
  ).toFixed(2));

  return {
    source: 'estimated',
    profileLabel: profile.label,
    estimatedWatts,
    estimatedEnergyWhPerHour: Number(estimatedWatts.toFixed(2)),
    projectedDailyKwh: Number(((estimatedWatts * 24) / 1000).toFixed(3)),
    projectedMonthlyKwh: Number(((estimatedWatts * 24 * 30) / 1000).toFixed(2)),
    cpuFactor: Number(cpuFactor.toFixed(3)),
    memoryFactor: Number(memoryFactor.toFixed(3)),
    ioFactor: Number(ioFactor.toFixed(3)),
    loadFactor: Number(loadFactor.toFixed(3)),
    processPowerFactor: Number(processPowerFactor.toFixed(3)),
    intensityFactor: Number(intensityFactor.toFixed(3)),
    intensityLabel: getIntensityLabel(intensityFactor),
    confidence: 0.46,
    actualAvailable: false,
    note: '当前环境无法直接调用 powermetrics（需要 superuser），因此这里返回基于 CPU / 内存 / 负载 / 进程能耗评分的实时估算值。'
  };
}

function pushPowerHistorySample(sample) {
  powerHistory.push(sample);
  if (powerHistory.length > POWER_HISTORY_LIMIT) {
    powerHistory = powerHistory.slice(powerHistory.length - POWER_HISTORY_LIMIT);
  }
}

async function ensurePowerSchema() {
  if (powerSchemaReady) return true;
  if (powerSchemaEnsuring) return powerSchemaEnsuring;
  powerSchemaEnsuring = (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS power_monitor_records (
          id VARCHAR(64) PRIMARY KEY,
          source ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
          timestamp_ms BIGINT NOT NULL,
          watts DECIMAL(10,2) NOT NULL,
          sample_seconds INT NOT NULL DEFAULT 60,
          duration_minutes INT NOT NULL DEFAULT 1,
          note VARCHAR(500),
          meta JSON,
          created_at BIGINT NOT NULL,
          INDEX idx_power_source_time (source, timestamp_ms),
          INDEX idx_power_timestamp (timestamp_ms)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      powerSchemaReady = true;
      return true;
    } catch (error) {
      powerSchemaReady = false;
      throw error;
    } finally {
      powerSchemaEnsuring = null;
    }
  })();
  return powerSchemaEnsuring;
}

function createRecordId(prefix = 'power') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function persistPowerSample(sample) {
  try {
    await ensurePowerSchema();
    await pool.query(
      `INSERT INTO power_monitor_records (
        id, source, timestamp_ms, watts, sample_seconds, duration_minutes, note, meta, created_at
      ) VALUES (?, 'auto', ?, ?, ?, 1, ?, ?, ?)`,
      [
        createRecordId('power_auto'),
        Number(sample.timestamp || Date.now()),
        Number(sample.current?.estimatedWatts || 0),
        POWER_SAMPLER_INTERVAL_MS / 1000,
        String(sample.current?.note || ''),
        JSON.stringify({
          cpuUsagePercent: sample.cpu?.usagePercent ?? null,
          memoryUsagePercent: sample.memory?.usagePercent ?? null,
          intensityLabel: sample.current?.intensityLabel ?? null,
          confidence: sample.current?.confidence ?? null
        }),
        Date.now()
      ]
    );
  } catch (_error) {
    // keep runtime API available even if DB is unavailable
  }
}

async function queryPowerHistory({ historyLimit = 180, startMs = null, endMs = null, source = null, keyword = '' } = {}) {
  try {
    await ensurePowerSchema();
    const where = [];
    const params = [];
    if (Number.isFinite(startMs)) {
      where.push('timestamp_ms >= ?');
      params.push(Number(startMs));
    }
    if (Number.isFinite(endMs)) {
      where.push('timestamp_ms <= ?');
      params.push(Number(endMs));
    }
    if (source) {
      where.push('source = ?');
      params.push(String(source));
    }
    if (String(keyword || '').trim()) {
      where.push('note LIKE ?');
      params.push(`%${String(keyword).trim()}%`);
    }
    const limit = Math.max(1, Math.min(5000, Number(historyLimit) || 180));
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT id, source, timestamp_ms, watts, sample_seconds, duration_minutes, note, meta, created_at
       FROM power_monitor_records
       ${whereSql}
       ORDER BY timestamp_ms DESC
       LIMIT ?`,
      [...params, limit]
    );
    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      timestamp: Number(row.timestamp_ms),
      estimatedWatts: Number(row.watts),
      watts: Number(row.watts),
      sampleSeconds: Number(row.sample_seconds || 60),
      durationMinutes: Number(row.duration_minutes || 1),
      note: String(row.note || ''),
      createdAt: Number(row.created_at || 0),
      meta: typeof row.meta === 'string'
        ? (() => { try { return JSON.parse(row.meta); } catch { return null; } })()
        : row.meta
    })).reverse();
  } catch (_error) {
    return powerHistory.slice(-Math.max(1, Math.min(POWER_HISTORY_LIMIT, Number(historyLimit) || 180)));
  }
}

async function collectPowerPayload({ historyLimit = 180, force = false } = {}) {
  const now = Date.now();
  if (!force && recentPowerSample && now - recentPowerSample.timestamp < POWER_SAMPLE_CACHE_MS) {
    return {
      ...recentPowerSample,
      history: powerHistory.slice(-Math.max(1, Math.min(POWER_HISTORY_LIMIT, Number(historyLimit) || 180)))
    };
  }

  const cpus = os.cpus();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);
  const memoryUsagePercent = totalMemoryBytes > 0
    ? Number(((usedMemoryBytes / totalMemoryBytes) * 100).toFixed(1))
    : 0;
  const disk = getDiskUsage();
  const cpuUsagePercent = getCpuUsagePercent();
  const topProcesses = await readTopPowerProcesses();
  const loadAverage = os.loadavg();
  const estimate = estimatePowerMetrics({
    cpuUsagePercent,
    memoryUsagePercent,
    loadAverage,
    diskUsagePercent: Number(disk?.usagePercent || 0),
    topProcesses
  });

  const sample = {
    timestamp: now,
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release()
    },
    cpu: {
      usagePercent: cpuUsagePercent,
      cores: cpus.length,
      model: cpus[0]?.model || 'unknown',
      loadAverage
    },
    memory: {
      totalBytes: totalMemoryBytes,
      usedBytes: usedMemoryBytes,
      freeBytes: freeMemoryBytes,
      usagePercent: memoryUsagePercent
    },
    disk: disk || null,
    current: estimate,
    topProcesses: topProcesses.slice(0, 8)
  };

  recentPowerSample = sample;
  const historySample = {
    timestamp: now,
    estimatedWatts: estimate.estimatedWatts,
    sampleSeconds: POWER_SAMPLER_INTERVAL_MS / 1000,
    intensityLabel: estimate.intensityLabel,
    cpuUsagePercent,
    memoryUsagePercent,
    loadAverage1m: Number((loadAverage?.[0] || 0).toFixed(2))
  };
  pushPowerHistorySample(historySample);
  await persistPowerSample(sample);

  return {
    ...sample,
    history: await queryPowerHistory({ historyLimit })
  };
}

function startPowerSampler() {
  if (powerSamplerStarted) return;
  powerSamplerStarted = true;
  void collectPowerPayload({ historyLimit: POWER_HISTORY_LIMIT, force: true }).catch(() => {});
  const timer = setInterval(() => {
    void collectPowerPayload({ historyLimit: POWER_HISTORY_LIMIT, force: true }).catch(() => {});
  }, POWER_SAMPLER_INTERVAL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

startPowerSampler();

function parsePowermetricsText(text) {
  const raw = String(text || '');
  const lines = raw.split('\n');
  const metrics = {};

  lines.forEach((line) => {
    const wattMatch = line.match(/^\s*([A-Za-z0-9 +\/()_-]+?)\s*:\s*([0-9.]+)\s*mW\b/i);
    if (wattMatch) {
      const key = String(wattMatch[1] || '').trim();
      const milliWatts = Number(wattMatch[2] || 0);
      metrics[key] = {
        milliWatts,
        watts: Number((milliWatts / 1000).toFixed(3))
      };
    }
  });

  const combinedMilliWatts = Number(metrics['Combined Power (CPU + GPU + ANE)']?.milliWatts || 0);
  const totalMilliWatts = combinedMilliWatts > 0
    ? combinedMilliWatts
    : Object.values(metrics).reduce((sum, item) => sum + Number(item?.milliWatts || 0), 0);
  return {
    raw,
    metrics,
    totalMilliWatts,
    totalWatts: Number((totalMilliWatts / 1000).toFixed(3))
  };
}

async function collectPowermetricsPayload() {
  const estimate = await collectPowerPayload({ historyLimit: 60 });
  try {
    const { stdout, stderr } = await execFileAsync('sudo', ['-n', 'powermetrics', '-n', '1', '-i', '1000', '--samplers', 'cpu_power'], {
      timeout: 5000,
      maxBuffer: 1024 * 256
    });
    const parsed = parsePowermetricsText(stdout);
    return {
      timestamp: Date.now(),
      available: true,
      permissionRequired: false,
      estimate: estimate.current,
      powermetrics: {
        ...parsed,
        stderr: String(stderr || '')
      },
      deltaWatts: parsed.totalWatts > 0
        ? Number((parsed.totalWatts - Number(estimate.current?.estimatedWatts || 0)).toFixed(3))
        : null
    };
  } catch (error) {
    return {
      timestamp: Date.now(),
      available: false,
      permissionRequired: /password is required|must be invoked as the superuser/i.test(String(error?.message || '')),
      estimate: estimate.current,
      powermetrics: null,
      deltaWatts: null,
      error: {
        message: String(error?.message || 'powermetrics 执行失败'),
        code: String(error?.code || '')
      },
      note: 'powermetrics 需要 sudo/root。当前接口使用 sudo -n 调用；若未配置免密 sudo，会直接失败。'
    };
  }
}

router.get('/status', (req, res) => {
  const cpus = os.cpus();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);
  const memoryUsagePercent = totalMemoryBytes > 0
    ? Number(((usedMemoryBytes / totalMemoryBytes) * 100).toFixed(1))
    : 0;
  const processMemory = process.memoryUsage();

  res.json({
    timestamp: Date.now(),
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptimeSec: os.uptime()
    },
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'unknown',
      speedMHz: cpus[0]?.speed || 0,
      usagePercent: getCpuUsagePercent(),
      loadAverage: os.loadavg()
    },
    memory: {
      totalBytes: totalMemoryBytes,
      freeBytes: freeMemoryBytes,
      usedBytes: usedMemoryBytes,
      usagePercent: memoryUsagePercent
    },
    disk: getDiskUsage(),
    process: {
      pid: process.pid,
      uptimeSec: process.uptime(),
      rssBytes: processMemory.rss,
      heapUsedBytes: processMemory.heapUsed,
      heapTotalBytes: processMemory.heapTotal
    }
  });
});

router.get('/power', async (req, res, next) => {
  try {
    const historyLimit = Number(req.query.historyLimit || 180);
    const startMs = req.query.startMs === undefined ? null : Number(req.query.startMs);
    const endMs = req.query.endMs === undefined ? null : Number(req.query.endMs);
    const keyword = String(req.query.keyword || '').trim();
    const payload = await collectPowerPayload({ historyLimit });
    payload.history = await queryPowerHistory({ historyLimit, startMs, endMs, source: 'auto', keyword });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/power-records', async (req, res, next) => {
  try {
    const historyLimit = Number(req.query.limit || 500);
    const startMs = req.query.startMs === undefined ? null : Number(req.query.startMs);
    const endMs = req.query.endMs === undefined ? null : Number(req.query.endMs);
    const keyword = String(req.query.keyword || '').trim();
    const sourceRaw = String(req.query.source || 'manual').trim();
    const source = ['manual', 'auto'].includes(sourceRaw) ? sourceRaw : null;
    const records = await queryPowerHistory({ historyLimit, startMs, endMs, source, keyword });
    res.json({ records });
  } catch (error) {
    next(error);
  }
});

router.get('/powermetrics', async (req, res, next) => {
  try {
    const payload = await collectPowermetricsPayload();
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/power-records', async (req, res, next) => {
  try {
    await ensurePowerSchema();
    const timestampMs = Number(req.body?.timestampMs || Date.now());
    const watts = Number(req.body?.watts || 0);
    const durationMinutes = Math.max(1, Math.floor(Number(req.body?.durationMinutes || 1)));
    const note = String(req.body?.note || '').trim();
    if (!Number.isFinite(timestampMs)) {
      return res.status(400).json({ error: 'timestampMs 无效' });
    }
    if (!Number.isFinite(watts) || watts <= 0) {
      return res.status(400).json({ error: 'watts 必须大于 0' });
    }
    const record = {
      id: createRecordId('power_manual'),
      source: 'manual',
      timestampMs,
      watts: Number(watts.toFixed(2)),
      sampleSeconds: durationMinutes * 60,
      durationMinutes,
      note,
      createdAt: Date.now()
    };
    await pool.query(
      `INSERT INTO power_monitor_records (
        id, source, timestamp_ms, watts, sample_seconds, duration_minutes, note, meta, created_at
      ) VALUES (?, 'manual', ?, ?, ?, ?, ?, NULL, ?)`,
      [record.id, record.timestampMs, record.watts, record.sampleSeconds, record.durationMinutes, record.note, record.createdAt]
    );
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.delete('/power-records/:id', async (req, res, next) => {
  try {
    await ensurePowerSchema();
    const id = String(req.params.id || '').trim();
    const [result] = await pool.query('DELETE FROM power_monitor_records WHERE id = ? AND source = ?', [id, 'manual']);
    if (!result?.affectedRows) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/power-records', async (req, res, next) => {
  try {
    await ensurePowerSchema();
    await pool.query('DELETE FROM power_monitor_records WHERE source = ?', ['manual']);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
