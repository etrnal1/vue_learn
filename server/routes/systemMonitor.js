import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

const router = express.Router();

let previousCpuSnapshot = readCpuSnapshot();

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

export default router;
