import { spawn } from 'node:child_process'
import { existsSync, readdirSync, watchFile, unwatchFile } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const routesDir = path.join(root, 'routes')

const watchedFiles = new Set()
let child = null
let isRestarting = false
let restartTimer = null

const normalize = (filePath) => path.relative(root, filePath) || filePath

function launchServer() {
  child = spawn(
    process.execPath,
    ['-r', 'dotenv/config', 'index.js', 'dotenv_config_path=.env.test'],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    }
  )

  child.on('exit', (code, signal) => {
    if (!isRestarting) {
      const status = signal ? `signal ${signal}` : `code ${code ?? 0}`
      console.log(`[watch] backend exited with ${status}`)
    }
  })
}

function stopServer(done) {
  if (!child) {
    done()
    return
  }

  const current = child
  child = null
  current.once('exit', () => done())
  current.kill('SIGTERM')

  setTimeout(() => {
    if (!current.killed) {
      current.kill('SIGKILL')
    }
  }, 2000)
}

function scheduleRestart(changedFile) {
  clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    isRestarting = true
    console.log(`[watch] changed: ${normalize(changedFile)}, restarting backend...`)
    stopServer(() => {
      isRestarting = false
      launchServer()
    })
  }, 120)
}

function addWatch(filePath) {
  if (!existsSync(filePath) || watchedFiles.has(filePath)) return
  watchedFiles.add(filePath)

  watchFile(filePath, { interval: 500 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
      scheduleRestart(filePath)
    }
  })
}

function refreshWatchedFiles() {
  addWatch(path.join(root, 'index.js'))
  addWatch(path.join(root, 'db.js'))
  addWatch(path.join(root, 'utils.js'))

  if (!existsSync(routesDir)) return
  for (const file of readdirSync(routesDir)) {
    if (file.endsWith('.js')) {
      addWatch(path.join(routesDir, file))
    }
  }
}

function cleanupAndExit() {
  clearTimeout(restartTimer)

  for (const filePath of watchedFiles) {
    unwatchFile(filePath)
  }

  stopServer(() => process.exit(0))
}

process.on('SIGINT', cleanupAndExit)
process.on('SIGTERM', cleanupAndExit)

console.log('[watch] backend auto-reload enabled')
console.log('[watch] watching index.js, db.js, utils.js, routes/*.js')

refreshWatchedFiles()
setInterval(refreshWatchedFiles, 1500).unref()
launchServer()
