#!/usr/bin/env node
/**
 * 提取 git 历史记录并生成 JSON 文件
 * 运行时机：npm run dev / npm run build 之前自动执行
 * 输出文件：public/git-log.json
 */
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function run(cmd) {
  return execSync(cmd, { cwd: projectRoot, encoding: 'utf-8' }).trim()
}

// 逐条获取 commit hash 列表
const hashes = run('git log --pretty=format:%H').split('\n').filter(Boolean)

const commits = hashes.map(fullHash => {
  const hash = run(`git log -1 --pretty=format:%h ${fullHash}`)
  const author = run(`git log -1 --pretty=format:%an ${fullHash}`)
  const email = run(`git log -1 --pretty=format:%ae ${fullHash}`)
  const date = run(`git log -1 --pretty=format:%ai ${fullHash}`)
  const subject = run(`git log -1 --pretty=format:%s ${fullHash}`)

  let body = ''
  try {
    body = run(`git log -1 --pretty=format:%b ${fullHash}`)
  } catch (e) {}

  // 获取此 commit 的文件变更
  let files = []
  try {
    const stat = run(`git diff-tree --no-commit-id --name-status -r ${fullHash}`)
    files = stat.split('\n').filter(Boolean).map(line => {
      const parts = line.split('\t')
      const status = parts[0]
      const path = parts.slice(1).join('\t')
      const statusMap = { 'A': 'added', 'M': 'modified', 'D': 'deleted', 'R': 'renamed' }
      return {
        path,
        status: statusMap[status.charAt(0)] || status,
        name: path.split('/').pop()
      }
    })
  } catch (e) {}

  // 获取增删行数
  let insertions = 0
  let deletions = 0
  try {
    const numstat = run(`git diff-tree --no-commit-id --numstat -r ${fullHash}`)
    numstat.split('\n').filter(Boolean).forEach(line => {
      const [add, del] = line.split('\t')
      if (add !== '-') insertions += parseInt(add) || 0
      if (del !== '-') deletions += parseInt(del) || 0
    })
  } catch (e) {}

  // 分析 commit 类型
  let type = '其他'
  if (subject.startsWith('添加')) type = '新功能'
  else if (subject.startsWith('更新')) type = '更新'
  else if (subject.startsWith('修复')) type = '修复'
  else if (subject.startsWith('文档')) type = '文档'
  else if (subject.startsWith('配置')) type = '配置'
  else if (subject.startsWith('样式')) type = '样式'
  else if (subject.startsWith('重构')) type = '重构'
  else if (subject.startsWith('移除')) type = '移除'
  else if (subject.startsWith('feat')) type = '新功能'
  else if (subject.startsWith('fix')) type = '修复'
  else if (subject.startsWith('docs')) type = '文档'

  return {
    hash, fullHash, author, email, date, subject,
    body: body.replace(/Co-Authored-By:.*$/gm, '').trim(),
    type, files,
    stats: { filesChanged: files.length, insertions, deletions }
  }
})

// 汇总统计
const summary = {
  totalCommits: commits.length,
  totalFiles: new Set(commits.flatMap(c => c.files.map(f => f.path))).size,
  totalInsertions: commits.reduce((sum, c) => sum + c.stats.insertions, 0),
  totalDeletions: commits.reduce((sum, c) => sum + c.stats.deletions, 0),
  authors: [...new Set(commits.map(c => c.author))],
  firstCommit: commits.length > 0 ? commits[commits.length - 1].date : null,
  lastCommit: commits.length > 0 ? commits[0].date : null,
  generatedAt: new Date().toISOString()
}

mkdirSync(resolve(projectRoot, 'public'), { recursive: true })
writeFileSync(
  resolve(projectRoot, 'public/git-log.json'),
  JSON.stringify({ summary, commits }, null, 2),
  'utf-8'
)

console.log(`✅ Git 日志已生成: ${commits.length} 条提交 → public/git-log.json`)
