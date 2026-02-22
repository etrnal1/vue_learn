import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';

const router = express.Router();
const execFilePromise = promisify(execFile);

const GIT_DIR = process.env.GIT_DIR || process.cwd();
const REF_PATTERN = /^[A-Za-z0-9._/-]+$/;
const REMOTE_PATTERN = /^[A-Za-z0-9._-]+$/;
const MAIN_BRANCHES = new Set(['main', 'master']);

function sanitizeRefName(ref, fieldName = '分支名') {
  if (typeof ref !== 'string' || !ref.trim()) {
    return { ok: false, error: `${fieldName}不能为空` };
  }

  const value = ref.trim();

  if (!REF_PATTERN.test(value) || value.startsWith('-') || value.includes('..') || value.includes('//')) {
    return { ok: false, error: `无效的${fieldName}` };
  }

  if (value.endsWith('/') || value.endsWith('.')) {
    return { ok: false, error: `无效的${fieldName}` };
  }

  return { ok: true, value };
}

function sanitizeFilePath(pathValue) {
  if (typeof pathValue !== 'string' || !pathValue.trim()) {
    return { ok: false, error: '文件路径不能为空' };
  }

  const value = pathValue.trim();

  if (value.includes('..') || value.startsWith('/') || value.includes('\u0000')) {
    return { ok: false, error: '无效的文件路径' };
  }

  return { ok: true, value };
}

function toTopPathspec(pathValue) {
  return `:(top)${pathValue}`;
}

function parseLimit(rawLimit, defaultLimit = 10, max = 100) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultLimit;
  }
  return Math.min(parsed, max);
}

function sanitizeRemoteName(remote) {
  if (typeof remote !== 'string' || !remote.trim()) {
    return { ok: false, error: '远程仓库名不能为空' };
  }
  const value = remote.trim();
  if (!REMOTE_PATTERN.test(value) || value.startsWith('-')) {
    return { ok: false, error: '无效的远程仓库名' };
  }
  return { ok: true, value };
}

function classifyCommitType(subject = '') {
  if (subject.startsWith('添加') || subject.startsWith('feat')) return '新功能';
  if (subject.startsWith('更新')) return '更新';
  if (subject.startsWith('修复') || subject.startsWith('fix')) return '修复';
  if (subject.startsWith('文档') || subject.startsWith('docs')) return '文档';
  if (subject.startsWith('配置')) return '配置';
  if (subject.startsWith('样式')) return '样式';
  if (subject.startsWith('重构')) return '重构';
  if (subject.startsWith('移除')) return '移除';
  return '其他';
}

function parseCommitLogEntries(rawLog = '', parseLine) {
  const entries = new Map();
  let currentHash = '';

  for (const line of rawLog.split('\n')) {
    if (line.startsWith('COMMIT|')) {
      const parts = line.split('|');
      currentHash = parts[1] || '';
      if (currentHash && !entries.has(currentHash)) {
        entries.set(currentHash, {
          fullHash: currentHash,
          hash: parts[2] || currentHash.slice(0, 7),
          author: parts[3] || '',
          email: parts[4] || '',
          date: parts[5] || '',
          subject: parts.slice(6).join('|') || '',
          filesMap: new Map(),
          insertions: 0,
          deletions: 0
        });
      }
      continue;
    }

    if (!currentHash || !line) {
      continue;
    }

    const entry = entries.get(currentHash);
    if (!entry) {
      continue;
    }

    parseLine(line, entry);
  }

  return entries;
}

