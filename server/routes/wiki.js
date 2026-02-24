import express from 'express';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const router = express.Router();

const WIKI_DATA_DIR = path.resolve('server/data/wiki');
const WIKI_LIBRARY_FILE = path.join(WIKI_DATA_DIR, 'library.json');
const WIKI_IMPORT_DIR = path.join(os.tmpdir(), 'vue-learning-wiki-import');

function normalizeWikiItems(items) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();
  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const title = String(item.title || '').trim();
    if (!title) continue;

    const id = String(item.id || `wiki_${now}_${Math.random().toString(16).slice(2, 6)}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const createdAt = Number(item.createdAt) || now;
    const updatedAt = Number(item.updatedAt) || createdAt;
    const tags = Array.isArray(item.tags)
      ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
      : [];

    const history = Array.isArray(item.history)
      ? item.history
        .map((ver) => ({
          id: String(ver?.id || `ver_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
          title: String(ver?.title || title).trim(),
          summary: String(ver?.summary || ''),
          content: String(ver?.content || ''),
          category: String(ver?.category || '').trim(),
          tags: Array.isArray(ver?.tags)
            ? ver.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
            : [],
          updatedAt: Number(ver?.updatedAt) || updatedAt
        }))
        .filter((ver) => ver.title)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      : [];

    const comments = Array.isArray(item.comments)
      ? item.comments
        .map((comment) => ({
          id: String(comment?.id || `comment_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
          author: String(comment?.author || '访客').trim() || '访客',
          text: String(comment?.text || '').trim(),
          createdAt: Number(comment?.createdAt) || now
        }))
        .filter((comment) => comment.text)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];

    normalized.push({
      id,
      title,
      summary: String(item.summary || ''),
      content: String(item.content || ''),
      category: String(item.category || '').trim(),
      tags,
      views: Number(item.views) || 0,
      starred: Boolean(item.starred),
      createdAt,
      updatedAt,
      history,
      comments
    });
  }

  return normalized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function ensureDataDir() {
  await fsp.mkdir(WIKI_DATA_DIR, { recursive: true });
}

async function ensureImportDir() {
  await fsp.mkdir(WIKI_IMPORT_DIR, { recursive: true });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

function hasMeaningfulText(text, minChars = 30) {
  const normalized = String(text || '')
    .replace(/\s+/g, '')
    .replace(/[0-9\W_]+/g, '');
  return normalized.length >= minChars;
}

function decodePdfLiteral(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

async function extractTextFromPdfBinary(filePath) {
  const buf = await fsp.readFile(filePath);
  // latin1 keeps raw byte mapping for regex scanning
  const raw = buf.toString('latin1');
  const matches = raw.match(/\((?:\\.|[^\\()]){4,}\)/g) || [];
  const chunks = matches
    .slice(0, 8000)
    .map((token) => decodePdfLiteral(token.slice(1, -1)))
    .filter((line) => /[\u4e00-\u9fa5a-zA-Z]{2,}/.test(line));
  return chunks.join('\n');
}

async function extractTextFromFile(filePath, ext) {
  const lowered = String(ext || '').toLowerCase();
  if (lowered === '.md' || lowered === '.markdown' || lowered === '.txt') {
    return await fsp.readFile(filePath, 'utf8');
  }
  if (lowered === '.docx') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      if (hasMeaningfulText(result?.value || '', 12)) {
        return result.value;
      }
    } catch (error) {
      // continue fallback
    }
    return await runCommand('textutil', ['-convert', 'txt', '-stdout', filePath]);
  }
  if (lowered === '.doc') {
    return await runCommand('textutil', ['-convert', 'txt', '-stdout', filePath]);
  }
  if (lowered === '.pdf') {
    const attempts = [];
    try {
      const pdfBuffer = await fsp.readFile(filePath);
      const parser = new PDFParse({ data: pdfBuffer });
      const parsed = await parser.getText();
      await parser.destroy().catch(() => {});
      const text = String(parsed?.text || '');
      attempts.push(text);
      if (hasMeaningfulText(text, 12)) return text;
    } catch (error) {
      // continue fallback chain
    }
    try {
      const text = await runCommand('textutil', ['-convert', 'txt', '-stdout', filePath]);
      attempts.push(text);
      if (hasMeaningfulText(text)) return text;
    } catch (error) {
      // continue fallback chain
    }
    try {
      const text = await runCommand('pdftotext', ['-layout', filePath, '-']);
      attempts.push(text);
      if (hasMeaningfulText(text)) return text;
    } catch (error) {
      // continue fallback chain
    }
    try {
      const text = await runCommand('mdls', ['-raw', '-name', 'kMDItemTextContent', filePath]);
      const normalized = text === '(null)\n' ? '' : text;
      attempts.push(normalized);
      if (hasMeaningfulText(normalized)) return normalized;
    } catch (error) {
      // continue fallback chain
    }
    try {
      const text = await extractTextFromPdfBinary(filePath);
      attempts.push(text);
      if (hasMeaningfulText(text, 12)) return text;
    } catch (error) {
      // continue fallback chain
    }
    return attempts.join('\n');
  }
  throw new Error('不支持的文档格式');
}

function cleanImportedText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readWikiLibrary() {
  try {
    const raw = await fsp.readFile(WIKI_LIBRARY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeWikiItems(parsed?.items || []);
  } catch (error) {
    return [];
  }
}

async function writeWikiLibrary(items) {
  await ensureDataDir();
  const normalized = normalizeWikiItems(items);
  const payload = {
    updatedAt: Date.now(),
    count: normalized.length,
    items: normalized
  };
  await fsp.writeFile(WIKI_LIBRARY_FILE, JSON.stringify(payload, null, 2), 'utf8');
  return normalized;
}

// GET /api/wiki/library
router.get('/library', async (req, res) => {
  try {
    const items = await readWikiLibrary();
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('读取维基库失败:', error);
    res.status(500).json({ error: '读取维基库失败' });
  }
});

// PUT /api/wiki/library
router.put('/library', async (req, res) => {
  try {
    const items = await writeWikiLibrary(req.body?.items || []);
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('保存维基库失败:', error);
    res.status(500).json({ error: '保存维基库失败' });
  }
});

// POST /api/wiki/import-document
router.post('/import-document', async (req, res) => {
  const { fileName, dataBase64 } = req.body || {};
  const normalizedName = String(fileName || '').trim();
  if (!normalizedName) {
    return res.status(400).json({ error: 'fileName 不能为空' });
  }
  if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
    return res.status(400).json({ error: 'dataBase64 不能为空' });
  }

  const ext = path.extname(normalizedName).toLowerCase();
  if (!['.md', '.markdown', '.txt', '.docx', '.doc', '.pdf'].includes(ext)) {
    return res.status(400).json({ error: '仅支持 md/txt/doc/docx/pdf' });
  }

  try {
    await ensureImportDir();
    const tempName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const tempPath = path.join(WIKI_IMPORT_DIR, tempName);
    const base64 = dataBase64.includes(',') ? dataBase64.split(',').pop() : dataBase64;
    const buffer = Buffer.from(base64 || '', 'base64');
    await fsp.writeFile(tempPath, buffer);

    let content = await extractTextFromFile(tempPath, ext);
    content = cleanImportedText(content);
    const title = path.basename(normalizedName, ext).trim() || `导入文档_${Date.now()}`;
    const lines = content.split('\n').filter(Boolean);
    const summary = lines.slice(0, 2).join(' ').slice(0, 180);

    await fsp.unlink(tempPath).catch(() => {});

    if (!content) {
      return res.status(400).json({ error: '文档解析后为空，请检查文件内容或格式' });
    }

    res.json({
      title,
      summary,
      content,
      sourceExt: ext
    });
  } catch (error) {
    console.error('导入文档失败:', error);
    res.status(500).json({ error: error.message || '导入文档失败' });
  }
});

export default router;
