import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { testConnection } from './db.js';
import { camelCaseResponse } from './utils.js';
import { initRuntimeLogCapture, pushRuntimeLog } from './runtimeLogs.js';

// 导入路由
import usersRouter from './routes/users.js';
import ticketsRouter from './routes/tickets.js';
import serviceRequestsRouter from './routes/serviceRequests.js';
import articlesRouter from './routes/articles.js';
import flowsRouter from './routes/flows.js';
import chatsRouter from './routes/chats.js';
import codeSnippetsRouter from './routes/codeSnippets.js';
import migrateRouter from './routes/migrate.js';
import gitRouter from './routes/git.js';
import serviceCatalogRouter from './routes/serviceCatalog.js';
import videosRouter from './routes/videos.js';
import musicRouter from './routes/music.js';
import albumsRouter from './routes/albums.js';
import docScannerRouter from './routes/docScanner.js';
import weiboCrawlerRouter from './routes/weiboCrawler.js';
import scriptRunnerRouter from './routes/scriptRunner.js';
import schedulerTasksRouter from './routes/schedulerTasks.js';
import wikiRouter from './routes/wiki.js';
import runtimeLogsRouter from './routes/runtimeLogs.js';
import docsRouter from './routes/docs.js';
import ffmpegRouter from './routes/ffmpeg.js';

const app = express();
const PORT = process.env.PORT || 4000;

initRuntimeLogCapture();

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 自动将所有 API 响应的 snake_case 键名转为 camelCase
app.use('/api', camelCaseResponse);

// HTTP 请求日志（用于实时日志面板）
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    pushRuntimeLog(
      'http',
      `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
    );
  });
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 健康检查（API 路径，便于前端代理访问）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API 路由
app.use('/api/users', usersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/service-requests', serviceRequestsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/code-snippets', codeSnippetsRouter);
app.use('/api/migrate', migrateRouter);
app.use('/api/git', gitRouter);
app.use('/api/service-catalog', serviceCatalogRouter);
app.use('/api/videos', videosRouter);
app.use('/api/music', musicRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/doc-scanner', docScannerRouter);
app.use('/api/weibo', weiboCrawlerRouter);
app.use('/api/script-runner', scriptRunnerRouter);
app.use('/api/scheduler-tasks', schedulerTasksRouter);
app.use('/api/wiki', wikiRouter);
app.use('/api/runtime-logs', runtimeLogsRouter);
app.use('/api/docs', docsRouter);
app.use('/api/ffmpeg', ffmpegRouter);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'API 端点不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  if (err?.type === 'request.aborted' || /request aborted/i.test(String(err?.message || ''))) {
    console.warn('请求被客户端中断:', req.method, req.originalUrl);
    return res.status(499).json({ error: '请求已中断（客户端取消或网络断开）' });
  }

  if (err?.type === 'entity.too.large') {
    console.warn('请求体过大:', req.method, req.originalUrl);
    return res.status(413).json({ error: '请求体过大，请压缩或拆分后重试' });
  }

  console.error('服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 启动服务器
async function startServer() {
  // 测试数据库连接
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ 无法连接到数据库，请检查配置');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    const envEmoji = env === 'production' ? '🔴' : '🟢';
    console.log(`\n🚀 ITSM 后端服务器启动成功！`);
    console.log(`${envEmoji} 环境: ${env.toUpperCase()}`);
    console.log(`📍 监听端口: http://localhost:${PORT}`);
    console.log(`📊 API 基础路径: http://localhost:${PORT}/api`);
    console.log(`\n可用的 API 端点:`);
    console.log(`  - /api/users`);
    console.log(`  - /api/tickets`);
    console.log(`  - /api/service-requests`);
    console.log(`  - /api/articles`);
    console.log(`  - /api/flows`);
    console.log(`  - /api/chats`);
    console.log(`  - /api/code-snippets`);
    console.log(`  - /api/migrate`);
    console.log(`  - /api/git`);
    console.log(`  - /api/service-catalog`);
    console.log(`  - /api/videos`);
    console.log(`  - /api/music`);
    console.log(`  - /api/albums`);
    console.log(`  - /api/doc-scanner`);
    console.log(`  - /api/weibo`);
    console.log(`  - /api/script-runner`);
    console.log(`  - /api/scheduler-tasks`);
    console.log(`  - /api/wiki`);
    console.log(`  - /api/runtime-logs`);
    console.log(`  - /api/ffmpeg`);
    console.log(`\n按 Ctrl+C 停止服务器\n`);
  });

  // 支持大文件长时间流式上传，避免默认 requestTimeout 中断上传。
  server.requestTimeout = 0;
}

startServer();
