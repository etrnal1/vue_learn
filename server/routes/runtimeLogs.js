import express from 'express';
import {
  clearRuntimeLogs,
  getRuntimeLogs,
  subscribeRuntimeLogs
} from '../runtimeLogs.js';

const router = express.Router();
const runtimeLogsEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_RUNTIME_LOGS === 'true';

router.use((req, res, next) => {
  if (!runtimeLogsEnabled) {
    return res.status(403).json({ error: '运行日志在生产模式下已禁用' });
  }
  next();
});

// GET /api/runtime-logs
router.get('/', (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10);
  const logs = getRuntimeLogs(Number.isFinite(limit) ? limit : 400);
  res.json({
    count: logs.length,
    logs
  });
});

// DELETE /api/runtime-logs
router.delete('/', (req, res) => {
  clearRuntimeLogs();
  res.json({ success: true });
});

// GET /api/runtime-logs/stream (SSE)
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const initial = getRuntimeLogs(120);
  res.write(`event: snapshot\ndata: ${JSON.stringify(initial)}\n\n`);

  const unsubscribe = subscribeRuntimeLogs((log) => {
    res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

export default router;
