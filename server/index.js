import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { testConnection } from './db.js';
import { camelCaseResponse } from './utils.js';

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
import docScannerRouter from './routes/docScanner.js';
import weiboCrawlerRouter from './routes/weiboCrawler.js';

const app = express();
const PORT = process.env.PORT || 4000;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 自动将所有 API 响应的 snake_case 键名转为 camelCase
app.use('/api', camelCaseResponse);

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
app.use('/api/doc-scanner', docScannerRouter);
app.use('/api/weibo', weiboCrawlerRouter);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'API 端点不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
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

  app.listen(PORT, () => {
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
    console.log(`  - /api/doc-scanner`);
    console.log(`  - /api/weibo`);
    console.log(`\n按 Ctrl+C 停止服务器\n`);
  });
}

startServer();