async function runGitCommand(args, options = {}) {
  const runCwd = options.cwd || GIT_DIR;
  try {
    const { stdout, stderr } = await execFilePromise('git', args, {
      cwd: runCwd,
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      success: true,
      data: stdout.trim(),
      stderr: (stderr || '').trim()
    };
  } catch (error) {
    return {
      success: false,
      code: typeof error.code === 'number' ? error.code : 1,
      error: (error.stderr || error.message || '').trim() || 'Git 命令执行失败',
      data: (error.stdout || '').trim()
    };
  }
}

async function hasUncommittedChanges() {
  const statusResult = await runGitCommand(['status', '--porcelain']);
  return statusResult.success && Boolean(statusResult.data);
}

async function getCurrentBranchName() {
  const result = await runGitCommand(['branch', '--show-current']);
  if (!result.success) return '';
  return result.data;
}

function sendGitError(res, result, hint = '', status = 500) {
  return res.status(status).json({
    error: result.error || 'Git 操作失败',
    ...(hint ? { hint } : {})
  });
}

router.get('/branches', async (req, res) => {
  try {
    const result = await runGitCommand(['branch', '-a', '--no-color']);
    if (!result.success) {
      return sendGitError(res, result);
    }

    const branches = result.data
      .split('\n')
      .map((line) => {
        const isCurrent = line.startsWith('*');
        const fullName = line.replace('*', '').trim();
        const isRemote = fullName.startsWith('remotes/');
        const normalizedName = isRemote
          ? fullName.replace(/^remotes\/[^/]+\//, '')
          : fullName;

        return {
          name: normalizedName,
          fullName,
          isCurrent,
          isRemote,
          type: isRemote ? 'remote' : 'local'
        };
      })
      .filter((item) => item.name && !item.fullName.includes('HEAD ->'));

    res.json({ branches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/current-branch', async (req, res) => {
  try {
    const result = await runGitCommand(['branch', '--show-current']);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({ currentBranch: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/branch-commits/:branchName', async (req, res) => {
  try {
    const validatedRef = sanitizeRefName(req.params.branchName);
    if (!validatedRef.ok) {
      return res.status(400).json({ error: validatedRef.error });
    }

    const limit = parseLimit(req.query.limit, 10, 100);
    const result = await runGitCommand([
      'log',
      validatedRef.value,
      '--oneline',
      '--graph',
      `-${limit}`
    ]);

    if (!result.success) {
      return sendGitError(res, result);
    }

    const commits = result.data
      ? result.data.split('\n').map((line) => {
          const match = line.match(/^[*|\\/\s]*\s*([a-f0-9]+)\s+(.+)$/i);
          if (match) {
            return {
              hash: match[1],
              message: match[2],
              raw: line
            };
          }
          return { raw: line };
        })
      : [];

    res.json({ commits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const validatedRef = sanitizeRefName(String(req.query.ref || 'HEAD'), '引用');
    if (!validatedRef.ok) {
      return res.status(400).json({ error: validatedRef.error });
    }

    const limit = parseLimit(req.query.limit, 200, 1000);
    const [statusLogResult, numstatLogResult] = await Promise.all([
      runGitCommand([
        'log',
        validatedRef.value,
        `-${limit}`,
        '--date=iso-strict',
        '--pretty=format:COMMIT|%H|%h|%an|%ae|%aI|%s',
        '--name-status'
      ]),
      runGitCommand([
        'log',
        validatedRef.value,
        `-${limit}`,
        '--date=iso-strict',
        '--pretty=format:COMMIT|%H|%h|%an|%ae|%aI|%s',
        '--numstat'
      ])
    ]);

    if (!statusLogResult.success) {
      return sendGitError(res, statusLogResult);
    }

    if (!numstatLogResult.success) {
      return sendGitError(res, numstatLogResult);
    }

    const statusMap = {
      A: 'added',
      M: 'modified',
      D: 'deleted',
      R: 'renamed',
      C: 'renamed'
    };

    const statusEntries = parseCommitLogEntries(statusLogResult.data || '', (line, entry) => {
      if (!/^[A-Z]/.test(line)) {
        return;
      }

      const parts = line.split('\t');
      const rawStatus = parts[0] || '';
      const statusCode = rawStatus[0];
      const filePath = (statusCode === 'R' || statusCode === 'C')
        ? (parts[2] || parts[1])
        : parts[1];

      if (!filePath) {
        return;
      }

      entry.filesMap.set(filePath, {
        path: filePath,
        status: statusMap[statusCode] || 'modified',
        name: filePath.split('/').pop()
      });
    });

    const numstatEntries = parseCommitLogEntries(numstatLogResult.data || '', (line, entry) => {
      if (!/^(\d+|-)\t(\d+|-)\t/.test(line)) {
        return;
      }

      const [addRaw, delRaw, filePath] = line.split('\t');
      if (!filePath) {
        return;
      }

      if (addRaw !== '-') entry.insertions += Number.parseInt(addRaw, 10) || 0;
      if (delRaw !== '-') entry.deletions += Number.parseInt(delRaw, 10) || 0;

      if (!entry.filesMap.has(filePath)) {
        entry.filesMap.set(filePath, {
          path: filePath,
          status: 'modified',
          name: filePath.split('/').pop()
        });
      }
    });

    const commitOrder = [];
    for (const line of (statusLogResult.data || '').split('\n')) {
      if (!line.startsWith('COMMIT|')) continue;
      const fullHash = line.split('|')[1] || '';
      if (fullHash && !commitOrder.includes(fullHash)) {
        commitOrder.push(fullHash);
      }
    }

    for (const [fullHash, numstatEntry] of numstatEntries.entries()) {
      if (!statusEntries.has(fullHash)) {
        statusEntries.set(fullHash, numstatEntry);
      } else {
        const entry = statusEntries.get(fullHash);
        entry.insertions = numstatEntry.insertions;
        entry.deletions = numstatEntry.deletions;
        for (const [filePath, fileInfo] of numstatEntry.filesMap.entries()) {
          if (!entry.filesMap.has(filePath)) {
            entry.filesMap.set(filePath, fileInfo);
          }
        }
      }
      if (!commitOrder.includes(fullHash)) {
        commitOrder.push(fullHash);
      }
    }

    const commits = commitOrder
      .map((fullHash) => statusEntries.get(fullHash))
      .filter(Boolean)
      .map((entry) => {
        const files = Array.from(entry.filesMap.values());
        return {
          hash: entry.hash,
          fullHash: entry.fullHash,
          author: entry.author,
          email: entry.email,
          date: entry.date,
          subject: entry.subject,
          body: '',
          type: classifyCommitType(entry.subject || ''),
          files,
          stats: {
            filesChanged: files.length,
            insertions: entry.insertions,
            deletions: entry.deletions
          }
        };
      });

    const summary = {
      totalCommits: commits.length,
      totalFiles: new Set(commits.flatMap((item) => item.files.map((file) => file.path))).size,
      totalInsertions: commits.reduce((sum, item) => sum + item.stats.insertions, 0),
      totalDeletions: commits.reduce((sum, item) => sum + item.stats.deletions, 0),
      authors: [...new Set(commits.map((item) => item.author))],
      firstCommit: commits.length > 0 ? commits[commits.length - 1].date : null,
      lastCommit: commits.length > 0 ? commits[0].date : null,
      generatedAt: new Date().toISOString()
    };

    res.json({ ref: validatedRef.value, summary, commits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commit-file-diff', async (req, res) => {
  try {
    const validatedPath = sanitizeFilePath(req.query.path);
    const validatedCommit = sanitizeRefName(req.query.commit, '提交 Hash');

    if (!validatedPath.ok || !validatedCommit.ok) {
      return res.status(400).json({ error: validatedPath.error || validatedCommit.error });
    }

    const topPathspec = toTopPathspec(validatedPath.value);
    const diffAttempts = [
      ['show', '--no-color', '--format=', validatedCommit.value, '--', topPathspec],
      ['diff', '--no-color', `${validatedCommit.value}^!`, '--', topPathspec],
      ['show', '--no-color', '-m', '--format=', validatedCommit.value, '--', topPathspec]
    ];

    let diffResult = null;
    for (const args of diffAttempts) {
      const result = await runGitCommand(args);
      if (result.success && result.data) {
        diffResult = result;
        break;
      }
      if (!result.success && !diffResult) {
        diffResult = result;
      }
    }

    if (!diffResult || !diffResult.success) {
      return sendGitError(res, diffResult || { error: '无法获取提交文件内容' }, '无法获取提交文件内容');
    }

    const statsAttempts = [
      ['show', '--numstat', '--format=', validatedCommit.value, '--', topPathspec],
      ['diff', '--numstat', `${validatedCommit.value}^!`, '--', topPathspec]
    ];

    let statsResult = { success: true, data: '' };
    for (const args of statsAttempts) {
      const result = await runGitCommand(args);
      if (result.success && result.data) {
        statsResult = result;
        break;
      }
      if (!result.success && !statsResult.data) {
        statsResult = result;
      }
    }

    const stats = { insertions: 0, deletions: 0 };
    if (statsResult.success && statsResult.data) {
      const firstLine = statsResult.data.split('\n')[0] || '';
      const [addRaw, delRaw] = firstLine.split('\t');
      if (addRaw && addRaw !== '-') stats.insertions = Number.parseInt(addRaw, 10) || 0;
      if (delRaw && delRaw !== '-') stats.deletions = Number.parseInt(delRaw, 10) || 0;
    }

    res.json({
      path: validatedPath.value,
      commit: validatedCommit.value,
      diff: diffResult.data || '该文件在此提交中没有可显示的文本差异',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-branch', async (req, res) => {
  try {
    const validatedRef = sanitizeRefName(req.body.branchName);
    if (!validatedRef.ok) {
      return res.status(400).json({ error: validatedRef.error });
    }

    const args = req.body.checkout
      ? ['checkout', '-b', validatedRef.value]
      : ['branch', validatedRef.value];

    const result = await runGitCommand(args);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: req.body.checkout
        ? `已创建并切换到分支 ${validatedRef.value}`
        : `已创建分支 ${validatedRef.value}`,
      branchName: validatedRef.value
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const validatedRef = sanitizeRefName(req.body.branchName);
    if (!validatedRef.ok) {
      return res.status(400).json({ error: validatedRef.error });
    }

    const statusResult = await runGitCommand(['status', '--porcelain']);
    if (statusResult.success && statusResult.data) {
      return res.status(400).json({
        error: '有未提交的修改，请先提交或暂存',
        hasUncommittedChanges: true,
        changes: statusResult.data
      });
    }

    const result = await runGitCommand(['checkout', validatedRef.value]);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: `已切换到分支 ${validatedRef.value}`,
      branchName: validatedRef.value
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/merge', async (req, res) => {
  try {
    const sourceRef = sanitizeRefName(req.body.sourceBranch, '源分支');
    const targetRef = sanitizeRefName(req.body.targetBranch, '目标分支');

    if (!sourceRef.ok || !targetRef.ok) {
      return res.status(400).json({ error: sourceRef.error || targetRef.error });
    }

    if (sourceRef.value === targetRef.value) {
      return res.status(400).json({ error: '源分支和目标分支不能相同' });
    }

    if (await hasUncommittedChanges()) {
      return res.status(400).json({
        error: '检测到未提交修改，请先提交或暂存后再执行合并'
      });
    }

    const currentBranch = await getCurrentBranchName();
    if (currentBranch !== targetRef.value) {
      const checkoutResult = await runGitCommand(['checkout', targetRef.value]);
      if (!checkoutResult.success) {
        return sendGitError(res, checkoutResult, `切换到 ${targetRef.value} 失败`);
      }
    }

    const mergeResult = await runGitCommand(['merge', sourceRef.value, '--no-edit']);
    if (!mergeResult.success) {
      return sendGitError(res, mergeResult, '可能存在冲突，请在命令行手动解决');
    }

    res.json({
      success: true,
      message: `已将 ${sourceRef.value} 合并到 ${targetRef.value}`,
      output: mergeResult.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/branch/:branchName', async (req, res) => {
  try {
    const validatedRef = sanitizeRefName(req.params.branchName);
    if (!validatedRef.ok) {
      return res.status(400).json({ error: validatedRef.error });
    }

    if (MAIN_BRANCHES.has(validatedRef.value)) {
      return res.status(400).json({ error: '不允许删除主分支' });
    }

    const currentBranch = await getCurrentBranchName();
    if (currentBranch === validatedRef.value) {
      return res.status(400).json({ error: '不能删除当前分支，请先切换到其他分支' });
    }

    const forceDelete = req.query.force === 'true';
    const result = await runGitCommand([
      'branch',
      forceDelete ? '-D' : '-d',
      validatedRef.value
    ]);

    if (!result.success) {
      return sendGitError(res, result, '如果分支未合并，请使用强制删除');
    }

    res.json({
      success: true,
      message: `已删除分支 ${validatedRef.value}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const result = await runGitCommand(['status', '--porcelain']);
    if (!result.success) {
      return sendGitError(res, result);
    }

    const files = result.data
      ? result.data.split('\n').filter(Boolean).map((line) => {
          const status = line.substring(0, 2);
          const file = line.substring(3);
          return { status, file };
        })
      : [];

    res.json({
      hasChanges: files.length > 0,
      files,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/commit', async (req, res) => {
  try {
    const rawMessage = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!rawMessage) {
      return res.status(400).json({ error: '提交说明不能为空' });
    }
    if (rawMessage.length > 200) {
      return res.status(400).json({ error: '提交说明不能超过 200 个字符' });
    }

    const statusResult = await runGitCommand(['status', '--porcelain']);
    if (!statusResult.success) {
      return sendGitError(res, statusResult);
    }
    if (!statusResult.data) {
      return res.status(400).json({ error: '没有可提交的变更' });
    }

    const addResult = await runGitCommand(['add', '-A']);
    if (!addResult.success) {
      return sendGitError(res, addResult, '暂存变更失败');
    }

    const commitResult = await runGitCommand(['commit', '-m', rawMessage]);
    if (!commitResult.success) {
      return sendGitError(res, commitResult, '提交失败，请检查 Git 用户信息或钩子配置');
    }

    const hashResult = await runGitCommand(['rev-parse', '--short', 'HEAD']);
    const commitHash = hashResult.success ? hashResult.data : '';

    res.json({
      success: true,
      message: commitHash ? `本地提交成功 (${commitHash})` : '本地提交成功',
      commitHash,
      output: commitResult.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stash', async (req, res) => {
  try {
    const rawMessage = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const args = rawMessage
      ? ['stash', 'push', '-m', rawMessage]
      : ['stash', 'push'];

    const result = await runGitCommand(args);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: '已暂存当前修改',
      output: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stash-pop', async (req, res) => {
  try {
    const result = await runGitCommand(['stash', 'pop']);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: '已恢复暂存的修改',
      output: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/remotes', async (req, res) => {
  try {
    const result = await runGitCommand(['remote']);
    if (!result.success) {
      return sendGitError(res, result);
    }

    const remotes = (result.data || '').split('\n').filter(Boolean);
    res.json({
      remotes,
      defaultRemote: remotes.includes('origin') ? 'origin' : remotes[0] || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fetch', async (req, res) => {
  try {
    const validatedRemote = sanitizeRemoteName(req.body.remote || 'origin');
    if (!validatedRemote.ok) {
      return res.status(400).json({ error: validatedRemote.error });
    }

    const shouldPrune = Boolean(req.body.prune);
    const args = ['fetch', validatedRemote.value];
    if (shouldPrune) {
      args.push('--prune');
    }

    const result = await runGitCommand(args);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: shouldPrune
        ? `已从 ${validatedRemote.value} 拉取并清理远程追踪分支`
        : `已从 ${validatedRemote.value} 拉取最新信息`,
      output: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/push', async (req, res) => {
  try {
    const validatedRemote = sanitizeRemoteName(req.body.remote || 'origin');
    const validatedBranch = sanitizeRefName(req.body.branchName);

    if (!validatedRemote.ok || !validatedBranch.ok) {
      return res.status(400).json({ error: validatedRemote.error || validatedBranch.error });
    }

    const setUpstream = req.body.setUpstream !== false;
    const args = ['push'];
    if (setUpstream) {
      args.push('-u');
    }
    args.push(validatedRemote.value, validatedBranch.value);

    const result = await runGitCommand(args);
    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: `已推送 ${validatedBranch.value} 到 ${validatedRemote.value}`,
      output: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/remote-branch/:branchName', async (req, res) => {
  try {
    const validatedRemote = sanitizeRemoteName(String(req.query.remote || 'origin'));
    const validatedBranch = sanitizeRefName(req.params.branchName);

    if (!validatedRemote.ok || !validatedBranch.ok) {
      return res.status(400).json({ error: validatedRemote.error || validatedBranch.error });
    }

    if (MAIN_BRANCHES.has(validatedBranch.value)) {
      return res.status(400).json({ error: '不允许删除主分支的远程分支' });
    }

    const result = await runGitCommand([
      'push',
      validatedRemote.value,
      '--delete',
      validatedBranch.value
    ]);

    if (!result.success) {
      return sendGitError(res, result);
    }

    res.json({
      success: true,
      message: `已删除远程分支 ${validatedRemote.value}/${validatedBranch.value}`,
      output: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/branch-files/:branchName', async (req, res) => {
  try {
    const validatedBranch = sanitizeRefName(req.params.branchName);
    if (!validatedBranch.ok) {
      return res.status(400).json({ error: validatedBranch.error });
    }

    const validatedBase = sanitizeRefName(String(req.query.base || 'main'), '基准分支');
    if (!validatedBase.ok) {
      return res.status(400).json({ error: validatedBase.error });
    }

    const mode = req.query.mode === 'history' ? 'history' : 'diff';

    if (mode === 'history') {
      const logResult = await runGitCommand([
        'log',
        validatedBranch.value,
        '--name-status',
        '--pretty=format:COMMIT|%h|%an|%ad|%s',
        '--date=iso'
      ]);

      if (!logResult.success) {
        return sendGitError(res, logResult);
      }

      const fileStats = new Map();
      let currentCommit = null;

      for (const line of (logResult.data || '').split('\n')) {
        if (line.startsWith('COMMIT|')) {
          const parts = line.split('|');
          currentCommit = {
            hash: parts[1] || '',
            author: parts[2] || '',
            date: parts[3] || '',
            subject: parts.slice(4).join('|') || ''
          };
          continue;
        }

        if (!currentCommit || !line || !/^[MADR]\s/.test(line)) {
          continue;
        }

        const tokens = line.split('\t');
        const rawStatus = tokens[0] || '';
        const status = rawStatus[0];
        const filePath = status === 'R' ? tokens[2] : tokens[1];

        if (!filePath) {
          continue;
        }

        if (!fileStats.has(filePath)) {
          fileStats.set(filePath, {
            path: filePath,
            name: filePath.split('/').pop(),
            status,
            modifyCount: 0,
            lastModifiedDate: '',
            lastModifiedBy: '',
            lastCommitHash: '',
            lastCommitMessage: ''
          });
        }

        const fileEntry = fileStats.get(filePath);
        fileEntry.modifyCount += 1;

        if (!fileEntry.lastModifiedDate) {
          fileEntry.lastModifiedDate = currentCommit.date;
          fileEntry.lastModifiedBy = currentCommit.author;
          fileEntry.lastCommitHash = currentCommit.hash;
          fileEntry.lastCommitMessage = currentCommit.subject;
        }
      }

      const files = Array.from(fileStats.values()).sort((a, b) => b.modifyCount - a.modifyCount);
      const countResult = await runGitCommand(['rev-list', '--count', validatedBranch.value]);
      const totalCommits = countResult.success ? Number.parseInt(countResult.data, 10) || 0 : 0;

      return res.json({
        branch: validatedBranch.value,
        mode,
        totalCommits,
        files,
        count: files.length
      });
    }

    const diffResult = await runGitCommand([
      'diff',
      '--name-status',
      `${validatedBase.value}...${validatedBranch.value}`
    ]);

    if (!diffResult.success) {
      return sendGitError(res, diffResult);
    }

    const statusMap = {
      M: 'modified',
      A: 'added',
      D: 'deleted',
      R: 'renamed'
    };

    const files = (diffResult.data || '')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('\t');
        const statusCode = (parts[0] || '')[0];
        const path = statusCode === 'R' ? (parts[2] || '') : (parts[1] || '');

        return {
          path,
          status: statusMap[statusCode] || 'modified',
          name: path.split('/').pop()
        };
      })
      .filter((item) => Boolean(item.path));

    res.json({
      branch: validatedBranch.value,
      mode,
      base: validatedBase.value,
      files,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/merge-preview', async (req, res) => {
  try {
    const sourceRef = sanitizeRefName(req.query.sourceBranch, '源分支');
    const targetRef = sanitizeRefName(req.query.targetBranch, '目标分支');

    if (!sourceRef.ok || !targetRef.ok) {
      return res.status(400).json({ error: sourceRef.error || targetRef.error });
    }

    if (sourceRef.value === targetRef.value) {
      return res.status(400).json({ error: '源分支和目标分支不能相同' });
    }

    const mergeBaseResult = await runGitCommand([
      'merge-base',
      sourceRef.value,
      targetRef.value
    ]);
    if (!mergeBaseResult.success || !mergeBaseResult.data) {
      return sendGitError(res, mergeBaseResult, '无法找到共同祖先');
    }

    const [sourceDiffResult, targetDiffResult] = await Promise.all([
      runGitCommand(['diff', '--name-only', `${mergeBaseResult.data}..${sourceRef.value}`]),
      runGitCommand(['diff', '--name-only', `${mergeBaseResult.data}..${targetRef.value}`])
    ]);

    if (!sourceDiffResult.success || !targetDiffResult.success) {
      return sendGitError(res, sourceDiffResult.success ? targetDiffResult : sourceDiffResult);
    }

    const sourceFiles = new Set((sourceDiffResult.data || '').split('\n').filter(Boolean));
    const targetFiles = new Set((targetDiffResult.data || '').split('\n').filter(Boolean));
    const potentialConflicts = [...sourceFiles].filter((file) => targetFiles.has(file)).sort();

    res.json({
      sourceBranch: sourceRef.value,
      targetBranch: targetRef.value,
      mergeBase: mergeBaseResult.data,
      sourceChangedCount: sourceFiles.size,
      targetChangedCount: targetFiles.size,
      potentialConflictCount: potentialConflicts.length,
      potentialConflicts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/merge-preview-precise', async (req, res) => {
  let tempWorktreePath = '';
  try {
    const sourceRef = sanitizeRefName(req.query.sourceBranch, '源分支');
    const targetRef = sanitizeRefName(req.query.targetBranch, '目标分支');

    if (!sourceRef.ok || !targetRef.ok) {
      return res.status(400).json({ error: sourceRef.error || targetRef.error });
    }

    if (sourceRef.value === targetRef.value) {
      return res.status(400).json({ error: '源分支和目标分支不能相同' });
    }

    const [sourceExists, targetExists] = await Promise.all([
      runGitCommand(['rev-parse', '--verify', sourceRef.value]),
      runGitCommand(['rev-parse', '--verify', targetRef.value])
    ]);
    if (!sourceExists.success || !targetExists.success) {
      return res.status(400).json({ error: '源分支或目标分支不存在' });
    }

    tempWorktreePath = await mkdtemp(path.join(os.tmpdir(), 'git-merge-preview-'));
    const addWorktreeResult = await runGitCommand(
      ['worktree', 'add', '--detach', tempWorktreePath, targetRef.value],
      { cwd: GIT_DIR }
    );
    if (!addWorktreeResult.success) {
      return sendGitError(res, addWorktreeResult, '创建临时工作区失败');
    }

    const mergeResult = await runGitCommand(
      ['merge', '--no-commit', '--no-ff', sourceRef.value],
      { cwd: tempWorktreePath }
    );

    const conflictFilesResult = await runGitCommand(
      ['diff', '--name-only', '--diff-filter=U'],
      { cwd: tempWorktreePath }
    );
    const conflictedFiles = conflictFilesResult.success
      ? (conflictFilesResult.data || '').split('\n').filter(Boolean).sort()
      : [];

    if (mergeResult.success) {
      await runGitCommand(['merge', '--abort'], { cwd: tempWorktreePath });
      return res.json({
        sourceBranch: sourceRef.value,
        targetBranch: targetRef.value,
        dryRunStatus: 'clean',
        hasConflicts: false,
        conflictedFiles: [],
        conflictCount: 0,
        message: '精确预检通过：未检测到冲突'
      });
    }

    await runGitCommand(['merge', '--abort'], { cwd: tempWorktreePath });

    return res.json({
      sourceBranch: sourceRef.value,
      targetBranch: targetRef.value,
      dryRunStatus: conflictedFiles.length > 0 ? 'conflict' : 'error',
      hasConflicts: conflictedFiles.length > 0,
      conflictedFiles,
      conflictCount: conflictedFiles.length,
      message: conflictedFiles.length > 0
        ? '精确预检发现冲突，请先处理后再合并'
        : '精确预检执行失败，请在命令行手动检查',
      rawError: mergeResult.error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (tempWorktreePath) {
      await runGitCommand(['worktree', 'remove', '--force', tempWorktreePath], { cwd: GIT_DIR });
      await rm(tempWorktreePath, { recursive: true, force: true }).catch(() => {});
    }
  }
});

router.get('/compare-file', async (req, res) => {
  try {
    const validatedPath = sanitizeFilePath(req.query.path);
    const sourceRef = sanitizeRefName(req.query.sourceBranch, '源分支');
    const targetRef = sanitizeRefName(req.query.targetBranch, '目标分支');

    if (!validatedPath.ok || !sourceRef.ok || !targetRef.ok) {
      return res.status(400).json({
        error: validatedPath.error || sourceRef.error || targetRef.error
      });
    }

    if (sourceRef.value === targetRef.value) {
      return res.status(400).json({ error: '源分支和目标分支不能相同' });
    }

    const diffRange = `${targetRef.value}..${sourceRef.value}`;
    const topPathspec = toTopPathspec(validatedPath.value);
    const [diffResult, statsResult] = await Promise.all([
      runGitCommand(['diff', diffRange, '--', topPathspec]),
      runGitCommand(['diff', '--numstat', diffRange, '--', topPathspec])
    ]);

    if (!diffResult.success) {
      return sendGitError(res, diffResult, '无法获取文件对比结果');
    }

    const stats = { insertions: 0, deletions: 0 };
    if (statsResult.success && statsResult.data) {
      const firstLine = statsResult.data.split('\n')[0] || '';
      const parts = firstLine.split('\t');
      if (parts.length >= 2) {
        stats.insertions = Number.parseInt(parts[0], 10) || 0;
        stats.deletions = Number.parseInt(parts[1], 10) || 0;
      }
    }

    res.json({
      path: validatedPath.value,
      sourceBranch: sourceRef.value,
      targetBranch: targetRef.value,
      diff: diffResult.data || '无差异',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/file-content', async (req, res) => {
  try {
    const validatedPath = sanitizeFilePath(req.query.path);
    const validatedBranch = sanitizeRefName(req.query.branch);

    if (!validatedPath.ok) {
      return res.status(400).json({ error: validatedPath.error });
    }

    if (!validatedBranch.ok) {
      return res.status(400).json({ error: validatedBranch.error });
    }

    const result = await runGitCommand(['show', `${validatedBranch.value}:${validatedPath.value}`]);

    if (!result.success) {
      return sendGitError(res, result, '无法读取文件内容');
    }

    res.json({
      path: validatedPath.value,
      branch: validatedBranch.value,
      content: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/file-diff', async (req, res) => {
  try {
    const validatedPath = sanitizeFilePath(req.query.path);
    const validatedBranch = sanitizeRefName(req.query.branch);
    const validatedBase = sanitizeRefName(String(req.query.base || 'main'), '基准分支');

    if (!validatedPath.ok) {
      return res.status(400).json({ error: validatedPath.error });
    }

    if (!validatedBranch.ok) {
      return res.status(400).json({ error: validatedBranch.error });
    }

    if (!validatedBase.ok) {
      return res.status(400).json({ error: validatedBase.error });
    }

    const range = `${validatedBase.value}...${validatedBranch.value}`;
    const topPathspec = toTopPathspec(validatedPath.value);

    const [diffResult, statsResult] = await Promise.all([
      runGitCommand(['diff', range, '--', topPathspec]),
      runGitCommand(['diff', '--numstat', range, '--', topPathspec])
    ]);

    if (!diffResult.success) {
      return sendGitError(res, diffResult, '无法获取 diff 信息');
    }

    const stats = { insertions: 0, deletions: 0 };
    if (statsResult.success && statsResult.data) {
      const firstLine = statsResult.data.split('\n')[0] || '';
      const parts = firstLine.split('\t');
      if (parts.length >= 2) {
        stats.insertions = Number.parseInt(parts[0], 10) || 0;
        stats.deletions = Number.parseInt(parts[1], 10) || 0;
      }
    }

    res.json({
      path: validatedPath.value,
      base: validatedBase.value,
      target: validatedBranch.value,
      diff: diffResult.data || '无变更',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
