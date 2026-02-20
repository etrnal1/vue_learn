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

export default router;
