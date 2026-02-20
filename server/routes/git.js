import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execPromise = promisify(exec);

// Git 项目根目录（需要根据实际情况调整）
const GIT_DIR = '/Users/mac/vue-learning-app';

// 执行 Git 命令的辅助函数
async function runGitCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(command, { cwd: GIT_DIR });
    return { success: true, data: stdout.trim(), error: stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 获取所有分支
router.get('/branches', async (req, res) => {
  try {
    const result = await runGitCommand('git branch -a');
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const branches = result.data
      .split('\n')
      .map(line => {
        const isCurrent = line.startsWith('*');
        const name = line.replace('*', '').trim();
        const isRemote = name.startsWith('remotes/');
        return {
          name: name.replace('remotes/origin/', ''),
          fullName: name,
          isCurrent,
          isRemote,
          type: isRemote ? 'remote' : 'local'
        };
      })
      .filter(b => b.name && !b.name.includes('HEAD ->'));

    res.json({ branches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取当前分支
router.get('/current-branch', async (req, res) => {
  try {
    const result = await runGitCommand('git branch --show-current');
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ currentBranch: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取分支的提交历史
router.get('/branch-commits/:branchName', async (req, res) => {
  try {
    const { branchName } = req.params;
    const limit = req.query.limit || 10;
    const result = await runGitCommand(
      `git log ${branchName} --oneline --graph -${limit}`
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const commits = result.data.split('\n').map(line => {
      const match = line.match(/^[\*\|\s\\\/]+\s*([a-f0-9]+)\s+(.+)$/);
      if (match) {
        return {
          hash: match[1],
          message: match[2],
          raw: line
        };
      }
      return { raw: line };
    });

    res.json({ commits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新分支
router.post('/create-branch', async (req, res) => {
  try {
    const { branchName, checkout } = req.body;

    if (!branchName) {
      return res.status(400).json({ error: '分支名不能为空' });
    }

    // 验证分支名格式
    if (!/^[a-zA-Z0-9\/_-]+$/.test(branchName)) {
      return res.status(400).json({ error: '分支名只能包含字母、数字、/、_、-' });
    }

    const command = checkout
      ? `git checkout -b ${branchName}`
      : `git branch ${branchName}`;

    const result = await runGitCommand(command);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      message: checkout ? `已创建并切换到分支 ${branchName}` : `已创建分支 ${branchName}`,
      branchName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 切换分支
router.post('/checkout', async (req, res) => {
  try {
    const { branchName } = req.body;

    if (!branchName) {
      return res.status(400).json({ error: '分支名不能为空' });
    }

    // 先检查是否有未提交的修改
    const statusResult = await runGitCommand('git status --porcelain');
    if (statusResult.success && statusResult.data) {
      return res.status(400).json({
        error: '有未提交的修改，请先提交或暂存',
        hasUncommittedChanges: true,
        changes: statusResult.data
      });
    }

    const result = await runGitCommand(`git checkout ${branchName}`);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      message: `已切换到分支 ${branchName}`,
      branchName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 合并分支
router.post('/merge', async (req, res) => {
  try {
    const { sourceBranch, targetBranch } = req.body;

    if (!sourceBranch || !targetBranch) {
      return res.status(400).json({ error: '源分支和目标分支不能为空' });
    }

    // 1. 切换到目标分支
    const checkoutResult = await runGitCommand(`git checkout ${targetBranch}`);
    if (!checkoutResult.success) {
      return res.status(500).json({ error: `切换到 ${targetBranch} 失败: ${checkoutResult.error}` });
    }

    // 2. 合并源分支
    const mergeResult = await runGitCommand(`git merge ${sourceBranch} --no-edit`);

    if (!mergeResult.success) {
      return res.status(500).json({
        error: `合并失败: ${mergeResult.error}`,
        hint: '可能存在冲突，请在命令行手动解决'
      });
    }

    res.json({
      success: true,
      message: `已将 ${sourceBranch} 合并到 ${targetBranch}`,
      output: mergeResult.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除分支
router.delete('/branch/:branchName', async (req, res) => {
  try {
    const { branchName } = req.params;
    const { force } = req.query;

    if (!branchName) {
      return res.status(400).json({ error: '分支名不能为空' });
    }

    // 不允许删除当前分支
    const currentResult = await runGitCommand('git branch --show-current');
    if (currentResult.success && currentResult.data === branchName) {
      return res.status(400).json({ error: '不能删除当前分支，请先切换到其他分支' });
    }

    // 不允许删除主分支
    if (branchName === 'main' || branchName === 'master') {
      return res.status(400).json({ error: '不允许删除主分支' });
    }

    const command = force === 'true'
      ? `git branch -D ${branchName}`
      : `git branch -d ${branchName}`;

    const result = await runGitCommand(command);

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        hint: '如果分支未合并，请使用强制删除'
      });
    }

    res.json({
      success: true,
      message: `已删除分支 ${branchName}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取 Git 状态
router.get('/status', async (req, res) => {
  try {
    const result = await runGitCommand('git status --porcelain');

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const hasChanges = result.data.length > 0;
    const files = result.data.split('\n').filter(Boolean).map(line => {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      return { status, file };
    });

    res.json({
      hasChanges,
      files,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 暂存更改（stash）
router.post('/stash', async (req, res) => {
  try {
    const { message } = req.body;
    const command = message
      ? `git stash save "${message}"`
      : 'git stash';

    const result = await runGitCommand(command);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
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

// 恢复暂存（stash pop）
router.post('/stash-pop', async (req, res) => {
  try {
    const result = await runGitCommand('git stash pop');

    if (!result.success) {
      return res.status(500).json({ error: result.error });
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

// 获取分支的文件变更列表
router.get('/branch-files/:branchName', async (req, res) => {
  try {
    const { branchName } = req.params;
    const { base = 'main', mode = 'diff' } = req.query;

    // 验证分支名和基准分支名
    if (!/^[a-zA-Z0-9\/_-]+$/.test(branchName)) {
      return res.status(400).json({ error: '无效的分支名' });
    }
    if (!/^[a-zA-Z0-9\/_-]+$/.test(base)) {
      return res.status(400).json({ error: '无效的基准分支名' });
    }

    // mode=history: 获取分支历史中所有修改过的文件
    if (mode === 'history') {
      const result = await runGitCommand(
        `git log ${branchName} --name-status --pretty=format:"COMMIT|%h|%an|%ad|%s" --date=iso`
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // 解析输出，聚合文件统计
      const fileStats = new Map();
      let currentCommit = null;

      result.data.split('\n').forEach(line => {
        if (line.startsWith('COMMIT|')) {
          const parts = line.split('|');
          currentCommit = {
            hash: parts[1],
            author: parts[2],
            date: parts[3],
            subject: parts[4]
          };
        } else if (/^[MADR]\t/.test(line)) {
          const status = line[0];
          const filePath = line.substring(2);

          if (!fileStats.has(filePath)) {
            fileStats.set(filePath, {
              path: filePath,
              name: filePath.split('/').pop(),
              modifyCount: 0,
              lastModifiedDate: '',
              lastModifiedBy: '',
              lastCommitHash: '',
              lastCommitMessage: ''
            });
          }

          const stat = fileStats.get(filePath);
          stat.modifyCount++;

          // 第一次遇到就是最新的修改（git log 是倒序）
          if (!stat.lastModifiedDate) {
            stat.lastModifiedDate = currentCommit.date;
            stat.lastModifiedBy = currentCommit.author;
            stat.lastCommitHash = currentCommit.hash;
            stat.lastCommitMessage = currentCommit.subject;
          }
        }
      });

      // 转换为数组并按修改次数降序排列
      const files = Array.from(fileStats.values())
        .sort((a, b) => b.modifyCount - a.modifyCount);

      // 获取分支提交总数
      const commitCountResult = await runGitCommand(
        `git rev-list --count ${branchName}`
      );
      const totalCommits = parseInt(commitCountResult.data) || 0;

      return res.json({
        branch: branchName,
        mode: 'history',
        totalCommits,
        files,
        count: files.length
      });
    }

    // mode=diff（默认）: 获取相对于 base 分支的文件变更
    const result = await runGitCommand(
      `git diff --name-status ${base}...${branchName}`
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // 解析文件列表
    const statusMap = {
      'M': 'modified',
      'A': 'added',
      'D': 'deleted',
      'R': 'renamed'
    };

    const files = result.data
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const parts = line.split('\t');
        const status = parts[0][0];
        const path = parts[1] || parts[0].substring(1).trim();
        return {
          path,
          status: statusMap[status] || 'modified',
          name: path.split('/').pop()
        };
      });

    res.json({
      branch: branchName,
      mode: 'diff',
      base,
      files,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取指定分支中的文件内容
router.get('/file-content', async (req, res) => {
  try {
    const { path, branch } = req.query;

    if (!path || !branch) {
      return res.status(400).json({ error: '路径和分支名不能为空' });
    }

    // 安全验证：防止路径遍历
    if (path.includes('..') || path.startsWith('/')) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    // 验证分支名
    if (!/^[a-zA-Z0-9\/_-]+$/.test(branch)) {
      return res.status(400).json({ error: '无效的分支名' });
    }

    const result = await runGitCommand(
      `git show ${branch}:${path}`
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error || '无法读取文件内容'
      });
    }

    res.json({
      path,
      branch,
      content: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取文件的 diff 变更和统计
router.get('/file-diff', async (req, res) => {
  try {
    const { path, branch, base = 'main' } = req.query;

    if (!path || !branch) {
      return res.status(400).json({ error: '路径和分支名不能为空' });
    }

    // 安全验证
    if (path.includes('..') || path.startsWith('/')) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    // 验证分支名和基准分支名
    if (!/^[a-zA-Z0-9\/_-]+$/.test(branch)) {
      return res.status(400).json({ error: '无效的分支名' });
    }
    if (!/^[a-zA-Z0-9\/_-]+$/.test(base)) {
      return res.status(400).json({ error: '无效的基准分支名' });
    }

    // 获取 diff 内容
    const diffResult = await runGitCommand(
      `git diff ${base}...${branch} -- ${path}`
    );

    // 获取统计信息
    const statsResult = await runGitCommand(
      `git diff --numstat ${base}...${branch} -- ${path}`
    );

    let stats = { insertions: 0, deletions: 0 };
    if (statsResult.success && statsResult.data) {
      const parts = statsResult.data.split('\t');
      if (parts.length >= 2) {
        stats.insertions = parseInt(parts[0], 10) || 0;
        stats.deletions = parseInt(parts[1], 10) || 0;
      }
    }

    if (!diffResult.success) {
      return res.status(500).json({
        error: diffResult.error || '无法获取 diff 信息'
      });
    }

    res.json({
      path,
      base,
      target: branch,
      diff: diffResult.data || '无变更',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
